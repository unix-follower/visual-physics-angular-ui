import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import {
  buildInsightCards,
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
} from "./relativity-analytics"
import {
  buildExportPayload,
  parseImportPayload,
  RelativityOverlayOptions,
} from "./relativity-payload"
import { buildRelativityReportCsv, buildRelativityReportSummaryRows } from "./relativity-report"
import { EditableRelativityField, RelativityStateService } from "./relativity-state.service"
import { RelativityScenarioId } from "./relativity.models"
import { RelativityWebGpuRenderer } from "./relativity-webgpu-renderer"

const DEFAULT_OVERLAYS: RelativityOverlayOptions = {
  showReferenceGuides: true,
  showComparisonCurve: true,
  showActiveMarker: true,
}

@Component({
  selector: "app-relativity-page",
  templateUrl: "./relativity-page.component.html",
  styleUrl: "./relativity-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelativityPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(RelativityStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: RelativityWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarios = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<RelativityOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly isTimeDilation = computed(() => this.selectedScenario().id === "time-dilation")
  protected readonly isDoppler = computed(
    () => this.selectedScenario().id === "relativistic-doppler",
  )
  protected readonly isGravitational = computed(
    () => this.selectedScenario().id === "gravitational-time-dilation",
  )
  protected readonly overlayLabels = computed(() => {
    if (this.isDoppler()) {
      return {
        showReferenceGuides: "Emission and velocity guides",
        showComparisonCurve: "Classical Doppler comparison",
        showActiveMarker: "Observed-frequency marker",
      }
    }

    if (this.isGravitational()) {
      return {
        showReferenceGuides: "Schwarzschild and unity guides",
        showComparisonCurve: "Weak-field comparison",
        showActiveMarker: "Orbital clock marker",
      }
    }

    return {
      showReferenceGuides: "Proper-time guides",
      showComparisonCurve: "Coordinate-time comparison",
      showActiveMarker: "Dilated-clock marker",
    }
  })
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly completionStatus = computed(() => "Phase 23 relativity scenario set complete")
  protected readonly controlNote = computed(() => {
    const snapshot = this.currentState()
    if (this.isDoppler()) {
      return `Source and observer velocity inputs resolve to relative beta ${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c for the active Doppler shift.`
    }

    if (this.isGravitational()) {
      return `Radius and central-mass inputs hold the local clock at ${(snapshot.gravitationalTimeFactor ?? 0).toFixed(4)} of the far-field rate.`
    }

    return `Velocity and proper-time inputs currently stretch the moving clock to ${(snapshot.dilatedTimeSeconds ?? 0).toFixed(3)} s in the observer frame.`
  })
  protected readonly reportSummaryRows = computed(() =>
    buildRelativityReportSummaryRows(this.selectedScenario(), this.currentState()),
  )
  protected readonly liveReadoutRows = computed(() => {
    const snapshot = this.currentState()
    if (this.isDoppler()) {
      return [
        {
          label: "Relative beta",
          value: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
        },
        {
          label: "Observed frequency",
          value: `${(snapshot.observedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        },
        {
          label: "Classical frequency",
          value: `${(snapshot.classicalObservedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        },
        { label: "Shift ratio", value: `${(snapshot.shiftRatio ?? 0).toFixed(4)}` },
        { label: "Samples", value: `${this.sampledStates().length}` },
        { label: "Stable solution", value: snapshot.stable ? "Yes" : "No" },
      ]
    }

    if (this.isGravitational()) {
      return [
        { label: "Coordinate time", value: `${snapshot.timeSeconds.toFixed(2)} s` },
        {
          label: "Local elapsed time",
          value: `${(snapshot.localElapsedTimeSeconds ?? 0).toFixed(3)} s`,
        },
        { label: "Time factor", value: `${(snapshot.gravitationalTimeFactor ?? 0).toFixed(4)}` },
        {
          label: "Active radius",
          value: `${(snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(2)} r_s`,
        },
        {
          label: "Schwarzschild radius",
          value: `${(snapshot.schwarzschildRadiusKilometers ?? 0).toFixed(2)} km`,
        },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    return [
      {
        label: "Proper time",
        value: `${(snapshot.properTimeSeconds ?? snapshot.timeSeconds).toFixed(3)} s`,
      },
      { label: "Coordinate time", value: `${(snapshot.dilatedTimeSeconds ?? 0).toFixed(3)} s` },
      { label: "Lorentz factor", value: `${(snapshot.lorentzFactorGamma ?? 0).toFixed(4)}` },
      { label: "Time gap", value: `${(snapshot.timeDifferenceSeconds ?? 0).toFixed(4)} s` },
      {
        label: "Velocity",
        value: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
      },
      { label: "Samples", value: `${this.sampledStates().length}` },
    ]
  })
  protected readonly exportPreview = computed(() =>
    JSON.stringify(
      buildExportPayload(
        this.selectedScenario(),
        this.currentState(),
        this.overlays(),
        this.sampledStates(),
      ),
      null,
      2,
    ),
  )
  protected readonly reportPreview = computed(() =>
    buildRelativityReportCsv(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly samplePlotPath = computed(() => buildSampleGraphPath(this.sampledStates()))
  protected readonly sampleComparisonPath = computed(() =>
    buildSampleComparisonPath(this.sampledStates()),
  )
  protected readonly samplePlotGuides = computed(() =>
    buildSamplePlotGuides(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly sampleMarkers = computed(() => buildSampleMarkerPoints(this.sampledStates()))
  protected readonly hoveredSample = computed(() => {
    const index = this.hoveredSampleIndex()
    if (index === null) {
      return null
    }

    return this.sampledStates()[index] ?? null
  })
  protected readonly hoveredCursorPath = computed(() => {
    const index = this.hoveredSampleIndex()
    const samples = this.sampledStates()
    if (index === null || samples.length === 0) {
      return ""
    }

    const x = (index / Math.max(samples.length - 1, 1)) * 320
    return `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} 120`
  })
  protected readonly hoveredSampleLabel = computed(() => {
    const sample = this.hoveredSample()
    if (sample === null) {
      if (this.isDoppler()) {
        return "Hover the plot or focus it to inspect sampled relativistic frequency positions."
      }

      if (this.isGravitational()) {
        return "Hover the plot or focus it to inspect sampled gravitational clock-rate positions."
      }

      return "Hover the plot or focus it to inspect sampled time-dilation positions."
    }

    return this.isGravitational()
      ? `Sample radius ${sample.position.toFixed(3)} r_s`
      : `Sample position ${sample.position.toFixed(3)} c`
  })
  protected readonly plotReadoutRows = computed(() => {
    const sample = this.hoveredSample()
    if (sample === null) {
      return [] as Array<{ label: string; value: string }>
    }

    if (this.isDoppler()) {
      return [
        { label: "Relativistic frequency", value: `${sample.primaryValue.toExponential(3)} Hz` },
        {
          label: "Classical frequency",
          value: `${(sample.secondaryValue ?? 0).toExponential(3)} Hz`,
        },
      ]
    }

    if (this.isGravitational()) {
      return [
        { label: "Time factor", value: `${sample.primaryValue.toFixed(4)}` },
        { label: "Local elapsed time", value: `${(sample.secondaryValue ?? 0).toFixed(2)} s` },
      ]
    }

    return [
      { label: "Lorentz factor", value: `${sample.primaryValue.toFixed(4)}` },
      { label: "Coordinate time", value: `${(sample.secondaryValue ?? 0).toFixed(3)} s` },
    ]
  })
  protected readonly hoveredSampleAnnouncement = computed(() => {
    const rows = this.plotReadoutRows()
    if (rows.length === 0) {
      return this.hoveredSampleLabel()
    }

    return `${this.hoveredSampleLabel()}. ${rows.map((row) => `${row.label} ${row.value}`).join(". ")}.`
  })
  protected readonly plotNavigationDisabled = computed(() => this.sampledStates().length === 0)
  protected readonly atFirstHoveredSample = computed(() => (this.hoveredSampleIndex() ?? 0) <= 0)
  protected readonly atLastHoveredSample = computed(() => {
    const samples = this.sampledStates()
    return samples.length === 0 || (this.hoveredSampleIndex() ?? 0) >= samples.length - 1
  })
  protected readonly plotTitle = computed(() => {
    if (this.isDoppler()) {
      return "Relativistic Doppler comparison"
    }

    if (this.isGravitational()) {
      return "Gravitational clock-rate profile"
    }

    return "Time-dilation curve"
  })
  protected readonly plotSummary = computed(() => {
    if (this.isDoppler()) {
      return "Primary path shows the relativistic prediction; the comparison path shows the classical result."
    }

    if (this.isGravitational()) {
      return "Primary path shows the gravitational time factor; the comparison path shows local elapsed time for the active far-field interval."
    }

    return "Primary path shows dilated elapsed time across beta; the comparison path stays on the proper-time baseline."
  })
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isDoppler()) {
      return `Observed frequency ${(snapshot.observedFrequencyHertz ?? 0).toFixed(2)} Hz at relative beta ${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c.`
    }

    if (this.isGravitational()) {
      return `A far-field interval of ${snapshot.timeSeconds.toFixed(2)} s becomes ${(snapshot.localElapsedTimeSeconds ?? 0).toFixed(3)} s at ${(snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(2)} r_s.`
    }

    return `Proper time ${snapshot.timeSeconds.toFixed(2)} s stretches to ${(snapshot.dilatedTimeSeconds ?? 0).toFixed(3)} s at beta ${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)}.`
  })
  protected readonly insightSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isDoppler()) {
      return `Relativistic Doppler insight focus: ${(snapshot.redshift ?? false) ? "redshift" : "blueshift"} remains anchored by the observed-to-emitted ratio ${(snapshot.shiftRatio ?? 0).toFixed(4)}.`
    }

    if (this.isGravitational()) {
      return `Gravitational insight focus: the local clock keeps ${(snapshot.gravitationalTimeFactor ?? 0).toFixed(4)} of the far-field rate at ${(snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(2)} r_s.`
    }

    return `Time-dilation insight focus: gamma ${(snapshot.lorentzFactorGamma ?? 0).toFixed(4)} sets a ${(snapshot.timeDifferenceSeconds ?? 0).toFixed(4)} s separation between proper and coordinate time.`
  })

  constructor() {
    afterNextRender(() => {
      void this.initializeRenderer()
    })

    effect(() => {
      if (!this.rendererReady()) {
        return
      }

      this.renderer?.render(
        this.currentState(),
        this.selectedScenario(),
        this.overlays(),
        this.sampledStates(),
      )
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as RelativityScenarioId)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateScenarioParameter(field: EditableRelativityField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof RelativityOverlayOptions): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Relativity scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Relativity scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Relativity report exported as CSV.")
  }

  protected updateImportPayload(event: Event): void {
    const target = event.target as HTMLTextAreaElement
    this.importPayloadText.set(target.value)
  }

  protected async importScenarioStateFromFile(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file === undefined) {
      return
    }

    const content = await file.text()
    this.importPayloadText.set(content)
    this.importScenarioState()
    target.value = ""
  }

  protected importScenarioState(): void {
    try {
      const payload = parseImportPayload(this.importPayloadText())
      this.state.importScenarioState(payload.scenario, payload.snapshot.timeSeconds)
      this.overlays.set(payload.overlays ?? { ...DEFAULT_OVERLAYS })
      this.importPayloadText.set(this.exportPreview())
      this.exportMessage.set("Relativity scenario restored from JSON.")
      this.hoveredSampleIndex.set(null)
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
  }

  protected resetScenario(): void {
    this.state.resetSelectedScenario()
    this.overlays.set({ ...DEFAULT_OVERLAYS })
    this.importPayloadText.set("")
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateHoveredSample(event: MouseEvent): void {
    const target = event.currentTarget as SVGElement | null
    const samples = this.sampledStates()
    if (!target || samples.length === 0) {
      this.hoveredSampleIndex.set(null)
      return
    }

    const rect = target.getBoundingClientRect()
    const relativeX = (event.clientX - rect.left) / Math.max(rect.width, 1)
    const index = Math.round(relativeX * Math.max(samples.length - 1, 0))
    this.hoveredSampleIndex.set(Math.min(Math.max(index, 0), samples.length - 1))
  }

  protected clearHoveredSample(): void {
    this.hoveredSampleIndex.set(null)
  }

  protected focusPlotReadout(): void {
    if (this.hoveredSampleIndex() !== null || this.sampledStates().length === 0) {
      return
    }

    this.hoveredSampleIndex.set(0)
  }

  protected handlePlotKeydown(event: KeyboardEvent): void {
    if (event.key === "ArrowRight") {
      event.preventDefault()
      this.stepHoveredSample(1)
      return
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault()
      this.stepHoveredSample(-1)
      return
    }

    if (event.key === "Home") {
      event.preventDefault()
      this.selectFirstSample()
      return
    }

    if (event.key === "End") {
      event.preventDefault()
      this.selectLastSample()
    }
  }

  protected selectFirstSample(): void {
    if (this.sampledStates().length === 0) {
      return
    }

    this.hoveredSampleIndex.set(0)
  }

  protected selectLastSample(): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    this.hoveredSampleIndex.set(samples.length - 1)
  }

  protected stepHoveredSample(delta: number): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    const currentIndex = this.hoveredSampleIndex() ?? 0
    this.hoveredSampleIndex.set(Math.min(Math.max(currentIndex + delta, 0), samples.length - 1))
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    if (!status.supported) {
      return
    }

    const renderer = await RelativityWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!renderer) {
      this.webGpuMessage.set("WebGPU renderer initialization failed.")
      return
    }

    this.renderer = renderer
    this.rendererReady.set(true)
    this.webGpuMessage.set("Relativity WebGPU viewport ready.")
  }

  private downloadTextFile(filename: string, content: string, mimeType: string): void {
    if (typeof document === "undefined") {
      this.exportMessage.set("File export is unavailable outside the browser.")
      return
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

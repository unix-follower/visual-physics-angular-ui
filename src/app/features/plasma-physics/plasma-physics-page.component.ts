import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from "@angular/core"

import { WebGpuSupportService } from "../kinematics/webgpu-support.service"
import { buildInsightCards } from "./plasma-physics-analytics"
import { buildExportPayload, parseImportPayload } from "./plasma-physics-payload"
import {
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
} from "./plasma-physics-plot"
import {
  buildPlasmaPhysicsReportCsv,
  buildPlasmaPhysicsReportSummaryRows,
} from "./plasma-physics-report"
import {
  EditablePlasmaPhysicsField,
  PlasmaPhysicsStateService,
} from "./plasma-physics-state.service"
import { PlasmaPhysicsOverlayOptions, PlasmaPhysicsScenarioId } from "./plasma-physics.models"
import { PlasmaPhysicsWebGpuRenderer } from "./plasma-physics-webgpu-renderer"

const DEFAULT_OVERLAYS: PlasmaPhysicsOverlayOptions = {
  showReferenceGuides: true,
  showActiveMarker: true,
  showComparisonBand: true,
}

type OverlayKey = keyof PlasmaPhysicsOverlayOptions

@Component({
  selector: "app-plasma-physics-page",
  templateUrl: "./plasma-physics-page.component.html",
  styleUrl: "./plasma-physics-page.component.css",
  providers: [PlasmaPhysicsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlasmaPhysicsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(PlasmaPhysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: PlasmaPhysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly overlays = signal<PlasmaPhysicsOverlayOptions>({ ...DEFAULT_OVERLAYS })
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly completionStatus = computed(() => "Validated Phase 33 Plasma surface")
  protected readonly implementationSummary = computed(
    () =>
      "The validated Plasma Physics Angular surface unifies the Phase 33 scenario set through one shared page, normalized state flow, sampled diagnostics, summary-first reporting, JSON restore and export workflow, and WebGPU viewport.",
  )
  protected readonly scenarioSetSummary = computed(
    () =>
      "The shared Plasma Physics surface validates plasma oscillation, Debye screening, and magnetic confinement as the active collective, shielding, and confinement study set.",
  )
  protected readonly readinessSummary = computed(
    () =>
      "The shared Plasma Physics viewport now renders the active oscillation, shielding, or confinement slice with matching overlay controls and ready-state messaging.",
  )
  protected readonly viewportHint = computed(() => {
    if (this.selectedScenario().id === "debye-screening") {
      return "The viewport renders the active probe shielding profile with radial screening guides and the current screened-potential cursor."
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return "The viewport renders the active confinement shell with field-surface cues, confinement guides, and the current safety-factor cursor."
    }

    return "The viewport renders the active collective oscillation slice with density bars, restoring-field response, and the current oscillation-phase cursor."
  })
  protected readonly overlayLabels = computed(() => {
    if (this.selectedScenario().id === "debye-screening") {
      return {
        showReferenceGuides: "Screening guide",
        showActiveMarker: "Probe marker",
        showComparisonBand: "Shielding trace",
      }
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return {
        showReferenceGuides: "Confinement guide",
        showActiveMarker: "Radius marker",
        showComparisonBand: "Safety trace",
      }
    }

    return {
      showReferenceGuides: "Phase guide",
      showActiveMarker: "Oscillation marker",
      showComparisonBand: "Restoring trace",
    }
  })
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "debye-screening") {
      return `Debye length ${(snapshot.debyeLengthMillimeters ?? 0).toFixed(2)} mm with shielding fraction ${(snapshot.shieldingFraction ?? 0).toFixed(2)} around the active probe radius.`
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return `Larmor radius ${(snapshot.larmorRadiusMillimeters ?? 0).toFixed(2)} mm with safety factor ${(snapshot.safetyFactor ?? 0).toFixed(2)} in the active confinement slice.`
    }

    return `Plasma frequency ${(snapshot.plasmaFrequencyGigahertz ?? 0).toFixed(2)} GHz with restoring field ${(snapshot.restoringFieldKilovoltsPerMeter ?? 0).toFixed(2)} kV/m in the active collective oscillation.`
  })
  protected readonly metricRows = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()

    if (scenario.id === "debye-screening") {
      return [
        {
          label: "Electron density",
          value: `${(scenario.electronDensityPerCubicMeter ?? 0).toExponential(2)} m^-3`,
        },
        { label: "Probe potential", value: `${(scenario.probePotentialVolts ?? 0).toFixed(1)} V` },
        { label: "Shielding fraction", value: `${(snapshot.shieldingFraction ?? 0).toFixed(2)}` },
      ]
    }

    if (scenario.id === "magnetic-confinement") {
      return [
        { label: "Magnetic field", value: `${(scenario.magneticFieldTesla ?? 0).toFixed(2)} T` },
        {
          label: "Plasma current",
          value: `${(scenario.plasmaCurrentMegaAmperes ?? 0).toFixed(2)} MA`,
        },
        { label: "Safety factor", value: `${(snapshot.safetyFactor ?? 0).toFixed(2)}` },
      ]
    }

    return [
      {
        label: "Electron density",
        value: `${(scenario.electronDensityPerCubicMeter ?? 0).toExponential(2)} m^-3`,
      },
      {
        label: "Perturbation amplitude",
        value: `${(scenario.perturbationAmplitudePercent ?? 0).toFixed(1)} %`,
      },
      {
        label: "Plasma frequency",
        value: `${(snapshot.plasmaFrequencyGigahertz ?? 0).toFixed(2)} GHz`,
      },
    ]
  })
  protected readonly reportSummaryRows = computed(() =>
    buildPlasmaPhysicsReportSummaryRows(this.selectedScenario(), this.currentState()),
  )
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
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
    buildPlasmaPhysicsReportCsv(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly activeSample = computed(
    () => this.sampledStates().find((sample) => sample.active) ?? this.sampledStates()[0] ?? null,
  )
  protected readonly samplePlotTitle = computed(() => {
    if (this.selectedScenario().id === "debye-screening") {
      return "Sampled Debye Screening Profile"
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return "Sampled Magnetic Confinement Profile"
    }

    return "Sampled Plasma Oscillation Profile"
  })
  protected readonly samplePlotPath = computed(() => buildSampleGraphPath(this.sampledStates()))
  protected readonly sampleComparisonPath = computed(() =>
    buildSampleComparisonPath(this.sampledStates()),
  )
  protected readonly samplePlotGuides = computed(() =>
    buildSamplePlotGuides(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly samplePlotMarkers = computed(() =>
    buildSampleMarkerPoints(this.sampledStates()),
  )
  protected readonly hoveredSample = computed(() => {
    const index = this.hoveredSampleIndex()
    if (index === null) {
      return null
    }

    return this.sampledStates()[index] ?? null
  })
  protected readonly activeSampleIndex = computed(() => {
    const index = this.sampledStates().findIndex((sample) => sample.active)
    return Math.max(index, 0)
  })
  protected readonly hoveredCursorPath = computed(() => {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return ""
    }

    const index = this.hoveredSampleIndex() ?? this.activeSampleIndex()
    const x = (index / Math.max(samples.length - 1, 1)) * 320
    return `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} 120`
  })
  protected readonly hoveredSampleLabel = computed(() => {
    const sample = this.hoveredSample() ?? this.activeSample()
    if (sample === null) {
      return "Hover, focus, or use the keyboard on the sampled plot to inspect plasma states."
    }

    return this.formatSampleLabel(sample)
  })
  protected readonly plotReadoutRows = computed(() => {
    const sample = this.hoveredSample() ?? this.activeSample()
    if (sample === null) {
      return [] as Array<{ label: string; value: string }>
    }

    return this.formatSampleReadoutRows(sample)
  })
  protected readonly hoveredSampleAnnouncement = computed(() => {
    const rows = this.plotReadoutRows()
    if (rows.length === 0) {
      return this.hoveredSampleLabel()
    }

    const rowSummary = rows.map((row) => `${row.label} ${row.value}`).join(". ")
    return `${this.hoveredSampleLabel()}. ${rowSummary}.`
  })
  protected readonly plotNavigationDisabled = computed(() => this.sampledStates().length === 0)
  protected readonly atFirstHoveredSample = computed(
    () => (this.hoveredSampleIndex() ?? this.activeSampleIndex()) <= 0,
  )
  protected readonly atLastHoveredSample = computed(() => {
    const samples = this.sampledStates()
    return (
      samples.length === 0 ||
      (this.hoveredSampleIndex() ?? this.activeSampleIndex()) >= samples.length - 1
    )
  })
  protected readonly viewportStatusRows = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "debye-screening") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        { label: "Debye length", value: `${(snapshot.debyeLengthMillimeters ?? 0).toFixed(2)} mm` },
        { label: "Shielding", value: `${(snapshot.shieldingFraction ?? 0).toFixed(2)}` },
      ]
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        {
          label: "Larmor radius",
          value: `${(snapshot.larmorRadiusMillimeters ?? 0).toFixed(2)} mm`,
        },
        { label: "Safety factor", value: `${(snapshot.safetyFactor ?? 0).toFixed(2)}` },
      ]
    }

    return [
      { label: "Scenario status", value: this.selectedScenario().status },
      {
        label: "Viewport state",
        value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
      },
      {
        label: "Plasma frequency",
        value: `${(snapshot.plasmaFrequencyGigahertz ?? 0).toFixed(2)} GHz`,
      },
      {
        label: "Restoring field",
        value: `${(snapshot.restoringFieldKilovoltsPerMeter ?? 0).toFixed(2)} kV/m`,
      },
    ]
  })
  protected readonly sampleSummary = computed(() => {
    const sample = this.hoveredSample() ?? this.activeSample()
    if (sample === null) {
      return "No sampled plasma state is active."
    }

    return `${this.formatSampleLabel(sample)} with primary value ${sample.primaryValue.toFixed(2)}.`
  })
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length

    if (this.selectedScenario().id === "debye-screening") {
      return `The sampled screening plot tracks ${sampleCount} deterministic probe-radius samples, with screened potential as the primary curve and shielding fraction as the comparison curve.`
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return `The sampled confinement plot tracks ${sampleCount} deterministic radius fractions, with beta proxy as the primary curve and safety factor as the comparison curve.`
    }

    return `The sampled oscillation plot tracks ${sampleCount} deterministic phase samples, with density response as the primary curve and restoring response as the comparison curve.`
  })
  protected readonly previewSummary = computed(() => {
    const sampleCount = this.sampledStates().length

    if (this.selectedScenario().id === "debye-screening") {
      return `Preview focus: the active shielding export pairs a scenario-scoped JSON payload with a sampled screening CSV so Debye length, screened potential, and ${sampleCount} deterministic probe-radius samples can be reviewed before export.`
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return `Preview focus: the active confinement export pairs a scenario-scoped JSON payload with a sampled confinement CSV so Larmor radius, safety factor, and ${sampleCount} deterministic radius samples can be reviewed before export.`
    }

    return `Preview focus: the active oscillation export pairs a scenario-scoped JSON payload with a sampled plasma CSV so plasma frequency, restoring response, and ${sampleCount} deterministic phase samples can be reviewed before export.`
  })
  protected readonly restoreSummary = computed(
    () =>
      "Restore focus: import a Plasma JSON payload exported from this workspace to recover the active scenario, snapshot time, overlays, and sampled diagnostics on the shared Phase 33 surface.",
  )

  constructor() {
    afterNextRender(() => {
      void this.initializeRenderer()
    })

    effect(() => {
      this.selectedScenario()
      this.currentState()
      this.sampledStates()
      this.overlays()
      this.renderViewport()
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  ngOnInit(): void {
    this.webGpuMessage.set("Preparing Plasma Physics WebGPU viewport...")
  }

  protected selectScenario(id: PlasmaPhysicsScenarioId): void {
    this.state.selectScenario(id)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateNumericField(field: EditablePlasmaPhysicsField, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value)
    this.state.updateField(field, value)
  }

  protected toggleOverlay(key: OverlayKey): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  protected updateImportPayload(event: Event): void {
    this.importPayloadText.set((event.target as HTMLTextAreaElement).value)
  }

  protected async copyJson(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Plasma scenario copied to clipboard.")
  }

  protected downloadJson(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Plasma scenario exported as JSON.")
  }

  protected downloadCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Plasma report exported as CSV.")
  }

  protected restorePayload(): void {
    try {
      const payload = parseImportPayload(this.importPayloadText())
      this.state.importScenarioState(payload)
      if (payload.overlays) {
        this.overlays.set(payload.overlays)
      }
      this.importPayloadText.set(this.exportPreview())
      this.exportMessage.set("Plasma scenario restored from JSON.")
      this.hoveredSampleIndex.set(null)
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
      this.hoveredSampleIndex.set(null)
    }
  }

  protected updateHoveredSample(event: MouseEvent): void {
    const target = event.currentTarget
    const samples = this.sampledStates()
    if (!(target instanceof HTMLElement) || samples.length === 0) {
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

    this.hoveredSampleIndex.set(this.activeSampleIndex())
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

  protected stepHoveredSample(step: number): void {
    const samples = this.sampledStates()
    if (samples.length === 0) {
      return
    }

    const currentIndex = this.hoveredSampleIndex() ?? this.activeSampleIndex()
    this.hoveredSampleIndex.set(Math.min(Math.max(currentIndex + step, 0), samples.length - 1))
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

  private formatSampleLabel(
    sample: NonNullable<ReturnType<PlasmaPhysicsPageComponent["activeSample"]>>,
  ): string {
    if (this.selectedScenario().id === "debye-screening") {
      return `Sample probe radius ${sample.position.toFixed(2)} mm`
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return `Sample radius fraction ${sample.position.toFixed(2)}`
    }

    return `Sample phase ${sample.position.toFixed(2)}`
  }

  private formatSampleReadoutRows(
    sample: NonNullable<ReturnType<PlasmaPhysicsPageComponent["activeSample"]>>,
  ): Array<{ label: string; value: string }> {
    if (this.selectedScenario().id === "debye-screening") {
      return [
        { label: "Screened potential", value: `${sample.primaryValue.toFixed(2)} V` },
        { label: "Shielding fraction", value: `${(sample.secondaryValue ?? 0).toFixed(2)}` },
      ]
    }

    if (this.selectedScenario().id === "magnetic-confinement") {
      return [
        { label: "Beta proxy", value: `${sample.primaryValue.toFixed(2)} %` },
        { label: "Safety factor", value: `${(sample.secondaryValue ?? 0).toFixed(2)}` },
      ]
    }

    return [
      { label: "Density response", value: `${sample.primaryValue.toFixed(2)}` },
      { label: "Restoring response", value: `${(sample.secondaryValue ?? 0).toFixed(2)}` },
    ]
  }

  private async initializeWebGpuStatus(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(
      status.supported
        ? "WebGPU available for the upcoming Plasma Physics renderer integration."
        : status.message,
    )
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    if (!status.supported) {
      return
    }

    const renderer = await PlasmaPhysicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!renderer) {
      this.webGpuMessage.set("Plasma Physics WebGPU viewport initialization failed.")
      return
    }

    this.renderer = renderer
    this.rendererReady.set(true)
    this.webGpuMessage.set("Plasma Physics WebGPU viewport ready.")
    this.renderViewport()
  }

  private renderViewport(): void {
    if (!this.renderer) {
      return
    }

    this.renderer.render({
      scenario: this.selectedScenario(),
      snapshot: this.currentState(),
      overlays: this.overlays(),
      samples: this.sampledStates(),
    })
  }

  private downloadTextFile(filename: string, content: string, mimeType: string): void {
    if (typeof document === "undefined") {
      this.exportMessage.set("File export is only available in the browser.")
      return
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }
}

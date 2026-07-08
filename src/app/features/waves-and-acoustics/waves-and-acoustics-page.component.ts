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
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
  buildSampleReferencePath,
} from "./waves-and-acoustics-analytics"
import {
  EditableWavesAndAcousticsField,
  WavesAndAcousticsStateService,
} from "./waves-and-acoustics-state.service"
import { WavesAndAcousticsScenarioId } from "./waves-and-acoustics.models"
import {
  buildExportPayload,
  parseImportPayload,
  WavesAndAcousticsOverlayOptions,
} from "./waves-and-acoustics-payload"
import {
  buildWavesAndAcousticsReportCsv,
  buildWavesAndAcousticsReportSummaryRows,
} from "./waves-and-acoustics-report"
import { WavesAndAcousticsWebGpuRenderer } from "./waves-and-acoustics-webgpu-renderer"

const DEFAULT_OVERLAYS: WavesAndAcousticsOverlayOptions = {
  showWaveGuides: true,
  showNodeMarkers: true,
  showReferenceCurve: true,
}

@Component({
  selector: "app-waves-and-acoustics-page",
  templateUrl: "./waves-and-acoustics-page.component.html",
  styleUrl: "./waves-and-acoustics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WavesAndAcousticsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(WavesAndAcousticsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: WavesAndAcousticsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarios = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<WavesAndAcousticsOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly isStandingWave = computed(() => this.selectedScenario().id === "standing-wave")
  protected readonly isTravelingWave = computed(
    () => this.selectedScenario().id === "traveling-wave",
  )
  protected readonly standingWaveMetrics = computed(() => ({
    stringLengthMeters: this.selectedScenario().stringLengthMeters ?? 0,
    waveSpeedMetersPerSecond: this.selectedScenario().waveSpeedMetersPerSecond ?? 0,
    amplitudeMillimeters: this.selectedScenario().amplitudeMillimeters ?? 0,
    harmonicNumber: this.selectedScenario().harmonicNumber ?? 1,
  }))
  protected readonly travelWaveMetrics = computed(() => ({
    waveSpeedMetersPerSecond: this.selectedScenario().waveSpeedMetersPerSecond ?? 0,
    amplitudeMillimeters: this.selectedScenario().amplitudeMillimeters ?? 0,
    frequencyHertz: this.selectedScenario().frequencyHertz ?? 0,
  }))
  protected readonly dopplerMetrics = computed(() => ({
    emittedFrequencyHertz: this.selectedScenario().emittedFrequencyHertz ?? 0,
    waveSpeedMetersPerSecond: this.selectedScenario().waveSpeedMetersPerSecond ?? 0,
    sourceSpeedMetersPerSecond: this.selectedScenario().sourceSpeedMetersPerSecond ?? 0,
    observerSpeedMetersPerSecond: this.selectedScenario().observerSpeedMetersPerSecond ?? 0,
  }))
  protected readonly overlayLabels = computed(() => {
    if (this.selectedScenario().id === "doppler-effect") {
      return {
        showWaveGuides: "Propagation guides",
        showNodeMarkers: "Source and observer markers",
        showReferenceCurve: "Emitted-frequency baseline",
      }
    }

    if (this.selectedScenario().id === "traveling-wave") {
      return {
        showWaveGuides: "Wavelength guides",
        showNodeMarkers: "Sample markers",
        showReferenceCurve: "Equilibrium baseline",
      }
    }

    return {
      showWaveGuides: "Node-spacing guides",
      showNodeMarkers: "Node markers",
      showReferenceCurve: "Equilibrium baseline",
    }
  })
  protected readonly focusSummary = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()
    if (scenario.id === "doppler-effect") {
      return `Apparent frequency shifts to ${(snapshot.apparentFrequencyHertz ?? 0).toFixed(2)} Hz for the active source and observer speeds.`
    }
    if (scenario.id === "traveling-wave") {
      return `The active traveling wave advances with wavelength ${(snapshot.wavelengthMeters ?? 0).toFixed(3)} m at ${(snapshot.frequencyHertz ?? 0).toFixed(2)} Hz.`
    }
    return `Standing-wave mode n=${snapshot.harmonicNumber ?? 1} produces wavelength ${(snapshot.wavelengthMeters ?? 0).toFixed(3)} m and frequency ${(snapshot.frequencyHertz ?? 0).toFixed(2)} Hz.`
  })
  protected readonly residualSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "doppler-effect") {
      return `Emitted ${(snapshot.emittedFrequencyHertz ?? 0).toFixed(2)} Hz, observed ${(snapshot.apparentFrequencyHertz ?? 0).toFixed(2)} Hz, source speed ${(snapshot.sourceSpeedMetersPerSecond ?? 0).toFixed(2)} m/s.`
    }
    if (this.selectedScenario().id === "traveling-wave") {
      return `Wave speed ${(snapshot.waveSpeedMetersPerSecond ?? 0).toFixed(2)} m/s, wavelength ${(snapshot.wavelengthMeters ?? 0).toFixed(3)} m, period ${((snapshot.frequencyHertz ?? 0) > 0 ? 1 / (snapshot.frequencyHertz ?? 1) : 0).toFixed(3)} s.`
    }
    return `String length ${(snapshot.stringLengthMeters ?? 0).toFixed(3)} m, node spacing ${((snapshot.wavelengthMeters ?? 0) / 2).toFixed(3)} m, peak amplitude ${(snapshot.amplitudeMillimeters ?? 0).toFixed(2)} mm.`
  })
  protected readonly controlNote = computed(() => {
    if (this.selectedScenario().id === "doppler-effect") {
      return "Doppler payloads use emittedFrequencyHertz, waveSpeedMetersPerSecond, sourceSpeedMetersPerSecond, observerSpeedMetersPerSecond, and snapshot.timeSeconds."
    }
    if (this.selectedScenario().id === "traveling-wave") {
      return "Traveling-wave payloads use waveSpeedMetersPerSecond, amplitudeMillimeters, frequencyHertz, and snapshot.timeSeconds."
    }
    return "Standing-wave payloads use stringLengthMeters, waveSpeedMetersPerSecond, amplitudeMillimeters, harmonicNumber, and snapshot.timeSeconds."
  })
  protected readonly viewportHint = computed(() => {
    if (this.selectedScenario().id === "doppler-effect") {
      return "The viewport renders source-observer positions, relative propagation guides, and a frequency-shift trace for the active Doppler slice."
    }
    if (this.selectedScenario().id === "traveling-wave") {
      return "The viewport renders a one-dimensional traveling waveform, propagation direction, and wavelength reference markers."
    }
    return "The viewport renders the string baseline, standing-wave profile, and node markers for the active harmonic mode."
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
    buildWavesAndAcousticsReportCsv(
      this.selectedScenario(),
      this.currentState(),
      this.sampledStates(),
    ),
  )
  protected readonly reportSummaryRows = computed(() =>
    buildWavesAndAcousticsReportSummaryRows(this.selectedScenario(), this.currentState()),
  )
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly samplePlotPath = computed(() => buildSampleGraphPath(this.sampledStates()))
  protected readonly samplePlotGuides = computed(() =>
    buildSamplePlotGuides(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly sampleReferencePath = computed(() =>
    buildSampleReferencePath(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly samplePlotMarkers = computed(() =>
    buildSampleMarkerPoints(this.sampledStates()),
  )
  protected readonly samplePlotTitle = computed(() => {
    if (this.selectedScenario().id === "doppler-effect") {
      return "Frequency profile"
    }
    if (this.selectedScenario().id === "traveling-wave") {
      return "Traveling-wave displacement"
    }
    return "Standing-wave displacement"
  })
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length
    if (this.selectedScenario().id === "doppler-effect") {
      return `${sampleCount} sampled positions interpolate emitted and apparent frequency across the one-dimensional Doppler slice.`
    }
    return `${sampleCount} sampled positions trace the current waveform profile used by the shared renderer and export flow.`
  })
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
      return this.selectedScenario().id === "doppler-effect"
        ? "Hover the plot or focus it to inspect sampled frequency positions."
        : "Hover the plot or focus it to inspect sampled wave positions."
    }

    return `Sample position ${sample.position.toFixed(3)} m`
  })
  protected readonly plotReadoutRows = computed(() => {
    const sample = this.hoveredSample()
    if (sample === null) {
      return [] as Array<{ label: string; value: string }>
    }

    if (this.selectedScenario().id === "doppler-effect") {
      const emittedFrequency = this.currentState().emittedFrequencyHertz ?? 0
      const shift = sample.primaryValue - emittedFrequency
      return [
        { label: "Frequency", value: `${sample.primaryValue.toFixed(2)} Hz` },
        {
          label: "Shift",
          value: `${shift >= 0 ? "+" : ""}${shift.toFixed(2)} Hz`,
        },
      ]
    }

    return [{ label: "Displacement", value: `${sample.primaryValue.toFixed(2)} mm` }]
  })
  protected readonly hoveredSampleAnnouncement = computed(() => {
    const rows = this.plotReadoutRows()
    if (rows.length === 0) {
      return this.hoveredSampleLabel()
    }

    return `${this.hoveredSampleLabel()}. ${rows.map((row) => `${row.label} ${row.value}`).join(". ")}.`
  })
  protected readonly plotNavigationDisabled = computed(() => this.sampledStates().length === 0)
  protected readonly showPlotGuides = computed(() => this.overlays().showWaveGuides)
  protected readonly showPlotMarkers = computed(() => this.overlays().showNodeMarkers)
  protected readonly showPlotReferenceCurve = computed(() => this.overlays().showReferenceCurve)
  protected readonly atFirstHoveredSample = computed(() => (this.hoveredSampleIndex() ?? 0) <= 0)
  protected readonly atLastHoveredSample = computed(() => {
    const samples = this.sampledStates()
    return samples.length === 0 || (this.hoveredSampleIndex() ?? 0) >= samples.length - 1
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
    this.state.selectScenario(target.value as WavesAndAcousticsScenarioId)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateScenarioParameter(field: EditableWavesAndAcousticsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof WavesAndAcousticsOverlayOptions): void {
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
    this.exportMessage.set("Waves and Acoustics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Waves and Acoustics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Waves and Acoustics report exported as CSV.")
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
      this.overlays.set(payload.overlays ?? DEFAULT_OVERLAYS)
      this.exportMessage.set("Waves and Acoustics scenario restored from JSON.")
      this.hoveredSampleIndex.set(null)
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
  }

  protected resetScenario(): void {
    this.state.resetSelectedScenario()
    this.overlays.set({ ...DEFAULT_OVERLAYS })
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

    this.renderer = await WavesAndAcousticsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("Waves and Acoustics viewport initialization failed.")
      return
    }

    this.webGpuMessage.set("Waves and Acoustics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(
      this.currentState(),
      this.selectedScenario(),
      this.overlays(),
      this.sampledStates(),
    )
  }

  private downloadTextFile(filename: string, content: string, type: string): void {
    if (globalThis.window === undefined) {
      this.exportMessage.set("File export is only available in the browser.")
      return
    }

    const blob = new Blob([content], { type })
    const url = globalThis.URL.createObjectURL(blob)
    const link = globalThis.document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    globalThis.URL.revokeObjectURL(url)
  }
}

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
} from "./astrophysics-analytics"
import {
  parseImportPayload,
  AstrophysicsOverlayOptions,
  buildExportPayload,
} from "./astrophysics-payload"
import {
  buildAstrophysicsReportCsv,
  buildAstrophysicsReportSummaryRows,
} from "./astrophysics-report"
import { AstrophysicsStateService, EditableAstrophysicsField } from "./astrophysics-state.service"
import { AstrophysicsWebGpuRenderer } from "./astrophysics-webgpu-renderer"

const DEFAULT_OVERLAYS: AstrophysicsOverlayOptions = {
  showReferenceGuides: true,
  showActiveMarker: true,
  showComparisonBand: true,
}

@Component({
  selector: "app-astrophysics-page",
  templateUrl: "./astrophysics-page.component.html",
  styleUrl: "./astrophysics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AstrophysicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(AstrophysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: AstrophysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarios = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<AstrophysicsOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly isPlanetaryOrbit = computed(
    () => this.selectedScenario().id === "planetary-orbit",
  )
  protected readonly isStellarLuminosity = computed(
    () => this.selectedScenario().id === "stellar-luminosity",
  )
  protected readonly isHubbleExpansion = computed(
    () => this.selectedScenario().id === "hubble-expansion",
  )
  protected readonly overlayLabels = computed(() => {
    if (this.isStellarLuminosity()) {
      return {
        showReferenceGuides: "Habitable-zone guides",
        showActiveMarker: "Peak-irradiance marker",
        showComparisonBand: "Inverse-square comparison",
      }
    }

    if (this.isHubbleExpansion()) {
      return {
        showReferenceGuides: "Distance and zero-velocity guides",
        showActiveMarker: "Active galaxy marker",
        showComparisonBand: "Light-travel comparison",
      }
    }

    return {
      showReferenceGuides: "Orbital-axis guides",
      showActiveMarker: "Active orbital marker",
      showComparisonBand: "Circular-orbit comparison",
    }
  })
  protected readonly viewportLegendItems = computed(() => [
    {
      key: "showReferenceGuides" as const,
      label: this.overlayLabels().showReferenceGuides,
      active: this.overlays().showReferenceGuides,
      kind: "position",
    },
    {
      key: "showActiveMarker" as const,
      label: this.overlayLabels().showActiveMarker,
      active: this.overlays().showActiveMarker,
      kind: "velocity",
    },
    {
      key: "showComparisonBand" as const,
      label: this.overlayLabels().showComparisonBand,
      active: this.overlays().showComparisonBand,
      kind: "acceleration",
    },
  ])
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly completionStatus = computed(
    () => "Phase 25 Astrophysics Angular slice complete",
  )
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isStellarLuminosity()) {
      return `Luminosity ${(snapshot.luminositySolarUnits ?? 0).toFixed(2)} Lsun with a habitable zone from ${(snapshot.habitableZoneInnerAstronomicalUnits ?? 0).toFixed(2)} AU to ${(snapshot.habitableZoneOuterAstronomicalUnits ?? 0).toFixed(2)} AU.`
    }

    if (this.isHubbleExpansion()) {
      return `Recession velocity ${(snapshot.recessionVelocityKilometersPerSecond ?? 0).toFixed(0)} km/s at ${(snapshot.distanceMegaparsecs ?? 0).toFixed(0)} Mpc, with approximate redshift ${(snapshot.redshift ?? 0).toFixed(4)}.`
    }

    return `Orbital period ${(snapshot.orbitalPeriodDays ?? 0).toFixed(2)} days with orbital speed ${(snapshot.orbitalSpeedKilometersPerSecond ?? 0).toFixed(2)} km/s around the active star.`
  })
  protected readonly nextMilestone = computed(() => {
    if (this.isStellarLuminosity()) {
      return "Prepare the Vulkan follow-on by mirroring the completed Angular stellar diagnostics, plot interactions, and viewport overlays."
    }

    if (this.isHubbleExpansion()) {
      return "Prepare the Vulkan follow-on by mirroring the completed Angular cosmology diagnostics, plot interactions, and viewport overlays."
    }

    return "Prepare the Vulkan follow-on by mirroring the completed Angular orbit diagnostics, plot interactions, and viewport overlays."
  })
  protected readonly liveReadoutRows = computed(() => {
    const snapshot = this.currentState()
    if (this.isStellarLuminosity()) {
      return [
        { label: "Snapshot time", value: `${snapshot.timeSeconds.toFixed(2)} s` },
        { label: "Luminosity", value: `${(snapshot.luminositySolarUnits ?? 0).toFixed(2)} Lsun` },
        {
          label: "Inner HZ",
          value: `${(snapshot.habitableZoneInnerAstronomicalUnits ?? 0).toFixed(2)} AU`,
        },
        {
          label: "Outer HZ",
          value: `${(snapshot.habitableZoneOuterAstronomicalUnits ?? 0).toFixed(2)} AU`,
        },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    if (this.isHubbleExpansion()) {
      return [
        { label: "Snapshot time", value: `${snapshot.timeSeconds.toFixed(2)} s` },
        { label: "Distance", value: `${(snapshot.distanceMegaparsecs ?? 0).toFixed(0)} Mpc` },
        {
          label: "Recession velocity",
          value: `${(snapshot.recessionVelocityKilometersPerSecond ?? 0).toFixed(0)} km/s`,
        },
        { label: "Redshift", value: `${(snapshot.redshift ?? 0).toFixed(4)}` },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    return [
      { label: "Snapshot time", value: `${snapshot.timeSeconds.toFixed(2)} s` },
      { label: "Orbital period", value: `${(snapshot.orbitalPeriodDays ?? 0).toFixed(2)} days` },
      {
        label: "Orbital speed",
        value: `${(snapshot.orbitalSpeedKilometersPerSecond ?? 0).toFixed(2)} km/s`,
      },
      {
        label: "Escape speed",
        value: `${(snapshot.escapeSpeedKilometersPerSecond ?? 0).toFixed(2)} km/s`,
      },
      { label: "Samples", value: `${this.sampledStates().length}` },
    ]
  })
  protected readonly controlNote = computed(() => {
    if (this.isStellarLuminosity()) {
      return "Stellar payloads use stellarMassSolarMasses, stellarRadiusSolarRadii, surfaceTemperatureKelvin, and snapshot.timeSeconds."
    }

    if (this.isHubbleExpansion()) {
      return "Hubble payloads use distanceMegaparsecs, hubbleConstantKilometersPerSecondPerMegaparsec, and snapshot.timeSeconds."
    }

    return "Planetary-orbit payloads use centralMassSolarMasses, orbitalRadiusAstronomicalUnits, orbitalEccentricity, and snapshot.timeSeconds."
  })
  protected readonly reportSummaryRows = computed(() =>
    buildAstrophysicsReportSummaryRows(this.selectedScenario(), this.currentState()),
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
    buildAstrophysicsReportCsv(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly samplePlotPath = computed(() => buildSampleGraphPath(this.sampledStates()))
  protected readonly showPlotGuides = computed(() => this.overlays().showReferenceGuides)
  protected readonly showPlotMarkers = computed(() => this.overlays().showActiveMarker)
  protected readonly showPlotComparisonPath = computed(() => this.overlays().showComparisonBand)
  protected readonly sampleComparisonPath = computed(() =>
    buildSampleComparisonPath(this.sampledStates()),
  )
  protected readonly samplePlotGuides = computed(() =>
    buildSamplePlotGuides(this.selectedScenario(), this.currentState(), this.sampledStates()),
  )
  protected readonly samplePlotMarkers = computed(() =>
    buildSampleMarkerPoints(this.sampledStates()),
  )
  protected readonly samplePlotTitle = computed(() => {
    if (this.isStellarLuminosity()) {
      return "Irradiance profile"
    }

    if (this.isHubbleExpansion()) {
      return "Hubble-law profile"
    }

    return "Orbital plane"
  })
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length
    if (this.isStellarLuminosity()) {
      return `${sampleCount} sampled distances trace irradiance falloff and the habitable-zone guides.`
    }

    if (this.isHubbleExpansion()) {
      return `${sampleCount} sampled distances trace recession velocity and the light-travel comparison curve.`
    }

    return `${sampleCount} sampled orbital positions trace the orbit geometry used by the current export and report flow.`
  })
  protected readonly hoveredSample = computed(() => {
    const index = this.hoveredSampleIndex()
    if (index === null) {
      return null
    }

    return this.sampledStates()[index] ?? null
  })
  protected readonly activeSample = computed(
    () => this.sampledStates().find((sample) => sample.active) ?? this.sampledStates()[0] ?? null,
  )
  protected readonly activeSampleIndex = computed(() => {
    const activeIndex = this.sampledStates().findIndex((sample) => sample.active)
    return activeIndex >= 0 ? activeIndex : 0
  })

  private formatSampleLabel(
    sample: NonNullable<ReturnType<AstrophysicsPageComponent["activeSample"]>>,
  ): string {
    if (this.isStellarLuminosity()) {
      return `Sample distance ${sample.position.toFixed(2)} AU`
    }

    if (this.isHubbleExpansion()) {
      return `Sample distance ${sample.position.toFixed(0)} Mpc`
    }

    return `Sample orbit position (${sample.position.toFixed(2)}, ${sample.primaryValue.toFixed(2)}) AU`
  }

  private formatSampleReadoutRows(
    sample: NonNullable<ReturnType<AstrophysicsPageComponent["activeSample"]>>,
  ): Array<{ label: string; value: string }> {
    if (this.isStellarLuminosity()) {
      return [{ label: "Irradiance", value: `${sample.primaryValue.toFixed(2)} relative flux` }]
    }

    if (this.isHubbleExpansion()) {
      return [
        { label: "Recession velocity", value: `${sample.primaryValue.toFixed(0)} km/s` },
        {
          label: "Light-travel scale",
          value: `${(sample.secondaryValue ?? 0).toFixed(2)} billion years`,
        },
      ]
    }

    return [
      { label: "Orbital speed", value: `${(sample.secondaryValue ?? 0).toFixed(2)} km/s` },
      { label: "Vertical position", value: `${sample.primaryValue.toFixed(2)} AU` },
    ]
  }
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
      if (this.isStellarLuminosity()) {
        return "Hover the plot or focus it to inspect sampled irradiance positions."
      }

      if (this.isHubbleExpansion()) {
        return "Hover the plot or focus it to inspect sampled Hubble-law positions."
      }

      return "Hover the plot or focus it to inspect sampled orbital positions."
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

    const rowSummary = rows.map((row) => row.label + " " + row.value).join(". ")
    return `${this.hoveredSampleLabel()}. ${rowSummary}.`
  })
  protected readonly viewportContextSummary = computed(() => {
    const sample = this.hoveredSample() ?? this.activeSample()
    if (sample !== null) {
      return this.formatSampleLabel(sample)
    }

    return this.focusSummary()
  })
  protected readonly viewportContextRows = computed(() => {
    const sample = this.hoveredSample() ?? this.activeSample()
    if (sample !== null) {
      return this.formatSampleReadoutRows(sample)
    }

    return this.liveReadoutRows().slice(0, 3)
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
  protected readonly viewportSummary = computed(() => {
    if (this.isStellarLuminosity()) {
      return "The WebGPU viewport traces irradiance falloff together with the habitable-zone guide rails."
    }

    if (this.isHubbleExpansion()) {
      return "The WebGPU viewport traces the Hubble-law line with the light-travel comparison curve."
    }

    return "The WebGPU viewport traces the active orbital ellipse, circular comparison orbit, and current orbital marker."
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

  protected selectScenario(id: Parameters<AstrophysicsStateService["selectScenario"]>[0]): void {
    this.state.selectScenario(id)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateScenarioParameter(field: EditableAstrophysicsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof AstrophysicsOverlayOptions): void {
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
    this.exportMessage.set("Astrophysics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Astrophysics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Astrophysics report exported as CSV.")
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
      this.exportMessage.set("Astrophysics scenario restored from JSON.")
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
    const target = event.currentTarget as HTMLElement | null
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

    const currentIndex = this.hoveredSampleIndex() ?? this.activeSampleIndex()
    this.hoveredSampleIndex.set(Math.min(Math.max(currentIndex + delta, 0), samples.length - 1))
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

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    if (!status.supported) {
      return
    }

    this.renderer = await AstrophysicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("WebGPU renderer initialization failed.")
      return
    }

    this.webGpuMessage.set("Astrophysics WebGPU viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(
      this.currentState(),
      this.selectedScenario(),
      this.overlays(),
      this.sampledStates(),
    )
  }
}

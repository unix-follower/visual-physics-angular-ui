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
} from "./atmospheric-physics-analytics"
import { buildExportPayload } from "./atmospheric-physics-payload"
import {
  buildAtmosphericPhysicsReportCsv,
  buildAtmosphericPhysicsReportSummaryRows,
} from "./atmospheric-physics-report"
import { parseImportPayload } from "./atmospheric-physics-payload"
import {
  AtmosphericPhysicsStateService,
  EditableAtmosphericPhysicsField,
} from "./atmospheric-physics-state.service"
import { AtmosphericPhysicsOverlayOptions } from "./atmospheric-physics.models"
import { AtmosphericPhysicsWebGpuRenderer } from "./atmospheric-physics-webgpu-renderer"

const DEFAULT_OVERLAYS: AtmosphericPhysicsOverlayOptions = {
  showReferenceGuides: true,
  showActiveMarker: true,
  showComparisonBand: true,
}

@Component({
  selector: "app-atmospheric-physics-page",
  templateUrl: "./atmospheric-physics-page.component.html",
  styleUrl: "./atmospheric-physics-page.component.css",
  providers: [AtmosphericPhysicsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AtmosphericPhysicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(AtmosphericPhysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: AtmosphericPhysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<AtmosphericPhysicsOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly completionStatus = computed(
    () => "Phase 27 atmospheric scenario set in progress",
  )
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return `Temperature ${(snapshot.temperatureKelvin ?? 0).toFixed(1)} K at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km with a reference profile of ${(snapshot.referenceTemperatureKelvin ?? 0).toFixed(1)} K.`
    }

    if (this.selectedScenario().id === "convection-column") {
      return `Parcel altitude ${(snapshot.parcelAltitudeKilometers ?? 0).toFixed(1)} km with updraft ${(snapshot.updraftVelocityMetersPerSecond ?? 0).toFixed(1)} m/s and CAPE proxy ${(snapshot.convectiveAvailablePotentialEnergyKilojoulesPerKilogram ?? 0).toFixed(2)} kJ/kg.`
    }

    return `Pressure ${(snapshot.pressureKilopascals ?? 0).toFixed(1)} kPa at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km with relative density ${(snapshot.relativeDensity ?? 0).toFixed(2)}.`
  })
  protected readonly controlNote = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return `Surface temperature and lapse-rate inputs keep the active layer at ${(snapshot.temperatureKelvin ?? 0).toFixed(1)} K versus a ${(snapshot.referenceTemperatureKelvin ?? 0).toFixed(1)} K reference profile at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km.`
    }

    if (this.selectedScenario().id === "convection-column") {
      return `Environmental lapse rate and parcel temperature excess keep the parcel at ${(snapshot.parcelAltitudeKilometers ?? 0).toFixed(1)} km with ${(snapshot.updraftVelocityMetersPerSecond ?? 0).toFixed(2)} m/s updraft and ${(snapshot.convectiveAvailablePotentialEnergyKilojoulesPerKilogram ?? 0).toFixed(2)} kJ/kg CAPE proxy.`
    }

    return `Sea-level pressure and scale-height inputs keep the active column at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km with ${(snapshot.pressureKilopascals ?? 0).toFixed(2)} kPa pressure and ${(snapshot.relativeDensity ?? 0).toFixed(3)} relative density.`
  })
  protected readonly viewportHint = computed(() => {
    if (this.selectedScenario().id === "convection-column") {
      return "The viewport now traces a rising parcel column, buoyancy guides, and the active convective marker."
    }

    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return "The viewport now traces a temperature-altitude profile with tropopause and reference-temperature guides."
    }

    return "The viewport now traces a hydrostatic pressure profile with scale-height guides and an active altitude marker."
  })
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly overlayLabels = computed(() => {
    if (this.selectedScenario().id === "convection-column") {
      return {
        showReferenceGuides: "Parcel guides",
        showActiveMarker: "Parcel marker",
        showComparisonBand: "Buoyancy comparison",
      }
    }

    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return {
        showReferenceGuides: "Tropopause guide",
        showActiveMarker: "Active altitude marker",
        showComparisonBand: "Environmental comparison",
      }
    }

    return {
      showReferenceGuides: "Scale-height guides",
      showActiveMarker: "Active altitude marker",
      showComparisonBand: "Density comparison",
    }
  })
  protected readonly reportSummaryRows = computed(() =>
    buildAtmosphericPhysicsReportSummaryRows(this.selectedScenario(), this.currentState()),
  )
  protected readonly liveReadoutRows = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return [
        { label: "Altitude", value: `${(snapshot.altitudeKilometers ?? 0).toFixed(2)} km` },
        { label: "Temperature", value: `${(snapshot.temperatureKelvin ?? 0).toFixed(1)} K` },
        {
          label: "Reference temperature",
          value: `${(snapshot.referenceTemperatureKelvin ?? 0).toFixed(1)} K`,
        },
        {
          label: "Lapse delta",
          value: `${((snapshot.temperatureKelvin ?? 0) - (snapshot.referenceTemperatureKelvin ?? 0)).toFixed(1)} K`,
        },
        { label: "Time cursor", value: `${snapshot.timeSeconds.toFixed(2)} s` },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    if (this.selectedScenario().id === "convection-column") {
      return [
        {
          label: "Parcel altitude",
          value: `${(snapshot.parcelAltitudeKilometers ?? 0).toFixed(2)} km`,
        },
        {
          label: "Updraft velocity",
          value: `${(snapshot.updraftVelocityMetersPerSecond ?? 0).toFixed(2)} m/s`,
        },
        {
          label: "Buoyancy proxy",
          value: `${(snapshot.buoyancyAccelerationMetersPerSecondSquared ?? 0).toFixed(3)} m/s^2`,
        },
        {
          label: "CAPE proxy",
          value: `${(snapshot.convectiveAvailablePotentialEnergyKilojoulesPerKilogram ?? 0).toFixed(2)} kJ/kg`,
        },
        {
          label: "Parcel temperature excess",
          value: `${(this.selectedScenario().parcelTemperatureExcessKelvin ?? 0).toFixed(1)} K`,
        },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    return [
      { label: "Altitude", value: `${(snapshot.altitudeKilometers ?? 0).toFixed(2)} km` },
      { label: "Pressure", value: `${(snapshot.pressureKilopascals ?? 0).toFixed(2)} kPa` },
      { label: "Relative density", value: `${(snapshot.relativeDensity ?? 0).toFixed(3)}` },
      {
        label: "Scale height",
        value: `${(this.selectedScenario().scaleHeightKilometers ?? 0).toFixed(1)} km`,
      },
      { label: "Time cursor", value: `${snapshot.timeSeconds.toFixed(2)} s` },
      { label: "Samples", value: `${this.sampledStates().length}` },
    ]
  })
  protected readonly statusRows = computed(() => {
    const snapshot = this.currentState()
    return [
      { label: "Scenario status", value: this.selectedScenario().status },
      { label: "Numerical state", value: snapshot.stable ? "Stable" : "Needs review" },
      {
        label: "Viewport state",
        value: this.rendererReady() ? "WebGPU viewport ready" : this.webGpuMessage(),
      },
      {
        label: "Reference guides",
        value: this.overlays().showReferenceGuides ? "Enabled" : "Disabled",
      },
      { label: "Active marker", value: this.overlays().showActiveMarker ? "Enabled" : "Disabled" },
      {
        label: "Comparison band",
        value: this.overlays().showComparisonBand ? "Enabled" : "Disabled",
      },
    ]
  })
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly insightSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return `Atmospheric lapse insight focus: the active profile differs from the reference atmosphere by ${((snapshot.temperatureKelvin ?? 0) - (snapshot.referenceTemperatureKelvin ?? 0)).toFixed(1)} K at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km.`
    }

    if (this.selectedScenario().id === "convection-column") {
      return `Convection insight focus: parcel ascent remains ${snapshot.stable ? "numerically stable" : "unstable"} while the updraft reaches ${(snapshot.updraftVelocityMetersPerSecond ?? 0).toFixed(2)} m/s and the CAPE proxy holds ${(snapshot.convectiveAvailablePotentialEnergyKilojoulesPerKilogram ?? 0).toFixed(2)} kJ/kg.`
    }

    return `Barometric insight focus: the hydrostatic column remains ${snapshot.stable ? "numerically stable" : "unstable"} while pressure decays to ${(snapshot.pressureKilopascals ?? 0).toFixed(2)} kPa at ${(snapshot.altitudeKilometers ?? 0).toFixed(1)} km.`
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
    buildAtmosphericPhysicsReportCsv(
      this.selectedScenario(),
      this.currentState(),
      this.sampledStates(),
    ),
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
    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return "Temperature-altitude profile"
    }

    if (this.selectedScenario().id === "convection-column") {
      return "Convection updraft profile"
    }

    return "Pressure-altitude profile"
  })
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length
    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return `${sampleCount} sampled altitudes trace the dry-lapse profile and the reference comparison curve.`
    }

    if (this.selectedScenario().id === "convection-column") {
      return `${sampleCount} sampled parcel positions trace updraft evolution together with the buoyancy comparison profile.`
    }

    return `${sampleCount} sampled altitudes trace the hydrostatic pressure falloff used by the active export and report flow.`
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
      return "Hover the plot or focus it to inspect sampled atmospheric states."
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

  private formatSampleLabel(
    sample: NonNullable<ReturnType<AtmosphericPhysicsPageComponent["activeSample"]>>,
  ): string {
    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return `Sample altitude ${sample.position.toFixed(2)} km`
    }

    if (this.selectedScenario().id === "convection-column") {
      return `Sample parcel altitude ${sample.position.toFixed(2)} km`
    }

    return `Sample altitude ${sample.position.toFixed(2)} km`
  }

  private formatSampleReadoutRows(
    sample: NonNullable<ReturnType<AtmosphericPhysicsPageComponent["activeSample"]>>,
  ): Array<{ label: string; value: string }> {
    if (this.selectedScenario().id === "adiabatic-lapse-rate") {
      return [
        { label: "Temperature", value: `${sample.primaryValue.toFixed(1)} K` },
        {
          label: "Reference temperature",
          value: `${(sample.secondaryValue ?? sample.primaryValue).toFixed(1)} K`,
        },
      ]
    }

    if (this.selectedScenario().id === "convection-column") {
      return [
        { label: "Updraft velocity", value: `${sample.primaryValue.toFixed(2)} m/s` },
        { label: "Buoyancy proxy", value: `${(sample.secondaryValue ?? 0).toFixed(3)} m/s^2` },
      ]
    }

    return [
      { label: "Pressure", value: `${sample.primaryValue.toFixed(2)} kPa` },
      { label: "Relative density", value: `${(sample.secondaryValue ?? 0).toFixed(3)}` },
    ]
  }

  protected selectScenario(event: Event): void {
    const select = event.target as HTMLSelectElement
    this.selectScenarioById(
      select.value as Parameters<AtmosphericPhysicsStateService["selectScenario"]>[0],
    )
  }

  protected selectScenarioById(
    id: Parameters<AtmosphericPhysicsStateService["selectScenario"]>[0],
  ): void {
    this.state.selectScenario(id)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateField(field: EditableAtmosphericPhysicsField, event: Event): void {
    const input = event.target as HTMLInputElement
    this.state.updateField(field, Number.parseFloat(input.value))
  }

  protected toggleOverlay(key: keyof AtmosphericPhysicsOverlayOptions): void {
    this.overlays.update((overlays) => ({
      ...overlays,
      [key]: !overlays[key],
    }))
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Atmospheric Physics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Atmospheric Physics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Atmospheric Physics report exported as CSV.")
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
      this.exportMessage.set("Atmospheric Physics scenario restored from JSON.")
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

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    if (!status.supported) {
      return
    }

    this.renderer = await AtmosphericPhysicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("WebGPU renderer initialization failed.")
      return
    }

    this.webGpuMessage.set("Atmospheric Physics WebGPU viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(
      this.currentState(),
      this.selectedScenario(),
      this.overlays(),
      this.sampledStates(),
    )
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

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
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
} from "./solid-state-physics-analytics"
import { buildExportPayload, parseImportPayload } from "./solid-state-physics-payload"
import {
  buildSolidStatePhysicsReportCsv,
  buildSolidStatePhysicsReportSummaryRows,
} from "./solid-state-physics-report"
import {
  EditableSolidStatePhysicsField,
  SolidStatePhysicsStateService,
} from "./solid-state-physics-state.service"
import {
  SolidStatePhysicsOverlayOptions,
  SolidStatePhysicsScenarioId,
} from "./solid-state-physics.models"
import { SolidStatePhysicsWebGpuRenderer } from "./solid-state-physics-webgpu-renderer"

const DEFAULT_OVERLAYS: SolidStatePhysicsOverlayOptions = {
  showReferenceGuides: true,
  showActiveMarker: true,
  showComparisonBand: true,
}

@Component({
  selector: "app-solid-state-physics-page",
  templateUrl: "./solid-state-physics-page.component.html",
  styleUrl: "./solid-state-physics-page.component.css",
  providers: [SolidStatePhysicsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolidStatePhysicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(SolidStatePhysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: SolidStatePhysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly overlays = signal<SolidStatePhysicsOverlayOptions>({ ...DEFAULT_OVERLAYS })
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly completionStatus = computed(() => "Validated Phase 29 Solid State surface")
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Acoustic branch ${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz and optical branch ${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz at k = ${(snapshot.waveVectorFraction ?? 0).toFixed(2)}.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Density of states ${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} at E = ${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV with occupation ${(snapshot.occupationProbability ?? 0).toFixed(3)}.`
    }

    return `Stress ${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa at ${(snapshot.strainPercent ?? 0).toFixed(2)}% strain with ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 elastic energy density.`
  })
  protected readonly controlSummaryRows = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return [
        {
          label: "Lattice sweep",
          value: `${(this.selectedScenario().latticeSpacingNanometers ?? 0).toFixed(2)} nm`,
          detail: "Sets the reduced Brillouin-zone spacing used for the active dispersion trace.",
        },
        {
          label: "Coupling stiffness",
          value: `${(this.selectedScenario().springConstantNewtonsPerMeter ?? 0).toFixed(1)} N/m`,
          detail: "Raises or lowers the branch curvature across the sampled phonon path.",
        },
        {
          label: "Live branch state",
          value: `${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} / ${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz`,
          detail:
            "Shows the current acoustic and optical sample frequencies at the active wave vector.",
        },
      ]
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return [
        {
          label: "Band gap target",
          value: `${(this.selectedScenario().bandGapElectronVolts ?? 0).toFixed(2)} eV`,
          detail:
            "Controls the separation between the valence and conduction edges in the viewport.",
        },
        {
          label: "Carrier response",
          value: `${(this.selectedScenario().effectiveMassRatio ?? 0).toFixed(2)} m*/m0`,
          detail:
            "Adjusts the density-of-states slope and the active carrier distribution response.",
        },
        {
          label: "Live density state",
          value: `${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} DOS`,
          detail: "Tracks the current density-of-states value at the active energy cursor.",
        },
      ]
    }

    return [
      {
        label: "Strain envelope",
        value: `${(this.selectedScenario().maxStrainPercent ?? 0).toFixed(2)} %`,
        detail: "Sets the crystal strain window used for the deterministic stress sweep.",
      },
      {
        label: "Elastic stiffness",
        value: `${(this.selectedScenario().youngsModulusGigapascals ?? 0).toFixed(0)} GPa`,
        detail: "Controls the slope of the elastic branch ahead of the yield comparison guide.",
      },
      {
        label: "Live stress state",
        value: `${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa`,
        detail: "Tracks the current stress response at the active strain cursor.",
      },
    ]
  })
  protected readonly controlNote = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Lattice spacing, spring stiffness, and atomic mass keep the active phonon slice at k = ${(snapshot.waveVectorFraction ?? 0).toFixed(2)} with ${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s group velocity across the sampled dispersion path.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Band gap, effective mass, and dopant density keep the active electronic slice at E = ${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV with ${(snapshot.occupationProbability ?? 0).toFixed(3)} occupation probability in the current carrier window.`
    }

    return `Max strain, Young's modulus, and yield strength keep the active crystal slice at ${(snapshot.strainPercent ?? 0).toFixed(2)}% strain with ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 elastic energy density through the current material sweep.`
  })
  protected readonly viewportHint = computed(() => {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return "The viewport traces the acoustic and optical dispersion branches across the reduced Brillouin zone."
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return "The viewport traces the density-of-states rise above the conduction edge and marks the active energy sample."
    }

    return "The viewport traces the crystal stress-strain response with a yield guide and an active material marker."
  })
  protected readonly overlayLabels = computed(() => {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return {
        showReferenceGuides: "Zone guides",
        showActiveMarker: "Wave-vector marker",
        showComparisonBand: "Optical branch",
      }
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return {
        showReferenceGuides: "Band-edge guides",
        showActiveMarker: "Energy marker",
        showComparisonBand: "Occupation band",
      }
    }

    return {
      showReferenceGuides: "Yield guide",
      showActiveMarker: "Active strain marker",
      showComparisonBand: "Yield comparison",
    }
  })
  protected readonly reportSummaryRows = computed(() =>
    buildSolidStatePhysicsReportSummaryRows(this.selectedScenario(), this.currentState()),
  )
  protected readonly summaryRowsSummary = computed(() => {
    const snapshot = this.currentState()
    const sampleCount = this.sampledStates().length

    if (this.selectedScenario().id === "phonon-dispersion") {
      return `${sampleCount} deterministic phonon samples support the active summary rows, tying k = ${(snapshot.waveVectorFraction ?? 0).toFixed(2)} to ${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz acoustic response, ${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz optical response, and ${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s transport.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `${sampleCount} deterministic carrier samples support the active summary rows, tying ${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV to ${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} density of states, ${(snapshot.occupationProbability ?? 0).toFixed(3)} occupation, and a ${(this.selectedScenario().bandGapElectronVolts ?? 0).toFixed(2)} eV band gap.`
    }

    return `${sampleCount} deterministic material samples support the active summary rows, tying ${(snapshot.strainPercent ?? 0).toFixed(2)}% strain to ${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa stress, ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 elastic energy density, and a ${(this.selectedScenario().yieldStrengthMegapascals ?? 0).toFixed(1)} MPa yield guide.`
  })
  protected readonly statusRows = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Numerical state",
          value: snapshot.stable ? "Stable branch sweep" : "Dispersion needs review",
        },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        {
          label: "Zone position",
          value: `${(snapshot.waveVectorFraction ?? 0).toFixed(2)} k/kmax`,
        },
        {
          label: "Group velocity",
          value: `${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s`,
        },
        {
          label: "Optical comparison",
          value: this.overlays().showComparisonBand ? "Enabled" : "Disabled",
        },
      ]
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Numerical state",
          value: snapshot.stable ? "Stable carrier slice" : "Carrier slice needs review",
        },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        { label: "Energy cursor", value: `${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV` },
        { label: "Occupation", value: `${(snapshot.occupationProbability ?? 0).toFixed(3)}` },
        {
          label: "Band-edge guides",
          value: this.overlays().showReferenceGuides ? "Enabled" : "Disabled",
        },
      ]
    }

    return [
      { label: "Scenario status", value: this.selectedScenario().status },
      {
        label: "Numerical state",
        value: snapshot.stable ? "Stable elastic sweep" : "Yield threshold reached",
      },
      {
        label: "Viewport state",
        value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
      },
      { label: "Strain cursor", value: `${(snapshot.strainPercent ?? 0).toFixed(2)} %` },
      {
        label: "Yield margin",
        value: `${((this.selectedScenario().yieldStrengthMegapascals ?? 0) - (snapshot.stressMegapascals ?? 0)).toFixed(1)} MPa`,
      },
      { label: "Yield guide", value: this.overlays().showReferenceGuides ? "Enabled" : "Disabled" },
    ]
  })
  protected readonly statusSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Phonon status focus: the active dispersion slice remains ${snapshot.stable ? "stable" : "under review"} while the acoustic branch reaches ${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz and the optical comparison remains ${this.overlays().showComparisonBand ? "visible" : "hidden"} at k = ${(snapshot.waveVectorFraction ?? 0).toFixed(2)}.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Electronic status focus: the active carrier slice remains ${snapshot.stable ? "stable" : "under review"} while the density of states is ${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} and occupation is ${(snapshot.occupationProbability ?? 0).toFixed(3)} at ${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV.`
    }

    return `Crystal status focus: the active material sweep remains ${snapshot.stable ? "stable" : "at the yield threshold"} while stress is ${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa and elastic energy density is ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 at ${(snapshot.strainPercent ?? 0).toFixed(2)}% strain.`
  })
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly insightSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Phonon insight focus: the active dispersion slice keeps the acoustic branch at ${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz while the optical branch reaches ${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz and the group velocity remains ${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Electronic insight focus: the active carrier slice keeps the density of states at ${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} with ${(snapshot.occupationProbability ?? 0).toFixed(3)} occupation probability across a ${(this.selectedScenario().bandGapElectronVolts ?? 0).toFixed(2)} eV band gap.`
    }

    return `Crystal insight focus: the active material slice keeps stress at ${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa with ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 elastic energy density against a ${(this.selectedScenario().yieldStrengthMegapascals ?? 0).toFixed(1)} MPa yield guide.`
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
    buildSolidStatePhysicsReportCsv(
      this.selectedScenario(),
      this.currentState(),
      this.sampledStates(),
    ),
  )
  protected readonly previewSummaryRows = computed(() => {
    const jsonPreview = this.exportPreview()
    const csvPreview = this.reportPreview()
    const jsonLineCount = jsonPreview.split("\n").length
    const csvLineCount = csvPreview.split("\n").length

    if (this.selectedScenario().id === "phonon-dispersion") {
      return [
        {
          label: "Preview scenario",
          value: this.selectedScenario().id,
          detail: "JSON and CSV previews are scoped to the active phonon dispersion export slice.",
        },
        {
          label: "Dispersion samples",
          value: `${this.sampledStates().length}`,
          detail: "Deterministic phonon samples included in the current preview pair.",
        },
        {
          label: "Preview footprint",
          value: `${jsonLineCount} JSON lines / ${csvLineCount} CSV lines`,
          detail: "Preview size for the active dispersion export before copy or download.",
        },
      ]
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return [
        {
          label: "Preview scenario",
          value: this.selectedScenario().id,
          detail:
            "JSON and CSV previews are scoped to the active electronic structure export slice.",
        },
        {
          label: "Carrier samples",
          value: `${this.sampledStates().length}`,
          detail: "Deterministic carrier or DOS samples included in the current preview pair.",
        },
        {
          label: "Preview footprint",
          value: `${jsonLineCount} JSON lines / ${csvLineCount} CSV lines`,
          detail: "Preview size for the active carrier export before copy or download.",
        },
      ]
    }

    return [
      {
        label: "Preview scenario",
        value: this.selectedScenario().id,
        detail: "JSON and CSV previews are scoped to the active crystal elasticity export slice.",
      },
      {
        label: "Material samples",
        value: `${this.sampledStates().length}`,
        detail: "Deterministic stress-strain samples included in the current preview pair.",
      },
      {
        label: "Preview footprint",
        value: `${jsonLineCount} JSON lines / ${csvLineCount} CSV lines`,
        detail: "Preview size for the active material export before copy or download.",
      },
    ]
  })
  protected readonly previewSummary = computed(() => {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return "Preview focus: the active phonon export pairs a scenario-scoped JSON payload with a sampled dispersion CSV so zone position, branch frequencies, and sampled transport ranges can be inspected before export."
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return "Preview focus: the active electronic export pairs a scenario-scoped JSON payload with a sampled DOS CSV so band-gap context, occupation state, and sampled carrier ranges can be inspected before export."
    }

    return "Preview focus: the active crystal export pairs a scenario-scoped JSON payload with a sampled stress-strain CSV so yield context, elastic energy, and sampled material ranges can be inspected before export."
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
  protected readonly activeSample = computed(
    () => this.sampledStates().find((sample) => sample.active) ?? this.sampledStates()[0] ?? null,
  )
  protected readonly activeSampleIndex = computed(() => {
    const index = this.sampledStates().findIndex((sample) => sample.active)
    return index >= 0 ? index : 0
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
      return "Hover or focus the validated sampled plot to inspect scenario states."
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
  protected readonly samplePlotTitle = computed(() => {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return "Dispersion profile"
    }
    if (this.selectedScenario().id === "electronic-structure") {
      return "Density-of-states profile"
    }
    return "Stress-strain profile"
  })
  protected readonly liveReadoutRows = computed(() => {
    const snapshot = this.currentState()
    if (this.selectedScenario().id === "phonon-dispersion") {
      return [
        { label: "Wave vector", value: `${(snapshot.waveVectorFraction ?? 0).toFixed(2)}` },
        {
          label: "Acoustic frequency",
          value: `${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz`,
        },
        {
          label: "Optical frequency",
          value: `${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz`,
        },
        {
          label: "Group velocity",
          value: `${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s`,
        },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return [
        { label: "Energy", value: `${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV` },
        {
          label: "Density of states",
          value: `${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)}`,
        },
        { label: "Occupation", value: `${(snapshot.occupationProbability ?? 0).toFixed(3)}` },
        {
          label: "Band gap",
          value: `${(this.selectedScenario().bandGapElectronVolts ?? 0).toFixed(2)} eV`,
        },
        { label: "Samples", value: `${this.sampledStates().length}` },
      ]
    }

    return [
      { label: "Strain", value: `${(snapshot.strainPercent ?? 0).toFixed(2)} %` },
      { label: "Stress", value: `${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa` },
      {
        label: "Elastic energy density",
        value: `${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3`,
      },
      {
        label: "Young's modulus",
        value: `${(this.selectedScenario().youngsModulusGigapascals ?? 0).toFixed(0)} GPa`,
      },
      { label: "Samples", value: `${this.sampledStates().length}` },
    ]
  })
  protected readonly liveReadoutSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Phonon readout focus: the active live snapshot tracks k = ${(snapshot.waveVectorFraction ?? 0).toFixed(2)} with ${(snapshot.acousticFrequencyTerahertz ?? 0).toFixed(2)} THz acoustic response, ${(snapshot.opticalFrequencyTerahertz ?? 0).toFixed(2)} THz optical response, and ${(snapshot.groupVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s transport speed.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Electronic readout focus: the active live snapshot tracks ${(snapshot.energyElectronVolts ?? 0).toFixed(2)} eV with ${(snapshot.densityOfStatesArbitraryUnits ?? 0).toFixed(3)} density of states, ${(snapshot.occupationProbability ?? 0).toFixed(3)} occupation, and a ${(this.selectedScenario().bandGapElectronVolts ?? 0).toFixed(2)} eV band gap.`
    }

    return `Crystal readout focus: the active live snapshot tracks ${(snapshot.strainPercent ?? 0).toFixed(2)}% strain with ${(snapshot.stressMegapascals ?? 0).toFixed(1)} MPa stress, ${(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter ?? 0).toFixed(2)} MJ/m^3 elastic energy density, and ${(this.selectedScenario().youngsModulusGigapascals ?? 0).toFixed(0)} GPa stiffness.`
  })
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length
    if (this.selectedScenario().id === "phonon-dispersion") {
      return `${sampleCount} reduced wave-vector samples trace the acoustic branch alongside the optical comparison branch.`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `${sampleCount} sampled energies trace the density-of-states rise together with the occupation comparison curve.`
    }

    return `${sampleCount} sampled strain states trace the crystal stress-strain response and the yield comparison line.`
  })

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

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.selectScenarioById(target.value as SolidStatePhysicsScenarioId)
  }

  protected selectScenarioById(id: SolidStatePhysicsScenarioId): void {
    this.state.selectScenario(id)
    this.exportMessage.set("")
    this.hoveredSampleIndex.set(null)
  }

  protected updateField(field: EditableSolidStatePhysicsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof SolidStatePhysicsOverlayOptions): void {
    this.overlays.update((overlays) => ({
      ...overlays,
      [key]: !overlays[key],
    }))
  }

  protected async copyJson(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Solid State Physics scenario copied to clipboard.")
  }

  protected downloadJson(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Solid State Physics scenario exported as JSON.")
  }

  protected downloadCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Solid State Physics report exported as CSV.")
  }

  protected resetScenario(): void {
    this.state.resetSelectedScenario()
    this.overlays.set({ ...DEFAULT_OVERLAYS })
    this.exportMessage.set("Selected scenario reset to defaults.")
    this.hoveredSampleIndex.set(null)
  }

  protected applyImportPayload(): void {
    this.restorePayload(this.importPayloadText())
  }

  protected async importFromFile(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) {
      return
    }

    const payloadText = await file.text()
    this.importPayloadText.set(payloadText)
    this.restorePayload(payloadText)
  }

  protected updateImportPayload(event: Event): void {
    const target = event.target as HTMLTextAreaElement
    this.importPayloadText.set(target.value)
  }

  private restorePayload(payloadText: string): void {
    try {
      const parsed = parseImportPayload(payloadText)
      this.state.importScenarioState(parsed)
      this.overlays.set(parsed.overlays ?? { ...DEFAULT_OVERLAYS })
      this.exportMessage.set(`Imported ${parsed.scenario.name} payload.`)
      this.hoveredSampleIndex.set(null)
    } catch {
      this.exportMessage.set("Invalid payload.")
      this.hoveredSampleIndex.set(null)
    }
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
    sample: NonNullable<ReturnType<SolidStatePhysicsPageComponent["activeSample"]>>,
  ): string {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return `Sample reduced wave vector ${sample.position.toFixed(2)}`
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return `Sample energy ${sample.position.toFixed(2)} eV`
    }

    return `Sample strain ${sample.position.toFixed(2)} %`
  }

  private formatSampleReadoutRows(
    sample: NonNullable<ReturnType<SolidStatePhysicsPageComponent["activeSample"]>>,
  ): Array<{ label: string; value: string }> {
    if (this.selectedScenario().id === "phonon-dispersion") {
      return [
        { label: "Acoustic branch", value: `${sample.primaryValue.toFixed(2)} THz` },
        {
          label: "Optical branch",
          value: `${(sample.secondaryValue ?? sample.primaryValue).toFixed(2)} THz`,
        },
      ]
    }

    if (this.selectedScenario().id === "electronic-structure") {
      return [
        { label: "Density of states", value: `${sample.primaryValue.toFixed(3)}` },
        { label: "Occupation band", value: `${(sample.secondaryValue ?? 0).toFixed(3)}` },
      ]
    }

    return [
      { label: "Stress", value: `${sample.primaryValue.toFixed(1)} MPa` },
      { label: "Yield guide", value: `${(sample.secondaryValue ?? 0).toFixed(1)} MPa` },
    ]
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    if (!status.supported) {
      return
    }

    const renderer = await SolidStatePhysicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!renderer) {
      this.webGpuMessage.set("Solid State Physics WebGPU viewport initialization failed.")
      return
    }

    this.renderer = renderer
    this.rendererReady.set(true)
    this.webGpuMessage.set("Solid State Physics WebGPU viewport ready.")
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
}

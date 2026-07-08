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
import { buildInsightCards } from "./nuclear-and-particle-physics-analytics"
import { buildExportPayload, parseImportPayload } from "./nuclear-and-particle-physics-payload"
import {
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
} from "./nuclear-and-particle-physics-plot"
import {
  buildNuclearAndParticlePhysicsReportCsv,
  buildNuclearAndParticlePhysicsReportSummaryRows,
} from "./nuclear-and-particle-physics-report"
import {
  EditableNuclearAndParticlePhysicsField,
  NuclearAndParticlePhysicsStateService,
} from "./nuclear-and-particle-physics-state.service"
import {
  NuclearAndParticlePhysicsOverlayOptions,
  NuclearAndParticlePhysicsScenarioId,
} from "./nuclear-and-particle-physics.models"
import { NuclearAndParticlePhysicsWebGpuRenderer } from "./nuclear-and-particle-physics-webgpu-renderer"

const DEFAULT_OVERLAYS: NuclearAndParticlePhysicsOverlayOptions = {
  showReferenceGuides: true,
  showActiveMarker: true,
  showComparisonBand: true,
}

@Component({
  selector: "app-nuclear-and-particle-physics-page",
  templateUrl: "./nuclear-and-particle-physics-page.component.html",
  styleUrl: "./nuclear-and-particle-physics-page.component.css",
  providers: [NuclearAndParticlePhysicsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuclearAndParticlePhysicsPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(NuclearAndParticlePhysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: NuclearAndParticlePhysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)
  private readonly hoveredSampleIndex = signal<number | null>(null)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly overlays = signal<NuclearAndParticlePhysicsOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly completionStatus = computed(() => "Validated Phase 31 Nuclear surface")
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "binding-energy-curve") {
      return `Total binding energy ${(snapshot.totalBindingEnergyMeV ?? 0).toFixed(1)} MeV with stability index ${(snapshot.stabilityIndex ?? 0).toFixed(2)} around the active nucleus.`
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return `Invariant mass ${(snapshot.invariantMassGeV ?? 0).toFixed(2)} GeV with transverse momentum ${(snapshot.transverseMomentumGeV ?? 0).toFixed(2)} GeV in the active collider event.`
    }

    return `Remaining fraction ${(snapshot.remainingFraction ?? 0).toFixed(3)} with activity ${(snapshot.activityTerabecquerels ?? 0).toFixed(2)} TBq across the active decay window.`
  })
  protected readonly readinessSummary = computed(
    () =>
      "The shared Nuclear and Particle Physics viewport now renders the active decay, structure, or collider slice with matching overlay controls and ready-state messaging.",
  )
  protected readonly viewportHint = computed(() => {
    if (this.selectedScenario().id === "binding-energy-curve") {
      return "The viewport renders the active nucleus trend with binding-energy and stability overlays across the sampled mass window."
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return "The viewport renders the active collider event with invariant-mass and transverse-momentum traces across sampled scattering angles."
    }

    return "The viewport renders the active decay profile with remaining-population and activity traces across the sampled half-life window."
  })
  protected readonly overlayLabels = computed(() => {
    if (this.selectedScenario().id === "binding-energy-curve") {
      return {
        showReferenceGuides: "Mass guide",
        showActiveMarker: "Nucleus marker",
        showComparisonBand: "Stability trend",
      }
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return {
        showReferenceGuides: "Angle guide",
        showActiveMarker: "Event marker",
        showComparisonBand: "Momentum trace",
      }
    }

    return {
      showReferenceGuides: "Half-life guide",
      showActiveMarker: "Decay marker",
      showComparisonBand: "Activity trace",
    }
  })
  protected readonly metricRows = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()

    if (scenario.id === "binding-energy-curve") {
      return [
        {
          label: "Mass number",
          value: `${scenario.massNumber ?? 0}`,
          detail: "Active nucleus size for the starter structure slice.",
        },
        {
          label: "Binding / nucleon",
          value: `${(scenario.bindingEnergyPerNucleonMeV ?? 0).toFixed(2)} MeV`,
          detail: "Reference scale for the active binding-energy estimate.",
        },
        {
          label: "Stability index",
          value: `${(snapshot.stabilityIndex ?? 0).toFixed(2)}`,
          detail: "Simple proton-fraction stability cue for the current nucleus.",
        },
      ]
    }

    if (scenario.id === "proton-proton-collision") {
      return [
        {
          label: "Beam energy",
          value: `${(scenario.beamEnergyGeV ?? 0).toFixed(2)} GeV`,
          detail: "Incoming beam energy for the starter collider event.",
        },
        {
          label: "Scattering angle",
          value: `${(scenario.scatteringAngleDegrees ?? 0).toFixed(1)} deg`,
          detail: "Sets the angular opening used by the current event estimate.",
        },
        {
          label: "Invariant mass",
          value: `${(snapshot.invariantMassGeV ?? 0).toFixed(2)} GeV`,
          detail: "Derived event-scale readout for the active collision.",
        },
      ]
    }

    return [
      {
        label: "Half-life",
        value: `${(scenario.halfLifeHours ?? 0).toFixed(1)} h`,
        detail: "Decay timescale for the active nucleus.",
      },
      {
        label: "Initial population",
        value: `${(scenario.initialPopulationTrillions ?? 0).toFixed(2)} T`,
        detail: "Starting inventory for the shared decay slice.",
      },
      {
        label: "Remaining fraction",
        value: `${(snapshot.remainingFraction ?? 0).toFixed(3)}`,
        detail: "Current residual fraction after the active elapsed time.",
      },
    ]
  })
  protected readonly reportSummaryRows = computed(() =>
    buildNuclearAndParticlePhysicsReportSummaryRows(this.selectedScenario(), this.currentState()),
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
    buildNuclearAndParticlePhysicsReportCsv(
      this.selectedScenario(),
      this.currentState(),
      this.sampledStates(),
    ),
  )
  protected readonly samplePlotTitle = computed(() => {
    if (this.selectedScenario().id === "binding-energy-curve") {
      return "Sampled Binding-Energy Curve"
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return "Sampled Collision Event Curve"
    }

    return "Sampled Radioactive Decay Curve"
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
      return "Hover, focus, or use the keyboard on the sampled plot to inspect scenario states."
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
  protected readonly samplePlotSummary = computed(() => {
    const sampleCount = this.sampledStates().length

    if (this.selectedScenario().id === "binding-energy-curve") {
      return `The sampled structure plot tracks ${sampleCount} deterministic nuclei across the active mass window, with total binding energy as the primary curve and stability index as the comparison curve.`
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return `The sampled collision plot tracks ${sampleCount} deterministic scattering angles, with invariant mass as the primary curve and transverse momentum as the comparison curve.`
    }

    return `The sampled decay plot tracks ${sampleCount} deterministic elapsed-time samples, with remaining population as the primary curve and activity as the comparison curve.`
  })
  protected readonly viewportStatusRows = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "binding-energy-curve") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        { label: "Mass cursor", value: `${(this.selectedScenario().massNumber ?? 0).toFixed(0)}` },
        { label: "Stability", value: `${(snapshot.stabilityIndex ?? 0).toFixed(2)}` },
      ]
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return [
        { label: "Scenario status", value: this.selectedScenario().status },
        {
          label: "Viewport state",
          value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
        },
        {
          label: "Angle cursor",
          value: `${(this.selectedScenario().scatteringAngleDegrees ?? 0).toFixed(1)} deg`,
        },
        { label: "Invariant mass", value: `${(snapshot.invariantMassGeV ?? 0).toFixed(2)} GeV` },
      ]
    }

    return [
      { label: "Scenario status", value: this.selectedScenario().status },
      {
        label: "Viewport state",
        value: this.rendererReady() ? "Viewport ready" : this.webGpuMessage(),
      },
      { label: "Elapsed time", value: `${(snapshot.elapsedHours ?? 0).toFixed(1)} h` },
      { label: "Remaining fraction", value: `${(snapshot.remainingFraction ?? 0).toFixed(3)}` },
    ]
  })
  protected readonly previewSummary = computed(() => {
    const sampleCount = this.sampledStates().length

    if (this.selectedScenario().id === "binding-energy-curve") {
      return `Preview focus: the active binding-energy export pairs a scenario-scoped JSON payload with a sampled structure CSV so total binding energy, stability trend, and ${sampleCount} deterministic nuclear samples can be inspected before export.`
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return `Preview focus: the active collider export pairs a scenario-scoped JSON payload with a sampled event CSV so invariant mass, transverse momentum, and ${sampleCount} deterministic scattering samples can be inspected before export.`
    }

    return `Preview focus: the active decay export pairs a scenario-scoped JSON payload with a sampled decay CSV so remaining fraction, activity, and ${sampleCount} deterministic half-life samples can be inspected before export.`
  })
  protected readonly readoutSummary = computed(() => {
    const snapshot = this.currentState()

    if (this.selectedScenario().id === "binding-energy-curve") {
      return `Binding readout focus: the active live snapshot tracks ${(snapshot.totalBindingEnergyMeV ?? 0).toFixed(1)} MeV total binding energy with ${(snapshot.stabilityIndex ?? 0).toFixed(2)} stability index around mass number ${(this.selectedScenario().massNumber ?? 0).toFixed(0)}.`
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return `Collision readout focus: the active live snapshot tracks ${(snapshot.invariantMassGeV ?? 0).toFixed(2)} GeV invariant mass, ${(snapshot.transverseMomentumGeV ?? 0).toFixed(2)} GeV transverse momentum, and ${(snapshot.pseudorapidity ?? 0).toFixed(2)} pseudorapidity for the current event.`
    }

    return `Decay readout focus: the active live snapshot tracks ${(snapshot.remainingFraction ?? 0).toFixed(3)} remaining fraction with ${(snapshot.activityTerabecquerels ?? 0).toFixed(2)} TBq activity after ${(snapshot.elapsedHours ?? 0).toFixed(2)} elapsed hours.`
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

  ngOnInit(): void {
    this.webGpuMessage.set("Preparing Nuclear and Particle Physics WebGPU viewport...")
  }

  protected selectScenarioById(id: NuclearAndParticlePhysicsScenarioId): void {
    this.state.selectScenario(id)
    this.hoveredSampleIndex.set(null)
  }

  protected selectScenario(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLSelectElement)) {
      return
    }

    this.state.selectScenario(target.value as NuclearAndParticlePhysicsScenarioId)
  }

  protected updateField(field: EditableNuclearAndParticlePhysicsField, event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) {
      return
    }

    this.state.updateField(field, Number(target.value))
    this.exportMessage.set("")
  }

  protected toggleOverlay(key: keyof NuclearAndParticlePhysicsOverlayOptions): void {
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
    this.exportMessage.set("Nuclear and Particle Physics scenario copied to clipboard.")
  }

  protected downloadJson(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Nuclear and Particle Physics scenario exported as JSON.")
  }

  protected downloadCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      this.reportPreview(),
      "text/csv",
    )
    this.exportMessage.set("Nuclear and Particle Physics report exported as CSV.")
  }

  protected updateImportPayload(event: Event): void {
    const target = event.target
    if (!(target instanceof HTMLTextAreaElement)) {
      return
    }

    this.importPayloadText.set(target.value)
  }

  protected restoreFromPayload(): void {
    try {
      const payload = parseImportPayload(this.importPayloadText())
      this.state.importScenarioState(payload)
      this.overlays.set(payload.overlays ?? { ...DEFAULT_OVERLAYS })
      this.importPayloadText.set(this.exportPreview())
      this.exportMessage.set("Nuclear and Particle Physics scenario restored from JSON.")
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
    sample: NonNullable<ReturnType<NuclearAndParticlePhysicsPageComponent["activeSample"]>>,
  ): string {
    if (this.selectedScenario().id === "binding-energy-curve") {
      return `Sample mass number ${sample.position.toFixed(0)}`
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return `Sample scattering angle ${sample.position.toFixed(1)} deg`
    }

    return `Sample elapsed time ${sample.position.toFixed(1)} h`
  }

  private formatSampleReadoutRows(
    sample: NonNullable<ReturnType<NuclearAndParticlePhysicsPageComponent["activeSample"]>>,
  ): Array<{ label: string; value: string }> {
    if (this.selectedScenario().id === "binding-energy-curve") {
      return [
        { label: "Total binding energy", value: `${sample.primaryValue.toFixed(1)} MeV` },
        { label: "Stability index", value: `${(sample.secondaryValue ?? 0).toFixed(2)}` },
      ]
    }

    if (this.selectedScenario().id === "proton-proton-collision") {
      return [
        { label: "Invariant mass", value: `${sample.primaryValue.toFixed(2)} GeV` },
        { label: "Transverse momentum", value: `${(sample.secondaryValue ?? 0).toFixed(2)} GeV` },
      ]
    }

    return [
      { label: "Remaining population", value: `${sample.primaryValue.toFixed(2)} T` },
      { label: "Activity", value: `${(sample.secondaryValue ?? 0).toFixed(2)} TBq` },
    ]
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

    const renderer = await NuclearAndParticlePhysicsWebGpuRenderer.create(
      this.canvasRef().nativeElement,
    )
    if (!renderer) {
      this.webGpuMessage.set("Nuclear and Particle Physics WebGPU viewport initialization failed.")
      return
    }

    this.renderer = renderer
    this.rendererReady.set(true)
    this.webGpuMessage.set("Nuclear and Particle Physics WebGPU viewport ready.")
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

  private async loadWebGpuStatus(): Promise<void> {
    void 0
  }
}

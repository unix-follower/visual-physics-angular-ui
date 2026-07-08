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
  buildConvergencePlot,
  buildInsightCards,
  buildInvariantHistoryPlot,
  buildObservedOrderEstimates,
  buildOrbitalObservedOrderEstimates,
  buildOrbitalConvergencePlot,
  buildOrbitalDriftThresholdEstimates,
  buildSolverRecommendationCandidates,
  buildSolverRecommendationSummary,
  buildSpringObservedOrderEstimates,
  buildSpringConvergencePlot,
  buildSpringDriftThresholdEstimates,
  buildSpringInvariantHistoryPlot,
  buildStabilityThresholdEstimates,
} from "./computational-physics-analytics"
import { buildExportPayload, parseImportPayload } from "./computational-physics-payload"
import {
  buildConvergenceCsv,
  buildInvariantHistoryCsv,
  buildSpringInvariantHistoryCsv,
} from "./computational-physics-report"
import {
  ComputationalPhysicsStateService,
  EditableComputationalField,
} from "./computational-physics-state.service"
import { ComputationalPhysicsScenarioId, SolverMethodId } from "./computational-physics.models"
import {
  ComputationalPhysicsOverlayOptions,
  ComputationalPhysicsWebGpuRenderer,
} from "./computational-physics-webgpu-renderer"

type OverlayKey = keyof ComputationalPhysicsOverlayOptions

@Component({
  selector: "app-computational-physics-page",
  templateUrl: "./computational-physics-page.component.html",
  styleUrl: "./computational-physics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComputationalPhysicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(ComputationalPhysicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: ComputationalPhysicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly currentTimeSeconds = this.state.currentTimeSeconds
  protected readonly sampledStates = this.state.sampledStates
  protected readonly convergenceStudy = this.state.convergenceStudy
  protected readonly orbitalInvariantHistory = this.state.orbitalInvariantHistory
  protected readonly springInvariantHistory = this.state.springInvariantHistory
  protected readonly selectedSolverMethod = this.state.selectedSolverMethod
  protected readonly solverMetrics = this.state.solverMetrics
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<ComputationalPhysicsOverlayOptions>({
    showReferenceTrajectory: true,
    showEulerTrajectory: true,
    showSymplecticTrajectory: true,
    showRk4Trajectory: true,
    showErrorBars: true,
  })
  protected readonly projectileActive = computed(
    () => this.selectedScenario().id === "projectile-solver-comparison",
  )
  protected readonly orbitalActive = computed(
    () => this.selectedScenario().id === "orbital-solver-comparison",
  )
  protected readonly springActive = computed(
    () => this.selectedScenario().id === "spring-oscillator-comparison",
  )
  protected readonly insightCards = computed(() =>
    buildInsightCards(
      this.currentState(),
      this.solverMetrics(),
      this.selectedSolverMethod(),
      this.solverRecommendation(),
    ),
  )
  protected readonly convergencePlot = computed(() =>
    buildConvergencePlot(
      this.convergenceStudy(),
      this.stabilityThresholds()[0]?.tolerance ?? null,
      this.solverRecommendation()?.recommendedStepSeconds ?? null,
    ),
  )
  protected readonly orbitalEnergyConvergencePlot = computed(() =>
    buildOrbitalConvergencePlot(
      this.convergenceStudy(),
      "energy",
      this.orbitalDriftThresholds().find((threshold) => threshold.metric === "energy")?.tolerance ??
        null,
      this.solverRecommendation()?.recommendedStepSeconds ?? null,
    ),
  )
  protected readonly orbitalMomentumConvergencePlot = computed(() =>
    buildOrbitalConvergencePlot(
      this.convergenceStudy(),
      "angularMomentum",
      this.orbitalDriftThresholds().find((threshold) => threshold.metric === "angularMomentum")
        ?.tolerance ?? null,
      this.solverRecommendation()?.recommendedStepSeconds ?? null,
    ),
  )
  protected readonly springEnergyConvergencePlot = computed(() =>
    buildSpringConvergencePlot(
      this.convergenceStudy(),
      "energy",
      this.springDriftThresholds().find((threshold) => threshold.metric === "energy")?.tolerance ??
        null,
      this.solverRecommendation()?.recommendedStepSeconds ?? null,
    ),
  )
  protected readonly springPhaseConvergencePlot = computed(() =>
    buildSpringConvergencePlot(
      this.convergenceStudy(),
      "phase",
      this.springDriftThresholds().find((threshold) => threshold.metric === "phase")?.tolerance ??
        null,
      this.solverRecommendation()?.recommendedStepSeconds ?? null,
    ),
  )
  protected readonly observedOrders = computed(() =>
    buildObservedOrderEstimates(this.convergenceStudy()),
  )
  protected readonly orbitalEnergyObservedOrders = computed(() =>
    buildOrbitalObservedOrderEstimates(this.convergenceStudy(), "energy"),
  )
  protected readonly orbitalMomentumObservedOrders = computed(() =>
    buildOrbitalObservedOrderEstimates(this.convergenceStudy(), "angularMomentum"),
  )
  protected readonly springEnergyObservedOrders = computed(() =>
    buildSpringObservedOrderEstimates(this.convergenceStudy(), "energy"),
  )
  protected readonly springPhaseObservedOrders = computed(() =>
    buildSpringObservedOrderEstimates(this.convergenceStudy(), "phase"),
  )
  protected readonly stabilityThresholds = computed(() =>
    buildStabilityThresholdEstimates(this.selectedScenario(), this.convergenceStudy()),
  )
  protected readonly springDriftThresholds = computed(() =>
    buildSpringDriftThresholdEstimates(this.selectedScenario(), this.convergenceStudy()),
  )
  protected readonly orbitalDriftThresholds = computed(() =>
    buildOrbitalDriftThresholdEstimates(this.selectedScenario(), this.convergenceStudy()),
  )
  protected readonly solverRecommendation = computed(() =>
    buildSolverRecommendationSummary(
      this.selectedScenario(),
      this.stabilityThresholds(),
      this.orbitalDriftThresholds(),
      this.springDriftThresholds(),
    ),
  )
  protected readonly solverRecommendationCandidates = computed(() =>
    buildSolverRecommendationCandidates(
      this.selectedScenario(),
      this.stabilityThresholds(),
      this.orbitalDriftThresholds(),
      this.springDriftThresholds(),
    ),
  )
  protected readonly convergenceCsv = computed(() =>
    buildConvergenceCsv(this.selectedScenario(), this.convergenceStudy()),
  )
  protected readonly orbitalEnergyPlot = computed(() =>
    buildInvariantHistoryPlot(this.orbitalInvariantHistory(), "energy"),
  )
  protected readonly orbitalMomentumPlot = computed(() =>
    buildInvariantHistoryPlot(this.orbitalInvariantHistory(), "angularMomentum"),
  )
  protected readonly orbitalInvariantCsv = computed(() =>
    buildInvariantHistoryCsv(this.orbitalInvariantHistory()),
  )
  protected readonly springEnergyPlot = computed(() =>
    buildSpringInvariantHistoryPlot(this.springInvariantHistory(), "energy"),
  )
  protected readonly springAmplitudePlot = computed(() =>
    buildSpringInvariantHistoryPlot(this.springInvariantHistory(), "amplitude"),
  )
  protected readonly springPhasePlot = computed(() =>
    buildSpringInvariantHistoryPlot(this.springInvariantHistory(), "phase"),
  )
  protected readonly springInvariantCsv = computed(() =>
    buildSpringInvariantHistoryCsv(this.springInvariantHistory()),
  )
  protected readonly exportPreview = computed(() =>
    JSON.stringify(
      buildExportPayload(
        this.selectedScenario(),
        this.currentState(),
        this.overlays(),
        this.sampledStates(),
        this.convergenceStudy(),
        this.orbitalInvariantHistory(),
        this.springInvariantHistory(),
        this.selectedSolverMethod(),
      ),
      null,
      2,
    ),
  )
  protected readonly activeMetrics = computed(
    () => this.solverMetrics()[this.selectedSolverMethod()],
  )
  protected readonly viewportHint = computed(() => {
    if (!this.webGpuReady()) {
      return this.webGpuMessage()
    }

    if (this.orbitalActive()) {
      return "The viewport renders the reference orbit alongside Euler, symplectic, and RK4 approximations so long-horizon drift is visible."
    }

    if (this.springActive()) {
      return "The viewport renders the spring-mass trajectory so phase drift and numerical damping remain visible across repeated oscillations."
    }

    return "The viewport renders the reference path alongside Euler, symplectic, and RK4 approximations for the active timestep."
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
    this.state.selectScenario(target.value as ComputationalPhysicsScenarioId)
  }

  protected updateScenarioParameter(field: EditableComputationalField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected updateTimeSeconds(event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateTimeSeconds(Number(target.value))
  }

  protected selectSolverMethod(method: SolverMethodId): void {
    this.state.selectSolverMethod(method)
  }

  protected toggleOverlay(key: OverlayKey): void {
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
    this.exportMessage.set("Computational Physics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )

    if (exported) {
      this.exportMessage.set("Computational Physics scenario exported as JSON.")
    }
  }

  protected downloadConvergenceReport(): void {
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-convergence.csv`,
      this.convergenceCsv(),
      "text/csv",
    )

    if (exported) {
      this.exportMessage.set("Computational Physics convergence report exported as CSV.")
    }
  }

  protected downloadInvariantReport(): void {
    const invariantCsv = this.orbitalActive()
      ? this.orbitalInvariantCsv()
      : this.springInvariantCsv()
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-invariants.csv`,
      invariantCsv,
      "text/csv",
    )

    if (exported) {
      this.exportMessage.set("Computational Physics invariant report exported as CSV.")
    }
  }

  protected updateImportPayload(event: Event): void {
    const target = event.target as HTMLTextAreaElement
    this.importPayloadText.set(target.value)
  }

  protected importScenarioState(): void {
    try {
      const payload = parseImportPayload(this.importPayloadText())
      this.state.importScenarioState(
        payload.scenario,
        payload.snapshot.timeSeconds,
        payload.solverMethod,
      )
      this.overlays.set(payload.overlays ?? this.overlays())
      this.exportMessage.set("Computational Physics scenario restored from JSON.")
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
  }

  private downloadTextFile(filename: string, content: string, type: string): boolean {
    if (globalThis.window === undefined) {
      this.exportMessage.set("File export is only available in the browser.")
      return false
    }

    const blob = new Blob([content], { type })
    const url = globalThis.URL.createObjectURL(blob)
    const link = globalThis.document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    globalThis.URL.revokeObjectURL(url)
    return true
  }

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    this.webGpuReady.set(status.supported)

    if (!status.supported) {
      return
    }

    this.renderer = await ComputationalPhysicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set(
        "WebGPU canvas initialization failed for the Computational Physics viewport.",
      )
      this.webGpuReady.set(false)
      return
    }

    this.webGpuMessage.set("Computational Physics viewport ready.")
    this.rendererReady.set(true)
  }
}

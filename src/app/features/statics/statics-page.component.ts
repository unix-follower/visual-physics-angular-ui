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

import { buildInsightCards } from "./statics-analytics"
import { buildExportPayload, parseImportPayload, StaticsOverlayOptions } from "./statics-payload"
import { StaticsWebGpuRenderer } from "./statics-webgpu-renderer"
import { EditableStaticsField, StaticsStateService } from "./statics-state.service"
import { StaticsScenarioId } from "./statics.models"
import { WebGpuSupportService } from "../kinematics/webgpu-support.service"

@Component({
  selector: "app-statics-page",
  templateUrl: "./statics-page.component.html",
  styleUrl: "./statics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaticsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(StaticsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: StaticsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly beamSupportActive = computed(
    () => this.selectedScenario().id === "beam-support",
  )
  protected readonly inclinedPlaneActive = computed(
    () => this.selectedScenario().id === "inclined-plane",
  )
  protected readonly pulleyActive = computed(
    () => this.selectedScenario().id === "pulley-equilibrium",
  )
  protected readonly overlays = signal<StaticsOverlayOptions>({
    showAppliedForce: true,
    showReactionForces: true,
    showResidualGuides: true,
  })
  protected readonly beamMetrics = computed(() => {
    const scenario = this.selectedScenario()
    const state = this.currentState()
    return {
      leftSupportX: scenario.anchorPoint?.x ?? 0,
      rightSupportX: scenario.secondaryPoint?.x ?? 0,
      loadPosition: scenario.loadPosition ?? state.position.x,
      loadMagnitude: scenario.loadMagnitude ?? Math.abs(state.appliedForce.y),
      leftReaction: state.primaryReactionForce.y,
      rightReaction: state.secondaryReactionForce?.y ?? 0,
    }
  })
  protected readonly inclinedPlaneMetrics = computed(() => {
    const scenario = this.selectedScenario()
    const state = this.currentState()
    return {
      mass: scenario.mass ?? 0,
      angleDegrees: scenario.angleDegrees ?? 0,
      frictionCoefficient: scenario.frictionCoefficient ?? 0,
      normalForce: Math.hypot(state.primaryReactionForce.x, state.primaryReactionForce.y),
      frictionForce: Math.hypot(
        state.secondaryReactionForce?.x ?? 0,
        state.secondaryReactionForce?.y ?? 0,
      ),
      weight: Math.abs(state.appliedForce.y),
    }
  })
  protected readonly viewportTitle = computed(() =>
    this.inclinedPlaneActive()
      ? "Inclined Plane Viewport"
      : this.pulleyActive()
        ? "Pulley Viewport"
        : "Statics Viewport",
  )
  protected readonly pulleyMetrics = computed(() => {
    const scenario = this.selectedScenario()
    const state = this.currentState()
    return {
      leftMass: scenario.mass ?? 0,
      rightMass: scenario.secondaryMass ?? scenario.loadMagnitude ?? 0,
      leftTension: state.primaryReactionForce.y,
      rightTension: state.secondaryReactionForce?.y ?? 0,
      totalLoad: Math.abs(state.appliedForce.y),
      imbalance: Math.abs(state.residualForce.y),
    }
  })
  protected readonly viewportHint = computed(() => {
    if (this.inclinedPlaneActive()) {
      return "Ramp geometry, the body marker, weight, normal force, friction, and residual guides render here for the inclined-plane slice."
    }

    if (this.pulleyActive()) {
      return "Pulley rope guides, load markers, tension vectors, and residual imbalance guides render here for the pulley-equilibrium slice."
    }

    return "Beam line, support anchors, applied load, and reaction vectors render here for the current statics slice."
  })
  protected readonly residualSummary = computed(() => {
    const state = this.currentState()
    return `Residual force (${state.residualForce.x.toFixed(1)}, ${state.residualForce.y.toFixed(1)}) N, torque ${state.residualTorque.toFixed(1)} N*m`
  })
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

  constructor() {
    afterNextRender(() => {
      void this.initializeRenderer()
    })

    effect(() => {
      if (!this.rendererReady()) {
        return
      }

      this.renderer?.render(this.currentState(), this.selectedScenario(), this.overlays())
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as StaticsScenarioId)
  }

  protected updateScenarioParameter(field: EditableStaticsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof StaticsOverlayOptions): void {
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
    this.exportMessage.set("Statics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Statics scenario exported as JSON.")
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
      this.state.importScenarioState(payload.scenario)
      this.overlays.set(payload.overlays ?? this.overlays())
      this.exportMessage.set("Statics scenario restored from JSON.")
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
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

  private async initializeRenderer(): Promise<void> {
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    this.webGpuReady.set(status.supported)

    if (!status.supported) {
      return
    }

    this.renderer = await StaticsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("WebGPU canvas initialization failed for the statics viewport.")
      this.webGpuReady.set(false)
      return
    }

    this.webGpuMessage.set("Statics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(this.currentState(), this.selectedScenario(), this.overlays())
  }
}

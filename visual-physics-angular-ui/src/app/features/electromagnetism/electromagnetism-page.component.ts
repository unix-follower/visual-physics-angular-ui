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

import { buildInsightCards } from "./electromagnetism-analytics"
import {
  buildExportPayload,
  ElectromagnetismOverlayOptions,
  parseImportPayload,
} from "./electromagnetism-payload"
import {
  EditableElectromagnetismField,
  ElectromagnetismStateService,
} from "./electromagnetism-state.service"
import { ElectromagnetismScenarioId } from "./electromagnetism.models"
import { ElectromagnetismWebGpuRenderer } from "./electromagnetism-webgpu-renderer"
import { WebGpuSupportService } from "../kinematics/webgpu-support.service"

type OverlayKey = keyof ElectromagnetismOverlayOptions

@Component({
  selector: "app-electromagnetism-page",
  templateUrl: "./electromagnetism-page.component.html",
  styleUrl: "./electromagnetism-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElectromagnetismPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(ElectromagnetismStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: ElectromagnetismWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly currentTimeSeconds = this.state.currentTimeSeconds
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<ElectromagnetismOverlayOptions>({
    showFieldVectors: true,
    showMagneticField: true,
    showForceVectors: true,
    showPotentialGuides: true,
    showTrajectory: true,
  })
  protected readonly electrostaticsActive = computed(
    () => this.selectedScenario().id === "point-charge-electrostatics",
  )
  protected readonly magneticMotionActive = computed(
    () => this.selectedScenario().id === "moving-charge-magnetic-field",
  )
  protected readonly currentLoopActive = computed(
    () => this.selectedScenario().id === "current-loop-magnetic-field",
  )
  protected readonly capacitorActive = computed(
    () => this.selectedScenario().id === "capacitor-potential-field",
  )
  protected readonly inductionActive = computed(
    () => this.selectedScenario().id === "electromagnetic-induction",
  )
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly effectiveOverlays = computed(() =>
    applyScenarioOverlaySupport(this.overlays(), this.selectedScenario().id),
  )
  protected readonly exportPreview = computed(() =>
    JSON.stringify(
      buildExportPayload(
        this.selectedScenario(),
        this.currentState(),
        this.effectiveOverlays(),
        this.sampledStates(),
      ),
      null,
      2,
    ),
  )
  protected readonly electrostaticsMetrics = computed(() => ({
    primaryCharge: this.selectedScenario().chargeMagnitude ?? 0,
    secondaryCharge: this.selectedScenario().secondaryChargeMagnitude ?? 0,
    probeX: this.selectedScenario().probePoint?.x ?? this.currentState().position.x,
    probeY: this.selectedScenario().probePoint?.y ?? this.currentState().position.y,
    fieldMagnitude: this.currentState().fieldMagnitude,
    potential: this.currentState().potential,
  }))
  protected readonly magneticMotionMetrics = computed(() => ({
    charge: this.selectedScenario().chargeMagnitude ?? 0,
    mass: this.selectedScenario().mass ?? 0,
    magneticFieldStrength: this.selectedScenario().magneticFieldStrength ?? 0,
    velocityX: this.selectedScenario().initialVelocity?.x ?? 0,
    velocityY: this.selectedScenario().initialVelocity?.y ?? 0,
    forceMagnitude: this.currentState().forceMagnitude,
    energy: this.currentState().energy,
  }))
  protected readonly currentLoopMetrics = computed(() => ({
    current: this.selectedScenario().current ?? 0,
    loopRadius: this.selectedScenario().loopRadius ?? 0,
    probeX: this.selectedScenario().probePoint?.x ?? this.currentState().position.x,
    probeY: this.selectedScenario().probePoint?.y ?? this.currentState().position.y,
    fieldMagnitude: this.currentState().fieldMagnitude,
    energy: this.currentState().energy,
  }))
  protected readonly capacitorMetrics = computed(() => ({
    plateSeparation: this.selectedScenario().plateSeparation ?? 0,
    potentialDifference: this.selectedScenario().potentialDifference ?? 0,
    probeX: this.selectedScenario().probePoint?.x ?? this.currentState().position.x,
    probeY: this.selectedScenario().probePoint?.y ?? this.currentState().position.y,
    fieldMagnitude: this.currentState().fieldMagnitude,
    forceMagnitude: this.currentState().forceMagnitude,
    potential: this.currentState().potential,
  }))
  protected readonly inductionMetrics = computed(() => ({
    fluxRate: this.selectedScenario().fluxRate ?? 0,
    inductance: this.selectedScenario().inductance ?? 0,
    fieldMagnitude: this.currentState().fieldMagnitude,
    forceMagnitude: this.currentState().forceMagnitude,
    potential: this.currentState().potential,
    energy: this.currentState().energy,
  }))
  protected readonly viewportHint = computed(() => {
    if (!this.webGpuReady()) {
      return this.webGpuMessage()
    }

    if (this.electrostaticsActive()) {
      return "The viewport now renders point charges, the probe location, and the active electric-field and force vectors."
    }

    if (this.magneticMotionActive()) {
      return "The viewport now renders the sampled trajectory, current particle marker, magnetic-field region guide, and Lorentz-force vector."
    }

    if (this.currentLoopActive()) {
      return "The viewport now renders the current loop outline, the active probe marker, and the field guide evaluated away from the loop center."
    }

    if (this.capacitorActive()) {
      return "The viewport now renders the capacitor plates, the probe location between the plates, and the active electric-field vector along the plate separation axis."
    }

    if (this.inductionActive()) {
      return "The viewport now renders an induction loop, a time-varying flux guide, and the induced-emf direction for the current scenario state."
    }

    return "This scenario uses the shared Electromagnetism feature shell and viewport foundation."
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
        this.effectiveOverlays(),
        this.sampledStates(),
      )
    })

    this.destroyRef.onDestroy(() => {
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as ElectromagnetismScenarioId)
  }

  protected updateScenarioParameter(field: EditableElectromagnetismField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected updateTimeSeconds(event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateTimeSeconds(Number(target.value))
  }

  protected toggleOverlay(key: OverlayKey): void {
    if (!this.isOverlaySupported(key)) {
      return
    }

    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  protected isOverlaySupported(key: OverlayKey): boolean {
    return isOverlaySupportedForScenario(this.selectedScenario().id, key)
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.exportPreview())
    this.exportMessage.set("Electromagnetism scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    const exported = this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )

    if (exported) {
      this.exportMessage.set("Electromagnetism scenario exported as JSON.")
    }
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
      this.overlays.set(payload.overlays ?? this.overlays())
      this.exportMessage.set("Electromagnetism scenario restored from JSON.")
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

    this.renderer = await ElectromagnetismWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set(
        "WebGPU canvas initialization failed for the Electromagnetism viewport.",
      )
      this.webGpuReady.set(false)
      return
    }

    this.webGpuMessage.set("Electromagnetism viewport ready.")
    this.rendererReady.set(true)
  }
}

function applyScenarioOverlaySupport(
  overlays: ElectromagnetismOverlayOptions,
  scenarioId: ElectromagnetismScenarioId,
): ElectromagnetismOverlayOptions {
  return {
    showFieldVectors: overlays.showFieldVectors,
    showForceVectors: overlays.showForceVectors,
    showPotentialGuides: overlays.showPotentialGuides,
    showMagneticField: isOverlaySupportedForScenario(scenarioId, "showMagneticField")
      ? overlays.showMagneticField
      : false,
    showTrajectory: isOverlaySupportedForScenario(scenarioId, "showTrajectory")
      ? overlays.showTrajectory
      : false,
  }
}

function isOverlaySupportedForScenario(
  scenarioId: ElectromagnetismScenarioId,
  key: OverlayKey,
): boolean {
  if (key === "showMagneticField") {
    return (
      scenarioId === "moving-charge-magnetic-field" ||
      scenarioId === "current-loop-magnetic-field" ||
      scenarioId === "electromagnetic-induction"
    )
  }

  if (key === "showTrajectory") {
    return (
      scenarioId === "moving-charge-magnetic-field" || scenarioId === "electromagnetic-induction"
    )
  }

  return true
}

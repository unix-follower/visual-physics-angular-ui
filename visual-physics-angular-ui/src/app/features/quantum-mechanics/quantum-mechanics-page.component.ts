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
import { buildInsightCards } from "./quantum-mechanics-analytics"
import {
  buildExportPayload,
  parseImportPayload,
  QuantumMechanicsOverlayOptions,
} from "./quantum-mechanics-payload"
import { buildQuantumMechanicsReportCsv } from "./quantum-mechanics-report"
import {
  EditableQuantumMechanicsField,
  QuantumMechanicsStateService,
} from "./quantum-mechanics-state.service"
import { QuantumMechanicsScenarioId } from "./quantum-mechanics.models"
import { QuantumMechanicsWebGpuRenderer } from "./quantum-mechanics-webgpu-renderer"

const DEFAULT_OVERLAYS: QuantumMechanicsOverlayOptions = {
  showProbabilityGuide: true,
  showPotentialGuide: true,
  showPhaseGuide: true,
}

@Component({
  selector: "app-quantum-mechanics-page",
  templateUrl: "./quantum-mechanics-page.component.html",
  styleUrl: "./quantum-mechanics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuantumMechanicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(QuantumMechanicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: QuantumMechanicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<QuantumMechanicsOverlayOptions>({
    ...DEFAULT_OVERLAYS,
  })
  protected readonly isParticleScenario = computed(
    () => this.selectedScenario().id === "particle-in-a-box",
  )
  protected readonly isTunnelingScenario = computed(
    () => this.selectedScenario().id === "finite-potential-well-tunneling",
  )
  protected readonly isInterferenceScenario = computed(
    () => this.selectedScenario().id === "double-slit-interference",
  )
  protected readonly particleMetrics = computed(() => ({
    boxLengthNanometers: this.selectedScenario().boxLengthNanometers ?? 0,
    quantumNumber: this.selectedScenario().quantumNumber ?? 1,
  }))
  protected readonly tunnelingMetrics = computed(() => ({
    particleEnergyEv: this.selectedScenario().particleEnergyEv ?? 0,
    barrierHeightEv: this.selectedScenario().barrierHeightEv ?? 0,
    barrierWidthNanometers: this.selectedScenario().barrierWidthNanometers ?? 0,
  }))
  protected readonly interferenceMetrics = computed(() => ({
    wavelengthNanometers: this.selectedScenario().wavelengthNanometers ?? 0,
    slitSeparationMicrometers: this.selectedScenario().slitSeparationMicrometers ?? 0,
    slitWidthMicrometers: this.selectedScenario().slitWidthMicrometers ?? 0,
    screenDistanceMeters: this.selectedScenario().screenDistanceMeters ?? 0,
  }))
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isTunnelingScenario()) {
      return `Transmission settles near ${((snapshot.transmissionProbability ?? 0) * 100).toFixed(2)}% for the current barrier width and energy gap.`
    }
    if (this.isInterferenceScenario()) {
      return `The bright-fringe spacing is ${(snapshot.fringeSpacingMillimeters ?? 0).toFixed(3)} mm with a central envelope width of ${(snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(3)} mm.`
    }
    return `The selected stationary mode has energy ${(snapshot.energyLevelEv ?? 0).toFixed(3)} eV and ${snapshot.nodeCount ?? 0} interior nodes.`
  })
  protected readonly residualSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isTunnelingScenario()) {
      return `Reflection ${((snapshot.reflectionProbability ?? 0) * 100).toFixed(2)}%, decay length ${(snapshot.decayLengthNanometers ?? 0).toFixed(3)} nm.`
    }
    if (this.isInterferenceScenario()) {
      return `Wavelength ${(snapshot.wavelengthNanometers ?? 0).toFixed(0)} nm, slit spacing ${(snapshot.slitSeparationMicrometers ?? 0).toFixed(1)} um, coherence ratio ${(snapshot.coherenceEstimate ?? 0).toFixed(2)}.`
    }
    return `Well length ${(snapshot.boxLengthNanometers ?? 0).toFixed(3)} nm, de Broglie wavelength ${(snapshot.deBroglieWavelengthNanometers ?? 0).toFixed(3)} nm.`
  })
  protected readonly viewportHint = computed(() => {
    if (this.isTunnelingScenario()) {
      return "The viewport renders a rectangular barrier, a tunneling probability envelope, and transmission readouts for the active finite-barrier slice."
    }
    if (this.isInterferenceScenario()) {
      return "The viewport renders the double-slit aperture, screen plane, optical axis, and a deterministic interference-intensity trace."
    }
    return "The viewport renders rigid box walls, the stationary probability-density curve, and optional standing-wave phase guidance for the active particle-in-a-box slice."
  })
  protected readonly controlsTitle = computed(() => {
    if (this.isTunnelingScenario()) {
      return "Finite Barrier Controls"
    }
    if (this.isInterferenceScenario()) {
      return "Double-Slit Controls"
    }
    return "Particle-in-a-Box Controls"
  })
  protected readonly controlNote = computed(() => {
    if (this.isTunnelingScenario()) {
      return "Tunneling payloads use particleEnergyEv, barrierHeightEv, barrierWidthNanometers, and snapshot.timeSeconds."
    }
    if (this.isInterferenceScenario()) {
      return "Interference payloads use wavelengthNanometers, slitSeparationMicrometers, slitWidthMicrometers, screenDistanceMeters, and snapshot.timeSeconds."
    }
    return "Particle-in-a-box payloads use boxLengthNanometers, quantumNumber, and snapshot.timeSeconds."
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
    this.state.selectScenario(target.value as QuantumMechanicsScenarioId)
    this.exportMessage.set("")
  }

  protected updateScenarioParameter(field: EditableQuantumMechanicsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof QuantumMechanicsOverlayOptions): void {
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
    this.exportMessage.set("Quantum Mechanics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Quantum Mechanics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      buildQuantumMechanicsReportCsv(
        this.selectedScenario(),
        this.currentState(),
        this.sampledStates(),
      ),
      "text/csv",
    )
    this.exportMessage.set("Quantum Mechanics report exported as CSV.")
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
      this.exportMessage.set("Quantum Mechanics scenario restored from JSON.")
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

    if (!status.supported) {
      return
    }

    this.renderer = await QuantumMechanicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set("Quantum Mechanics viewport initialization failed.")
      return
    }

    this.webGpuMessage.set("Quantum Mechanics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(
      this.currentState(),
      this.selectedScenario(),
      this.overlays(),
      this.sampledStates(),
    )
  }
}

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
import { buildInsightCards } from "./fluid-mechanics-analytics"
import {
  buildExportPayload,
  FluidMechanicsOverlayOptions,
  parseImportPayload,
} from "./fluid-mechanics-payload"
import { buildFluidMechanicsReportCsv } from "./fluid-mechanics-report"
import {
  EditableFluidMechanicsField,
  FluidMechanicsStateService,
} from "./fluid-mechanics-state.service"
import { FluidMechanicsScenarioId } from "./fluid-mechanics.models"
import { FluidMechanicsWebGpuRenderer } from "./fluid-mechanics-webgpu-renderer"

@Component({
  selector: "app-fluid-mechanics-page",
  templateUrl: "./fluid-mechanics-page.component.html",
  styleUrl: "./fluid-mechanics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluidMechanicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly state = inject(FluidMechanicsStateService)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)
  private renderer: FluidMechanicsWebGpuRenderer | null = null
  private readonly rendererReady = signal(false)

  protected readonly scenarioPreviews = this.state.listScenarios()
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly isBuoyancyScenario = computed(
    () => this.selectedScenario().id === "buoyancy-block",
  )
  protected readonly isPipeScenario = computed(
    () => this.selectedScenario().id === "poiseuille-pipe",
  )
  protected readonly isChannelScenario = computed(
    () => this.selectedScenario().id === "open-channel-flow",
  )
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<FluidMechanicsOverlayOptions>({
    showForceGuides: true,
    showWaterline: true,
    showEquilibriumGuide: true,
  })
  protected readonly metrics = computed(() => ({
    fluidDensity: this.selectedScenario().fluidDensity ?? 0,
    blockDensity: this.selectedScenario().blockDensity ?? 0,
    gravity: this.selectedScenario().gravity ?? 0,
    blockWidth: this.selectedScenario().blockWidth ?? 0,
    blockHeight: this.selectedScenario().blockHeight ?? 0,
    blockDepth: this.selectedScenario().blockDepth ?? 0,
    pipeRadius: this.selectedScenario().pipeRadius ?? 0,
    pipeLength: this.selectedScenario().pipeLength ?? 0,
    pressureDrop: this.selectedScenario().pressureDrop ?? 0,
    dynamicViscosity: this.selectedScenario().dynamicViscosity ?? 0,
    channelWidth: this.selectedScenario().channelWidth ?? 0,
    channelDepth: this.selectedScenario().channelDepth ?? 0,
    channelSlope: this.selectedScenario().channelSlope ?? 0,
    roughnessCoefficient: this.selectedScenario().roughnessCoefficient ?? 0,
    channelLength: this.selectedScenario().channelLength ?? 0,
  }))
  protected readonly overlayLabels = computed(() => {
    if (this.isChannelScenario()) {
      return {
        showForceGuides: "Flow guides",
        showWaterline: "Water surface",
        showEquilibriumGuide: "Slope guide",
      }
    }

    if (this.isPipeScenario()) {
      return {
        showForceGuides: "Flow guides",
        showWaterline: "Centerline",
        showEquilibriumGuide: "Pressure drop guide",
      }
    }

    return {
      showForceGuides: "Force guides",
      showWaterline: "Waterline",
      showEquilibriumGuide: "Equilibrium guide",
    }
  })
  protected readonly focusSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isChannelScenario()) {
      return `Discharge ${(snapshot.discharge ?? 0).toFixed(2)} m^3/s, Froude ${(snapshot.froudeNumber ?? 0).toFixed(2)}.`
    }

    if (this.isPipeScenario()) {
      return `Average velocity ${(snapshot.averageVelocity ?? 0).toFixed(3)} m/s, Reynolds ${(snapshot.reynoldsNumber ?? 0).toFixed(0)}.`
    }

    return `Equilibrium depth ${(snapshot.equilibriumDepth ?? 0).toFixed(2)} m, immersion ${((snapshot.immersionRatio ?? 0) * 100).toFixed(1)}%.`
  })
  protected readonly viewportHint = computed(() => {
    if (this.isChannelScenario()) {
      return "Channel bed, water surface, flow arrows, and bed-slope cues render here for the uniform open-channel slice."
    }

    if (this.isPipeScenario()) {
      return "Pipe walls, axial centerline, flow arrows, and pressure-drop cues render here for the laminar pipe-flow slice."
    }

    return "Tank geometry, waterline, buoyancy and weight guides, plus the active block equilibrium depth render here for the current fluid mechanics slice."
  })
  protected readonly residualSummary = computed(() => {
    const snapshot = this.currentState()
    if (this.isChannelScenario()) {
      return `Discharge ${(snapshot.discharge ?? 0).toFixed(3)} m^3/s, velocity ${(snapshot.averageVelocity ?? 0).toFixed(3)} m/s, hydraulic radius ${(snapshot.hydraulicRadius ?? 0).toFixed(3)} m`
    }

    if (this.isPipeScenario()) {
      return `Flow rate ${(snapshot.volumetricFlowRate ?? 0).toExponential(2)} m^3/s, centerline velocity ${(snapshot.centerlineVelocity ?? 0).toFixed(3)} m/s, pressure gradient ${(snapshot.pressureGradient ?? 0).toFixed(2)} Pa/m`
    }

    return `Buoyant force ${(snapshot.buoyantForce ?? 0).toFixed(1)} N, weight ${(snapshot.weightForce ?? 0).toFixed(1)} N, net ${(snapshot.netForce ?? 0).toFixed(1)} N`
  })
  protected readonly controlTitle = computed(() => {
    if (this.isChannelScenario()) {
      return "Open Channel Controls"
    }

    if (this.isPipeScenario()) {
      return "Pipe Flow Controls"
    }

    return "Buoyancy Controls"
  })
  protected readonly controlNote = computed(() => {
    if (this.isChannelScenario()) {
      return "Open-channel payloads use gravity, channelWidth, channelDepth, channelSlope, roughnessCoefficient, and channelLength."
    }

    if (this.isPipeScenario()) {
      return "Poiseuille-pipe payloads use fluidDensity, dynamicViscosity, pipeRadius, pipeLength, and pressureDrop."
    }

    return "Buoyancy-block payloads use fluidDensity, blockDensity, blockWidth, blockHeight, and blockDepth."
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
    this.state.selectScenario(target.value as FluidMechanicsScenarioId)
    this.exportMessage.set("")
  }

  protected updateScenarioParameter(field: EditableFluidMechanicsField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
  }

  protected toggleOverlay(key: keyof FluidMechanicsOverlayOptions): void {
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
    this.exportMessage.set("Fluid mechanics scenario copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.exportPreview(),
      "application/json",
    )
    this.exportMessage.set("Fluid mechanics scenario exported as JSON.")
  }

  protected downloadReportCsv(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-report.csv`,
      buildFluidMechanicsReportCsv(
        this.selectedScenario(),
        this.currentState(),
        this.sampledStates(),
      ),
      "text/csv",
    )
    this.exportMessage.set("Fluid mechanics report exported as CSV.")
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
      this.exportMessage.set("Fluid mechanics scenario restored from JSON.")
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

    this.renderer = await FluidMechanicsWebGpuRenderer.create(this.canvasRef().nativeElement)
    if (!this.renderer) {
      this.webGpuMessage.set(
        "WebGPU canvas initialization failed for the fluid mechanics viewport.",
      )
      this.webGpuReady.set(false)
      return
    }

    this.webGpuMessage.set("Fluid mechanics viewport ready.")
    this.rendererReady.set(true)
    this.renderer.render(this.currentState(), this.selectedScenario(), this.overlays())
  }
}

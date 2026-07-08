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
import { buildGraphPath, buildInsightCards, buildViewportGuideLabels } from "./dynamics-analytics"
import { buildParameterSections } from "./dynamics-parameters"
import { buildExportPayload, parseImportPayload } from "./dynamics-payload"
import { DynamicsScenarioId } from "./dynamics.models"
import { DynamicsStateService, EditableScenarioField } from "./dynamics-state.service"
import { DynamicsOverlayOptions, DynamicsWebGpuRenderer } from "./dynamics-webgpu-renderer"

interface OverlayLegendItem {
  label: string
  color: string
  active: boolean
}

@Component({
  selector: "app-dynamics-page",
  templateUrl: "./dynamics-page.component.html",
  styleUrl: "./dynamics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")
  private readonly webGpuSupport = inject(WebGpuSupportService)

  private playbackTimer?: ReturnType<typeof globalThis.setInterval>
  private renderer?: DynamicsWebGpuRenderer
  private readonly rendererReady = signal(false)

  protected readonly state = inject(DynamicsStateService)
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly maxTimeSeconds = computed(() => this.selectedScenario().durationSeconds)
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  protected readonly overlays = signal<DynamicsOverlayOptions>({
    showMomentumVector: true,
    showVelocityVector: true,
    showForceVector: true,
    showScenarioGuides: true,
  })

  protected readonly xPositionPath = computed(() =>
    buildGraphPath(this.sampledStates(), "xPosition"),
  )
  protected readonly yPositionPath = computed(() =>
    buildGraphPath(this.sampledStates(), "yPosition"),
  )
  protected readonly speedPath = computed(() => buildGraphPath(this.sampledStates(), "speed"))
  protected readonly totalEnergyPath = computed(() =>
    buildGraphPath(this.sampledStates(), "totalEnergy"),
  )
  protected readonly viewportBoundsLabel = computed(() => {
    const bounds = this.selectedScenario().viewBounds
    return `x: ${bounds.minX} to ${bounds.maxX} m, y: ${bounds.minY} to ${bounds.maxY} m`
  })
  protected readonly energyDrift = computed(() => {
    const energies = this.sampledStates().map((sample) => sample.totalEnergy)
    if (energies.length === 0) {
      return 0
    }

    return Math.max(...energies) - Math.min(...energies)
  })
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState(), this.energyDrift()),
  )
  protected readonly parameterSections = computed(() =>
    buildParameterSections(this.selectedScenario()),
  )
  protected readonly overlayLegendItems = computed<OverlayLegendItem[]>(() => [
    {
      label: "Momentum vector",
      color: "#6ee7ff",
      active: this.overlays().showMomentumVector,
    },
    {
      label: "Velocity vector",
      color: "#8cffb5",
      active: this.overlays().showVelocityVector,
    },
    {
      label: "Net-force vector",
      color: "#ff8a5b",
      active: this.overlays().showForceVector,
    },
    {
      label: "Scenario guides",
      color: "#fbe679",
      active: this.overlays().showScenarioGuides,
    },
  ])
  protected readonly viewportGuideLabels = computed(() =>
    buildViewportGuideLabels(this.selectedScenario(), this.currentState(), this.overlays()),
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
        this.sampledStates(),
        this.selectedScenario(),
        this.overlays(),
      )
    })

    this.destroyRef.onDestroy(() => {
      this.stopPlaybackLoop()
      this.renderer?.destroy()
    })
  }

  protected selectScenario(event: Event): void {
    const target = event.target as HTMLSelectElement
    this.state.selectScenario(target.value as DynamicsScenarioId)
    this.stopPlaybackLoop()
  }

  protected updateTime(event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.setTimeSeconds(Number(target.value))
  }

  protected togglePlayback(): void {
    this.state.togglePlayback()
    if (this.state.isPlaying()) {
      this.startPlaybackLoop()
      return
    }

    this.stopPlaybackLoop()
  }

  protected stepForward(): void {
    this.state.pause()
    this.stopPlaybackLoop()
    this.state.stepBy(0.1)
  }

  protected reset(): void {
    this.state.reset()
    this.stopPlaybackLoop()
  }

  protected updateScenarioParameter(field: EditableScenarioField, event: Event): void {
    const target = event.target as HTMLInputElement
    this.state.updateScenarioField(field, Number(target.value))
    this.stopPlaybackLoop()
  }

  protected resetScenarioParameters(): void {
    this.state.resetScenarioParameters()
    this.stopPlaybackLoop()
  }

  protected async copyScenarioState(): Promise<void> {
    if (globalThis.navigator?.clipboard === undefined) {
      this.exportMessage.set("Clipboard export is unavailable in this browser context.")
      return
    }

    await globalThis.navigator.clipboard.writeText(this.serializeExportPayload())
    this.exportMessage.set("Scenario state copied to clipboard.")
  }

  protected downloadScenarioState(): void {
    this.downloadTextFile(
      `${this.selectedScenario().id}-state.json`,
      this.serializeExportPayload(),
      "application/json",
    )
    this.exportMessage.set("Scenario state exported as JSON.")
  }

  protected exportViewportImage(): void {
    if (globalThis.window === undefined) {
      this.exportMessage.set("Viewport export is only available in the browser.")
      return
    }

    const canvas = this.canvasRef().nativeElement
    const imageUrl = canvas.toDataURL("image/png")
    const link = globalThis.document.createElement("a")
    link.href = imageUrl
    link.download = `${this.selectedScenario().id}-viewport.png`
    link.click()
    this.exportMessage.set("Viewport snapshot exported as PNG.")
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
      this.stopPlaybackLoop()
      this.exportMessage.set("Scenario state restored from JSON.")
    } catch {
      this.exportMessage.set("Import failed. Use a JSON payload exported from this workspace.")
    }
  }

  protected toggleOverlay(key: keyof DynamicsOverlayOptions): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  private startPlaybackLoop(): void {
    if (globalThis.window === undefined || this.playbackTimer !== undefined) {
      return
    }

    this.playbackTimer = globalThis.setInterval(() => {
      const nextTime = this.state.timeSeconds() + 0.016
      if (nextTime >= this.maxTimeSeconds()) {
        this.state.setTimeSeconds(this.maxTimeSeconds())
        this.state.pause()
        this.stopPlaybackLoop()
        return
      }

      this.state.setTimeSeconds(nextTime)
    }, 16)
  }

  private stopPlaybackLoop(): void {
    if (this.playbackTimer !== undefined) {
      globalThis.clearInterval(this.playbackTimer)
      this.playbackTimer = undefined
    }
  }

  private serializeExportPayload(): string {
    return JSON.stringify(
      buildExportPayload(
        this.selectedScenario(),
        this.currentState(),
        this.overlays(),
        this.sampledStates(),
      ),
      null,
      2,
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

  private async initializeRenderer(): Promise<void> {
    const canvas = this.canvasRef().nativeElement
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    this.webGpuReady.set(status.supported)

    if (!status.supported || globalThis.window === undefined) {
      return
    }

    this.renderer = (await DynamicsWebGpuRenderer.create(canvas)) ?? undefined
    this.rendererReady.set(this.renderer !== undefined)
    if (this.renderer) {
      this.webGpuMessage.set(
        "Rendering live axes, sampled trajectories, and force-driven motion in WebGPU.",
      )
      this.renderer.render(
        this.currentState(),
        this.sampledStates(),
        this.selectedScenario(),
        this.overlays(),
      )
    }
  }
}

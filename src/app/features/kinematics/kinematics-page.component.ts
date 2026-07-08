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

import { KinematicsSample, KinematicsScenario, KinematicsScenarioId } from "./kinematics.models"
import { KinematicsStateService } from "./kinematics-state.service"
import { KinematicsWebGpuRenderer, VectorOverlayOptions } from "./kinematics-webgpu-renderer"
import { WebGpuSupportService } from "./webgpu-support.service"

@Component({
  selector: "app-kinematics-page",
  templateUrl: "./kinematics-page.component.html",
  styleUrl: "./kinematics-page.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KinematicsPageComponent {
  private readonly destroyRef = inject(DestroyRef)
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("viewport")

  private playbackTimer?: ReturnType<typeof globalThis.setInterval>
  private renderer?: KinematicsWebGpuRenderer

  protected readonly state = inject(KinematicsStateService)
  protected readonly selectedScenario = this.state.selectedScenario
  protected readonly currentState = this.state.currentState
  protected readonly sampledStates = this.state.sampledStates
  protected readonly maxTimeSeconds = computed(() => this.selectedScenario().durationSeconds)
  protected readonly webGpuMessage = signal("Checking WebGPU capability...")
  protected readonly webGpuReady = signal(false)
  protected readonly exportMessage = signal("")
  protected readonly importPayloadText = signal("")
  private readonly rendererReady = signal(false)
  protected readonly overlays = signal<VectorOverlayOptions>({
    showPositionVector: true,
    showVelocityVector: true,
    showAccelerationVector: true,
  })

  protected readonly xPositionPath = computed(() =>
    buildGraphPath(this.sampledStates(), "xPosition"),
  )
  protected readonly yPositionPath = computed(() =>
    buildGraphPath(this.sampledStates(), "yPosition"),
  )
  protected readonly speedPath = computed(() => buildGraphPath(this.sampledStates(), "speed"))
  protected readonly parameterSections = computed(() =>
    buildParameterSections(this.selectedScenario()),
  )
  protected readonly vectorLegendItems = computed<VectorLegendItem[]>(() => [
    {
      label: "Position vector",
      colorClass: "legend-swatch--position",
      active: this.overlays().showPositionVector,
    },
    {
      label: "Velocity vector",
      colorClass: "legend-swatch--velocity",
      active: this.overlays().showVelocityVector,
    },
    {
      label: "Acceleration vector",
      colorClass: "legend-swatch--acceleration",
      active: this.overlays().showAccelerationVector,
    },
  ])
  protected readonly insightCards = computed(() =>
    buildInsightCards(this.selectedScenario(), this.currentState()),
  )
  protected readonly viewportBoundsLabel = computed(() => {
    const bounds = this.selectedScenario().viewBounds
    return `x: ${bounds.minX} to ${bounds.maxX} m, y: ${bounds.minY} to ${bounds.maxY} m`
  })

  private readonly webGpuSupport = inject(WebGpuSupportService)

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
    this.state.selectScenario(target.value as KinematicsScenarioId)
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

  protected toggleOverlay(key: keyof VectorOverlayOptions): void {
    this.overlays.update((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  private async initializeRenderer(): Promise<void> {
    const canvas = this.canvasRef().nativeElement
    const status = await this.webGpuSupport.getStatus()
    this.webGpuMessage.set(status.message)
    this.webGpuReady.set(status.supported)

    if (!status.supported || globalThis.window === undefined) {
      return
    }

    this.renderer = (await KinematicsWebGpuRenderer.create(canvas)) ?? undefined
    this.rendererReady.set(this.renderer !== undefined)
    if (this.renderer) {
      this.webGpuMessage.set("Rendering live axes, trajectory, and body position in WebGPU.")
      this.renderer.render(
        this.currentState(),
        this.sampledStates(),
        this.selectedScenario(),
        this.overlays(),
      )
    }
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
}

function buildGraphPath(
  samples: readonly KinematicsSample[],
  metric: "xPosition" | "yPosition" | "speed",
): string {
  if (samples.length === 0) {
    return ""
  }

  const values = samples.map((sample) => sample[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)

  return samples
    .map((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * 320
      const y = 120 - ((sample[metric] - min) / span) * 120
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

type EditableScenarioField =
  | "initialPosition.x"
  | "initialPosition.y"
  | "initialVelocity.x"
  | "initialVelocity.y"
  | "acceleration.x"
  | "acceleration.y"
  | "observerVelocity.x"
  | "observerVelocity.y"
  | "radius"
  | "angularSpeed"

interface ParameterField {
  field: EditableScenarioField
  label: string
  value: number
  step: number
}

interface ParameterSection {
  heading: string
  fields: ParameterField[]
}

interface InsightCard {
  label: string
  value: string
  detail: string
}

interface VectorLegendItem {
  label: string
  colorClass: string
  active: boolean
}

interface ExportPayload {
  exportedAt: string
  scenario: KinematicsScenario
  snapshot: {
    timeSeconds: number
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    acceleration: { x: number; y: number }
    speed: number
    accelerationMagnitude: number
    relativePosition?: { x: number; y: number }
    relativeVelocity?: { x: number; y: number }
  }
  overlays: VectorOverlayOptions
  samples: readonly KinematicsSample[]
}

interface ImportPayload {
  scenario: KinematicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: VectorOverlayOptions
}

function buildParameterSections(scenario: KinematicsScenario): ParameterSection[] {
  const sections: ParameterSection[] = [
    {
      heading: "Initial position",
      fields: [
        {
          field: "initialPosition.x",
          label: "x0 (m)",
          value: scenario.initialPosition.x,
          step: 0.1,
        },
        {
          field: "initialPosition.y",
          label: "y0 (m)",
          value: scenario.initialPosition.y,
          step: 0.1,
        },
      ],
    },
    {
      heading: "Initial velocity",
      fields: [
        {
          field: "initialVelocity.x",
          label: "vx0 (m/s)",
          value: scenario.initialVelocity.x,
          step: 0.1,
        },
        {
          field: "initialVelocity.y",
          label: "vy0 (m/s)",
          value: scenario.initialVelocity.y,
          step: 0.1,
        },
      ],
    },
    {
      heading: "Acceleration",
      fields: [
        {
          field: "acceleration.x",
          label: "ax (m/s²)",
          value: scenario.acceleration.x,
          step: 0.1,
        },
        {
          field: "acceleration.y",
          label: "ay (m/s²)",
          value: scenario.acceleration.y,
          step: 0.1,
        },
      ],
    },
  ]

  if (scenario.observerVelocity) {
    sections.push({
      heading: "Observer frame",
      fields: [
        {
          field: "observerVelocity.x",
          label: "observer vx (m/s)",
          value: scenario.observerVelocity.x,
          step: 0.1,
        },
        {
          field: "observerVelocity.y",
          label: "observer vy (m/s)",
          value: scenario.observerVelocity.y,
          step: 0.1,
        },
      ],
    })
  }

  if (scenario.id === "uniform-circular-motion") {
    sections.push({
      heading: "Circular motion",
      fields: [
        {
          field: "radius",
          label: "radius (m)",
          value: scenario.radius ?? 0,
          step: 0.1,
        },
        {
          field: "angularSpeed",
          label: "angular speed (rad/s)",
          value: scenario.angularSpeed ?? 0,
          step: 0.05,
        },
      ],
    })
  }

  return sections
}

function buildInsightCards(
  scenario: KinematicsScenario,
  snapshot: {
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    acceleration: { x: number; y: number }
    speed: number
    accelerationMagnitude: number
    relativeVelocity?: { x: number; y: number }
  },
): InsightCard[] {
  const displacementMagnitude = Math.hypot(snapshot.position.x, snapshot.position.y)
  const directionDegrees = normalizeDegrees(
    radiansToDegrees(Math.atan2(snapshot.velocity.y, snapshot.velocity.x)),
  )
  const cards: InsightCard[] = [
    {
      label: "Displacement magnitude",
      value: `${displacementMagnitude.toFixed(2)} m`,
      detail: "Distance from the origin in the current world frame.",
    },
    {
      label: "Motion heading",
      value: `${directionDegrees.toFixed(1)} deg`,
      detail: "Direction of the velocity vector measured counterclockwise from +x.",
    },
    {
      label: "Speed vs acceleration",
      value: `${snapshot.speed.toFixed(2)} / ${snapshot.accelerationMagnitude.toFixed(2)}`,
      detail: "Instantaneous speed in m/s and acceleration magnitude in m/s^2.",
    },
  ]

  if (scenario.id === "projectile") {
    cards.push({
      label: "Projectile reading",
      value: snapshot.velocity.y >= 0 ? "Ascending" : "Descending",
      detail:
        "The sign of the vertical velocity shows whether the projectile is rising or falling.",
    })
  }

  if (scenario.id === "relative-motion" && snapshot.relativeVelocity) {
    cards.push({
      label: "Relative frame speed",
      value: `${Math.hypot(snapshot.relativeVelocity.x, snapshot.relativeVelocity.y).toFixed(2)} m/s`,
      detail: "Observed speed after subtracting the moving observer frame.",
    })
  }

  if (scenario.id === "uniform-circular-motion") {
    cards.push({
      label: "Circular motion cue",
      value: "Velocity tangent, acceleration inward",
      detail:
        "In uniform circular motion the velocity is tangent to the path and acceleration points to the center.",
    })
  }

  return cards
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

function normalizeDegrees(degrees: number): number {
  return (degrees + 360) % 360
}

function buildExportPayload(
  scenario: KinematicsScenario,
  snapshot: {
    timeSeconds: number
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    acceleration: { x: number; y: number }
    speed: number
    accelerationMagnitude: number
    relativePosition?: { x: number; y: number }
    relativeVelocity?: { x: number; y: number }
  },
  overlays: VectorOverlayOptions,
  samples: readonly KinematicsSample[],
): ExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

function parseImportPayload(source: string): ImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isImportPayload(value: unknown): value is ImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isKinematicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isVectorOverlayOptions(value["overlays"]))
  )
}

function isKinematicsScenario(value: unknown): value is KinematicsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    isKinematicsScenarioId(value["id"]) &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    isVector2(value["initialPosition"]) &&
    isVector2(value["initialVelocity"]) &&
    isVector2(value["acceleration"]) &&
    (value["observerVelocity"] === undefined || isVector2(value["observerVelocity"])) &&
    (value["radius"] === undefined || typeof value["radius"] === "number") &&
    (value["angularSpeed"] === undefined || typeof value["angularSpeed"] === "number") &&
    (value["center"] === undefined || isVector2(value["center"]))
  )
}

function isKinematicsScenarioId(value: unknown): value is KinematicsScenarioId {
  return (
    value === "constant-velocity" ||
    value === "constant-acceleration" ||
    value === "projectile" ||
    value === "relative-motion" ||
    value === "uniform-circular-motion"
  )
}

function isViewBounds(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["minX"] === "number" &&
    typeof value["maxX"] === "number" &&
    typeof value["minY"] === "number" &&
    typeof value["maxY"] === "number"
  )
}

function isVector2(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return typeof value["x"] === "number" && typeof value["y"] === "number"
}

function isVectorOverlayOptions(value: unknown): value is VectorOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showPositionVector"] === "boolean" &&
    typeof value["showVelocityVector"] === "boolean" &&
    typeof value["showAccelerationVector"] === "boolean"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

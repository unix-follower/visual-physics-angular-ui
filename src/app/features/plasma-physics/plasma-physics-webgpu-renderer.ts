import {
  PlasmaPhysicsOverlayOptions,
  PlasmaPhysicsSample,
  PlasmaPhysicsScenario,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

interface PlasmaRenderModel {
  scenario: PlasmaPhysicsScenario
  snapshot: PlasmaPhysicsStateSnapshot
  overlays: PlasmaPhysicsOverlayOptions
  samples: readonly PlasmaPhysicsSample[]
}

interface PlotArea {
  left: number
  right: number
  top: number
  bottom: number
}

interface ViewScale {
  minX: number
  maxX: number
  minY: number
  maxY: number
  area: PlotArea
}

export class PlasmaPhysicsWebGpuRenderer {
  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  static async create(canvas: HTMLCanvasElement): Promise<PlasmaPhysicsWebGpuRenderer | null> {
    const context = canvas.getContext("2d")
    if (!context) {
      return null
    }

    return new PlasmaPhysicsWebGpuRenderer(canvas, context)
  }

  render(model: PlasmaRenderModel): void {
    const { scenario, snapshot, overlays, samples } = model
    this.canvas.width = 640
    this.canvas.height = 360

    const { context } = this
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    context.fillStyle = "#07131f"
    context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const area: PlotArea = { left: 88, right: 584, top: 78, bottom: 302 }
    const scale = buildScale(samples, area)

    renderBackdrop(context, scenario, overlays)
    renderFrame(context, area)
    renderPolyline(context, samples, scale, (sample) => sample.primaryValue, "#7ad6ff", 3)

    if (overlays.showComparisonBand) {
      renderPolyline(
        context,
        samples,
        scale,
        (sample) => sample.secondaryValue ?? sample.primaryValue,
        "#ffc878",
        2,
      )
    }

    if (overlays.showReferenceGuides) {
      renderReferenceGuides(context, scenario, snapshot, scale, area)
    }

    if (overlays.showActiveMarker) {
      const activeSample = samples.find((sample) => sample.active) ?? samples[0] ?? null
      if (activeSample) {
        const point = mapPoint(scale, activeSample.position, activeSample.primaryValue)
        renderCrosshair(context, point.x, point.y)
      }
    }

    context.fillStyle = "#ecf7ff"
    context.font = "600 18px Georgia"
    context.fillText(scenario.name, 26, 34)
    context.font = "12px Georgia"
    context.fillText(scenario.equationSummary, 26, 54)
  }

  destroy(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}

function renderBackdrop(
  context: CanvasRenderingContext2D,
  scenario: PlasmaPhysicsScenario,
  overlays: PlasmaPhysicsOverlayOptions,
): void {
  context.save()

  if (scenario.id === "debye-screening") {
    context.strokeStyle = "rgba(122, 214, 255, 0.16)"
    context.lineWidth = 2
    for (let index = 0; index < 5; index += 1) {
      context.beginPath()
      context.arc(320, 188, 28 + index * 26, 0, Math.PI * 2)
      context.stroke()
    }
    context.fillStyle = "rgba(255, 200, 120, 0.12)"
    context.beginPath()
    context.arc(320, 188, 18, 0, Math.PI * 2)
    context.fill()
  } else if (scenario.id === "magnetic-confinement") {
    context.strokeStyle = "rgba(122, 214, 255, 0.22)"
    context.lineWidth = 1.6
    for (let index = 0; index < 6; index += 1) {
      const top = 112 + index * 18
      context.beginPath()
      context.ellipse(320, top + 36, 132 - index * 10, 26, 0, 0, Math.PI * 2)
      context.stroke()
    }
  } else {
    context.fillStyle = "rgba(122, 214, 255, 0.12)"
    for (let index = 0; index < 12; index += 1) {
      const x = 96 + index * 40
      const height = 62 + Math.sin(index / 2) * 18
      context.fillRect(x, 160 - height / 2, 14, height)
    }
  }

  if (overlays.showReferenceGuides) {
    context.strokeStyle = "rgba(255, 255, 255, 0.08)"
    context.lineWidth = 1
    for (let x = 88; x <= 584; x += 62) {
      context.beginPath()
      context.moveTo(x, 78)
      context.lineTo(x, 302)
      context.stroke()
    }
  }

  context.restore()
}

function renderFrame(context: CanvasRenderingContext2D, area: PlotArea): void {
  context.save()
  context.strokeStyle = "#dceef8"
  context.lineWidth = 1.5
  context.strokeRect(area.left, area.top, area.right - area.left, area.bottom - area.top)
  context.restore()
}

function buildScale(samples: readonly PlasmaPhysicsSample[], area: PlotArea): ViewScale {
  const safeSamples =
    samples.length > 0 ? samples : [{ position: 0, primaryValue: 0, label: "empty", active: true }]
  const xValues = safeSamples.map((sample) => sample.position)
  const yValues = safeSamples
    .flatMap((sample) => [sample.primaryValue, sample.secondaryValue])
    .filter((value): value is number => value !== undefined && Number.isFinite(value))

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
    area,
  }
}

function mapPoint(scale: ViewScale, x: number, y: number): { x: number; y: number } {
  const normalizedX = scale.maxX === scale.minX ? 0.5 : (x - scale.minX) / (scale.maxX - scale.minX)
  const normalizedY = scale.maxY === scale.minY ? 0.5 : (y - scale.minY) / (scale.maxY - scale.minY)
  return {
    x: scale.area.left + normalizedX * (scale.area.right - scale.area.left),
    y: scale.area.bottom - normalizedY * (scale.area.bottom - scale.area.top),
  }
}

function renderPolyline(
  context: CanvasRenderingContext2D,
  samples: readonly PlasmaPhysicsSample[],
  scale: ViewScale,
  selector: (sample: PlasmaPhysicsSample) => number,
  strokeStyle: string,
  lineWidth: number,
): void {
  if (samples.length === 0) {
    return
  }

  context.save()
  context.strokeStyle = strokeStyle
  context.lineWidth = lineWidth
  context.beginPath()
  samples.forEach((sample, index) => {
    const point = mapPoint(scale, sample.position, selector(sample))
    if (index === 0) {
      context.moveTo(point.x, point.y)
      return
    }

    context.lineTo(point.x, point.y)
  })
  context.stroke()
  context.restore()
}

function renderReferenceGuides(
  context: CanvasRenderingContext2D,
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  scale: ViewScale,
  area: PlotArea,
): void {
  context.save()
  context.strokeStyle = "rgba(255, 255, 255, 0.45)"
  context.lineWidth = 1.5
  context.setLineDash([6, 6])

  if (scenario.id === "debye-screening") {
    const point = mapPoint(
      scale,
      (snapshot.debyeLengthMillimeters ?? 0) * (0.5 + snapshot.timeSeconds),
      snapshot.screenedPotentialVolts ?? 0,
    )
    context.beginPath()
    context.moveTo(point.x, area.top)
    context.lineTo(point.x, area.bottom)
    context.stroke()
  } else if (scenario.id === "magnetic-confinement") {
    const point = mapPoint(scale, snapshot.timeSeconds, snapshot.safetyFactor ?? 0)
    context.beginPath()
    context.moveTo(point.x, area.top)
    context.lineTo(point.x, area.bottom)
    context.stroke()
  } else {
    const point = mapPoint(
      scale,
      snapshot.timeSeconds,
      snapshot.restoringFieldKilovoltsPerMeter ?? 0,
    )
    context.beginPath()
    context.moveTo(point.x, area.top)
    context.lineTo(point.x, area.bottom)
    context.stroke()
  }

  context.restore()
}

function renderCrosshair(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.save()
  context.strokeStyle = "#ffffff"
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(x - 10, y)
  context.lineTo(x + 10, y)
  context.moveTo(x, y - 10)
  context.lineTo(x, y + 10)
  context.stroke()
  context.restore()
}

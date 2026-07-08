import {
  NuclearAndParticlePhysicsOverlayOptions,
  NuclearAndParticlePhysicsSample,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

interface RenderModel {
  scenario: NuclearAndParticlePhysicsScenario
  snapshot: NuclearAndParticlePhysicsStateSnapshot
  overlays: NuclearAndParticlePhysicsOverlayOptions
  samples: readonly NuclearAndParticlePhysicsSample[]
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

export class NuclearAndParticlePhysicsWebGpuRenderer {
  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  static async create(
    canvas: HTMLCanvasElement,
  ): Promise<NuclearAndParticlePhysicsWebGpuRenderer | null> {
    const context = canvas.getContext("2d")
    if (!context) {
      return null
    }

    return new NuclearAndParticlePhysicsWebGpuRenderer(canvas, context)
  }

  render(model: RenderModel): void {
    const { scenario, snapshot, overlays, samples } = model
    this.canvas.width = 640
    this.canvas.height = 360

    const { context } = this
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    context.fillStyle = "#081726"
    context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const area: PlotArea = { left: 90, right: 580, top: 78, bottom: 300 }
    const scale = buildScale(samples, area)

    renderBackdrop(context, scenario, overlays)
    renderFrame(context, area)
    renderPolyline(context, samples, scale, (sample) => sample.primaryValue, "#6fd3c3", 3)

    if (overlays.showComparisonBand) {
      renderPolyline(
        context,
        samples,
        scale,
        (sample) => sample.secondaryValue ?? sample.primaryValue,
        "#f2a65a",
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

    context.fillStyle = "#dbeaf2"
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
  scenario: NuclearAndParticlePhysicsScenario,
  overlays: NuclearAndParticlePhysicsOverlayOptions,
): void {
  context.save()
  if (scenario.id === "binding-energy-curve") {
    context.fillStyle = "rgba(129, 178, 154, 0.18)"
    for (let index = 0; index < 10; index += 1) {
      context.beginPath()
      context.arc(
        140 + index * 44,
        258 - Math.abs(4 - index) * 10,
        10 + (index % 3) * 4,
        0,
        Math.PI * 2,
      )
      context.fill()
    }
  } else if (scenario.id === "proton-proton-collision") {
    context.strokeStyle = "rgba(138, 187, 233, 0.28)"
    context.lineWidth = 2
    for (let index = 0; index < 5; index += 1) {
      context.beginPath()
      context.arc(320, 190, 48 + index * 28, 0, Math.PI * 2)
      context.stroke()
    }
  } else {
    context.fillStyle = "rgba(214, 76, 92, 0.14)"
    for (let index = 0; index < 6; index += 1) {
      context.fillRect(108 + index * 76, 104 + (index % 2) * 34, 24, 136 - index * 10)
    }
  }

  if (overlays.showReferenceGuides) {
    context.strokeStyle = "rgba(255, 255, 255, 0.08)"
    context.lineWidth = 1
    for (let x = 90; x <= 580; x += 49) {
      context.beginPath()
      context.moveTo(x, 78)
      context.lineTo(x, 300)
      context.stroke()
    }
  }
  context.restore()
}

function renderFrame(context: CanvasRenderingContext2D, area: PlotArea): void {
  context.save()
  context.strokeStyle = "#dbeaf2"
  context.lineWidth = 1.5
  context.strokeRect(area.left, area.top, area.right - area.left, area.bottom - area.top)
  context.restore()
}

function buildScale(
  samples: readonly NuclearAndParticlePhysicsSample[],
  area: PlotArea,
): ViewScale {
  const safeSamples =
    samples.length > 0
      ? samples
      : [{ position: 0, primaryValue: 0 } as NuclearAndParticlePhysicsSample]
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
  samples: readonly NuclearAndParticlePhysicsSample[],
  scale: ViewScale,
  selector: (sample: NuclearAndParticlePhysicsSample) => number,
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
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  scale: ViewScale,
  area: PlotArea,
): void {
  context.save()
  context.strokeStyle = "rgba(255, 255, 255, 0.45)"
  context.lineWidth = 1.5
  context.setLineDash([6, 6])

  if (scenario.id === "binding-energy-curve") {
    const point = mapPoint(scale, scenario.massNumber ?? 56, snapshot.totalBindingEnergyMeV ?? 0)
    context.beginPath()
    context.moveTo(point.x, area.top)
    context.lineTo(point.x, area.bottom)
    context.stroke()
  } else if (scenario.id === "proton-proton-collision") {
    const point = mapPoint(
      scale,
      scenario.scatteringAngleDegrees ?? 28,
      snapshot.invariantMassGeV ?? 0,
    )
    context.beginPath()
    context.moveTo(point.x, area.top)
    context.lineTo(point.x, area.bottom)
    context.stroke()
  } else {
    const point = mapPoint(
      scale,
      snapshot.elapsedHours ?? 0,
      snapshot.remainingPopulationTrillions ?? 0,
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

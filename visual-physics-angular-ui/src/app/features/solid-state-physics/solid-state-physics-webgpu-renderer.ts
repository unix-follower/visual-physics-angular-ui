import {
  SolidStatePhysicsOverlayOptions,
  SolidStatePhysicsSample,
  SolidStatePhysicsScenario,
  SolidStatePhysicsStateSnapshot,
} from "./solid-state-physics.models"

interface RenderModel {
  scenario: SolidStatePhysicsScenario
  snapshot: SolidStatePhysicsStateSnapshot
  overlays: SolidStatePhysicsOverlayOptions
  samples: readonly SolidStatePhysicsSample[]
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

export interface SolidStatePhysicsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class SolidStatePhysicsWebGpuRenderer {
  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  static async create(canvas: HTMLCanvasElement): Promise<SolidStatePhysicsWebGpuRenderer | null> {
    const context = canvas.getContext("2d")
    if (!context) {
      return null
    }

    return new SolidStatePhysicsWebGpuRenderer(canvas, context)
  }

  render(model: RenderModel): void {
    const { scenario, snapshot, overlays, samples } = model
    this.canvas.width = 640
    this.canvas.height = 360

    const { context } = this
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    context.fillStyle = "#07131d"
    context.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const geometry = buildSolidStatePhysicsViewportGeometry(snapshot, scenario, overlays, samples)
    renderLineVertices(
      context,
      geometry.lineVertices,
      this.canvas.width,
      this.canvas.height,
      scenario.id,
    )
    renderMarkerVertices(
      context,
      geometry.markerVertices,
      this.canvas.width,
      this.canvas.height,
      scenario.id,
    )

    context.fillStyle = "#dbeaf2"
    context.font = "600 18px Georgia"
    context.fillText(scenario.name, 28, 34)
    context.font = "12px Georgia"
    context.fillText(scenario.equationSummary, 28, 54)
  }

  destroy(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}

export function buildSolidStatePhysicsViewportGeometry(
  snapshot: SolidStatePhysicsStateSnapshot,
  scenario: SolidStatePhysicsScenario,
  overlays: SolidStatePhysicsOverlayOptions,
  samples: readonly SolidStatePhysicsSample[],
): SolidStatePhysicsViewportGeometry {
  if (scenario.id === "phonon-dispersion") {
    return buildPhononViewportGeometry(snapshot, overlays, samples)
  }

  if (scenario.id === "electronic-structure") {
    return buildElectronicViewportGeometry(snapshot, scenario, overlays, samples)
  }

  return buildCrystalViewportGeometry(snapshot, scenario, overlays, samples)
}

function buildCrystalViewportGeometry(
  snapshot: SolidStatePhysicsStateSnapshot,
  scenario: SolidStatePhysicsScenario,
  overlays: SolidStatePhysicsOverlayOptions,
  samples: readonly SolidStatePhysicsSample[],
): SolidStatePhysicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const area: PlotArea = { left: 0.16, right: 0.9, top: 0.24, bottom: 0.84 }
  const scale = buildScale(samples, area)

  pushFrame(lineVertices, area)
  pushPolyline(lineVertices, samples, scale, (sample) => sample.primaryValue)
  pushMaterialBlock(lineVertices, 0.07, 0.42, 0.08, 0.72)

  if (overlays.showComparisonBand) {
    pushPolyline(
      lineVertices,
      samples,
      scale,
      (sample) => sample.secondaryValue ?? sample.primaryValue,
    )
  }

  if (overlays.showReferenceGuides) {
    const yieldValue = scenario.yieldStrengthMegapascals ?? 185
    pushHorizontalGuide(lineVertices, scale, yieldValue)
    pushArrow(lineVertices, 0.11, 0.72, 0.11, 0.48)
  }

  if (overlays.showActiveMarker) {
    const activeSample =
      samples.find((sample) => sample.active) ?? samples[Math.floor(samples.length / 2)] ?? null
    if (activeSample) {
      const point = mapPoint(scale, activeSample.position, activeSample.primaryValue)
      pushCrosshair(lineVertices, point.x, point.y, 0.03, 0.04)
      markerVertices.push(point.x, point.y)
    }
  }

  const strainArrowX =
    0.12 +
    Math.min((snapshot.strainPercent ?? 0) / Math.max(scenario.maxStrainPercent ?? 1.6, 0.001), 1) *
      0.1
  pushArrow(lineVertices, 0.07, 0.8, strainArrowX, 0.8)

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildPhononViewportGeometry(
  snapshot: SolidStatePhysicsStateSnapshot,
  overlays: SolidStatePhysicsOverlayOptions,
  samples: readonly SolidStatePhysicsSample[],
): SolidStatePhysicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const area: PlotArea = { left: 0.12, right: 0.9, top: 0.18, bottom: 0.82 }
  const scale = buildScale(samples, area)

  pushFrame(lineVertices, area)
  pushZonePath(lineVertices, area, 0.1, 5)
  pushPolyline(lineVertices, samples, scale, (sample) => sample.primaryValue)

  if (overlays.showComparisonBand) {
    pushPolyline(
      lineVertices,
      samples,
      scale,
      (sample) => sample.secondaryValue ?? sample.primaryValue,
    )
  }

  if (overlays.showReferenceGuides) {
    pushVerticalGuide(lineVertices, scale, 0)
    pushVerticalGuide(lineVertices, scale, 1)
    pushLatticeGuides(lineVertices, area)
  }

  if (overlays.showActiveMarker) {
    const activeSample =
      samples.find((sample) => sample.active) ?? samples[Math.floor(samples.length / 2)] ?? null
    if (activeSample) {
      const point = mapPoint(scale, activeSample.position, activeSample.primaryValue)
      pushCrosshair(lineVertices, point.x, point.y, 0.025, 0.035)
      markerVertices.push(point.x, point.y)
    }
  }

  const waveVector = Math.min(Math.max(snapshot.waveVectorFraction ?? 0, 0), 1)
  pushWavePacket(lineVertices, area, waveVector)

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildElectronicViewportGeometry(
  snapshot: SolidStatePhysicsStateSnapshot,
  scenario: SolidStatePhysicsScenario,
  overlays: SolidStatePhysicsOverlayOptions,
  samples: readonly SolidStatePhysicsSample[],
): SolidStatePhysicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const area: PlotArea = { left: 0.14, right: 0.9, top: 0.18, bottom: 0.84 }
  const scale = buildScale(samples, area)
  const bandGap = scenario.bandGapElectronVolts ?? 1.1
  const conductionEdge = bandGap / 2

  pushFrame(lineVertices, area)
  pushBandDiagram(lineVertices, area, scale, conductionEdge, -conductionEdge)
  pushPolyline(lineVertices, samples, scale, (sample) => sample.primaryValue)

  if (overlays.showComparisonBand) {
    pushPolyline(lineVertices, samples, scale, (sample) => sample.secondaryValue ?? 0)
  }

  if (overlays.showReferenceGuides) {
    pushVerticalGuide(lineVertices, scale, conductionEdge)
    pushVerticalGuide(lineVertices, scale, -(bandGap / 2))
  }

  if (overlays.showActiveMarker) {
    const activeSample =
      samples.find((sample) => sample.active) ?? samples[Math.floor(samples.length / 2)] ?? null
    if (activeSample) {
      const point = mapPoint(scale, activeSample.position, activeSample.primaryValue)
      pushCrosshair(lineVertices, point.x, point.y, 0.024, 0.034)
      markerVertices.push(point.x, point.y)
    }
  }

  const inspectedEnergy = snapshot.energyElectronVolts ?? 0
  pushChargeCloud(lineVertices, area, scale, inspectedEnergy)

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildScale(samples: readonly SolidStatePhysicsSample[], area: PlotArea): ViewScale {
  const safeSamples =
    samples.length > 0 ? samples : [{ position: 0, primaryValue: 0 } as SolidStatePhysicsSample]
  const xValues = safeSamples.map((sample) => sample.position)
  const yValues = safeSamples
    .flatMap((sample) => [sample.primaryValue, sample.secondaryValue])
    .filter((value): value is number => value !== undefined)

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

function pushFrame(vertices: number[], area: PlotArea): void {
  pushLine(vertices, area.left, area.top, area.right, area.top)
  pushLine(vertices, area.right, area.top, area.right, area.bottom)
  pushLine(vertices, area.right, area.bottom, area.left, area.bottom)
  pushLine(vertices, area.left, area.bottom, area.left, area.top)
  pushLine(vertices, area.left, area.bottom, area.left, area.top - 0.05)
  pushLine(vertices, area.left, area.bottom, area.right + 0.04, area.bottom)
}

function pushPolyline(
  vertices: number[],
  samples: readonly SolidStatePhysicsSample[],
  scale: ViewScale,
  selector: (sample: SolidStatePhysicsSample) => number,
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = mapPoint(scale, samples[index - 1].position, selector(samples[index - 1]))
    const current = mapPoint(scale, samples[index].position, selector(samples[index]))
    pushLine(vertices, previous.x, previous.y, current.x, current.y)
  }
}

function pushHorizontalGuide(vertices: number[], scale: ViewScale, yValue: number): void {
  const start = mapPoint(scale, scale.minX, yValue)
  const end = mapPoint(scale, scale.maxX, yValue)
  pushLine(vertices, start.x, start.y, end.x, end.y)
}

function pushVerticalGuide(vertices: number[], scale: ViewScale, xValue: number): void {
  const start = mapPoint(scale, xValue, scale.minY)
  const end = mapPoint(scale, xValue, scale.maxY)
  pushLine(vertices, start.x, start.y, end.x, end.y)
}

function pushCrosshair(
  vertices: number[],
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
): void {
  pushLine(vertices, x - halfWidth, y, x + halfWidth, y)
  pushLine(vertices, x, y - halfHeight, x, y + halfHeight)
}

function pushArrow(
  vertices: number[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  pushLine(vertices, startX, startY, endX, endY)
  const dx = endX - startX
  const dy = endY - startY
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  pushLine(vertices, endX, endY, endX - ux * 0.025 - uy * 0.012, endY - uy * 0.025 + ux * 0.012)
  pushLine(vertices, endX, endY, endX - ux * 0.025 + uy * 0.012, endY - uy * 0.025 - ux * 0.012)
}

function pushMaterialBlock(
  vertices: number[],
  left: number,
  right: number,
  top: number,
  bottom: number,
): void {
  pushLine(vertices, left, top, right, top)
  pushLine(vertices, right, top, right, bottom)
  pushLine(vertices, right, bottom, left, bottom)
  pushLine(vertices, left, bottom, left, top)
  for (let index = 0; index < 5; index += 1) {
    const y = top + ((bottom - top) * index) / 4
    pushLine(vertices, left, y, right, Math.min(y + 0.06, bottom))
  }
}

function pushZonePath(vertices: number[], area: PlotArea, inset: number, tickCount: number): void {
  const y = area.bottom + 0.08
  pushLine(vertices, area.left, y, area.right, y)
  for (let index = 0; index < tickCount; index += 1) {
    const x = area.left + ((area.right - area.left) * index) / Math.max(tickCount - 1, 1)
    pushLine(vertices, x, y - inset * 0.3, x, y + inset * 0.3)
  }
}

function pushLatticeGuides(vertices: number[], area: PlotArea): void {
  const centerY = area.bottom + 0.12
  for (let index = 0; index < 6; index += 1) {
    const x = area.left + 0.06 + index * 0.1
    pushLine(vertices, x - 0.02, centerY, x + 0.02, centerY)
    pushLine(vertices, x, centerY - 0.03, x, centerY + 0.03)
  }
}

function pushWavePacket(vertices: number[], area: PlotArea, waveVector: number): void {
  const packetCenterX = area.left + (area.right - area.left) * waveVector
  const packetCenterY = area.top - 0.08
  let previousX = packetCenterX - 0.1
  let previousY = packetCenterY
  for (let index = 1; index <= 8; index += 1) {
    const x = packetCenterX - 0.1 + index * 0.025
    const y = packetCenterY + Math.sin(index * 0.8) * 0.03
    pushLine(vertices, previousX, previousY, x, y)
    previousX = x
    previousY = y
  }
}

function pushBandDiagram(
  vertices: number[],
  area: PlotArea,
  scale: ViewScale,
  conductionEdge: number,
  valenceEdge: number,
): void {
  const conduction = mapPoint(scale, conductionEdge, scale.minY + (scale.maxY - scale.minY) * 0.18)
  const valence = mapPoint(scale, valenceEdge, scale.minY + (scale.maxY - scale.minY) * 0.18)
  pushLine(vertices, area.left - 0.07, conduction.y, area.left - 0.02, conduction.y)
  pushLine(vertices, area.left - 0.07, valence.y, area.left - 0.02, valence.y)
  pushLine(vertices, area.left - 0.045, conduction.y, area.left - 0.045, valence.y)
}

function pushChargeCloud(
  vertices: number[],
  area: PlotArea,
  scale: ViewScale,
  energy: number,
): void {
  const center = mapPoint(scale, energy, scale.minY + (scale.maxY - scale.minY) * 0.65)
  for (let index = 0; index < 5; index += 1) {
    const offsetX = (index - 2) * 0.02
    const offsetY = Math.abs(index - 2) * 0.01
    pushLine(
      vertices,
      center.x + offsetX - 0.012,
      center.y - offsetY,
      center.x + offsetX + 0.012,
      center.y + offsetY,
    )
    pushLine(
      vertices,
      center.x + offsetX - 0.012,
      center.y + offsetY,
      center.x + offsetX + 0.012,
      center.y - offsetY,
    )
  }
}

function pushLine(vertices: number[], x1: number, y1: number, x2: number, y2: number): void {
  vertices.push(x1, y1, x2, y2)
}

function renderLineVertices(
  context: CanvasRenderingContext2D,
  vertices: Float32Array,
  width: number,
  height: number,
  scenarioId: SolidStatePhysicsScenario["id"],
): void {
  context.strokeStyle =
    scenarioId === "electronic-structure"
      ? "#9ad0f5"
      : scenarioId === "phonon-dispersion"
        ? "#f4b942"
        : "#8be28b"
  context.lineWidth = scenarioId === "crystal-elasticity" ? 2.4 : 2.1
  for (let index = 0; index < vertices.length; index += 4) {
    context.beginPath()
    context.moveTo(vertices[index] * width, vertices[index + 1] * height)
    context.lineTo(vertices[index + 2] * width, vertices[index + 3] * height)
    context.stroke()
  }
}

function renderMarkerVertices(
  context: CanvasRenderingContext2D,
  vertices: Float32Array,
  width: number,
  height: number,
  scenarioId: SolidStatePhysicsScenario["id"],
): void {
  context.fillStyle = scenarioId === "electronic-structure" ? "#ff8fab" : "#ff6b6b"
  for (let index = 0; index < vertices.length; index += 2) {
    context.beginPath()
    context.arc(vertices[index] * width, vertices[index + 1] * height, 5, 0, Math.PI * 2)
    context.fill()
  }
}

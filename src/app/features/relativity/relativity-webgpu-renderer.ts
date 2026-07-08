import { RelativitySample, RelativityScenario, RelativityStateSnapshot } from "./relativity.models"
import { RelativityOverlayOptions } from "./relativity-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 1024
const VERTEX_USAGE = 32
const UNIFORM_USAGE = 64
const COPY_DST_USAGE = 8

type GpuAdapterLike = {
  requestDevice: () => Promise<GpuDeviceLike>
}

type NavigatorWithGpu = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<GpuAdapterLike | null>
    getPreferredCanvasFormat?: () => string
  }
}

type GpuBufferLike = {
  destroy?: () => void
}

type GpuQueueLike = {
  writeBuffer: (buffer: GpuBufferLike, offset: number, data: Float32Array) => void
  submit: (commands: unknown[]) => void
}

type GpuRenderPipelineLike = {
  getBindGroupLayout: (index: number) => unknown
}

type GpuRenderPassEncoderLike = {
  setPipeline: (pipeline: GpuRenderPipelineLike) => void
  setBindGroup: (index: number, bindGroup: unknown) => void
  setVertexBuffer: (slot: number, buffer: GpuBufferLike) => void
  draw: (vertexCount: number) => void
  end: () => void
}

type GpuCommandEncoderLike = {
  beginRenderPass: (descriptor: unknown) => GpuRenderPassEncoderLike
  finish: () => unknown
}

type GpuDeviceLike = {
  createShaderModule: (descriptor: { code: string }) => unknown
  createRenderPipeline: (descriptor: unknown) => GpuRenderPipelineLike
  createBuffer: (descriptor: { size: number; usage: number }) => GpuBufferLike
  createBindGroup: (descriptor: unknown) => unknown
  createCommandEncoder: () => GpuCommandEncoderLike
  queue: GpuQueueLike
  destroy?: () => void
}

type GpuCanvasContextLike = {
  configure: (descriptor: { device: GpuDeviceLike; format: string; alphaMode: string }) => void
  getCurrentTexture: () => { createView: () => unknown }
}

interface RendererResources {
  device: GpuDeviceLike
  context: GpuCanvasContextLike
  colorBuffer: GpuBufferLike
  lineBuffer: GpuBufferLike
  pipeline: GpuRenderPipelineLike
  bindGroup: unknown
}

export interface RelativityViewportGeometry {
  lineVertices: Float32Array
}

interface PlotArea {
  left: number
  right: number
  top: number
  bottom: number
}

interface ValueScale {
  minX: number
  maxX: number
  minY: number
  maxY: number
  area: PlotArea
}

export class RelativityWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<RelativityWebGpuRenderer | null> {
    if (typeof navigator === "undefined") {
      return null
    }

    const browserNavigator = navigator as NavigatorWithGpu
    if (browserNavigator.gpu === undefined) {
      return null
    }

    const adapter = await browserNavigator.gpu.requestAdapter()
    if (!adapter) {
      return null
    }

    const device = await adapter.requestDevice()
    const context = canvas.getContext("webgpu") as GpuCanvasContextLike | null
    if (!context) {
      device.destroy?.()
      return null
    }

    const format = browserNavigator.gpu.getPreferredCanvasFormat?.() ?? "bgra8unorm"
    context.configure({ device, format, alphaMode: "premultiplied" })

    const shaderModule = device.createShaderModule({
      code: `
				struct Uniforms { color: vec4f, };
				@group(0) @binding(0) var<uniform> uniforms: Uniforms;
				struct VertexOut {
					@builtin(position) position: vec4f,
					@location(0) color: vec4f,
				};
				@vertex
				fn vertexMain(@location(0) position: vec2f) -> VertexOut {
					var output: VertexOut;
					output.position = vec4f(position, 0.0, 1.0);
					output.color = uniforms.color;
					return output;
				}
				@fragment
				fn fragmentMain(input: VertexOut) -> @location(0) vec4f {
					return input.color;
				}
			`,
    })

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: VERTEX_SIZE,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "line-list" },
    })

    const colorBuffer = device.createBuffer({
      size: UNIFORM_COLOR_SIZE,
      usage: UNIFORM_USAGE | COPY_DST_USAGE,
    })
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: colorBuffer } }],
    })

    return new RelativityWebGpuRenderer(canvas, {
      device,
      context,
      colorBuffer,
      lineBuffer: device.createBuffer({
        size: LINE_VERTEX_CAPACITY * VERTEX_SIZE,
        usage: VERTEX_USAGE | COPY_DST_USAGE,
      }),
      pipeline,
      bindGroup,
    })
  }

  render(
    snapshot: RelativityStateSnapshot,
    scenario: RelativityScenario,
    overlays: RelativityOverlayOptions,
    samples: readonly RelativitySample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices } = buildRelativityViewportGeometry(snapshot, scenario, overlays, samples)
    const { device, context } = this.resources
    device.queue.writeBuffer(this.resources.lineBuffer, 0, lineVertices)

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.03, g: 0.06, b: 0.12, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    })

    draw(pass, this.resources, lineVertices.length / 2, [0.45, 0.9, 0.98, 1])
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.lineBuffer.destroy?.()
    this.resources.colorBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

export function buildRelativityViewportGeometry(
  snapshot: RelativityStateSnapshot,
  scenario: RelativityScenario,
  overlays: RelativityOverlayOptions,
  samples: readonly RelativitySample[],
): RelativityViewportGeometry {
  if (scenario.id === "relativistic-doppler") {
    return buildRelativisticDopplerViewportGeometry(snapshot, overlays, samples)
  }

  if (scenario.id === "gravitational-time-dilation") {
    return buildGravitationalViewportGeometry(snapshot, overlays, samples)
  }

  return buildTimeDilationViewportGeometry(snapshot, overlays, samples)
}

function buildTimeDilationViewportGeometry(
  snapshot: RelativityStateSnapshot,
  overlays: RelativityOverlayOptions,
  samples: readonly RelativitySample[],
): RelativityViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.9, bottom: 0.1 }
  const scale = buildScale(samples, snapshot.properTimeSeconds ?? snapshot.timeSeconds, plotArea)

  appendPlotFrame(vertices, plotArea)
  appendTimeline(
    vertices,
    -0.58,
    -0.78,
    -0.22,
    snapshot.properTimeSeconds ?? snapshot.timeSeconds,
    snapshot.properTimeSeconds ?? snapshot.timeSeconds,
    overlays.showReferenceGuides,
  )
  appendTimeline(
    vertices,
    0.28,
    -0.78,
    -0.22,
    snapshot.properTimeSeconds ?? snapshot.timeSeconds,
    snapshot.dilatedTimeSeconds ?? snapshot.timeSeconds,
    overlays.showReferenceGuides,
  )
  appendLineNdc(vertices, -0.58, -0.78, 0.28, -0.78)
  appendLineNdc(vertices, -0.58, -0.22, 0.28, -0.22)

  appendPolyline(
    vertices,
    samples.map((sample) => ({ x: sample.position, y: sample.primaryValue })),
    scale,
  )

  if (
    overlays.showComparisonCurve &&
    samples.some((sample) => sample.secondaryValue !== undefined)
  ) {
    appendPolyline(
      vertices,
      samples.map((sample) => ({
        x: sample.position,
        y: sample.secondaryValue ?? sample.primaryValue,
      })),
      scale,
    )
  }

  if (overlays.showReferenceGuides) {
    appendLine(
      vertices,
      scale.minX,
      snapshot.properTimeSeconds ?? snapshot.timeSeconds,
      scale.maxX,
      snapshot.properTimeSeconds ?? snapshot.timeSeconds,
      scale,
    )
  }

  if (overlays.showActiveMarker) {
    const active = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (active) {
      appendCross(vertices, active.position, active.primaryValue, scale, 0.014)
      appendCrossNdc(vertices, 0.28, -0.22, 0.025)
    }
  }

  return {
    lineVertices: new Float32Array(vertices.slice(0, LINE_VERTEX_CAPACITY * 2)),
  }
}

function buildRelativisticDopplerViewportGeometry(
  snapshot: RelativityStateSnapshot,
  overlays: RelativityOverlayOptions,
  samples: readonly RelativitySample[],
): RelativityViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.85, bottom: 0.15 }
  const scale = buildScale(samples, snapshot.emittedFrequencyHertz ?? 0, plotArea)
  const sourceX = clampNdc(-0.65 + (snapshot.sourceVelocityFractionOfLight ?? 0) * 0.45)
  const observerX = clampNdc(0.65 + (snapshot.observerVelocityFractionOfLight ?? 0) * 0.25)
  const baselineY = -0.58

  appendPlotFrame(vertices, plotArea)
  appendLineNdc(vertices, -0.82, baselineY, 0.82, baselineY)
  appendLineNdc(vertices, sourceX, baselineY - 0.16, sourceX, baselineY + 0.16)
  appendLineNdc(vertices, observerX, baselineY - 0.16, observerX, baselineY + 0.16)
  appendLineNdc(vertices, sourceX, baselineY + 0.16, observerX, baselineY + 0.16)
  appendLineNdc(vertices, sourceX, baselineY + 0.08, observerX, baselineY - 0.08)

  for (let index = 1; index <= 3; index += 1) {
    const offset = index * 0.12
    appendLineNdc(
      vertices,
      sourceX + offset * 0.2,
      baselineY + 0.02,
      sourceX + offset,
      baselineY + 0.18,
    )
    appendLineNdc(
      vertices,
      sourceX + offset * 0.2,
      baselineY - 0.02,
      sourceX + offset,
      baselineY - 0.18,
    )
  }

  appendPolyline(
    vertices,
    samples.map((sample) => ({ x: sample.position, y: sample.primaryValue })),
    scale,
  )

  if (
    overlays.showComparisonCurve &&
    samples.some((sample) => sample.secondaryValue !== undefined)
  ) {
    appendPolyline(
      vertices,
      samples.map((sample) => ({
        x: sample.position,
        y: sample.secondaryValue ?? sample.primaryValue,
      })),
      scale,
    )
  }

  if (overlays.showReferenceGuides) {
    appendLine(
      vertices,
      scale.minX,
      snapshot.emittedFrequencyHertz ?? 0,
      scale.maxX,
      snapshot.emittedFrequencyHertz ?? 0,
      scale,
    )
    appendLine(
      vertices,
      snapshot.relativeVelocityFractionOfLight ?? 0,
      scale.minY,
      snapshot.relativeVelocityFractionOfLight ?? 0,
      scale.maxY,
      scale,
    )
  }

  if (overlays.showActiveMarker) {
    const active = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (active) {
      appendCross(vertices, active.position, active.primaryValue, scale, 0.02)
      appendCrossNdc(vertices, observerX, baselineY, 0.025)
    }
  }

  return {
    lineVertices: new Float32Array(vertices.slice(0, LINE_VERTEX_CAPACITY * 2)),
  }
}

function buildGravitationalViewportGeometry(
  snapshot: RelativityStateSnapshot,
  overlays: RelativityOverlayOptions,
  samples: readonly RelativitySample[],
): RelativityViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.85, bottom: 0.15 }
  const scale = buildScale(samples, 1, plotArea)
  const massCenterX = -0.55
  const massCenterY = -0.45
  const radiusScale = Math.min((snapshot.orbitalRadiusSchwarzschildRadii ?? 6) / 12, 1)
  const orbitRadius = 0.18 + radiusScale * 0.42

  appendPlotFrame(vertices, plotArea)
  appendDiamond(vertices, massCenterX, massCenterY, 0.14)
  appendLineNdc(vertices, massCenterX, massCenterY, massCenterX + orbitRadius, massCenterY)
  appendOrbitGuide(vertices, massCenterX, massCenterY, orbitRadius)
  appendLineNdc(vertices, massCenterX, massCenterY + 0.16, massCenterX, massCenterY - 0.16)

  appendPolyline(
    vertices,
    samples.map((sample) => ({ x: sample.position, y: sample.primaryValue })),
    scale,
  )

  if (
    overlays.showComparisonCurve &&
    samples.some((sample) => sample.secondaryValue !== undefined)
  ) {
    appendPolyline(
      vertices,
      samples.map((sample) => ({
        x: sample.position,
        y: sample.secondaryValue ?? sample.primaryValue,
      })),
      scale,
    )
  }

  if (overlays.showReferenceGuides) {
    appendLine(vertices, scale.minX, 1, scale.maxX, 1, scale)
    appendLine(
      vertices,
      snapshot.orbitalRadiusSchwarzschildRadii ?? 0,
      scale.minY,
      snapshot.orbitalRadiusSchwarzschildRadii ?? 0,
      scale.maxY,
      scale,
    )
  }

  if (overlays.showActiveMarker) {
    const active = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (active) {
      appendCross(vertices, active.position, active.primaryValue, scale, 0.02)
      appendCrossNdc(vertices, massCenterX + orbitRadius, massCenterY, 0.025)
    }
  }

  return {
    lineVertices: new Float32Array(vertices.slice(0, LINE_VERTEX_CAPACITY * 2)),
  }
}

function buildScale(
  samples: readonly RelativitySample[],
  fallbackY: number,
  area: PlotArea,
): ValueScale {
  const xs = samples.map((sample) => sample.position)
  const ys = samples.flatMap((sample) =>
    sample.secondaryValue === undefined
      ? [sample.primaryValue]
      : [sample.primaryValue, sample.secondaryValue],
  )
  const allY = [...ys, fallbackY]
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...allY),
    maxY: Math.max(...allY),
    area,
  }
}

function appendPolyline(
  vertices: number[],
  points: readonly { x: number; y: number }[],
  scale: ValueScale,
): void {
  for (let index = 1; index < points.length; index += 1) {
    appendLine(
      vertices,
      points[index - 1].x,
      points[index - 1].y,
      points[index].x,
      points[index].y,
      scale,
    )
  }
}

function appendLine(
  vertices: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scale: ValueScale,
): void {
  vertices.push(toNdcX(x1, scale), toNdcY(y1, scale), toNdcX(x2, scale), toNdcY(y2, scale))
}

function appendLineNdc(vertices: number[], x1: number, y1: number, x2: number, y2: number): void {
  vertices.push(x1, y1, x2, y2)
}

function appendCross(
  vertices: number[],
  x: number,
  y: number,
  scale: ValueScale,
  size: number,
): void {
  const ndcX = toNdcX(x, scale)
  const ndcY = toNdcY(y, scale)
  vertices.push(ndcX - size, ndcY, ndcX + size, ndcY, ndcX, ndcY - size, ndcX, ndcY + size)
}

function appendCrossNdc(vertices: number[], x: number, y: number, size: number): void {
  vertices.push(x - size, y, x + size, y, x, y - size, x, y + size)
}

function appendPlotFrame(vertices: number[], area: PlotArea): void {
  appendLineNdc(vertices, area.left, area.bottom, area.right, area.bottom)
  appendLineNdc(vertices, area.left, area.bottom, area.left, area.top)
  appendLineNdc(vertices, area.left, area.top, area.right, area.top)
  appendLineNdc(vertices, area.right, area.bottom, area.right, area.top)
}

function appendTimeline(
  vertices: number[],
  x: number,
  bottom: number,
  top: number,
  baseTime: number,
  resolvedTime: number,
  showGuides: boolean,
): void {
  appendLineNdc(vertices, x, bottom, x, top)
  const tickCount = 4
  for (let index = 0; index <= tickCount; index += 1) {
    const y = bottom + ((top - bottom) * index) / tickCount
    appendLineNdc(vertices, x - 0.03, y, x + 0.03, y)
  }
  const eventY = bottom + (top - bottom) * Math.min(resolvedTime / Math.max(baseTime, 1e-6), 1)
  appendLineNdc(vertices, x - 0.05, eventY, x + 0.05, eventY)
  if (showGuides) {
    appendLineNdc(vertices, x, eventY, x + 0.86, eventY)
  }
}

function appendDiamond(vertices: number[], cx: number, cy: number, radius: number): void {
  appendLineNdc(vertices, cx, cy + radius, cx + radius, cy)
  appendLineNdc(vertices, cx + radius, cy, cx, cy - radius)
  appendLineNdc(vertices, cx, cy - radius, cx - radius, cy)
  appendLineNdc(vertices, cx - radius, cy, cx, cy + radius)
}

function appendOrbitGuide(vertices: number[], cx: number, cy: number, radius: number): void {
  appendLineNdc(vertices, cx - radius, cy, cx, cy + radius * 0.65)
  appendLineNdc(vertices, cx, cy + radius * 0.65, cx + radius, cy)
  appendLineNdc(vertices, cx + radius, cy, cx, cy - radius * 0.65)
  appendLineNdc(vertices, cx, cy - radius * 0.65, cx - radius, cy)
}

function clampNdc(value: number): number {
  return Math.min(Math.max(value, -0.82), 0.82)
}

function toNdcX(value: number, scale: ValueScale): number {
  return (
    scale.area.left +
    ((value - scale.minX) / Math.max(scale.maxX - scale.minX, 1e-6)) *
      (scale.area.right - scale.area.left)
  )
}

function toNdcY(value: number, scale: ValueScale): number {
  return (
    scale.area.bottom +
    ((value - scale.minY) / Math.max(scale.maxY - scale.minY, 1e-6)) *
      (scale.area.top - scale.area.bottom)
  )
}

function draw(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  vertexCount: number,
  color: [number, number, number, number],
): void {
  resources.device.queue.writeBuffer(resources.colorBuffer, 0, new Float32Array(color))
  pass.setPipeline(resources.pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, resources.lineBuffer)
  pass.draw(vertexCount)
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const ratio = globalThis.devicePixelRatio || 1
  const width = Math.max(Math.floor(canvas.clientWidth * ratio), 1)
  const height = Math.max(Math.floor(canvas.clientHeight * ratio), 1)
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

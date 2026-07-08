import {
  ElectromagnetismSample,
  ElectromagnetismScenario,
  ElectromagnetismStateSnapshot,
  Vector2,
} from "./electromagnetism.models"
import { ElectromagnetismOverlayOptions } from "./electromagnetism-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 512
const TRIANGLE_VERTEX_CAPACITY = 96
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
  markerBuffer: GpuBufferLike
  linePipeline: GpuRenderPipelineLike
  trianglePipeline: GpuRenderPipelineLike
  bindGroup: unknown
}

export interface ElectromagnetismViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class ElectromagnetismWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<ElectromagnetismWebGpuRenderer | null> {
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

    const pipelineDescriptor = {
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
    }

    const linePipeline = device.createRenderPipeline({
      ...pipelineDescriptor,
      primitive: { topology: "line-list" },
    })
    const trianglePipeline = device.createRenderPipeline({
      ...pipelineDescriptor,
      primitive: { topology: "triangle-list" },
    })

    const colorBuffer = device.createBuffer({
      size: UNIFORM_COLOR_SIZE,
      usage: UNIFORM_USAGE | COPY_DST_USAGE,
    })
    const bindGroup = device.createBindGroup({
      layout: linePipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: colorBuffer } }],
    })

    const vertexUsage = VERTEX_USAGE | COPY_DST_USAGE
    return new ElectromagnetismWebGpuRenderer(canvas, {
      device,
      context,
      colorBuffer,
      lineBuffer: device.createBuffer({
        size: LINE_VERTEX_CAPACITY * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      markerBuffer: device.createBuffer({
        size: TRIANGLE_VERTEX_CAPACITY * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      linePipeline,
      trianglePipeline,
      bindGroup,
    })
  }

  render(
    snapshot: ElectromagnetismStateSnapshot,
    scenario: ElectromagnetismScenario,
    overlays: ElectromagnetismOverlayOptions,
    samples: readonly ElectromagnetismSample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildElectromagnetismViewportGeometry(
      snapshot,
      scenario,
      overlays,
      samples,
    )
    const { device, context } = this.resources
    device.queue.writeBuffer(this.resources.lineBuffer, 0, lineVertices)
    device.queue.writeBuffer(this.resources.markerBuffer, 0, markerVertices)

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.05, b: 0.1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    })

    draw(
      pass,
      this.resources,
      this.resources.linePipeline,
      this.resources.lineBuffer,
      lineVertices.length / 2,
      [0.59, 0.82, 0.98, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.99, 0.87, 0.41, 1],
    )

    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.colorBuffer.destroy?.()
    this.resources.lineBuffer.destroy?.()
    this.resources.markerBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

export function buildElectromagnetismViewportGeometry(
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
  samples: readonly ElectromagnetismSample[],
): ElectromagnetismViewportGeometry {
  return {
    lineVertices: buildLineVertices(snapshot, scenario, overlays, samples),
    markerVertices: buildMarkerVertices(snapshot, scenario),
  }
}

function draw(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  pipeline: GpuRenderPipelineLike,
  buffer: GpuBufferLike,
  vertexCount: number,
  color: [number, number, number, number],
): void {
  if (vertexCount === 0) {
    return
  }

  resources.device.queue.writeBuffer(resources.colorBuffer, 0, new Float32Array(color))
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, buffer)
  pass.draw(vertexCount)
}

function buildLineVertices(
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
  samples: readonly ElectromagnetismSample[],
): Float32Array {
  const vertices: number[] = []

  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (scenario.id === "point-charge-electrostatics") {
    appendElectrostaticsLines(vertices, snapshot, scenario, overlays)
  } else if (scenario.id === "moving-charge-magnetic-field") {
    appendMovingChargeLines(vertices, snapshot, scenario, overlays, samples)
  } else if (scenario.id === "current-loop-magnetic-field") {
    appendCurrentLoopLines(vertices, snapshot, scenario, overlays)
  } else if (scenario.id === "capacitor-potential-field") {
    appendCapacitorLines(vertices, snapshot, scenario, overlays)
  } else if (scenario.id === "electromagnetic-induction") {
    appendInductionLines(vertices, snapshot, scenario, overlays, samples)
  }

  return new Float32Array(vertices)
}

function appendElectrostaticsLines(
  vertices: number[],
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
): void {
  const sourcePoint = scenario.sourcePoint ?? { x: -2, y: 0 }
  const secondarySourcePoint = scenario.secondarySourcePoint ?? { x: 2, y: 0 }
  const probePoint = snapshot.position

  appendLine(vertices, sourcePoint.x, sourcePoint.y, probePoint.x, probePoint.y, scenario)
  appendLine(
    vertices,
    secondarySourcePoint.x,
    secondarySourcePoint.y,
    probePoint.x,
    probePoint.y,
    scenario,
  )

  if (overlays.showPotentialGuides) {
    appendRectangle(vertices, -4.8, -2.6, 9.6, 5.2, scenario)
  }

  if (overlays.showFieldVectors) {
    appendVector(vertices, probePoint, snapshot.electricField, 0.5, scenario)
  }

  if (overlays.showForceVectors) {
    appendVector(vertices, probePoint, snapshot.force, 0.35, scenario)
  }
}

function appendMovingChargeLines(
  vertices: number[],
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
  samples: readonly ElectromagnetismSample[],
): void {
  if (overlays.showPotentialGuides) {
    appendRectangle(vertices, -4.8, -4.8, 9.6, 9.6, scenario)
  }

  if (overlays.showTrajectory && samples.length > 1) {
    for (let index = 1; index < samples.length; index += 1) {
      appendLine(
        vertices,
        samples[index - 1].xPosition,
        samples[index - 1].yPosition,
        samples[index].xPosition,
        samples[index].yPosition,
        scenario,
      )
    }
  }

  if (overlays.showMagneticField) {
    appendRectangle(vertices, -2.8, -2.8, 5.6, 5.6, scenario)
  }

  if (overlays.showFieldVectors) {
    appendVector(vertices, snapshot.position, snapshot.magneticField, 0.45, scenario)
  }

  if (overlays.showForceVectors) {
    appendVector(vertices, snapshot.position, snapshot.force, 0.18, scenario)
  }
}

function appendCurrentLoopLines(
  vertices: number[],
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
): void {
  const center = { x: 0, y: 0 }
  const radius = scenario.loopRadius ?? 1.8
  appendCircle(vertices, center, radius, 32, scenario)

  if (overlays.showPotentialGuides) {
    appendLine(vertices, center.x, center.y, snapshot.position.x, snapshot.position.y, scenario)
    appendRectangle(
      vertices,
      snapshot.position.x - 0.22,
      snapshot.position.y - 0.22,
      0.44,
      0.44,
      scenario,
    )
  }

  if (overlays.showMagneticField) {
    appendCircle(vertices, center, radius * 0.82, 24, scenario)
    appendCircle(vertices, center, radius * 0.62, 20, scenario)
    appendCircle(vertices, center, radius * 0.42, 16, scenario)

    const radialOffsets = [0, Math.PI / 3, (2 * Math.PI) / 3]
    for (const angle of radialOffsets) {
      const offset = {
        x: Math.cos(angle) * radius * 0.92,
        y: Math.sin(angle) * radius * 0.92,
      }
      appendLine(
        vertices,
        center.x - offset.x,
        center.y - offset.y,
        center.x + offset.x,
        center.y + offset.y,
        scenario,
      )
    }
  }

  if (overlays.showFieldVectors) {
    appendVector(vertices, snapshot.position, snapshot.magneticField, 1.4, scenario)
  }
}

function appendCapacitorLines(
  vertices: number[],
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
): void {
  const halfGap = Math.max((scenario.plateSeparation ?? 2) / 2, 0.4)
  appendLine(vertices, -halfGap, -2.5, -halfGap, 2.5, scenario)
  appendLine(vertices, halfGap, -2.5, halfGap, 2.5, scenario)

  if (overlays.showPotentialGuides) {
    appendRectangle(vertices, -halfGap, -2.5, halfGap * 2, 5, scenario)
    appendLine(
      vertices,
      snapshot.position.x,
      snapshot.position.y,
      -halfGap,
      snapshot.position.y,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.position.x,
      snapshot.position.y,
      halfGap,
      snapshot.position.y,
      scenario,
    )
    for (const guideY of [-1.8, -0.9, 0, 0.9, 1.8]) {
      appendLine(vertices, -halfGap, guideY, halfGap, guideY, scenario)
    }
  }

  if (overlays.showFieldVectors) {
    appendVector(vertices, snapshot.position, snapshot.electricField, 0.2, scenario)
    for (const guideY of [-1.8, -0.9, 0, 0.9, 1.8]) {
      appendVector(
        vertices,
        { x: -halfGap + 0.2, y: guideY },
        snapshot.electricField,
        0.12,
        scenario,
      )
    }
  }

  if (overlays.showForceVectors) {
    appendVector(vertices, snapshot.position, snapshot.force, 0.22, scenario)
  }
}

function appendInductionLines(
  vertices: number[],
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
  overlays: ElectromagnetismOverlayOptions,
  samples: readonly ElectromagnetismSample[],
): void {
  appendRectangle(vertices, -1.8, -1.8, 3.6, 3.6, scenario)
  appendRectangle(vertices, -1.1, -1.1, 2.2, 2.2, scenario)

  if (overlays.showMagneticField) {
    appendRectangle(vertices, -2.7, -2.7, 5.4, 5.4, scenario)
    appendLine(vertices, 0, -2.2, 0, 2.2, scenario)
    appendLine(vertices, -2.2, 0, 2.2, 0, scenario)
    appendLine(vertices, -1.7, -1.7, 1.7, 1.7, scenario)
    appendLine(vertices, -1.7, 1.7, 1.7, -1.7, scenario)
  }

  if (overlays.showFieldVectors) {
    appendVector(vertices, snapshot.position, snapshot.magneticField, 0.4, scenario)
  }

  if (overlays.showForceVectors) {
    appendVector(vertices, snapshot.position, snapshot.force, 0.22, scenario)
  }

  if (overlays.showPotentialGuides) {
    appendLine(vertices, -1.2, 0, 1.2, 0, scenario)
    appendLine(vertices, 0, -1.2, 0, 1.2, scenario)
    appendRectangle(vertices, -0.55, -0.55, 1.1, 1.1, scenario)
  }

  if (overlays.showTrajectory && samples.length > 1) {
    appendWaveform(vertices, samples, "potential", -4.6, -3.1, 3.2, 1.2, scenario)
  }
}

function buildMarkerVertices(
  snapshot: ElectromagnetismStateSnapshot,
  scenario: ElectromagnetismScenario,
): Float32Array {
  const vertices: number[] = []

  appendDiamond(vertices, snapshot.position, 0.18, scenario)

  if (scenario.id === "point-charge-electrostatics") {
    appendDiamond(vertices, scenario.sourcePoint ?? { x: -2, y: 0 }, 0.16, scenario)
    appendDiamond(vertices, scenario.secondarySourcePoint ?? { x: 2, y: 0 }, 0.16, scenario)
  } else if (scenario.id === "current-loop-magnetic-field") {
    appendDiamond(vertices, { x: 0, y: 0 }, 0.14, scenario)
  } else if (scenario.id === "capacitor-potential-field") {
    const halfGap = Math.max((scenario.plateSeparation ?? 2) / 2, 0.4)
    appendDiamond(vertices, { x: -halfGap, y: 0 }, 0.12, scenario)
    appendDiamond(vertices, { x: halfGap, y: 0 }, 0.12, scenario)
  } else if (scenario.id === "electromagnetic-induction") {
    appendDiamond(vertices, { x: -1.8, y: 0 }, 0.12, scenario)
    appendDiamond(vertices, { x: 1.8, y: 0 }, 0.12, scenario)
  }

  return new Float32Array(vertices)
}

function appendVector(
  vertices: number[],
  origin: Vector2,
  vector: Vector2,
  scale: number,
  scenario: ElectromagnetismScenario,
): void {
  const magnitude = Math.hypot(vector.x, vector.y)
  if (magnitude < 1e-6) {
    return
  }

  const tip = {
    x: origin.x + vector.x * scale,
    y: origin.y + vector.y * scale,
  }

  appendLine(vertices, origin.x, origin.y, tip.x, tip.y, scenario)

  const direction = { x: vector.x / magnitude, y: vector.y / magnitude }
  const headLength = Math.min(Math.max(scale * 0.28, 0.14), 0.42)
  const wingScale = 0.45
  const leftWing = {
    x: tip.x - (direction.x + direction.y * wingScale) * headLength,
    y: tip.y - (direction.y - direction.x * wingScale) * headLength,
  }
  const rightWing = {
    x: tip.x - (direction.x - direction.y * wingScale) * headLength,
    y: tip.y - (direction.y + direction.x * wingScale) * headLength,
  }
  appendLine(vertices, tip.x, tip.y, leftWing.x, leftWing.y, scenario)
  appendLine(vertices, tip.x, tip.y, rightWing.x, rightWing.y, scenario)
}

function appendRectangle(
  vertices: number[],
  x: number,
  y: number,
  width: number,
  height: number,
  scenario: ElectromagnetismScenario,
): void {
  appendLine(vertices, x, y, x + width, y, scenario)
  appendLine(vertices, x + width, y, x + width, y + height, scenario)
  appendLine(vertices, x + width, y + height, x, y + height, scenario)
  appendLine(vertices, x, y + height, x, y, scenario)
}

function appendCircle(
  vertices: number[],
  center: Vector2,
  radius: number,
  segments: number,
  scenario: ElectromagnetismScenario,
): void {
  const safeSegments = Math.max(segments, 8)
  for (let index = 0; index < safeSegments; index += 1) {
    const startAngle = (index / safeSegments) * Math.PI * 2
    const endAngle = ((index + 1) / safeSegments) * Math.PI * 2
    appendLine(
      vertices,
      center.x + Math.cos(startAngle) * radius,
      center.y + Math.sin(startAngle) * radius,
      center.x + Math.cos(endAngle) * radius,
      center.y + Math.sin(endAngle) * radius,
      scenario,
    )
  }
}

function appendWaveform(
  vertices: number[],
  samples: readonly ElectromagnetismSample[],
  metric: "fieldMagnitude" | "forceMagnitude" | "potential",
  x: number,
  y: number,
  width: number,
  height: number,
  scenario: ElectromagnetismScenario,
): void {
  if (samples.length < 2) {
    return
  }

  const values = samples.map((sample) => sample[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)

  appendRectangle(vertices, x, y, width, height, scenario)
  for (let index = 1; index < samples.length; index += 1) {
    const previousX = x + ((index - 1) / (samples.length - 1)) * width
    const nextX = x + (index / (samples.length - 1)) * width
    const previousY = y + height - ((samples[index - 1][metric] - min) / span) * height
    const nextY = y + height - ((samples[index][metric] - min) / span) * height
    appendLine(vertices, previousX, previousY, nextX, nextY, scenario)
  }
}

function appendDiamond(
  vertices: number[],
  center: Vector2,
  radius: number,
  scenario: ElectromagnetismScenario,
): void {
  appendTriangle(
    vertices,
    center.x,
    center.y + radius,
    center.x + radius,
    center.y,
    center.x,
    center.y - radius,
    scenario,
  )
  appendTriangle(
    vertices,
    center.x,
    center.y + radius,
    center.x,
    center.y - radius,
    center.x - radius,
    center.y,
    scenario,
  )
}

function appendTriangle(
  vertices: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  scenario: ElectromagnetismScenario,
): void {
  appendVertex(vertices, x1, y1, scenario)
  appendVertex(vertices, x2, y2, scenario)
  appendVertex(vertices, x3, y3, scenario)
}

function appendLine(
  vertices: number[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  scenario: ElectromagnetismScenario,
): void {
  appendVertex(vertices, x1, y1, scenario)
  appendVertex(vertices, x2, y2, scenario)
}

function appendVertex(
  vertices: number[],
  x: number,
  y: number,
  scenario: ElectromagnetismScenario,
): void {
  vertices.push(normalizeX(x, scenario), normalizeY(y, scenario))
}

function normalizeX(x: number, scenario: ElectromagnetismScenario): number {
  const { minX, maxX } = scenario.viewBounds
  return ((x - minX) / Math.max(maxX - minX, 1e-6)) * 2 - 1
}

function normalizeY(y: number, scenario: ElectromagnetismScenario): number {
  const { minY, maxY } = scenario.viewBounds
  return ((y - minY) / Math.max(maxY - minY, 1e-6)) * 2 - 1
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const width = canvas.clientWidth || 720
  const height = canvas.clientHeight || 320
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

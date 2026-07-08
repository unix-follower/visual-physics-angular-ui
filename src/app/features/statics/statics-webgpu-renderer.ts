import { StaticsScenario, StaticsStateSnapshot } from "./statics.models"
import { StaticsOverlayOptions } from "./statics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 48
const TRIANGLE_VERTEX_CAPACITY = 36
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

export interface StaticsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class StaticsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<StaticsWebGpuRenderer | null> {
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
    return new StaticsWebGpuRenderer(canvas, {
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
    snapshot: StaticsStateSnapshot,
    scenario: StaticsScenario,
    overlays: StaticsOverlayOptions,
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildStaticsViewportGeometry(
      snapshot,
      scenario,
      overlays,
    )
    const { device, context } = this.resources
    device.queue.writeBuffer(this.resources.lineBuffer, 0, lineVertices)
    device.queue.writeBuffer(this.resources.markerBuffer, 0, markerVertices)

    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.02, g: 0.06, b: 0.1, a: 1 },
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
      [0.6, 0.72, 0.84, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.96, 0.9, 0.47, 1],
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

export function buildStaticsViewportGeometry(
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
  overlays: StaticsOverlayOptions,
): StaticsViewportGeometry {
  return {
    lineVertices: buildLineVertices(snapshot, scenario, overlays),
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
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
  overlays: StaticsOverlayOptions,
): Float32Array {
  if (scenario.id === "inclined-plane") {
    return buildInclinedPlaneLineVertices(snapshot, scenario, overlays)
  }

  if (scenario.id === "pulley-equilibrium") {
    return buildPulleyLineVertices(snapshot, scenario, overlays)
  }

  const vertices: number[] = []
  const leftSupportX = scenario.anchorPoint?.x ?? 1
  const rightSupportX = scenario.secondaryPoint?.x ?? 9
  const beamY = 0

  appendLine(vertices, leftSupportX, beamY, rightSupportX, beamY, scenario)
  appendLine(vertices, leftSupportX, beamY, leftSupportX, -1.2, scenario)
  appendLine(vertices, rightSupportX, beamY, rightSupportX, -1.2, scenario)

  if (overlays.showAppliedForce) {
    appendLine(
      vertices,
      snapshot.position.x,
      beamY + 1.2,
      snapshot.position.x,
      beamY + 1.2 + snapshot.appliedForce.y * 0.08,
      scenario,
    )
  }

  if (overlays.showReactionForces) {
    appendLine(
      vertices,
      leftSupportX,
      beamY,
      leftSupportX,
      beamY + snapshot.primaryReactionForce.y * 0.08,
      scenario,
    )
    if (snapshot.secondaryReactionForce) {
      appendLine(
        vertices,
        rightSupportX,
        beamY,
        rightSupportX,
        beamY + snapshot.secondaryReactionForce.y * 0.08,
        scenario,
      )
    }
  }

  if (overlays.showResidualGuides) {
    appendLine(
      vertices,
      snapshot.position.x,
      beamY - 0.2,
      snapshot.position.x + snapshot.residualForce.x * 0.2,
      beamY - 0.2 + snapshot.residualForce.y * 0.2,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildPulleyLineVertices(
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
  overlays: StaticsOverlayOptions,
): Float32Array {
  const vertices: number[] = []
  const topY = 2
  const pulleyCenter = { x: 0, y: topY }
  const leftLoad = scenario.anchorPoint ?? { x: -2, y: -4 }
  const rightLoad = scenario.secondaryPoint ?? { x: 2, y: -4 }
  const leftTensionTip = {
    x: leftLoad.x,
    y: leftLoad.y + snapshot.primaryReactionForce.y * 0.08,
  }
  const rightTensionTip = {
    x: rightLoad.x,
    y: rightLoad.y + (snapshot.secondaryReactionForce?.y ?? 0) * 0.08,
  }

  appendLine(vertices, leftLoad.x, leftLoad.y, leftLoad.x, pulleyCenter.y, scenario)
  appendLine(vertices, rightLoad.x, rightLoad.y, rightLoad.x, pulleyCenter.y, scenario)
  appendLine(vertices, leftLoad.x, pulleyCenter.y, rightLoad.x, pulleyCenter.y, scenario)
  appendLine(
    vertices,
    pulleyCenter.x - 0.5,
    pulleyCenter.y + 0.4,
    pulleyCenter.x + 0.5,
    pulleyCenter.y + 0.4,
    scenario,
  )

  if (overlays.showAppliedForce) {
    appendLine(
      vertices,
      leftLoad.x,
      leftLoad.y,
      leftLoad.x,
      leftLoad.y + snapshot.appliedForce.y * 0.04,
      scenario,
    )
    appendLine(
      vertices,
      rightLoad.x,
      rightLoad.y,
      rightLoad.x,
      rightLoad.y + snapshot.appliedForce.y * 0.04,
      scenario,
    )
  }

  if (overlays.showReactionForces) {
    appendLine(vertices, leftLoad.x, leftLoad.y, leftTensionTip.x, leftTensionTip.y, scenario)
    appendLine(vertices, rightLoad.x, rightLoad.y, rightTensionTip.x, rightTensionTip.y, scenario)
  }

  if (overlays.showResidualGuides) {
    appendLine(
      vertices,
      pulleyCenter.x,
      pulleyCenter.y - 0.3,
      pulleyCenter.x + snapshot.residualForce.x * 0.1,
      pulleyCenter.y - 0.3 + snapshot.residualForce.y * 0.1,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildInclinedPlaneLineVertices(
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
  overlays: StaticsOverlayOptions,
): Float32Array {
  const vertices: number[] = []
  const origin = scenario.anchorPoint ?? { x: 0, y: 0 }
  const angleRadians = ((scenario.angleDegrees ?? 0) * Math.PI) / 180
  const rampLength = 5
  const bodyPosition = scenario.initialPosition
  const rampEnd = {
    x: origin.x + Math.cos(angleRadians) * rampLength,
    y: origin.y + Math.sin(angleRadians) * rampLength,
  }
  const normalTip = {
    x: bodyPosition.x + snapshot.primaryReactionForce.x * 0.08,
    y: bodyPosition.y + snapshot.primaryReactionForce.y * 0.08,
  }
  const frictionTip = snapshot.secondaryReactionForce
    ? {
        x: bodyPosition.x + snapshot.secondaryReactionForce.x * 0.08,
        y: bodyPosition.y + snapshot.secondaryReactionForce.y * 0.08,
      }
    : bodyPosition

  appendLine(vertices, origin.x, origin.y, rampEnd.x, rampEnd.y, scenario)
  appendLine(vertices, origin.x, origin.y, rampEnd.x, origin.y, scenario)
  appendLine(vertices, rampEnd.x, origin.y, rampEnd.x, rampEnd.y, scenario)

  if (overlays.showAppliedForce) {
    appendLine(
      vertices,
      bodyPosition.x,
      bodyPosition.y,
      bodyPosition.x + snapshot.appliedForce.x * 0.08,
      bodyPosition.y + snapshot.appliedForce.y * 0.08,
      scenario,
    )
  }

  if (overlays.showReactionForces) {
    appendLine(vertices, bodyPosition.x, bodyPosition.y, normalTip.x, normalTip.y, scenario)
    appendLine(vertices, bodyPosition.x, bodyPosition.y, frictionTip.x, frictionTip.y, scenario)
  }

  if (overlays.showResidualGuides) {
    appendLine(
      vertices,
      bodyPosition.x,
      bodyPosition.y,
      bodyPosition.x + snapshot.residualForce.x * 0.2,
      bodyPosition.y + snapshot.residualForce.y * 0.2,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildMarkerVertices(
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
): Float32Array {
  if (scenario.id === "inclined-plane") {
    return buildInclinedPlaneMarkerVertices(snapshot, scenario)
  }

  if (scenario.id === "pulley-equilibrium") {
    return buildPulleyMarkerVertices(scenario)
  }

  const vertices: number[] = []
  appendMarker(vertices, scenario.anchorPoint?.x ?? 1, 0, scenario, 0.16)
  appendMarker(vertices, scenario.secondaryPoint?.x ?? 9, 0, scenario, 0.16)
  appendMarker(vertices, snapshot.position.x, snapshot.position.y, scenario, 0.12)
  return new Float32Array(vertices)
}

function buildInclinedPlaneMarkerVertices(
  snapshot: StaticsStateSnapshot,
  scenario: StaticsScenario,
): Float32Array {
  const vertices: number[] = []
  appendMarker(vertices, scenario.anchorPoint?.x ?? 0, scenario.anchorPoint?.y ?? 0, scenario, 0.14)
  appendMarker(vertices, snapshot.position.x, snapshot.position.y, scenario, 0.16)
  if (scenario.secondaryPoint) {
    appendMarker(vertices, scenario.secondaryPoint.x, scenario.secondaryPoint.y, scenario, 0.12)
  }
  return new Float32Array(vertices)
}

function buildPulleyMarkerVertices(scenario: StaticsScenario): Float32Array {
  const vertices: number[] = []
  appendMarker(vertices, 0, 2, scenario, 0.18)
  appendMarker(
    vertices,
    scenario.anchorPoint?.x ?? -2,
    scenario.anchorPoint?.y ?? -4,
    scenario,
    0.14,
  )
  appendMarker(
    vertices,
    scenario.secondaryPoint?.x ?? 2,
    scenario.secondaryPoint?.y ?? -4,
    scenario,
    0.14,
  )
  return new Float32Array(vertices)
}

function appendLine(
  vertices: number[],
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  scenario: StaticsScenario,
): void {
  const from = toNdcPoint(fromX, fromY, scenario)
  const to = toNdcPoint(toX, toY, scenario)
  vertices.push(from[0], from[1], to[0], to[1])
}

function appendMarker(
  vertices: number[],
  x: number,
  y: number,
  scenario: StaticsScenario,
  halfSize: number,
): void {
  const [centerX, centerY] = toNdcPoint(x, y, scenario)
  vertices.push(
    centerX - halfSize,
    centerY - halfSize,
    centerX + halfSize,
    centerY - halfSize,
    centerX - halfSize,
    centerY + halfSize,
    centerX - halfSize,
    centerY + halfSize,
    centerX + halfSize,
    centerY - halfSize,
    centerX + halfSize,
    centerY + halfSize,
  )
}

function toNdcPoint(x: number, y: number, scenario: StaticsScenario): [number, number] {
  const { minX, maxX, minY, maxY } = scenario.viewBounds
  const ndcX = ((x - minX) / Math.max(maxX - minX, 1e-6)) * 2 - 1
  const ndcY = ((y - minY) / Math.max(maxY - minY, 1e-6)) * 2 - 1
  return [Math.max(Math.min(ndcX, 0.96), -0.96), Math.max(Math.min(ndcY, 0.96), -0.96)]
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const pixelRatio = globalThis.window.devicePixelRatio || 1
  const width = Math.max(Math.floor(canvas.clientWidth * pixelRatio), 1)
  const height = Math.max(Math.floor(canvas.clientHeight * pixelRatio), 1)
  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }
}

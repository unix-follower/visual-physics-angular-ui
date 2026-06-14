import { FluidMechanicsScenario, FluidMechanicsStateSnapshot } from "./fluid-mechanics.models"
import { FluidMechanicsOverlayOptions } from "./fluid-mechanics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 96
const TRIANGLE_VERTEX_CAPACITY = 48
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

export interface FluidMechanicsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class FluidMechanicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<FluidMechanicsWebGpuRenderer | null> {
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
    return new FluidMechanicsWebGpuRenderer(canvas, {
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
    snapshot: FluidMechanicsStateSnapshot,
    scenario: FluidMechanicsScenario,
    overlays: FluidMechanicsOverlayOptions,
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildFluidMechanicsViewportGeometry(
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
          clearValue: { r: 0.02, g: 0.05, b: 0.09, a: 1 },
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
      [0.58, 0.79, 0.94, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.96, 0.77, 0.43, 1],
    )

    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.lineBuffer.destroy?.()
    this.resources.markerBuffer.destroy?.()
    this.resources.colorBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

export function buildFluidMechanicsViewportGeometry(
  snapshot: FluidMechanicsStateSnapshot,
  scenario: FluidMechanicsScenario,
  overlays: FluidMechanicsOverlayOptions,
): FluidMechanicsViewportGeometry {
  if (scenario.id === "open-channel-flow") {
    return buildOpenChannelViewportGeometry(snapshot, scenario, overlays)
  }

  if (scenario.id === "poiseuille-pipe") {
    return buildPoiseuilleViewportGeometry(snapshot, scenario, overlays)
  }

  return buildBuoyancyViewportGeometry(snapshot, scenario, overlays)
}

function buildBuoyancyViewportGeometry(
  snapshot: FluidMechanicsStateSnapshot,
  scenario: FluidMechanicsScenario,
  overlays: FluidMechanicsOverlayOptions,
): FluidMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const tankLeft = 2
  const tankRight = 8
  const tankBottom = 1.5
  const tankTop = 8.5
  const waterline = 6.1
  const blockWidth = Math.min((scenario.blockWidth ?? 0) * 1.6, 2.3)
  const blockHeight = Math.min((scenario.blockHeight ?? 0) * 1.7, 2.5)
  const blockCenterX = 5
  const submergedHeight = blockHeight * (snapshot.immersionRatio ?? 0)
  const blockBottom = waterline - submergedHeight
  const blockTop = blockBottom + blockHeight
  const blockLeft = blockCenterX - blockWidth / 2
  const blockRight = blockCenterX + blockWidth / 2

  appendLine(lineVertices, scenario, tankLeft, tankBottom, tankLeft, tankTop)
  appendLine(lineVertices, scenario, tankLeft, tankBottom, tankRight, tankBottom)
  appendLine(lineVertices, scenario, tankRight, tankBottom, tankRight, tankTop)

  if (overlays.showWaterline) {
    appendLine(lineVertices, scenario, tankLeft, waterline, tankRight, waterline)
  }

  appendLine(lineVertices, scenario, blockLeft, blockBottom, blockRight, blockBottom)
  appendLine(lineVertices, scenario, blockRight, blockBottom, blockRight, blockTop)
  appendLine(lineVertices, scenario, blockRight, blockTop, blockLeft, blockTop)
  appendLine(lineVertices, scenario, blockLeft, blockTop, blockLeft, blockBottom)

  appendRectangle(markerVertices, scenario, blockLeft, blockBottom, blockRight, blockTop)

  if (overlays.showEquilibriumGuide) {
    const guideY =
      waterline -
      blockHeight * ((snapshot.equilibriumDepth ?? 0) / Math.max(scenario.blockHeight ?? 0, 1e-6))
    appendLine(lineVertices, scenario, tankLeft + 0.25, guideY, tankRight - 0.25, guideY)
  }

  if (overlays.showForceGuides) {
    appendArrow(
      lineVertices,
      scenario,
      blockCenterX - 0.55,
      (blockTop + blockBottom) / 2,
      blockCenterX - 0.55,
      blockBottom - 1.4,
    )
    appendArrow(
      lineVertices,
      scenario,
      blockCenterX + 0.55,
      (blockTop + blockBottom) / 2,
      blockCenterX + 0.55,
      blockTop + 1.4,
    )
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildOpenChannelViewportGeometry(
  snapshot: FluidMechanicsStateSnapshot,
  scenario: FluidMechanicsScenario,
  overlays: FluidMechanicsOverlayOptions,
): FluidMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const channelLeft = 1.2
  const channelRight = 16.2
  const upstreamBedY = 2.2
  const channelLength = Math.max(scenario.channelLength ?? 0, 1e-6)
  const channelSlope = Math.max(scenario.channelSlope ?? 0, 1e-6)
  const channelDepth = Math.max(scenario.channelDepth ?? 0, 1e-6)
  const bedDrop = Math.min(channelLength * channelSlope * 1.2, 2.2)
  const downstreamBedY = upstreamBedY - bedDrop
  const leftBankTop = 8.1
  const rightBankTop = 7.1
  const waterOffset = Math.min(channelDepth * 0.85, 2.6)
  const upstreamWaterY = upstreamBedY + waterOffset
  const downstreamWaterY = downstreamBedY + waterOffset

  appendLine(lineVertices, scenario, channelLeft, upstreamBedY, channelRight, downstreamBedY)
  appendLine(lineVertices, scenario, channelLeft, upstreamBedY, channelLeft, leftBankTop)
  appendLine(lineVertices, scenario, channelRight, downstreamBedY, channelRight, rightBankTop)

  appendRectangle(
    markerVertices,
    scenario,
    channelLeft,
    downstreamBedY,
    channelRight,
    upstreamWaterY,
  )

  if (overlays.showWaterline) {
    appendLine(lineVertices, scenario, channelLeft, upstreamWaterY, channelRight, downstreamWaterY)
  }

  if (overlays.showEquilibriumGuide) {
    appendLine(
      lineVertices,
      scenario,
      channelLeft + 0.6,
      leftBankTop - 0.4,
      channelRight - 0.6,
      rightBankTop - 1.2,
    )
    appendLine(
      lineVertices,
      scenario,
      channelLeft + 0.6,
      leftBankTop - 0.4,
      channelLeft + 0.6,
      upstreamBedY + 0.2,
    )
    appendLine(
      lineVertices,
      scenario,
      channelRight - 0.6,
      rightBankTop - 1.2,
      channelRight - 0.6,
      downstreamBedY + 0.2,
    )
  }

  if (overlays.showForceGuides) {
    appendArrow(lineVertices, scenario, 3.2, upstreamWaterY - 0.55, 5.1, upstreamWaterY - 0.7)
    appendArrow(
      lineVertices,
      scenario,
      7.1,
      (upstreamWaterY + downstreamWaterY) / 2 - 0.2,
      9.2,
      (upstreamWaterY + downstreamWaterY) / 2 - 0.35,
    )
    appendArrow(lineVertices, scenario, 11.4, downstreamWaterY - 0.15, 13.7, downstreamWaterY - 0.3)
  }

  if ((snapshot.froudeNumber ?? 0) < 1) {
    appendLine(lineVertices, scenario, 4.6, upstreamWaterY - 0.95, 12.4, downstreamWaterY - 0.95)
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildPoiseuilleViewportGeometry(
  snapshot: FluidMechanicsStateSnapshot,
  scenario: FluidMechanicsScenario,
  overlays: FluidMechanicsOverlayOptions,
): FluidMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const pipeLeft = 1.2
  const pipeRight = 10.8
  const centerY = 5
  const pipeHalfHeight = 1 + Math.min((scenario.pipeRadius ?? 0) * 12, 0.9)
  const inletX = pipeLeft + 0.5
  const outletX = pipeRight - 0.5

  appendLine(
    lineVertices,
    scenario,
    pipeLeft,
    centerY - pipeHalfHeight,
    pipeRight,
    centerY - pipeHalfHeight,
  )
  appendLine(
    lineVertices,
    scenario,
    pipeLeft,
    centerY + pipeHalfHeight,
    pipeRight,
    centerY + pipeHalfHeight,
  )
  appendLine(
    lineVertices,
    scenario,
    pipeLeft,
    centerY - pipeHalfHeight,
    pipeLeft,
    centerY + pipeHalfHeight,
  )
  appendLine(
    lineVertices,
    scenario,
    pipeRight,
    centerY - pipeHalfHeight,
    pipeRight,
    centerY + pipeHalfHeight,
  )

  appendRectangle(
    markerVertices,
    scenario,
    pipeLeft,
    centerY - pipeHalfHeight,
    pipeRight,
    centerY + pipeHalfHeight,
  )

  if (overlays.showWaterline) {
    appendLine(lineVertices, scenario, pipeLeft + 0.2, centerY, pipeRight - 0.2, centerY)
  }

  if (overlays.showEquilibriumGuide) {
    appendLine(lineVertices, scenario, inletX, 8.2, outletX, 7.1)
    appendLine(lineVertices, scenario, inletX, 8.2, inletX, centerY + pipeHalfHeight + 0.2)
    appendLine(lineVertices, scenario, outletX, 7.1, outletX, centerY + pipeHalfHeight + 0.2)
  }

  if (overlays.showForceGuides) {
    appendArrow(lineVertices, scenario, 2.4, centerY, 4.1, centerY)
    appendArrow(lineVertices, scenario, 5.1, centerY, 6.8, centerY)
    appendArrow(lineVertices, scenario, 7.8, centerY, 9.5, centerY)
  }

  if ((snapshot.centerlineVelocity ?? 0) > (snapshot.averageVelocity ?? 0)) {
    appendLine(lineVertices, scenario, 3.2, centerY + 0.25, 8.8, centerY + 0.25)
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
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
  if (vertexCount <= 0) {
    return
  }

  resources.device.queue.writeBuffer(resources.colorBuffer, 0, new Float32Array(color))
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, buffer)
  pass.draw(vertexCount)
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = globalThis.devicePixelRatio || 1
  const width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
  const height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

function appendLine(
  vertices: number[],
  scenario: FluidMechanicsScenario,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  vertices.push(
    normalizeX(x0, scenario),
    normalizeY(y0, scenario),
    normalizeX(x1, scenario),
    normalizeY(y1, scenario),
  )
}

function appendRectangle(
  vertices: number[],
  scenario: FluidMechanicsScenario,
  left: number,
  bottom: number,
  right: number,
  top: number,
): void {
  vertices.push(
    normalizeX(left, scenario),
    normalizeY(bottom, scenario),
    normalizeX(right, scenario),
    normalizeY(bottom, scenario),
    normalizeX(right, scenario),
    normalizeY(top, scenario),
    normalizeX(left, scenario),
    normalizeY(bottom, scenario),
    normalizeX(right, scenario),
    normalizeY(top, scenario),
    normalizeX(left, scenario),
    normalizeY(top, scenario),
  )
}

function appendArrow(
  vertices: number[],
  scenario: FluidMechanicsScenario,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  appendLine(vertices, scenario, x0, y0, x1, y1)
  const dx = x1 - x0
  const dy = y1 - y0
  const magnitude = Math.hypot(dx, dy) || 1
  const ux = dx / magnitude
  const uy = dy / magnitude
  const arrowLength = 0.25
  const arrowWidth = 0.18
  appendLine(
    vertices,
    scenario,
    x1,
    y1,
    x1 - ux * arrowLength - uy * arrowWidth,
    y1 - uy * arrowLength + ux * arrowWidth,
  )
  appendLine(
    vertices,
    scenario,
    x1,
    y1,
    x1 - ux * arrowLength + uy * arrowWidth,
    y1 - uy * arrowLength - ux * arrowWidth,
  )
}

function normalizeX(value: number, scenario: FluidMechanicsScenario): number {
  const normalized =
    (value - scenario.viewBounds.minX) / (scenario.viewBounds.maxX - scenario.viewBounds.minX)
  return -0.9 + normalized * 1.8
}

function normalizeY(value: number, scenario: FluidMechanicsScenario): number {
  const normalized =
    (value - scenario.viewBounds.minY) / (scenario.viewBounds.maxY - scenario.viewBounds.minY)
  return -0.9 + normalized * 1.8
}

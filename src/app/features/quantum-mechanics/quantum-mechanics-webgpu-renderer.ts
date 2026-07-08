import {
  QuantumMechanicsSample,
  QuantumMechanicsScenario,
  QuantumMechanicsStateSnapshot,
} from "./quantum-mechanics.models"
import { QuantumMechanicsOverlayOptions } from "./quantum-mechanics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 512
const TRIANGLE_VERTEX_CAPACITY = 192
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

export interface QuantumMechanicsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class QuantumMechanicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<QuantumMechanicsWebGpuRenderer | null> {
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
    return new QuantumMechanicsWebGpuRenderer(canvas, {
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
    snapshot: QuantumMechanicsStateSnapshot,
    scenario: QuantumMechanicsScenario,
    overlays: QuantumMechanicsOverlayOptions,
    samples: readonly QuantumMechanicsSample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildQuantumMechanicsViewportGeometry(
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
          clearValue: { r: 0.03, g: 0.05, b: 0.1, a: 1 },
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
      [0.55, 0.84, 0.98, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.95, 0.79, 0.42, 1],
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

export function buildQuantumMechanicsViewportGeometry(
  snapshot: QuantumMechanicsStateSnapshot,
  scenario: QuantumMechanicsScenario,
  overlays: QuantumMechanicsOverlayOptions,
  samples: readonly QuantumMechanicsSample[],
): QuantumMechanicsViewportGeometry {
  if (scenario.id === "finite-potential-well-tunneling") {
    return buildTunnelingViewportGeometry(snapshot, overlays, samples)
  }

  if (scenario.id === "double-slit-interference") {
    return buildDoubleSlitViewportGeometry(snapshot, overlays, samples)
  }

  return buildParticleBoxViewportGeometry(snapshot, overlays, samples)
}

function buildParticleBoxViewportGeometry(
  snapshot: QuantumMechanicsStateSnapshot,
  overlays: QuantumMechanicsOverlayOptions,
  samples: readonly QuantumMechanicsSample[],
): QuantumMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const leftX = 1.3
  const rightX = 8.7
  const floorY = 8.2
  const roofY = 1.8
  const centerY = 5
  const energyOffset = clamp((snapshot.energyLevelEv ?? 0) * 0.25, 0.5, 2.4)

  appendLine(lineVertices, leftX, roofY, leftX, floorY)
  appendLine(lineVertices, rightX, roofY, rightX, floorY)
  appendLine(lineVertices, leftX, floorY, rightX, floorY)

  if (overlays.showPotentialGuide) {
    appendLine(
      lineVertices,
      leftX + 0.2,
      floorY - energyOffset,
      rightX - 0.2,
      floorY - energyOffset,
    )
  }
  if (overlays.showProbabilityGuide) {
    appendSampleCurve(lineVertices, samples, leftX, rightX, floorY - 0.15, roofY + 0.5, 0.84, false)
  }
  if (overlays.showPhaseGuide) {
    appendSampleCurve(
      lineVertices,
      samples.map((sample) => ({
        ...sample,
        primaryValue: ((sample.secondaryValue ?? 0) + 1) * 0.5,
      })),
      leftX,
      rightX,
      centerY + 1.6,
      centerY - 1.6,
      1,
      false,
    )
    appendRectangle(markerVertices, leftX + 0.18, centerY - 0.08, leftX + 0.34, centerY + 0.08)
  }

  appendRectangle(markerVertices, leftX - 0.08, floorY - 0.08, leftX + 0.08, floorY + 0.08)
  appendRectangle(markerVertices, rightX - 0.08, floorY - 0.08, rightX + 0.08, floorY + 0.08)
  appendRectangle(
    markerVertices,
    (leftX + rightX) / 2 - 0.08,
    floorY - energyOffset - 0.08,
    (leftX + rightX) / 2 + 0.08,
    floorY - energyOffset + 0.08,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildTunnelingViewportGeometry(
  snapshot: QuantumMechanicsStateSnapshot,
  overlays: QuantumMechanicsOverlayOptions,
  samples: readonly QuantumMechanicsSample[],
): QuantumMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const axisY = 7.2
  const barrierTop = 2.6
  const widthScale = clamp((snapshot.barrierWidthNanometers ?? 0.45) * 1.5, 0.8, 2.2)
  const tunedBarrierLeft = 5 - widthScale / 2
  const tunedBarrierRight = 5 + widthScale / 2

  appendLine(lineVertices, 1.1, axisY, 8.9, axisY)
  appendLine(lineVertices, tunedBarrierLeft, axisY, tunedBarrierLeft, barrierTop)
  appendLine(lineVertices, tunedBarrierLeft, barrierTop, tunedBarrierRight, barrierTop)
  appendLine(lineVertices, tunedBarrierRight, barrierTop, tunedBarrierRight, axisY)

  if (overlays.showProbabilityGuide) {
    appendSampleCurve(lineVertices, samples, 1.3, 8.7, axisY - 0.2, 2.1, 0.82, false)
  }
  if (overlays.showPotentialGuide) {
    const energyOffset = clamp((snapshot.particleEnergyEv ?? 0) * 0.35, 0.5, 2.4)
    appendLine(lineVertices, 1.3, axisY - energyOffset, tunedBarrierLeft, axisY - energyOffset)
    appendLine(lineVertices, tunedBarrierRight, axisY - energyOffset, 8.7, axisY - energyOffset)
  }
  if (overlays.showPhaseGuide) {
    const transmissionHeight =
      axisY - clamp((snapshot.transmissionProbability ?? 0) * 3.2, 0.18, 3.2)
    appendLine(lineVertices, 8.15, axisY, 8.15, transmissionHeight)
    appendLine(lineVertices, 7.95, transmissionHeight, 8.35, transmissionHeight)
  }

  appendRectangle(
    markerVertices,
    tunedBarrierLeft - 0.08,
    barrierTop - 0.08,
    tunedBarrierLeft + 0.08,
    barrierTop + 0.08,
  )
  appendRectangle(
    markerVertices,
    tunedBarrierRight - 0.08,
    barrierTop - 0.08,
    tunedBarrierRight + 0.08,
    barrierTop + 0.08,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildDoubleSlitViewportGeometry(
  snapshot: QuantumMechanicsStateSnapshot,
  overlays: QuantumMechanicsOverlayOptions,
  samples: readonly QuantumMechanicsSample[],
): QuantumMechanicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const slitX = 3.1
  const screenX = 8.2
  const axisY = 5
  const centralHalfWidth = clamp((snapshot.centralMaximumWidthMillimeters ?? 0) / 30, 0.5, 2.5)
  const fringeOffset = clamp((snapshot.fringeSpacingMillimeters ?? 0) / 12, 0.25, 1.8)

  appendLine(lineVertices, slitX, 1.5, slitX, axisY - 0.55)
  appendLine(lineVertices, slitX, axisY + 0.55, slitX, 8.5)
  appendLine(lineVertices, screenX, 1.5, screenX, 8.5)

  if (overlays.showPotentialGuide) {
    appendLine(lineVertices, slitX, axisY, screenX, axisY)
  }
  if (overlays.showProbabilityGuide) {
    appendScreenTrace(lineVertices, samples, screenX, 1.8, 8.2, 1.6)
  }
  if (overlays.showPhaseGuide) {
    appendLine(lineVertices, slitX, axisY, screenX, axisY - fringeOffset)
    appendLine(lineVertices, slitX, axisY, screenX, axisY + fringeOffset)
    appendLine(
      lineVertices,
      screenX - 0.25,
      axisY - centralHalfWidth,
      screenX - 0.25,
      axisY + centralHalfWidth,
    )
  }

  appendRectangle(markerVertices, slitX - 0.08, axisY - 0.45, slitX + 0.08, axisY - 0.28)
  appendRectangle(markerVertices, slitX - 0.08, axisY + 0.28, slitX + 0.08, axisY + 0.45)
  appendRectangle(markerVertices, screenX - 0.08, axisY - 0.08, screenX + 0.08, axisY + 0.08)
  appendRectangle(
    markerVertices,
    screenX - 0.08,
    axisY - fringeOffset - 0.08,
    screenX + 0.08,
    axisY - fringeOffset + 0.08,
  )
  appendRectangle(
    markerVertices,
    screenX - 0.08,
    axisY + fringeOffset - 0.08,
    screenX + 0.08,
    axisY + fringeOffset + 0.08,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function appendSampleCurve(
  vertices: number[],
  samples: readonly QuantumMechanicsSample[],
  startX: number,
  endX: number,
  baseY: number,
  peakY: number,
  scale: number,
  clampToBase: boolean,
): void {
  if (samples.length < 2) {
    return
  }

  const spanX = endX - startX
  const spanY = baseY - peakY
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    const previousX = startX + ((index - 1) / (samples.length - 1)) * spanX
    const currentX = startX + (index / (samples.length - 1)) * spanX
    const previousValue = clampToBase ? clamp(previous.primaryValue, 0, 1) : previous.primaryValue
    const currentValue = clampToBase ? clamp(current.primaryValue, 0, 1) : current.primaryValue
    const previousY = baseY - previousValue * spanY * scale
    const currentY = baseY - currentValue * spanY * scale
    appendLine(vertices, previousX, previousY, currentX, currentY)
  }
}

function appendScreenTrace(
  vertices: number[],
  samples: readonly QuantumMechanicsSample[],
  screenX: number,
  startY: number,
  endY: number,
  traceDepth: number,
): void {
  if (samples.length < 2) {
    return
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    const previousY = startY + ((index - 1) / (samples.length - 1)) * (endY - startY)
    const currentY = startY + (index / (samples.length - 1)) * (endY - startY)
    const previousX = screenX - clamp(previous.primaryValue, 0, 1) * traceDepth
    const currentX = screenX - clamp(current.primaryValue, 0, 1) * traceDepth
    appendLine(vertices, previousX, previousY, currentX, currentY)
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
  const nextWidth = Math.max(320, Math.floor(canvas.clientWidth || 640))
  const nextHeight = Math.max(180, Math.floor(canvas.clientHeight || 360))
  if (canvas.width !== nextWidth) {
    canvas.width = nextWidth
  }
  if (canvas.height !== nextHeight) {
    canvas.height = nextHeight
  }
}

function appendLine(
  vertices: number[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  vertices.push(...toClip(startX, startY), ...toClip(endX, endY))
}

function appendRectangle(
  vertices: number[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): void {
  for (const coordinate of buildRectangleVertices(minX, minY, maxX, maxY)) {
    vertices.push(coordinate)
  }
}

function buildRectangleVertices(minX: number, minY: number, maxX: number, maxY: number): number[] {
  return [
    ...toClip(minX, minY),
    ...toClip(maxX, minY),
    ...toClip(minX, maxY),
    ...toClip(minX, maxY),
    ...toClip(maxX, minY),
    ...toClip(maxX, maxY),
  ]
}

function toClip(x: number, y: number): [number, number] {
  return [x / 5 - 1, y / 5 - 1]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

import {
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"
import { WavesAndAcousticsOverlayOptions } from "./waves-and-acoustics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 768
const TRIANGLE_VERTEX_CAPACITY = 288
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

export interface WavesAndAcousticsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class WavesAndAcousticsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<WavesAndAcousticsWebGpuRenderer | null> {
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
    return new WavesAndAcousticsWebGpuRenderer(canvas, {
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
    snapshot: WavesAndAcousticsStateSnapshot,
    scenario: WavesAndAcousticsScenario,
    overlays: WavesAndAcousticsOverlayOptions,
    samples: readonly WavesAndAcousticsSample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildWavesAndAcousticsViewportGeometry(
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
          clearValue: { r: 0.03, g: 0.06, b: 0.12, a: 1 },
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
      [0.5, 0.86, 0.98, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.98, 0.84, 0.44, 1],
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

export function buildWavesAndAcousticsViewportGeometry(
  snapshot: WavesAndAcousticsStateSnapshot,
  scenario: WavesAndAcousticsScenario,
  overlays: WavesAndAcousticsOverlayOptions,
  samples: readonly WavesAndAcousticsSample[],
): WavesAndAcousticsViewportGeometry {
  if (scenario.id === "traveling-wave") {
    return buildTravelingWaveViewportGeometry(snapshot, overlays, samples)
  }

  if (scenario.id === "doppler-effect") {
    return buildDopplerViewportGeometry(snapshot, overlays, samples)
  }

  return buildStandingWaveViewportGeometry(snapshot, overlays, samples)
}

function buildStandingWaveViewportGeometry(
  snapshot: WavesAndAcousticsStateSnapshot,
  overlays: WavesAndAcousticsOverlayOptions,
  samples: readonly WavesAndAcousticsSample[],
): WavesAndAcousticsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const leftX = 1.2
  const rightX = 8.8
  const axisY = 5.4
  const amplitude = clamp((snapshot.amplitudeMillimeters ?? 6) / 10, 0.2, 1.4)
  const harmonicNumber = Math.max(1, Math.round(snapshot.harmonicNumber ?? 1))

  appendLine(lineVertices, leftX, axisY, rightX, axisY)
  appendLine(lineVertices, leftX, axisY - 1.2, leftX, axisY + 1.2)
  appendLine(lineVertices, rightX, axisY - 1.2, rightX, axisY + 1.2)

  if (overlays.showReferenceCurve) {
    appendLine(lineVertices, leftX, axisY - amplitude, rightX, axisY - amplitude)
    appendLine(lineVertices, leftX, axisY + amplitude, rightX, axisY + amplitude)
  }
  if (overlays.showWaveGuides) {
    appendCenteredSampleCurve(lineVertices, samples, leftX, rightX, axisY, 1.2, false)
  }
  if (overlays.showNodeMarkers) {
    for (let index = 0; index <= harmonicNumber; index += 1) {
      const x = leftX + (index / harmonicNumber) * (rightX - leftX)
      appendRectangle(markerVertices, x - 0.07, axisY - 0.07, x + 0.07, axisY + 0.07)
    }
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildTravelingWaveViewportGeometry(
  snapshot: WavesAndAcousticsStateSnapshot,
  overlays: WavesAndAcousticsOverlayOptions,
  samples: readonly WavesAndAcousticsSample[],
): WavesAndAcousticsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const leftX = 1.1
  const rightX = 8.9
  const axisY = 5.2
  const wavelengthWidth = clamp((snapshot.wavelengthMeters ?? 1) * 1.5, 0.8, 2.4)

  appendLine(lineVertices, leftX, axisY, rightX, axisY)

  if (overlays.showWaveGuides) {
    appendCenteredSampleCurve(lineVertices, samples, leftX, rightX, axisY, 1.3, false)
    appendLine(lineVertices, 7.4, 2.2, 8.3, 2.2)
    appendLine(lineVertices, 8.3, 2.2, 8.05, 2.0)
    appendLine(lineVertices, 8.3, 2.2, 8.05, 2.4)
  }
  if (overlays.showReferenceCurve) {
    appendLine(lineVertices, 2, 7.4, 2 + wavelengthWidth, 7.4)
    appendLine(lineVertices, 2, 7.2, 2, 7.6)
    appendLine(lineVertices, 2 + wavelengthWidth, 7.2, 2 + wavelengthWidth, 7.6)
  }
  if (overlays.showNodeMarkers) {
    appendRectangle(markerVertices, leftX - 0.07, axisY - 0.07, leftX + 0.07, axisY + 0.07)
    appendRectangle(markerVertices, rightX - 0.07, axisY - 0.07, rightX + 0.07, axisY + 0.07)
    appendRectangle(markerVertices, 2 - 0.07, 7.4 - 0.07, 2 + 0.07, 7.4 + 0.07)
    appendRectangle(
      markerVertices,
      2 + wavelengthWidth - 0.07,
      7.4 - 0.07,
      2 + wavelengthWidth + 0.07,
      7.4 + 0.07,
    )
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildDopplerViewportGeometry(
  snapshot: WavesAndAcousticsStateSnapshot,
  overlays: WavesAndAcousticsOverlayOptions,
  samples: readonly WavesAndAcousticsSample[],
): WavesAndAcousticsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const sourceX = clamp(
    3 + (snapshot.sourceSpeedMetersPerSecond ?? 0) * snapshot.timeSeconds * 0.025,
    1.8,
    6.8,
  )
  const observerX = clamp(
    7.3 + (snapshot.observerSpeedMetersPerSecond ?? 0) * snapshot.timeSeconds * 0.025,
    sourceX + 1,
    8.8,
  )
  const axisY = 5.4
  const apparentShift = clamp(
    ((snapshot.apparentFrequencyHertz ?? 0) - (snapshot.emittedFrequencyHertz ?? 0)) / 60,
    -1.4,
    1.4,
  )

  appendLine(lineVertices, 1.1, axisY, 8.9, axisY)
  appendLine(lineVertices, sourceX, 3, sourceX, 7.8)
  appendLine(lineVertices, observerX, 3.5, observerX, 7.3)

  if (overlays.showWaveGuides) {
    appendLine(lineVertices, sourceX, axisY, observerX, axisY - apparentShift)
    appendFrequencyTrace(lineVertices, samples, 1.8, 8.2, 8.3, 6.4)
  }
  if (overlays.showReferenceCurve) {
    appendLine(
      lineVertices,
      sourceX + 0.35,
      2.2,
      sourceX + 0.35,
      2.2 - clamp((snapshot.emittedFrequencyHertz ?? 0) / 300, 0.5, 1.8),
    )
    appendLine(
      lineVertices,
      observerX + 0.35,
      2.2,
      observerX + 0.35,
      2.2 - clamp((snapshot.apparentFrequencyHertz ?? 0) / 300, 0.5, 1.8),
    )
  }
  if (overlays.showNodeMarkers) {
    appendRectangle(markerVertices, sourceX - 0.12, axisY - 0.12, sourceX + 0.12, axisY + 0.12)
    appendRectangle(markerVertices, observerX - 0.12, axisY - 0.12, observerX + 0.12, axisY + 0.12)
  }

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function appendCenteredSampleCurve(
  vertices: number[],
  samples: readonly WavesAndAcousticsSample[],
  startX: number,
  endX: number,
  centerY: number,
  amplitude: number,
  clampValues: boolean,
): void {
  if (samples.length < 2) {
    return
  }

  const spanX = endX - startX
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    const previousX = startX + ((index - 1) / (samples.length - 1)) * spanX
    const currentX = startX + (index / (samples.length - 1)) * spanX
    const previousValue = clampValues ? clamp(previous.primaryValue, -1, 1) : previous.primaryValue
    const currentValue = clampValues ? clamp(current.primaryValue, -1, 1) : current.primaryValue
    appendLine(
      vertices,
      previousX,
      centerY - previousValue * amplitude,
      currentX,
      centerY - currentValue * amplitude,
    )
  }
}

function appendFrequencyTrace(
  vertices: number[],
  samples: readonly WavesAndAcousticsSample[],
  startX: number,
  endX: number,
  baseY: number,
  peakY: number,
): void {
  if (samples.length < 2) {
    return
  }

  const minValue = Math.min(...samples.map((sample) => sample.primaryValue))
  const maxValue = Math.max(...samples.map((sample) => sample.primaryValue))
  const valueSpan = Math.max(maxValue - minValue, 1)

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]
    const current = samples[index]
    const previousX = startX + ((index - 1) / (samples.length - 1)) * (endX - startX)
    const currentX = startX + (index / (samples.length - 1)) * (endX - startX)
    const previousY = baseY - ((previous.primaryValue - minValue) / valueSpan) * (baseY - peakY)
    const currentY = baseY - ((current.primaryValue - minValue) / valueSpan) * (baseY - peakY)
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

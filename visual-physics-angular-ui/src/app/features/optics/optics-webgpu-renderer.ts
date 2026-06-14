import { OpticsScenario, OpticsStateSnapshot } from "./optics.models"
import { OpticsOverlayOptions } from "./optics-payload"

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

export interface OpticsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class OpticsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<OpticsWebGpuRenderer | null> {
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
    return new OpticsWebGpuRenderer(canvas, {
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
    snapshot: OpticsStateSnapshot,
    scenario: OpticsScenario,
    overlays: OpticsOverlayOptions,
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildOpticsViewportGeometry(
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
          clearValue: { r: 0.03, g: 0.04, b: 0.08, a: 1 },
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
      [0.61, 0.84, 0.96, 1],
    )
    draw(
      pass,
      this.resources,
      this.resources.trianglePipeline,
      this.resources.markerBuffer,
      markerVertices.length / 2,
      [0.98, 0.75, 0.42, 1],
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

export function buildOpticsViewportGeometry(
  snapshot: OpticsStateSnapshot,
  scenario: OpticsScenario,
  overlays: OpticsOverlayOptions,
): OpticsViewportGeometry {
  if (scenario.id === "single-slit-diffraction") {
    return buildSingleSlitViewportGeometry(snapshot, overlays)
  }

  if (scenario.id === "thin-lens-imaging") {
    return buildThinLensViewportGeometry(snapshot, overlays)
  }

  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const interfaceY = 5
  const interfaceX = 5
  const incidentLength = 3.2
  const incidentRadians = toRadians(snapshot.incidentAngleDegrees ?? 0)
  const reflectedRadians = toRadians(snapshot.reflectedAngleDegrees ?? 0)
  const refractedRadians = toRadians(snapshot.refractedAngleDegrees ?? 0)

  appendLine(lineVertices, 1.5, interfaceY, 8.5, interfaceY)
  if (overlays.showNormalGuide) {
    appendLine(lineVertices, interfaceX, 1.2, interfaceX, 8.8)
  }
  if (overlays.showIncidentGuide) {
    appendLine(
      lineVertices,
      interfaceX - Math.sin(incidentRadians) * incidentLength,
      interfaceY + Math.cos(incidentRadians) * incidentLength,
      interfaceX,
      interfaceY,
    )
  }
  appendLine(
    lineVertices,
    interfaceX,
    interfaceY,
    interfaceX + Math.sin(reflectedRadians) * incidentLength,
    interfaceY + Math.cos(reflectedRadians) * incidentLength,
  )
  if (overlays.showSecondaryGuide) {
    if (snapshot.totalInternalReflection) {
      appendLine(lineVertices, 2.3, 7.6, 3.6, 8.2)
      appendLine(lineVertices, 2.3, 2.4, 3.6, 1.8)
    } else {
      appendLine(
        lineVertices,
        interfaceX,
        interfaceY,
        interfaceX + Math.sin(refractedRadians) * incidentLength,
        interfaceY - Math.cos(refractedRadians) * incidentLength,
      )
    }
  }

  appendRectangle(
    markerVertices,
    interfaceX - 0.08,
    interfaceY - 0.08,
    interfaceX + 0.08,
    interfaceY + 0.08,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildSingleSlitViewportGeometry(
  snapshot: OpticsStateSnapshot,
  overlays: OpticsOverlayOptions,
): OpticsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const slitX = 3.1
  const screenX = 8.2
  const axisY = 5
  const firstMinimumOffset = Math.min(2.4, (snapshot.firstMinimumOffsetMillimeters ?? 0) / 8)
  const envelopeHalfWidth = Math.min(2.6, (snapshot.centralMaximumWidthMillimeters ?? 0) / 12)

  appendLine(lineVertices, 1.2, axisY, 8.8, axisY)
  appendLine(lineVertices, screenX, 1.5, screenX, 8.5)
  appendLine(lineVertices, slitX, 2.2, slitX, axisY - 0.4)
  appendLine(lineVertices, slitX, axisY + 0.4, slitX, 7.8)

  if (overlays.showIncidentGuide) {
    appendLine(lineVertices, 1.4, axisY - 0.25, slitX, axisY - 0.25)
    appendLine(lineVertices, 1.4, axisY + 0.25, slitX, axisY + 0.25)
  }
  if (overlays.showNormalGuide) {
    appendLine(lineVertices, slitX, axisY, screenX, axisY)
  }
  if (overlays.showSecondaryGuide) {
    appendLine(lineVertices, slitX, axisY, screenX, axisY - firstMinimumOffset)
    appendLine(lineVertices, slitX, axisY, screenX, axisY + firstMinimumOffset)
    appendLine(lineVertices, screenX, axisY - envelopeHalfWidth, screenX, axisY + envelopeHalfWidth)
  }

  appendRectangle(markerVertices, slitX - 0.07, axisY - 0.12, slitX + 0.07, axisY + 0.12)
  appendRectangle(markerVertices, screenX - 0.08, axisY - 0.08, screenX + 0.08, axisY + 0.08)
  appendRectangle(
    markerVertices,
    screenX - 0.06,
    axisY - firstMinimumOffset - 0.06,
    screenX + 0.06,
    axisY - firstMinimumOffset + 0.06,
  )
  appendRectangle(
    markerVertices,
    screenX - 0.06,
    axisY + firstMinimumOffset - 0.06,
    screenX + 0.06,
    axisY + firstMinimumOffset + 0.06,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildThinLensViewportGeometry(
  snapshot: OpticsStateSnapshot,
  overlays: OpticsOverlayOptions,
): OpticsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const lensX = 5
  const axisY = 5
  const objectDistance = snapshot.objectDistanceCentimeters ?? 42
  const imageDistance = snapshot.imageDistanceCentimeters ?? 18
  const objectHeight = snapshot.objectHeightCentimeters ?? 4
  const imageHeight = snapshot.imageHeightCentimeters ?? 0
  const focalLength = snapshot.focalLengthCentimeters ?? 18
  const objectX = Math.max(1.1, lensX - objectDistance / 12)
  const imageX = Math.min(8.9, Math.max(1.4, lensX + imageDistance / 12))
  const objectTopY = axisY - objectHeight * 0.35
  const imageTopY = axisY - imageHeight * 0.35
  const focalOffset = Math.min(2.2, Math.max(0.7, focalLength / 12))

  appendLine(lineVertices, 1.1, axisY, 8.9, axisY)
  appendLine(lineVertices, lensX, 1.5, lensX, 8.5)
  appendLine(lineVertices, lensX - focalOffset, axisY - 0.18, lensX - focalOffset, axisY + 0.18)
  appendLine(lineVertices, lensX + focalOffset, axisY - 0.18, lensX + focalOffset, axisY + 0.18)

  if (overlays.showIncidentGuide) {
    appendLine(lineVertices, objectX, objectTopY, lensX, objectTopY)
  }
  if (overlays.showNormalGuide) {
    appendLine(lineVertices, objectX, objectTopY, lensX, axisY)
  }
  if (overlays.showSecondaryGuide) {
    appendLine(lineVertices, lensX, objectTopY, imageX, axisY)
  }

  appendLine(lineVertices, objectX, axisY, objectX, objectTopY)
  appendRectangle(markerVertices, lensX - 0.08, axisY - 0.08, lensX + 0.08, axisY + 0.08)
  if (snapshot.stable) {
    appendLine(lineVertices, imageX, axisY, imageX, imageTopY)
    appendRectangle(
      markerVertices,
      imageX - 0.06,
      imageTopY - 0.06,
      imageX + 0.06,
      imageTopY + 0.06,
    )
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

function toRadians(angleDegrees: number): number {
  return (angleDegrees * Math.PI) / 180
}

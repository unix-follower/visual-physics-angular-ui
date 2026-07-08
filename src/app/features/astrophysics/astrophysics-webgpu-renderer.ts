import {
  AstrophysicsSample,
  AstrophysicsScenario,
  AstrophysicsStateSnapshot,
} from "./astrophysics.models"
import { AstrophysicsOverlayOptions } from "./astrophysics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 2048
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

export interface AstrophysicsViewportGeometry {
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

export class AstrophysicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<AstrophysicsWebGpuRenderer | null> {
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

    return new AstrophysicsWebGpuRenderer(canvas, {
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
    snapshot: AstrophysicsStateSnapshot,
    scenario: AstrophysicsScenario,
    overlays: AstrophysicsOverlayOptions,
    samples: readonly AstrophysicsSample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices } = buildAstrophysicsViewportGeometry(
      snapshot,
      scenario,
      overlays,
      samples,
    )
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

    draw(pass, this.resources, lineVertices.length / 2, [0.56, 0.79, 0.9, 1])
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.lineBuffer.destroy?.()
    this.resources.colorBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

export function buildAstrophysicsViewportGeometry(
  snapshot: AstrophysicsStateSnapshot,
  scenario: AstrophysicsScenario,
  overlays: AstrophysicsOverlayOptions,
  samples: readonly AstrophysicsSample[],
): AstrophysicsViewportGeometry {
  if (scenario.id === "stellar-luminosity") {
    return buildStellarLuminosityViewportGeometry(snapshot, overlays, samples)
  }

  if (scenario.id === "hubble-expansion") {
    return buildHubbleExpansionViewportGeometry(snapshot, overlays, samples)
  }

  return buildPlanetaryOrbitViewportGeometry(snapshot, overlays, samples)
}

function buildPlanetaryOrbitViewportGeometry(
  snapshot: AstrophysicsStateSnapshot,
  overlays: AstrophysicsOverlayOptions,
  samples: readonly AstrophysicsSample[],
): AstrophysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9 }
  const scale = buildScale(
    samples.map((sample) => ({
      x: sample.position,
      y: sample.primaryValue,
    })),
    plotArea,
    1,
  )

  if (overlays.showReferenceGuides) {
    appendLine(vertices, scale.area.left, 0, scale.area.right, 0)
    appendLine(vertices, 0, scale.area.top, 0, scale.area.bottom)
    const periapsis =
      -(snapshot.orbitalRadiusAstronomicalUnits ?? 1) * (snapshot.orbitalEccentricity ?? 0)
    const periapsisX = projectX(periapsis, scale)
    appendLine(vertices, periapsisX, scale.area.top, periapsisX, scale.area.bottom)
  }

  if (overlays.showComparisonBand) {
    const radius = snapshot.orbitalRadiusAstronomicalUnits ?? 1
    appendEllipse(vertices, scale, radius, radius, 64, 0)
  }

  appendPolyline(vertices, samples, scale, "primaryValue")

  if (overlays.showActiveMarker) {
    const activeSample = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (activeSample) {
      appendCrosshair(
        vertices,
        projectX(activeSample.position, scale),
        projectY(activeSample.primaryValue, scale),
        0.03,
      )
    }
  }

  return { lineVertices: new Float32Array(vertices) }
}

function buildStellarLuminosityViewportGeometry(
  snapshot: AstrophysicsStateSnapshot,
  overlays: AstrophysicsOverlayOptions,
  samples: readonly AstrophysicsSample[],
): AstrophysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9 }
  const scale = buildScale(
    samples.flatMap((sample) => [
      { x: sample.position, y: sample.primaryValue },
      { x: sample.position, y: sample.secondaryValue ?? sample.primaryValue },
    ]),
    plotArea,
    1,
  )

  if (overlays.showReferenceGuides) {
    const inner = projectX(snapshot.habitableZoneInnerAstronomicalUnits ?? 1, scale)
    const outer = projectX(snapshot.habitableZoneOuterAstronomicalUnits ?? 1.5, scale)
    appendLine(vertices, inner, scale.area.top, inner, scale.area.bottom)
    appendLine(vertices, outer, scale.area.top, outer, scale.area.bottom)
    appendLine(vertices, scale.area.left, projectY(1, scale), scale.area.right, projectY(1, scale))
  }

  appendPolyline(vertices, samples, scale, "primaryValue")

  if (overlays.showComparisonBand) {
    appendPolyline(vertices, samples, scale, "secondaryValue")
  }

  if (overlays.showActiveMarker) {
    const activeSample = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (activeSample) {
      appendCrosshair(
        vertices,
        projectX(activeSample.position, scale),
        projectY(activeSample.primaryValue, scale),
        0.03,
      )
    }
  }

  return { lineVertices: new Float32Array(vertices) }
}

function buildHubbleExpansionViewportGeometry(
  snapshot: AstrophysicsStateSnapshot,
  overlays: AstrophysicsOverlayOptions,
  samples: readonly AstrophysicsSample[],
): AstrophysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9 }
  const scale = buildScale(
    samples.flatMap((sample) => [
      { x: sample.position, y: sample.primaryValue },
      { x: sample.position, y: (sample.secondaryValue ?? 0) * 20_000 },
    ]),
    plotArea,
    1,
  )

  if (overlays.showReferenceGuides) {
    appendLine(vertices, scale.area.left, projectY(0, scale), scale.area.right, projectY(0, scale))
    appendLine(
      vertices,
      projectX(snapshot.distanceMegaparsecs ?? 400, scale),
      scale.area.top,
      projectX(snapshot.distanceMegaparsecs ?? 400, scale),
      scale.area.bottom,
    )
  }

  appendPolyline(vertices, samples, scale, "primaryValue")

  if (overlays.showComparisonBand) {
    const scaledSamples = samples.map((sample) => ({
      ...sample,
      secondaryValue: (sample.secondaryValue ?? 0) * 20_000,
    }))
    appendPolyline(vertices, scaledSamples, scale, "secondaryValue")
  }

  if (overlays.showActiveMarker) {
    const activeSample = samples.find((sample) => sample.active) ?? samples.at(-1)
    if (activeSample) {
      appendCrosshair(
        vertices,
        projectX(activeSample.position, scale),
        projectY(activeSample.primaryValue, scale),
        0.03,
      )
    }
  }

  return { lineVertices: new Float32Array(vertices) }
}

function appendPolyline(
  vertices: number[],
  samples: readonly AstrophysicsSample[],
  scale: ValueScale,
  valueKey: "primaryValue" | "secondaryValue",
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previousSample = samples[index - 1]
    const currentSample = samples[index]
    const previousValue = previousSample[valueKey]
    const currentValue = currentSample[valueKey]
    if (previousValue === undefined || currentValue === undefined) {
      continue
    }

    appendLine(
      vertices,
      projectX(previousSample.position, scale),
      projectY(previousValue, scale),
      projectX(currentSample.position, scale),
      projectY(currentValue, scale),
    )
  }
}

function appendEllipse(
  vertices: number[],
  scale: ValueScale,
  radiusX: number,
  radiusY: number,
  segments: number,
  offsetX: number,
): void {
  let previousX = offsetX + radiusX
  let previousY = 0
  for (let index = 1; index <= segments; index += 1) {
    const angle = (index / segments) * 2 * Math.PI
    const currentX = offsetX + radiusX * Math.cos(angle)
    const currentY = radiusY * Math.sin(angle)
    appendLine(
      vertices,
      projectX(previousX, scale),
      projectY(previousY, scale),
      projectX(currentX, scale),
      projectY(currentY, scale),
    )
    previousX = currentX
    previousY = currentY
  }
}

function appendCrosshair(vertices: number[], x: number, y: number, size: number): void {
  appendLine(vertices, x - size, y, x + size, y)
  appendLine(vertices, x, y - size, x, y + size)
}

function buildScale(
  points: readonly { x: number; y: number }[],
  area: PlotArea,
  minimumRange: number,
): ValueScale {
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const xPadding = Math.max((maxX - minX) * 0.1, minimumRange * 0.1)
  const yPadding = Math.max((maxY - minY) * 0.15, minimumRange * 0.1)

  return {
    minX: minX - xPadding,
    maxX: maxX + xPadding,
    minY: minY - yPadding,
    maxY: maxY + yPadding,
    area,
  }
}

function projectX(value: number, scale: ValueScale): number {
  const normalized = (value - scale.minX) / Math.max(scale.maxX - scale.minX, 1e-6)
  return scale.area.left + normalized * (scale.area.right - scale.area.left)
}

function projectY(value: number, scale: ValueScale): number {
  const normalized = (value - scale.minY) / Math.max(scale.maxY - scale.minY, 1e-6)
  return scale.area.bottom - normalized * (scale.area.bottom - scale.area.top)
}

function appendLine(vertices: number[], x1: number, y1: number, x2: number, y2: number): void {
  vertices.push(x1, y1, x2, y2)
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
  const devicePixelRatio = globalThis.devicePixelRatio || 1
  const displayWidth = Math.max(Math.floor(canvas.clientWidth * devicePixelRatio), 1)
  const displayHeight = Math.max(Math.floor(canvas.clientHeight * devicePixelRatio), 1)
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth
    canvas.height = displayHeight
  }
}

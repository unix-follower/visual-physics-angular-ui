import {
  AtmosphericPhysicsOverlayOptions,
  AtmosphericPhysicsSample,
  AtmosphericPhysicsScenario,
  AtmosphericPhysicsStateSnapshot,
} from "./atmospheric-physics.models"

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

export interface AtmosphericPhysicsViewportGeometry {
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

export class AtmosphericPhysicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<AtmosphericPhysicsWebGpuRenderer | null> {
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

    return new AtmosphericPhysicsWebGpuRenderer(canvas, {
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
    snapshot: AtmosphericPhysicsStateSnapshot,
    scenario: AtmosphericPhysicsScenario,
    overlays: AtmosphericPhysicsOverlayOptions,
    samples: readonly AtmosphericPhysicsSample[],
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices } = buildAtmosphericPhysicsViewportGeometry(
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

    draw(pass, this.resources, lineVertices.length / 2, [0.58, 0.82, 0.93, 1])
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.lineBuffer.destroy?.()
    this.resources.colorBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

export function buildAtmosphericPhysicsViewportGeometry(
  snapshot: AtmosphericPhysicsStateSnapshot,
  scenario: AtmosphericPhysicsScenario,
  overlays: AtmosphericPhysicsOverlayOptions,
  samples: readonly AtmosphericPhysicsSample[],
): AtmosphericPhysicsViewportGeometry {
  if (scenario.id === "adiabatic-lapse-rate") {
    return buildAdiabaticViewportGeometry(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "convection-column") {
    return buildConvectionViewportGeometry(snapshot, scenario, overlays, samples)
  }

  return buildBarometricViewportGeometry(snapshot, overlays, samples)
}

function buildBarometricViewportGeometry(
  snapshot: AtmosphericPhysicsStateSnapshot,
  overlays: AtmosphericPhysicsOverlayOptions,
  samples: readonly AtmosphericPhysicsSample[],
): AtmosphericPhysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.85, top: 0.85, bottom: -0.85 }
  const scale = buildScale(
    samples.map((sample) => ({
      x: sample.position,
      y: sample.primaryValue,
    })),
    plotArea,
    1,
  )

  pushLine(vertices, plotArea.left, plotArea.bottom, plotArea.left, plotArea.top)
  pushLine(vertices, plotArea.left, plotArea.bottom, plotArea.right, plotArea.bottom)
  pushPolyline(vertices, samples, scale)

  if (overlays.showReferenceGuides) {
    pushVerticalGuide(vertices, scale, 8.4, plotArea, 1)
    pushHorizontalGuide(vertices, scale, 50.6625, plotArea, 1)
  }

  if (overlays.showComparisonBand) {
    pushHorizontalGuide(vertices, scale, snapshot.pressureKilopascals ?? 0, plotArea, 0.8)
  }

  if (overlays.showActiveMarker) {
    pushMarker(
      vertices,
      scalePoint(scale, snapshot.altitudeKilometers ?? 0, snapshot.pressureKilopascals ?? 0),
      0.035,
    )
  }

  return { lineVertices: new Float32Array(vertices) }
}

function buildAdiabaticViewportGeometry(
  snapshot: AtmosphericPhysicsStateSnapshot,
  scenario: AtmosphericPhysicsScenario,
  overlays: AtmosphericPhysicsOverlayOptions,
  samples: readonly AtmosphericPhysicsSample[],
): AtmosphericPhysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.9, right: 0.85, top: 0.85, bottom: -0.85 }
  const values = samples.flatMap((sample) => [
    { x: sample.position, y: sample.primaryValue },
    { x: sample.position, y: sample.secondaryValue ?? sample.primaryValue },
  ])
  const scale = buildScale(values, plotArea, 4, 4)

  pushLine(vertices, plotArea.left, plotArea.bottom, plotArea.left, plotArea.top)
  pushLine(vertices, plotArea.left, plotArea.bottom, plotArea.right, plotArea.bottom)
  pushPolyline(vertices, samples, scale)

  if (overlays.showComparisonBand) {
    pushSecondaryPolyline(vertices, samples, scale)
  }

  if (overlays.showReferenceGuides) {
    pushVerticalGuide(vertices, scale, scenario.tropopauseHeightKilometers ?? 11, plotArea, 1)
  }

  if (overlays.showActiveMarker) {
    pushMarker(
      vertices,
      scalePoint(scale, snapshot.altitudeKilometers ?? 0, snapshot.temperatureKelvin ?? 0),
      0.035,
    )
  }

  return { lineVertices: new Float32Array(vertices) }
}

function buildConvectionViewportGeometry(
  snapshot: AtmosphericPhysicsStateSnapshot,
  scenario: AtmosphericPhysicsScenario,
  overlays: AtmosphericPhysicsOverlayOptions,
  samples: readonly AtmosphericPhysicsSample[],
): AtmosphericPhysicsViewportGeometry {
  const vertices: number[] = []
  const plotArea: PlotArea = { left: -0.85, right: 0.85, top: 0.85, bottom: -0.85 }
  const values = samples.flatMap((sample) => [
    { x: sample.position, y: sample.primaryValue },
    { x: sample.position, y: (sample.secondaryValue ?? 0) * 30 },
  ])
  const scale = buildScale(values, plotArea, 1, 1)

  pushLine(vertices, -0.55, plotArea.bottom, -0.55, plotArea.top)
  pushLine(vertices, 0.55, plotArea.bottom, 0.55, plotArea.top)
  pushPolyline(vertices, samples, scale)

  if (overlays.showComparisonBand) {
    pushSecondaryPolylineScaled(vertices, samples, scale, 30)
  }

  if (overlays.showReferenceGuides) {
    pushVerticalGuide(vertices, scale, (scenario.columnHeightKilometers ?? 9) * 0.5, plotArea, 1)
  }

  if (overlays.showActiveMarker) {
    pushMarker(
      vertices,
      scalePoint(
        scale,
        snapshot.parcelAltitudeKilometers ?? 0,
        snapshot.updraftVelocityMetersPerSecond ?? 0,
      ),
      0.04,
    )
  }

  return { lineVertices: new Float32Array(vertices) }
}

function buildScale(
  points: readonly { x: number; y: number }[],
  area: PlotArea,
  xPadding: number,
  yPadding?: number,
): ValueScale {
  const xValues = points.map((point) => point.x)
  const yValues = points.map((point) => point.y)
  const minX = Math.min(...xValues) - xPadding
  const maxX = Math.max(...xValues) + xPadding
  const minY = Math.min(...yValues) - (yPadding ?? xPadding)
  const maxY = Math.max(...yValues) + (yPadding ?? xPadding)

  return { minX, maxX, minY, maxY, area }
}

function scalePoint(scale: ValueScale, x: number, y: number): { x: number; y: number } {
  const width = scale.area.right - scale.area.left
  const height = scale.area.top - scale.area.bottom
  const normalizedX = (x - scale.minX) / Math.max(scale.maxX - scale.minX, 1e-6)
  const normalizedY = (y - scale.minY) / Math.max(scale.maxY - scale.minY, 1e-6)

  return {
    x: scale.area.left + normalizedX * width,
    y: scale.area.bottom + normalizedY * height,
  }
}

function pushPolyline(
  vertices: number[],
  samples: readonly AtmosphericPhysicsSample[],
  scale: ValueScale,
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = scalePoint(scale, samples[index - 1].position, samples[index - 1].primaryValue)
    const current = scalePoint(scale, samples[index].position, samples[index].primaryValue)
    pushLine(vertices, previous.x, previous.y, current.x, current.y)
  }
}

function pushSecondaryPolyline(
  vertices: number[],
  samples: readonly AtmosphericPhysicsSample[],
  scale: ValueScale,
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = scalePoint(
      scale,
      samples[index - 1].position,
      samples[index - 1].secondaryValue ?? samples[index - 1].primaryValue,
    )
    const current = scalePoint(
      scale,
      samples[index].position,
      samples[index].secondaryValue ?? samples[index].primaryValue,
    )
    pushLine(vertices, previous.x, previous.y, current.x, current.y)
  }
}

function pushSecondaryPolylineScaled(
  vertices: number[],
  samples: readonly AtmosphericPhysicsSample[],
  scale: ValueScale,
  factor: number,
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = scalePoint(
      scale,
      samples[index - 1].position,
      (samples[index - 1].secondaryValue ?? 0) * factor,
    )
    const current = scalePoint(
      scale,
      samples[index].position,
      (samples[index].secondaryValue ?? 0) * factor,
    )
    pushLine(vertices, previous.x, previous.y, current.x, current.y)
  }
}

function pushVerticalGuide(
  vertices: number[],
  scale: ValueScale,
  x: number,
  area: PlotArea,
  alpha: number,
): void {
  const point = scalePoint(scale, x, scale.minY + alpha)
  pushLine(vertices, point.x, area.bottom, point.x, area.top)
}

function pushHorizontalGuide(
  vertices: number[],
  scale: ValueScale,
  y: number,
  area: PlotArea,
  alpha: number,
): void {
  const point = scalePoint(scale, scale.minX + alpha, y)
  pushLine(vertices, area.left, point.y, area.right, point.y)
}

function pushMarker(vertices: number[], point: { x: number; y: number }, size: number): void {
  pushLine(vertices, point.x - size, point.y, point.x + size, point.y)
  pushLine(vertices, point.x, point.y - size, point.x, point.y + size)
}

function pushLine(vertices: number[], x1: number, y1: number, x2: number, y2: number): void {
  vertices.push(x1, y1, x2, y2)
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const width = Math.max(Math.floor(canvas.clientWidth || 640), 1)
  const height = Math.max(Math.floor(canvas.clientHeight || 320), 1)
  if (canvas.width === width && canvas.height === height) {
    return
  }

  canvas.width = width
  canvas.height = height
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

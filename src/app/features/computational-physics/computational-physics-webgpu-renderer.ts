import {
  ComputationalPhysicsScenario,
  SolverComparisonSample,
  SolverComparisonState,
  Vector2,
} from "./computational-physics.models"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 1024
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

export interface ComputationalPhysicsOverlayOptions {
  showReferenceTrajectory: boolean
  showEulerTrajectory: boolean
  showSymplecticTrajectory: boolean
  showRk4Trajectory: boolean
  showErrorBars: boolean
}

export interface ViewportGeometry {
  axes: Vector2[]
  referenceTrajectory: Vector2[]
  eulerTrajectory: Vector2[]
  symplecticTrajectory: Vector2[]
  rk4Trajectory: Vector2[]
  errorBars: Vector2[]
  markerPoints: Vector2[]
}

export class ComputationalPhysicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(
    canvas: HTMLCanvasElement,
  ): Promise<ComputationalPhysicsWebGpuRenderer | null> {
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
    return new ComputationalPhysicsWebGpuRenderer(canvas, {
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
    currentState: SolverComparisonState,
    scenario: ComputationalPhysicsScenario,
    overlays: ComputationalPhysicsOverlayOptions,
    samples: readonly SolverComparisonSample[],
  ): void {
    resizeCanvas(this.canvas)

    const geometry = buildViewportGeometry(currentState, scenario, overlays, samples)
    const { device, context } = this.resources
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.965, g: 0.94, b: 0.905, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    })

    drawLineSet(pass, this.resources, geometry.axes, [0.54, 0.51, 0.47, 1])
    drawLineSet(pass, this.resources, geometry.referenceTrajectory, [0.12, 0.16, 0.22, 1])
    drawLineSet(pass, this.resources, geometry.eulerTrajectory, [0.76, 0.25, 0.05, 1])
    drawLineSet(pass, this.resources, geometry.symplecticTrajectory, [0.73, 0.54, 0.09, 1])
    drawLineSet(pass, this.resources, geometry.rk4Trajectory, [0.06, 0.46, 0.43, 1])
    drawLineSegments(pass, this.resources, geometry.errorBars, [0.58, 0.64, 0.72, 1])
    drawMarkers(pass, this.resources, geometry.markerPoints, [0.11, 0.12, 0.16, 1])

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

export function buildViewportGeometry(
  currentState: SolverComparisonState,
  scenario: ComputationalPhysicsScenario,
  overlays: ComputationalPhysicsOverlayOptions,
  samples: readonly SolverComparisonSample[],
): ViewportGeometry {
  const axes = buildAxes(scenario)
  const referenceTrajectory = overlays.showReferenceTrajectory
    ? samples.map((sample) => normalize(sample.referencePosition, scenario))
    : []
  const eulerTrajectory = overlays.showEulerTrajectory
    ? samples.map((sample) => normalize(sample.eulerPosition, scenario))
    : []
  const symplecticTrajectory = overlays.showSymplecticTrajectory
    ? samples.map((sample) => normalize(sample.symplecticPosition, scenario))
    : []
  const rk4Trajectory = overlays.showRk4Trajectory
    ? samples.map((sample) => normalize(sample.rk4Position, scenario))
    : []
  const errorBars = overlays.showErrorBars
    ? [
        normalize(currentState.referencePosition, scenario),
        normalize(currentState.eulerPosition, scenario),
        normalize(currentState.referencePosition, scenario),
        normalize(currentState.symplecticPosition, scenario),
        normalize(currentState.referencePosition, scenario),
        normalize(currentState.rk4Position, scenario),
      ]
    : []

  return {
    axes,
    referenceTrajectory,
    eulerTrajectory,
    symplecticTrajectory,
    rk4Trajectory,
    errorBars,
    markerPoints: [
      normalize(currentState.referencePosition, scenario),
      normalize(currentState.eulerPosition, scenario),
      normalize(currentState.symplecticPosition, scenario),
      normalize(currentState.rk4Position, scenario),
    ],
  }
}

function buildAxes(scenario: ComputationalPhysicsScenario): Vector2[] {
  return [
    normalize({ x: scenario.viewBounds.minX, y: 0 }, scenario),
    normalize({ x: scenario.viewBounds.maxX, y: 0 }, scenario),
    normalize({ x: 0, y: scenario.viewBounds.minY }, scenario),
    normalize({ x: 0, y: scenario.viewBounds.maxY }, scenario),
  ]
}

function normalize(value: Vector2, scenario: ComputationalPhysicsScenario): Vector2 {
  const { minX, maxX, minY, maxY } = scenario.viewBounds
  return {
    x: (value.x - minX) / Math.max(maxX - minX, 1e-6),
    y: 1 - (value.y - minY) / Math.max(maxY - minY, 1e-6),
  }
}

function drawLineSet(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  points: readonly Vector2[],
  color: [number, number, number, number],
): void {
  const vertices = buildLineStripVertices(points)
  if (vertices.length === 0) {
    return
  }

  resources.device.queue.writeBuffer(resources.lineBuffer, 0, vertices)
  draw(pass, resources, resources.linePipeline, resources.lineBuffer, vertices.length / 2, color)
}

function drawLineSegments(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  points: readonly Vector2[],
  color: [number, number, number, number],
): void {
  const vertices = buildSegmentVertices(points)
  if (vertices.length === 0) {
    return
  }

  resources.device.queue.writeBuffer(resources.lineBuffer, 0, vertices)
  draw(pass, resources, resources.linePipeline, resources.lineBuffer, vertices.length / 2, color)
}

function drawMarkers(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  points: readonly Vector2[],
  color: [number, number, number, number],
): void {
  const vertices = buildMarkerVertices(points)
  if (vertices.length === 0) {
    return
  }

  resources.device.queue.writeBuffer(resources.markerBuffer, 0, vertices)
  draw(
    pass,
    resources,
    resources.trianglePipeline,
    resources.markerBuffer,
    vertices.length / 2,
    color,
  )
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

function buildLineStripVertices(points: readonly Vector2[]): Float32Array {
  if (points.length < 2) {
    return new Float32Array()
  }

  const vertices: number[] = []
  for (let index = 1; index < points.length; index += 1) {
    appendNdcPoint(vertices, points[index - 1])
    appendNdcPoint(vertices, points[index])
  }

  return new Float32Array(vertices)
}

function buildSegmentVertices(points: readonly Vector2[]): Float32Array {
  if (points.length < 2) {
    return new Float32Array()
  }

  const vertices: number[] = []
  for (let index = 1; index < points.length; index += 2) {
    appendNdcPoint(vertices, points[index - 1])
    appendNdcPoint(vertices, points[index])
  }

  return new Float32Array(vertices)
}

function buildMarkerVertices(points: readonly Vector2[]): Float32Array {
  const vertices: number[] = []
  for (const point of points) {
    appendTriangle(vertices, point, 0.018)
  }
  return new Float32Array(vertices)
}

function appendTriangle(vertices: number[], point: Vector2, size: number): void {
  appendNdcPoint(vertices, { x: point.x, y: point.y - size })
  appendNdcPoint(vertices, { x: point.x - size, y: point.y + size })
  appendNdcPoint(vertices, { x: point.x + size, y: point.y + size })
}

function appendNdcPoint(vertices: number[], point: Vector2): void {
  vertices.push(point.x * 2 - 1, point.y * 2 - 1)
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const width = canvas.clientWidth || 640
  const height = canvas.clientHeight || 320
  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }
}

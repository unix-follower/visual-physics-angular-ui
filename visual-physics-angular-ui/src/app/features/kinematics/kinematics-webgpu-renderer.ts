import { KinematicsSample, KinematicsScenario, KinematicsStateSnapshot } from "./kinematics.models"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const MAX_SAMPLES = 64
const AXIS_VERTEX_COUNT = 2
const VECTOR_VERTEX_COUNT = 2
const MARKER_VERTEX_COUNT = 6
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
  format: string
  colorBuffer: GpuBufferLike
  xAxisBuffer: GpuBufferLike
  yAxisBuffer: GpuBufferLike
  trajectoryBuffer: GpuBufferLike
  positionVectorBuffer: GpuBufferLike
  velocityVectorBuffer: GpuBufferLike
  accelerationVectorBuffer: GpuBufferLike
  markerBuffer: GpuBufferLike
  linePipeline: GpuRenderPipelineLike
  trianglePipeline: GpuRenderPipelineLike
  bindGroup: unknown
}

export interface VectorOverlayOptions {
  showPositionVector: boolean
  showVelocityVector: boolean
  showAccelerationVector: boolean
}

export class KinematicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<KinematicsWebGpuRenderer | null> {
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
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    })

    const shaderModule = device.createShaderModule({
      code: `
        struct Uniforms {
          color: vec4f,
        };

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

    const linePipeline = device.createRenderPipeline({
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
      primitive: {
        topology: "line-list",
      },
    })

    const trianglePipeline = device.createRenderPipeline({
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
      primitive: {
        topology: "triangle-list",
      },
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

    return new KinematicsWebGpuRenderer(canvas, {
      device,
      context,
      format,
      colorBuffer,
      xAxisBuffer: device.createBuffer({
        size: AXIS_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      yAxisBuffer: device.createBuffer({
        size: AXIS_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      trajectoryBuffer: device.createBuffer({
        size: MAX_SAMPLES * 2 * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      positionVectorBuffer: device.createBuffer({
        size: VECTOR_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      velocityVectorBuffer: device.createBuffer({
        size: VECTOR_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      accelerationVectorBuffer: device.createBuffer({
        size: VECTOR_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      markerBuffer: device.createBuffer({
        size: MARKER_VERTEX_COUNT * VERTEX_SIZE,
        usage: vertexUsage,
      }),
      linePipeline,
      trianglePipeline,
      bindGroup,
    })
  }

  render(
    snapshot: KinematicsStateSnapshot,
    samples: readonly KinematicsSample[],
    scenario: KinematicsScenario,
    overlays: VectorOverlayOptions,
  ): void {
    resizeCanvas(this.canvas)

    const { device, context } = this.resources
    const xAxisVertices = new Float32Array([
      ...toNdcPoint(scenario.viewBounds.minX, 0, scenario),
      ...toNdcPoint(scenario.viewBounds.maxX, 0, scenario),
    ])
    const yAxisVertices = new Float32Array([
      ...toNdcPoint(0, scenario.viewBounds.minY, scenario),
      ...toNdcPoint(0, scenario.viewBounds.maxY, scenario),
    ])
    const trajectoryVertices = buildTrajectoryVertices(samples, scenario)
    const positionVectorVertices = buildVectorVertices({ x: 0, y: 0 }, snapshot.position, scenario)
    const velocityVectorVertices = buildVectorVertices(
      snapshot.position,
      {
        x: snapshot.position.x + snapshot.velocity.x * 0.45,
        y: snapshot.position.y + snapshot.velocity.y * 0.45,
      },
      scenario,
    )
    const accelerationVectorVertices = buildVectorVertices(
      snapshot.position,
      {
        x: snapshot.position.x + snapshot.acceleration.x * 0.7,
        y: snapshot.position.y + snapshot.acceleration.y * 0.7,
      },
      scenario,
    )
    const markerVertices = buildMarkerVertices(snapshot, scenario, this.canvas)

    device.queue.writeBuffer(this.resources.xAxisBuffer, 0, xAxisVertices)
    device.queue.writeBuffer(this.resources.yAxisBuffer, 0, yAxisVertices)
    device.queue.writeBuffer(this.resources.trajectoryBuffer, 0, trajectoryVertices)
    device.queue.writeBuffer(this.resources.positionVectorBuffer, 0, positionVectorVertices)
    device.queue.writeBuffer(this.resources.velocityVectorBuffer, 0, velocityVectorVertices)
    device.queue.writeBuffer(this.resources.accelerationVectorBuffer, 0, accelerationVectorVertices)
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

    drawLines(
      pass,
      this.resources,
      this.resources.xAxisBuffer,
      AXIS_VERTEX_COUNT,
      [0.26, 0.41, 0.55, 1],
    )
    drawLines(
      pass,
      this.resources,
      this.resources.yAxisBuffer,
      AXIS_VERTEX_COUNT,
      [0.26, 0.41, 0.55, 1],
    )

    if (trajectoryVertices.length > 0) {
      drawLines(
        pass,
        this.resources,
        this.resources.trajectoryBuffer,
        trajectoryVertices.length / 2,
        [0.35, 0.85, 1, 1],
      )
    }

    if (overlays.showPositionVector) {
      drawLines(
        pass,
        this.resources,
        this.resources.positionVectorBuffer,
        VECTOR_VERTEX_COUNT,
        [0.98, 0.9, 0.47, 1],
      )
    }

    if (overlays.showVelocityVector) {
      drawLines(
        pass,
        this.resources,
        this.resources.velocityVectorBuffer,
        VECTOR_VERTEX_COUNT,
        [0.45, 0.96, 0.66, 1],
      )
    }

    if (overlays.showAccelerationVector) {
      drawLines(
        pass,
        this.resources,
        this.resources.accelerationVectorBuffer,
        VECTOR_VERTEX_COUNT,
        [1, 0.54, 0.36, 1],
      )
    }

    drawMarker(pass, this.resources, markerVertices.length / 2, [1, 0.54, 0.36, 1])
    pass.end()
    device.queue.submit([encoder.finish()])
  }

  destroy(): void {
    this.resources.colorBuffer.destroy?.()
    this.resources.xAxisBuffer.destroy?.()
    this.resources.yAxisBuffer.destroy?.()
    this.resources.trajectoryBuffer.destroy?.()
    this.resources.positionVectorBuffer.destroy?.()
    this.resources.velocityVectorBuffer.destroy?.()
    this.resources.accelerationVectorBuffer.destroy?.()
    this.resources.markerBuffer.destroy?.()
    this.resources.device.destroy?.()
  }
}

function drawLines(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  buffer: GpuBufferLike,
  vertexCount: number,
  color: [number, number, number, number],
): void {
  resources.device.queue.writeBuffer(resources.colorBuffer, 0, new Float32Array(color))
  pass.setPipeline(resources.linePipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, buffer)
  pass.draw(vertexCount)
}

function drawMarker(
  pass: GpuRenderPassEncoderLike,
  resources: RendererResources,
  vertexCount: number,
  color: [number, number, number, number],
): void {
  resources.device.queue.writeBuffer(resources.colorBuffer, 0, new Float32Array(color))
  pass.setPipeline(resources.trianglePipeline)
  pass.setBindGroup(0, resources.bindGroup)
  pass.setVertexBuffer(0, resources.markerBuffer)
  pass.draw(vertexCount)
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

function buildTrajectoryVertices(
  samples: readonly KinematicsSample[],
  scenario: KinematicsScenario,
): Float32Array {
  if (samples.length < 2) {
    return new Float32Array()
  }

  const vertices = new Float32Array((samples.length - 1) * 4)
  let cursor = 0

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index]
    const next = samples[index + 1]
    const currentPoint = toNdcPoint(current.xPosition, current.yPosition, scenario)
    const nextPoint = toNdcPoint(next.xPosition, next.yPosition, scenario)

    vertices[cursor] = currentPoint[0]
    vertices[cursor + 1] = currentPoint[1]
    vertices[cursor + 2] = nextPoint[0]
    vertices[cursor + 3] = nextPoint[1]
    cursor += 4
  }

  return vertices
}

function buildVectorVertices(
  from: { x: number; y: number },
  to: { x: number; y: number },
  scenario: KinematicsScenario,
): Float32Array {
  return new Float32Array([
    ...toNdcPoint(from.x, from.y, scenario),
    ...toNdcPoint(to.x, to.y, scenario),
  ])
}

function buildMarkerVertices(
  snapshot: KinematicsStateSnapshot,
  scenario: KinematicsScenario,
  canvas: HTMLCanvasElement,
): Float32Array {
  const [centerX, centerY] = toNdcPoint(snapshot.position.x, snapshot.position.y, scenario)
  const aspect = canvas.height === 0 ? 1 : canvas.width / canvas.height
  const halfWidth = 0.022
  const halfHeight = aspect >= 1 ? halfWidth * aspect : halfWidth / Math.max(aspect, 0.001)

  return new Float32Array([
    centerX - halfWidth,
    centerY - halfHeight,
    centerX + halfWidth,
    centerY - halfHeight,
    centerX - halfWidth,
    centerY + halfHeight,
    centerX - halfWidth,
    centerY + halfHeight,
    centerX + halfWidth,
    centerY - halfHeight,
    centerX + halfWidth,
    centerY + halfHeight,
  ])
}

function toNdcPoint(x: number, y: number, scenario: KinematicsScenario): [number, number] {
  const { minX, maxX, minY, maxY } = scenario.viewBounds
  const normalizedX = ((x - minX) / Math.max(maxX - minX, 1e-6)) * 2 - 1
  const normalizedY = ((y - minY) / Math.max(maxY - minY, 1e-6)) * 2 - 1

  return [clamp(normalizedX, -0.96, 0.96), clamp(normalizedY, -0.96, 0.96)]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

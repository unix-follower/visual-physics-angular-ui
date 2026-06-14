import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenario,
  ElectronicsAndCircuitsStateSnapshot,
} from "./electronics-and-circuits.models"
import { ElectronicsAndCircuitsOverlayOptions } from "./electronics-and-circuits-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 768
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

export interface ElectronicsAndCircuitsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class ElectronicsAndCircuitsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(
    canvas: HTMLCanvasElement,
  ): Promise<ElectronicsAndCircuitsWebGpuRenderer | null> {
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
    return new ElectronicsAndCircuitsWebGpuRenderer(canvas, {
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
    snapshot: ElectronicsAndCircuitsStateSnapshot,
    scenario: ElectronicsAndCircuitsScenario,
    overlays: ElectronicsAndCircuitsOverlayOptions,
    samples: readonly ElectronicsAndCircuitsSample[],
  ): void {
    resizeCanvas(this.canvas)
    const { lineVertices, markerVertices } = buildElectronicsAndCircuitsViewportGeometry(
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
          clearValue: { r: 0.02, g: 0.04, b: 0.08, a: 1 },
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
      [0.98, 0.79, 0.33, 1],
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

export function buildElectronicsAndCircuitsViewportGeometry(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): ElectronicsAndCircuitsViewportGeometry {
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
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  if (scenario.id === "smoothed-rectifier") {
    return buildSmoothedRectifierLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "full-wave-rectifier") {
    return buildHalfWaveRectifierLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "half-wave-rectifier") {
    return buildHalfWaveRectifierLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rl-transient") {
    return buildRlTransientLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rl-high-pass") {
    return buildRlHighPassLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rl-low-pass") {
    return buildRlLowPassLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rc-high-pass") {
    return buildRcHighPassLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rc-low-pass") {
    return buildRcLowPassLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "resistor-network") {
    return buildResistorNetworkLineVertices(snapshot, scenario, overlays)
  }

  if (scenario.id === "rlc-resonance") {
    return buildRlcResonanceLineVertices(snapshot, scenario, overlays, samples)
  }

  if (scenario.id === "rlc-response") {
    return buildRlcResponseLineVertices(snapshot, scenario, overlays, samples)
  }

  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.charge / scenario.capacitance)
  }
  if (overlays.showEnergyMarkers) {
    const steadyStateY =
      0.5 * scenario.capacitance * scenario.sourceVoltage * scenario.sourceVoltage
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      steadyStateY,
      scenario.viewBounds.maxX,
      steadyStateY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRcLowPassLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(
      vertices,
      samples,
      scenario,
      (sample) => scenario.sourceVoltage - sample.outputVoltage,
    )
  }
  if (overlays.showEnergyMarkers) {
    const cutoffFrequency = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)
    const cutoffOutput = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    appendLine(
      vertices,
      cutoffFrequency,
      scenario.viewBounds.minY,
      cutoffFrequency,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      cutoffOutput,
      scenario.viewBounds.maxX,
      cutoffOutput,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRlTransientLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.storedEnergy)
  }
  if (overlays.showEnergyMarkers) {
    const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
    const steadyStateEnergy =
      0.5 * inductance * Math.pow(scenario.sourceVoltage / Math.max(scenario.resistance, 1e-6), 2)
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      steadyStateEnergy,
      scenario.viewBounds.maxX,
      steadyStateEnergy,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildHalfWaveRectifierLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showEnergyMarkers) {
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      snapshot.branchPower,
      scenario.viewBounds.maxX,
      snapshot.branchPower,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildSmoothedRectifierLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showEnergyMarkers) {
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      snapshot.storedEnergy,
      scenario.viewBounds.maxX,
      snapshot.storedEnergy,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRcHighPassLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showEnergyMarkers) {
    const cutoffFrequency = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)
    const cutoffOutput = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    appendLine(
      vertices,
      cutoffFrequency,
      scenario.viewBounds.minY,
      cutoffFrequency,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      cutoffOutput,
      scenario.viewBounds.maxX,
      cutoffOutput,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRlLowPassLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showEnergyMarkers) {
    const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
    const cutoffFrequency = scenario.resistance / (2 * Math.PI * inductance)
    const cutoffOutput = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    appendLine(
      vertices,
      cutoffFrequency,
      scenario.viewBounds.minY,
      cutoffFrequency,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      snapshot.storedEnergy,
      scenario.viewBounds.maxX,
      snapshot.storedEnergy,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      cutoffOutput,
      scenario.viewBounds.maxX,
      cutoffOutput,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRlHighPassLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.outputVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showEnergyMarkers) {
    const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
    const cutoffFrequency = scenario.resistance / (2 * Math.PI * inductance)
    const cutoffOutput = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    appendLine(
      vertices,
      cutoffFrequency,
      scenario.viewBounds.minY,
      cutoffFrequency,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      snapshot.storedEnergy,
      scenario.viewBounds.maxX,
      snapshot.storedEnergy,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      cutoffOutput,
      scenario.viewBounds.maxX,
      cutoffOutput,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRlcResponseLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
    appendCurrentReversalMarkers(vertices, samples, scenario)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.storedEnergy)
  }
  if (overlays.showEnergyMarkers) {
    appendSettlingBand(vertices, scenario)
    appendOvershootGuide(vertices, samples, scenario)
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildRlcResonanceLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): Float32Array {
  const vertices: number[] = []
  appendLine(vertices, scenario.viewBounds.minX, 0, scenario.viewBounds.maxX, 0, scenario)
  appendLine(vertices, 0, scenario.viewBounds.minY, 0, scenario.viewBounds.maxY, scenario)

  if (overlays.showVoltageTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.capacitorVoltage)
  }
  if (overlays.showCurrentTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.current * scenario.resistance)
  }
  if (overlays.showChargeTrace) {
    appendTrace(vertices, samples, scenario, (sample) => sample.branchPower)
  }
  if (overlays.showEnergyMarkers) {
    const inductance = Math.max(scenario.inductance ?? 1e-6, 1e-6)
    const resonantFrequency = 1 / (2 * Math.PI * Math.sqrt(inductance * scenario.capacitance))
    appendLine(
      vertices,
      resonantFrequency,
      scenario.viewBounds.minY,
      resonantFrequency,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      snapshot.timeSeconds,
      scenario.viewBounds.minY,
      snapshot.timeSeconds,
      scenario.viewBounds.maxY,
      scenario,
    )
    appendLine(
      vertices,
      scenario.viewBounds.minX,
      snapshot.branchPower,
      scenario.viewBounds.maxX,
      snapshot.branchPower,
      scenario,
    )
  }

  return new Float32Array(vertices)
}

function buildMarkerVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
): Float32Array {
  if (scenario.id === "resistor-network") {
    const x = 7
    const y = 0
    const markerSizeX = 0.25
    const markerSizeY = 0.35
    return new Float32Array([
      toClipX(x, scenario),
      toClipY(y + markerSizeY, scenario),
      toClipX(x - markerSizeX, scenario),
      toClipY(y - markerSizeY, scenario),
      toClipX(x + markerSizeX, scenario),
      toClipY(y - markerSizeY, scenario),
    ])
  }

  const markerSizeX = (scenario.viewBounds.maxX - scenario.viewBounds.minX) * 0.02
  const markerSizeY = (scenario.viewBounds.maxY - scenario.viewBounds.minY) * 0.03
  const x = snapshot.timeSeconds
  const y =
    scenario.id === "rc-high-pass" ||
    scenario.id === "rl-low-pass" ||
    scenario.id === "rl-high-pass" ||
    scenario.id === "rl-transient" ||
    scenario.id === "half-wave-rectifier" ||
    scenario.id === "full-wave-rectifier" ||
    scenario.id === "smoothed-rectifier"
      ? snapshot.outputVoltage
      : snapshot.capacitorVoltage
  const vertices = [
    toClipX(x, scenario),
    toClipY(y + markerSizeY, scenario),
    toClipX(x - markerSizeX, scenario),
    toClipY(y - markerSizeY, scenario),
    toClipX(x + markerSizeX, scenario),
    toClipY(y - markerSizeY, scenario),
  ]
  return new Float32Array(vertices)
}

function appendTrace(
  vertices: number[],
  samples: readonly ElectronicsAndCircuitsSample[],
  scenario: ElectronicsAndCircuitsScenario,
  valueAccessor: (sample: ElectronicsAndCircuitsSample) => number,
): void {
  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index]
    const end = samples[index + 1]
    appendLine(
      vertices,
      start.timeSeconds,
      valueAccessor(start),
      end.timeSeconds,
      valueAccessor(end),
      scenario,
    )
  }
}

function buildResistorNetworkLineVertices(
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  scenario: ElectronicsAndCircuitsScenario,
  overlays: ElectronicsAndCircuitsOverlayOptions,
): Float32Array {
  const vertices: number[] = []

  appendLine(vertices, 0, 0, 1.5, 0, scenario)
  appendLine(vertices, 1.5, -1.2, 1.5, 1.2, scenario)
  appendLine(vertices, 1.8, -1.2, 1.8, 1.2, scenario)
  appendLine(vertices, 1.8, 0, 3, 0, scenario)
  appendZigZag(vertices, 3, 0, 4.5, scenario)
  appendLine(vertices, 4.5, 0, 7, 0, scenario)
  appendZigZag(vertices, 7, 0, 8.5, scenario)
  appendLine(vertices, 8.5, 0, 10, 0, scenario)
  appendLine(vertices, 7, 0, 7, -1.4, scenario)
  appendLine(vertices, 5.5, -1.4, 8.5, -1.4, scenario)
  appendLine(vertices, 6, -1.8, 8, -1.8, scenario)
  appendLine(vertices, 6.5, -2.1, 7.5, -2.1, scenario)

  if (overlays.showVoltageTrace) {
    appendLine(vertices, 7, 0, 7, -1.8, scenario)
  }
  if (overlays.showCurrentTrace) {
    appendLine(vertices, 4.2, 0.55, 6.4, 0.55, scenario)
    appendLine(vertices, 6.4, 0.55, 6.0, 0.75, scenario)
    appendLine(vertices, 6.4, 0.55, 6.0, 0.35, scenario)
  }
  if (overlays.showChargeTrace) {
    appendLine(vertices, 3.75, 0, 3.75, 1.2, scenario)
    appendLine(vertices, 7.75, 0, 7.75, 1.2, scenario)
  }
  if (overlays.showEnergyMarkers) {
    const outputY =
      -0.3 - Math.min(snapshot.outputVoltage / Math.max(snapshot.sourceVoltage, 1e-3), 1.2)
    appendLine(vertices, 7, 0, 9.4, outputY, scenario)
    appendLine(vertices, 9.4, outputY, 10, outputY, scenario)
  }

  return new Float32Array(vertices)
}

function appendSettlingBand(vertices: number[], scenario: ElectronicsAndCircuitsScenario): void {
  const tolerance = Math.max(Math.abs(scenario.sourceVoltage) * 0.05, 0.05)
  appendLine(
    vertices,
    scenario.viewBounds.minX,
    scenario.sourceVoltage + tolerance,
    scenario.viewBounds.maxX,
    scenario.sourceVoltage + tolerance,
    scenario,
  )
  appendLine(
    vertices,
    scenario.viewBounds.minX,
    scenario.sourceVoltage - tolerance,
    scenario.viewBounds.maxX,
    scenario.sourceVoltage - tolerance,
    scenario,
  )
}

function appendOvershootGuide(
  vertices: number[],
  samples: readonly ElectronicsAndCircuitsSample[],
  scenario: ElectronicsAndCircuitsScenario,
): void {
  if (samples.length === 0) {
    return
  }

  let peakSample = samples[0]
  for (const sample of samples) {
    if (sample.capacitorVoltage > peakSample.capacitorVoltage) {
      peakSample = sample
    }
  }

  if (peakSample.capacitorVoltage <= scenario.sourceVoltage) {
    return
  }

  appendLine(
    vertices,
    peakSample.timeSeconds,
    scenario.sourceVoltage,
    peakSample.timeSeconds,
    peakSample.capacitorVoltage,
    scenario,
  )
  appendLine(
    vertices,
    peakSample.timeSeconds - scenario.durationSeconds * 0.02,
    peakSample.capacitorVoltage,
    peakSample.timeSeconds + scenario.durationSeconds * 0.02,
    peakSample.capacitorVoltage,
    scenario,
  )
}

function appendCurrentReversalMarkers(
  vertices: number[],
  samples: readonly ElectronicsAndCircuitsSample[],
  scenario: ElectronicsAndCircuitsScenario,
): void {
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1].current
    const current = samples[index].current
    if ((previous < 0 && current > 0) || (previous > 0 && current < 0)) {
      const markerX = samples[index].timeSeconds
      appendLine(
        vertices,
        markerX,
        scenario.viewBounds.minY + 0.25,
        markerX,
        scenario.viewBounds.minY + 1.0,
        scenario,
      )
    }
  }
}

function appendZigZag(
  vertices: number[],
  startX: number,
  y: number,
  endX: number,
  scenario: ElectronicsAndCircuitsScenario,
): void {
  const segment = (endX - startX) / 6
  appendLine(vertices, startX, y, startX + segment, y + 0.5, scenario)
  appendLine(vertices, startX + segment, y + 0.5, startX + segment * 2, y - 0.5, scenario)
  appendLine(vertices, startX + segment * 2, y - 0.5, startX + segment * 3, y + 0.5, scenario)
  appendLine(vertices, startX + segment * 3, y + 0.5, startX + segment * 4, y - 0.5, scenario)
  appendLine(vertices, startX + segment * 4, y - 0.5, startX + segment * 5, y + 0.5, scenario)
  appendLine(vertices, startX + segment * 5, y + 0.5, endX, y, scenario)
}

function appendLine(
  vertices: number[],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  scenario: ElectronicsAndCircuitsScenario,
): void {
  vertices.push(
    toClipX(startX, scenario),
    toClipY(startY, scenario),
    toClipX(endX, scenario),
    toClipY(endY, scenario),
  )
}

function toClipX(value: number, scenario: ElectronicsAndCircuitsScenario): number {
  return (
    ((value - scenario.viewBounds.minX) / (scenario.viewBounds.maxX - scenario.viewBounds.minX)) *
      2 -
    1
  )
}

function toClipY(value: number, scenario: ElectronicsAndCircuitsScenario): number {
  return (
    1 -
    ((value - scenario.viewBounds.minY) / (scenario.viewBounds.maxY - scenario.viewBounds.minY)) * 2
  )
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const width = canvas.clientWidth || 640
  const height = canvas.clientHeight || 320
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}

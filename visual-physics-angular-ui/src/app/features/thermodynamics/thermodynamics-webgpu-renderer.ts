import { ThermodynamicsScenario, ThermodynamicsStateSnapshot } from "./thermodynamics.models"
import { ThermodynamicsOverlayOptions } from "./thermodynamics-payload"

const FLOAT_BYTES = 4
const VERTEX_SIZE = 2 * FLOAT_BYTES
const UNIFORM_COLOR_SIZE = 4 * FLOAT_BYTES
const LINE_VERTEX_CAPACITY = 96
const TRIANGLE_VERTEX_CAPACITY = 48
const VERTEX_USAGE = 32
const UNIFORM_USAGE = 64
const COPY_DST_USAGE = 8
const IDEAL_GAS_ENERGY_GUIDE_Y = 3
const CONDUCTION_GUIDE_Y = 5
const CARNOT_AXIS_LEFT = 1.8
const CARNOT_AXIS_BOTTOM = 2
const CARNOT_AXIS_RIGHT = 8.8
const CARNOT_AXIS_TOP = 8.2

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

export interface ThermodynamicsViewportGeometry {
  lineVertices: Float32Array
  markerVertices: Float32Array
}

export class ThermodynamicsWebGpuRenderer {
  private readonly canvas: HTMLCanvasElement
  private readonly resources: RendererResources

  private constructor(canvas: HTMLCanvasElement, resources: RendererResources) {
    this.canvas = canvas
    this.resources = resources
  }

  static async create(canvas: HTMLCanvasElement): Promise<ThermodynamicsWebGpuRenderer | null> {
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
    return new ThermodynamicsWebGpuRenderer(canvas, {
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
    snapshot: ThermodynamicsStateSnapshot,
    scenario: ThermodynamicsScenario,
    overlays: ThermodynamicsOverlayOptions,
  ): void {
    resizeCanvas(this.canvas)

    const { lineVertices, markerVertices } = buildThermodynamicsViewportGeometry(
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
          clearValue: { r: 0.04, g: 0.05, b: 0.09, a: 1 },
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

export function buildThermodynamicsViewportGeometry(
  snapshot: ThermodynamicsStateSnapshot,
  scenario: ThermodynamicsScenario,
  overlays: ThermodynamicsOverlayOptions,
): ThermodynamicsViewportGeometry {
  if (scenario.id === "heat-conduction-slab") {
    return buildHeatConductionViewportGeometry(snapshot, overlays)
  }
  if (scenario.id === "carnot-cycle") {
    return buildCarnotViewportGeometry(snapshot, scenario, overlays)
  }

  return buildIdealGasViewportGeometry(snapshot, overlays)
}

function buildIdealGasViewportGeometry(
  snapshot: ThermodynamicsStateSnapshot,
  overlays: ThermodynamicsOverlayOptions,
): ThermodynamicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const chamberLeft = 2
  const chamberBottom = 2
  const chamberTop = 8
  const pistonX = Math.min(8.6, Math.max(4.2, 3 + (140 * (snapshot.pressureKpa ?? 0)) / 1000))
  const guideY = Math.min(7.4, Math.max(2.6, 2.8 + (snapshot.densityKgPerM3 ?? 0) * 2.2))
  const energyY = Math.min(7.8, Math.max(2.8, 2.5 + (snapshot.internalEnergyKj ?? 0) * 0.7))

  appendLine(lineVertices, chamberLeft, chamberBottom, chamberLeft, chamberTop)
  appendLine(lineVertices, chamberLeft, chamberBottom, 9, chamberBottom)
  appendLine(lineVertices, chamberLeft, chamberTop, 9, chamberTop)
  appendLine(lineVertices, 9, chamberBottom, 9, chamberTop)
  appendLine(lineVertices, pistonX, chamberBottom + 0.2, pistonX, chamberTop - 0.2)

  if (overlays.showPressureCurve) {
    appendLine(lineVertices, chamberLeft + 0.4, 7.2, pistonX - 0.2, 5.1)
    appendLine(lineVertices, pistonX - 0.2, 5.1, 9, 4.2)
  }
  if (overlays.showParticleGuide) {
    appendLine(lineVertices, chamberLeft + 0.4, guideY, pistonX - 0.3, guideY)
  }
  if (overlays.showEnergyGuide) {
    appendLine(lineVertices, chamberLeft + 0.7, IDEAL_GAS_ENERGY_GUIDE_Y, 8.8, energyY)
  }

  appendRectangle(
    markerVertices,
    pistonX - 0.08,
    chamberBottom + 0.3,
    pistonX + 0.08,
    chamberTop - 0.3,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildCarnotViewportGeometry(
  snapshot: ThermodynamicsStateSnapshot,
  scenario: ThermodynamicsScenario,
  overlays: ThermodynamicsOverlayOptions,
): ThermodynamicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const cycleSamples = buildCarnotViewportSamples(scenario)
  const volumes = cycleSamples.map((sample) => sample.volumeCubicMeters ?? 0)
  const pressures = cycleSamples.map((sample) => sample.pressureKpa ?? 0)
  const minVolume = Math.min(...volumes)
  const maxVolume = Math.max(...volumes)
  const minPressure = Math.min(...pressures)
  const maxPressure = Math.max(...pressures)

  appendLine(
    lineVertices,
    CARNOT_AXIS_LEFT,
    CARNOT_AXIS_BOTTOM,
    CARNOT_AXIS_RIGHT,
    CARNOT_AXIS_BOTTOM,
  )
  appendLine(lineVertices, CARNOT_AXIS_LEFT, CARNOT_AXIS_BOTTOM, CARNOT_AXIS_LEFT, CARNOT_AXIS_TOP)

  if (overlays.showPressureCurve) {
    for (let index = 1; index < cycleSamples.length; index += 1) {
      const previous = mapCarnotSample(
        cycleSamples[index - 1],
        minVolume,
        maxVolume,
        minPressure,
        maxPressure,
      )
      const current = mapCarnotSample(
        cycleSamples[index],
        minVolume,
        maxVolume,
        minPressure,
        maxPressure,
      )
      appendLine(lineVertices, previous.x, previous.y, current.x, current.y)
    }
  }

  if (overlays.showParticleGuide) {
    appendLine(
      lineVertices,
      CARNOT_AXIS_LEFT,
      CARNOT_AXIS_TOP - 0.8,
      CARNOT_AXIS_RIGHT,
      CARNOT_AXIS_TOP - 0.8,
    )
    appendLine(
      lineVertices,
      CARNOT_AXIS_LEFT,
      CARNOT_AXIS_BOTTOM + 1.1,
      CARNOT_AXIS_RIGHT,
      CARNOT_AXIS_BOTTOM + 1.1,
    )
  }

  if (overlays.showEnergyGuide) {
    appendLine(
      lineVertices,
      CARNOT_AXIS_RIGHT - 0.8,
      CARNOT_AXIS_BOTTOM + 0.4,
      CARNOT_AXIS_RIGHT - 0.8,
      CARNOT_AXIS_TOP - 0.4,
    )
  }

  const currentPoint = mapCarnotPoint(snapshot, minVolume, maxVolume, minPressure, maxPressure)
  appendRectangle(
    markerVertices,
    currentPoint.x - 0.09,
    currentPoint.y - 0.09,
    currentPoint.x + 0.09,
    currentPoint.y + 0.09,
  )

  return {
    lineVertices: new Float32Array(lineVertices),
    markerVertices: new Float32Array(markerVertices),
  }
}

function buildHeatConductionViewportGeometry(
  snapshot: ThermodynamicsStateSnapshot,
  overlays: ThermodynamicsOverlayOptions,
): ThermodynamicsViewportGeometry {
  const lineVertices: number[] = []
  const markerVertices: number[] = []
  const slabLeft = 2.2
  const slabRight = 7.8
  const slabBottom = 2.6
  const slabTop = 7.4
  const centerX = (slabLeft + slabRight) / 2
  const normalizedTemperature = Math.max(0, Math.min(1, snapshot.normalizedTemperature ?? 0))
  const centerHeight = slabBottom + (1 - normalizedTemperature) * (slabTop - slabBottom)

  appendLine(lineVertices, slabLeft, slabBottom, slabRight, slabBottom)
  appendLine(lineVertices, slabRight, slabBottom, slabRight, slabTop)
  appendLine(lineVertices, slabRight, slabTop, slabLeft, slabTop)
  appendLine(lineVertices, slabLeft, slabTop, slabLeft, slabBottom)
  appendLine(lineVertices, centerX, slabBottom, centerX, slabTop)

  if (overlays.showPressureCurve) {
    appendLine(lineVertices, slabLeft, slabTop, centerX, centerHeight)
    appendLine(lineVertices, centerX, centerHeight, slabRight, slabTop)
  }
  if (overlays.showParticleGuide) {
    appendLine(lineVertices, slabLeft - 0.6, slabTop - 0.2, slabLeft - 0.1, slabTop - 0.2)
    appendLine(lineVertices, slabRight + 0.1, slabTop - 0.2, slabRight + 0.6, slabTop - 0.2)
  }
  if (overlays.showEnergyGuide) {
    appendLine(lineVertices, slabLeft - 0.8, CONDUCTION_GUIDE_Y, slabLeft - 0.2, CONDUCTION_GUIDE_Y)
    appendLine(
      lineVertices,
      slabRight + 0.2,
      CONDUCTION_GUIDE_Y,
      slabRight + 0.8,
      CONDUCTION_GUIDE_Y,
    )
    appendTriangleArrow(markerVertices, slabLeft - 0.2, CONDUCTION_GUIDE_Y, true)
    appendTriangleArrow(markerVertices, slabRight + 0.2, CONDUCTION_GUIDE_Y, false)
  }

  appendRectangle(markerVertices, centerX - 0.07, slabBottom, centerX + 0.07, centerHeight)

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

function appendTriangleArrow(
  vertices: number[],
  tipX: number,
  tipY: number,
  pointsRight: boolean,
): void {
  const baseX = pointsRight ? tipX - 0.18 : tipX + 0.18
  vertices.push(...toClip(tipX, tipY), ...toClip(baseX, tipY + 0.14), ...toClip(baseX, tipY - 0.14))
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

function buildCarnotViewportSamples(
  scenario: ThermodynamicsScenario,
): ThermodynamicsStateSnapshot[] {
  const samples: ThermodynamicsStateSnapshot[] = []
  const sampleCount = 16
  for (let index = 0; index < sampleCount; index += 1) {
    samples.push(
      buildCarnotViewportSnapshot(scenario, (scenario.durationSeconds * index) / (sampleCount - 1)),
    )
  }
  return samples
}

function buildCarnotViewportSnapshot(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): ThermodynamicsStateSnapshot {
  const amountMoles = Math.max(scenario.amountMoles ?? 0, 1e-6)
  const hotReservoirTemperatureKelvin = Math.max(scenario.hotReservoirTemperatureKelvin ?? 0, 1)
  const coldReservoirTemperatureKelvin = Math.max(
    Math.min(
      scenario.coldReservoirTemperatureKelvin ?? hotReservoirTemperatureKelvin * 0.5,
      hotReservoirTemperatureKelvin - 1,
    ),
    1,
  )
  const minimumVolumeCubicMeters = Math.max(scenario.cycleMinVolumeCubicMeters ?? 0, 0.001)
  const cycleVolumeRatio = Math.max(scenario.cycleVolumeRatio ?? 0, 1.05)
  const maximumIsothermalVolumeCubicMeters = minimumVolumeCubicMeters * cycleVolumeRatio
  const adiabaticFactor = Math.pow(
    hotReservoirTemperatureKelvin / coldReservoirTemperatureKelvin,
    1 / (1.4 - 1),
  )
  const hotEndVolumeCubicMeters = maximumIsothermalVolumeCubicMeters
  const coldStartVolumeCubicMeters = hotEndVolumeCubicMeters * adiabaticFactor
  const coldEndVolumeCubicMeters = minimumVolumeCubicMeters * adiabaticFactor
  const cycleProgress = Math.max(
    0,
    Math.min(1, timeSeconds / Math.max(scenario.durationSeconds, 1)),
  )
  const segmentProgress = cycleProgress * 4
  let volumeCubicMeters = minimumVolumeCubicMeters
  let temperatureKelvin = hotReservoirTemperatureKelvin

  if (segmentProgress < 1) {
    volumeCubicMeters =
      minimumVolumeCubicMeters +
      (hotEndVolumeCubicMeters - minimumVolumeCubicMeters) * segmentProgress
  } else if (segmentProgress < 2) {
    const localProgress = segmentProgress - 1
    volumeCubicMeters =
      hotEndVolumeCubicMeters +
      (coldStartVolumeCubicMeters - hotEndVolumeCubicMeters) * localProgress
    temperatureKelvin =
      hotReservoirTemperatureKelvin * Math.pow(hotEndVolumeCubicMeters / volumeCubicMeters, 0.4)
  } else if (segmentProgress < 3) {
    const localProgress = segmentProgress - 2
    volumeCubicMeters =
      coldStartVolumeCubicMeters +
      (coldEndVolumeCubicMeters - coldStartVolumeCubicMeters) * localProgress
    temperatureKelvin = coldReservoirTemperatureKelvin
  } else {
    const localProgress = segmentProgress - 3
    volumeCubicMeters =
      coldEndVolumeCubicMeters +
      (minimumVolumeCubicMeters - coldEndVolumeCubicMeters) * localProgress
    temperatureKelvin =
      coldReservoirTemperatureKelvin * Math.pow(coldEndVolumeCubicMeters / volumeCubicMeters, 0.4)
  }

  return {
    timeSeconds,
    volumeCubicMeters,
    pressureKpa: (amountMoles * 8.314462618 * temperatureKelvin) / volumeCubicMeters / 1000,
    stable: true,
  }
}

function mapCarnotSample(
  snapshot: ThermodynamicsStateSnapshot,
  minVolume: number,
  maxVolume: number,
  minPressure: number,
  maxPressure: number,
): { x: number; y: number } {
  return mapCarnotPoint(snapshot, minVolume, maxVolume, minPressure, maxPressure)
}

function mapCarnotPoint(
  snapshot: ThermodynamicsStateSnapshot,
  minVolume: number,
  maxVolume: number,
  minPressure: number,
  maxPressure: number,
): { x: number; y: number } {
  const x =
    CARNOT_AXIS_LEFT +
    (((snapshot.volumeCubicMeters ?? minVolume) - minVolume) /
      Math.max(maxVolume - minVolume, 0.0001)) *
      (CARNOT_AXIS_RIGHT - CARNOT_AXIS_LEFT)
  const y =
    CARNOT_AXIS_BOTTOM +
    (((snapshot.pressureKpa ?? minPressure) - minPressure) /
      Math.max(maxPressure - minPressure, 0.0001)) *
      (CARNOT_AXIS_TOP - CARNOT_AXIS_BOTTOM)
  return { x, y }
}

function toClip(x: number, y: number): [number, number] {
  const clipX = (x / 10) * 2 - 1
  const clipY = (y / 10) * 2 - 1
  return [Math.max(-0.96, Math.min(0.96, clipX)), Math.max(-0.96, Math.min(0.96, clipY))]
}

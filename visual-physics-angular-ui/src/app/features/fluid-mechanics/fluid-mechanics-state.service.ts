import { computed, Injectable, signal } from "@angular/core"

import {
  FluidMechanicsSample,
  FluidMechanicsScenario,
  FluidMechanicsScenarioId,
  FluidMechanicsStateSnapshot,
} from "./fluid-mechanics.models"

export type EditableFluidMechanicsField =
  | "fluidDensity"
  | "blockDensity"
  | "gravity"
  | "blockWidth"
  | "blockHeight"
  | "blockDepth"
  | "pipeRadius"
  | "pipeLength"
  | "pressureDrop"
  | "dynamicViscosity"
  | "channelWidth"
  | "channelDepth"
  | "channelSlope"
  | "roughnessCoefficient"
  | "channelLength"

const SCENARIOS: readonly FluidMechanicsScenario[] = [
  {
    id: "buoyancy-block",
    name: "Buoyancy of a Floating Block",
    summary: "Balance buoyant force and weight for a rectangular block floating in a fluid.",
    equationSummary: "F_b = rho_fluid g V_displaced, W = rho_block g V_block",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea: "Archimedes principle, displaced volume, equilibrium depth, and sinking threshold",
    fluidDensity: 1000,
    blockDensity: 600,
    gravity: 9.81,
    blockWidth: 1.2,
    blockHeight: 1.2,
    blockDepth: 0.8,
  },
  {
    id: "poiseuille-pipe",
    name: "Laminar Pipe Flow",
    summary: "Estimate steady laminar flow through a circular pipe under a pressure drop.",
    equationSummary: "Q = pi R^4 DeltaP / (8 mu L), v_avg = Q / (pi R^2), Re = 2 rho v_avg R / mu",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 10 },
    focusArea:
      "Poiseuille flow rate, average velocity, centerline velocity, and laminar Reynolds-number diagnostics",
    fluidDensity: 998,
    pipeRadius: 0.045,
    pipeLength: 12,
    pressureDrop: 100,
    dynamicViscosity: 0.01,
  },
  {
    id: "open-channel-flow",
    name: "Uniform Open-Channel Flow",
    summary:
      "Estimate steady uniform flow in a rectangular channel with Manning-type roughness diagnostics.",
    equationSummary: "Q = (1 / n) A R_h^(2/3) S^(1/2), Fr = V / sqrt(g y)",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 18, minY: 0, maxY: 10 },
    focusArea:
      "Rectangular-channel discharge, hydraulic radius, subcritical Froude behavior, and bed-slope guidance",
    gravity: 9.81,
    channelWidth: 3,
    channelDepth: 1.2,
    channelSlope: 0.0015,
    roughnessCoefficient: 0.03,
    channelLength: 30,
  },
] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildBuoyancySnapshot(
  scenario: FluidMechanicsScenario,
  submersionDepthOverride?: number,
): FluidMechanicsStateSnapshot {
  const blockWidth = Math.max(scenario.blockWidth ?? 0, 1e-3)
  const blockHeight = Math.max(scenario.blockHeight ?? 0, 1e-3)
  const blockDepth = Math.max(scenario.blockDepth ?? 0, 1e-3)
  const fluidDensity = Math.max(scenario.fluidDensity ?? 0, 1e-6)
  const blockDensity = Math.max(scenario.blockDensity ?? 0, 1e-6)
  const gravity = Math.max(scenario.gravity ?? 0, 1e-6)
  const blockVolume = blockWidth * blockHeight * blockDepth
  const equilibriumDepth = clamp((blockDensity / fluidDensity) * blockHeight, 0, blockHeight)
  const stable = blockDensity <= fluidDensity + 1e-6
  const submersionDepth = clamp(
    submersionDepthOverride ?? (stable ? equilibriumDepth : blockHeight),
    0,
    blockHeight,
  )
  const displacedVolume = blockWidth * blockDepth * submersionDepth
  const buoyantForce = fluidDensity * gravity * displacedVolume
  const weightForce = blockDensity * gravity * blockVolume
  const netForce = buoyantForce - weightForce
  const immersionRatio = submersionDepth / blockHeight

  return {
    timeSeconds: 0,
    submersionDepth,
    displacedVolume,
    buoyantForce,
    weightForce,
    netForce,
    immersionRatio,
    equilibriumDepth,
    stable: stable && Math.abs(netForce) <= 1e-3,
  }
}

function buildPoiseuilleSnapshot(scenario: FluidMechanicsScenario): FluidMechanicsStateSnapshot {
  const fluidDensity = Math.max(scenario.fluidDensity ?? 0, 1e-6)
  const pipeRadius = Math.max(scenario.pipeRadius ?? 0, 1e-6)
  const pipeLength = Math.max(scenario.pipeLength ?? 0, 1e-6)
  const pressureDrop = Math.max(scenario.pressureDrop ?? 0, 1e-6)
  const dynamicViscosity = Math.max(scenario.dynamicViscosity ?? 0, 1e-6)
  const volumetricFlowRate =
    (Math.PI * Math.pow(pipeRadius, 4) * pressureDrop) / (8 * dynamicViscosity * pipeLength)
  const averageVelocity = volumetricFlowRate / (Math.PI * pipeRadius * pipeRadius)
  const centerlineVelocity = averageVelocity * 2
  const reynoldsNumber = (2 * fluidDensity * averageVelocity * pipeRadius) / dynamicViscosity
  const pressureGradient = pressureDrop / pipeLength

  return {
    timeSeconds: 0,
    volumetricFlowRate,
    averageVelocity,
    centerlineVelocity,
    reynoldsNumber,
    pressureGradient,
    stable: reynoldsNumber < 2300,
  }
}

function buildOpenChannelSnapshot(scenario: FluidMechanicsScenario): FluidMechanicsStateSnapshot {
  const gravity = Math.max(scenario.gravity ?? 0, 1e-6)
  const channelWidth = Math.max(scenario.channelWidth ?? 0, 1e-6)
  const channelDepth = Math.max(scenario.channelDepth ?? 0, 1e-6)
  const channelSlope = Math.max(scenario.channelSlope ?? 0, 1e-8)
  const roughnessCoefficient = Math.max(scenario.roughnessCoefficient ?? 0, 1e-6)
  const area = channelWidth * channelDepth
  const wettedPerimeter = channelWidth + 2 * channelDepth
  const hydraulicRadius = area / wettedPerimeter
  const discharge =
    (1 / roughnessCoefficient) * area * Math.pow(hydraulicRadius, 2 / 3) * Math.sqrt(channelSlope)
  const averageVelocity = discharge / area
  const froudeNumber = averageVelocity / Math.sqrt(gravity * channelDepth)

  return {
    timeSeconds: 0,
    discharge,
    hydraulicRadius,
    averageVelocity,
    froudeNumber,
    stable: froudeNumber < 1,
  }
}

function buildSnapshot(
  scenario: FluidMechanicsScenario,
  submersionDepthOverride?: number,
): FluidMechanicsStateSnapshot {
  if (scenario.id === "open-channel-flow") {
    return buildOpenChannelSnapshot(scenario)
  }

  if (scenario.id === "poiseuille-pipe") {
    return buildPoiseuilleSnapshot(scenario)
  }

  return buildBuoyancySnapshot(scenario, submersionDepthOverride)
}

function buildBuoyancySamples(scenario: FluidMechanicsScenario): readonly FluidMechanicsSample[] {
  const samples: FluidMechanicsSample[] = []
  const sampleCount = 5
  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / (sampleCount - 1)
    const submersionDepth = (scenario.blockHeight ?? 0) * ratio
    const snapshot = buildSnapshot(scenario, submersionDepth)
    samples.push({
      timeSeconds: submersionDepth,
      submersionDepth: snapshot.submersionDepth,
      displacedVolume: snapshot.displacedVolume,
      buoyantForce: snapshot.buoyantForce,
      weightForce: snapshot.weightForce,
      netForce: snapshot.netForce,
      immersionRatio: snapshot.immersionRatio,
      stable: snapshot.stable,
    })
  }
  return samples
}

function buildPoiseuilleSamples(scenario: FluidMechanicsScenario): readonly FluidMechanicsSample[] {
  const sampleCount = 6
  const snapshot = buildPoiseuilleSnapshot(scenario)
  const pipeLength = Math.max(scenario.pipeLength ?? 0, 1e-6)
  const pressureDrop = Math.max(scenario.pressureDrop ?? 0, 1e-6)
  const samples: FluidMechanicsSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / (sampleCount - 1)
    const axialPosition = pipeLength * ratio
    samples.push({
      timeSeconds: ratio,
      axialPosition,
      pressure: pressureDrop * (1 - ratio),
      averageVelocity: snapshot.averageVelocity,
      reynoldsNumber: snapshot.reynoldsNumber,
      stable: snapshot.stable,
    })
  }

  return samples
}

function buildOpenChannelSamples(
  scenario: FluidMechanicsScenario,
): readonly FluidMechanicsSample[] {
  const sampleCount = 6
  const snapshot = buildOpenChannelSnapshot(scenario)
  const channelLength = Math.max(scenario.channelLength ?? 0, 1e-6)
  const channelDepth = Math.max(scenario.channelDepth ?? 0, 1e-6)
  const channelSlope = Math.max(scenario.channelSlope ?? 0, 1e-8)
  const samples: FluidMechanicsSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / (sampleCount - 1)
    const axialPosition = channelLength * ratio
    const bedElevation = -channelSlope * axialPosition
    samples.push({
      timeSeconds: ratio,
      axialPosition,
      bedElevation,
      waterSurfaceElevation: bedElevation + channelDepth,
      averageVelocity: snapshot.averageVelocity,
      discharge: snapshot.discharge,
      froudeNumber: snapshot.froudeNumber,
      stable: snapshot.stable,
    })
  }

  return samples
}

@Injectable({ providedIn: "root" })
export class FluidMechanicsStateService {
  private readonly selectedScenarioId = signal<FluidMechanicsScenarioId>("buoyancy-block")
  private readonly scenarios = signal<readonly FluidMechanicsScenario[]>(SCENARIOS)

  readonly selectedScenario = computed(
    () =>
      this.scenarios().find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios()[0],
  )
  readonly currentState = computed(() => buildSnapshot(this.selectedScenario()))
  readonly sampledStates = computed(() =>
    this.selectedScenario().id === "poiseuille-pipe"
      ? buildPoiseuilleSamples(this.selectedScenario())
      : this.selectedScenario().id === "open-channel-flow"
        ? buildOpenChannelSamples(this.selectedScenario())
        : buildBuoyancySamples(this.selectedScenario()),
  )

  listScenarios(): readonly FluidMechanicsScenario[] {
    return this.scenarios()
  }

  selectScenario(scenarioId: FluidMechanicsScenarioId): void {
    this.selectedScenarioId.set(scenarioId)
  }

  updateScenarioField(field: EditableFluidMechanicsField, value: number): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((scenario) => {
        if (scenario.id !== this.selectedScenarioId()) {
          return scenario
        }

        const safeValue = Number.isFinite(value) ? value : 0
        if (field === "fluidDensity") {
          return { ...scenario, fluidDensity: Math.max(safeValue, 1) }
        }
        if (field === "blockDensity") {
          return { ...scenario, blockDensity: Math.max(safeValue, 1) }
        }
        if (field === "gravity") {
          return { ...scenario, gravity: Math.max(safeValue, 0.1) }
        }
        if (field === "blockWidth") {
          return { ...scenario, blockWidth: Math.max(safeValue, 0.1) }
        }
        if (field === "blockHeight") {
          return { ...scenario, blockHeight: Math.max(safeValue, 0.1) }
        }
        if (field === "blockDepth") {
          return { ...scenario, blockDepth: Math.max(safeValue, 0.1) }
        }
        if (field === "pipeRadius") {
          return { ...scenario, pipeRadius: Math.max(safeValue, 0.001) }
        }
        if (field === "pipeLength") {
          return { ...scenario, pipeLength: Math.max(safeValue, 0.1) }
        }
        if (field === "pressureDrop") {
          return { ...scenario, pressureDrop: Math.max(safeValue, 1) }
        }
        if (field === "dynamicViscosity") {
          return { ...scenario, dynamicViscosity: Math.max(safeValue, 1e-5) }
        }
        if (field === "channelWidth") {
          return { ...scenario, channelWidth: Math.max(safeValue, 0.1) }
        }
        if (field === "channelDepth") {
          return { ...scenario, channelDepth: Math.max(safeValue, 0.05) }
        }
        if (field === "channelSlope") {
          return { ...scenario, channelSlope: Math.max(safeValue, 1e-5) }
        }
        if (field === "roughnessCoefficient") {
          return { ...scenario, roughnessCoefficient: Math.max(safeValue, 1e-4) }
        }
        return { ...scenario, channelLength: Math.max(safeValue, 0.5) }
      }),
    )
  }

  importScenarioState(scenario: FluidMechanicsScenario): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((existingScenario) =>
        existingScenario.id === scenario.id ? scenario : existingScenario,
      ),
    )
    this.selectedScenarioId.set(scenario.id)
  }
}

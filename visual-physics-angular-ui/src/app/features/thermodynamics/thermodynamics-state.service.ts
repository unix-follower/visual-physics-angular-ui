import { computed, Injectable, signal } from "@angular/core"

import {
  ThermodynamicsSample,
  ThermodynamicsScenario,
  ThermodynamicsScenarioId,
  ThermodynamicsStateSnapshot,
} from "./thermodynamics.models"

export type EditableThermodynamicsField =
  | "amountMoles"
  | "temperatureKelvin"
  | "volumeCubicMeters"
  | "molarMassKgPerMol"
  | "slabThicknessMeters"
  | "thermalConductivityWPerMK"
  | "thermalDiffusivityM2PerS"
  | "initialTemperatureCelsius"
  | "boundaryTemperatureCelsius"
  | "hotReservoirTemperatureKelvin"
  | "coldReservoirTemperatureKelvin"
  | "cycleMinVolumeCubicMeters"
  | "cycleVolumeRatio"

const IDEAL_GAS_CONSTANT = 8.314462618
const HEAT_CAPACITY_RATIO = 1.4

const SCENARIOS: readonly ThermodynamicsScenario[] = [
  {
    id: "ideal-gas-state",
    name: "Ideal Gas State Evolution",
    summary:
      "Relate pressure, temperature, density, and molecular-speed diagnostics through the ideal-gas equation of state.",
    equationSummary: "PV = nRT, rho = m / V, u = 3 nRT / 2, v_rms = sqrt(3RT / M)",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Equation-of-state closure, density, translational internal-energy proxy, and RMS molecular speed diagnostics.",
    amountMoles: 1,
    temperatureKelvin: 320,
    volumeCubicMeters: 0.024,
    molarMassKgPerMol: 0.02897,
  },
  {
    id: "heat-conduction-slab",
    name: "Transient Heat Conduction in a Slab",
    summary:
      "Track the centerline temperature, inward heat flux, and transient diffusion state for a plane wall under fixed boundary temperature.",
    equationSummary:
      'Fo = alpha t / L_c^2, theta/theta_i ≈ exp(-pi^2 Fo), q" = k (T_b - T_c) / L_c',
    status: "Implemented",
    durationSeconds: 240,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Transient centerline diffusion, Fourier-number progress, boundary-driven heating, and slab temperature-profile cues.",
    slabThicknessMeters: 0.08,
    thermalConductivityWPerMK: 1.35,
    thermalDiffusivityM2PerS: 0.0000012,
    initialTemperatureCelsius: 25,
    boundaryTemperatureCelsius: 145,
  },
  {
    id: "carnot-cycle",
    name: "Carnot Cycle",
    summary:
      "Follow the idealized reversible heat-engine loop across hot isotherm, adiabatic expansion, cold isotherm, and adiabatic compression stages.",
    equationSummary: "eta = 1 - T_c/T_h, Q_h = nRT_h ln r, Q_c = nRT_c ln r, W = Q_h - Q_c",
    status: "Implemented",
    durationSeconds: 400,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Carnot efficiency, reversible heat transfer, cycle-stage diagnostics, and sampled pressure-volume loop geometry.",
    amountMoles: 1.2,
    hotReservoirTemperatureKelvin: 600,
    coldReservoirTemperatureKelvin: 320,
    cycleMinVolumeCubicMeters: 0.015,
    cycleVolumeRatio: 2.2,
  },
] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildIdealGasSnapshot(scenario: ThermodynamicsScenario): ThermodynamicsStateSnapshot {
  const amountMoles = Math.max(scenario.amountMoles ?? 0, 1e-6)
  const temperatureKelvin = Math.max(scenario.temperatureKelvin ?? 0, 1)
  const volumeCubicMeters = Math.max(scenario.volumeCubicMeters ?? 0, 1e-6)
  const molarMassKgPerMol = Math.max(scenario.molarMassKgPerMol ?? 0, 1e-6)
  const pressurePa = (amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin) / volumeCubicMeters
  const pressureKpa = pressurePa / 1000
  const massKg = amountMoles * molarMassKgPerMol
  const densityKgPerM3 = massKg / volumeCubicMeters
  const internalEnergyKj = (1.5 * amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin) / 1000
  const rmsSpeedMs = Math.sqrt((3 * IDEAL_GAS_CONSTANT * temperatureKelvin) / molarMassKgPerMol)
  const compressibilityFactor =
    (pressurePa * volumeCubicMeters) / (amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin)

  return {
    timeSeconds: 0,
    volumeCubicMeters,
    pressureKpa,
    densityKgPerM3,
    internalEnergyKj,
    rmsSpeedMs,
    compressibilityFactor,
    stable: Math.abs(compressibilityFactor - 1) < 1e-9,
  }
}

function buildHeatConductionSnapshot(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): ThermodynamicsStateSnapshot {
  const slabThicknessMeters = Math.max(scenario.slabThicknessMeters ?? 0, 0.001)
  const thermalConductivityWPerMK = Math.max(scenario.thermalConductivityWPerMK ?? 0, 0.001)
  const thermalDiffusivityM2PerS = Math.max(scenario.thermalDiffusivityM2PerS ?? 0, 1e-9)
  const initialTemperatureCelsius = scenario.initialTemperatureCelsius ?? 20
  const boundaryTemperatureCelsius = scenario.boundaryTemperatureCelsius ?? 100
  const halfThickness = slabThicknessMeters / 2
  const fourierNumber = (thermalDiffusivityM2PerS * timeSeconds) / (halfThickness * halfThickness)
  const normalizedTemperature = Math.exp(-(Math.PI * Math.PI) * fourierNumber)
  const centerTemperatureCelsius =
    boundaryTemperatureCelsius +
    (initialTemperatureCelsius - boundaryTemperatureCelsius) * normalizedTemperature
  const heatFluxWPerM2 =
    (thermalConductivityWPerMK * Math.abs(boundaryTemperatureCelsius - centerTemperatureCelsius)) /
    halfThickness

  return {
    timeSeconds,
    centerTemperatureCelsius,
    surfaceTemperatureCelsius: boundaryTemperatureCelsius,
    heatFluxWPerM2,
    fourierNumber,
    normalizedTemperature,
    stable: normalizedTemperature < 0.05,
  }
}

interface CarnotDerivedValues {
  amountMoles: number
  hotReservoirTemperatureKelvin: number
  coldReservoirTemperatureKelvin: number
  minimumVolumeCubicMeters: number
  maximumIsothermalVolumeCubicMeters: number
  adiabaticFactor: number
  hotEndVolumeCubicMeters: number
  coldStartVolumeCubicMeters: number
  coldEndVolumeCubicMeters: number
  thermalEfficiency: number
  absorbedHeatKj: number
  rejectedHeatKj: number
  netWorkKj: number
  entropyTransferKjPerK: number
  isochoricHeatCapacity: number
}

function buildCarnotDerivedValues(scenario: ThermodynamicsScenario): CarnotDerivedValues {
  const amountMoles = Math.max(scenario.amountMoles ?? 0, 1e-6)
  const hotReservoirTemperatureKelvin = Math.max(scenario.hotReservoirTemperatureKelvin ?? 0, 1)
  const coldReservoirTemperatureKelvin = clamp(
    scenario.coldReservoirTemperatureKelvin ?? hotReservoirTemperatureKelvin * 0.5,
    1,
    hotReservoirTemperatureKelvin - 1,
  )
  const minimumVolumeCubicMeters = Math.max(scenario.cycleMinVolumeCubicMeters ?? 0, 0.001)
  const cycleVolumeRatio = Math.max(scenario.cycleVolumeRatio ?? 0, 1.05)
  const maximumIsothermalVolumeCubicMeters = minimumVolumeCubicMeters * cycleVolumeRatio
  const adiabaticFactor = Math.pow(
    hotReservoirTemperatureKelvin / coldReservoirTemperatureKelvin,
    1 / (HEAT_CAPACITY_RATIO - 1),
  )
  const hotEndVolumeCubicMeters = maximumIsothermalVolumeCubicMeters
  const coldStartVolumeCubicMeters = hotEndVolumeCubicMeters * adiabaticFactor
  const coldEndVolumeCubicMeters = minimumVolumeCubicMeters * adiabaticFactor
  const absorbedHeatKj =
    (amountMoles *
      IDEAL_GAS_CONSTANT *
      hotReservoirTemperatureKelvin *
      Math.log(cycleVolumeRatio)) /
    1000
  const rejectedHeatKj =
    (amountMoles *
      IDEAL_GAS_CONSTANT *
      coldReservoirTemperatureKelvin *
      Math.log(cycleVolumeRatio)) /
    1000
  const thermalEfficiency = 1 - coldReservoirTemperatureKelvin / hotReservoirTemperatureKelvin
  const netWorkKj = absorbedHeatKj - rejectedHeatKj
  const entropyTransferKjPerK = absorbedHeatKj / hotReservoirTemperatureKelvin
  const isochoricHeatCapacity = IDEAL_GAS_CONSTANT / (HEAT_CAPACITY_RATIO - 1)

  return {
    amountMoles,
    hotReservoirTemperatureKelvin,
    coldReservoirTemperatureKelvin,
    minimumVolumeCubicMeters,
    maximumIsothermalVolumeCubicMeters,
    adiabaticFactor,
    hotEndVolumeCubicMeters,
    coldStartVolumeCubicMeters,
    coldEndVolumeCubicMeters,
    thermalEfficiency,
    absorbedHeatKj,
    rejectedHeatKj,
    netWorkKj,
    entropyTransferKjPerK,
    isochoricHeatCapacity,
  }
}

function buildCarnotSnapshot(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): ThermodynamicsStateSnapshot {
  const derived = buildCarnotDerivedValues(scenario)
  const cycleProgress = clamp(timeSeconds / Math.max(scenario.durationSeconds, 1), 0, 1)
  const segmentProgress = cycleProgress * 4
  let localProgress = 0
  let temperatureKelvin: number
  let volumeCubicMeters = derived.minimumVolumeCubicMeters
  let cycleStageLabel: string

  if (segmentProgress < 1) {
    localProgress = segmentProgress
    volumeCubicMeters =
      derived.minimumVolumeCubicMeters +
      (derived.hotEndVolumeCubicMeters - derived.minimumVolumeCubicMeters) * localProgress
    temperatureKelvin = derived.hotReservoirTemperatureKelvin
    cycleStageLabel = "Isothermal expansion"
  } else if (segmentProgress < 2) {
    localProgress = segmentProgress - 1
    volumeCubicMeters =
      derived.hotEndVolumeCubicMeters +
      (derived.coldStartVolumeCubicMeters - derived.hotEndVolumeCubicMeters) * localProgress
    temperatureKelvin =
      derived.hotReservoirTemperatureKelvin *
      Math.pow(derived.hotEndVolumeCubicMeters / volumeCubicMeters, HEAT_CAPACITY_RATIO - 1)
    cycleStageLabel = "Adiabatic expansion"
  } else if (segmentProgress < 3) {
    localProgress = segmentProgress - 2
    volumeCubicMeters =
      derived.coldStartVolumeCubicMeters +
      (derived.coldEndVolumeCubicMeters - derived.coldStartVolumeCubicMeters) * localProgress
    temperatureKelvin = derived.coldReservoirTemperatureKelvin
    cycleStageLabel = "Isothermal compression"
  } else {
    localProgress = segmentProgress - 3
    volumeCubicMeters =
      derived.coldEndVolumeCubicMeters +
      (derived.minimumVolumeCubicMeters - derived.coldEndVolumeCubicMeters) * localProgress
    temperatureKelvin =
      derived.coldReservoirTemperatureKelvin *
      Math.pow(derived.coldEndVolumeCubicMeters / volumeCubicMeters, HEAT_CAPACITY_RATIO - 1)
    cycleStageLabel = "Adiabatic compression"
  }

  const pressureKpa =
    (derived.amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin) / volumeCubicMeters / 1000
  const internalEnergyKj =
    (derived.amountMoles * derived.isochoricHeatCapacity * temperatureKelvin) / 1000

  return {
    timeSeconds,
    volumeCubicMeters,
    pressureKpa,
    internalEnergyKj,
    thermalEfficiency: derived.thermalEfficiency,
    absorbedHeatKj: derived.absorbedHeatKj,
    rejectedHeatKj: derived.rejectedHeatKj,
    netWorkKj: derived.netWorkKj,
    entropyTransferKjPerK: derived.entropyTransferKjPerK,
    cycleStageLabel,
    stable: true,
  }
}

function buildSnapshot(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): ThermodynamicsStateSnapshot {
  if (scenario.id === "heat-conduction-slab") {
    return buildHeatConductionSnapshot(scenario, timeSeconds)
  }
  if (scenario.id === "carnot-cycle") {
    return buildCarnotSnapshot(scenario, timeSeconds)
  }

  return buildIdealGasSnapshot(scenario)
}

function buildIdealGasSamples(scenario: ThermodynamicsScenario): readonly ThermodynamicsSample[] {
  const sampleCount = 6
  const amountMoles = Math.max(scenario.amountMoles ?? 0, 1e-6)
  const temperatureKelvin = Math.max(scenario.temperatureKelvin ?? 0, 1)
  const baseVolume = Math.max(scenario.volumeCubicMeters ?? 0, 1e-6)
  const molarMassKgPerMol = Math.max(scenario.molarMassKgPerMol ?? 0, 1e-6)
  const samples: ThermodynamicsSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = 0.6 + index * 0.16
    const volumeCubicMeters = baseVolume * ratio
    const pressurePa = (amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin) / volumeCubicMeters
    samples.push({
      timeSeconds: index / (sampleCount - 1),
      volumeCubicMeters,
      pressureKpa: pressurePa / 1000,
      densityKgPerM3: (amountMoles * molarMassKgPerMol) / volumeCubicMeters,
      internalEnergyKj: (1.5 * amountMoles * IDEAL_GAS_CONSTANT * temperatureKelvin) / 1000,
      rmsSpeedMs: Math.sqrt((3 * IDEAL_GAS_CONSTANT * temperatureKelvin) / molarMassKgPerMol),
      stable: true,
    })
  }

  return samples
}

function buildHeatConductionSamples(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): readonly ThermodynamicsSample[] {
  const sampleCount = 7
  const slabThicknessMeters = Math.max(scenario.slabThicknessMeters ?? 0, 0.001)
  const snapshot = buildHeatConductionSnapshot(scenario, timeSeconds)
  const boundaryTemperatureCelsius = scenario.boundaryTemperatureCelsius ?? 100
  const centerTemperatureCelsius = snapshot.centerTemperatureCelsius ?? boundaryTemperatureCelsius
  const samples: ThermodynamicsSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const positionMeters = (slabThicknessMeters * index) / (sampleCount - 1)
    const shape = Math.cos(
      (Math.PI * (positionMeters - slabThicknessMeters / 2)) / slabThicknessMeters,
    )
    const temperatureCelsius =
      boundaryTemperatureCelsius +
      (centerTemperatureCelsius - boundaryTemperatureCelsius) * Math.max(0, shape)
    samples.push({
      timeSeconds,
      positionMeters,
      temperatureCelsius,
      heatFluxWPerM2: snapshot.heatFluxWPerM2,
      normalizedTemperature:
        (boundaryTemperatureCelsius - temperatureCelsius) /
        (boundaryTemperatureCelsius - (scenario.initialTemperatureCelsius ?? 20) || 1),
      stable: snapshot.stable,
    })
  }

  return samples
}

function buildCarnotSamples(
  scenario: ThermodynamicsScenario,
  _timeSeconds: number,
): readonly ThermodynamicsSample[] {
  const sampleCount = 16
  const samples: ThermodynamicsSample[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const timeSeconds = (scenario.durationSeconds * index) / (sampleCount - 1)
    const snapshot = buildCarnotSnapshot(scenario, timeSeconds)
    samples.push({
      timeSeconds,
      volumeCubicMeters: snapshot.volumeCubicMeters,
      pressureKpa: snapshot.pressureKpa,
      internalEnergyKj: snapshot.internalEnergyKj,
      entropyTransferKjPerK: snapshot.entropyTransferKjPerK,
      stageLabel: snapshot.cycleStageLabel,
      stable: snapshot.stable,
    })
  }

  return samples
}

function buildSamples(
  scenario: ThermodynamicsScenario,
  timeSeconds: number,
): readonly ThermodynamicsSample[] {
  if (scenario.id === "heat-conduction-slab") {
    return buildHeatConductionSamples(scenario, timeSeconds)
  }
  if (scenario.id === "carnot-cycle") {
    return buildCarnotSamples(scenario, timeSeconds)
  }

  return buildIdealGasSamples(scenario)
}

function usesTimeCursor(scenarioId: ThermodynamicsScenarioId): boolean {
  return scenarioId === "heat-conduction-slab" || scenarioId === "carnot-cycle"
}

@Injectable({ providedIn: "root" })
export class ThermodynamicsStateService {
  private readonly selectedScenarioId = signal<ThermodynamicsScenarioId>("ideal-gas-state")
  private readonly scenarios = signal<readonly ThermodynamicsScenario[]>(SCENARIOS)
  private readonly selectedTimeSeconds = signal(0)

  readonly selectedScenario = computed(
    () =>
      this.scenarios().find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios()[0],
  )
  readonly currentTimeSeconds = computed(() =>
    usesTimeCursor(this.selectedScenario().id) ? this.selectedTimeSeconds() : 0,
  )
  readonly currentState = computed(() =>
    buildSnapshot(this.selectedScenario(), this.currentTimeSeconds()),
  )
  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), this.currentTimeSeconds()),
  )

  listScenarios(): readonly ThermodynamicsScenario[] {
    return this.scenarios()
  }

  selectScenario(scenarioId: ThermodynamicsScenarioId): void {
    this.selectedScenarioId.set(scenarioId)
    this.selectedTimeSeconds.set(0)
  }

  updateTimeSeconds(value: number): void {
    const durationSeconds = this.selectedScenario().durationSeconds
    this.selectedTimeSeconds.set(clamp(Number.isFinite(value) ? value : 0, 0, durationSeconds))
  }

  updateScenarioField(field: EditableThermodynamicsField, value: number): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((scenario) => {
        if (scenario.id !== this.selectedScenarioId()) {
          return scenario
        }

        const safeValue = Number.isFinite(value) ? value : 0
        if (field === "amountMoles") {
          return { ...scenario, amountMoles: clamp(safeValue, 0.01, 20) }
        }
        if (field === "temperatureKelvin") {
          return { ...scenario, temperatureKelvin: clamp(safeValue, 50, 2000) }
        }
        if (field === "volumeCubicMeters") {
          return { ...scenario, volumeCubicMeters: clamp(safeValue, 0.001, 0.5) }
        }
        if (field === "slabThicknessMeters") {
          return { ...scenario, slabThicknessMeters: clamp(safeValue, 0.01, 0.5) }
        }
        if (field === "thermalConductivityWPerMK") {
          return {
            ...scenario,
            thermalConductivityWPerMK: clamp(safeValue, 0.05, 500),
          }
        }
        if (field === "thermalDiffusivityM2PerS") {
          return {
            ...scenario,
            thermalDiffusivityM2PerS: clamp(safeValue, 0.0000001, 0.001),
          }
        }
        if (field === "initialTemperatureCelsius") {
          return {
            ...scenario,
            initialTemperatureCelsius: clamp(safeValue, -100, 400),
          }
        }
        if (field === "boundaryTemperatureCelsius") {
          return {
            ...scenario,
            boundaryTemperatureCelsius: clamp(safeValue, -100, 600),
          }
        }
        if (field === "hotReservoirTemperatureKelvin") {
          return {
            ...scenario,
            hotReservoirTemperatureKelvin: clamp(safeValue, 250, 2000),
          }
        }
        if (field === "coldReservoirTemperatureKelvin") {
          return {
            ...scenario,
            coldReservoirTemperatureKelvin: clamp(safeValue, 150, 1500),
          }
        }
        if (field === "cycleMinVolumeCubicMeters") {
          return {
            ...scenario,
            cycleMinVolumeCubicMeters: clamp(safeValue, 0.001, 0.2),
          }
        }
        if (field === "cycleVolumeRatio") {
          return {
            ...scenario,
            cycleVolumeRatio: clamp(safeValue, 1.05, 6),
          }
        }

        return {
          ...scenario,
          molarMassKgPerMol: clamp(safeValue, 0.001, 0.3),
        }
      }),
    )
  }

  importScenarioState(scenario: ThermodynamicsScenario, timeSeconds = 0): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((current) => (current.id === scenario.id ? scenario : current)),
    )
    this.selectedScenarioId.set(scenario.id)
    this.selectedTimeSeconds.set(
      usesTimeCursor(scenario.id) ? clamp(timeSeconds, 0, scenario.durationSeconds) : 0,
    )
  }
}

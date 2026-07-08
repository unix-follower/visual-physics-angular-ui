import { computed, Injectable, signal } from "@angular/core"

import {
  SolidStatePhysicsSample,
  SolidStatePhysicsScenario,
  SolidStatePhysicsScenarioId,
  SolidStatePhysicsStateSnapshot,
} from "./solid-state-physics.models"

export type EditableSolidStatePhysicsField =
  | "timeSeconds"
  | "maxStrainPercent"
  | "youngsModulusGigapascals"
  | "yieldStrengthMegapascals"
  | "latticeSpacingNanometers"
  | "springConstantNewtonsPerMeter"
  | "atomicMassAmu"
  | "bandGapElectronVolts"
  | "effectiveMassRatio"
  | "dopantDensityPerCubicCentimeter"

const SCENARIOS: readonly SolidStatePhysicsScenario[] = [
  {
    id: "crystal-elasticity",
    name: "Crystal Elasticity",
    summary:
      "Inspect a crystal stress-strain curve with elastic energy storage and a yield-strength guide.",
    equationSummary: "sigma = E epsilon, U = 1/2 sigma epsilon",
    status: "Validated material slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 2.2, minY: 0, maxY: 220 },
    focusArea: "Stress-strain closure, elastic energy density, and yield-margin context.",
    maxStrainPercent: 1.6,
    youngsModulusGigapascals: 210,
    yieldStrengthMegapascals: 185,
  },
  {
    id: "phonon-dispersion",
    name: "Phonon Dispersion",
    summary: "Explore acoustic and optical phonon branches through a reduced Brillouin-zone sweep.",
    equationSummary: "omega_a approx omega_max sin(pi k / 2), omega_o approx omega_gap + ...",
    status: "Validated transport slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 1, minY: 0, maxY: 12 },
    focusArea: "Acoustic versus optical mode separation, group velocity, and zone-edge behavior.",
    latticeSpacingNanometers: 0.42,
    springConstantNewtonsPerMeter: 18,
    atomicMassAmu: 28,
  },
  {
    id: "electronic-structure",
    name: "Electronic Structure",
    summary:
      "Inspect a simplified band-gap and density-of-states view with a live occupation estimate.",
    equationSummary: "g(E) approx sqrt(E - Ec), f(E) = 1 / (1 + exp((E - Ef) / kT))",
    status: "Validated carrier slice",
    durationSeconds: 1,
    viewBounds: { minX: -1.5, maxX: 2.5, minY: 0, maxY: 1.4 },
    focusArea: "Band-gap intuition, carrier occupation, and conduction-edge density buildup.",
    bandGapElectronVolts: 1.1,
    effectiveMassRatio: 0.22,
    dopantDensityPerCubicCentimeter: 8e15,
  },
]

const DEFAULT_TIMES: Record<SolidStatePhysicsScenarioId, number> = {
  "crystal-elasticity": 0.45,
  "phonon-dispersion": 0.55,
  "electronic-structure": 0.6,
}

function cloneScenario(scenario: SolidStatePhysicsScenario): SolidStatePhysicsScenario {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeViewBounds(
  viewBounds: SolidStatePhysicsScenario["viewBounds"] | undefined,
  fallback: SolidStatePhysicsScenario["viewBounds"],
): SolidStatePhysicsScenario["viewBounds"] {
  if (
    viewBounds === undefined ||
    !Number.isFinite(viewBounds.minX) ||
    !Number.isFinite(viewBounds.maxX) ||
    !Number.isFinite(viewBounds.minY) ||
    !Number.isFinite(viewBounds.maxY) ||
    viewBounds.minX >= viewBounds.maxX ||
    viewBounds.minY >= viewBounds.maxY
  ) {
    return { ...fallback }
  }

  return { ...viewBounds }
}

function findBaseScenario(id: SolidStatePhysicsScenarioId): SolidStatePhysicsScenario {
  return cloneScenario(SCENARIOS.find((candidate) => candidate.id === id) ?? SCENARIOS[0])
}

function normalizeScenario(scenario: SolidStatePhysicsScenario): SolidStatePhysicsScenario {
  const base = findBaseScenario(scenario.id)

  if (scenario.id === "crystal-elasticity") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
      focusArea: scenario.focusArea,
      maxStrainPercent: clamp(scenario.maxStrainPercent ?? base.maxStrainPercent ?? 1.6, 0.3, 3),
      youngsModulusGigapascals: clamp(
        scenario.youngsModulusGigapascals ?? base.youngsModulusGigapascals ?? 210,
        20,
        400,
      ),
      yieldStrengthMegapascals: clamp(
        scenario.yieldStrengthMegapascals ?? base.yieldStrengthMegapascals ?? 185,
        40,
        400,
      ),
    }
  }

  if (scenario.id === "phonon-dispersion") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
      focusArea: scenario.focusArea,
      latticeSpacingNanometers: clamp(
        scenario.latticeSpacingNanometers ?? base.latticeSpacingNanometers ?? 0.42,
        0.15,
        1.1,
      ),
      springConstantNewtonsPerMeter: clamp(
        scenario.springConstantNewtonsPerMeter ?? base.springConstantNewtonsPerMeter ?? 18,
        2,
        80,
      ),
      atomicMassAmu: clamp(scenario.atomicMassAmu ?? base.atomicMassAmu ?? 28, 4, 200),
    }
  }

  return {
    id: base.id,
    name: scenario.name,
    summary: scenario.summary,
    equationSummary: scenario.equationSummary,
    status: scenario.status,
    durationSeconds: Math.max(scenario.durationSeconds, 0),
    viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
    focusArea: scenario.focusArea,
    bandGapElectronVolts: clamp(
      scenario.bandGapElectronVolts ?? base.bandGapElectronVolts ?? 1.1,
      0.1,
      3.5,
    ),
    effectiveMassRatio: clamp(
      scenario.effectiveMassRatio ?? base.effectiveMassRatio ?? 0.22,
      0.05,
      1.5,
    ),
    dopantDensityPerCubicCentimeter: clamp(
      scenario.dopantDensityPerCubicCentimeter ?? base.dopantDensityPerCubicCentimeter ?? 8e15,
      1e12,
      1e18,
    ),
  }
}

function buildCrystalSnapshot(
  scenario: SolidStatePhysicsScenario,
  timeSeconds: number,
): SolidStatePhysicsStateSnapshot {
  const maxStrainPercent = scenario.maxStrainPercent ?? 1.6
  const strainPercent = clamp(timeSeconds, 0, 1) * maxStrainPercent
  const strainFraction = strainPercent / 100
  const modulus = scenario.youngsModulusGigapascals ?? 210
  const yieldStrength = scenario.yieldStrengthMegapascals ?? 185
  const stressMegapascals = modulus * 1000 * strainFraction
  const elasticEnergyDensityMegajoulesPerCubicMeter = 0.5 * stressMegapascals * strainFraction

  return {
    timeSeconds,
    strainPercent,
    stressMegapascals,
    elasticEnergyDensityMegajoulesPerCubicMeter,
    stable: stressMegapascals <= yieldStrength * 1.15,
  }
}

function buildPhononSnapshot(
  scenario: SolidStatePhysicsScenario,
  timeSeconds: number,
): SolidStatePhysicsStateSnapshot {
  const waveVectorFraction = clamp(timeSeconds, 0, 1)
  const latticeSpacing = scenario.latticeSpacingNanometers ?? 0.42
  const springConstant = scenario.springConstantNewtonsPerMeter ?? 18
  const atomicMass = scenario.atomicMassAmu ?? 28
  const modeScale = Math.sqrt(springConstant / atomicMass) * 8
  const acousticFrequencyTerahertz = modeScale * Math.sin((Math.PI * waveVectorFraction) / 2)
  const opticalFrequencyTerahertz =
    4 + modeScale * 0.55 * Math.cos((Math.PI * waveVectorFraction) / 2)
  const groupVelocityKilometersPerSecond =
    ((modeScale * latticeSpacing * Math.PI) / 2) * Math.cos((Math.PI * waveVectorFraction) / 2)

  return {
    timeSeconds,
    waveVectorFraction,
    acousticFrequencyTerahertz,
    opticalFrequencyTerahertz,
    groupVelocityKilometersPerSecond,
    stable:
      Number.isFinite(acousticFrequencyTerahertz) && Number.isFinite(opticalFrequencyTerahertz),
  }
}

function buildElectronicSnapshot(
  scenario: SolidStatePhysicsScenario,
  timeSeconds: number,
): SolidStatePhysicsStateSnapshot {
  const bandGap = scenario.bandGapElectronVolts ?? 1.1
  const effectiveMassRatio = scenario.effectiveMassRatio ?? 0.22
  const dopantDensity = scenario.dopantDensityPerCubicCentimeter ?? 8e15
  const energyElectronVolts = -0.5 * bandGap + clamp(timeSeconds, 0, 1) * bandGap * 2.2
  const conductionEdge = bandGap / 2
  const densityOfStatesArbitraryUnits =
    energyElectronVolts >= conductionEdge
      ? Math.sqrt(energyElectronVolts - conductionEdge + 0.02) *
        Math.sqrt(1 / effectiveMassRatio) *
        0.9
      : 0
  const fermiLevel = -0.12 + Math.log10(dopantDensity / 1e15) * 0.04
  const occupationProbability = 1 / (1 + Math.exp((energyElectronVolts - fermiLevel) / 0.08))

  return {
    timeSeconds,
    energyElectronVolts,
    densityOfStatesArbitraryUnits,
    occupationProbability,
    stable:
      Number.isFinite(densityOfStatesArbitraryUnits) && Number.isFinite(occupationProbability),
  }
}

function buildSnapshot(
  scenario: SolidStatePhysicsScenario,
  timeSeconds: number,
): SolidStatePhysicsStateSnapshot {
  if (scenario.id === "phonon-dispersion") {
    return buildPhononSnapshot(scenario, timeSeconds)
  }

  if (scenario.id === "electronic-structure") {
    return buildElectronicSnapshot(scenario, timeSeconds)
  }

  return buildCrystalSnapshot(scenario, timeSeconds)
}

function buildCrystalSamples(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  sampleCount = 29,
): readonly SolidStatePhysicsSample[] {
  const maxStrain = scenario.maxStrainPercent ?? 1.6
  const modulus = scenario.youngsModulusGigapascals ?? 210
  const yieldStrength = scenario.yieldStrengthMegapascals ?? 185
  const activeStrain = snapshot.strainPercent ?? 0

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = (index / (sampleCount - 1)) * maxStrain
    const strainFraction = position / 100
    return {
      position,
      primaryValue: modulus * 1000 * strainFraction,
      secondaryValue: yieldStrength,
      label: "crystal-stress-strain-profile",
      active: Math.abs(position - activeStrain) <= maxStrain / sampleCount,
    }
  })
}

function buildPhononSamples(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  sampleCount = 33,
): readonly SolidStatePhysicsSample[] {
  const springConstant = scenario.springConstantNewtonsPerMeter ?? 18
  const atomicMass = scenario.atomicMassAmu ?? 28
  const modeScale = Math.sqrt(springConstant / atomicMass) * 8
  const activeWaveVector = snapshot.waveVectorFraction ?? 0

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = index / (sampleCount - 1)
    return {
      position,
      primaryValue: modeScale * Math.sin((Math.PI * position) / 2),
      secondaryValue: 4 + modeScale * 0.55 * Math.cos((Math.PI * position) / 2),
      label: "phonon-dispersion-profile",
      active: Math.abs(position - activeWaveVector) <= 1 / sampleCount,
    }
  })
}

function buildElectronicSamples(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  sampleCount = 33,
): readonly SolidStatePhysicsSample[] {
  const bandGap = scenario.bandGapElectronVolts ?? 1.1
  const effectiveMassRatio = scenario.effectiveMassRatio ?? 0.22
  const dopantDensity = scenario.dopantDensityPerCubicCentimeter ?? 8e15
  const fermiLevel = -0.12 + Math.log10(dopantDensity / 1e15) * 0.04
  const energyMin = -0.5 * bandGap
  const energyMax = bandGap * 1.7
  const activeEnergy = snapshot.energyElectronVolts ?? energyMin

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = energyMin + ((energyMax - energyMin) * index) / (sampleCount - 1)
    const conductionEdge = bandGap / 2
    const density =
      position >= conductionEdge
        ? Math.sqrt(position - conductionEdge + 0.02) * Math.sqrt(1 / effectiveMassRatio) * 0.9
        : 0
    const occupation = 1 / (1 + Math.exp((position - fermiLevel) / 0.08))
    return {
      position,
      primaryValue: density,
      secondaryValue: occupation,
      label: "electronic-density-of-states-profile",
      active: Math.abs(position - activeEnergy) <= (energyMax - energyMin) / sampleCount,
    }
  })
}

function buildSamples(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
): readonly SolidStatePhysicsSample[] {
  if (scenario.id === "phonon-dispersion") {
    return buildPhononSamples(scenario, snapshot)
  }

  if (scenario.id === "electronic-structure") {
    return buildElectronicSamples(scenario, snapshot)
  }

  return buildCrystalSamples(scenario, snapshot)
}

@Injectable()
export class SolidStatePhysicsStateService {
  private readonly scenarios = signal(SCENARIOS.map((scenario) => cloneScenario(scenario)))
  private readonly selectedScenarioId = signal<SolidStatePhysicsScenarioId>("crystal-elasticity")
  private readonly timeSeconds = signal(DEFAULT_TIMES["crystal-elasticity"])

  readonly selectedScenario = computed(() =>
    cloneScenario(
      this.scenarios().find((scenario) => scenario.id === this.selectedScenarioId()) ??
        this.scenarios()[0],
    ),
  )
  readonly currentState = computed(() => buildSnapshot(this.selectedScenario(), this.timeSeconds()))
  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), this.currentState()),
  )

  listScenarios(): readonly SolidStatePhysicsScenario[] {
    return this.scenarios()
  }

  selectScenario(id: SolidStatePhysicsScenarioId): void {
    this.selectedScenarioId.set(id)
    this.timeSeconds.set(DEFAULT_TIMES[id])
  }

  updateField(field: EditableSolidStatePhysicsField, value: number): void {
    if (!Number.isFinite(value)) {
      return
    }

    if (field === "timeSeconds") {
      this.timeSeconds.set(clamp(value, 0, this.selectedScenario().durationSeconds))
      return
    }

    const selectedId = this.selectedScenarioId()
    this.scenarios.update((scenarios) =>
      scenarios.map((scenario) =>
        scenario.id !== selectedId
          ? scenario
          : normalizeScenario({
              ...scenario,
              [field]: value,
            }),
      ),
    )
  }

  importScenarioState(payload: {
    scenario: SolidStatePhysicsScenario
    snapshot: { timeSeconds: number }
  }): void {
    const scenario = normalizeScenario(payload.scenario)
    this.scenarios.update((scenarios) =>
      scenarios.map((candidate) => (candidate.id === scenario.id ? scenario : candidate)),
    )
    this.selectedScenarioId.set(scenario.id)
    this.timeSeconds.set(clamp(payload.snapshot.timeSeconds, 0, scenario.durationSeconds))
  }

  resetSelectedScenario(): void {
    const id = this.selectedScenarioId()
    const base = findBaseScenario(id)
    this.scenarios.update((scenarios) =>
      scenarios.map((scenario) => (scenario.id === id ? base : scenario)),
    )
    this.timeSeconds.set(DEFAULT_TIMES[id])
  }
}

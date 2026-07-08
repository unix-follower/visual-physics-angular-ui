import { computed, Injectable, signal } from "@angular/core"

import {
  NuclearAndParticlePhysicsSample,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsScenarioId,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

export type EditableNuclearAndParticlePhysicsField =
  | "timeSeconds"
  | "halfLifeHours"
  | "initialPopulationTrillions"
  | "massNumber"
  | "protonCount"
  | "bindingEnergyPerNucleonMeV"
  | "beamEnergyGeV"
  | "scatteringAngleDegrees"
  | "detectorRadiusMeters"

const SCENARIOS: readonly NuclearAndParticlePhysicsScenario[] = [
  {
    id: "radioactive-decay",
    name: "Radioactive Decay",
    summary:
      "Follow exponential decay, remaining population, and activity as a starter nuclear-timing slice.",
    equationSummary: "N(t) = N0 2^(-t / t1/2), A = lambda N",
    status: "Starter decay slice",
    durationSeconds: 1,
    focusArea:
      "Half-life intuition, residual population, and activity drop across one shared decay view.",
    halfLifeHours: 18,
    initialPopulationTrillions: 6.2,
  },
  {
    id: "binding-energy-curve",
    name: "Binding Energy Curve",
    summary:
      "Inspect total binding energy and stability trends around a representative mid-mass nucleus.",
    equationSummary: "E_total approx A * (BE / A)",
    status: "Starter nuclear-structure slice",
    durationSeconds: 1,
    focusArea: "Mass-number scaling, proton fraction, and per-nucleon stability context.",
    massNumber: 56,
    protonCount: 26,
    bindingEnergyPerNucleonMeV: 8.8,
  },
  {
    id: "proton-proton-collision",
    name: "Proton-Proton Collision",
    summary:
      "Estimate invariant mass, transverse momentum, and detector reach for a simplified collider event.",
    equationSummary: "m_inv approx 2E sin(theta/2), pT approx E sin(theta/2)",
    status: "Starter collider slice",
    durationSeconds: 1,
    focusArea:
      "Beam energy, scattering angle, and detector scale in a first particle-physics event view.",
    beamEnergyGeV: 6.5,
    scatteringAngleDegrees: 28,
    detectorRadiusMeters: 1.4,
  },
]

const DEFAULT_TIMES: Record<NuclearAndParticlePhysicsScenarioId, number> = {
  "radioactive-decay": 0.35,
  "binding-energy-curve": 0.45,
  "proton-proton-collision": 0.55,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function cloneScenario(
  scenario: NuclearAndParticlePhysicsScenario,
): NuclearAndParticlePhysicsScenario {
  return { ...scenario }
}

function findBaseScenario(
  id: NuclearAndParticlePhysicsScenarioId,
): NuclearAndParticlePhysicsScenario {
  return cloneScenario(SCENARIOS.find((candidate) => candidate.id === id) ?? SCENARIOS[0])
}

function normalizeScenario(
  scenario: NuclearAndParticlePhysicsScenario,
): NuclearAndParticlePhysicsScenario {
  const base = findBaseScenario(scenario.id)

  if (scenario.id === "radioactive-decay") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      focusArea: scenario.focusArea,
      halfLifeHours: clamp(scenario.halfLifeHours ?? base.halfLifeHours ?? 18, 0.5, 240),
      initialPopulationTrillions: clamp(
        scenario.initialPopulationTrillions ?? base.initialPopulationTrillions ?? 6.2,
        0.1,
        20,
      ),
    }
  }

  if (scenario.id === "binding-energy-curve") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      focusArea: scenario.focusArea,
      massNumber: Math.round(clamp(scenario.massNumber ?? base.massNumber ?? 56, 4, 240)),
      protonCount: Math.round(
        clamp(
          scenario.protonCount ?? base.protonCount ?? 26,
          1,
          scenario.massNumber ?? base.massNumber ?? 56,
        ),
      ),
      bindingEnergyPerNucleonMeV: clamp(
        scenario.bindingEnergyPerNucleonMeV ?? base.bindingEnergyPerNucleonMeV ?? 8.8,
        0.5,
        10,
      ),
    }
  }

  return {
    id: base.id,
    name: scenario.name,
    summary: scenario.summary,
    equationSummary: scenario.equationSummary,
    status: scenario.status,
    durationSeconds: Math.max(scenario.durationSeconds, 0),
    focusArea: scenario.focusArea,
    beamEnergyGeV: clamp(scenario.beamEnergyGeV ?? base.beamEnergyGeV ?? 6.5, 0.5, 20),
    scatteringAngleDegrees: clamp(
      scenario.scatteringAngleDegrees ?? base.scatteringAngleDegrees ?? 28,
      1,
      175,
    ),
    detectorRadiusMeters: clamp(
      scenario.detectorRadiusMeters ?? base.detectorRadiusMeters ?? 1.4,
      0.2,
      6,
    ),
  }
}

function buildDecaySnapshot(
  scenario: NuclearAndParticlePhysicsScenario,
  timeSeconds: number,
): NuclearAndParticlePhysicsStateSnapshot {
  const halfLifeHours = scenario.halfLifeHours ?? 18
  const initialPopulationTrillions = scenario.initialPopulationTrillions ?? 6.2
  const elapsedHours = clamp(timeSeconds, 0, 1) * halfLifeHours * 4
  const remainingFraction = Math.pow(0.5, elapsedHours / halfLifeHours)
  const remainingPopulationTrillions = initialPopulationTrillions * remainingFraction
  const activityTerabecquerels = (Math.log(2) / halfLifeHours) * remainingPopulationTrillions * 12

  return {
    timeSeconds,
    elapsedHours,
    remainingPopulationTrillions,
    remainingFraction,
    activityTerabecquerels,
    stable: remainingPopulationTrillions >= 0 && activityTerabecquerels >= 0,
  }
}

function buildBindingSnapshot(
  scenario: NuclearAndParticlePhysicsScenario,
  timeSeconds: number,
): NuclearAndParticlePhysicsStateSnapshot {
  const massNumber = scenario.massNumber ?? 56
  const protonCount = scenario.protonCount ?? 26
  const bindingEnergyPerNucleonMeV = scenario.bindingEnergyPerNucleonMeV ?? 8.8
  const adjustedMassNumber = Math.round(massNumber + (clamp(timeSeconds, 0, 1) - 0.5) * 20)
  const totalBindingEnergyMeV = adjustedMassNumber * bindingEnergyPerNucleonMeV
  const protonFraction = protonCount / Math.max(adjustedMassNumber, 1)
  const stabilityIndex = clamp(1 - Math.abs(protonFraction - 0.46) * 3, 0, 1)

  return {
    timeSeconds,
    totalBindingEnergyMeV,
    stabilityIndex,
    stable: stabilityIndex >= 0.4,
  }
}

function buildCollisionSnapshot(
  scenario: NuclearAndParticlePhysicsScenario,
  timeSeconds: number,
): NuclearAndParticlePhysicsStateSnapshot {
  const beamEnergyGeV = scenario.beamEnergyGeV ?? 6.5
  const scatteringAngleDegrees = scenario.scatteringAngleDegrees ?? 28
  const detectorRadiusMeters = scenario.detectorRadiusMeters ?? 1.4
  const dynamicAngleDegrees = scatteringAngleDegrees * (0.65 + clamp(timeSeconds, 0, 1) * 0.5)
  const theta = (dynamicAngleDegrees * Math.PI) / 180
  const invariantMassGeV = 2 * beamEnergyGeV * Math.sin(theta / 2)
  const transverseMomentumGeV = beamEnergyGeV * Math.sin(theta / 2)
  const pseudorapidity = -Math.log(Math.tan(theta / 2))

  return {
    timeSeconds,
    invariantMassGeV,
    transverseMomentumGeV,
    pseudorapidity,
    stable: detectorRadiusMeters * transverseMomentumGeV >= 0.35,
  }
}

function buildSnapshot(
  scenario: NuclearAndParticlePhysicsScenario,
  timeSeconds: number,
): NuclearAndParticlePhysicsStateSnapshot {
  if (scenario.id === "binding-energy-curve") {
    return buildBindingSnapshot(scenario, timeSeconds)
  }

  if (scenario.id === "proton-proton-collision") {
    return buildCollisionSnapshot(scenario, timeSeconds)
  }

  return buildDecaySnapshot(scenario, timeSeconds)
}

function buildDecaySamples(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  sampleCount = 25,
): readonly NuclearAndParticlePhysicsSample[] {
  const halfLifeHours = scenario.halfLifeHours ?? 18
  const initialPopulationTrillions = scenario.initialPopulationTrillions ?? 6.2
  const activeHours = snapshot.elapsedHours ?? 0
  const maxHours = halfLifeHours * 4

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = (index / (sampleCount - 1)) * maxHours
    const remainingFraction = Math.pow(0.5, position / halfLifeHours)
    return {
      position,
      primaryValue: initialPopulationTrillions * remainingFraction,
      secondaryValue:
        (Math.log(2) / halfLifeHours) * initialPopulationTrillions * remainingFraction * 12,
      label: "radioactive-decay-profile",
      active: Math.abs(position - activeHours) <= maxHours / sampleCount,
    }
  })
}

function buildBindingSamples(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  sampleCount = 23,
): readonly NuclearAndParticlePhysicsSample[] {
  const massNumber = scenario.massNumber ?? 56
  const bindingEnergyPerNucleonMeV = scenario.bindingEnergyPerNucleonMeV ?? 8.8
  const activeTotalBindingEnergy = snapshot.totalBindingEnergyMeV ?? 0

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = Math.round(clamp(massNumber - 20 + index * 2, 4, 240))
    const protonFractionPenalty = Math.abs(position / 120 - 0.46) * 0.8
    const primaryValue =
      position * Math.max(bindingEnergyPerNucleonMeV - protonFractionPenalty, 0.5)
    const secondaryValue = clamp(1 - protonFractionPenalty, 0, 1)
    return {
      position,
      primaryValue,
      secondaryValue,
      label: "binding-energy-curve-profile",
      active:
        Math.abs(primaryValue - activeTotalBindingEnergy) <= Math.max(primaryValue * 0.08, 20),
    }
  })
}

function buildCollisionSamples(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  sampleCount = 25,
): readonly NuclearAndParticlePhysicsSample[] {
  const beamEnergyGeV = scenario.beamEnergyGeV ?? 6.5
  const baseAngle = scenario.scatteringAngleDegrees ?? 28
  const activeInvariantMass = snapshot.invariantMassGeV ?? 0

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = clamp((index / (sampleCount - 1)) * 160 + 5, 5, 175)
    const theta = (position * Math.PI) / 180
    const primaryValue = 2 * beamEnergyGeV * Math.sin(theta / 2)
    const secondaryValue = beamEnergyGeV * Math.sin(theta / 2)
    return {
      position,
      primaryValue,
      secondaryValue,
      label: "proton-proton-collision-profile",
      active:
        Math.abs(primaryValue - activeInvariantMass) <=
        Math.max(activeInvariantMass * 0.08, baseAngle / 25),
    }
  })
}

function buildSamples(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
): readonly NuclearAndParticlePhysicsSample[] {
  if (scenario.id === "binding-energy-curve") {
    return buildBindingSamples(scenario, snapshot)
  }

  if (scenario.id === "proton-proton-collision") {
    return buildCollisionSamples(scenario, snapshot)
  }

  return buildDecaySamples(scenario, snapshot)
}

@Injectable()
export class NuclearAndParticlePhysicsStateService {
  private readonly scenarios = signal(SCENARIOS.map((scenario) => cloneScenario(scenario)))
  private readonly selectedScenarioId =
    signal<NuclearAndParticlePhysicsScenarioId>("radioactive-decay")
  private readonly timeSeconds = signal(DEFAULT_TIMES["radioactive-decay"])

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

  listScenarios(): readonly NuclearAndParticlePhysicsScenario[] {
    return this.scenarios()
  }

  selectScenario(id: NuclearAndParticlePhysicsScenarioId): void {
    this.selectedScenarioId.set(id)
    this.timeSeconds.set(DEFAULT_TIMES[id])
  }

  updateField(field: EditableNuclearAndParticlePhysicsField, value: number): void {
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
        scenario.id === selectedId
          ? normalizeScenario({
              ...scenario,
              [field]: value,
            })
          : scenario,
      ),
    )
  }

  importScenarioState(payload: {
    scenario: NuclearAndParticlePhysicsScenario
    snapshot: { timeSeconds: number }
  }): void {
    const scenario = normalizeScenario(payload.scenario)
    this.scenarios.update((scenarios) =>
      scenarios.map((candidate) => (candidate.id === scenario.id ? scenario : candidate)),
    )
    this.selectedScenarioId.set(scenario.id)
    this.timeSeconds.set(clamp(payload.snapshot.timeSeconds, 0, scenario.durationSeconds))
  }
}

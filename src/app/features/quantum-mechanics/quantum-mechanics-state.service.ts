import { computed, Injectable, signal } from "@angular/core"

import {
  QuantumMechanicsSample,
  QuantumMechanicsScenario,
  QuantumMechanicsScenarioId,
  QuantumMechanicsStateSnapshot,
  ViewBounds,
} from "./quantum-mechanics.models"

export type EditableQuantumMechanicsField =
  | "boxLengthNanometers"
  | "quantumNumber"
  | "particleEnergyEv"
  | "barrierHeightEv"
  | "barrierWidthNanometers"
  | "wavelengthNanometers"
  | "slitSeparationMicrometers"
  | "slitWidthMicrometers"
  | "screenDistanceMeters"

const ELECTRON_MASS_KG = 9.1093837015e-31
const PLANCK_CONSTANT = 6.62607015e-34
const HBAR = 1.054571817e-34
const ELEMENTARY_CHARGE = 1.602176634e-19

const SCENARIOS: readonly QuantumMechanicsScenario[] = [
  {
    id: "particle-in-a-box",
    name: "Particle in a One-Dimensional Box",
    summary:
      "Compute stationary-state energy levels, node count, and probability-density structure for a particle confined between rigid walls.",
    equationSummary: "E_n = n^2 h^2 / (8 m L^2), psi_n(x) = sqrt(2/L) sin(n pi x / L)",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Quantized bound-state energy, spatial nodes, and stationary probability density in a 1D infinite well.",
    boxLengthNanometers: 1.2,
    quantumNumber: 1,
  },
  {
    id: "finite-potential-well-tunneling",
    name: "Finite Barrier Tunneling",
    summary:
      "Estimate transmission, reflection, and evanescent decay for a particle incident on a finite rectangular barrier.",
    equationSummary: "T ~ exp(-2 kappa a), kappa = sqrt(2 m (V - E)) / hbar",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Barrier penetration, forbidden-region decay length, and transmission versus reflection at fixed incident energy.",
    particleEnergyEv: 2.1,
    barrierHeightEv: 3.8,
    barrierWidthNanometers: 0.45,
  },
  {
    id: "double-slit-interference",
    name: "Double-Slit Interference Pattern",
    summary:
      "Estimate fringe spacing and central-envelope behavior for two coherent slits illuminating a distant screen.",
    equationSummary: "Delta y ~ lambda L / d, I(theta) ~ cos^2(beta) sinc^2(alpha)",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Interference spacing, diffraction-envelope width, and screen-intensity structure from coherent two-slit superposition.",
    wavelengthNanometers: 520,
    slitSeparationMicrometers: 120,
    slitWidthMicrometers: 40,
    screenDistanceMeters: 1.8,
  },
]

const DEFAULT_SNAPSHOT_TIMES: Readonly<Record<QuantumMechanicsScenarioId, number>> = {
  "particle-in-a-box": 0,
  "finite-potential-well-tunneling": 0,
  "double-slit-interference": 0.25,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function sinc(value: number): number {
  if (Math.abs(value) < 1e-9) {
    return 1
  }
  return Math.sin(value) / value
}

function buildParticleInBoxSnapshot(
  scenario: QuantumMechanicsScenario,
): QuantumMechanicsStateSnapshot {
  const boxLengthNanometers = Math.max(scenario.boxLengthNanometers ?? 1.2, 0.1)
  const quantumNumber = Math.max(1, Math.round(scenario.quantumNumber ?? 1))
  const boxLengthMeters = boxLengthNanometers * 1e-9
  const energyJoules =
    (quantumNumber ** 2 * PLANCK_CONSTANT ** 2) / (8 * ELECTRON_MASS_KG * boxLengthMeters ** 2)
  const energyLevelEv = energyJoules / ELEMENTARY_CHARGE
  const deBroglieWavelengthNanometers = (2 * boxLengthNanometers) / quantumNumber

  return {
    timeSeconds: 0,
    boxLengthNanometers,
    quantumNumber,
    energyLevelEv,
    deBroglieWavelengthNanometers,
    nodeCount: quantumNumber - 1,
    firstAntinodeNanometers: boxLengthNanometers / (2 * quantumNumber),
    stable: Number.isFinite(energyLevelEv),
  }
}

function buildTunnelingSnapshot(scenario: QuantumMechanicsScenario): QuantumMechanicsStateSnapshot {
  const particleEnergyEv = Math.max(scenario.particleEnergyEv ?? 2.1, 0.05)
  const barrierHeightEv = Math.max(scenario.barrierHeightEv ?? 3.8, particleEnergyEv + 0.01)
  const barrierWidthNanometers = Math.max(scenario.barrierWidthNanometers ?? 0.45, 0.05)
  const barrierWidthMeters = barrierWidthNanometers * 1e-9
  const deltaEnergyJoules = (barrierHeightEv - particleEnergyEv) * ELEMENTARY_CHARGE
  const kappa = Math.sqrt(2 * ELECTRON_MASS_KG * deltaEnergyJoules) / HBAR
  const transmissionProbability = clamp(Math.exp(-2 * kappa * barrierWidthMeters), 1e-6, 0.999999)
  const reflectionProbability = clamp(1 - transmissionProbability, 0, 1)

  return {
    timeSeconds: 0,
    particleEnergyEv,
    barrierHeightEv,
    barrierWidthNanometers,
    transmissionProbability,
    reflectionProbability,
    decayLengthNanometers: (1 / kappa) * 1e9,
    stable: Number.isFinite(transmissionProbability),
  }
}

function buildDoubleSlitSnapshot(
  scenario: QuantumMechanicsScenario,
): QuantumMechanicsStateSnapshot {
  const wavelengthNanometers = Math.max(scenario.wavelengthNanometers ?? 520, 100)
  const slitSeparationMicrometers = Math.max(scenario.slitSeparationMicrometers ?? 120, 1)
  const slitWidthMicrometers = Math.max(scenario.slitWidthMicrometers ?? 40, 1)
  const screenDistanceMeters = Math.max(scenario.screenDistanceMeters ?? 1.8, 0.1)
  const wavelengthMeters = wavelengthNanometers * 1e-9
  const slitSeparationMeters = slitSeparationMicrometers * 1e-6
  const slitWidthMeters = slitWidthMicrometers * 1e-6
  const fringeSpacingMillimeters =
    (screenDistanceMeters * wavelengthMeters * 1000) / slitSeparationMeters
  const centralMaximumWidthMillimeters =
    (2 * screenDistanceMeters * wavelengthMeters * 1000) / slitWidthMeters

  return {
    timeSeconds: 0.25,
    wavelengthNanometers,
    slitSeparationMicrometers,
    slitWidthMicrometers,
    screenDistanceMeters,
    fringeSpacingMillimeters,
    centralMaximumWidthMillimeters,
    coherenceEstimate: slitSeparationMicrometers / slitWidthMicrometers,
    stable: Number.isFinite(fringeSpacingMillimeters),
  }
}

function buildParticleInBoxSamples(
  snapshot: QuantumMechanicsStateSnapshot,
): readonly QuantumMechanicsSample[] {
  const lengthNanometers = snapshot.boxLengthNanometers ?? 1.2
  const quantumNumber = Math.max(1, Math.round(snapshot.quantumNumber ?? 1))
  const samples: QuantumMechanicsSample[] = []
  for (let index = 0; index <= 64; index += 1) {
    const position = (index / 64) * lengthNanometers
    const phase = (quantumNumber * Math.PI * position) / lengthNanometers
    const probabilityDensity = Math.sin(phase) ** 2
    samples.push({
      position,
      primaryValue: probabilityDensity,
      secondaryValue: Math.sin(phase),
      label: "probability-density",
      active: true,
    })
  }
  return samples
}

function buildTunnelingSamples(
  snapshot: QuantumMechanicsStateSnapshot,
): readonly QuantumMechanicsSample[] {
  const widthNanometers = snapshot.barrierWidthNanometers ?? 0.45
  const transmissionProbability = snapshot.transmissionProbability ?? 0
  const decayLengthNanometers = snapshot.decayLengthNanometers ?? 0.1
  const samples: QuantumMechanicsSample[] = []
  for (let index = 0; index <= 72; index += 1) {
    const position = (index / 72) * (widthNanometers * 3)
    let probability = 1
    let potential = 0
    if (position >= widthNanometers && position <= widthNanometers * 2) {
      potential = snapshot.barrierHeightEv ?? 0
      probability = Math.exp(-(position - widthNanometers) / decayLengthNanometers)
    } else if (position > widthNanometers * 2) {
      probability = transmissionProbability
    }
    samples.push({
      position,
      primaryValue: probability,
      secondaryValue: potential,
      label: "tunneling-envelope",
      active: true,
    })
  }
  return samples
}

function buildDoubleSlitSamples(
  snapshot: QuantumMechanicsStateSnapshot,
): readonly QuantumMechanicsSample[] {
  const fringeSpacingMillimeters = snapshot.fringeSpacingMillimeters ?? 1
  const centralMaximumWidthMillimeters = snapshot.centralMaximumWidthMillimeters ?? 2
  const samples: QuantumMechanicsSample[] = []
  for (let index = 0; index <= 96; index += 1) {
    const position = (index / 96 - 0.5) * fringeSpacingMillimeters * 8
    const beta = (Math.PI * position) / fringeSpacingMillimeters
    const alpha = (Math.PI * position) / (centralMaximumWidthMillimeters / 2)
    const intensity = Math.cos(beta) ** 2 * sinc(alpha) ** 2
    samples.push({
      position,
      primaryValue: intensity,
      label: "screen-intensity",
      active: true,
    })
  }
  return samples
}

function getDefaultScenario(id: QuantumMechanicsScenarioId): QuantumMechanicsScenario {
  switch (id) {
    case "particle-in-a-box":
      return SCENARIOS[0]
    case "finite-potential-well-tunneling":
      return SCENARIOS[1]
    case "double-slit-interference":
      return SCENARIOS[2]
  }
}

function normalizeViewBounds(bounds: ViewBounds, fallback: ViewBounds): ViewBounds {
  const minX = Number.isFinite(bounds.minX) ? bounds.minX : fallback.minX
  const maxX = Number.isFinite(bounds.maxX) ? bounds.maxX : fallback.maxX
  const minY = Number.isFinite(bounds.minY) ? bounds.minY : fallback.minY
  const maxY = Number.isFinite(bounds.maxY) ? bounds.maxY : fallback.maxY

  return {
    minX: maxX > minX ? minX : fallback.minX,
    maxX: maxX > minX ? maxX : fallback.maxX,
    minY: maxY > minY ? minY : fallback.minY,
    maxY: maxY > minY ? maxY : fallback.maxY,
  }
}

function normalizeSnapshotTime(timeSeconds: number, fallback: number): number {
  return Number.isFinite(timeSeconds) && timeSeconds >= 0 ? timeSeconds : fallback
}

function normalizeScenario(scenario: QuantumMechanicsScenario): QuantumMechanicsScenario {
  const defaultScenario = getDefaultScenario(scenario.id)
  const baseScenario = {
    id: scenario.id,
    name: scenario.name,
    summary: scenario.summary,
    equationSummary: scenario.equationSummary,
    status: scenario.status,
    durationSeconds: scenario.durationSeconds,
    viewBounds: normalizeViewBounds(scenario.viewBounds, defaultScenario.viewBounds),
    focusArea: scenario.focusArea,
  }

  switch (scenario.id) {
    case "particle-in-a-box":
      return {
        ...baseScenario,
        boxLengthNanometers: Math.max(scenario.boxLengthNanometers ?? 1.2, 0.1),
        quantumNumber: Math.max(1, Math.round(scenario.quantumNumber ?? 1)),
      }
    case "finite-potential-well-tunneling": {
      const particleEnergyEv = Math.max(scenario.particleEnergyEv ?? 2.1, 0.05)
      return {
        ...baseScenario,
        particleEnergyEv,
        barrierHeightEv: Math.max(scenario.barrierHeightEv ?? 3.8, particleEnergyEv + 0.01),
        barrierWidthNanometers: Math.max(scenario.barrierWidthNanometers ?? 0.45, 0.05),
      }
    }
    case "double-slit-interference":
      return {
        ...baseScenario,
        wavelengthNanometers: Math.max(scenario.wavelengthNanometers ?? 520, 100),
        slitSeparationMicrometers: Math.max(scenario.slitSeparationMicrometers ?? 120, 1),
        slitWidthMicrometers: Math.max(scenario.slitWidthMicrometers ?? 40, 1),
        screenDistanceMeters: Math.max(scenario.screenDistanceMeters ?? 1.8, 0.1),
      }
  }
}

@Injectable({ providedIn: "root" })
export class QuantumMechanicsStateService {
  private readonly scenarios = signal<Record<QuantumMechanicsScenarioId, QuantumMechanicsScenario>>(
    {
      "particle-in-a-box": { ...SCENARIOS[0] },
      "finite-potential-well-tunneling": { ...SCENARIOS[1] },
      "double-slit-interference": { ...SCENARIOS[2] },
    },
  )
  private readonly snapshotTimes = signal<Record<QuantumMechanicsScenarioId, number>>({
    ...DEFAULT_SNAPSHOT_TIMES,
  })
  private readonly selectedScenarioId = signal<QuantumMechanicsScenarioId>("particle-in-a-box")

  readonly selectedScenario = computed(() => this.scenarios()[this.selectedScenarioId()])
  readonly currentState = computed<QuantumMechanicsStateSnapshot>(() => {
    const scenario = this.selectedScenario()
    const restoredTimeSeconds = this.snapshotTimes()[scenario.id]
    switch (scenario.id) {
      case "particle-in-a-box":
        return {
          ...buildParticleInBoxSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
      case "finite-potential-well-tunneling":
        return {
          ...buildTunnelingSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
      case "double-slit-interference":
        return {
          ...buildDoubleSlitSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
    }
  })
  readonly sampledStates = computed<readonly QuantumMechanicsSample[]>(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()
    switch (scenario.id) {
      case "particle-in-a-box":
        return buildParticleInBoxSamples(snapshot)
      case "finite-potential-well-tunneling":
        return buildTunnelingSamples(snapshot)
      case "double-slit-interference":
        return buildDoubleSlitSamples(snapshot)
    }
  })

  listScenarios(): readonly QuantumMechanicsScenario[] {
    const scenarios = this.scenarios()
    return [
      scenarios["particle-in-a-box"],
      scenarios["finite-potential-well-tunneling"],
      scenarios["double-slit-interference"],
    ]
  }

  selectScenario(id: QuantumMechanicsScenarioId): void {
    this.selectedScenarioId.set(id)
  }

  updateScenarioField(field: EditableQuantumMechanicsField, value: number): void {
    const id = this.selectedScenarioId()
    this.scenarios.update((scenarios) => ({
      ...scenarios,
      [id]: normalizeScenario({
        ...scenarios[id],
        [field]: value,
      }),
    }))
  }

  importScenarioState(scenario: QuantumMechanicsScenario, timeSeconds: number): void {
    const normalizedTimeSeconds = normalizeSnapshotTime(
      timeSeconds,
      DEFAULT_SNAPSHOT_TIMES[scenario.id],
    )
    this.scenarios.update((scenarios) => ({
      ...scenarios,
      [scenario.id]: normalizeScenario({
        ...scenario,
        durationSeconds: Math.max(normalizedTimeSeconds, scenario.durationSeconds),
      }),
    }))
    this.snapshotTimes.update((times) => ({
      ...times,
      [scenario.id]: normalizedTimeSeconds,
    }))
    this.selectedScenarioId.set(scenario.id)
  }
}

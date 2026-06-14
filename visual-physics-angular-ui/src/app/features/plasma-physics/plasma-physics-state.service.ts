import { computed, Injectable, signal } from "@angular/core"

import {
  PlasmaPhysicsSample,
  PlasmaPhysicsScenario,
  PlasmaPhysicsScenarioId,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

export type EditablePlasmaPhysicsField =
  | "timeSeconds"
  | "electronDensityPerCubicMeter"
  | "electronTemperatureElectronVolts"
  | "perturbationAmplitudePercent"
  | "probePotentialVolts"
  | "magneticFieldTesla"
  | "plasmaCurrentMegaAmperes"
  | "majorRadiusMeters"

const SCENARIOS: readonly PlasmaPhysicsScenario[] = [
  {
    id: "plasma-oscillation",
    name: "Plasma Oscillation",
    summary:
      "Follow a density perturbation, collective restoring field, and plasma-frequency estimate in a starter plasma slice.",
    equationSummary: "omega_p ~ sqrt(n_e), E_restore ~ delta n * T_e",
    status: "Starter collective slice",
    durationSeconds: 1,
    focusArea:
      "Density-driven collective oscillation, restoring-field strength, and frequency intuition in one shared view.",
    electronDensityPerCubicMeter: 3.2e18,
    electronTemperatureElectronVolts: 6.0,
    perturbationAmplitudePercent: 12.0,
  },
  {
    id: "debye-screening",
    name: "Debye Screening",
    summary:
      "Inspect shielding length, screened potential, and charge screening strength around a probe in a plasma.",
    equationSummary: "lambda_D ~ sqrt(T_e / n_e), phi(r) ~ phi0 exp(-r / lambda_D)",
    status: "Starter shielding slice",
    durationSeconds: 1,
    focusArea:
      "Debye length intuition, screened-potential rolloff, and shielding fraction around an inserted probe.",
    electronDensityPerCubicMeter: 1.8e18,
    electronTemperatureElectronVolts: 9.0,
    probePotentialVolts: 18.0,
  },
  {
    id: "magnetic-confinement",
    name: "Magnetic Confinement",
    summary:
      "Estimate confinement quality, gyroradius, and safety-factor trends for a simplified toroidal plasma column.",
    equationSummary: "rho_L ~ 1 / B, q ~ BR / I_p, beta ~ p / B^2",
    status: "Starter confinement slice",
    durationSeconds: 1,
    focusArea:
      "Magnetic-field strength, plasma current, and confinement quality in a first tokamak-style view.",
    magneticFieldTesla: 3.6,
    plasmaCurrentMegaAmperes: 1.4,
    majorRadiusMeters: 2.8,
  },
]

const DEFAULT_TIMES: Record<PlasmaPhysicsScenarioId, number> = {
  "plasma-oscillation": 0.35,
  "debye-screening": 0.45,
  "magnetic-confinement": 0.55,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function cloneScenario(scenario: PlasmaPhysicsScenario): PlasmaPhysicsScenario {
  return { ...scenario }
}

function findBaseScenario(id: PlasmaPhysicsScenarioId): PlasmaPhysicsScenario {
  return cloneScenario(SCENARIOS.find((candidate) => candidate.id === id) ?? SCENARIOS[0])
}

function normalizeScenario(scenario: PlasmaPhysicsScenario): PlasmaPhysicsScenario {
  const base = findBaseScenario(scenario.id)

  if (scenario.id === "plasma-oscillation") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      focusArea: scenario.focusArea,
      electronDensityPerCubicMeter: clamp(
        scenario.electronDensityPerCubicMeter ?? base.electronDensityPerCubicMeter ?? 3.2e18,
        5e16,
        2e20,
      ),
      electronTemperatureElectronVolts: clamp(
        scenario.electronTemperatureElectronVolts ?? base.electronTemperatureElectronVolts ?? 6.0,
        0.5,
        40,
      ),
      perturbationAmplitudePercent: clamp(
        scenario.perturbationAmplitudePercent ?? base.perturbationAmplitudePercent ?? 12.0,
        1,
        40,
      ),
    }
  }

  if (scenario.id === "debye-screening") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      focusArea: scenario.focusArea,
      electronDensityPerCubicMeter: clamp(
        scenario.electronDensityPerCubicMeter ?? base.electronDensityPerCubicMeter ?? 1.8e18,
        5e16,
        5e19,
      ),
      electronTemperatureElectronVolts: clamp(
        scenario.electronTemperatureElectronVolts ?? base.electronTemperatureElectronVolts ?? 9.0,
        0.2,
        50,
      ),
      probePotentialVolts: clamp(
        scenario.probePotentialVolts ?? base.probePotentialVolts ?? 18.0,
        1,
        100,
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
    magneticFieldTesla: clamp(
      scenario.magneticFieldTesla ?? base.magneticFieldTesla ?? 3.6,
      0.3,
      12,
    ),
    plasmaCurrentMegaAmperes: clamp(
      scenario.plasmaCurrentMegaAmperes ?? base.plasmaCurrentMegaAmperes ?? 1.4,
      0.1,
      15,
    ),
    majorRadiusMeters: clamp(scenario.majorRadiusMeters ?? base.majorRadiusMeters ?? 2.8, 0.5, 8),
  }
}

function buildOscillationSnapshot(
  scenario: PlasmaPhysicsScenario,
  timeSeconds: number,
): PlasmaPhysicsStateSnapshot {
  const electronDensityPerCubicMeter = scenario.electronDensityPerCubicMeter ?? 3.2e18
  const electronTemperatureElectronVolts = scenario.electronTemperatureElectronVolts ?? 6.0
  const perturbationAmplitudePercent = scenario.perturbationAmplitudePercent ?? 12.0
  const densityScale = Math.sqrt(electronDensityPerCubicMeter / 1e18)
  const phase = clamp(timeSeconds, 0, 1) * Math.PI * 2
  const plasmaFrequencyGigahertz = 8.98 * densityScale
  const oscillationPeriodNanoseconds = 1 / Math.max(plasmaFrequencyGigahertz, 0.01)
  const restoringFieldKilovoltsPerMeter =
    (perturbationAmplitudePercent / 100) *
    electronTemperatureElectronVolts *
    densityScale *
    (0.85 + 0.15 * Math.cos(phase))

  return {
    timeSeconds,
    plasmaFrequencyGigahertz,
    oscillationPeriodNanoseconds,
    restoringFieldKilovoltsPerMeter,
    stable:
      Number.isFinite(plasmaFrequencyGigahertz) &&
      Number.isFinite(oscillationPeriodNanoseconds) &&
      restoringFieldKilovoltsPerMeter > 0,
  }
}

function buildDebyeSnapshot(
  scenario: PlasmaPhysicsScenario,
  timeSeconds: number,
): PlasmaPhysicsStateSnapshot {
  const electronDensityPerCubicMeter = scenario.electronDensityPerCubicMeter ?? 1.8e18
  const electronTemperatureElectronVolts = scenario.electronTemperatureElectronVolts ?? 9.0
  const probePotentialVolts = scenario.probePotentialVolts ?? 18.0
  const densityUnits = Math.max(electronDensityPerCubicMeter / 1e18, 0.05)
  const debyeLengthMillimeters = 0.23 * Math.sqrt(electronTemperatureElectronVolts / densityUnits)
  const activeRadiusMillimeters = debyeLengthMillimeters * (0.5 + clamp(timeSeconds, 0, 1))
  const shieldingFraction = clamp(
    1 - Math.exp(-activeRadiusMillimeters / Math.max(debyeLengthMillimeters, 0.001)),
    0,
    1,
  )
  const screenedPotentialVolts =
    probePotentialVolts *
    Math.exp(-activeRadiusMillimeters / Math.max(debyeLengthMillimeters, 0.001))

  return {
    timeSeconds,
    debyeLengthMillimeters,
    shieldingFraction,
    screenedPotentialVolts,
    stable: screenedPotentialVolts <= probePotentialVolts,
  }
}

function buildConfinementSnapshot(
  scenario: PlasmaPhysicsScenario,
  timeSeconds: number,
): PlasmaPhysicsStateSnapshot {
  const magneticFieldTesla = scenario.magneticFieldTesla ?? 3.6
  const plasmaCurrentMegaAmperes = scenario.plasmaCurrentMegaAmperes ?? 1.4
  const majorRadiusMeters = scenario.majorRadiusMeters ?? 2.8
  const larmorRadiusMillimeters =
    (4.6 / magneticFieldTesla) * (0.8 + 0.4 * clamp(timeSeconds, 0, 1))
  const betaPercent = clamp(
    (plasmaCurrentMegaAmperes * 9.6) / (magneticFieldTesla * majorRadiusMeters),
    0.5,
    14,
  )
  const safetyFactor =
    (5 * magneticFieldTesla * majorRadiusMeters) / Math.max(plasmaCurrentMegaAmperes, 0.1)

  return {
    timeSeconds,
    larmorRadiusMillimeters,
    betaPercent,
    safetyFactor,
    stable: safetyFactor >= 1 && safetyFactor <= 7 && betaPercent <= 9.5,
  }
}

function buildSnapshot(
  scenario: PlasmaPhysicsScenario,
  timeSeconds: number,
): PlasmaPhysicsStateSnapshot {
  if (scenario.id === "debye-screening") {
    return buildDebyeSnapshot(scenario, timeSeconds)
  }

  if (scenario.id === "magnetic-confinement") {
    return buildConfinementSnapshot(scenario, timeSeconds)
  }

  return buildOscillationSnapshot(scenario, timeSeconds)
}

function buildOscillationSamples(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  sampleCount = 25,
): readonly PlasmaPhysicsSample[] {
  const perturbationAmplitudePercent = scenario.perturbationAmplitudePercent ?? 12.0
  const electronTemperatureElectronVolts = scenario.electronTemperatureElectronVolts ?? 6.0
  const densityScale = Math.sqrt((scenario.electronDensityPerCubicMeter ?? 3.2e18) / 1e18)

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = index / (sampleCount - 1)
    const phase = position * Math.PI * 2
    const primaryValue = 1 + (perturbationAmplitudePercent / 100) * Math.cos(phase)
    const secondaryValue =
      electronTemperatureElectronVolts * densityScale * (0.85 + 0.15 * Math.cos(phase))
    return {
      position,
      primaryValue,
      secondaryValue,
      label: "plasma-oscillation-profile",
      active: Math.abs(position - snapshot.timeSeconds) <= 1 / sampleCount,
    }
  })
}

function buildDebyeSamples(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  sampleCount = 25,
): readonly PlasmaPhysicsSample[] {
  const probePotentialVolts = scenario.probePotentialVolts ?? 18.0
  const debyeLengthMillimeters = snapshot.debyeLengthMillimeters ?? 1.0
  const activeRadiusMillimeters = debyeLengthMillimeters * (0.5 + clamp(snapshot.timeSeconds, 0, 1))
  const maxRadiusMillimeters = debyeLengthMillimeters * 3

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = (index / (sampleCount - 1)) * maxRadiusMillimeters
    const primaryValue =
      probePotentialVolts * Math.exp(-position / Math.max(debyeLengthMillimeters, 0.001))
    const secondaryValue = clamp(
      1 - Math.exp(-position / Math.max(debyeLengthMillimeters, 0.001)),
      0,
      1,
    )
    return {
      position,
      primaryValue,
      secondaryValue,
      label: "debye-screening-profile",
      active: Math.abs(position - activeRadiusMillimeters) <= maxRadiusMillimeters / sampleCount,
    }
  })
}

function buildConfinementSamples(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  sampleCount = 21,
): readonly PlasmaPhysicsSample[] {
  const betaPercent = snapshot.betaPercent ?? 0
  const safetyFactor = snapshot.safetyFactor ?? 0
  const activeRadiusFraction = clamp(snapshot.timeSeconds, 0, 1)

  return Array.from({ length: sampleCount }, (_, index) => {
    const position = index / (sampleCount - 1)
    const primaryValue = betaPercent * (1 - 0.65 * position * position)
    const secondaryValue = safetyFactor * (0.82 + 0.18 * position)
    return {
      position,
      primaryValue,
      secondaryValue,
      label: "magnetic-confinement-profile",
      active: Math.abs(position - activeRadiusFraction) <= 1 / sampleCount,
    }
  })
}

function buildSamples(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
): readonly PlasmaPhysicsSample[] {
  if (scenario.id === "debye-screening") {
    return buildDebyeSamples(scenario, snapshot)
  }

  if (scenario.id === "magnetic-confinement") {
    return buildConfinementSamples(scenario, snapshot)
  }

  return buildOscillationSamples(scenario, snapshot)
}

@Injectable()
export class PlasmaPhysicsStateService {
  private readonly scenarios = signal(SCENARIOS.map((scenario) => cloneScenario(scenario)))
  private readonly selectedScenarioId = signal<PlasmaPhysicsScenarioId>("plasma-oscillation")
  private readonly timeSeconds = signal(DEFAULT_TIMES["plasma-oscillation"])

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

  listScenarios(): readonly PlasmaPhysicsScenario[] {
    return this.scenarios()
  }

  selectScenario(id: PlasmaPhysicsScenarioId): void {
    this.selectedScenarioId.set(id)
    this.timeSeconds.set(DEFAULT_TIMES[id])
  }

  updateField(field: EditablePlasmaPhysicsField, value: number): void {
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
    scenario: PlasmaPhysicsScenario
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

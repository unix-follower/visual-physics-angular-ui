import { computed, Injectable, signal } from "@angular/core"

import {
  RelativitySample,
  RelativityScenario,
  RelativityScenarioId,
  RelativityStateSnapshot,
} from "./relativity.models"

export type EditableRelativityField =
  | "relativeVelocityFractionOfLight"
  | "properTimeSeconds"
  | "emittedFrequencyHertz"
  | "sourceVelocityFractionOfLight"
  | "observerVelocityFractionOfLight"
  | "centralMassSolarMasses"
  | "orbitalRadiusSchwarzschildRadii"
  | "coordinateTimeSeconds"

const SPEED_OF_LIGHT_METERS_PER_SECOND = 299_792_458
const GRAVITATIONAL_CONSTANT = 6.6743e-11
const SOLAR_MASS_KILOGRAMS = 1.98847e30

const SCENARIOS: readonly RelativityScenario[] = [
  {
    id: "time-dilation",
    name: "Inertial Time Dilation",
    summary: "Compare proper time to coordinate time for a moving clock using the Lorentz factor.",
    equationSummary: "gamma = 1 / sqrt(1 - beta^2), t = gamma tau",
    status: "Initial analytic slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 0.98, minY: 0, maxY: 6 },
    focusArea:
      "Lorentz-factor growth, elapsed-time separation, and nonlinear relativistic scaling as velocity approaches c.",
    relativeVelocityFractionOfLight: 0.8,
    properTimeSeconds: 1,
  },
  {
    id: "relativistic-doppler",
    name: "Relativistic Doppler Shift",
    summary:
      "Compare relativistic and classical longitudinal Doppler predictions for high-speed source and observer motion.",
    equationSummary: "f_obs = f_emit sqrt((1 - beta_rel) / (1 + beta_rel))",
    status: "Initial analytic slice",
    durationSeconds: 0,
    viewBounds: { minX: -0.95, maxX: 0.95, minY: 0, maxY: 1200 },
    focusArea:
      "Relative-motion redshift and blueshift, plus the growing gap between classical and relativistic predictions.",
    emittedFrequencyHertz: 440,
    sourceVelocityFractionOfLight: 0.35,
    observerVelocityFractionOfLight: 0,
  },
  {
    id: "gravitational-time-dilation",
    name: "Gravitational Time Dilation",
    summary:
      "Estimate clock-rate slowdown near a compact spherical mass using the Schwarzschild time-dilation factor.",
    equationSummary: "d tau = d t sqrt(1 - r_s / r)",
    status: "Initial analytic slice",
    durationSeconds: 1,
    viewBounds: { minX: 1, maxX: 12, minY: 0, maxY: 1.1 },
    focusArea:
      "Clock-rate suppression close to the Schwarzschild radius and recovery toward the far-field limit.",
    centralMassSolarMasses: 1,
    orbitalRadiusSchwarzschildRadii: 6,
    coordinateTimeSeconds: 1,
  },
]

function cloneScenario(scenario: RelativityScenario): RelativityScenario {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clampBeta(value: number): number {
  return clamp(value, -0.95, 0.95)
}

function normalizeViewBounds(
  viewBounds: RelativityScenario["viewBounds"],
  fallback: RelativityScenario["viewBounds"],
): RelativityScenario["viewBounds"] {
  if (
    !Number.isFinite(viewBounds.minX) ||
    !Number.isFinite(viewBounds.maxX) ||
    !Number.isFinite(viewBounds.minY) ||
    !Number.isFinite(viewBounds.maxY) ||
    viewBounds.maxX <= viewBounds.minX ||
    viewBounds.maxY <= viewBounds.minY
  ) {
    return { ...fallback }
  }

  return {
    minX: viewBounds.minX,
    maxX: viewBounds.maxX,
    minY: viewBounds.minY,
    maxY: viewBounds.maxY,
  }
}

function getDefaultScenario(id: RelativityScenarioId): RelativityScenario {
  return cloneScenario(SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0])
}

function lorentzGamma(beta: number): number {
  return 1 / Math.sqrt(Math.max(1 - beta * beta, 1e-9))
}

function normalizeScenario(scenario: RelativityScenario): RelativityScenario {
  const base = getDefaultScenario(scenario.id)
  const shared = {
    id: scenario.id,
    name: scenario.name,
    summary: scenario.summary,
    equationSummary: scenario.equationSummary,
    status: scenario.status,
    durationSeconds: Math.max(scenario.durationSeconds, 0),
    viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
    focusArea: scenario.focusArea,
  }

  if (scenario.id === "time-dilation") {
    return {
      ...shared,
      relativeVelocityFractionOfLight: clampBeta(
        scenario.relativeVelocityFractionOfLight ?? base.relativeVelocityFractionOfLight ?? 0.8,
      ),
      properTimeSeconds: Math.max(scenario.properTimeSeconds ?? base.properTimeSeconds ?? 1, 0.01),
    }
  }

  if (scenario.id === "relativistic-doppler") {
    return {
      ...shared,
      emittedFrequencyHertz: Math.max(
        scenario.emittedFrequencyHertz ?? base.emittedFrequencyHertz ?? 440,
        1,
      ),
      sourceVelocityFractionOfLight: clampBeta(
        scenario.sourceVelocityFractionOfLight ?? base.sourceVelocityFractionOfLight ?? 0.35,
      ),
      observerVelocityFractionOfLight: clampBeta(
        scenario.observerVelocityFractionOfLight ?? base.observerVelocityFractionOfLight ?? 0,
      ),
    }
  }

  return {
    ...shared,
    centralMassSolarMasses: Math.max(
      scenario.centralMassSolarMasses ?? base.centralMassSolarMasses ?? 1,
      0.1,
    ),
    orbitalRadiusSchwarzschildRadii: Math.max(
      scenario.orbitalRadiusSchwarzschildRadii ?? base.orbitalRadiusSchwarzschildRadii ?? 6,
      1.1,
    ),
    coordinateTimeSeconds: Math.max(
      scenario.coordinateTimeSeconds ?? base.coordinateTimeSeconds ?? 1,
      0.01,
    ),
  }
}

function buildTimeDilationSnapshot(scenario: RelativityScenario): RelativityStateSnapshot {
  const beta = clampBeta(scenario.relativeVelocityFractionOfLight ?? 0.8)
  const properTimeSeconds = Math.max(scenario.properTimeSeconds ?? 1, 0.01)
  const gamma = lorentzGamma(beta)
  const dilatedTimeSeconds = gamma * properTimeSeconds

  return {
    timeSeconds: properTimeSeconds,
    relativeVelocityFractionOfLight: beta,
    properTimeSeconds,
    lorentzFactorGamma: gamma,
    dilatedTimeSeconds,
    timeDifferenceSeconds: dilatedTimeSeconds - properTimeSeconds,
    stable: Number.isFinite(gamma) && Number.isFinite(dilatedTimeSeconds),
  }
}

function buildRelativisticDopplerSnapshot(scenario: RelativityScenario): RelativityStateSnapshot {
  const emittedFrequencyHertz = Math.max(scenario.emittedFrequencyHertz ?? 440, 1)
  const sourceVelocityFractionOfLight = clampBeta(scenario.sourceVelocityFractionOfLight ?? 0.35)
  const observerVelocityFractionOfLight = clampBeta(scenario.observerVelocityFractionOfLight ?? 0)
  const relativeVelocityFractionOfLight = clampBeta(
    (sourceVelocityFractionOfLight - observerVelocityFractionOfLight) /
      (1 - sourceVelocityFractionOfLight * observerVelocityFractionOfLight),
  )
  const observedFrequencyHertz =
    emittedFrequencyHertz *
    Math.sqrt(
      Math.max((1 - relativeVelocityFractionOfLight) / (1 + relativeVelocityFractionOfLight), 1e-9),
    )
  const classicalObservedFrequencyHertz =
    emittedFrequencyHertz * (1 - relativeVelocityFractionOfLight)

  return {
    timeSeconds: 0,
    relativeVelocityFractionOfLight,
    emittedFrequencyHertz,
    sourceVelocityFractionOfLight,
    observerVelocityFractionOfLight,
    observedFrequencyHertz,
    classicalObservedFrequencyHertz,
    shiftRatio: observedFrequencyHertz / emittedFrequencyHertz,
    redshift: observedFrequencyHertz < emittedFrequencyHertz,
    stable: Number.isFinite(observedFrequencyHertz),
  }
}

function buildGravitationalTimeDilationSnapshot(
  scenario: RelativityScenario,
): RelativityStateSnapshot {
  const centralMassSolarMasses = Math.max(scenario.centralMassSolarMasses ?? 1, 0.1)
  const orbitalRadiusSchwarzschildRadii = Math.max(
    scenario.orbitalRadiusSchwarzschildRadii ?? 6,
    1.1,
  )
  const coordinateTimeSeconds = Math.max(scenario.coordinateTimeSeconds ?? 1, 0.01)
  const schwarzschildRadiusMeters =
    (2 * GRAVITATIONAL_CONSTANT * centralMassSolarMasses * SOLAR_MASS_KILOGRAMS) /
    (SPEED_OF_LIGHT_METERS_PER_SECOND * SPEED_OF_LIGHT_METERS_PER_SECOND)
  const gravitationalTimeFactor = Math.sqrt(Math.max(1 - 1 / orbitalRadiusSchwarzschildRadii, 1e-9))
  const localElapsedTimeSeconds = coordinateTimeSeconds * gravitationalTimeFactor

  return {
    timeSeconds: coordinateTimeSeconds,
    centralMassSolarMasses,
    orbitalRadiusSchwarzschildRadii,
    schwarzschildRadiusKilometers: schwarzschildRadiusMeters / 1000,
    gravitationalTimeFactor,
    localElapsedTimeSeconds,
    timeDifferenceSeconds: coordinateTimeSeconds - localElapsedTimeSeconds,
    stable: Number.isFinite(localElapsedTimeSeconds) && gravitationalTimeFactor > 0,
  }
}

function buildSnapshot(scenario: RelativityScenario): RelativityStateSnapshot {
  if (scenario.id === "relativistic-doppler") {
    return buildRelativisticDopplerSnapshot(scenario)
  }

  if (scenario.id === "gravitational-time-dilation") {
    return buildGravitationalTimeDilationSnapshot(scenario)
  }

  return buildTimeDilationSnapshot(scenario)
}

function buildTimeDilationSamples(snapshot: RelativityStateSnapshot): readonly RelativitySample[] {
  const properTimeSeconds = snapshot.properTimeSeconds ?? 1
  const activeBeta = snapshot.relativeVelocityFractionOfLight ?? 0
  const samples: RelativitySample[] = []
  for (let index = 0; index <= 48; index += 1) {
    const position = (index / 48) * 0.95
    const gamma = lorentzGamma(position)
    samples.push({
      position,
      primaryValue: gamma * properTimeSeconds,
      secondaryValue: properTimeSeconds,
      label: "time-dilation-curve",
      active: Math.abs(position - activeBeta) < 0.01,
    })
  }
  return samples
}

function buildRelativisticDopplerSamples(
  snapshot: RelativityStateSnapshot,
): readonly RelativitySample[] {
  const emittedFrequencyHertz = snapshot.emittedFrequencyHertz ?? 440
  const activeBeta = snapshot.relativeVelocityFractionOfLight ?? 0
  const samples: RelativitySample[] = []
  for (let index = 0; index <= 48; index += 1) {
    const position = -0.9 + (index / 48) * 1.8
    const relativisticObservedFrequency =
      emittedFrequencyHertz * Math.sqrt(Math.max((1 - position) / (1 + position), 1e-9))
    samples.push({
      position,
      primaryValue: relativisticObservedFrequency,
      secondaryValue: emittedFrequencyHertz * (1 - position),
      label: "relativistic-doppler-curve",
      active: Math.abs(position - activeBeta) < 0.02,
    })
  }
  return samples
}

function buildGravitationalTimeDilationSamples(
  snapshot: RelativityStateSnapshot,
): readonly RelativitySample[] {
  const coordinateTimeSeconds = snapshot.timeSeconds
  const activeRadius = snapshot.orbitalRadiusSchwarzschildRadii ?? 6
  const maxRadius = Math.max(activeRadius * 1.2, 12)
  const samples: RelativitySample[] = []
  for (let index = 0; index <= 48; index += 1) {
    const position = 1.1 + (index / 48) * (maxRadius - 1.1)
    const factor = Math.sqrt(Math.max(1 - 1 / position, 1e-9))
    samples.push({
      position,
      primaryValue: factor,
      secondaryValue: coordinateTimeSeconds * factor,
      label: "gravitational-time-dilation-curve",
      active: Math.abs(position - activeRadius) < Math.max(0.08, maxRadius / 160),
    })
  }
  return samples
}

function buildSamples(
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
): readonly RelativitySample[] {
  if (scenario.id === "relativistic-doppler") {
    return buildRelativisticDopplerSamples(snapshot)
  }

  if (scenario.id === "gravitational-time-dilation") {
    return buildGravitationalTimeDilationSamples(snapshot)
  }

  return buildTimeDilationSamples(snapshot)
}

@Injectable({ providedIn: "root" })
export class RelativityStateService {
  private readonly scenarios = signal<Record<RelativityScenarioId, RelativityScenario>>({
    "time-dilation": getDefaultScenario("time-dilation"),
    "relativistic-doppler": getDefaultScenario("relativistic-doppler"),
    "gravitational-time-dilation": getDefaultScenario("gravitational-time-dilation"),
  })
  private readonly selectedScenarioId = signal<RelativityScenarioId>("time-dilation")

  readonly selectedScenario = computed(() => this.scenarios()[this.selectedScenarioId()])
  readonly currentState = computed(() => buildSnapshot(this.selectedScenario()))
  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), this.currentState()),
  )

  listScenarios(): readonly RelativityScenario[] {
    return SCENARIOS.map((scenario) => cloneScenario(scenario))
  }

  selectScenario(id: RelativityScenarioId): void {
    this.selectedScenarioId.set(id)
  }

  updateScenarioField(field: EditableRelativityField, value: number): void {
    if (!Number.isFinite(value)) {
      return
    }

    const id = this.selectedScenarioId()
    this.scenarios.update((current) => ({
      ...current,
      [id]: normalizeScenario({
        ...current[id],
        [field]: value,
      }),
    }))
  }

  importScenarioState(scenario: RelativityScenario, timeSeconds: number): void {
    const normalized = normalizeScenario(scenario)
    const adjusted =
      normalized.id === "time-dilation"
        ? normalizeScenario({ ...normalized, properTimeSeconds: timeSeconds })
        : normalized.id === "gravitational-time-dilation"
          ? normalizeScenario({ ...normalized, coordinateTimeSeconds: timeSeconds })
          : normalized

    this.scenarios.update((current) => ({
      ...current,
      [adjusted.id]: adjusted,
    }))
    this.selectedScenarioId.set(adjusted.id)
  }

  resetSelectedScenario(): void {
    const id = this.selectedScenarioId()
    this.scenarios.update((current) => ({
      ...current,
      [id]: getDefaultScenario(id),
    }))
  }
}

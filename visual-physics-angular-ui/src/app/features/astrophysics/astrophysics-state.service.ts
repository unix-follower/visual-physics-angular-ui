import { computed, Injectable, signal } from "@angular/core"

import {
  AstrophysicsSample,
  AstrophysicsScenario,
  AstrophysicsScenarioId,
  AstrophysicsStateSnapshot,
} from "./astrophysics.models"

export type EditableAstrophysicsField =
  | "timeSeconds"
  | "centralMassSolarMasses"
  | "orbitalRadiusAstronomicalUnits"
  | "orbitalEccentricity"
  | "stellarMassSolarMasses"
  | "stellarRadiusSolarRadii"
  | "surfaceTemperatureKelvin"
  | "distanceMegaparsecs"
  | "hubbleConstantKilometersPerSecondPerMegaparsec"

const GRAVITATIONAL_CONSTANT = 6.6743e-11
const SOLAR_MASS_KILOGRAMS = 1.98847e30
const ASTRONOMICAL_UNIT_METERS = 149_597_870_700
const SECONDS_PER_DAY = 86_400
const SPEED_OF_LIGHT_KILOMETERS_PER_SECOND = 299_792.458
const SOLAR_SURFACE_TEMPERATURE_KELVIN = 5_772
const MEGAPARSEC_TO_BILLION_LIGHT_YEARS = 0.00326156

const SCENARIOS: readonly AstrophysicsScenario[] = [
  {
    id: "planetary-orbit",
    name: "Planetary Orbit Explorer",
    summary:
      "Estimate circular and low-eccentricity orbital diagnostics for a planet around a single star.",
    equationSummary: "T = 2 pi sqrt(r^3 / GM), v = sqrt(GM / r)",
    status: "Initial orbit slice in progress",
    durationSeconds: 1,
    viewBounds: { minX: -1.6, maxX: 1.6, minY: -1.6, maxY: 1.6 },
    focusArea:
      "Orbital period, orbital speed, escape-speed comparison, and deterministic sampled orbit geometry.",
    centralMassSolarMasses: 1,
    orbitalRadiusAstronomicalUnits: 1,
    orbitalEccentricity: 0.12,
  },
  {
    id: "stellar-luminosity",
    name: "Stellar Luminosity and Habitable Zone",
    summary:
      "Derive luminosity scaling and habitable-zone style distances from stellar radius and surface temperature.",
    equationSummary: "L / Lsun = (R / Rsun)^2 (T / Tsun)^4",
    status: "Shared scaffold ready",
    durationSeconds: 1,
    viewBounds: { minX: 0.25, maxX: 6, minY: 0, maxY: 8 },
    focusArea:
      "Luminosity scaling, irradiance falloff with distance, and habitable-zone distance estimates.",
    stellarMassSolarMasses: 1,
    stellarRadiusSolarRadii: 1,
    surfaceTemperatureKelvin: 5_772,
  },
  {
    id: "hubble-expansion",
    name: "Hubble Expansion",
    summary:
      "Compare cosmological distance with recession velocity and light-travel-scale estimates under Hubble-law assumptions.",
    equationSummary: "v = H0 d, z approx v / c",
    status: "Shared scaffold ready",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 2_000, minY: 0, maxY: 160_000 },
    focusArea:
      "Distance-velocity scaling, approximate redshift, and horizon-scale travel-time context.",
    distanceMegaparsecs: 400,
    hubbleConstantKilometersPerSecondPerMegaparsec: 70,
  },
]

const DEFAULT_SNAPSHOT_TIMES: Readonly<Record<AstrophysicsScenarioId, number>> = {
  "planetary-orbit": 0.2,
  "stellar-luminosity": 0.25,
  "hubble-expansion": 0.25,
}

function cloneScenario(scenario: AstrophysicsScenario): AstrophysicsScenario {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeSnapshotTime(timeSeconds: number, fallback: number): number {
  return Number.isFinite(timeSeconds) && timeSeconds >= 0 ? timeSeconds : fallback
}

function normalizeViewBounds(
  viewBounds: AstrophysicsScenario["viewBounds"],
  fallback: AstrophysicsScenario["viewBounds"],
): AstrophysicsScenario["viewBounds"] {
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

function getDefaultScenario(id: AstrophysicsScenarioId): AstrophysicsScenario {
  return cloneScenario(SCENARIOS.find((scenario) => scenario.id === id) ?? SCENARIOS[0])
}

function normalizeScenario(scenario: AstrophysicsScenario): AstrophysicsScenario {
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

  if (scenario.id === "planetary-orbit") {
    return {
      ...shared,
      centralMassSolarMasses: Math.max(
        scenario.centralMassSolarMasses ?? base.centralMassSolarMasses ?? 1,
        0.1,
      ),
      orbitalRadiusAstronomicalUnits: Math.max(
        scenario.orbitalRadiusAstronomicalUnits ?? base.orbitalRadiusAstronomicalUnits ?? 1,
        0.1,
      ),
      orbitalEccentricity: clamp(
        scenario.orbitalEccentricity ?? base.orbitalEccentricity ?? 0.12,
        0,
        0.85,
      ),
    }
  }

  if (scenario.id === "stellar-luminosity") {
    return {
      ...shared,
      stellarMassSolarMasses: Math.max(
        scenario.stellarMassSolarMasses ?? base.stellarMassSolarMasses ?? 1,
        0.1,
      ),
      stellarRadiusSolarRadii: Math.max(
        scenario.stellarRadiusSolarRadii ?? base.stellarRadiusSolarRadii ?? 1,
        0.1,
      ),
      surfaceTemperatureKelvin: Math.max(
        scenario.surfaceTemperatureKelvin ?? base.surfaceTemperatureKelvin ?? 5_772,
        1_500,
      ),
    }
  }

  return {
    ...shared,
    distanceMegaparsecs: Math.max(
      scenario.distanceMegaparsecs ?? base.distanceMegaparsecs ?? 400,
      1,
    ),
    hubbleConstantKilometersPerSecondPerMegaparsec: Math.max(
      scenario.hubbleConstantKilometersPerSecondPerMegaparsec ??
        base.hubbleConstantKilometersPerSecondPerMegaparsec ??
        70,
      10,
    ),
  }
}

function buildPlanetaryOrbitSnapshot(
  scenario: AstrophysicsScenario,
  timeSeconds: number,
): AstrophysicsStateSnapshot {
  const centralMassSolarMasses = Math.max(scenario.centralMassSolarMasses ?? 1, 0.1)
  const orbitalRadiusAstronomicalUnits = Math.max(scenario.orbitalRadiusAstronomicalUnits ?? 1, 0.1)
  const orbitalEccentricity = clamp(scenario.orbitalEccentricity ?? 0.12, 0, 0.85)
  const radiusMeters = orbitalRadiusAstronomicalUnits * ASTRONOMICAL_UNIT_METERS
  const massKilograms = centralMassSolarMasses * SOLAR_MASS_KILOGRAMS
  const orbitalPeriodSeconds =
    2 * Math.PI * Math.sqrt(radiusMeters ** 3 / (GRAVITATIONAL_CONSTANT * massKilograms))
  const orbitalSpeedKilometersPerSecond =
    Math.sqrt((GRAVITATIONAL_CONSTANT * massKilograms) / radiusMeters) / 1_000
  const escapeSpeedKilometersPerSecond = Math.sqrt(2) * orbitalSpeedKilometersPerSecond
  const specificOrbitalEnergyMegajoulesPerKilogram =
    (-GRAVITATIONAL_CONSTANT * massKilograms) / (2 * radiusMeters * 1_000_000)

  return {
    timeSeconds,
    centralMassSolarMasses,
    orbitalRadiusAstronomicalUnits,
    orbitalEccentricity,
    orbitalPeriodDays: orbitalPeriodSeconds / SECONDS_PER_DAY,
    orbitalSpeedKilometersPerSecond,
    escapeSpeedKilometersPerSecond,
    specificOrbitalEnergyMegajoulesPerKilogram,
    stable:
      Number.isFinite(orbitalPeriodSeconds) &&
      Number.isFinite(orbitalSpeedKilometersPerSecond) &&
      Number.isFinite(specificOrbitalEnergyMegajoulesPerKilogram),
  }
}

function buildStellarLuminositySnapshot(
  scenario: AstrophysicsScenario,
  timeSeconds: number,
): AstrophysicsStateSnapshot {
  const stellarMassSolarMasses = Math.max(scenario.stellarMassSolarMasses ?? 1, 0.1)
  const stellarRadiusSolarRadii = Math.max(scenario.stellarRadiusSolarRadii ?? 1, 0.1)
  const surfaceTemperatureKelvin = Math.max(scenario.surfaceTemperatureKelvin ?? 5_772, 1_500)
  const luminositySolarUnits =
    stellarRadiusSolarRadii ** 2 *
    (surfaceTemperatureKelvin / SOLAR_SURFACE_TEMPERATURE_KELVIN) ** 4

  return {
    timeSeconds,
    stellarMassSolarMasses,
    stellarRadiusSolarRadii,
    surfaceTemperatureKelvin,
    luminositySolarUnits,
    habitableZoneInnerAstronomicalUnits: Math.sqrt(luminositySolarUnits / 1.1),
    habitableZoneOuterAstronomicalUnits: Math.sqrt(luminositySolarUnits / 0.53),
    stable: Number.isFinite(luminositySolarUnits),
  }
}

function buildHubbleExpansionSnapshot(
  scenario: AstrophysicsScenario,
  timeSeconds: number,
): AstrophysicsStateSnapshot {
  const distanceMegaparsecs = Math.max(scenario.distanceMegaparsecs ?? 400, 1)
  const hubbleConstantKilometersPerSecondPerMegaparsec = Math.max(
    scenario.hubbleConstantKilometersPerSecondPerMegaparsec ?? 70,
    10,
  )
  const recessionVelocityKilometersPerSecond =
    distanceMegaparsecs * hubbleConstantKilometersPerSecondPerMegaparsec
  const redshift = recessionVelocityKilometersPerSecond / SPEED_OF_LIGHT_KILOMETERS_PER_SECOND

  return {
    timeSeconds,
    distanceMegaparsecs,
    hubbleConstantKilometersPerSecondPerMegaparsec,
    recessionVelocityKilometersPerSecond,
    lightTravelTimeBillionYears: distanceMegaparsecs * MEGAPARSEC_TO_BILLION_LIGHT_YEARS,
    redshift,
    stable: Number.isFinite(recessionVelocityKilometersPerSecond) && Number.isFinite(redshift),
  }
}

function buildPlanetaryOrbitSamples(
  snapshot: AstrophysicsStateSnapshot,
): readonly AstrophysicsSample[] {
  const semiMajorAxis = snapshot.orbitalRadiusAstronomicalUnits ?? 1
  const eccentricity = clamp(snapshot.orbitalEccentricity ?? 0.12, 0, 0.85)
  const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity ** 2)
  const activeIndex = Math.round(clamp(snapshot.timeSeconds, 0, 1) * 48)
  const samples: AstrophysicsSample[] = []
  for (let index = 0; index <= 48; index += 1) {
    const angle = (index / 48) * 2 * Math.PI
    samples.push({
      position: semiMajorAxis * (Math.cos(angle) - eccentricity),
      primaryValue: semiMinorAxis * Math.sin(angle),
      secondaryValue: snapshot.orbitalSpeedKilometersPerSecond,
      label: "planetary-orbit-trajectory",
      active: index === activeIndex,
    })
  }
  return samples
}

function buildStellarLuminositySamples(
  snapshot: AstrophysicsStateSnapshot,
): readonly AstrophysicsSample[] {
  const luminositySolarUnits = snapshot.luminositySolarUnits ?? 1
  const habitableZoneInner = snapshot.habitableZoneInnerAstronomicalUnits ?? 1
  const habitableZoneOuter = snapshot.habitableZoneOuterAstronomicalUnits ?? 1.4
  const activeDistance = clamp(
    habitableZoneInner +
      clamp(snapshot.timeSeconds, 0, 1) * (habitableZoneOuter - habitableZoneInner),
    0.25,
    6,
  )
  const samples: AstrophysicsSample[] = []
  for (let index = 0; index <= 32; index += 1) {
    const distance = 0.25 + (index / 32) * 5.75
    samples.push({
      position: distance,
      primaryValue: luminositySolarUnits / (distance * distance),
      label: "stellar-irradiance-profile",
      active: Math.abs(distance - activeDistance) < 0.1,
    })
  }
  return samples
}

function buildHubbleExpansionSamples(
  snapshot: AstrophysicsStateSnapshot,
): readonly AstrophysicsSample[] {
  const distanceMegaparsecs = snapshot.distanceMegaparsecs ?? 400
  const hubbleConstant = snapshot.hubbleConstantKilometersPerSecondPerMegaparsec ?? 70
  const maxDistance = Math.max(distanceMegaparsecs * 1.2, 500)
  const activeDistance = clamp(snapshot.timeSeconds, 0, 1) * maxDistance
  const samples: AstrophysicsSample[] = []
  for (let index = 0; index <= 32; index += 1) {
    const position = (index / 32) * maxDistance
    samples.push({
      position,
      primaryValue: position * hubbleConstant,
      secondaryValue: position * MEGAPARSEC_TO_BILLION_LIGHT_YEARS,
      label: "hubble-expansion-curve",
      active: Math.abs(position - activeDistance) < maxDistance / 40,
    })
  }
  return samples
}

@Injectable({ providedIn: "root" })
export class AstrophysicsStateService {
  private readonly scenarios = signal<Record<AstrophysicsScenarioId, AstrophysicsScenario>>({
    "planetary-orbit": cloneScenario(SCENARIOS[0]),
    "stellar-luminosity": cloneScenario(SCENARIOS[1]),
    "hubble-expansion": cloneScenario(SCENARIOS[2]),
  })
  private readonly snapshotTimes = signal<Record<AstrophysicsScenarioId, number>>({
    ...DEFAULT_SNAPSHOT_TIMES,
  })
  private readonly selectedScenarioId = signal<AstrophysicsScenarioId>("planetary-orbit")

  readonly selectedScenario = computed(() => this.scenarios()[this.selectedScenarioId()])
  readonly currentState = computed(() => {
    const scenario = this.selectedScenario()
    const restoredTimeSeconds = this.snapshotTimes()[scenario.id]
    switch (scenario.id) {
      case "planetary-orbit":
        return buildPlanetaryOrbitSnapshot(scenario, restoredTimeSeconds)
      case "stellar-luminosity":
        return buildStellarLuminositySnapshot(scenario, restoredTimeSeconds)
      case "hubble-expansion":
        return buildHubbleExpansionSnapshot(scenario, restoredTimeSeconds)
    }
  })
  readonly sampledStates = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()
    switch (scenario.id) {
      case "planetary-orbit":
        return buildPlanetaryOrbitSamples(snapshot)
      case "stellar-luminosity":
        return buildStellarLuminositySamples(snapshot)
      case "hubble-expansion":
        return buildHubbleExpansionSamples(snapshot)
    }
  })

  listScenarios(): readonly AstrophysicsScenario[] {
    return [
      this.scenarios()["planetary-orbit"],
      this.scenarios()["stellar-luminosity"],
      this.scenarios()["hubble-expansion"],
    ]
  }

  selectScenario(id: AstrophysicsScenarioId): void {
    this.selectedScenarioId.set(id)
  }

  updateScenarioField(field: EditableAstrophysicsField, value: number): void {
    const scenarioId = this.selectedScenarioId()
    if (field === "timeSeconds") {
      this.snapshotTimes.update((current) => ({
        ...current,
        [scenarioId]: normalizeSnapshotTime(value, DEFAULT_SNAPSHOT_TIMES[scenarioId]),
      }))
      return
    }

    this.scenarios.update((current) => ({
      ...current,
      [scenarioId]: normalizeScenario({
        ...current[scenarioId],
        [field]: value,
      }),
    }))
  }

  importScenarioState(scenario: AstrophysicsScenario, timeSeconds: number): void {
    const normalizedScenario = normalizeScenario({
      ...scenario,
      durationSeconds: Math.max(scenario.durationSeconds, normalizeSnapshotTime(timeSeconds, 0)),
    })
    const normalizedTimeSeconds = normalizeSnapshotTime(
      timeSeconds,
      DEFAULT_SNAPSHOT_TIMES[scenario.id],
    )
    this.scenarios.update((current) => ({
      ...current,
      [scenario.id]: normalizedScenario,
    }))
    this.snapshotTimes.update((current) => ({
      ...current,
      [scenario.id]: normalizedTimeSeconds,
    }))
    this.selectedScenarioId.set(scenario.id)
  }

  resetSelectedScenario(): void {
    const scenarioId = this.selectedScenarioId()
    this.scenarios.update((current) => ({
      ...current,
      [scenarioId]: cloneScenario(getDefaultScenario(scenarioId)),
    }))
    this.snapshotTimes.update((current) => ({
      ...current,
      [scenarioId]: DEFAULT_SNAPSHOT_TIMES[scenarioId],
    }))
  }
}

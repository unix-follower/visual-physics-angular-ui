import { computed, Injectable, signal } from "@angular/core"

import {
  AtmosphericPhysicsSample,
  AtmosphericPhysicsScenario,
  AtmosphericPhysicsScenarioId,
  AtmosphericPhysicsStateSnapshot,
} from "./atmospheric-physics.models"

export type EditableAtmosphericPhysicsField =
  | "timeSeconds"
  | "seaLevelPressureKilopascals"
  | "scaleHeightKilometers"
  | "surfaceTemperatureKelvin"
  | "lapseRateKelvinPerKilometer"
  | "tropopauseHeightKilometers"
  | "environmentalLapseRateKelvinPerKilometer"
  | "parcelTemperatureExcessKelvin"
  | "columnHeightKilometers"

const GRAVITY_METERS_PER_SECOND_SQUARED = 9.81

const SCENARIOS: readonly AtmosphericPhysicsScenario[] = [
  {
    id: "barometric-formula",
    name: "Barometric Formula",
    summary:
      "Estimate how hydrostatic pressure and relative density decrease with altitude in a simple atmospheric column.",
    equationSummary: "P(z) = P0 exp(-z / H)",
    status: "Validated vertical slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 105 },
    focusArea:
      "Hydrostatic pressure profile, scale-height intuition, and active altitude inspection.",
    seaLevelPressureKilopascals: 101.325,
    scaleHeightKilometers: 8.4,
  },
  {
    id: "adiabatic-lapse-rate",
    name: "Adiabatic Lapse Rate",
    summary:
      "Inspect how temperature decreases with altitude using a dry-lapse baseline and a comparison reference profile.",
    equationSummary: "T(z) = T0 - Gamma z",
    status: "Validated vertical slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 12, minY: 190, maxY: 310 },
    focusArea: "Temperature-altitude structure, lapse-rate sensitivity, and tropopause context.",
    surfaceTemperatureKelvin: 288,
    lapseRateKelvinPerKilometer: 9.8,
    tropopauseHeightKilometers: 11,
  },
  {
    id: "convection-column",
    name: "Convection Column",
    summary:
      "Follow a warm parcel rising through an atmospheric column with buoyancy, updraft, and CAPE-style diagnostics.",
    equationSummary: "a_b approx g * Delta T / T, w approx sqrt(2 * CAPE)",
    status: "Validated vertical slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 22 },
    focusArea:
      "Parcel ascent, buoyancy acceleration, and updraft evolution across a convective column.",
    surfaceTemperatureKelvin: 300,
    environmentalLapseRateKelvinPerKilometer: 6.5,
    parcelTemperatureExcessKelvin: 3.5,
    columnHeightKilometers: 9,
  },
]

const DEFAULT_TIMES: Record<AtmosphericPhysicsScenarioId, number> = {
  "barometric-formula": 0.2,
  "adiabatic-lapse-rate": 0.3,
  "convection-column": 0.35,
}

function cloneScenario(scenario: AtmosphericPhysicsScenario): AtmosphericPhysicsScenario {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
  }
}

function buildDefaultScenarios(): readonly AtmosphericPhysicsScenario[] {
  return SCENARIOS.map((scenario) => cloneScenario(scenario))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function normalizeViewBounds(
  viewBounds: AtmosphericPhysicsScenario["viewBounds"] | undefined,
  fallback: AtmosphericPhysicsScenario["viewBounds"],
): AtmosphericPhysicsScenario["viewBounds"] {
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

  return {
    minX: viewBounds.minX,
    maxX: viewBounds.maxX,
    minY: viewBounds.minY,
    maxY: viewBounds.maxY,
  }
}

function normalizeScenario(scenario: AtmosphericPhysicsScenario): AtmosphericPhysicsScenario {
  const base = cloneScenario(
    SCENARIOS.find((candidate) => candidate.id === scenario.id) ?? SCENARIOS[0],
  )

  if (scenario.id === "barometric-formula") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
      focusArea: scenario.focusArea,
      seaLevelPressureKilopascals: Math.max(
        scenario.seaLevelPressureKilopascals ?? base.seaLevelPressureKilopascals ?? 101.325,
        10,
      ),
      scaleHeightKilometers: Math.max(
        scenario.scaleHeightKilometers ?? base.scaleHeightKilometers ?? 8.4,
        1,
      ),
    }
  }

  if (scenario.id === "adiabatic-lapse-rate") {
    return {
      id: base.id,
      name: scenario.name,
      summary: scenario.summary,
      equationSummary: scenario.equationSummary,
      status: scenario.status,
      durationSeconds: Math.max(scenario.durationSeconds, 0),
      viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
      focusArea: scenario.focusArea,
      surfaceTemperatureKelvin: Math.max(
        scenario.surfaceTemperatureKelvin ?? base.surfaceTemperatureKelvin ?? 288,
        180,
      ),
      lapseRateKelvinPerKilometer: clamp(
        scenario.lapseRateKelvinPerKilometer ?? base.lapseRateKelvinPerKilometer ?? 9.8,
        2,
        12,
      ),
      tropopauseHeightKilometers: clamp(
        scenario.tropopauseHeightKilometers ?? base.tropopauseHeightKilometers ?? 11,
        6,
        18,
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
    viewBounds: normalizeViewBounds(scenario.viewBounds, base.viewBounds),
    focusArea: scenario.focusArea,
    surfaceTemperatureKelvin: Math.max(
      scenario.surfaceTemperatureKelvin ?? base.surfaceTemperatureKelvin ?? 300,
      200,
    ),
    environmentalLapseRateKelvinPerKilometer: clamp(
      scenario.environmentalLapseRateKelvinPerKilometer ??
        base.environmentalLapseRateKelvinPerKilometer ??
        6.5,
      2,
      11,
    ),
    parcelTemperatureExcessKelvin: clamp(
      scenario.parcelTemperatureExcessKelvin ?? base.parcelTemperatureExcessKelvin ?? 3.5,
      0.2,
      8,
    ),
    columnHeightKilometers: clamp(
      scenario.columnHeightKilometers ?? base.columnHeightKilometers ?? 9,
      3,
      14,
    ),
  }
}

function buildBarometricSnapshot(
  scenario: AtmosphericPhysicsScenario,
  timeSeconds: number,
): AtmosphericPhysicsStateSnapshot {
  const altitudeKilometers = clamp(timeSeconds, 0, 1) * 12
  const seaLevelPressureKilopascals = Math.max(scenario.seaLevelPressureKilopascals ?? 101.325, 10)
  const scaleHeightKilometers = Math.max(scenario.scaleHeightKilometers ?? 8.4, 1)
  const pressureKilopascals =
    seaLevelPressureKilopascals * Math.exp(-altitudeKilometers / scaleHeightKilometers)

  return {
    timeSeconds,
    altitudeKilometers,
    pressureKilopascals,
    relativeDensity: pressureKilopascals / seaLevelPressureKilopascals,
    stable: Number.isFinite(pressureKilopascals),
  }
}

function buildAdiabaticSnapshot(
  scenario: AtmosphericPhysicsScenario,
  timeSeconds: number,
): AtmosphericPhysicsStateSnapshot {
  const altitudeKilometers = clamp(timeSeconds, 0, 1) * 12
  const surfaceTemperatureKelvin = Math.max(scenario.surfaceTemperatureKelvin ?? 288, 180)
  const lapseRateKelvinPerKilometer = clamp(scenario.lapseRateKelvinPerKilometer ?? 9.8, 2, 12)
  const tropopauseHeightKilometers = clamp(scenario.tropopauseHeightKilometers ?? 11, 6, 18)
  const temperatureKelvin =
    surfaceTemperatureKelvin - altitudeKilometers * lapseRateKelvinPerKilometer
  const referenceTemperatureKelvin = surfaceTemperatureKelvin - altitudeKilometers * 6.5

  return {
    timeSeconds,
    altitudeKilometers,
    temperatureKelvin,
    referenceTemperatureKelvin,
    tropopauseHeightKilometers,
    stable: Number.isFinite(temperatureKelvin),
  }
}

function buildConvectionSnapshot(
  scenario: AtmosphericPhysicsScenario,
  timeSeconds: number,
): AtmosphericPhysicsStateSnapshot {
  const columnHeightKilometers = clamp(scenario.columnHeightKilometers ?? 9, 3, 14)
  const surfaceTemperatureKelvin = Math.max(scenario.surfaceTemperatureKelvin ?? 300, 200)
  const environmentalLapseRateKelvinPerKilometer = clamp(
    scenario.environmentalLapseRateKelvinPerKilometer ?? 6.5,
    2,
    11,
  )
  const parcelTemperatureExcessKelvin = clamp(scenario.parcelTemperatureExcessKelvin ?? 3.5, 0.2, 8)
  const parcelAltitudeKilometers = clamp(timeSeconds, 0, 1) * columnHeightKilometers
  const temperatureKelvin =
    surfaceTemperatureKelvin - parcelAltitudeKilometers * environmentalLapseRateKelvinPerKilometer
  const buoyancyAccelerationMetersPerSecondSquared =
    GRAVITY_METERS_PER_SECOND_SQUARED * (parcelTemperatureExcessKelvin / surfaceTemperatureKelvin)
  const updraftVelocityMetersPerSecond =
    Math.max(0, Math.sin(clamp(timeSeconds, 0, 1) * Math.PI)) * 14 +
    buoyancyAccelerationMetersPerSecondSquared * 3
  const convectiveAvailablePotentialEnergyKilojoulesPerKilogram =
    (0.5 * updraftVelocityMetersPerSecond * updraftVelocityMetersPerSecond) / 1000

  return {
    timeSeconds,
    parcelAltitudeKilometers,
    temperatureKelvin,
    buoyancyAccelerationMetersPerSecondSquared,
    updraftVelocityMetersPerSecond,
    convectiveAvailablePotentialEnergyKilojoulesPerKilogram,
    stable:
      Number.isFinite(updraftVelocityMetersPerSecond) &&
      Number.isFinite(convectiveAvailablePotentialEnergyKilojoulesPerKilogram),
  }
}

function buildSnapshot(
  scenario: AtmosphericPhysicsScenario,
  timeSeconds: number,
): AtmosphericPhysicsStateSnapshot {
  if (scenario.id === "adiabatic-lapse-rate") {
    return buildAdiabaticSnapshot(scenario, timeSeconds)
  }

  if (scenario.id === "convection-column") {
    return buildConvectionSnapshot(scenario, timeSeconds)
  }

  return buildBarometricSnapshot(scenario, timeSeconds)
}

function buildSamples(
  scenario: AtmosphericPhysicsScenario,
  timeSeconds: number,
): readonly AtmosphericPhysicsSample[] {
  const activeIndex = Math.round(clamp(timeSeconds, 0, 1) * 32)
  const samples: AtmosphericPhysicsSample[] = []

  for (let index = 0; index <= 32; index += 1) {
    const normalized = index / 32

    if (scenario.id === "adiabatic-lapse-rate") {
      const altitude = normalized * 12
      const surfaceTemperatureKelvin = Math.max(scenario.surfaceTemperatureKelvin ?? 288, 180)
      const lapseRateKelvinPerKilometer = clamp(scenario.lapseRateKelvinPerKilometer ?? 9.8, 2, 12)
      samples.push({
        position: altitude,
        primaryValue: surfaceTemperatureKelvin - altitude * lapseRateKelvinPerKilometer,
        secondaryValue: surfaceTemperatureKelvin - altitude * 6.5,
        label: "adiabatic-temperature-profile",
        active: index === activeIndex,
      })
      continue
    }

    if (scenario.id === "convection-column") {
      const columnHeightKilometers = clamp(scenario.columnHeightKilometers ?? 9, 3, 14)
      const altitude = normalized * columnHeightKilometers
      const surfaceTemperatureKelvin = Math.max(scenario.surfaceTemperatureKelvin ?? 300, 200)
      const parcelTemperatureExcessKelvin = clamp(
        scenario.parcelTemperatureExcessKelvin ?? 3.5,
        0.2,
        8,
      )
      const buoyancy =
        GRAVITY_METERS_PER_SECOND_SQUARED *
        (parcelTemperatureExcessKelvin / surfaceTemperatureKelvin)
      const updraft = Math.max(0, Math.sin(normalized * Math.PI)) * 14 + buoyancy * 3
      samples.push({
        position: altitude,
        primaryValue: updraft,
        secondaryValue: buoyancy,
        label: "convection-updraft-profile",
        active: index === activeIndex,
      })
      continue
    }

    const seaLevelPressureKilopascals = Math.max(
      scenario.seaLevelPressureKilopascals ?? 101.325,
      10,
    )
    const scaleHeightKilometers = Math.max(scenario.scaleHeightKilometers ?? 8.4, 1)
    const altitude = normalized * 12
    const pressure = seaLevelPressureKilopascals * Math.exp(-altitude / scaleHeightKilometers)
    samples.push({
      position: altitude,
      primaryValue: pressure,
      secondaryValue: pressure / seaLevelPressureKilopascals,
      label: "barometric-pressure-profile",
      active: index === activeIndex,
    })
  }

  return samples
}

function getScenarioFieldValue(
  scenario: AtmosphericPhysicsScenario,
  field: Exclude<EditableAtmosphericPhysicsField, "timeSeconds">,
): number | undefined {
  switch (field) {
    case "seaLevelPressureKilopascals":
      return scenario.seaLevelPressureKilopascals
    case "scaleHeightKilometers":
      return scenario.scaleHeightKilometers
    case "surfaceTemperatureKelvin":
      return scenario.surfaceTemperatureKelvin
    case "lapseRateKelvinPerKilometer":
      return scenario.lapseRateKelvinPerKilometer
    case "tropopauseHeightKilometers":
      return scenario.tropopauseHeightKilometers
    case "environmentalLapseRateKelvinPerKilometer":
      return scenario.environmentalLapseRateKelvinPerKilometer
    case "parcelTemperatureExcessKelvin":
      return scenario.parcelTemperatureExcessKelvin
    case "columnHeightKilometers":
      return scenario.columnHeightKilometers
  }
}

@Injectable()
export class AtmosphericPhysicsStateService {
  private readonly scenariosState =
    signal<readonly AtmosphericPhysicsScenario[]>(buildDefaultScenarios())
  private readonly selectedScenarioId = signal<AtmosphericPhysicsScenarioId>("barometric-formula")
  private readonly snapshotTimes = signal<Record<AtmosphericPhysicsScenarioId, number>>({
    ...DEFAULT_TIMES,
  })

  readonly selectedScenario = computed(
    () =>
      this.scenariosState().find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenariosState()[0],
  )
  readonly currentState = computed(() =>
    buildSnapshot(this.selectedScenario(), this.snapshotTimes()[this.selectedScenario().id]),
  )
  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), this.snapshotTimes()[this.selectedScenario().id]),
  )

  listScenarios(): readonly AtmosphericPhysicsScenario[] {
    return this.scenariosState()
  }

  selectScenario(id: AtmosphericPhysicsScenarioId): void {
    this.selectedScenarioId.set(id)
  }

  updateField(field: EditableAtmosphericPhysicsField, value: number): void {
    if (field === "timeSeconds") {
      this.snapshotTimes.update((times) => ({
        ...times,
        [this.selectedScenario().id]: clamp(Number.isFinite(value) ? value : 0, 0, 1),
      }))
      return
    }

    this.scenariosState.update((scenarios) =>
      scenarios.map((scenario) => {
        if (scenario.id !== this.selectedScenario().id) {
          return scenario
        }

        const nextValue = Number.isFinite(value) ? value : getScenarioFieldValue(scenario, field)

        return normalizeScenario({
          ...scenario,
          [field]: nextValue,
        })
      }),
    )
  }

  importScenarioState(scenario: AtmosphericPhysicsScenario, timeSeconds: number): void {
    const normalized = normalizeScenario(scenario)
    this.scenariosState.update((scenarios) =>
      scenarios.map((candidate) => (candidate.id === normalized.id ? normalized : candidate)),
    )
    this.selectedScenarioId.set(normalized.id)
    this.snapshotTimes.update((times) => ({
      ...times,
      [normalized.id]: clamp(timeSeconds, 0, 1),
    }))
  }

  resetSelectedScenario(): void {
    const selectedId = this.selectedScenarioId()
    const defaultScenario = cloneScenario(
      SCENARIOS.find((scenario) => scenario.id === selectedId) ?? SCENARIOS[0],
    )

    this.scenariosState.update((scenarios) =>
      scenarios.map((scenario) => (scenario.id === selectedId ? defaultScenario : scenario)),
    )
    this.snapshotTimes.update((times) => ({
      ...times,
      [selectedId]: DEFAULT_TIMES[selectedId],
    }))
  }
}

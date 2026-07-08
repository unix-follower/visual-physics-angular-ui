import {
  AtmosphericPhysicsOverlayOptions,
  AtmosphericPhysicsSample,
  AtmosphericPhysicsScenario,
  AtmosphericPhysicsStateSnapshot,
} from "./atmospheric-physics.models"

export interface AtmosphericPhysicsExportPayload {
  exportedAt: string
  scenario: AtmosphericPhysicsScenario
  snapshot: AtmosphericPhysicsStateSnapshot
  overlays: AtmosphericPhysicsOverlayOptions
  samples: readonly AtmosphericPhysicsSample[]
}

export interface AtmosphericPhysicsImportPayload {
  scenario: AtmosphericPhysicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: AtmosphericPhysicsOverlayOptions
}

export function buildExportPayload(
  scenario: AtmosphericPhysicsScenario,
  snapshot: AtmosphericPhysicsStateSnapshot,
  overlays: AtmosphericPhysicsOverlayOptions,
  samples: readonly AtmosphericPhysicsSample[],
): AtmosphericPhysicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): AtmosphericPhysicsImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isAtmosphericImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isAtmosphericImportPayload(value: unknown): value is AtmosphericPhysicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isAtmosphericScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isAtmosphericScenario(value: unknown): value is AtmosphericPhysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
    (value["id"] === "barometric-formula" ||
      value["id"] === "adiabatic-lapse-rate" ||
      value["id"] === "convection-column") &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    isFiniteNumber(value["durationSeconds"]) &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string"

  if (!sharedShape) {
    return false
  }

  if (
    value["id"] === "barometric-formula" &&
    isFiniteNumber(value["seaLevelPressureKilopascals"]) &&
    isFiniteNumber(value["scaleHeightKilometers"])
  ) {
    return true
  }

  if (
    value["id"] === "adiabatic-lapse-rate" &&
    isFiniteNumber(value["surfaceTemperatureKelvin"]) &&
    isFiniteNumber(value["lapseRateKelvinPerKilometer"]) &&
    isFiniteNumber(value["tropopauseHeightKilometers"])
  ) {
    return true
  }

  return (
    value["id"] === "convection-column" &&
    isFiniteNumber(value["surfaceTemperatureKelvin"]) &&
    isFiniteNumber(value["environmentalLapseRateKelvinPerKilometer"]) &&
    isFiniteNumber(value["parcelTemperatureExcessKelvin"]) &&
    isFiniteNumber(value["columnHeightKilometers"])
  )
}

function isOverlayOptions(value: unknown): value is AtmosphericPhysicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showReferenceGuides"] === "boolean" &&
    typeof value["showActiveMarker"] === "boolean" &&
    typeof value["showComparisonBand"] === "boolean"
  )
}

function isViewBounds(value: unknown): boolean {
  if (!isRecord(value)) {
    return false
  }

  return (
    isFiniteNumber(value["minX"]) &&
    isFiniteNumber(value["maxX"]) &&
    isFiniteNumber(value["minY"]) &&
    isFiniteNumber(value["maxY"])
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

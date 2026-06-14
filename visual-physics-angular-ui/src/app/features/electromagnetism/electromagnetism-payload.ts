import {
  ElectromagnetismSample,
  ElectromagnetismScenario,
  ElectromagnetismStateSnapshot,
  Vector2,
  ViewBounds,
} from "./electromagnetism.models"

export interface ElectromagnetismOverlayOptions {
  showFieldVectors: boolean
  showMagneticField: boolean
  showForceVectors: boolean
  showPotentialGuides: boolean
  showTrajectory: boolean
}

export interface ElectromagnetismExportPayload {
  exportedAt: string
  scenario: ElectromagnetismScenario
  snapshot: ElectromagnetismStateSnapshot
  overlays: ElectromagnetismOverlayOptions
  samples: readonly ElectromagnetismSample[]
}

export interface ElectromagnetismImportPayload {
  scenario: ElectromagnetismScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: ElectromagnetismOverlayOptions
}

export function buildExportPayload(
  scenario: ElectromagnetismScenario,
  snapshot: ElectromagnetismStateSnapshot,
  overlays: ElectromagnetismOverlayOptions,
  samples: readonly ElectromagnetismSample[],
): ElectromagnetismExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): ElectromagnetismImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isElectromagnetismImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isElectromagnetismImportPayload(value: unknown): value is ElectromagnetismImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isElectromagnetismScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isElectromagnetismScenario(value: unknown): value is ElectromagnetismScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    isScenarioId(value["id"]) &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string" &&
    isVector2(value["initialPosition"]) &&
    (value["initialVelocity"] === undefined || isVector2(value["initialVelocity"])) &&
    (value["sourcePoint"] === undefined || isVector2(value["sourcePoint"])) &&
    (value["secondarySourcePoint"] === undefined || isVector2(value["secondarySourcePoint"])) &&
    (value["probePoint"] === undefined || isVector2(value["probePoint"])) &&
    (value["chargeMagnitude"] === undefined || typeof value["chargeMagnitude"] === "number") &&
    (value["secondaryChargeMagnitude"] === undefined ||
      typeof value["secondaryChargeMagnitude"] === "number") &&
    (value["mass"] === undefined || typeof value["mass"] === "number") &&
    (value["magneticFieldStrength"] === undefined ||
      typeof value["magneticFieldStrength"] === "number") &&
    (value["current"] === undefined || typeof value["current"] === "number") &&
    (value["loopRadius"] === undefined || typeof value["loopRadius"] === "number") &&
    (value["plateSeparation"] === undefined || typeof value["plateSeparation"] === "number") &&
    (value["potentialDifference"] === undefined ||
      typeof value["potentialDifference"] === "number") &&
    (value["fluxRate"] === undefined || typeof value["fluxRate"] === "number") &&
    (value["inductance"] === undefined || typeof value["inductance"] === "number")
  )
}

function isScenarioId(value: unknown): value is ElectromagnetismScenario["id"] {
  return (
    value === "point-charge-electrostatics" ||
    value === "moving-charge-magnetic-field" ||
    value === "current-loop-magnetic-field" ||
    value === "capacitor-potential-field" ||
    value === "electromagnetic-induction"
  )
}

function isOverlayOptions(value: unknown): value is ElectromagnetismOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showFieldVectors"] === "boolean" &&
    typeof value["showMagneticField"] === "boolean" &&
    typeof value["showForceVectors"] === "boolean" &&
    typeof value["showPotentialGuides"] === "boolean" &&
    typeof value["showTrajectory"] === "boolean"
  )
}

function isViewBounds(value: unknown): value is ViewBounds {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["minX"] === "number" &&
    typeof value["maxX"] === "number" &&
    typeof value["minY"] === "number" &&
    typeof value["maxY"] === "number"
  )
}

function isVector2(value: unknown): value is Vector2 {
  if (!isRecord(value)) {
    return false
  }

  return typeof value["x"] === "number" && typeof value["y"] === "number"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

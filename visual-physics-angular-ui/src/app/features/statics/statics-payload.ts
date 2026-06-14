import {
  StaticsSample,
  StaticsScenario,
  StaticsStateSnapshot,
  Vector2,
  ViewBounds,
} from "./statics.models"

export interface StaticsOverlayOptions {
  showAppliedForce: boolean
  showReactionForces: boolean
  showResidualGuides: boolean
}

export interface StaticsExportPayload {
  exportedAt: string
  scenario: StaticsScenario
  snapshot: StaticsStateSnapshot
  overlays: StaticsOverlayOptions
  samples: readonly StaticsSample[]
}

export interface StaticsImportPayload {
  scenario: StaticsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: StaticsOverlayOptions
}

export function buildExportPayload(
  scenario: StaticsScenario,
  snapshot: StaticsStateSnapshot,
  overlays: StaticsOverlayOptions,
  samples: readonly StaticsSample[],
): StaticsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): StaticsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isStaticsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isStaticsImportPayload(value: unknown): value is StaticsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isStaticsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isStaticsOverlayOptions(value["overlays"]))
  )
}

function isStaticsScenario(value: unknown): value is StaticsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    isStaticsScenarioId(value["id"]) &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string" &&
    isVector2(value["initialPosition"]) &&
    isVector2(value["appliedForce"]) &&
    (value["anchorPoint"] === undefined || isVector2(value["anchorPoint"])) &&
    (value["secondaryPoint"] === undefined || isVector2(value["secondaryPoint"])) &&
    (value["mass"] === undefined || typeof value["mass"] === "number") &&
    (value["secondaryMass"] === undefined || typeof value["secondaryMass"] === "number") &&
    (value["angleDegrees"] === undefined || typeof value["angleDegrees"] === "number") &&
    (value["frictionCoefficient"] === undefined ||
      typeof value["frictionCoefficient"] === "number") &&
    (value["loadPosition"] === undefined || typeof value["loadPosition"] === "number") &&
    (value["loadMagnitude"] === undefined || typeof value["loadMagnitude"] === "number")
  )
}

function isStaticsScenarioId(value: unknown): value is StaticsScenario["id"] {
  return value === "beam-support" || value === "inclined-plane" || value === "pulley-equilibrium"
}

function isStaticsOverlayOptions(value: unknown): value is StaticsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showAppliedForce"] === "boolean" &&
    typeof value["showReactionForces"] === "boolean" &&
    typeof value["showResidualGuides"] === "boolean"
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

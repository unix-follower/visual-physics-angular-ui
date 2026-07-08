import {
  PlasmaPhysicsOverlayOptions,
  PlasmaPhysicsSample,
  PlasmaPhysicsScenario,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

export interface PlasmaPhysicsExportPayload {
  exportedAt: string
  scenario: PlasmaPhysicsScenario
  snapshot: PlasmaPhysicsStateSnapshot
  overlays: PlasmaPhysicsOverlayOptions
  samples: readonly PlasmaPhysicsSample[]
}

export interface PlasmaPhysicsImportPayload {
  scenario: PlasmaPhysicsScenario
  snapshot: { timeSeconds: number }
  overlays?: PlasmaPhysicsOverlayOptions
}

export function buildExportPayload(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  overlays: PlasmaPhysicsOverlayOptions,
  samples: readonly PlasmaPhysicsSample[],
): PlasmaPhysicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): PlasmaPhysicsImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isImportPayload(value: unknown): value is PlasmaPhysicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlays(value["overlays"]))
  )
}

function isScenario(value: unknown): value is PlasmaPhysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
    (value["id"] === "plasma-oscillation" ||
      value["id"] === "debye-screening" ||
      value["id"] === "magnetic-confinement") &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    isFiniteNumber(value["durationSeconds"]) &&
    typeof value["focusArea"] === "string"

  if (!sharedShape) {
    return false
  }

  if (
    value["id"] === "plasma-oscillation" &&
    isFiniteNumber(value["electronDensityPerCubicMeter"]) &&
    isFiniteNumber(value["electronTemperatureElectronVolts"]) &&
    isFiniteNumber(value["perturbationAmplitudePercent"])
  ) {
    return true
  }

  if (
    value["id"] === "debye-screening" &&
    isFiniteNumber(value["electronDensityPerCubicMeter"]) &&
    isFiniteNumber(value["electronTemperatureElectronVolts"]) &&
    isFiniteNumber(value["probePotentialVolts"])
  ) {
    return true
  }

  return (
    value["id"] === "magnetic-confinement" &&
    isFiniteNumber(value["magneticFieldTesla"]) &&
    isFiniteNumber(value["plasmaCurrentMegaAmperes"]) &&
    isFiniteNumber(value["majorRadiusMeters"])
  )
}

function isOverlays(value: unknown): value is PlasmaPhysicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showReferenceGuides"] === "boolean" &&
    typeof value["showActiveMarker"] === "boolean" &&
    typeof value["showComparisonBand"] === "boolean"
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

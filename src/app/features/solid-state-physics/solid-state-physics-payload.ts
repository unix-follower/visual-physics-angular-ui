import {
  SolidStatePhysicsOverlayOptions,
  SolidStatePhysicsSample,
  SolidStatePhysicsScenario,
  SolidStatePhysicsStateSnapshot,
} from "./solid-state-physics.models"

export interface SolidStatePhysicsExportPayload {
  exportedAt: string
  scenario: SolidStatePhysicsScenario
  snapshot: SolidStatePhysicsStateSnapshot
  overlays: SolidStatePhysicsOverlayOptions
  samples: readonly SolidStatePhysicsSample[]
}

export interface SolidStatePhysicsImportPayload {
  scenario: SolidStatePhysicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: SolidStatePhysicsOverlayOptions
}

export function buildExportPayload(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  overlays: SolidStatePhysicsOverlayOptions,
  samples: readonly SolidStatePhysicsSample[],
): SolidStatePhysicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): SolidStatePhysicsImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isSolidStateImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isSolidStateImportPayload(value: unknown): value is SolidStatePhysicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isSolidStateScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isSolidStateScenario(value: unknown): value is SolidStatePhysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
    (value["id"] === "crystal-elasticity" ||
      value["id"] === "phonon-dispersion" ||
      value["id"] === "electronic-structure") &&
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
    value["id"] === "crystal-elasticity" &&
    isFiniteNumber(value["maxStrainPercent"]) &&
    isFiniteNumber(value["youngsModulusGigapascals"]) &&
    isFiniteNumber(value["yieldStrengthMegapascals"])
  ) {
    return true
  }

  if (
    value["id"] === "phonon-dispersion" &&
    isFiniteNumber(value["latticeSpacingNanometers"]) &&
    isFiniteNumber(value["springConstantNewtonsPerMeter"]) &&
    isFiniteNumber(value["atomicMassAmu"])
  ) {
    return true
  }

  return (
    value["id"] === "electronic-structure" &&
    isFiniteNumber(value["bandGapElectronVolts"]) &&
    isFiniteNumber(value["effectiveMassRatio"]) &&
    isFiniteNumber(value["dopantDensityPerCubicCentimeter"])
  )
}

function isOverlayOptions(value: unknown): value is SolidStatePhysicsOverlayOptions {
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

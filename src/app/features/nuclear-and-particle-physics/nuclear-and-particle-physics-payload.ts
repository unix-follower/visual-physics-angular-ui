import {
  NuclearAndParticlePhysicsOverlayOptions,
  NuclearAndParticlePhysicsSample,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

export interface NuclearAndParticlePhysicsExportPayload {
  exportedAt: string
  scenario: NuclearAndParticlePhysicsScenario
  snapshot: NuclearAndParticlePhysicsStateSnapshot
  overlays: NuclearAndParticlePhysicsOverlayOptions
  samples: readonly NuclearAndParticlePhysicsSample[]
}

export interface NuclearAndParticlePhysicsImportPayload {
  scenario: NuclearAndParticlePhysicsScenario
  snapshot: { timeSeconds: number }
  overlays?: NuclearAndParticlePhysicsOverlayOptions
}

export function buildExportPayload(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  overlays: NuclearAndParticlePhysicsOverlayOptions,
  samples: readonly NuclearAndParticlePhysicsSample[],
): NuclearAndParticlePhysicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): NuclearAndParticlePhysicsImportPayload {
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

function isImportPayload(value: unknown): value is NuclearAndParticlePhysicsImportPayload {
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

function isScenario(value: unknown): value is NuclearAndParticlePhysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
    (value["id"] === "radioactive-decay" ||
      value["id"] === "binding-energy-curve" ||
      value["id"] === "proton-proton-collision") &&
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
    value["id"] === "radioactive-decay" &&
    isFiniteNumber(value["halfLifeHours"]) &&
    isFiniteNumber(value["initialPopulationTrillions"])
  ) {
    return true
  }

  if (
    value["id"] === "binding-energy-curve" &&
    isFiniteNumber(value["massNumber"]) &&
    isFiniteNumber(value["protonCount"]) &&
    isFiniteNumber(value["bindingEnergyPerNucleonMeV"])
  ) {
    return true
  }

  return (
    value["id"] === "proton-proton-collision" &&
    isFiniteNumber(value["beamEnergyGeV"]) &&
    isFiniteNumber(value["scatteringAngleDegrees"]) &&
    isFiniteNumber(value["detectorRadiusMeters"])
  )
}

function isOverlays(value: unknown): value is NuclearAndParticlePhysicsOverlayOptions {
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

import {
  QuantumMechanicsSample,
  QuantumMechanicsScenario,
  QuantumMechanicsStateSnapshot,
  ViewBounds,
} from "./quantum-mechanics.models"

export interface QuantumMechanicsOverlayOptions {
  showProbabilityGuide: boolean
  showPotentialGuide: boolean
  showPhaseGuide: boolean
}

export interface QuantumMechanicsExportPayload {
  exportedAt: string
  scenario: QuantumMechanicsScenario
  snapshot: QuantumMechanicsStateSnapshot
  overlays: QuantumMechanicsOverlayOptions
  samples: readonly QuantumMechanicsSample[]
}

export interface QuantumMechanicsImportPayload {
  scenario: QuantumMechanicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: QuantumMechanicsOverlayOptions
}

export function buildExportPayload(
  scenario: QuantumMechanicsScenario,
  snapshot: QuantumMechanicsStateSnapshot,
  overlays: QuantumMechanicsOverlayOptions,
  samples: readonly QuantumMechanicsSample[],
): QuantumMechanicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): QuantumMechanicsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isQuantumMechanicsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isQuantumMechanicsImportPayload(value: unknown): value is QuantumMechanicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isQuantumMechanicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isQuantumMechanicsOverlayOptions(value["overlays"]))
  )
}

function isQuantumMechanicsScenario(value: unknown): value is QuantumMechanicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
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
    value["id"] === "particle-in-a-box" &&
    isFiniteNumber(value["boxLengthNanometers"]) &&
    isFiniteNumber(value["quantumNumber"])
  ) {
    return true
  }

  if (
    value["id"] === "finite-potential-well-tunneling" &&
    isFiniteNumber(value["particleEnergyEv"]) &&
    isFiniteNumber(value["barrierHeightEv"]) &&
    isFiniteNumber(value["barrierWidthNanometers"])
  ) {
    return true
  }

  return (
    value["id"] === "double-slit-interference" &&
    isFiniteNumber(value["wavelengthNanometers"]) &&
    isFiniteNumber(value["slitSeparationMicrometers"]) &&
    isFiniteNumber(value["slitWidthMicrometers"]) &&
    isFiniteNumber(value["screenDistanceMeters"])
  )
}

function isQuantumMechanicsOverlayOptions(value: unknown): value is QuantumMechanicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showProbabilityGuide"] === "boolean" &&
    typeof value["showPotentialGuide"] === "boolean" &&
    typeof value["showPhaseGuide"] === "boolean"
  )
}

function isViewBounds(value: unknown): value is ViewBounds {
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

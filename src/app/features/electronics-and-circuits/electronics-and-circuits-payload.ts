import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenario,
  ElectronicsAndCircuitsStateSnapshot,
  ViewBounds,
} from "./electronics-and-circuits.models"

export interface ElectronicsAndCircuitsOverlayOptions {
  showVoltageTrace: boolean
  showCurrentTrace: boolean
  showChargeTrace: boolean
  showEnergyMarkers: boolean
}

export interface ElectronicsAndCircuitsExportPayload {
  exportedAt: string
  scenario: ElectronicsAndCircuitsScenario
  snapshot: ElectronicsAndCircuitsStateSnapshot
  overlays: ElectronicsAndCircuitsOverlayOptions
  samples: readonly ElectronicsAndCircuitsSample[]
}

export interface ElectronicsAndCircuitsImportPayload {
  scenario: ElectronicsAndCircuitsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: ElectronicsAndCircuitsOverlayOptions
}

export function buildExportPayload(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  overlays: ElectronicsAndCircuitsOverlayOptions,
  samples: readonly ElectronicsAndCircuitsSample[],
): ElectronicsAndCircuitsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): ElectronicsAndCircuitsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isImportPayload(value: unknown): value is ElectronicsAndCircuitsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isScenario(value: unknown): value is ElectronicsAndCircuitsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value["id"] === "rc-transient" ||
      value["id"] === "rl-transient" ||
      value["id"] === "half-wave-rectifier" ||
      value["id"] === "full-wave-rectifier" ||
      value["id"] === "smoothed-rectifier" ||
      value["id"] === "rc-low-pass" ||
      value["id"] === "rc-high-pass" ||
      value["id"] === "rl-low-pass" ||
      value["id"] === "rl-high-pass" ||
      value["id"] === "resistor-network" ||
      value["id"] === "rlc-response" ||
      value["id"] === "rlc-resonance") &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string" &&
    typeof value["sourceVoltage"] === "number" &&
    typeof value["resistance"] === "number" &&
    (value["secondaryResistance"] === undefined ||
      typeof value["secondaryResistance"] === "number") &&
    (value["inductance"] === undefined || typeof value["inductance"] === "number") &&
    typeof value["capacitance"] === "number" &&
    typeof value["initialCharge"] === "number"
  )
}

function isOverlayOptions(value: unknown): value is ElectronicsAndCircuitsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showVoltageTrace"] === "boolean" &&
    typeof value["showCurrentTrace"] === "boolean" &&
    typeof value["showChargeTrace"] === "boolean" &&
    typeof value["showEnergyMarkers"] === "boolean"
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

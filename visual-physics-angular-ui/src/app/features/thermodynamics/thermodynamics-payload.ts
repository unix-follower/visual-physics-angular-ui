import {
  ThermodynamicsSample,
  ThermodynamicsScenario,
  ThermodynamicsStateSnapshot,
  ViewBounds,
} from "./thermodynamics.models"

export interface ThermodynamicsOverlayOptions {
  showPressureCurve: boolean
  showParticleGuide: boolean
  showEnergyGuide: boolean
}

export interface ThermodynamicsExportPayload {
  exportedAt: string
  scenario: ThermodynamicsScenario
  snapshot: ThermodynamicsStateSnapshot
  overlays: ThermodynamicsOverlayOptions
  samples: readonly ThermodynamicsSample[]
}

export interface ThermodynamicsImportPayload {
  scenario: ThermodynamicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: ThermodynamicsOverlayOptions
}

export function buildExportPayload(
  scenario: ThermodynamicsScenario,
  snapshot: ThermodynamicsStateSnapshot,
  overlays: ThermodynamicsOverlayOptions,
  samples: readonly ThermodynamicsSample[],
): ThermodynamicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): ThermodynamicsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isThermodynamicsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isThermodynamicsImportPayload(value: unknown): value is ThermodynamicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isThermodynamicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isThermodynamicsOverlayOptions(value["overlays"]))
  )
}

function isThermodynamicsScenario(value: unknown): value is ThermodynamicsScenario {
  if (!isRecord(value)) {
    return false
  }

  if (value["id"] === "heat-conduction-slab") {
    return (
      typeof value["name"] === "string" &&
      typeof value["summary"] === "string" &&
      typeof value["equationSummary"] === "string" &&
      typeof value["status"] === "string" &&
      typeof value["durationSeconds"] === "number" &&
      isViewBounds(value["viewBounds"]) &&
      typeof value["focusArea"] === "string" &&
      typeof value["slabThicknessMeters"] === "number" &&
      typeof value["thermalConductivityWPerMK"] === "number" &&
      typeof value["thermalDiffusivityM2PerS"] === "number" &&
      typeof value["initialTemperatureCelsius"] === "number" &&
      typeof value["boundaryTemperatureCelsius"] === "number"
    )
  }
  if (value["id"] === "carnot-cycle") {
    return (
      typeof value["name"] === "string" &&
      typeof value["summary"] === "string" &&
      typeof value["equationSummary"] === "string" &&
      typeof value["status"] === "string" &&
      typeof value["durationSeconds"] === "number" &&
      isViewBounds(value["viewBounds"]) &&
      typeof value["focusArea"] === "string" &&
      typeof value["amountMoles"] === "number" &&
      typeof value["hotReservoirTemperatureKelvin"] === "number" &&
      typeof value["coldReservoirTemperatureKelvin"] === "number" &&
      typeof value["cycleMinVolumeCubicMeters"] === "number" &&
      typeof value["cycleVolumeRatio"] === "number"
    )
  }

  if (
    value["id"] !== "ideal-gas-state" ||
    typeof value["name"] !== "string" ||
    typeof value["summary"] !== "string" ||
    typeof value["equationSummary"] !== "string" ||
    typeof value["status"] !== "string" ||
    typeof value["durationSeconds"] !== "number" ||
    !isViewBounds(value["viewBounds"]) ||
    typeof value["focusArea"] !== "string"
  ) {
    return false
  }

  return (
    typeof value["amountMoles"] === "number" &&
    typeof value["temperatureKelvin"] === "number" &&
    typeof value["volumeCubicMeters"] === "number" &&
    typeof value["molarMassKgPerMol"] === "number"
  )
}

function isThermodynamicsOverlayOptions(value: unknown): value is ThermodynamicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showPressureCurve"] === "boolean" &&
    typeof value["showParticleGuide"] === "boolean" &&
    typeof value["showEnergyGuide"] === "boolean"
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

import {
  AstrophysicsSample,
  AstrophysicsScenario,
  AstrophysicsStateSnapshot,
  ViewBounds,
} from "./astrophysics.models"

export interface AstrophysicsOverlayOptions {
  showReferenceGuides: boolean
  showActiveMarker: boolean
  showComparisonBand: boolean
}

export interface AstrophysicsExportPayload {
  exportedAt: string
  scenario: AstrophysicsScenario
  snapshot: AstrophysicsStateSnapshot
  overlays: AstrophysicsOverlayOptions
  samples: readonly AstrophysicsSample[]
}

export interface AstrophysicsImportPayload {
  scenario: AstrophysicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: AstrophysicsOverlayOptions
}

export function buildExportPayload(
  scenario: AstrophysicsScenario,
  snapshot: AstrophysicsStateSnapshot,
  overlays: AstrophysicsOverlayOptions,
  samples: readonly AstrophysicsSample[],
): AstrophysicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): AstrophysicsImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isAstrophysicsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isAstrophysicsImportPayload(value: unknown): value is AstrophysicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isAstrophysicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isAstrophysicsScenario(value: unknown): value is AstrophysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const sharedShape =
    (value["id"] === "planetary-orbit" ||
      value["id"] === "stellar-luminosity" ||
      value["id"] === "hubble-expansion") &&
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
    value["id"] === "planetary-orbit" &&
    isFiniteNumber(value["centralMassSolarMasses"]) &&
    isFiniteNumber(value["orbitalRadiusAstronomicalUnits"]) &&
    isFiniteNumber(value["orbitalEccentricity"])
  ) {
    return true
  }

  if (
    value["id"] === "stellar-luminosity" &&
    isFiniteNumber(value["stellarMassSolarMasses"]) &&
    isFiniteNumber(value["stellarRadiusSolarRadii"]) &&
    isFiniteNumber(value["surfaceTemperatureKelvin"])
  ) {
    return true
  }

  return (
    value["id"] === "hubble-expansion" &&
    isFiniteNumber(value["distanceMegaparsecs"]) &&
    isFiniteNumber(value["hubbleConstantKilometersPerSecondPerMegaparsec"])
  )
}

function isOverlayOptions(value: unknown): value is AstrophysicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showReferenceGuides"] === "boolean" &&
    typeof value["showActiveMarker"] === "boolean" &&
    typeof value["showComparisonBand"] === "boolean"
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

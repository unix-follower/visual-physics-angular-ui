import {
  RelativitySample,
  RelativityScenario,
  RelativityStateSnapshot,
  ViewBounds,
} from "./relativity.models"

export interface RelativityOverlayOptions {
  showReferenceGuides: boolean
  showComparisonCurve: boolean
  showActiveMarker: boolean
}

export interface RelativityExportPayload {
  exportedAt: string
  scenario: RelativityScenario
  snapshot: RelativityStateSnapshot
  overlays: RelativityOverlayOptions
  samples: readonly RelativitySample[]
}

export interface RelativityImportPayload {
  scenario: RelativityScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: RelativityOverlayOptions
}

export function buildExportPayload(
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
  overlays: RelativityOverlayOptions,
  samples: readonly RelativitySample[],
): RelativityExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): RelativityImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isRelativityImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isRelativityImportPayload(value: unknown): value is RelativityImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isRelativityScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isRelativityScenario(value: unknown): value is RelativityScenario {
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
    value["id"] === "time-dilation" &&
    isFiniteNumber(value["relativeVelocityFractionOfLight"]) &&
    isFiniteNumber(value["properTimeSeconds"])
  ) {
    return true
  }

  if (
    value["id"] === "relativistic-doppler" &&
    isFiniteNumber(value["emittedFrequencyHertz"]) &&
    isFiniteNumber(value["sourceVelocityFractionOfLight"]) &&
    isFiniteNumber(value["observerVelocityFractionOfLight"])
  ) {
    return true
  }

  return (
    value["id"] === "gravitational-time-dilation" &&
    isFiniteNumber(value["centralMassSolarMasses"]) &&
    isFiniteNumber(value["orbitalRadiusSchwarzschildRadii"]) &&
    isFiniteNumber(value["coordinateTimeSeconds"])
  )
}

function isOverlayOptions(value: unknown): value is RelativityOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showReferenceGuides"] === "boolean" &&
    typeof value["showComparisonCurve"] === "boolean" &&
    typeof value["showActiveMarker"] === "boolean"
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

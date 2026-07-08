import {
  ViewBounds,
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"

export interface WavesAndAcousticsOverlayOptions {
  showWaveGuides: boolean
  showNodeMarkers: boolean
  showReferenceCurve: boolean
}

export interface WavesAndAcousticsExportPayload {
  exportedAt: string
  scenario: WavesAndAcousticsScenario
  snapshot: WavesAndAcousticsStateSnapshot
  overlays: WavesAndAcousticsOverlayOptions
  samples: readonly WavesAndAcousticsSample[]
}

export interface WavesAndAcousticsImportPayload {
  scenario: WavesAndAcousticsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: WavesAndAcousticsOverlayOptions
}

export function buildExportPayload(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
  overlays: WavesAndAcousticsOverlayOptions,
  samples: readonly WavesAndAcousticsSample[],
): WavesAndAcousticsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): WavesAndAcousticsImportPayload {
  let payload: unknown
  try {
    payload = JSON.parse(source) as unknown
  } catch {
    throw new Error("Invalid payload")
  }

  if (!isWavesAndAcousticsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isWavesAndAcousticsImportPayload(value: unknown): value is WavesAndAcousticsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isWavesAndAcousticsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    isFiniteNumber(value["snapshot"]["timeSeconds"]) &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isWavesAndAcousticsScenario(value: unknown): value is WavesAndAcousticsScenario {
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
    value["id"] === "standing-wave" &&
    isFiniteNumber(value["stringLengthMeters"]) &&
    isFiniteNumber(value["waveSpeedMetersPerSecond"]) &&
    isFiniteNumber(value["amplitudeMillimeters"]) &&
    isFiniteNumber(value["harmonicNumber"])
  ) {
    return true
  }

  if (
    value["id"] === "traveling-wave" &&
    isFiniteNumber(value["waveSpeedMetersPerSecond"]) &&
    isFiniteNumber(value["amplitudeMillimeters"]) &&
    isFiniteNumber(value["frequencyHertz"])
  ) {
    return true
  }

  return (
    value["id"] === "doppler-effect" &&
    isFiniteNumber(value["waveSpeedMetersPerSecond"]) &&
    isFiniteNumber(value["emittedFrequencyHertz"]) &&
    isFiniteNumber(value["sourceSpeedMetersPerSecond"]) &&
    isFiniteNumber(value["observerSpeedMetersPerSecond"])
  )
}

function isOverlayOptions(value: unknown): value is WavesAndAcousticsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showWaveGuides"] === "boolean" &&
    typeof value["showNodeMarkers"] === "boolean" &&
    typeof value["showReferenceCurve"] === "boolean"
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

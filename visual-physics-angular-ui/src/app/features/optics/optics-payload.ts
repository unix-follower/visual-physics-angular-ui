import { OpticsSample, OpticsScenario, OpticsStateSnapshot, ViewBounds } from "./optics.models"

export interface OpticsOverlayOptions {
  showIncidentGuide: boolean
  showNormalGuide: boolean
  showSecondaryGuide: boolean
}

export interface OpticsExportPayload {
  exportedAt: string
  scenario: OpticsScenario
  snapshot: OpticsStateSnapshot
  overlays: OpticsOverlayOptions
  samples: readonly OpticsSample[]
}

export interface OpticsImportPayload {
  scenario: OpticsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: OpticsOverlayOptions
}

export function buildExportPayload(
  scenario: OpticsScenario,
  snapshot: OpticsStateSnapshot,
  overlays: OpticsOverlayOptions,
  samples: readonly OpticsSample[],
): OpticsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): OpticsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isOpticsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isOpticsImportPayload(value: unknown): value is OpticsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isOpticsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isOpticsOverlayOptions(value["overlays"]))
  )
}

function isOpticsScenario(value: unknown): value is OpticsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value["id"] === "snell-refraction" ||
      value["id"] === "thin-lens-imaging" ||
      value["id"] === "single-slit-diffraction") &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string" &&
    ((value["id"] === "snell-refraction" &&
      typeof value["incidentAngleDegrees"] === "number" &&
      typeof value["mediumARefractiveIndex"] === "number" &&
      typeof value["mediumBRefractiveIndex"] === "number") ||
      (value["id"] === "thin-lens-imaging" &&
        typeof value["focalLengthCentimeters"] === "number" &&
        typeof value["objectDistanceCentimeters"] === "number" &&
        typeof value["objectHeightCentimeters"] === "number") ||
      (value["id"] === "single-slit-diffraction" &&
        typeof value["slitWidthMicrometers"] === "number" &&
        typeof value["wavelengthNanometers"] === "number" &&
        typeof value["screenDistanceMeters"] === "number"))
  )
}

function isOpticsOverlayOptions(value: unknown): value is OpticsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showIncidentGuide"] === "boolean" &&
    typeof value["showNormalGuide"] === "boolean" &&
    typeof value["showSecondaryGuide"] === "boolean"
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

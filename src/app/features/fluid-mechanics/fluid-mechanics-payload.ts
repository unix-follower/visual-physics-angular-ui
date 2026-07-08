import {
  FluidMechanicsSample,
  FluidMechanicsScenario,
  FluidMechanicsStateSnapshot,
  ViewBounds,
} from "./fluid-mechanics.models"

export interface FluidMechanicsOverlayOptions {
  showForceGuides: boolean
  showWaterline: boolean
  showEquilibriumGuide: boolean
}

export interface FluidMechanicsExportPayload {
  exportedAt: string
  scenario: FluidMechanicsScenario
  snapshot: FluidMechanicsStateSnapshot
  overlays: FluidMechanicsOverlayOptions
  samples: readonly FluidMechanicsSample[]
}

export interface FluidMechanicsImportPayload {
  scenario: FluidMechanicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: FluidMechanicsOverlayOptions
}

export function buildExportPayload(
  scenario: FluidMechanicsScenario,
  snapshot: FluidMechanicsStateSnapshot,
  overlays: FluidMechanicsOverlayOptions,
  samples: readonly FluidMechanicsSample[],
): FluidMechanicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): FluidMechanicsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isFluidMechanicsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isFluidMechanicsImportPayload(value: unknown): value is FluidMechanicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isFluidMechanicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isFluidMechanicsOverlayOptions(value["overlays"]))
  )
}

function isFluidMechanicsScenario(value: unknown): value is FluidMechanicsScenario {
  if (!isRecord(value)) {
    return false
  }

  const hasCommonFields =
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string"

  if (!hasCommonFields) {
    return false
  }

  if (value["id"] === "buoyancy-block") {
    return (
      typeof value["fluidDensity"] === "number" &&
      typeof value["blockDensity"] === "number" &&
      typeof value["gravity"] === "number" &&
      typeof value["blockWidth"] === "number" &&
      typeof value["blockHeight"] === "number" &&
      typeof value["blockDepth"] === "number"
    )
  }

  if (value["id"] === "poiseuille-pipe") {
    return (
      typeof value["fluidDensity"] === "number" &&
      typeof value["pipeRadius"] === "number" &&
      typeof value["pipeLength"] === "number" &&
      typeof value["pressureDrop"] === "number" &&
      typeof value["dynamicViscosity"] === "number"
    )
  }

  if (value["id"] === "open-channel-flow") {
    return (
      typeof value["gravity"] === "number" &&
      typeof value["channelWidth"] === "number" &&
      typeof value["channelDepth"] === "number" &&
      typeof value["channelSlope"] === "number" &&
      typeof value["roughnessCoefficient"] === "number" &&
      typeof value["channelLength"] === "number"
    )
  }

  return false
}

function isFluidMechanicsOverlayOptions(value: unknown): value is FluidMechanicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showForceGuides"] === "boolean" &&
    typeof value["showWaterline"] === "boolean" &&
    typeof value["showEquilibriumGuide"] === "boolean"
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

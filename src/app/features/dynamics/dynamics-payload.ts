import {
  DynamicsSample,
  DynamicsScenario,
  DynamicsScenarioId,
  DynamicsStateSnapshot,
  Vector2,
  ViewBounds,
} from "./dynamics.models"
import { DynamicsOverlayOptions } from "./dynamics-webgpu-renderer"

export interface DynamicsExportPayload {
  exportedAt: string
  scenario: DynamicsScenario
  snapshot: DynamicsStateSnapshot
  overlays: DynamicsOverlayOptions
  samples: readonly DynamicsSample[]
}

export interface DynamicsImportPayload {
  scenario: DynamicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: DynamicsOverlayOptions
}

export function buildExportPayload(
  scenario: DynamicsScenario,
  snapshot: DynamicsStateSnapshot,
  overlays: DynamicsOverlayOptions,
  samples: readonly DynamicsSample[],
): DynamicsExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    scenario,
    snapshot,
    overlays,
    samples,
  }
}

export function parseImportPayload(source: string): DynamicsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isDynamicsImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isDynamicsImportPayload(value: unknown): value is DynamicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    isDynamicsScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isDynamicsOverlayOptions(value["overlays"]))
  )
}

function isDynamicsScenario(value: unknown): value is DynamicsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    isDynamicsScenarioId(value["id"]) &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["mass"] === "number" &&
    isVector2(value["initialPosition"]) &&
    isVector2(value["initialVelocity"]) &&
    (value["netForce"] === undefined || isVector2(value["netForce"])) &&
    (value["gravity"] === undefined || isVector2(value["gravity"])) &&
    (value["dragCoefficient"] === undefined || typeof value["dragCoefficient"] === "number") &&
    (value["springAnchor"] === undefined || isVector2(value["springAnchor"])) &&
    (value["springConstant"] === undefined || typeof value["springConstant"] === "number") &&
    (value["dampingCoefficient"] === undefined ||
      typeof value["dampingCoefficient"] === "number") &&
    (value["orbitalCenter"] === undefined || isVector2(value["orbitalCenter"])) &&
    (value["gravitationalParameter"] === undefined ||
      typeof value["gravitationalParameter"] === "number") &&
    (value["restitutionCoefficient"] === undefined ||
      typeof value["restitutionCoefficient"] === "number")
  )
}

function isDynamicsScenarioId(value: unknown): value is DynamicsScenarioId {
  return (
    value === "constant-force" ||
    value === "drag-projectile" ||
    value === "spring-oscillator" ||
    value === "orbital-motion" ||
    value === "elastic-collision"
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

function isVector2(value: unknown): value is Vector2 {
  if (!isRecord(value)) {
    return false
  }

  return typeof value["x"] === "number" && typeof value["y"] === "number"
}

function isDynamicsOverlayOptions(value: unknown): value is DynamicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showMomentumVector"] === "boolean" &&
    typeof value["showVelocityVector"] === "boolean" &&
    typeof value["showForceVector"] === "boolean" &&
    typeof value["showScenarioGuides"] === "boolean"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

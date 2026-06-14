import {
  ComputationalPhysicsScenario,
  ComputationalPhysicsScenarioId,
  OrbitalInvariantHistorySample,
  SpringInvariantHistorySample,
  SolverComparisonState,
  SolverConvergenceSample,
  SolverComparisonSample,
  SolverMethodId,
  Vector2,
  ViewBounds,
} from "./computational-physics.models"
import { ComputationalPhysicsOverlayOptions } from "./computational-physics-webgpu-renderer"
import {
  buildObservedOrderEstimates,
  buildOrbitalDriftThresholdEstimates,
  buildOrbitalObservedOrderEstimates,
  buildSolverRecommendationCandidates,
  buildSolverRecommendationSummary,
  buildSpringDriftThresholdEstimates,
  buildSpringObservedOrderEstimates,
  buildStabilityThresholdEstimates,
  ObservedOrderEstimate,
  SolverRecommendationCandidate,
  SolverRecommendationSummary,
} from "./computational-physics-analytics"

export interface ScenarioObservedOrders {
  position: readonly ObservedOrderEstimate[]
  orbital: {
    energy: readonly ObservedOrderEstimate[]
    angularMomentum: readonly ObservedOrderEstimate[]
  }
  spring: {
    energy: readonly ObservedOrderEstimate[]
    phase: readonly ObservedOrderEstimate[]
  }
}

export interface ConvergencePlotGuides {
  position: {
    tolerance: number | null
    recommendedStepSeconds: number | null
  }
  orbital: {
    energyTolerance: number | null
    angularMomentumTolerance: number | null
    recommendedStepSeconds: number | null
  }
  spring: {
    energyTolerance: number | null
    phaseTolerance: number | null
    recommendedStepSeconds: number | null
  }
}

export interface ComputationalPhysicsExportPayload {
  exportedAt: string
  solverMethod: SolverMethodId
  scenario: ComputationalPhysicsScenario
  snapshot: SolverComparisonState
  overlays: ComputationalPhysicsOverlayOptions
  samples: readonly SolverComparisonSample[]
  convergenceSamples: readonly SolverConvergenceSample[]
  orbitalInvariantHistory: readonly OrbitalInvariantHistorySample[]
  springInvariantHistory: readonly SpringInvariantHistorySample[]
  solverRecommendation: SolverRecommendationSummary | null
  solverRecommendationRanking: readonly SolverRecommendationCandidate[]
  observedOrders: ScenarioObservedOrders
  convergencePlotGuides: ConvergencePlotGuides
}

export interface ComputationalPhysicsImportPayload {
  solverMethod?: SolverMethodId
  scenario: ComputationalPhysicsScenario
  snapshot: {
    timeSeconds: number
  }
  overlays?: ComputationalPhysicsOverlayOptions
}

export function buildExportPayload(
  scenario: ComputationalPhysicsScenario,
  snapshot: SolverComparisonState,
  overlays: ComputationalPhysicsOverlayOptions,
  samples: readonly SolverComparisonSample[],
  convergenceSamples: readonly SolverConvergenceSample[],
  orbitalInvariantHistory: readonly OrbitalInvariantHistorySample[],
  springInvariantHistory: readonly SpringInvariantHistorySample[],
  solverMethod: SolverMethodId,
): ComputationalPhysicsExportPayload {
  const stabilityThresholds = buildStabilityThresholdEstimates(scenario, convergenceSamples)
  const orbitalThresholds = buildOrbitalDriftThresholdEstimates(scenario, convergenceSamples)
  const springThresholds = buildSpringDriftThresholdEstimates(scenario, convergenceSamples)
  const solverRecommendation = buildSolverRecommendationSummary(
    scenario,
    stabilityThresholds,
    orbitalThresholds,
    springThresholds,
  )
  const solverRecommendationRanking = buildSolverRecommendationCandidates(
    scenario,
    stabilityThresholds,
    orbitalThresholds,
    springThresholds,
  )
  const observedOrders: ScenarioObservedOrders = {
    position: buildObservedOrderEstimates(convergenceSamples),
    orbital: {
      energy: buildOrbitalObservedOrderEstimates(convergenceSamples, "energy"),
      angularMomentum: buildOrbitalObservedOrderEstimates(convergenceSamples, "angularMomentum"),
    },
    spring: {
      energy: buildSpringObservedOrderEstimates(convergenceSamples, "energy"),
      phase: buildSpringObservedOrderEstimates(convergenceSamples, "phase"),
    },
  }
  const recommendedStepSeconds = solverRecommendation?.recommendedStepSeconds ?? null
  const convergencePlotGuides: ConvergencePlotGuides = {
    position: {
      tolerance: stabilityThresholds[0]?.tolerance ?? null,
      recommendedStepSeconds,
    },
    orbital: {
      energyTolerance:
        orbitalThresholds.find((threshold) => threshold.metric === "energy")?.tolerance ?? null,
      angularMomentumTolerance:
        orbitalThresholds.find((threshold) => threshold.metric === "angularMomentum")?.tolerance ??
        null,
      recommendedStepSeconds,
    },
    spring: {
      energyTolerance:
        springThresholds.find((threshold) => threshold.metric === "energy")?.tolerance ?? null,
      phaseTolerance:
        springThresholds.find((threshold) => threshold.metric === "phase")?.tolerance ?? null,
      recommendedStepSeconds,
    },
  }

  return {
    exportedAt: new Date().toISOString(),
    solverMethod,
    scenario,
    snapshot,
    overlays,
    samples,
    convergenceSamples,
    orbitalInvariantHistory,
    springInvariantHistory,
    solverRecommendation,
    solverRecommendationRanking,
    observedOrders,
    convergencePlotGuides,
  }
}

export function parseImportPayload(source: string): ComputationalPhysicsImportPayload {
  const payload = JSON.parse(source) as unknown
  if (!isComputationalImportPayload(payload)) {
    throw new Error("Invalid payload")
  }

  return payload
}

function isComputationalImportPayload(value: unknown): value is ComputationalPhysicsImportPayload {
  if (!isRecord(value)) {
    return false
  }

  return (
    (value["solverMethod"] === undefined || isSolverMethodId(value["solverMethod"])) &&
    isScenario(value["scenario"]) &&
    isRecord(value["snapshot"]) &&
    typeof value["snapshot"]["timeSeconds"] === "number" &&
    (value["overlays"] === undefined || isOverlayOptions(value["overlays"]))
  )
}

function isScenario(value: unknown): value is ComputationalPhysicsScenario {
  if (!isRecord(value)) {
    return false
  }

  return (
    isScenarioId(value["id"]) &&
    typeof value["name"] === "string" &&
    typeof value["summary"] === "string" &&
    typeof value["equationSummary"] === "string" &&
    typeof value["status"] === "string" &&
    typeof value["durationSeconds"] === "number" &&
    isViewBounds(value["viewBounds"]) &&
    typeof value["focusArea"] === "string" &&
    typeof value["mass"] === "number" &&
    isVector2(value["initialPosition"]) &&
    isVector2(value["initialVelocity"]) &&
    (value["gravity"] === undefined || isVector2(value["gravity"])) &&
    (value["dragCoefficient"] === undefined || typeof value["dragCoefficient"] === "number") &&
    (value["orbitalCenter"] === undefined || isVector2(value["orbitalCenter"])) &&
    (value["gravitationalParameter"] === undefined ||
      typeof value["gravitationalParameter"] === "number") &&
    (value["springAnchor"] === undefined || isVector2(value["springAnchor"])) &&
    (value["springConstant"] === undefined || typeof value["springConstant"] === "number") &&
    (value["dampingCoefficient"] === undefined ||
      typeof value["dampingCoefficient"] === "number") &&
    typeof value["comparisonStepSeconds"] === "number" &&
    typeof value["referenceStepSeconds"] === "number"
  )
}

function isScenarioId(value: unknown): value is ComputationalPhysicsScenarioId {
  return (
    value === "projectile-solver-comparison" ||
    value === "orbital-solver-comparison" ||
    value === "spring-oscillator-comparison"
  )
}

function isSolverMethodId(value: unknown): value is SolverMethodId {
  return value === "euler" || value === "symplectic" || value === "rk4"
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

function isOverlayOptions(value: unknown): value is ComputationalPhysicsOverlayOptions {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value["showReferenceTrajectory"] === "boolean" &&
    typeof value["showEulerTrajectory"] === "boolean" &&
    typeof value["showSymplecticTrajectory"] === "boolean" &&
    typeof value["showRk4Trajectory"] === "boolean" &&
    typeof value["showErrorBars"] === "boolean"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

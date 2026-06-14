import { computed, Injectable, signal } from "@angular/core"

import {
  StaticsScenario,
  StaticsScenarioId,
  StaticsStateSnapshot,
  StaticsSample,
} from "./statics.models"

export type EditableStaticsField =
  | "anchorPoint.x"
  | "secondaryPoint.x"
  | "loadPosition"
  | "loadMagnitude"
  | "mass"
  | "secondaryMass"
  | "angleDegrees"
  | "frictionCoefficient"

const SCENARIOS: readonly StaticsScenario[] = [
  {
    id: "beam-support",
    name: "Beam Support Equilibrium",
    summary: "Solve support reactions for a loaded beam using force and torque balance.",
    equationSummary: "Sigma F = 0, Sigma tau = 0",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: -1, maxX: 11, minY: -4, maxY: 4 },
    focusArea: "Reaction forces, support locations, moment balance",
    initialPosition: { x: 5, y: 0 },
    appliedForce: { x: 0, y: -12 },
    anchorPoint: { x: 1, y: 0 },
    secondaryPoint: { x: 9, y: 0 },
    loadPosition: 5,
    loadMagnitude: 12,
  },
  {
    id: "inclined-plane",
    name: "Inclined Plane Equilibrium",
    summary: "Resolve weight, normal force, and friction on a static incline.",
    equationSummary: "Sigma F_parallel = 0, Sigma F_normal = 0",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: -2, maxX: 8, minY: -2, maxY: 6 },
    focusArea: "Force decomposition, contact forces, friction threshold",
    initialPosition: { x: 3, y: 2 },
    appliedForce: { x: 0, y: -9.8 },
    anchorPoint: { x: 0, y: 0 },
    mass: 2,
    angleDegrees: 30,
    frictionCoefficient: 0.7,
  },
  {
    id: "pulley-equilibrium",
    name: "Pulley Equilibrium",
    summary: "Compare paired loads and tension constraints in a static pulley system.",
    equationSummary: "T_left = T_right, Sigma F = 0",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: -4, maxX: 4, minY: -8, maxY: 4 },
    focusArea: "Tension, suspended loads, constraint symmetry",
    initialPosition: { x: 0, y: -2 },
    appliedForce: { x: 0, y: -8 },
    anchorPoint: { x: -2, y: -4 },
    secondaryPoint: { x: 2, y: -4 },
    mass: 1,
    secondaryMass: 1,
  },
] as const

function magnitude(x: number, y: number): number {
  return Math.hypot(x, y)
}

function nearlyEqual(left: number, right: number, tolerance = 1e-6): boolean {
  return Math.abs(left - right) <= tolerance
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildBeamSupportSnapshot(scenario: StaticsScenario): StaticsStateSnapshot {
  const leftSupportX = scenario.anchorPoint?.x ?? 1
  const rightSupportX = scenario.secondaryPoint?.x ?? 9
  const supportSpan = Math.max(rightSupportX - leftSupportX, 0.5)
  const loadMagnitude = Math.max(scenario.loadMagnitude ?? 0, 0)
  const clampedLoadPosition = clamp(
    scenario.loadPosition ?? scenario.initialPosition.x,
    leftSupportX,
    rightSupportX,
  )
  const distanceFromLeft = clampedLoadPosition - leftSupportX
  const rightReaction = loadMagnitude * (distanceFromLeft / supportSpan)
  const leftReaction = loadMagnitude - rightReaction
  const residualForceY = leftReaction + rightReaction - loadMagnitude
  const residualTorque = rightReaction * supportSpan - loadMagnitude * distanceFromLeft

  return {
    timeSeconds: 0,
    position: { x: clampedLoadPosition, y: 0 },
    appliedForce: { x: 0, y: -loadMagnitude },
    primaryReactionForce: { x: 0, y: leftReaction },
    secondaryReactionForce: { x: 0, y: rightReaction },
    residualForce: { x: 0, y: residualForceY },
    residualTorque,
    stable:
      leftReaction >= 0 &&
      rightReaction >= 0 &&
      nearlyEqual(residualForceY, 0) &&
      nearlyEqual(residualTorque, 0),
  }
}

function buildInclinedPlaneSnapshot(scenario: StaticsScenario): StaticsStateSnapshot {
  const mass = Math.max(scenario.mass ?? 0, 0)
  const gravity = 9.81
  const angleRadians = ((scenario.angleDegrees ?? 0) * Math.PI) / 180
  const frictionCoefficient = Math.max(scenario.frictionCoefficient ?? 0, 0)
  const weightMagnitude = mass * gravity
  const tangent = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  }
  const normal = {
    x: -Math.sin(angleRadians),
    y: Math.cos(angleRadians),
  }
  const normalMagnitude = weightMagnitude * Math.cos(angleRadians)
  const requiredFrictionMagnitude = weightMagnitude * Math.sin(angleRadians)
  const maxFrictionMagnitude = frictionCoefficient * normalMagnitude
  const frictionMagnitude = Math.min(requiredFrictionMagnitude, maxFrictionMagnitude)
  const appliedForce = { x: 0, y: -weightMagnitude }
  const primaryReactionForce = {
    x: normal.x * normalMagnitude,
    y: normal.y * normalMagnitude,
  }
  const secondaryReactionForce = {
    x: tangent.x * frictionMagnitude,
    y: tangent.y * frictionMagnitude,
  }
  const residualForce = {
    x: appliedForce.x + primaryReactionForce.x + secondaryReactionForce.x,
    y: appliedForce.y + primaryReactionForce.y + secondaryReactionForce.y,
  }
  const stable =
    requiredFrictionMagnitude <= maxFrictionMagnitude + 1e-6 &&
    nearlyEqual(residualForce.x, 0) &&
    nearlyEqual(residualForce.y, 0)

  return {
    timeSeconds: 0,
    position: scenario.initialPosition,
    appliedForce,
    primaryReactionForce,
    secondaryReactionForce,
    residualForce,
    residualTorque: 0,
    stable,
  }
}

function buildPulleySnapshot(scenario: StaticsScenario): StaticsStateSnapshot {
  const gravity = 9.81
  const leftMass = Math.max(scenario.mass ?? 0, 0)
  const rightMass = Math.max(scenario.secondaryMass ?? scenario.loadMagnitude ?? leftMass, 0)
  const leftWeight = leftMass * gravity
  const rightWeight = rightMass * gravity
  const tension = Math.min(leftWeight, rightWeight)
  const totalApplied = leftWeight + rightWeight
  const totalReaction = tension * 2
  const residualForceY = totalReaction - totalApplied

  return {
    timeSeconds: 0,
    position: scenario.initialPosition,
    appliedForce: { x: 0, y: -totalApplied },
    primaryReactionForce: { x: 0, y: tension },
    secondaryReactionForce: { x: 0, y: tension },
    residualForce: { x: 0, y: residualForceY },
    residualTorque: 0,
    stable: nearlyEqual(leftWeight, rightWeight) && nearlyEqual(residualForceY, 0),
  }
}

function buildSnapshot(scenario: StaticsScenario): StaticsStateSnapshot {
  if (scenario.id === "beam-support") {
    return buildBeamSupportSnapshot(scenario)
  }

  if (scenario.id === "inclined-plane") {
    return buildInclinedPlaneSnapshot(scenario)
  }

  if (scenario.id === "pulley-equilibrium") {
    return buildPulleySnapshot(scenario)
  }

  const primaryReactionForce = {
    x: -scenario.appliedForce.x,
    y: -scenario.appliedForce.y,
  }

  return {
    timeSeconds: 0,
    position: scenario.initialPosition,
    appliedForce: scenario.appliedForce,
    primaryReactionForce,
    residualForce: { x: 0, y: 0 },
    residualTorque: 0,
    stable: true,
  }
}

@Injectable({ providedIn: "root" })
export class StaticsStateService {
  private readonly selectedScenarioId = signal<StaticsScenarioId>("beam-support")
  private readonly scenarios = signal<readonly StaticsScenario[]>(SCENARIOS)

  readonly selectedScenario = computed(
    () =>
      this.scenarios().find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios()[0],
  )
  readonly currentState = computed(() => buildSnapshot(this.selectedScenario()))
  readonly sampledStates = computed<readonly StaticsSample[]>(() => {
    const snapshot = this.currentState()
    return [
      {
        timeSeconds: snapshot.timeSeconds,
        residualForceMagnitude: magnitude(snapshot.residualForce.x, snapshot.residualForce.y),
        residualTorque: snapshot.residualTorque,
        stable: snapshot.stable,
      },
    ]
  })

  selectScenario(scenarioId: StaticsScenarioId): void {
    this.selectedScenarioId.set(scenarioId)
  }

  updateScenarioField(field: EditableStaticsField, value: number): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((scenario) => {
        if (scenario.id !== this.selectedScenarioId()) {
          return scenario
        }

        if (field === "anchorPoint.x") {
          const nextAnchorX = clamp(
            value,
            scenario.viewBounds.minX + 0.5,
            (scenario.secondaryPoint?.x ?? 9) - 0.5,
          )
          return {
            ...scenario,
            anchorPoint: { x: nextAnchorX, y: scenario.anchorPoint?.y ?? 0 },
            loadPosition: clamp(
              scenario.loadPosition ?? scenario.initialPosition.x,
              nextAnchorX,
              scenario.secondaryPoint?.x ?? 9,
            ),
          }
        }

        if (field === "secondaryPoint.x") {
          const nextSecondaryX = clamp(
            value,
            (scenario.anchorPoint?.x ?? 1) + 0.5,
            scenario.viewBounds.maxX - 0.5,
          )
          return {
            ...scenario,
            secondaryPoint: { x: nextSecondaryX, y: scenario.secondaryPoint?.y ?? 0 },
            loadPosition: clamp(
              scenario.loadPosition ?? scenario.initialPosition.x,
              scenario.anchorPoint?.x ?? 1,
              nextSecondaryX,
            ),
          }
        }

        if (field === "loadPosition") {
          return {
            ...scenario,
            loadPosition: clamp(
              value,
              scenario.anchorPoint?.x ?? 1,
              scenario.secondaryPoint?.x ?? 9,
            ),
          }
        }

        if (field === "mass") {
          return {
            ...scenario,
            mass: Math.max(value, 0),
          }
        }

        if (field === "secondaryMass") {
          return {
            ...scenario,
            secondaryMass: Math.max(value, 0),
          }
        }

        if (field === "angleDegrees") {
          return {
            ...scenario,
            angleDegrees: clamp(value, 0, 85),
          }
        }

        if (field === "frictionCoefficient") {
          return {
            ...scenario,
            frictionCoefficient: Math.max(value, 0),
          }
        }

        return {
          ...scenario,
          loadMagnitude: Math.max(value, 0),
        }
      }),
    )
  }

  importScenarioState(scenario: StaticsScenario): void {
    this.scenarios.update((scenarios) =>
      scenarios.map((existingScenario) =>
        existingScenario.id === scenario.id ? { ...scenario } : existingScenario,
      ),
    )
    this.selectedScenarioId.set(scenario.id)
  }

  listScenarios(): readonly StaticsScenario[] {
    return this.scenarios()
  }
}

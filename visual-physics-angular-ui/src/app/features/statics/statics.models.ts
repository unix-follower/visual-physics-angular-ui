export type StaticsScenarioId = "beam-support" | "inclined-plane" | "pulley-equilibrium"

export interface Vector2 {
  x: number
  y: number
}

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface StaticsScenario {
  id: StaticsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  initialPosition: Vector2
  appliedForce: Vector2
  anchorPoint?: Vector2
  secondaryPoint?: Vector2
  mass?: number
  secondaryMass?: number
  angleDegrees?: number
  frictionCoefficient?: number
  loadPosition?: number
  loadMagnitude?: number
}

export interface StaticsStateSnapshot {
  timeSeconds: number
  position: Vector2
  appliedForce: Vector2
  primaryReactionForce: Vector2
  secondaryReactionForce?: Vector2
  residualForce: Vector2
  residualTorque: number
  stable: boolean
}

export interface StaticsSample {
  timeSeconds: number
  residualForceMagnitude: number
  residualTorque: number
  stable: boolean
}

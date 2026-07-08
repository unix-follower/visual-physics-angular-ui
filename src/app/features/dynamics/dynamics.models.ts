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

export type DynamicsScenarioId =
  | "constant-force"
  | "drag-projectile"
  | "spring-oscillator"
  | "orbital-motion"
  | "elastic-collision"

export interface DynamicsScenario {
  id: DynamicsScenarioId
  name: string
  summary: string
  equationSummary: string
  durationSeconds: number
  viewBounds: ViewBounds
  mass: number
  initialPosition: Vector2
  initialVelocity: Vector2
  netForce?: Vector2
  gravity?: Vector2
  dragCoefficient?: number
  springAnchor?: Vector2
  springConstant?: number
  dampingCoefficient?: number
  orbitalCenter?: Vector2
  gravitationalParameter?: number
  restitutionCoefficient?: number
}

export interface DynamicsStateSnapshot {
  timeSeconds: number
  position: Vector2
  velocity: Vector2
  acceleration: Vector2
  netForce: Vector2
  momentum: Vector2
  speed: number
  kineticEnergy: number
  potentialEnergy: number
  totalEnergy: number
}

export interface DynamicsSample {
  timeSeconds: number
  xPosition: number
  yPosition: number
  speed: number
  totalEnergy: number
}

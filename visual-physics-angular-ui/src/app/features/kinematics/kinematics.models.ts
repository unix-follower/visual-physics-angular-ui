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

export type KinematicsScenarioId =
  | "constant-velocity"
  | "constant-acceleration"
  | "projectile"
  | "relative-motion"
  | "uniform-circular-motion"

export interface KinematicsScenario {
  id: KinematicsScenarioId
  name: string
  summary: string
  equationSummary: string
  durationSeconds: number
  viewBounds: ViewBounds
  initialPosition: Vector2
  initialVelocity: Vector2
  acceleration: Vector2
  observerVelocity?: Vector2
  radius?: number
  angularSpeed?: number
  center?: Vector2
}

export interface KinematicsStateSnapshot {
  timeSeconds: number
  position: Vector2
  velocity: Vector2
  acceleration: Vector2
  speed: number
  accelerationMagnitude: number
  relativePosition?: Vector2
  relativeVelocity?: Vector2
}

export interface KinematicsSample {
  timeSeconds: number
  xPosition: number
  yPosition: number
  speed: number
  accelerationMagnitude: number
}

export interface WebGpuSupportStatus {
  supported: boolean
  message: string
}

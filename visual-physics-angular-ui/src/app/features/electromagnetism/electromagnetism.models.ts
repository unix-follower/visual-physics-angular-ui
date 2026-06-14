export type ElectromagnetismScenarioId =
  | "point-charge-electrostatics"
  | "moving-charge-magnetic-field"
  | "current-loop-magnetic-field"
  | "capacitor-potential-field"
  | "electromagnetic-induction"

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

export interface ElectromagnetismScenario {
  id: ElectromagnetismScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  initialPosition: Vector2
  initialVelocity?: Vector2
  sourcePoint?: Vector2
  secondarySourcePoint?: Vector2
  probePoint?: Vector2
  chargeMagnitude?: number
  secondaryChargeMagnitude?: number
  mass?: number
  magneticFieldStrength?: number
  current?: number
  loopRadius?: number
  plateSeparation?: number
  potentialDifference?: number
  fluxRate?: number
  inductance?: number
}

export interface ElectromagnetismStateSnapshot {
  timeSeconds: number
  position: Vector2
  electricField: Vector2
  magneticField: Vector2
  force: Vector2
  potential: number
  fieldMagnitude: number
  forceMagnitude: number
  energy: number
  stable: boolean
}

export interface ElectromagnetismSample {
  timeSeconds: number
  xPosition: number
  yPosition: number
  fieldMagnitude: number
  forceMagnitude: number
  potential: number
}

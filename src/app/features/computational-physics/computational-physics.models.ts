export type ComputationalPhysicsScenarioId =
  | "projectile-solver-comparison"
  | "orbital-solver-comparison"
  | "spring-oscillator-comparison"

export type SolverMethodId = "euler" | "symplectic" | "rk4"

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

export interface ComputationalPhysicsScenario {
  id: ComputationalPhysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  mass: number
  initialPosition: Vector2
  initialVelocity: Vector2
  gravity?: Vector2
  dragCoefficient?: number
  orbitalCenter?: Vector2
  gravitationalParameter?: number
  springAnchor?: Vector2
  springConstant?: number
  dampingCoefficient?: number
  comparisonStepSeconds: number
  referenceStepSeconds: number
}

export interface SolverComparisonState {
  timeSeconds: number
  referencePosition: Vector2
  referenceVelocity: Vector2
  eulerPosition: Vector2
  eulerVelocity: Vector2
  symplecticPosition: Vector2
  symplecticVelocity: Vector2
  rk4Position: Vector2
  rk4Velocity: Vector2
  referenceSpeed: number
  eulerSpeed: number
  symplecticSpeed: number
  rk4Speed: number
  eulerPositionError: number
  symplecticPositionError: number
  rk4PositionError: number
  eulerSpeedError: number
  symplecticSpeedError: number
  rk4SpeedError: number
  orbitalDiagnostics?: OrbitalInvariantDiagnostics
  springDiagnostics?: SpringOscillatorDiagnostics
}

export interface SolverComparisonSample {
  timeSeconds: number
  referencePosition: Vector2
  eulerPosition: Vector2
  symplecticPosition: Vector2
  rk4Position: Vector2
  eulerPositionError: number
  symplecticPositionError: number
  rk4PositionError: number
}

export interface SolverMetrics {
  solverMethod: SolverMethodId
  finalPositionError: number
  finalSpeedError: number
  maxPathDeviation: number
}

export interface OrbitalInvariantDiagnostics {
  referenceSpecificEnergy: number
  eulerSpecificEnergy: number
  symplecticSpecificEnergy: number
  rk4SpecificEnergy: number
  eulerSpecificEnergyError: number
  symplecticSpecificEnergyError: number
  rk4SpecificEnergyError: number
  referenceAngularMomentum: number
  eulerAngularMomentum: number
  symplecticAngularMomentum: number
  rk4AngularMomentum: number
  eulerAngularMomentumError: number
  symplecticAngularMomentumError: number
  rk4AngularMomentumError: number
}

export interface SpringOscillatorDiagnostics {
  referenceTotalEnergy: number
  eulerTotalEnergy: number
  symplecticTotalEnergy: number
  rk4TotalEnergy: number
  eulerTotalEnergyError: number
  symplecticTotalEnergyError: number
  rk4TotalEnergyError: number
  referenceDisplacementMagnitude: number
  eulerDisplacementMagnitude: number
  symplecticDisplacementMagnitude: number
  rk4DisplacementMagnitude: number
  eulerDisplacementMagnitudeError: number
  symplecticDisplacementMagnitudeError: number
  rk4DisplacementMagnitudeError: number
  referencePhaseAngle: number
  eulerPhaseAngle: number
  symplecticPhaseAngle: number
  rk4PhaseAngle: number
  eulerPhaseAngleError: number
  symplecticPhaseAngleError: number
  rk4PhaseAngleError: number
}

export interface SolverConvergenceSample {
  stepSeconds: number
  eulerFinalPositionError: number
  symplecticFinalPositionError: number
  rk4FinalPositionError: number
  eulerFinalSpecificEnergyError?: number
  symplecticFinalSpecificEnergyError?: number
  rk4FinalSpecificEnergyError?: number
  eulerFinalAngularMomentumError?: number
  symplecticFinalAngularMomentumError?: number
  rk4FinalAngularMomentumError?: number
  eulerFinalSpringEnergyError?: number
  symplecticFinalSpringEnergyError?: number
  rk4FinalSpringEnergyError?: number
  eulerFinalSpringPhaseError?: number
  symplecticFinalSpringPhaseError?: number
  rk4FinalSpringPhaseError?: number
}

export interface OrbitalInvariantHistorySample {
  timeSeconds: number
  eulerSpecificEnergyError: number
  symplecticSpecificEnergyError: number
  rk4SpecificEnergyError: number
  eulerAngularMomentumError: number
  symplecticAngularMomentumError: number
  rk4AngularMomentumError: number
}

export interface SpringInvariantHistorySample {
  timeSeconds: number
  eulerTotalEnergyError: number
  symplecticTotalEnergyError: number
  rk4TotalEnergyError: number
  eulerDisplacementMagnitudeError: number
  symplecticDisplacementMagnitudeError: number
  rk4DisplacementMagnitudeError: number
  eulerPhaseAngleError: number
  symplecticPhaseAngleError: number
  rk4PhaseAngleError: number
}

export type QuantumMechanicsScenarioId =
  | "particle-in-a-box"
  | "finite-potential-well-tunneling"
  | "double-slit-interference"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface QuantumMechanicsScenario {
  id: QuantumMechanicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  boxLengthNanometers?: number
  quantumNumber?: number
  particleEnergyEv?: number
  barrierHeightEv?: number
  barrierWidthNanometers?: number
  wavelengthNanometers?: number
  slitSeparationMicrometers?: number
  slitWidthMicrometers?: number
  screenDistanceMeters?: number
}

export interface QuantumMechanicsStateSnapshot {
  timeSeconds: number
  boxLengthNanometers?: number
  quantumNumber?: number
  energyLevelEv?: number
  deBroglieWavelengthNanometers?: number
  nodeCount?: number
  firstAntinodeNanometers?: number
  particleEnergyEv?: number
  barrierHeightEv?: number
  barrierWidthNanometers?: number
  transmissionProbability?: number
  reflectionProbability?: number
  decayLengthNanometers?: number
  wavelengthNanometers?: number
  slitSeparationMicrometers?: number
  slitWidthMicrometers?: number
  screenDistanceMeters?: number
  fringeSpacingMillimeters?: number
  centralMaximumWidthMillimeters?: number
  coherenceEstimate?: number
  stable: boolean
}

export interface QuantumMechanicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

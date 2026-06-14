export type SolidStatePhysicsScenarioId =
  | "crystal-elasticity"
  | "phonon-dispersion"
  | "electronic-structure"

export interface SolidStateViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface SolidStatePhysicsScenario {
  id: SolidStatePhysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: SolidStateViewBounds
  focusArea: string
  maxStrainPercent?: number
  youngsModulusGigapascals?: number
  yieldStrengthMegapascals?: number
  latticeSpacingNanometers?: number
  springConstantNewtonsPerMeter?: number
  atomicMassAmu?: number
  bandGapElectronVolts?: number
  effectiveMassRatio?: number
  dopantDensityPerCubicCentimeter?: number
}

export interface SolidStatePhysicsStateSnapshot {
  timeSeconds: number
  strainPercent?: number
  stressMegapascals?: number
  elasticEnergyDensityMegajoulesPerCubicMeter?: number
  waveVectorFraction?: number
  acousticFrequencyTerahertz?: number
  opticalFrequencyTerahertz?: number
  groupVelocityKilometersPerSecond?: number
  energyElectronVolts?: number
  densityOfStatesArbitraryUnits?: number
  occupationProbability?: number
  stable: boolean
}

export interface SolidStatePhysicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

export interface SolidStatePhysicsOverlayOptions {
  showReferenceGuides: boolean
  showActiveMarker: boolean
  showComparisonBand: boolean
}

export interface SolidStatePhysicsReportRow {
  metric: string
  label: string
  value: string
  detail: string
}

export interface SolidStatePhysicsInsightCard {
  title: string
  value: string
  detail: string
}

export interface SolidStatePhysicsPlotGuide {
  label: string
  path: string
}

export interface SolidStatePhysicsPlotMarker {
  cx: number
  cy: number
}

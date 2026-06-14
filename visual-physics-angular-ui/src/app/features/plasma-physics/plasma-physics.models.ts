export type PlasmaPhysicsScenarioId =
  | "plasma-oscillation"
  | "debye-screening"
  | "magnetic-confinement"

export interface PlasmaPhysicsScenario {
  id: PlasmaPhysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  focusArea: string
  electronDensityPerCubicMeter?: number
  electronTemperatureElectronVolts?: number
  perturbationAmplitudePercent?: number
  probePotentialVolts?: number
  magneticFieldTesla?: number
  plasmaCurrentMegaAmperes?: number
  majorRadiusMeters?: number
}

export interface PlasmaPhysicsStateSnapshot {
  timeSeconds: number
  plasmaFrequencyGigahertz?: number
  oscillationPeriodNanoseconds?: number
  restoringFieldKilovoltsPerMeter?: number
  debyeLengthMillimeters?: number
  shieldingFraction?: number
  screenedPotentialVolts?: number
  larmorRadiusMillimeters?: number
  betaPercent?: number
  safetyFactor?: number
  stable: boolean
}

export interface PlasmaPhysicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

export interface PlasmaPhysicsOverlayOptions {
  showReferenceGuides: boolean
  showActiveMarker: boolean
  showComparisonBand: boolean
}

export interface PlasmaPhysicsReportRow {
  metric: string
  label: string
  value: string
  detail: string
}

export interface PlasmaPhysicsInsightCard {
  title: string
  value: string
  detail: string
}

export interface PlasmaPhysicsPlotGuide {
  label: string
  path: string
}

export interface PlasmaPhysicsPlotMarker {
  cx: number
  cy: number
}

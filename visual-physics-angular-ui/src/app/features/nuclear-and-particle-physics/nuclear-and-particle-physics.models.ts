export type NuclearAndParticlePhysicsScenarioId =
  | "radioactive-decay"
  | "binding-energy-curve"
  | "proton-proton-collision"

export interface NuclearAndParticlePhysicsScenario {
  id: NuclearAndParticlePhysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  focusArea: string
  halfLifeHours?: number
  initialPopulationTrillions?: number
  massNumber?: number
  protonCount?: number
  bindingEnergyPerNucleonMeV?: number
  beamEnergyGeV?: number
  scatteringAngleDegrees?: number
  detectorRadiusMeters?: number
}

export interface NuclearAndParticlePhysicsStateSnapshot {
  timeSeconds: number
  elapsedHours?: number
  remainingPopulationTrillions?: number
  remainingFraction?: number
  activityTerabecquerels?: number
  totalBindingEnergyMeV?: number
  stabilityIndex?: number
  invariantMassGeV?: number
  transverseMomentumGeV?: number
  pseudorapidity?: number
  stable: boolean
}

export interface NuclearAndParticlePhysicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

export interface NuclearAndParticlePhysicsOverlayOptions {
  showReferenceGuides: boolean
  showActiveMarker: boolean
  showComparisonBand: boolean
}

export interface NuclearAndParticlePhysicsReportRow {
  metric: string
  label: string
  value: string
  detail: string
}

export interface NuclearAndParticlePhysicsInsightCard {
  title: string
  value: string
  detail: string
}

export interface NuclearAndParticlePhysicsPlotGuide {
  label: string
  path: string
}

export interface NuclearAndParticlePhysicsPlotMarker {
  cx: number
  cy: number
}

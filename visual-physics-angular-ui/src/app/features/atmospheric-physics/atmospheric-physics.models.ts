export type AtmosphericPhysicsScenarioId =
  | "barometric-formula"
  | "adiabatic-lapse-rate"
  | "convection-column"

export interface AtmosphericViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface AtmosphericPhysicsScenario {
  id: AtmosphericPhysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: AtmosphericViewBounds
  focusArea: string
  seaLevelPressureKilopascals?: number
  scaleHeightKilometers?: number
  surfaceTemperatureKelvin?: number
  lapseRateKelvinPerKilometer?: number
  tropopauseHeightKilometers?: number
  environmentalLapseRateKelvinPerKilometer?: number
  parcelTemperatureExcessKelvin?: number
  columnHeightKilometers?: number
}

export interface AtmosphericPhysicsStateSnapshot {
  timeSeconds: number
  altitudeKilometers?: number
  pressureKilopascals?: number
  relativeDensity?: number
  temperatureKelvin?: number
  referenceTemperatureKelvin?: number
  tropopauseHeightKilometers?: number
  parcelAltitudeKilometers?: number
  buoyancyAccelerationMetersPerSecondSquared?: number
  updraftVelocityMetersPerSecond?: number
  convectiveAvailablePotentialEnergyKilojoulesPerKilogram?: number
  stable: boolean
}

export interface AtmosphericPhysicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

export interface AtmosphericPhysicsOverlayOptions {
  showReferenceGuides: boolean
  showActiveMarker: boolean
  showComparisonBand: boolean
}

export interface AtmosphericPhysicsReportRow {
  metric: string
  label: string
  value: string
  detail: string
}

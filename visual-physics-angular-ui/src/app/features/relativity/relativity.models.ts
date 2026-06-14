export type RelativityScenarioId =
  | "time-dilation"
  | "relativistic-doppler"
  | "gravitational-time-dilation"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface RelativityScenario {
  id: RelativityScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  relativeVelocityFractionOfLight?: number
  properTimeSeconds?: number
  emittedFrequencyHertz?: number
  sourceVelocityFractionOfLight?: number
  observerVelocityFractionOfLight?: number
  centralMassSolarMasses?: number
  orbitalRadiusSchwarzschildRadii?: number
  coordinateTimeSeconds?: number
}

export interface RelativityStateSnapshot {
  timeSeconds: number
  relativeVelocityFractionOfLight?: number
  properTimeSeconds?: number
  lorentzFactorGamma?: number
  dilatedTimeSeconds?: number
  timeDifferenceSeconds?: number
  emittedFrequencyHertz?: number
  sourceVelocityFractionOfLight?: number
  observerVelocityFractionOfLight?: number
  observedFrequencyHertz?: number
  classicalObservedFrequencyHertz?: number
  shiftRatio?: number
  redshift?: boolean
  centralMassSolarMasses?: number
  orbitalRadiusSchwarzschildRadii?: number
  schwarzschildRadiusKilometers?: number
  gravitationalTimeFactor?: number
  localElapsedTimeSeconds?: number
  stable: boolean
}

export interface RelativitySample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

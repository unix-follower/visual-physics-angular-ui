export type OpticsScenarioId = "snell-refraction" | "thin-lens-imaging" | "single-slit-diffraction"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface OpticsScenario {
  id: OpticsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  incidentAngleDegrees?: number
  mediumARefractiveIndex?: number
  mediumBRefractiveIndex?: number
  focalLengthCentimeters?: number
  objectDistanceCentimeters?: number
  objectHeightCentimeters?: number
  slitWidthMicrometers?: number
  wavelengthNanometers?: number
  screenDistanceMeters?: number
}

export interface OpticsStateSnapshot {
  timeSeconds: number
  incidentAngleDegrees?: number
  reflectedAngleDegrees?: number
  refractedAngleDegrees?: number
  criticalAngleDegrees?: number
  relativeRefractiveIndex?: number
  totalInternalReflection?: boolean
  focalLengthCentimeters?: number
  objectDistanceCentimeters?: number
  objectHeightCentimeters?: number
  imageDistanceCentimeters?: number
  imageHeightCentimeters?: number
  magnification?: number
  realImage?: boolean
  invertedImage?: boolean
  slitWidthMicrometers?: number
  wavelengthNanometers?: number
  screenDistanceMeters?: number
  firstMinimumOffsetMillimeters?: number
  centralMaximumWidthMillimeters?: number
  fringeSpacingMillimeters?: number
  stable: boolean
}

export interface OpticsSample {
  rayLabel: string
  startX: number
  startY: number
  endX: number
  endY: number
  angleDegrees: number
  active: boolean
}

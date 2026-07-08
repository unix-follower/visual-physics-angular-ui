export type WavesAndAcousticsScenarioId = "standing-wave" | "traveling-wave" | "doppler-effect"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface WavesAndAcousticsScenario {
  id: WavesAndAcousticsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  stringLengthMeters?: number
  waveSpeedMetersPerSecond?: number
  amplitudeMillimeters?: number
  harmonicNumber?: number
  frequencyHertz?: number
  emittedFrequencyHertz?: number
  sourceSpeedMetersPerSecond?: number
  observerSpeedMetersPerSecond?: number
}

export interface WavesAndAcousticsStateSnapshot {
  timeSeconds: number
  stringLengthMeters?: number
  waveSpeedMetersPerSecond?: number
  amplitudeMillimeters?: number
  harmonicNumber?: number
  wavelengthMeters?: number
  frequencyHertz?: number
  emittedFrequencyHertz?: number
  sourceSpeedMetersPerSecond?: number
  observerSpeedMetersPerSecond?: number
  apparentFrequencyHertz?: number
  stable: boolean
}

export interface WavesAndAcousticsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

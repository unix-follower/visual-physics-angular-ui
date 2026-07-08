export type ThermodynamicsScenarioId = "ideal-gas-state" | "heat-conduction-slab" | "carnot-cycle"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface ThermodynamicsScenario {
  id: ThermodynamicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  amountMoles?: number
  temperatureKelvin?: number
  volumeCubicMeters?: number
  molarMassKgPerMol?: number
  slabThicknessMeters?: number
  thermalConductivityWPerMK?: number
  thermalDiffusivityM2PerS?: number
  initialTemperatureCelsius?: number
  boundaryTemperatureCelsius?: number
  hotReservoirTemperatureKelvin?: number
  coldReservoirTemperatureKelvin?: number
  cycleMinVolumeCubicMeters?: number
  cycleVolumeRatio?: number
}

export interface ThermodynamicsStateSnapshot {
  timeSeconds: number
  volumeCubicMeters?: number
  pressureKpa?: number
  densityKgPerM3?: number
  internalEnergyKj?: number
  rmsSpeedMs?: number
  compressibilityFactor?: number
  centerTemperatureCelsius?: number
  surfaceTemperatureCelsius?: number
  heatFluxWPerM2?: number
  fourierNumber?: number
  normalizedTemperature?: number
  thermalEfficiency?: number
  absorbedHeatKj?: number
  rejectedHeatKj?: number
  netWorkKj?: number
  entropyTransferKjPerK?: number
  cycleStageLabel?: string
  stable: boolean
}

export interface ThermodynamicsSample {
  timeSeconds: number
  volumeCubicMeters?: number
  pressureKpa?: number
  densityKgPerM3?: number
  internalEnergyKj?: number
  rmsSpeedMs?: number
  positionMeters?: number
  temperatureCelsius?: number
  heatFluxWPerM2?: number
  normalizedTemperature?: number
  entropyTransferKjPerK?: number
  stageLabel?: string
  stable: boolean
}

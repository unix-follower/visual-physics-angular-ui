export type AstrophysicsScenarioId = "planetary-orbit" | "stellar-luminosity" | "hubble-expansion"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface AstrophysicsScenario {
  id: AstrophysicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  centralMassSolarMasses?: number
  orbitalRadiusAstronomicalUnits?: number
  orbitalEccentricity?: number
  stellarMassSolarMasses?: number
  stellarRadiusSolarRadii?: number
  surfaceTemperatureKelvin?: number
  distanceMegaparsecs?: number
  hubbleConstantKilometersPerSecondPerMegaparsec?: number
}

export interface AstrophysicsStateSnapshot {
  timeSeconds: number
  centralMassSolarMasses?: number
  orbitalRadiusAstronomicalUnits?: number
  orbitalEccentricity?: number
  orbitalPeriodDays?: number
  orbitalSpeedKilometersPerSecond?: number
  escapeSpeedKilometersPerSecond?: number
  specificOrbitalEnergyMegajoulesPerKilogram?: number
  stellarMassSolarMasses?: number
  stellarRadiusSolarRadii?: number
  surfaceTemperatureKelvin?: number
  luminositySolarUnits?: number
  habitableZoneInnerAstronomicalUnits?: number
  habitableZoneOuterAstronomicalUnits?: number
  distanceMegaparsecs?: number
  hubbleConstantKilometersPerSecondPerMegaparsec?: number
  recessionVelocityKilometersPerSecond?: number
  lightTravelTimeBillionYears?: number
  redshift?: number
  stable: boolean
}

export interface AstrophysicsSample {
  position: number
  primaryValue: number
  secondaryValue?: number
  label: string
  active: boolean
}

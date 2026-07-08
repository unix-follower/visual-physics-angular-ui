import {
  AtmosphericPhysicsSample,
  AtmosphericPhysicsScenario,
  AtmosphericPhysicsStateSnapshot,
} from "./atmospheric-physics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120

export interface AtmosphericPhysicsInsightCard {
  label: string
  value: string
  detail: string
}

export interface AtmosphericPhysicsPlotGuide {
  label: string
  value: string
  path: string
}

export interface AtmosphericPhysicsPlotMarker {
  cx: number
  cy: number
}

interface SampleScale {
  minPosition: number
  positionSpan: number
  minValue: number
  valueSpan: number
}

function buildSampleScale(samples: readonly AtmosphericPhysicsSample[]): SampleScale {
  const minPosition = Math.min(...samples.map((sample) => sample.position))
  const maxPosition = Math.max(...samples.map((sample) => sample.position))
  const values = samples.flatMap((sample) =>
    sample.secondaryValue === undefined
      ? [sample.primaryValue]
      : [sample.primaryValue, sample.secondaryValue],
  )
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  return {
    minPosition,
    positionSpan: Math.max(maxPosition - minPosition, 1e-6),
    minValue,
    valueSpan: Math.max(maxValue - minValue, 1e-6),
  }
}

function projectX(scale: SampleScale, position: number): number {
  return ((position - scale.minPosition) / scale.positionSpan) * PLOT_WIDTH
}

function projectY(scale: SampleScale, value: number): number {
  return PLOT_HEIGHT - ((value - scale.minValue) / scale.valueSpan) * PLOT_HEIGHT
}

function horizontalGuide(
  scale: SampleScale,
  value: number,
  label: string,
  units: string,
): AtmosphericPhysicsPlotGuide {
  const y = projectY(scale, value)
  return {
    label,
    value: `${value.toFixed(3)} ${units}`,
    path: `M 0 ${y.toFixed(2)} L ${PLOT_WIDTH} ${y.toFixed(2)}`,
  }
}

function verticalGuide(
  scale: SampleScale,
  position: number,
  label: string,
  units: string,
): AtmosphericPhysicsPlotGuide {
  const x = projectX(scale, position)
  return {
    label,
    value: `${position.toFixed(3)} ${units}`,
    path: `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} ${PLOT_HEIGHT}`,
  }
}

function getActiveSample(samples: readonly AtmosphericPhysicsSample[]): AtmosphericPhysicsSample {
  return samples.find((sample) => sample.active) ?? samples[0]
}

export function buildSampleGraphPath(samples: readonly AtmosphericPhysicsSample[]): string {
  if (samples.length === 0) {
    return ""
  }

  const scale = buildSampleScale(samples)
  return samples
    .map((sample, index) => {
      const x = projectX(scale, sample.position)
      const y = projectY(scale, sample.primaryValue)
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

export function buildSampleComparisonPath(samples: readonly AtmosphericPhysicsSample[]): string {
  if (samples.length === 0 || samples.every((sample) => sample.secondaryValue === undefined)) {
    return ""
  }

  const scale = buildSampleScale(samples)
  return samples
    .map((sample, index) => {
      const x = projectX(scale, sample.position)
      const y = projectY(scale, sample.secondaryValue ?? sample.primaryValue)
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

export function buildSamplePlotGuides(
  scenario: AtmosphericPhysicsScenario,
  snapshot: AtmosphericPhysicsStateSnapshot,
  samples: readonly AtmosphericPhysicsSample[],
): readonly AtmosphericPhysicsPlotGuide[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)
  const activeSample = getActiveSample(samples)

  if (scenario.id === "adiabatic-lapse-rate") {
    return [
      verticalGuide(scale, snapshot.tropopauseHeightKilometers ?? 0, "Tropopause", "km"),
      horizontalGuide(
        scale,
        snapshot.referenceTemperatureKelvin ?? 0,
        "Reference temperature",
        "K",
      ),
      verticalGuide(scale, activeSample.position, "Active altitude", "km"),
    ]
  }

  if (scenario.id === "convection-column") {
    return [
      verticalGuide(scale, activeSample.position, "Parcel altitude", "km"),
      horizontalGuide(scale, activeSample.primaryValue, "Active updraft", "m/s"),
    ]
  }

  return [
    verticalGuide(scale, 8.4, "Scale height", "km"),
    horizontalGuide(scale, snapshot.pressureKilopascals ?? 0, "Active pressure", "kPa"),
    verticalGuide(scale, activeSample.position, "Active altitude", "km"),
  ]
}

export function buildSampleMarkerPoints(
  samples: readonly AtmosphericPhysicsSample[],
): readonly AtmosphericPhysicsPlotMarker[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)
  return samples
    .filter((sample) => sample.active)
    .map((sample) => ({
      cx: projectX(scale, sample.position),
      cy: projectY(scale, sample.primaryValue),
    }))
}

export function buildInsightCards(
  scenario: AtmosphericPhysicsScenario,
  snapshot: AtmosphericPhysicsStateSnapshot,
): readonly AtmosphericPhysicsInsightCard[] {
  if (scenario.id === "adiabatic-lapse-rate") {
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail:
          "The time cursor selects the inspected altitude position along the lapse-rate profile.",
      },
      {
        label: "Temperature",
        value: `${(snapshot.temperatureKelvin ?? 0).toFixed(1)} K`,
        detail: "Dry-adiabatic temperature at the active altitude.",
      },
      {
        label: "Reference offset",
        value: `${((snapshot.temperatureKelvin ?? 0) - (snapshot.referenceTemperatureKelvin ?? 0)).toFixed(1)} K`,
        detail:
          "Difference between the active dry profile and the reference environmental profile.",
      },
      {
        label: "Tropopause height",
        value: `${(snapshot.tropopauseHeightKilometers ?? 0).toFixed(1)} km`,
        detail: "Reference transition height used for the guide overlay.",
      },
    ]
  }

  if (scenario.id === "convection-column") {
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail: "The time cursor selects the active parcel position within the convective cycle.",
      },
      {
        label: "Parcel altitude",
        value: `${(snapshot.parcelAltitudeKilometers ?? 0).toFixed(2)} km`,
        detail: "Current parcel altitude in the convective column.",
      },
      {
        label: "Updraft velocity",
        value: `${(snapshot.updraftVelocityMetersPerSecond ?? 0).toFixed(2)} m/s`,
        detail: "Vertical parcel speed from the active convective slice.",
      },
      {
        label: "CAPE proxy",
        value: `${(snapshot.convectiveAvailablePotentialEnergyKilojoulesPerKilogram ?? 0).toFixed(3)} kJ/kg`,
        detail: "Energy-style proxy derived from the active updraft speed.",
      },
    ]
  }

  return [
    {
      label: "Snapshot time",
      value: `${snapshot.timeSeconds.toFixed(3)} s`,
      detail: "The time cursor selects the inspected altitude along the pressure profile.",
    },
    {
      label: "Pressure",
      value: `${(snapshot.pressureKilopascals ?? 0).toFixed(2)} kPa`,
      detail: "Hydrostatic pressure at the active altitude.",
    },
    {
      label: "Relative density",
      value: `${(snapshot.relativeDensity ?? 0).toFixed(3)}`,
      detail: "Density ratio relative to the sea-level baseline.",
    },
    {
      label: "Altitude",
      value: `${(snapshot.altitudeKilometers ?? 0).toFixed(2)} km`,
      detail: "Current inspection altitude in the barometric profile.",
    },
  ]
}

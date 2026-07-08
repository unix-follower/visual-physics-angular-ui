import {
  AstrophysicsSample,
  AstrophysicsScenario,
  AstrophysicsStateSnapshot,
} from "./astrophysics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120

export interface AstrophysicsInsightCard {
  label: string
  value: string
  detail: string
}

export interface AstrophysicsPlotGuide {
  label: string
  value: string
  path: string
}

export interface AstrophysicsPlotMarker {
  cx: number
  cy: number
}

interface SampleScale {
  minPosition: number
  positionSpan: number
  minValue: number
  valueSpan: number
}

function buildSampleScale(samples: readonly AstrophysicsSample[]): SampleScale {
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
): AstrophysicsPlotGuide {
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
): AstrophysicsPlotGuide {
  const x = projectX(scale, position)
  return {
    label,
    value: `${position.toFixed(3)} ${units}`,
    path: `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} ${PLOT_HEIGHT}`,
  }
}

function getActiveSample(samples: readonly AstrophysicsSample[]): AstrophysicsSample {
  return samples.find((sample) => sample.active) ?? samples[0]
}

export function buildSampleGraphPath(samples: readonly AstrophysicsSample[]): string {
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

export function buildSampleComparisonPath(samples: readonly AstrophysicsSample[]): string {
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
  scenario: AstrophysicsScenario,
  snapshot: AstrophysicsStateSnapshot,
  samples: readonly AstrophysicsSample[],
): readonly AstrophysicsPlotGuide[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)
  if (scenario.id === "stellar-luminosity") {
    const activeSample = getActiveSample(samples)
    return [
      horizontalGuide(scale, 1, "Earth irradiance", "x Earth"),
      verticalGuide(
        scale,
        snapshot.habitableZoneInnerAstronomicalUnits ?? 0,
        "Inner habitable edge",
        "AU",
      ),
      verticalGuide(scale, activeSample.position, "Active distance", "AU"),
    ]
  }

  if (scenario.id === "hubble-expansion") {
    const activeSample = getActiveSample(samples)
    return [
      verticalGuide(scale, activeSample.position, "Active distance", "Mpc"),
      horizontalGuide(scale, activeSample.primaryValue, "Active recession speed", "km/s"),
    ]
  }

  return [
    verticalGuide(scale, 0, "Stellar focus", "AU"),
    horizontalGuide(scale, 0, "Orbital midplane", "AU"),
  ]
}

export function buildSampleMarkerPoints(
  samples: readonly AstrophysicsSample[],
): readonly AstrophysicsPlotMarker[] {
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
  scenario: AstrophysicsScenario,
  snapshot: AstrophysicsStateSnapshot,
): readonly AstrophysicsInsightCard[] {
  if (scenario.id === "stellar-luminosity") {
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail:
          "The active time cursor selects the inspected irradiance distance across the habitable-zone span.",
      },
      {
        label: "Luminosity",
        value: `${(snapshot.luminositySolarUnits ?? 0).toFixed(2)} Lsun`,
        detail: "Relative luminosity combines the active stellar radius and surface temperature.",
      },
      {
        label: "Habitable band width",
        value: `${((snapshot.habitableZoneOuterAstronomicalUnits ?? 0) - (snapshot.habitableZoneInnerAstronomicalUnits ?? 0)).toFixed(2)} AU`,
        detail: "Separation between the simple inner and outer habitable-zone estimates.",
      },
      {
        label: "Surface temperature",
        value: `${(snapshot.surfaceTemperatureKelvin ?? 0).toFixed(0)} K`,
        detail: "Effective surface temperature used in the Stefan-Boltzmann scaling.",
      },
    ]
  }

  if (scenario.id === "hubble-expansion") {
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail:
          "The active time cursor selects the inspected distance along the Hubble-law profile.",
      },
      {
        label: "Recession velocity",
        value: `${(snapshot.recessionVelocityKilometersPerSecond ?? 0).toFixed(0)} km/s`,
        detail: "Approximate Hubble-law recession speed at the active distance.",
      },
      {
        label: "Approximate redshift",
        value: `${(snapshot.redshift ?? 0).toFixed(4)}`,
        detail: "Low-redshift approximation built from the active recession velocity.",
      },
      {
        label: "Light-travel scale",
        value: `${(snapshot.lightTravelTimeBillionYears ?? 0).toFixed(2)} Gyr`,
        detail: "Order-of-magnitude travel-time comparison for the active distance.",
      },
    ]
  }

  return [
    {
      label: "Snapshot time",
      value: `${snapshot.timeSeconds.toFixed(3)} s`,
      detail:
        "The active time cursor selects the current orbital position used by the sampled trajectory and viewport marker.",
    },
    {
      label: "Orbital period",
      value: `${(snapshot.orbitalPeriodDays ?? 0).toFixed(2)} days`,
      detail: "One full orbit time for the selected central mass and orbital radius.",
    },
    {
      label: "Orbital speed",
      value: `${(snapshot.orbitalSpeedKilometersPerSecond ?? 0).toFixed(2)} km/s`,
      detail: "Bound orbit speed compared against escape speed at the same radius.",
    },
    {
      label: "Escape margin",
      value: `${((snapshot.escapeSpeedKilometersPerSecond ?? 0) - (snapshot.orbitalSpeedKilometersPerSecond ?? 0)).toFixed(2)} km/s`,
      detail: "Difference between escape speed and orbital speed for the active radius.",
    },
  ]
}

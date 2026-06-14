import { RelativitySample, RelativityScenario, RelativityStateSnapshot } from "./relativity.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120

export interface RelativityInsightCard {
  label: string
  value: string
  detail: string
}

export interface RelativityPlotGuide {
  label: string
  value: string
  path: string
}

export interface RelativityPlotMarker {
  cx: number
  cy: number
}

interface SampleScale {
  minPosition: number
  positionSpan: number
  minValue: number
  valueSpan: number
}

function buildSampleScale(samples: readonly RelativitySample[]): SampleScale {
  const minPosition = samples[0]?.position ?? 0
  const maxPosition = samples[samples.length - 1]?.position ?? minPosition
  const positionSpan = Math.max(maxPosition - minPosition, 1e-6)
  const values = samples.flatMap((sample) =>
    sample.secondaryValue === undefined
      ? [sample.primaryValue]
      : [sample.primaryValue, sample.secondaryValue],
  )
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueSpan = Math.max(maxValue - minValue, 1e-6)

  return { minPosition, positionSpan, minValue, valueSpan }
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
): RelativityPlotGuide {
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
): RelativityPlotGuide {
  const x = projectX(scale, position)
  return {
    label,
    value: `${position.toFixed(3)} ${units}`,
    path: `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} ${PLOT_HEIGHT}`,
  }
}

export function buildSampleGraphPath(samples: readonly RelativitySample[]): string {
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

export function buildSampleComparisonPath(samples: readonly RelativitySample[]): string {
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
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
  samples: readonly RelativitySample[],
): readonly RelativityPlotGuide[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)
  if (scenario.id === "relativistic-doppler") {
    return [
      horizontalGuide(scale, snapshot.emittedFrequencyHertz ?? 0, "Emitted frequency", "Hz"),
      verticalGuide(
        scale,
        snapshot.relativeVelocityFractionOfLight ?? 0,
        "Active relative beta",
        "c",
      ),
    ]
  }

  if (scenario.id === "gravitational-time-dilation") {
    return [
      horizontalGuide(scale, 1, "Far-field clock rate", "factor"),
      verticalGuide(scale, snapshot.orbitalRadiusSchwarzschildRadii ?? 0, "Active radius", "r_s"),
    ]
  }

  return [
    horizontalGuide(
      scale,
      snapshot.properTimeSeconds ?? snapshot.timeSeconds,
      "Proper-time baseline",
      "s",
    ),
    verticalGuide(scale, snapshot.relativeVelocityFractionOfLight ?? 0, "Active beta", "c"),
  ]
}

export function buildSampleMarkerPoints(
  samples: readonly RelativitySample[],
): readonly RelativityPlotMarker[] {
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
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
): readonly RelativityInsightCard[] {
  if (scenario.id === "relativistic-doppler") {
    return [
      {
        label: "Relative beta",
        value: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
        detail: "The effective source-observer speed uses relativistic velocity composition.",
      },
      {
        label: "Observed frequency",
        value: `${(snapshot.observedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        detail: "Relativistic redshift or blueshift for the active motion state.",
      },
      {
        label: "Classical comparison",
        value: `${(snapshot.classicalObservedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        detail: "Classical prediction helps expose where relativistic corrections matter.",
      },
      {
        label: "Shift classification",
        value: snapshot.redshift ? "Redshift" : "Blueshift",
        detail:
          "Positive relative beta lowers the observed frequency; negative relative beta raises it.",
      },
    ]
  }

  if (scenario.id === "gravitational-time-dilation") {
    return [
      {
        label: "Gravitational factor",
        value: `${(snapshot.gravitationalTimeFactor ?? 0).toFixed(4)}`,
        detail: "This factor multiplies far-field elapsed time to give the local clock reading.",
      },
      {
        label: "Local elapsed time",
        value: `${(snapshot.localElapsedTimeSeconds ?? 0).toFixed(4)} s`,
        detail:
          "The local clock lags the far-field clock more strongly closer to the Schwarzschild radius.",
      },
      {
        label: "Radius",
        value: `${(snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(2)} r_s`,
        detail: "The active clock position is expressed in multiples of the Schwarzschild radius.",
      },
      {
        label: "Schwarzschild radius",
        value: `${(snapshot.schwarzschildRadiusKilometers ?? 0).toFixed(2)} km`,
        detail:
          "This radius scales linearly with the central mass and sets the strength of the time-dilation profile.",
      },
    ]
  }

  return [
    {
      label: "Velocity",
      value: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
      detail: "The active clock speed is normalized by the speed of light.",
    },
    {
      label: "Lorentz factor",
      value: `${(snapshot.lorentzFactorGamma ?? 0).toFixed(4)}`,
      detail: "Gamma quantifies how coordinate time stretches relative to proper time.",
    },
    {
      label: "Dilated time",
      value: `${(snapshot.dilatedTimeSeconds ?? 0).toFixed(4)} s`,
      detail: "An external observer measures more elapsed time than the moving clock records.",
    },
    {
      label: "Time gap",
      value: `${(snapshot.timeDifferenceSeconds ?? 0).toFixed(4)} s`,
      detail:
        "The difference between proper and coordinate time grows steeply as beta approaches one.",
    },
  ]
}

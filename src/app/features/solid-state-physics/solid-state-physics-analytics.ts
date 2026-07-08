import {
  SolidStatePhysicsInsightCard,
  SolidStatePhysicsPlotGuide,
  SolidStatePhysicsPlotMarker,
  SolidStatePhysicsSample,
  SolidStatePhysicsScenario,
  SolidStatePhysicsStateSnapshot,
} from "./solid-state-physics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120
const PLOT_PADDING_X = 16
const PLOT_PADDING_Y = 12

function formatNumber(value: number | undefined, digits = 2): string {
  return (value ?? 0).toFixed(digits)
}

function mapSamples(
  samples: readonly SolidStatePhysicsSample[],
  selector: (sample: SolidStatePhysicsSample) => number | undefined,
): readonly { x: number; y: number }[] {
  if (samples.length === 0) {
    return []
  }

  const xValues = samples.map((sample) => sample.position)
  const yValues = samples
    .map((sample) => selector(sample))
    .filter((value): value is number => value !== undefined && Number.isFinite(value))

  if (yValues.length === 0) {
    return []
  }

  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...yValues)
  const maxY = Math.max(...yValues)
  const plotWidth = PLOT_WIDTH - PLOT_PADDING_X * 2
  const plotHeight = PLOT_HEIGHT - PLOT_PADDING_Y * 2

  return samples.map((sample) => {
    const rawY = selector(sample) ?? minY
    const normalizedX = maxX === minX ? 0.5 : (sample.position - minX) / (maxX - minX)
    const normalizedY = maxY === minY ? 0.5 : (rawY - minY) / (maxY - minY)
    return {
      x: PLOT_PADDING_X + normalizedX * plotWidth,
      y: PLOT_HEIGHT - PLOT_PADDING_Y - normalizedY * plotHeight,
    }
  })
}

function buildPath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) {
    return ""
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
}

function buildHorizontalGuide(yValue: number, samples: readonly SolidStatePhysicsSample[]): string {
  const points = mapSamples(
    samples.map((sample) => ({ ...sample, primaryValue: yValue })),
    (sample) => sample.primaryValue,
  )
  return buildPath(points)
}

function buildVerticalGuide(position: number, samples: readonly SolidStatePhysicsSample[]): string {
  if (samples.length === 0) {
    return ""
  }

  const xValues = samples.map((sample) => sample.position)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const plotWidth = PLOT_WIDTH - PLOT_PADDING_X * 2
  const normalizedX = maxX === minX ? 0.5 : (position - minX) / (maxX - minX)
  const x = PLOT_PADDING_X + normalizedX * plotWidth
  return `M ${x.toFixed(2)} ${PLOT_PADDING_Y.toFixed(2)} L ${x.toFixed(2)} ${(PLOT_HEIGHT - PLOT_PADDING_Y).toFixed(2)}`
}

export function buildInsightCards(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
): readonly SolidStatePhysicsInsightCard[] {
  if (scenario.id === "phonon-dispersion") {
    return [
      {
        title: "Acoustic branch",
        value: `${formatNumber(snapshot.acousticFrequencyTerahertz)} THz`,
        detail: "Low-frequency collective mode at the active reduced wave vector.",
      },
      {
        title: "Optical branch",
        value: `${formatNumber(snapshot.opticalFrequencyTerahertz)} THz`,
        detail: "Higher-frequency branch that stays gapped near the zone center.",
      },
      {
        title: "Group velocity",
        value: `${formatNumber(snapshot.groupVelocityKilometersPerSecond)} km/s`,
        detail: "Instantaneous slope cue for the acoustic branch near the active sample.",
      },
    ]
  }

  if (scenario.id === "electronic-structure") {
    return [
      {
        title: "Inspected energy",
        value: `${formatNumber(snapshot.energyElectronVolts)} eV`,
        detail: "Current energy sample along the simplified band-structure slice.",
      },
      {
        title: "Density of states",
        value: formatNumber(snapshot.densityOfStatesArbitraryUnits, 3),
        detail: "Relative state density near the active energy.",
      },
      {
        title: "Occupation",
        value: `${(snapshot.occupationProbability ?? 0).toFixed(3)}`,
        detail: "Fermi-like occupation estimate for the active energy sample.",
      },
    ]
  }

  return [
    {
      title: "Active strain",
      value: `${formatNumber(snapshot.strainPercent)} %`,
      detail: "Current inspected strain on the crystal stress-strain response.",
    },
    {
      title: "Active stress",
      value: `${formatNumber(snapshot.stressMegapascals)} MPa`,
      detail: "Stress carried by the crystal at the active strain point.",
    },
    {
      title: "Elastic energy",
      value: `${formatNumber(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter)} MJ/m^3`,
      detail: "Stored elastic energy density associated with the active strain point.",
    },
  ]
}

export function buildSampleGraphPath(samples: readonly SolidStatePhysicsSample[]): string {
  return buildPath(mapSamples(samples, (sample) => sample.primaryValue))
}

export function buildSampleComparisonPath(samples: readonly SolidStatePhysicsSample[]): string {
  return buildPath(mapSamples(samples, (sample) => sample.secondaryValue))
}

export function buildSampleMarkerPoints(
  samples: readonly SolidStatePhysicsSample[],
): readonly SolidStatePhysicsPlotMarker[] {
  return mapSamples(
    samples.filter((sample) => sample.active),
    (sample) => sample.primaryValue,
  ).map((point) => ({
    cx: point.x,
    cy: point.y,
  }))
}

export function buildSamplePlotGuides(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  samples: readonly SolidStatePhysicsSample[],
): readonly SolidStatePhysicsPlotGuide[] {
  if (scenario.id === "phonon-dispersion") {
    return [
      { label: "Zone edge", path: buildVerticalGuide(1, samples) },
      {
        label: "Active sample",
        path: buildVerticalGuide(snapshot.waveVectorFraction ?? 0, samples),
      },
    ]
  }

  if (scenario.id === "electronic-structure") {
    return [
      {
        label: "Band edge",
        path: buildVerticalGuide((scenario.bandGapElectronVolts ?? 1.1) / 2, samples),
      },
      {
        label: "Active sample",
        path: buildVerticalGuide(snapshot.energyElectronVolts ?? 0, samples),
      },
    ]
  }

  return [
    {
      label: "Yield guide",
      path: buildHorizontalGuide(scenario.yieldStrengthMegapascals ?? 185, samples),
    },
    { label: "Active sample", path: buildVerticalGuide(snapshot.strainPercent ?? 0, samples) },
  ]
}

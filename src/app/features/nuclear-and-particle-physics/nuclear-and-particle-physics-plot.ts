import {
  NuclearAndParticlePhysicsPlotGuide,
  NuclearAndParticlePhysicsPlotMarker,
  NuclearAndParticlePhysicsSample,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120
const PLOT_PADDING_X = 16
const PLOT_PADDING_Y = 12

function mapSamples(
  samples: readonly NuclearAndParticlePhysicsSample[],
  selector: (sample: NuclearAndParticlePhysicsSample) => number | undefined,
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

function buildVerticalGuide(
  position: number,
  samples: readonly NuclearAndParticlePhysicsSample[],
): string {
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

function buildHorizontalGuide(
  yValue: number,
  samples: readonly NuclearAndParticlePhysicsSample[],
): string {
  const points = mapSamples(
    samples.map((sample) => ({ ...sample, primaryValue: yValue })),
    (sample) => sample.primaryValue,
  )
  return buildPath(points)
}

export function buildSampleGraphPath(samples: readonly NuclearAndParticlePhysicsSample[]): string {
  return buildPath(mapSamples(samples, (sample) => sample.primaryValue))
}

export function buildSampleComparisonPath(
  samples: readonly NuclearAndParticlePhysicsSample[],
): string {
  return buildPath(mapSamples(samples, (sample) => sample.secondaryValue))
}

export function buildSampleMarkerPoints(
  samples: readonly NuclearAndParticlePhysicsSample[],
): readonly NuclearAndParticlePhysicsPlotMarker[] {
  return mapSamples(
    samples.filter((sample) => sample.active),
    (sample) => sample.primaryValue,
  ).map((point) => ({
    cx: point.x,
    cy: point.y,
  }))
}

export function buildSamplePlotGuides(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  samples: readonly NuclearAndParticlePhysicsSample[],
): readonly NuclearAndParticlePhysicsPlotGuide[] {
  if (scenario.id === "binding-energy-curve") {
    return [
      { label: "Active mass", path: buildVerticalGuide(scenario.massNumber ?? 56, samples) },
      {
        label: "Binding energy",
        path: buildHorizontalGuide(snapshot.totalBindingEnergyMeV ?? 0, samples),
      },
    ]
  }

  if (scenario.id === "proton-proton-collision") {
    return [
      {
        label: "Active angle",
        path: buildVerticalGuide(scenario.scatteringAngleDegrees ?? 28, samples),
      },
      {
        label: "Invariant mass",
        path: buildHorizontalGuide(snapshot.invariantMassGeV ?? 0, samples),
      },
    ]
  }

  return [
    {
      label: "Elapsed half-life window",
      path: buildVerticalGuide(snapshot.elapsedHours ?? 0, samples),
    },
    {
      label: "Remaining population",
      path: buildHorizontalGuide(snapshot.remainingPopulationTrillions ?? 0, samples),
    },
  ]
}

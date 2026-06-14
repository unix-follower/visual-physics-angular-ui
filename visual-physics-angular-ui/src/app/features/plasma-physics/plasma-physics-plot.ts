import {
  PlasmaPhysicsPlotGuide,
  PlasmaPhysicsPlotMarker,
  PlasmaPhysicsSample,
  PlasmaPhysicsScenario,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120
const PLOT_PADDING_X = 16
const PLOT_PADDING_Y = 12

function mapSamples(
  samples: readonly PlasmaPhysicsSample[],
  selector: (sample: PlasmaPhysicsSample) => number | undefined,
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

function buildVerticalGuide(position: number, samples: readonly PlasmaPhysicsSample[]): string {
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

function buildHorizontalGuide(yValue: number, samples: readonly PlasmaPhysicsSample[]): string {
  const points = mapSamples(
    samples.map((sample) => ({ ...sample, primaryValue: yValue })),
    (sample) => sample.primaryValue,
  )
  return buildPath(points)
}

export function buildSampleGraphPath(samples: readonly PlasmaPhysicsSample[]): string {
  return buildPath(mapSamples(samples, (sample) => sample.primaryValue))
}

export function buildSampleComparisonPath(samples: readonly PlasmaPhysicsSample[]): string {
  return buildPath(mapSamples(samples, (sample) => sample.secondaryValue))
}

export function buildSampleMarkerPoints(
  samples: readonly PlasmaPhysicsSample[],
): readonly PlasmaPhysicsPlotMarker[] {
  return mapSamples(
    samples.filter((sample) => sample.active),
    (sample) => sample.primaryValue,
  ).map((point) => ({
    cx: point.x,
    cy: point.y,
  }))
}

export function buildSamplePlotGuides(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  samples: readonly PlasmaPhysicsSample[],
): readonly PlasmaPhysicsPlotGuide[] {
  if (scenario.id === "debye-screening") {
    return [
      { label: "Active radius", path: buildVerticalGuide(snapshot.timeSeconds * 3, samples) },
      {
        label: "Screened potential",
        path: buildHorizontalGuide(snapshot.screenedPotentialVolts ?? 0, samples),
      },
    ]
  }

  if (scenario.id === "magnetic-confinement") {
    return [
      { label: "Active radius fraction", path: buildVerticalGuide(snapshot.timeSeconds, samples) },
      { label: "Safety factor", path: buildHorizontalGuide(snapshot.safetyFactor ?? 0, samples) },
    ]
  }

  return [
    { label: "Active phase", path: buildVerticalGuide(snapshot.timeSeconds, samples) },
    {
      label: "Restoring field",
      path: buildHorizontalGuide(snapshot.restoringFieldKilovoltsPerMeter ?? 0, samples),
    },
  ]
}

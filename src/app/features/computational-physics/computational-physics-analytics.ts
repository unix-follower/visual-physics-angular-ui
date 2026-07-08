import {
  ComputationalPhysicsScenario,
  OrbitalInvariantHistorySample,
  SpringInvariantHistorySample,
  SolverConvergenceSample,
  SolverComparisonState,
  SolverMethodId,
  SolverMetrics,
} from "./computational-physics.models"

export interface InsightCard {
  title: string
  value: string
  context: string
}

export interface ComparisonPlotSeries {
  label: string
  color: string
  path: string
}

export interface ComparisonPlotGuideLine {
  label: string
  color: string
  path: string
  labelX: number
  labelY: number
}

export interface ComparisonPlot {
  series: ComparisonPlotSeries[]
  guideLines: ComparisonPlotGuideLine[]
  xStartLabel: string
  xEndLabel: string
  yMinLabel: string
  yMaxLabel: string
}

export interface ObservedOrderEstimate {
  coarseStepSeconds: number
  fineStepSeconds: number
  eulerOrder: number | null
  symplecticOrder: number | null
  rk4Order: number | null
}

export interface StabilityThresholdEstimate {
  solverMethod: SolverMethodId
  tolerance: number
  recommendedStepSeconds: number | null
  finalPositionError: number | null
}

export interface SpringDriftThresholdEstimate {
  metric: "energy" | "phase"
  solverMethod: SolverMethodId
  tolerance: number
  recommendedStepSeconds: number | null
  finalError: number | null
}

export interface OrbitalDriftThresholdEstimate {
  metric: "energy" | "angularMomentum"
  solverMethod: SolverMethodId
  tolerance: number
  recommendedStepSeconds: number | null
  finalError: number | null
}

export interface SolverRecommendationSummary {
  solverMethod: SolverMethodId
  recommendedStepSeconds: number
  reason: string
}

export interface SolverRecommendationCandidate {
  solverMethod: SolverMethodId
  recommendedStepSeconds: number | null
  limitingMetric: string
  eligible: boolean
  reason: string
}

export function buildInsightCards(
  currentState: SolverComparisonState,
  metrics: Record<SolverMethodId, SolverMetrics>,
  selectedSolverMethod: SolverMethodId,
  solverRecommendation?: SolverRecommendationSummary | null,
): InsightCard[] {
  const activeMetrics = metrics[selectedSolverMethod]
  const alternates = (Object.entries(metrics) as [SolverMethodId, SolverMetrics][])
    .filter(([method]) => method !== selectedSolverMethod)
    .sort((left, right) => left[1].finalPositionError - right[1].finalPositionError)
  const bestAlternate = alternates[0]
  const widestDrift = [
    ...alternates,
    [selectedSolverMethod, activeMetrics] as [SolverMethodId, SolverMetrics],
  ].sort((left, right) => right[1].maxPathDeviation - left[1].maxPathDeviation)[0]

  return [
    ...(solverRecommendation
      ? [
          {
            title: "Best stable solver",
            value: `${solverRecommendation.solverMethod.toUpperCase()} at Δt ${solverRecommendation.recommendedStepSeconds.toFixed(3)}`,
            context: solverRecommendation.reason,
          },
        ]
      : []),
    {
      title: `${selectedSolverMethod.toUpperCase()} final position error`,
      value: activeMetrics.finalPositionError.toFixed(3),
      context: `Compared with the reference path at t=${currentState.timeSeconds.toFixed(2)} s.`,
    },
    {
      title: `${selectedSolverMethod.toUpperCase()} max path deviation`,
      value: activeMetrics.maxPathDeviation.toFixed(3),
      context: "Largest sampled offset from the reference trajectory over the full run.",
    },
    {
      title: `${bestAlternate[0].toUpperCase()} best alternate`,
      value: bestAlternate[1].finalPositionError.toFixed(3),
      context: "Lowest final-position error among the other available integrators.",
    },
    {
      title: `${widestDrift[0].toUpperCase()} widest drift`,
      value: widestDrift[1].maxPathDeviation.toFixed(3),
      context: "Largest sampled trajectory deviation over the full comparison window.",
    },
    ...(currentState.orbitalDiagnostics
      ? [
          {
            title: `${selectedSolverMethod.toUpperCase()} energy error`,
            value: (selectedSolverMethod === "euler"
              ? currentState.orbitalDiagnostics.eulerSpecificEnergyError
              : selectedSolverMethod === "symplectic"
                ? currentState.orbitalDiagnostics.symplecticSpecificEnergyError
                : currentState.orbitalDiagnostics.rk4SpecificEnergyError
            ).toFixed(4),
            context: "Specific mechanical energy drift relative to the reference orbit.",
          },
          {
            title: `${selectedSolverMethod.toUpperCase()} angular momentum error`,
            value: (selectedSolverMethod === "euler"
              ? currentState.orbitalDiagnostics.eulerAngularMomentumError
              : selectedSolverMethod === "symplectic"
                ? currentState.orbitalDiagnostics.symplecticAngularMomentumError
                : currentState.orbitalDiagnostics.rk4AngularMomentumError
            ).toFixed(4),
            context: "Angular momentum drift relative to the reference orbit.",
          },
        ]
      : []),
    ...(currentState.springDiagnostics
      ? [
          {
            title: `${selectedSolverMethod.toUpperCase()} spring energy error`,
            value: (selectedSolverMethod === "euler"
              ? currentState.springDiagnostics.eulerTotalEnergyError
              : selectedSolverMethod === "symplectic"
                ? currentState.springDiagnostics.symplecticTotalEnergyError
                : currentState.springDiagnostics.rk4TotalEnergyError
            ).toFixed(4),
            context: "Total spring-mass energy drift relative to the high-resolution reference.",
          },
          {
            title: `${selectedSolverMethod.toUpperCase()} spring amplitude error`,
            value: (selectedSolverMethod === "euler"
              ? currentState.springDiagnostics.eulerDisplacementMagnitudeError
              : selectedSolverMethod === "symplectic"
                ? currentState.springDiagnostics.symplecticDisplacementMagnitudeError
                : currentState.springDiagnostics.rk4DisplacementMagnitudeError
            ).toFixed(4),
            context:
              "Instantaneous displacement-magnitude drift relative to the reference oscillator.",
          },
          {
            title: `${selectedSolverMethod.toUpperCase()} spring phase error`,
            value: (selectedSolverMethod === "euler"
              ? currentState.springDiagnostics.eulerPhaseAngleError
              : selectedSolverMethod === "symplectic"
                ? currentState.springDiagnostics.symplecticPhaseAngleError
                : currentState.springDiagnostics.rk4PhaseAngleError
            ).toFixed(4),
            context: "Wrapped phase-angle drift relative to the reference oscillator trajectory.",
          },
        ]
      : []),
  ]
}

export function buildConvergencePlot(
  samples: readonly SolverConvergenceSample[],
  tolerance?: number | null,
  recommendedStepSeconds?: number | null,
): ComparisonPlot {
  return buildComparisonPlot(
    samples,
    (sample) => sample.stepSeconds,
    [
      { label: "Euler", color: "#c2410c", value: (sample) => sample.eulerFinalPositionError },
      {
        label: "Symplectic",
        color: "#b45309",
        value: (sample) => sample.symplecticFinalPositionError,
      },
      { label: "RK4", color: "#0f766e", value: (sample) => sample.rk4FinalPositionError },
    ],
    (value) => `Δt ${value.toFixed(3)}`,
    (value) => value.toFixed(3),
    [
      ...(tolerance === null || tolerance === undefined
        ? []
        : [
            { label: "Position tolerance", color: "#475569", value: tolerance, axis: "y" as const },
          ]),
      ...(recommendedStepSeconds === null || recommendedStepSeconds === undefined
        ? []
        : [
            {
              label: "Best recommended Δt",
              color: "#1d4ed8",
              value: recommendedStepSeconds,
              axis: "x" as const,
            },
          ]),
    ],
  )
}

export function buildOrbitalConvergencePlot(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "angularMomentum",
  tolerance?: number | null,
  recommendedStepSeconds?: number | null,
): ComparisonPlot {
  return buildComparisonPlot(
    samples,
    (sample) => sample.stepSeconds,
    metric === "energy"
      ? [
          {
            label: "Euler",
            color: "#c2410c",
            value: (sample) => sample.eulerFinalSpecificEnergyError ?? 0,
          },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticFinalSpecificEnergyError ?? 0,
          },
          {
            label: "RK4",
            color: "#0f766e",
            value: (sample) => sample.rk4FinalSpecificEnergyError ?? 0,
          },
        ]
      : [
          {
            label: "Euler",
            color: "#c2410c",
            value: (sample) => sample.eulerFinalAngularMomentumError ?? 0,
          },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticFinalAngularMomentumError ?? 0,
          },
          {
            label: "RK4",
            color: "#0f766e",
            value: (sample) => sample.rk4FinalAngularMomentumError ?? 0,
          },
        ],
    (value) => `Δt ${value.toFixed(3)}`,
    (value) => value.toFixed(4),
    [
      ...(tolerance === null || tolerance === undefined
        ? []
        : [
            {
              label: `Orbital ${formatMetricLabel(metric)} tolerance`,
              color: "#475569",
              value: tolerance,
              axis: "y" as const,
            },
          ]),
      ...(recommendedStepSeconds === null || recommendedStepSeconds === undefined
        ? []
        : [
            {
              label: "Best recommended Δt",
              color: "#1d4ed8",
              value: recommendedStepSeconds,
              axis: "x" as const,
            },
          ]),
    ],
  )
}

export function buildSpringConvergencePlot(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "phase",
  tolerance?: number | null,
  recommendedStepSeconds?: number | null,
): ComparisonPlot {
  return buildComparisonPlot(
    samples,
    (sample) => sample.stepSeconds,
    metric === "energy"
      ? [
          {
            label: "Euler",
            color: "#c2410c",
            value: (sample) => sample.eulerFinalSpringEnergyError ?? 0,
          },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticFinalSpringEnergyError ?? 0,
          },
          {
            label: "RK4",
            color: "#0f766e",
            value: (sample) => sample.rk4FinalSpringEnergyError ?? 0,
          },
        ]
      : [
          {
            label: "Euler",
            color: "#c2410c",
            value: (sample) => sample.eulerFinalSpringPhaseError ?? 0,
          },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticFinalSpringPhaseError ?? 0,
          },
          {
            label: "RK4",
            color: "#0f766e",
            value: (sample) => sample.rk4FinalSpringPhaseError ?? 0,
          },
        ],
    (value) => `Δt ${value.toFixed(3)}`,
    (value) => value.toFixed(4),
    [
      ...(tolerance === null || tolerance === undefined
        ? []
        : [
            {
              label: `Spring ${formatMetricLabel(metric)} tolerance`,
              color: "#475569",
              value: tolerance,
              axis: "y" as const,
            },
          ]),
      ...(recommendedStepSeconds === null || recommendedStepSeconds === undefined
        ? []
        : [
            {
              label: "Best recommended Δt",
              color: "#1d4ed8",
              value: recommendedStepSeconds,
              axis: "x" as const,
            },
          ]),
    ],
  )
}

export function buildInvariantHistoryPlot(
  samples: readonly OrbitalInvariantHistorySample[],
  metric: "energy" | "angularMomentum",
): ComparisonPlot {
  return buildComparisonPlot(
    samples,
    (sample) => sample.timeSeconds,
    metric === "energy"
      ? [
          { label: "Euler", color: "#c2410c", value: (sample) => sample.eulerSpecificEnergyError },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticSpecificEnergyError,
          },
          { label: "RK4", color: "#0f766e", value: (sample) => sample.rk4SpecificEnergyError },
        ]
      : [
          { label: "Euler", color: "#c2410c", value: (sample) => sample.eulerAngularMomentumError },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticAngularMomentumError,
          },
          { label: "RK4", color: "#0f766e", value: (sample) => sample.rk4AngularMomentumError },
        ],
    (value) => `t ${value.toFixed(2)}`,
    (value) => value.toFixed(4),
  )
}

export function buildSpringInvariantHistoryPlot(
  samples: readonly SpringInvariantHistorySample[],
  metric: "energy" | "amplitude" | "phase",
): ComparisonPlot {
  return buildComparisonPlot(
    samples,
    (sample) => sample.timeSeconds,
    metric === "energy"
      ? [
          { label: "Euler", color: "#c2410c", value: (sample) => sample.eulerTotalEnergyError },
          {
            label: "Symplectic",
            color: "#b45309",
            value: (sample) => sample.symplecticTotalEnergyError,
          },
          { label: "RK4", color: "#0f766e", value: (sample) => sample.rk4TotalEnergyError },
        ]
      : metric === "amplitude"
        ? [
            {
              label: "Euler",
              color: "#c2410c",
              value: (sample) => sample.eulerDisplacementMagnitudeError,
            },
            {
              label: "Symplectic",
              color: "#b45309",
              value: (sample) => sample.symplecticDisplacementMagnitudeError,
            },
            {
              label: "RK4",
              color: "#0f766e",
              value: (sample) => sample.rk4DisplacementMagnitudeError,
            },
          ]
        : [
            { label: "Euler", color: "#c2410c", value: (sample) => sample.eulerPhaseAngleError },
            {
              label: "Symplectic",
              color: "#b45309",
              value: (sample) => sample.symplecticPhaseAngleError,
            },
            { label: "RK4", color: "#0f766e", value: (sample) => sample.rk4PhaseAngleError },
          ],
    (value) => `t ${value.toFixed(2)}`,
    (value) => value.toFixed(4),
  )
}

export function buildObservedOrderEstimates(
  samples: readonly SolverConvergenceSample[],
): ObservedOrderEstimate[] {
  return buildMetricObservedOrderEstimates(samples, {
    euler: (sample) => sample.eulerFinalPositionError,
    symplectic: (sample) => sample.symplecticFinalPositionError,
    rk4: (sample) => sample.rk4FinalPositionError,
  })
}

export function buildOrbitalObservedOrderEstimates(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "angularMomentum",
): ObservedOrderEstimate[] {
  return buildMetricObservedOrderEstimates(
    samples,
    metric === "energy"
      ? {
          euler: (sample) => sample.eulerFinalSpecificEnergyError ?? 0,
          symplectic: (sample) => sample.symplecticFinalSpecificEnergyError ?? 0,
          rk4: (sample) => sample.rk4FinalSpecificEnergyError ?? 0,
        }
      : {
          euler: (sample) => sample.eulerFinalAngularMomentumError ?? 0,
          symplectic: (sample) => sample.symplecticFinalAngularMomentumError ?? 0,
          rk4: (sample) => sample.rk4FinalAngularMomentumError ?? 0,
        },
  )
}

export function buildSpringObservedOrderEstimates(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "phase",
): ObservedOrderEstimate[] {
  return buildMetricObservedOrderEstimates(
    samples,
    metric === "energy"
      ? {
          euler: (sample) => sample.eulerFinalSpringEnergyError ?? 0,
          symplectic: (sample) => sample.symplecticFinalSpringEnergyError ?? 0,
          rk4: (sample) => sample.rk4FinalSpringEnergyError ?? 0,
        }
      : {
          euler: (sample) => sample.eulerFinalSpringPhaseError ?? 0,
          symplectic: (sample) => sample.symplecticFinalSpringPhaseError ?? 0,
          rk4: (sample) => sample.rk4FinalSpringPhaseError ?? 0,
        },
  )
}

function buildMetricObservedOrderEstimates(
  samples: readonly SolverConvergenceSample[],
  errorAccessors: {
    euler: (sample: SolverConvergenceSample) => number
    symplectic: (sample: SolverConvergenceSample) => number
    rk4: (sample: SolverConvergenceSample) => number
  },
): ObservedOrderEstimate[] {
  const sortedSamples = [...samples].sort((left, right) => right.stepSeconds - left.stepSeconds)
  const estimates: ObservedOrderEstimate[] = []

  for (let index = 0; index < sortedSamples.length - 1; index += 1) {
    const coarse = sortedSamples[index]
    const fine = sortedSamples[index + 1]
    const ratio = coarse.stepSeconds / Math.max(fine.stepSeconds, 1e-12)

    estimates.push({
      coarseStepSeconds: coarse.stepSeconds,
      fineStepSeconds: fine.stepSeconds,
      eulerOrder: computeObservedOrder(
        errorAccessors.euler(coarse),
        errorAccessors.euler(fine),
        ratio,
      ),
      symplecticOrder: computeObservedOrder(
        errorAccessors.symplectic(coarse),
        errorAccessors.symplectic(fine),
        ratio,
      ),
      rk4Order: computeObservedOrder(errorAccessors.rk4(coarse), errorAccessors.rk4(fine), ratio),
    })
  }

  return estimates
}

export function buildStabilityThresholdEstimates(
  scenario: ComputationalPhysicsScenario,
  samples: readonly SolverConvergenceSample[],
): StabilityThresholdEstimate[] {
  const tolerance =
    Math.hypot(
      scenario.viewBounds.maxX - scenario.viewBounds.minX,
      scenario.viewBounds.maxY - scenario.viewBounds.minY,
    ) * 0.02
  const sortedSamples = [...samples].sort((left, right) => right.stepSeconds - left.stepSeconds)

  const estimates: Array<Omit<StabilityThresholdEstimate, "tolerance">> = [
    {
      solverMethod: "euler",
      ...findRecommendedStep(sortedSamples, tolerance, (sample) => sample.eulerFinalPositionError),
    },
    {
      solverMethod: "symplectic",
      ...findRecommendedStep(
        sortedSamples,
        tolerance,
        (sample) => sample.symplecticFinalPositionError,
      ),
    },
    {
      solverMethod: "rk4",
      ...findRecommendedStep(sortedSamples, tolerance, (sample) => sample.rk4FinalPositionError),
    },
  ]

  return estimates.map((estimate) => ({
    ...estimate,
    tolerance,
  }))
}

export function buildSpringDriftThresholdEstimates(
  scenario: ComputationalPhysicsScenario,
  samples: readonly SolverConvergenceSample[],
): SpringDriftThresholdEstimate[] {
  if (scenario.id !== "spring-oscillator-comparison") {
    return []
  }

  const referenceEnergy =
    0.5 * scenario.mass * (scenario.initialVelocity.x ** 2 + scenario.initialVelocity.y ** 2) +
    0.5 *
      (scenario.springConstant ?? 0) *
      ((scenario.initialPosition.x - (scenario.springAnchor?.x ?? 0)) ** 2 +
        (scenario.initialPosition.y - (scenario.springAnchor?.y ?? 0)) ** 2)
  const energyTolerance = Math.max(referenceEnergy * 0.05, 0.01)
  const phaseTolerance = 0.15
  const sortedSamples = [...samples].sort((left, right) => right.stepSeconds - left.stepSeconds)

  return [
    ...buildSpringMetricThresholds(sortedSamples, "energy", energyTolerance, {
      euler: (sample) => sample.eulerFinalSpringEnergyError,
      symplectic: (sample) => sample.symplecticFinalSpringEnergyError,
      rk4: (sample) => sample.rk4FinalSpringEnergyError,
    }),
    ...buildSpringMetricThresholds(sortedSamples, "phase", phaseTolerance, {
      euler: (sample) => sample.eulerFinalSpringPhaseError,
      symplectic: (sample) => sample.symplecticFinalSpringPhaseError,
      rk4: (sample) => sample.rk4FinalSpringPhaseError,
    }),
  ]
}

export function buildOrbitalDriftThresholdEstimates(
  scenario: ComputationalPhysicsScenario,
  samples: readonly SolverConvergenceSample[],
): OrbitalDriftThresholdEstimate[] {
  if (scenario.id !== "orbital-solver-comparison") {
    return []
  }

  const energyTolerance = 0.05
  const angularMomentumTolerance = 0.05
  const sortedSamples = [...samples].sort((left, right) => right.stepSeconds - left.stepSeconds)

  return [
    ...buildOrbitalMetricThresholds(sortedSamples, "energy", energyTolerance, {
      euler: (sample) => sample.eulerFinalSpecificEnergyError,
      symplectic: (sample) => sample.symplecticFinalSpecificEnergyError,
      rk4: (sample) => sample.rk4FinalSpecificEnergyError,
    }),
    ...buildOrbitalMetricThresholds(sortedSamples, "angularMomentum", angularMomentumTolerance, {
      euler: (sample) => sample.eulerFinalAngularMomentumError,
      symplectic: (sample) => sample.symplecticFinalAngularMomentumError,
      rk4: (sample) => sample.rk4FinalAngularMomentumError,
    }),
  ]
}

export function buildSolverRecommendationSummary(
  scenario: ComputationalPhysicsScenario,
  positionThresholds: readonly StabilityThresholdEstimate[],
  orbitalThresholds: readonly OrbitalDriftThresholdEstimate[],
  springThresholds: readonly SpringDriftThresholdEstimate[],
): SolverRecommendationSummary | null {
  const summaries = buildSolverRecommendationCandidates(
    scenario,
    positionThresholds,
    orbitalThresholds,
    springThresholds,
  )
    .filter((candidate) => candidate.eligible && candidate.recommendedStepSeconds !== null)
    .map((candidate) => {
      const recommendedStepSeconds = candidate.recommendedStepSeconds
      if (recommendedStepSeconds === null) {
        throw new Error("Eligible solver recommendation is missing a recommended timestep.")
      }

      return {
        solverMethod: candidate.solverMethod,
        recommendedStepSeconds,
        reason: candidate.reason,
      }
    })

  return summaries[0] ?? null
}

export function buildSolverRecommendationCandidates(
  scenario: ComputationalPhysicsScenario,
  positionThresholds: readonly StabilityThresholdEstimate[],
  orbitalThresholds: readonly OrbitalDriftThresholdEstimate[],
  springThresholds: readonly SpringDriftThresholdEstimate[],
): SolverRecommendationCandidate[] {
  const scenarioMetrics = collectScenarioRecommendationMetrics(
    scenario,
    positionThresholds,
    orbitalThresholds,
    springThresholds,
  )

  return (["euler", "symplectic", "rk4"] as const)
    .map((solverMethod) => {
      const solverMetrics = scenarioMetrics.filter((metric) => metric.solverMethod === solverMethod)
      if (solverMetrics.length === 0) {
        return {
          solverMethod,
          recommendedStepSeconds: null,
          limitingMetric: "unavailable",
          eligible: false,
          reason: "No sampled metrics are available for this solver.",
        }
      }

      const blockingMetric = solverMetrics.find((metric) => metric.recommendedStepSeconds === null)
      if (blockingMetric) {
        const limitingMetric = formatMetricLabel(blockingMetric.metric)
        return {
          solverMethod,
          recommendedStepSeconds: null,
          limitingMetric,
          eligible: false,
          reason: `${limitingMetric} never meets the sampled tolerance band.`,
        }
      }

      const limitingMetric = solverMetrics.reduce((current, candidate) =>
        (candidate.recommendedStepSeconds ?? 0) < (current.recommendedStepSeconds ?? 0)
          ? candidate
          : current,
      )
      const metricLabel = formatMetricLabel(limitingMetric.metric)

      return {
        solverMethod,
        recommendedStepSeconds: limitingMetric.recommendedStepSeconds ?? null,
        limitingMetric: metricLabel,
        eligible: true,
        reason: `${metricLabel} is the limiting tolerance.`,
      }
    })
    .sort((left, right) => {
      if (left.eligible !== right.eligible) {
        return left.eligible ? -1 : 1
      }

      return (right.recommendedStepSeconds ?? -1) - (left.recommendedStepSeconds ?? -1)
    })
}

function buildComparisonPlot<T>(
  samples: readonly T[],
  xValue: (sample: T) => number,
  series: readonly {
    label: string
    color: string
    value: (sample: T) => number
  }[],
  xFormatter: (value: number) => string,
  yFormatter: (value: number) => string,
  guideLines: readonly {
    label: string
    color: string
    value: number
    axis: "x" | "y"
  }[] = [],
): ComparisonPlot {
  if (samples.length === 0) {
    return {
      series: series.map((entry) => ({ ...entry, path: "" })),
      guideLines: [],
      xStartLabel: "",
      xEndLabel: "",
      yMinLabel: "",
      yMaxLabel: "",
    }
  }

  const width = 320
  const height = 120
  const sortedSamples = [...samples].sort((left, right) => xValue(left) - xValue(right))
  const xValues = sortedSamples.map((sample) => xValue(sample))
  const allYValues = sortedSamples.flatMap((sample) => series.map((entry) => entry.value(sample)))
  const guideYValues = guideLines
    .filter((guideLine) => guideLine.axis === "y")
    .map((guideLine) => guideLine.value)
  const minX = Math.min(...xValues)
  const maxX = Math.max(...xValues)
  const minY = Math.min(...allYValues, ...guideYValues)
  const maxY = Math.max(...allYValues, ...guideYValues)
  const xSpan = Math.max(maxX - minX, 1e-6)
  const ySpan = Math.max(maxY - minY, 1e-6)

  return {
    series: series.map((entry) => ({
      label: entry.label,
      color: entry.color,
      path: sortedSamples
        .map((sample, index) => {
          const x = ((xValue(sample) - minX) / xSpan) * width
          const y = height - ((entry.value(sample) - minY) / ySpan) * height
          return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
        })
        .join(" "),
    })),
    guideLines: guideLines.map((guideLine) => {
      if (guideLine.axis === "x") {
        const x = ((guideLine.value - minX) / xSpan) * width
        return {
          label: guideLine.label,
          color: guideLine.color,
          path: `M ${x.toFixed(2)} 0.00 L ${x.toFixed(2)} ${height.toFixed(2)}`,
          labelX: x,
          labelY: 10,
        }
      }

      const y = height - ((guideLine.value - minY) / ySpan) * height
      return {
        label: guideLine.label,
        color: guideLine.color,
        path: `M 0.00 ${y.toFixed(2)} L ${width.toFixed(2)} ${y.toFixed(2)}`,
        labelX: 178,
        labelY: y,
      }
    }),
    xStartLabel: xFormatter(minX),
    xEndLabel: xFormatter(maxX),
    yMinLabel: yFormatter(minY),
    yMaxLabel: yFormatter(maxY),
  }
}

function computeObservedOrder(
  coarseError: number,
  fineError: number,
  stepRatio: number,
): number | null {
  if (coarseError <= 0 || fineError <= 0 || stepRatio <= 1) {
    return null
  }

  return Math.log(coarseError / fineError) / Math.log(stepRatio)
}

function findRecommendedStep(
  samples: readonly SolverConvergenceSample[],
  tolerance: number,
  errorAccessor: (sample: SolverConvergenceSample) => number,
): Pick<StabilityThresholdEstimate, "recommendedStepSeconds" | "finalPositionError"> {
  const match = samples.find((sample) => errorAccessor(sample) <= tolerance)
  return {
    recommendedStepSeconds: match?.stepSeconds ?? null,
    finalPositionError: match ? errorAccessor(match) : null,
  }
}

function buildSpringMetricThresholds(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "phase",
  tolerance: number,
  accessors: Record<SolverMethodId, (sample: SolverConvergenceSample) => number | undefined>,
): SpringDriftThresholdEstimate[] {
  return (
    Object.entries(accessors) as [
      SolverMethodId,
      (sample: SolverConvergenceSample) => number | undefined,
    ][]
  ).map(([solverMethod, accessor]) => {
    const match = samples.find((sample) => {
      const error = accessor(sample)
      return error !== undefined && error <= tolerance
    })
    return {
      metric,
      solverMethod,
      tolerance,
      recommendedStepSeconds: match?.stepSeconds ?? null,
      finalError: match ? (accessor(match) ?? null) : null,
    }
  })
}

function buildOrbitalMetricThresholds(
  samples: readonly SolverConvergenceSample[],
  metric: "energy" | "angularMomentum",
  tolerance: number,
  accessors: Record<SolverMethodId, (sample: SolverConvergenceSample) => number | undefined>,
): OrbitalDriftThresholdEstimate[] {
  return (
    Object.entries(accessors) as [
      SolverMethodId,
      (sample: SolverConvergenceSample) => number | undefined,
    ][]
  ).map(([solverMethod, accessor]) => {
    const match = samples.find((sample) => {
      const error = accessor(sample)
      return error !== undefined && error <= tolerance
    })
    return {
      metric,
      solverMethod,
      tolerance,
      recommendedStepSeconds: match?.stepSeconds ?? null,
      finalError: match ? (accessor(match) ?? null) : null,
    }
  })
}

function collectScenarioRecommendationMetrics(
  scenario: ComputationalPhysicsScenario,
  positionThresholds: readonly StabilityThresholdEstimate[],
  orbitalThresholds: readonly OrbitalDriftThresholdEstimate[],
  springThresholds: readonly SpringDriftThresholdEstimate[],
): Array<{
  solverMethod: SolverMethodId
  metric: string
  recommendedStepSeconds: number | null
}> {
  if (scenario.id === "orbital-solver-comparison") {
    return [
      ...positionThresholds.map((threshold) => ({
        solverMethod: threshold.solverMethod,
        metric: "position",
        recommendedStepSeconds: threshold.recommendedStepSeconds,
      })),
      ...orbitalThresholds.map((threshold) => ({
        solverMethod: threshold.solverMethod,
        metric: threshold.metric,
        recommendedStepSeconds: threshold.recommendedStepSeconds,
      })),
    ]
  }

  if (scenario.id === "spring-oscillator-comparison") {
    return [
      ...positionThresholds.map((threshold) => ({
        solverMethod: threshold.solverMethod,
        metric: "position",
        recommendedStepSeconds: threshold.recommendedStepSeconds,
      })),
      ...springThresholds.map((threshold) => ({
        solverMethod: threshold.solverMethod,
        metric: threshold.metric,
        recommendedStepSeconds: threshold.recommendedStepSeconds,
      })),
    ]
  }

  return positionThresholds.map((threshold) => ({
    solverMethod: threshold.solverMethod,
    metric: "position",
    recommendedStepSeconds: threshold.recommendedStepSeconds,
  }))
}

function formatMetricLabel(metric: string): string {
  return metric === "angularMomentum" ? "angular momentum" : metric
}

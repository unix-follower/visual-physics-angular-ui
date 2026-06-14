import {
  OrbitalInvariantHistorySample,
  ComputationalPhysicsScenario,
  SpringInvariantHistorySample,
  SolverConvergenceSample,
} from "./computational-physics.models"
import {
  buildOrbitalDriftThresholdEstimates,
  buildObservedOrderEstimates,
  buildOrbitalObservedOrderEstimates,
  buildSolverRecommendationCandidates,
  buildSolverRecommendationSummary,
  buildSpringObservedOrderEstimates,
  buildSpringDriftThresholdEstimates,
  buildStabilityThresholdEstimates,
} from "./computational-physics-analytics"

export function buildConvergenceCsv(
  scenario: ComputationalPhysicsScenario,
  samples: readonly SolverConvergenceSample[],
): string {
  const observedOrders = buildObservedOrderEstimates(samples)
  const stabilityThresholds = buildStabilityThresholdEstimates(scenario, samples)
  const orbitalThresholds = buildOrbitalDriftThresholdEstimates(scenario, samples)
  const springThresholds = buildSpringDriftThresholdEstimates(scenario, samples)
  const orbitalEnergyObservedOrders = buildOrbitalObservedOrderEstimates(samples, "energy")
  const orbitalMomentumObservedOrders = buildOrbitalObservedOrderEstimates(
    samples,
    "angularMomentum",
  )
  const springEnergyObservedOrders = buildSpringObservedOrderEstimates(samples, "energy")
  const springPhaseObservedOrders = buildSpringObservedOrderEstimates(samples, "phase")
  const observedOrderByFineStep = new Map(
    observedOrders.map((estimate) => [estimate.fineStepSeconds, estimate]),
  )
  const orbitalEnergyObservedOrderByFineStep = new Map(
    orbitalEnergyObservedOrders.map((estimate) => [estimate.fineStepSeconds, estimate]),
  )
  const orbitalMomentumObservedOrderByFineStep = new Map(
    orbitalMomentumObservedOrders.map((estimate) => [estimate.fineStepSeconds, estimate]),
  )
  const springEnergyObservedOrderByFineStep = new Map(
    springEnergyObservedOrders.map((estimate) => [estimate.fineStepSeconds, estimate]),
  )
  const springPhaseObservedOrderByFineStep = new Map(
    springPhaseObservedOrders.map((estimate) => [estimate.fineStepSeconds, estimate]),
  )
  const thresholdByMethod = new Map(
    stabilityThresholds.map((estimate) => [estimate.solverMethod, estimate]),
  )
  const springThresholdByKey = new Map(
    springThresholds.map((estimate) => [`${estimate.metric}:${estimate.solverMethod}`, estimate]),
  )
  const orbitalThresholdByKey = new Map(
    orbitalThresholds.map((estimate) => [`${estimate.metric}:${estimate.solverMethod}`, estimate]),
  )
  const solverRecommendation = buildSolverRecommendationSummary(
    scenario,
    stabilityThresholds,
    orbitalThresholds,
    springThresholds,
  )
  const recommendedStepSeconds = solverRecommendation?.recommendedStepSeconds ?? null
  const positionTolerance = thresholdByMethod.get("euler")?.tolerance ?? null
  const orbitalEnergyTolerance = orbitalThresholdByKey.get("energy:euler")?.tolerance ?? null
  const orbitalAngularMomentumTolerance =
    orbitalThresholdByKey.get("angularMomentum:euler")?.tolerance ?? null
  const springEnergyTolerance = springThresholdByKey.get("energy:euler")?.tolerance ?? null
  const springPhaseTolerance = springThresholdByKey.get("phase:euler")?.tolerance ?? null
  const solverRanking = buildSolverRecommendationCandidates(
    scenario,
    stabilityThresholds,
    orbitalThresholds,
    springThresholds,
  )
  const rows = [
    "comparison_step_seconds,euler_final_position_error,symplectic_final_position_error,rk4_final_position_error,euler_observed_order,symplectic_observed_order,rk4_observed_order,euler_within_tolerance,symplectic_within_tolerance,rk4_within_tolerance,tolerance_position_error,euler_final_specific_energy_error,symplectic_final_specific_energy_error,rk4_final_specific_energy_error,euler_energy_within_tolerance,symplectic_energy_within_tolerance,rk4_energy_within_tolerance,tolerance_specific_energy_error,euler_energy_observed_order,symplectic_energy_observed_order,rk4_energy_observed_order,euler_final_angular_momentum_error,symplectic_final_angular_momentum_error,rk4_final_angular_momentum_error,euler_angular_momentum_within_tolerance,symplectic_angular_momentum_within_tolerance,rk4_angular_momentum_within_tolerance,tolerance_angular_momentum_error,euler_angular_momentum_observed_order,symplectic_angular_momentum_observed_order,rk4_angular_momentum_observed_order,euler_final_spring_energy_error,symplectic_final_spring_energy_error,rk4_final_spring_energy_error,euler_spring_energy_within_tolerance,symplectic_spring_energy_within_tolerance,rk4_spring_energy_within_tolerance,tolerance_spring_energy_error,euler_spring_energy_observed_order,symplectic_spring_energy_observed_order,rk4_spring_energy_observed_order,euler_final_spring_phase_error,symplectic_final_spring_phase_error,rk4_final_spring_phase_error,euler_spring_phase_within_tolerance,symplectic_spring_phase_within_tolerance,rk4_spring_phase_within_tolerance,tolerance_spring_phase_error,euler_spring_phase_observed_order,symplectic_spring_phase_observed_order,rk4_spring_phase_observed_order,guide_position_tolerance,guide_position_recommended_step,guide_orbital_energy_tolerance,guide_orbital_angular_momentum_tolerance,guide_orbital_recommended_step,guide_spring_energy_tolerance,guide_spring_phase_tolerance,guide_spring_recommended_step,recommended_solver_method,recommended_solver_step_seconds,recommendation_reason,rank_1_solver_method,rank_1_step_seconds,rank_1_limiting_metric,rank_1_eligible,rank_1_reason,rank_2_solver_method,rank_2_step_seconds,rank_2_limiting_metric,rank_2_eligible,rank_2_reason,rank_3_solver_method,rank_3_step_seconds,rank_3_limiting_metric,rank_3_eligible,rank_3_reason",
    ...samples.map((sample) => {
      const estimate = observedOrderByFineStep.get(sample.stepSeconds)
      const orbitalEnergyEstimate = orbitalEnergyObservedOrderByFineStep.get(sample.stepSeconds)
      const orbitalMomentumEstimate = orbitalMomentumObservedOrderByFineStep.get(sample.stepSeconds)
      const springEnergyEstimate = springEnergyObservedOrderByFineStep.get(sample.stepSeconds)
      const springPhaseEstimate = springPhaseObservedOrderByFineStep.get(sample.stepSeconds)
      return [
        sample.stepSeconds.toFixed(6),
        sample.eulerFinalPositionError.toFixed(6),
        sample.symplecticFinalPositionError.toFixed(6),
        sample.rk4FinalPositionError.toFixed(6),
        formatObservedOrder(estimate?.eulerOrder ?? null),
        formatObservedOrder(estimate?.symplecticOrder ?? null),
        formatObservedOrder(estimate?.rk4Order ?? null),
        formatThresholdMatch(
          sample.stepSeconds,
          thresholdByMethod.get("euler")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          thresholdByMethod.get("symplectic")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          thresholdByMethod.get("rk4")?.recommendedStepSeconds,
        ),
        (thresholdByMethod.get("euler")?.tolerance ?? 0).toFixed(6),
        formatOptional(sample.eulerFinalSpecificEnergyError),
        formatOptional(sample.symplecticFinalSpecificEnergyError),
        formatOptional(sample.rk4FinalSpecificEnergyError),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("energy:euler")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("energy:symplectic")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("energy:rk4")?.recommendedStepSeconds,
        ),
        formatOptional(orbitalThresholdByKey.get("energy:euler")?.tolerance),
        formatObservedOrder(orbitalEnergyEstimate?.eulerOrder ?? null),
        formatObservedOrder(orbitalEnergyEstimate?.symplecticOrder ?? null),
        formatObservedOrder(orbitalEnergyEstimate?.rk4Order ?? null),
        formatOptional(sample.eulerFinalAngularMomentumError),
        formatOptional(sample.symplecticFinalAngularMomentumError),
        formatOptional(sample.rk4FinalAngularMomentumError),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("angularMomentum:euler")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("angularMomentum:symplectic")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          orbitalThresholdByKey.get("angularMomentum:rk4")?.recommendedStepSeconds,
        ),
        formatOptional(orbitalThresholdByKey.get("angularMomentum:euler")?.tolerance),
        formatObservedOrder(orbitalMomentumEstimate?.eulerOrder ?? null),
        formatObservedOrder(orbitalMomentumEstimate?.symplecticOrder ?? null),
        formatObservedOrder(orbitalMomentumEstimate?.rk4Order ?? null),
        formatOptional(sample.eulerFinalSpringEnergyError),
        formatOptional(sample.symplecticFinalSpringEnergyError),
        formatOptional(sample.rk4FinalSpringEnergyError),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("energy:euler")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("energy:symplectic")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("energy:rk4")?.recommendedStepSeconds,
        ),
        formatOptional(springThresholdByKey.get("energy:euler")?.tolerance),
        formatObservedOrder(springEnergyEstimate?.eulerOrder ?? null),
        formatObservedOrder(springEnergyEstimate?.symplecticOrder ?? null),
        formatObservedOrder(springEnergyEstimate?.rk4Order ?? null),
        formatOptional(sample.eulerFinalSpringPhaseError),
        formatOptional(sample.symplecticFinalSpringPhaseError),
        formatOptional(sample.rk4FinalSpringPhaseError),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("phase:euler")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("phase:symplectic")?.recommendedStepSeconds,
        ),
        formatThresholdMatch(
          sample.stepSeconds,
          springThresholdByKey.get("phase:rk4")?.recommendedStepSeconds,
        ),
        formatOptional(springThresholdByKey.get("phase:euler")?.tolerance),
        formatObservedOrder(springPhaseEstimate?.eulerOrder ?? null),
        formatObservedOrder(springPhaseEstimate?.symplecticOrder ?? null),
        formatObservedOrder(springPhaseEstimate?.rk4Order ?? null),
        formatOptional(positionTolerance),
        formatOptional(recommendedStepSeconds),
        formatOptional(orbitalEnergyTolerance),
        formatOptional(orbitalAngularMomentumTolerance),
        formatOptional(recommendedStepSeconds),
        formatOptional(springEnergyTolerance),
        formatOptional(springPhaseTolerance),
        formatOptional(recommendedStepSeconds),
        solverRecommendation?.solverMethod ?? "",
        formatOptional(solverRecommendation?.recommendedStepSeconds),
        formatCsvText(solverRecommendation?.reason ?? ""),
        ...solverRanking.flatMap((candidate) => [
          candidate.solverMethod,
          formatOptional(candidate.recommendedStepSeconds),
          formatCsvText(candidate.limitingMetric),
          candidate.eligible ? "true" : "false",
          formatCsvText(candidate.reason),
        ]),
      ].join(",")
    }),
  ]

  return rows.join("\n")
}

export function buildInvariantHistoryCsv(
  samples: readonly OrbitalInvariantHistorySample[],
): string {
  const rows = [
    "time_seconds,euler_specific_energy_error,symplectic_specific_energy_error,rk4_specific_energy_error,euler_angular_momentum_error,symplectic_angular_momentum_error,rk4_angular_momentum_error",
    ...samples.map((sample) =>
      [
        sample.timeSeconds.toFixed(6),
        sample.eulerSpecificEnergyError.toFixed(6),
        sample.symplecticSpecificEnergyError.toFixed(6),
        sample.rk4SpecificEnergyError.toFixed(6),
        sample.eulerAngularMomentumError.toFixed(6),
        sample.symplecticAngularMomentumError.toFixed(6),
        sample.rk4AngularMomentumError.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

export function buildSpringInvariantHistoryCsv(
  samples: readonly SpringInvariantHistorySample[],
): string {
  const rows = [
    "time_seconds,euler_total_energy_error,symplectic_total_energy_error,rk4_total_energy_error,euler_amplitude_error,symplectic_amplitude_error,rk4_amplitude_error,euler_phase_error,symplectic_phase_error,rk4_phase_error",
    ...samples.map((sample) =>
      [
        sample.timeSeconds.toFixed(6),
        sample.eulerTotalEnergyError.toFixed(6),
        sample.symplecticTotalEnergyError.toFixed(6),
        sample.rk4TotalEnergyError.toFixed(6),
        sample.eulerDisplacementMagnitudeError.toFixed(6),
        sample.symplecticDisplacementMagnitudeError.toFixed(6),
        sample.rk4DisplacementMagnitudeError.toFixed(6),
        sample.eulerPhaseAngleError.toFixed(6),
        sample.symplecticPhaseAngleError.toFixed(6),
        sample.rk4PhaseAngleError.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function formatObservedOrder(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "" : value.toFixed(6)
}

function formatThresholdMatch(
  stepSeconds: number,
  recommendedStepSeconds: number | null | undefined,
): string {
  if (recommendedStepSeconds === null || recommendedStepSeconds === undefined) {
    return "false"
  }

  return Math.abs(stepSeconds - recommendedStepSeconds) < 1e-9 ? "true" : "false"
}

function formatOptional(value: number | null | undefined): string {
  return value === null || value === undefined || !Number.isFinite(value) ? "" : value.toFixed(6)
}

function formatCsvText(value: string): string {
  return value.includes(",") ? `"${value.replaceAll('"', '""')}"` : value
}

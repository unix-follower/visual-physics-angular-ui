import {
  buildConvergenceCsv,
  buildInvariantHistoryCsv,
  buildSpringInvariantHistoryCsv,
} from "./computational-physics-report"

describe("ComputationalPhysicsReport", () => {
  it("builds convergence CSV rows", () => {
    const csv = buildConvergenceCsv(
      {
        id: "projectile-solver-comparison",
        name: "Projectile",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "",
        mass: 1,
        initialPosition: { x: 0, y: 0 },
        initialVelocity: { x: 1, y: 1 },
        gravity: { x: 0, y: -9.81 },
        dragCoefficient: 0,
        comparisonStepSeconds: 0.2,
        referenceStepSeconds: 0.01,
      },
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 1.5,
          symplecticFinalPositionError: 0.8,
          rk4FinalPositionError: 0.1,
          eulerFinalSpecificEnergyError: undefined,
          symplecticFinalSpecificEnergyError: undefined,
          rk4FinalSpecificEnergyError: undefined,
          eulerFinalAngularMomentumError: undefined,
          symplecticFinalAngularMomentumError: undefined,
          rk4FinalAngularMomentumError: undefined,
          eulerFinalSpringEnergyError: undefined,
          symplecticFinalSpringEnergyError: undefined,
          rk4FinalSpringEnergyError: undefined,
          eulerFinalSpringPhaseError: undefined,
          symplecticFinalSpringPhaseError: undefined,
          rk4FinalSpringPhaseError: undefined,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.75,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.00625,
          eulerFinalSpecificEnergyError: undefined,
          symplecticFinalSpecificEnergyError: undefined,
          rk4FinalSpecificEnergyError: undefined,
          eulerFinalAngularMomentumError: undefined,
          symplecticFinalAngularMomentumError: undefined,
          rk4FinalAngularMomentumError: undefined,
          eulerFinalSpringEnergyError: undefined,
          symplecticFinalSpringEnergyError: undefined,
          rk4FinalSpringEnergyError: undefined,
          eulerFinalSpringPhaseError: undefined,
          symplecticFinalSpringPhaseError: undefined,
          rk4FinalSpringPhaseError: undefined,
        },
      ],
    )

    expect(csv).toContain("comparison_step_seconds")
    expect(csv).toContain("0.200000,1.500000,0.800000,0.100000,,,")
    expect(csv).toContain("0.100000,0.750000,0.200000,0.006250,1.000000,2.000000,4.000000")
    expect(csv).toContain("0.200000,1.500000,0.800000,0.100000,,,,false,false,true,0.282843")
    expect(csv).toContain(
      "0.100000,0.750000,0.200000,0.006250,1.000000,2.000000,4.000000,false,true,false,0.282843",
    )
    expect(csv).toContain("tolerance_angular_momentum_error")
    expect(csv).toContain("tolerance_spring_phase_error")
    expect(csv).toContain(
      "euler_energy_observed_order,symplectic_energy_observed_order,rk4_energy_observed_order",
    )
    expect(csv).toContain(
      "euler_spring_phase_observed_order,symplectic_spring_phase_observed_order,rk4_spring_phase_observed_order",
    )
    expect(csv).toContain("guide_position_tolerance,guide_position_recommended_step")
    expect(csv).toContain(
      "guide_orbital_energy_tolerance,guide_orbital_angular_momentum_tolerance,guide_orbital_recommended_step",
    )
    expect(csv).toContain(
      "guide_spring_energy_tolerance,guide_spring_phase_tolerance,guide_spring_recommended_step",
    )
    expect(csv).toContain(
      "recommended_solver_method,recommended_solver_step_seconds,recommendation_reason",
    )
    expect(csv).toContain(
      "rank_1_solver_method,rank_1_step_seconds,rank_1_limiting_metric,rank_1_eligible,rank_1_reason",
    )
    expect(csv).toContain("rk4,0.200000,position is the limiting tolerance.")
    expect(csv).toContain(
      "0.282843,0.200000,,,0.200000,,,0.200000,rk4,0.200000,position is the limiting tolerance.",
    )
    expect(csv).toContain(
      "rk4,0.200000,position,true,position is the limiting tolerance.,symplectic,0.100000,position,true,position is the limiting tolerance.,euler,,position,false,position never meets the sampled tolerance band.",
    )
  })

  it("builds invariant-history CSV rows", () => {
    const csv = buildInvariantHistoryCsv([
      {
        timeSeconds: 1.5,
        eulerSpecificEnergyError: 0.2,
        symplecticSpecificEnergyError: 0.03,
        rk4SpecificEnergyError: 0.01,
        eulerAngularMomentumError: 0.12,
        symplecticAngularMomentumError: 0.02,
        rk4AngularMomentumError: 0.005,
      },
    ])

    expect(csv).toContain("time_seconds")
    expect(csv).toContain("1.500000,0.200000,0.030000,0.010000,0.120000,0.020000,0.005000")
  })

  it("builds spring invariant-history CSV rows", () => {
    const csv = buildSpringInvariantHistoryCsv([
      {
        timeSeconds: 1.5,
        eulerTotalEnergyError: 0.2,
        symplecticTotalEnergyError: 0.03,
        rk4TotalEnergyError: 0.01,
        eulerDisplacementMagnitudeError: 0.12,
        symplecticDisplacementMagnitudeError: 0.02,
        rk4DisplacementMagnitudeError: 0.005,
        eulerPhaseAngleError: 0.2,
        symplecticPhaseAngleError: 0.05,
        rk4PhaseAngleError: 0.01,
      },
    ])

    expect(csv).toContain("time_seconds")
    expect(csv).toContain(
      "1.500000,0.200000,0.030000,0.010000,0.120000,0.020000,0.005000,0.200000,0.050000,0.010000",
    )
  })
})

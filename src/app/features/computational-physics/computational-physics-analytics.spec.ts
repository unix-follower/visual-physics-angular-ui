import {
  buildInsightCards,
  buildConvergencePlot,
  buildInvariantHistoryPlot,
  buildObservedOrderEstimates,
  buildOrbitalObservedOrderEstimates,
  buildOrbitalConvergencePlot,
  buildOrbitalDriftThresholdEstimates,
  buildSolverRecommendationCandidates,
  buildSolverRecommendationSummary,
  buildSpringObservedOrderEstimates,
  buildSpringConvergencePlot,
  buildSpringDriftThresholdEstimates,
  buildSpringInvariantHistoryPlot,
  buildStabilityThresholdEstimates,
} from "./computational-physics-analytics"

describe("ComputationalPhysicsAnalytics", () => {
  it("builds deterministic convergence plot paths and labels", () => {
    const plot = buildConvergencePlot([
      {
        stepSeconds: 0.2,
        eulerFinalPositionError: 1.4,
        symplecticFinalPositionError: 0.9,
        rk4FinalPositionError: 0.2,
      },
      {
        stepSeconds: 0.1,
        eulerFinalPositionError: 0.8,
        symplecticFinalPositionError: 0.4,
        rk4FinalPositionError: 0.08,
      },
    ])

    expect(plot.series).toHaveLength(3)
    expect(plot.guideLines).toHaveLength(0)
    expect(plot.series[0].path).toContain("M 0.00")
    expect(plot.xStartLabel).toBe("Δt 0.100")
    expect(plot.xEndLabel).toBe("Δt 0.200")
  })

  it("builds tolerance guide lines for convergence plots", () => {
    const plot = buildConvergencePlot(
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 1.4,
          symplecticFinalPositionError: 0.9,
          rk4FinalPositionError: 0.2,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.8,
          symplecticFinalPositionError: 0.4,
          rk4FinalPositionError: 0.08,
        },
      ],
      0.5,
      0.1,
    )

    expect(plot.guideLines).toHaveLength(2)
    expect(plot.guideLines[0].label).toBe("Position tolerance")
    expect(plot.guideLines[1].label).toBe("Best recommended Δt")
    expect(plot.guideLines[1].path).toContain("M 0.00")
    expect(plot.guideLines[0].path).toContain("L 320.00")
  })

  it("builds orbital convergence plot paths for invariant drift metrics", () => {
    const plot = buildOrbitalConvergencePlot(
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpecificEnergyError: 0.4,
          symplecticFinalSpecificEnergyError: 0.03,
          rk4FinalSpecificEnergyError: 0.01,
          eulerFinalAngularMomentumError: 0.3,
          symplecticFinalAngularMomentumError: 0.02,
          rk4FinalAngularMomentumError: 0.01,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpecificEnergyError: 0.2,
          symplecticFinalSpecificEnergyError: 0.01,
          rk4FinalSpecificEnergyError: 0.005,
          eulerFinalAngularMomentumError: 0.16,
          symplecticFinalAngularMomentumError: 0.01,
          rk4FinalAngularMomentumError: 0.005,
        },
      ],
      "energy",
      0.05,
    )

    expect(plot.series).toHaveLength(3)
    expect(plot.guideLines[0].label).toBe("Orbital energy tolerance")
    expect(plot.series[0].path).toContain("M 0.00")
    expect(plot.yMaxLabel).toBe("0.4000")
  })

  it("builds spring convergence plot paths for oscillation drift metrics", () => {
    const plot = buildSpringConvergencePlot(
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpringEnergyError: 1.2,
          symplecticFinalSpringEnergyError: 0.3,
          rk4FinalSpringEnergyError: 0.08,
          eulerFinalSpringPhaseError: 0.4,
          symplecticFinalSpringPhaseError: 0.12,
          rk4FinalSpringPhaseError: 0.04,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpringEnergyError: 0.4,
          symplecticFinalSpringEnergyError: 0.08,
          rk4FinalSpringEnergyError: 0.02,
          eulerFinalSpringPhaseError: 0.2,
          symplecticFinalSpringPhaseError: 0.06,
          rk4FinalSpringPhaseError: 0.02,
        },
      ],
      "phase",
      0.15,
    )

    expect(plot.series).toHaveLength(3)
    expect(plot.guideLines[0].label).toBe("Spring phase tolerance")
    expect(plot.xStartLabel).toBe("Δt 0.100")
    expect(plot.yMaxLabel).toBe("0.4000")
  })

  it("builds orbital observed-order estimates from invariant-drift convergence samples", () => {
    const estimates = buildOrbitalObservedOrderEstimates(
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpecificEnergyError: 0.4,
          symplecticFinalSpecificEnergyError: 0.16,
          rk4FinalSpecificEnergyError: 0.0128,
          eulerFinalAngularMomentumError: 0.3,
          symplecticFinalAngularMomentumError: 0.12,
          rk4FinalAngularMomentumError: 0.0096,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpecificEnergyError: 0.2,
          symplecticFinalSpecificEnergyError: 0.04,
          rk4FinalSpecificEnergyError: 0.0008,
          eulerFinalAngularMomentumError: 0.15,
          symplecticFinalAngularMomentumError: 0.03,
          rk4FinalAngularMomentumError: 0.0006,
        },
      ],
      "energy",
    )

    expect(estimates).toHaveLength(1)
    expect(estimates[0].eulerOrder).toBeCloseTo(1, 6)
    expect(estimates[0].symplecticOrder).toBeCloseTo(2, 6)
    expect(estimates[0].rk4Order).toBeCloseTo(4, 6)
  })

  it("builds spring observed-order estimates from oscillation-drift convergence samples", () => {
    const estimates = buildSpringObservedOrderEstimates(
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpringEnergyError: 0.4,
          symplecticFinalSpringEnergyError: 0.16,
          rk4FinalSpringEnergyError: 0.0128,
          eulerFinalSpringPhaseError: 0.3,
          symplecticFinalSpringPhaseError: 0.12,
          rk4FinalSpringPhaseError: 0.0096,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpringEnergyError: 0.2,
          symplecticFinalSpringEnergyError: 0.04,
          rk4FinalSpringEnergyError: 0.0008,
          eulerFinalSpringPhaseError: 0.15,
          symplecticFinalSpringPhaseError: 0.03,
          rk4FinalSpringPhaseError: 0.0006,
        },
      ],
      "phase",
    )

    expect(estimates).toHaveLength(1)
    expect(estimates[0].eulerOrder).toBeCloseTo(1, 6)
    expect(estimates[0].symplecticOrder).toBeCloseTo(2, 6)
    expect(estimates[0].rk4Order).toBeCloseTo(4, 6)
  })

  it("builds invariant history plot paths for orbital drift metrics", () => {
    const plot = buildInvariantHistoryPlot(
      [
        {
          timeSeconds: 0,
          eulerSpecificEnergyError: 0,
          symplecticSpecificEnergyError: 0,
          rk4SpecificEnergyError: 0,
          eulerAngularMomentumError: 0,
          symplecticAngularMomentumError: 0,
          rk4AngularMomentumError: 0,
        },
        {
          timeSeconds: 2,
          eulerSpecificEnergyError: 0.4,
          symplecticSpecificEnergyError: 0.1,
          rk4SpecificEnergyError: 0.02,
          eulerAngularMomentumError: 0.3,
          symplecticAngularMomentumError: 0.08,
          rk4AngularMomentumError: 0.01,
        },
      ],
      "angularMomentum",
    )

    expect(plot.series[2].label).toBe("RK4")
    expect(plot.series[2].path).toContain("L 320.00")
    expect(plot.xEndLabel).toBe("t 2.00")
  })

  it("builds observed order estimates from successive timestep refinements", () => {
    const estimates = buildObservedOrderEstimates([
      {
        stepSeconds: 0.2,
        eulerFinalPositionError: 0.8,
        symplecticFinalPositionError: 0.4,
        rk4FinalPositionError: 0.02,
      },
      {
        stepSeconds: 0.1,
        eulerFinalPositionError: 0.4,
        symplecticFinalPositionError: 0.1,
        rk4FinalPositionError: 0.00125,
      },
    ])

    expect(estimates).toHaveLength(1)
    expect(estimates[0].eulerOrder).toBeCloseTo(1, 6)
    expect(estimates[0].symplecticOrder).toBeCloseTo(2, 6)
    expect(estimates[0].rk4Order).toBeCloseTo(4, 6)
  })

  it("builds timestep recommendations from convergence tolerance", () => {
    const estimates = buildStabilityThresholdEstimates(
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
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
        },
      ],
    )

    expect(estimates[0].recommendedStepSeconds).toBe(0.1)
    expect(estimates[1].recommendedStepSeconds).toBe(0.2)
    expect(estimates[2].recommendedStepSeconds).toBe(0.2)
  })

  it("builds orbital convergence thresholds for energy and angular momentum drift", () => {
    const estimates = buildOrbitalDriftThresholdEstimates(
      {
        id: "orbital-solver-comparison",
        name: "Orbital",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 16,
        viewBounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
        focusArea: "",
        mass: 1,
        initialPosition: { x: 5, y: 0 },
        initialVelocity: { x: 0, y: 2 },
        orbitalCenter: { x: 0, y: 0 },
        gravitationalParameter: 20,
        comparisonStepSeconds: 0.2,
        referenceStepSeconds: 0.01,
      },
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpecificEnergyError: 0.4,
          symplecticFinalSpecificEnergyError: 0.03,
          rk4FinalSpecificEnergyError: 0.01,
          eulerFinalAngularMomentumError: 0.3,
          symplecticFinalAngularMomentumError: 0.02,
          rk4FinalAngularMomentumError: 0.01,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpecificEnergyError: 0.2,
          symplecticFinalSpecificEnergyError: 0.01,
          rk4FinalSpecificEnergyError: 0.005,
          eulerFinalAngularMomentumError: 0.16,
          symplecticFinalAngularMomentumError: 0.01,
          rk4FinalAngularMomentumError: 0.005,
        },
      ],
    )

    expect(
      estimates.some(
        (estimate) =>
          estimate.metric === "energy" &&
          estimate.solverMethod === "symplectic" &&
          estimate.recommendedStepSeconds === 0.2,
      ),
    ).toBe(true)
    expect(
      estimates.some(
        (estimate) =>
          estimate.metric === "angularMomentum" &&
          estimate.solverMethod === "rk4" &&
          estimate.recommendedStepSeconds === 0.2,
      ),
    ).toBe(true)
  })

  it("builds a solver recommendation summary from scenario-specific thresholds", () => {
    const summary = buildSolverRecommendationSummary(
      {
        id: "spring-oscillator-comparison",
        name: "Spring",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: -3.5, maxX: 3.5, minY: -3.5, maxY: 3.5 },
        focusArea: "",
        mass: 1,
        initialPosition: { x: 2.4, y: 0 },
        initialVelocity: { x: 0, y: 2.6 },
        springAnchor: { x: 0, y: 0 },
        springConstant: 4.2,
        dampingCoefficient: 0.08,
        comparisonStepSeconds: 0.2,
        referenceStepSeconds: 0.01,
      },
      [
        {
          solverMethod: "euler",
          tolerance: 0.2,
          recommendedStepSeconds: 0.1,
          finalPositionError: 0.12,
        },
        {
          solverMethod: "symplectic",
          tolerance: 0.2,
          recommendedStepSeconds: 0.2,
          finalPositionError: 0.08,
        },
        {
          solverMethod: "rk4",
          tolerance: 0.2,
          recommendedStepSeconds: 0.2,
          finalPositionError: 0.02,
        },
      ],
      [],
      [
        {
          metric: "energy",
          solverMethod: "euler",
          tolerance: 0.5,
          recommendedStepSeconds: 0.1,
          finalError: 0.4,
        },
        {
          metric: "energy",
          solverMethod: "symplectic",
          tolerance: 0.5,
          recommendedStepSeconds: 0.2,
          finalError: 0.2,
        },
        {
          metric: "energy",
          solverMethod: "rk4",
          tolerance: 0.5,
          recommendedStepSeconds: 0.2,
          finalError: 0.05,
        },
        {
          metric: "phase",
          solverMethod: "euler",
          tolerance: 0.15,
          recommendedStepSeconds: 0.1,
          finalError: 0.14,
        },
        {
          metric: "phase",
          solverMethod: "symplectic",
          tolerance: 0.15,
          recommendedStepSeconds: 0.1,
          finalError: 0.1,
        },
        {
          metric: "phase",
          solverMethod: "rk4",
          tolerance: 0.15,
          recommendedStepSeconds: 0.2,
          finalError: 0.03,
        },
      ],
    )

    expect(summary?.solverMethod).toBe("rk4")
    expect(summary?.recommendedStepSeconds).toBeCloseTo(0.2, 6)
    expect(summary?.reason).toContain("limiting tolerance")
  })

  it("builds a per-solver recommendation ranking with blocking metrics", () => {
    const ranking = buildSolverRecommendationCandidates(
      {
        id: "orbital-solver-comparison",
        name: "Orbital",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 16,
        viewBounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
        focusArea: "",
        mass: 1,
        initialPosition: { x: 5, y: 0 },
        initialVelocity: { x: 0, y: 2 },
        orbitalCenter: { x: 0, y: 0 },
        gravitationalParameter: 20,
        comparisonStepSeconds: 0.2,
        referenceStepSeconds: 0.01,
      },
      [
        {
          solverMethod: "euler",
          tolerance: 0.45,
          recommendedStepSeconds: 0.1,
          finalPositionError: 0.2,
        },
        {
          solverMethod: "symplectic",
          tolerance: 0.45,
          recommendedStepSeconds: 0.2,
          finalPositionError: 0.08,
        },
        {
          solverMethod: "rk4",
          tolerance: 0.45,
          recommendedStepSeconds: 0.2,
          finalPositionError: 0.02,
        },
      ],
      [
        {
          metric: "energy",
          solverMethod: "euler",
          tolerance: 0.05,
          recommendedStepSeconds: null,
          finalError: null,
        },
        {
          metric: "energy",
          solverMethod: "symplectic",
          tolerance: 0.05,
          recommendedStepSeconds: 0.2,
          finalError: 0.03,
        },
        {
          metric: "energy",
          solverMethod: "rk4",
          tolerance: 0.05,
          recommendedStepSeconds: 0.2,
          finalError: 0.01,
        },
        {
          metric: "angularMomentum",
          solverMethod: "euler",
          tolerance: 0.05,
          recommendedStepSeconds: 0.1,
          finalError: 0.04,
        },
        {
          metric: "angularMomentum",
          solverMethod: "symplectic",
          tolerance: 0.05,
          recommendedStepSeconds: 0.1,
          finalError: 0.02,
        },
        {
          metric: "angularMomentum",
          solverMethod: "rk4",
          tolerance: 0.05,
          recommendedStepSeconds: 0.2,
          finalError: 0.005,
        },
      ],
      [],
    )

    expect(ranking[0].solverMethod).toBe("rk4")
    expect(ranking[0].limitingMetric).toBe("position")
    expect(ranking[1].solverMethod).toBe("symplectic")
    expect(ranking[1].recommendedStepSeconds).toBeCloseTo(0.1, 6)
    expect(ranking[2].solverMethod).toBe("euler")
    expect(ranking[2].eligible).toBe(false)
    expect(ranking[2].reason).toContain("never meets the sampled tolerance band")
  })

  it("builds spring convergence thresholds for energy and phase drift", () => {
    const estimates = buildSpringDriftThresholdEstimates(
      {
        id: "spring-oscillator-comparison",
        name: "Spring",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: -3.5, maxX: 3.5, minY: -3.5, maxY: 3.5 },
        focusArea: "",
        mass: 1,
        initialPosition: { x: 2.4, y: 0 },
        initialVelocity: { x: 0, y: 2.6 },
        springAnchor: { x: 0, y: 0 },
        springConstant: 4.2,
        dampingCoefficient: 0.08,
        comparisonStepSeconds: 0.2,
        referenceStepSeconds: 0.01,
      },
      [
        {
          stepSeconds: 0.2,
          eulerFinalPositionError: 0.5,
          symplecticFinalPositionError: 0.2,
          rk4FinalPositionError: 0.05,
          eulerFinalSpringEnergyError: 1.2,
          symplecticFinalSpringEnergyError: 0.3,
          rk4FinalSpringEnergyError: 0.08,
          eulerFinalSpringPhaseError: 0.4,
          symplecticFinalSpringPhaseError: 0.12,
          rk4FinalSpringPhaseError: 0.04,
        },
        {
          stepSeconds: 0.1,
          eulerFinalPositionError: 0.2,
          symplecticFinalPositionError: 0.08,
          rk4FinalPositionError: 0.01,
          eulerFinalSpringEnergyError: 0.4,
          symplecticFinalSpringEnergyError: 0.08,
          rk4FinalSpringEnergyError: 0.02,
          eulerFinalSpringPhaseError: 0.2,
          symplecticFinalSpringPhaseError: 0.06,
          rk4FinalSpringPhaseError: 0.02,
        },
      ],
    )

    expect(
      estimates.some(
        (estimate) =>
          estimate.metric === "energy" &&
          estimate.solverMethod === "symplectic" &&
          estimate.recommendedStepSeconds === 0.2,
      ),
    ).toBe(true)
    expect(
      estimates.some(
        (estimate) =>
          estimate.metric === "phase" &&
          estimate.solverMethod === "rk4" &&
          estimate.recommendedStepSeconds === 0.2,
      ),
    ).toBe(true)
  })

  it("builds spring insight cards when spring diagnostics are present", () => {
    const cards = buildInsightCards(
      {
        timeSeconds: 2,
        referencePosition: { x: 0, y: 0 },
        referenceVelocity: { x: 0, y: 0 },
        eulerPosition: { x: 0.1, y: 0 },
        eulerVelocity: { x: 0.2, y: 0 },
        symplecticPosition: { x: 0.05, y: 0 },
        symplecticVelocity: { x: 0.1, y: 0 },
        rk4Position: { x: 0.01, y: 0 },
        rk4Velocity: { x: 0.02, y: 0 },
        referenceSpeed: 0,
        eulerSpeed: 0.2,
        symplecticSpeed: 0.1,
        rk4Speed: 0.02,
        eulerPositionError: 0.1,
        symplecticPositionError: 0.05,
        rk4PositionError: 0.01,
        eulerSpeedError: 0.2,
        symplecticSpeedError: 0.1,
        rk4SpeedError: 0.02,
        springDiagnostics: {
          referenceTotalEnergy: 1,
          eulerTotalEnergy: 1.2,
          symplecticTotalEnergy: 1.05,
          rk4TotalEnergy: 1.01,
          eulerTotalEnergyError: 0.2,
          symplecticTotalEnergyError: 0.05,
          rk4TotalEnergyError: 0.01,
          referenceDisplacementMagnitude: 1,
          eulerDisplacementMagnitude: 1.1,
          symplecticDisplacementMagnitude: 1.02,
          rk4DisplacementMagnitude: 1.005,
          eulerDisplacementMagnitudeError: 0.1,
          symplecticDisplacementMagnitudeError: 0.02,
          rk4DisplacementMagnitudeError: 0.005,
          referencePhaseAngle: 0,
          eulerPhaseAngle: 0.2,
          symplecticPhaseAngle: 0.05,
          rk4PhaseAngle: 0.01,
          eulerPhaseAngleError: 0.2,
          symplecticPhaseAngleError: 0.05,
          rk4PhaseAngleError: 0.01,
        },
      },
      {
        euler: {
          solverMethod: "euler",
          finalPositionError: 0.1,
          finalSpeedError: 0.2,
          maxPathDeviation: 0.4,
        },
        symplectic: {
          solverMethod: "symplectic",
          finalPositionError: 0.05,
          finalSpeedError: 0.1,
          maxPathDeviation: 0.2,
        },
        rk4: {
          solverMethod: "rk4",
          finalPositionError: 0.01,
          finalSpeedError: 0.02,
          maxPathDeviation: 0.05,
        },
      },
      "symplectic",
      {
        solverMethod: "rk4",
        recommendedStepSeconds: 0.2,
        reason: "phase is the limiting tolerance.",
      },
    )

    expect(cards[0].title).toBe("Best stable solver")
    expect(cards[0].value).toContain("RK4")
    expect(cards.some((card) => card.title.includes("spring energy error"))).toBe(true)
    expect(cards.some((card) => card.title.includes("spring amplitude error"))).toBe(true)
    expect(cards.some((card) => card.title.includes("spring phase error"))).toBe(true)
  })

  it("builds spring invariant history plot paths for oscillator drift metrics", () => {
    const plot = buildSpringInvariantHistoryPlot(
      [
        {
          timeSeconds: 0,
          eulerTotalEnergyError: 0,
          symplecticTotalEnergyError: 0,
          rk4TotalEnergyError: 0,
          eulerDisplacementMagnitudeError: 0,
          symplecticDisplacementMagnitudeError: 0,
          rk4DisplacementMagnitudeError: 0,
          eulerPhaseAngleError: 0,
          symplecticPhaseAngleError: 0,
          rk4PhaseAngleError: 0,
        },
        {
          timeSeconds: 2,
          eulerTotalEnergyError: 0.4,
          symplecticTotalEnergyError: 0.1,
          rk4TotalEnergyError: 0.02,
          eulerDisplacementMagnitudeError: 0.3,
          symplecticDisplacementMagnitudeError: 0.08,
          rk4DisplacementMagnitudeError: 0.01,
          eulerPhaseAngleError: 0.2,
          symplecticPhaseAngleError: 0.05,
          rk4PhaseAngleError: 0.01,
        },
      ],
      "amplitude",
    )

    expect(plot.series[2].label).toBe("RK4")
    expect(plot.series[2].path).toContain("L 320.00")
    expect(plot.xEndLabel).toBe("t 2.00")
  })
})

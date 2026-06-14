import {
  buildSpringInvariantHistory,
  buildOrbitalInvariantHistory,
  buildConvergenceStudy,
  ComputationalPhysicsStateService,
} from "./computational-physics-state.service"

describe("ComputationalPhysicsStateService", () => {
  it("keeps RK4 closer to the reference than Euler at the default timestep", () => {
    const service = new ComputationalPhysicsStateService()

    service.updateTimeSeconds(4)
    const snapshot = service.currentState()

    expect(snapshot.rk4PositionError).toBeLessThan(snapshot.eulerPositionError)
    expect(snapshot.rk4SpeedError).toBeLessThan(snapshot.eulerSpeedError)
  })

  it("reduces solver error when the comparison timestep shrinks", () => {
    const service = new ComputationalPhysicsStateService()

    service.updateTimeSeconds(4)
    const baselineError = service.currentState().eulerPositionError

    service.updateScenarioField("comparisonStepSeconds", 0.05)
    service.updateTimeSeconds(4)
    const refinedError = service.currentState().eulerPositionError

    expect(refinedError).toBeLessThan(baselineError)
  })

  it("restores solver focus and time from imported state", () => {
    const service = new ComputationalPhysicsStateService()
    const scenario = {
      ...service.selectedScenario(),
      comparisonStepSeconds: 0.08,
    }

    service.importScenarioState(scenario, 1.75, "euler")

    expect(service.currentTimeSeconds()).toBeCloseTo(1.75, 6)
    expect(service.selectedSolverMethod()).toBe("euler")
    expect(service.selectedScenario().comparisonStepSeconds).toBeCloseTo(0.08, 6)
  })

  it("keeps RK4 closer to the reference than Euler for orbital comparison over long horizons", () => {
    const service = new ComputationalPhysicsStateService()

    service.selectScenario("orbital-solver-comparison")
    service.updateTimeSeconds(12)
    const snapshot = service.currentState()
    const diagnostics = snapshot.orbitalDiagnostics

    expect(snapshot.rk4PositionError).toBeLessThan(snapshot.eulerPositionError)
    expect(snapshot.symplecticPositionError).toBeLessThan(snapshot.eulerPositionError)
    expect(snapshot.rk4SpeedError).toBeLessThan(snapshot.eulerSpeedError)
    expect(diagnostics).toBeDefined()
    expect(diagnostics?.symplecticAngularMomentumError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      diagnostics?.eulerAngularMomentumError ?? 0,
    )
    expect(diagnostics?.rk4SpecificEnergyError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      diagnostics?.eulerSpecificEnergyError ?? 0,
    )
  })

  it("exposes symplectic solver metrics and selection state", () => {
    const service = new ComputationalPhysicsStateService()

    service.selectSolverMethod("symplectic")
    service.updateTimeSeconds(2)

    expect(service.selectedSolverMethod()).toBe("symplectic")
    expect(service.solverMetrics().symplectic.finalPositionError).toBeGreaterThanOrEqual(0)
  })

  it("builds a convergence study with non-increasing Euler error as the timestep shrinks", () => {
    const service = new ComputationalPhysicsStateService()
    const convergence = buildConvergenceStudy(service.selectedScenario())

    expect(convergence.length).toBeGreaterThan(2)
    expect(convergence[1].stepSeconds).toBeLessThan(convergence[0].stepSeconds)
    expect(convergence.at(-1)?.eulerFinalPositionError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      convergence[0].eulerFinalPositionError,
    )
  })

  it("builds orbital invariant history samples for the orbital scenario only", () => {
    const service = new ComputationalPhysicsStateService()

    expect(buildOrbitalInvariantHistory(service.selectedScenario(), 8)).toHaveLength(0)

    service.selectScenario("orbital-solver-comparison")
    const history = buildOrbitalInvariantHistory(service.selectedScenario(), 8)

    expect(history.length).toBe(8)
    expect(history[1].timeSeconds).toBeGreaterThan(history[0].timeSeconds)
    expect(history.at(-1)?.rk4AngularMomentumError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      history.at(-1)?.eulerAngularMomentumError ?? 0,
    )
  })

  it("supports a spring oscillator scenario with lower RK4 drift than Euler over repeated oscillations", () => {
    const service = new ComputationalPhysicsStateService()

    service.selectScenario("spring-oscillator-comparison")
    service.updateTimeSeconds(12)
    const snapshot = service.currentState()

    expect(service.selectedScenario().springConstant).toBeGreaterThan(0)
    expect(snapshot.springDiagnostics).toBeDefined()
    expect(snapshot.rk4PositionError).toBeLessThan(snapshot.eulerPositionError)
    expect(snapshot.symplecticPositionError).toBeLessThan(snapshot.eulerPositionError)
    expect(
      snapshot.springDiagnostics?.rk4TotalEnergyError ?? Number.POSITIVE_INFINITY,
    ).toBeLessThan(snapshot.springDiagnostics?.eulerTotalEnergyError ?? 0)
    expect(snapshot.springDiagnostics?.rk4PhaseAngleError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      snapshot.springDiagnostics?.eulerPhaseAngleError ?? 0,
    )
  })

  it("builds spring drift history samples for the spring scenario only", () => {
    const service = new ComputationalPhysicsStateService()

    expect(buildSpringInvariantHistory(service.selectedScenario(), 8)).toHaveLength(0)

    service.selectScenario("spring-oscillator-comparison")
    const history = buildSpringInvariantHistory(service.selectedScenario(), 8)

    expect(history.length).toBe(8)
    expect(history[1].timeSeconds).toBeGreaterThan(history[0].timeSeconds)
    expect(history.at(-1)?.rk4TotalEnergyError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      history.at(-1)?.eulerTotalEnergyError ?? 0,
    )
    expect(history.at(-1)?.rk4PhaseAngleError ?? Number.POSITIVE_INFINITY).toBeLessThan(
      history.at(-1)?.eulerPhaseAngleError ?? 0,
    )
  })
})

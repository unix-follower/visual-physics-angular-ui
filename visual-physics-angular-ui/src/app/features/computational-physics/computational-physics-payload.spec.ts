import { buildExportPayload, parseImportPayload } from "./computational-physics-payload"
import { ComputationalPhysicsStateService } from "./computational-physics-state.service"

describe("ComputationalPhysicsPayload", () => {
  it("round-trips the initial projectile comparison payload shape", () => {
    const service = new ComputationalPhysicsStateService()
    service.updateTimeSeconds(1.5)
    const payload = buildExportPayload(
      service.selectedScenario(),
      service.currentState(),
      {
        showReferenceTrajectory: true,
        showEulerTrajectory: true,
        showSymplecticTrajectory: true,
        showRk4Trajectory: true,
        showErrorBars: false,
      },
      service.sampledStates(),
      service.convergenceStudy(),
      service.orbitalInvariantHistory(),
      service.springInvariantHistory(),
      "symplectic",
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.solverMethod).toBe("symplectic")
    expect(parsed.snapshot.timeSeconds).toBeCloseTo(1.5, 6)
    expect(parsed.scenario.id).toBe("projectile-solver-comparison")
    expect(payload.convergenceSamples.length).toBeGreaterThan(2)
    expect(payload.orbitalInvariantHistory).toHaveLength(0)
    expect(payload.springInvariantHistory).toHaveLength(0)
    expect(payload.solverRecommendation?.solverMethod).toBe("rk4")
    expect(payload.solverRecommendation?.reason).toContain("limiting tolerance")
    expect(payload.solverRecommendationRanking).toHaveLength(3)
    expect(payload.solverRecommendationRanking[0].solverMethod).toBe("rk4")
    expect(payload.solverRecommendationRanking.every((candidate) => candidate.eligible)).toBe(true)
    expect(payload.observedOrders.position).toHaveLength(payload.convergenceSamples.length - 1)
    expect(payload.observedOrders.orbital.energy).toHaveLength(
      payload.convergenceSamples.length - 1,
    )
    expect(payload.observedOrders.spring.phase).toHaveLength(payload.convergenceSamples.length - 1)
    expect(payload.convergencePlotGuides.position.tolerance).toBeGreaterThan(0)
    expect(payload.convergencePlotGuides.position.recommendedStepSeconds).toBeCloseTo(0.2, 6)
    expect(payload.convergencePlotGuides.orbital.energyTolerance).toBeNull()
    expect(payload.convergencePlotGuides.spring.phaseTolerance).toBeNull()
    expect(parsed.overlays?.showSymplecticTrajectory).toBe(true)
    expect(parsed.overlays?.showErrorBars).toBe(false)
  })

  it("rejects malformed payloads", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: { id: "projectile-solver-comparison" },
          snapshot: { timeSeconds: "bad" },
        }),
      ),
    ).toThrowError("Invalid payload")
  })

  it("accepts orbital scenario payloads with orbital parameters", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        solverMethod: "symplectic",
        scenario: {
          id: "orbital-solver-comparison",
          name: "Orbital Solver Comparison",
          summary: "Compare orbital solvers.",
          equationSummary: 'x" = -μ r / |r|^3',
          status: "Phase 9 second slice",
          durationSeconds: 16,
          viewBounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
          focusArea: "Drift",
          mass: 1,
          initialPosition: { x: 5, y: 0 },
          initialVelocity: { x: 0, y: 2 },
          orbitalCenter: { x: 0, y: 0 },
          gravitationalParameter: 20,
          comparisonStepSeconds: 0.2,
          referenceStepSeconds: 0.01,
        },
        snapshot: { timeSeconds: 2 },
      }),
    )

    expect(imported.scenario.id).toBe("orbital-solver-comparison")
    expect(imported.solverMethod).toBe("symplectic")
    expect(imported.scenario.gravitationalParameter).toBe(20)
  })

  it("accepts spring oscillator payloads with spring parameters", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        solverMethod: "symplectic",
        scenario: {
          id: "spring-oscillator-comparison",
          name: "Spring Oscillator Comparison",
          summary: "Compare oscillator solvers.",
          equationSummary: 'x" = -(k / m) (x - x0) - (c / m) v',
          status: "Phase 9 oscillator slice",
          durationSeconds: 12,
          viewBounds: { minX: -3.5, maxX: 3.5, minY: -3.5, maxY: 3.5 },
          focusArea: "Oscillation stability",
          mass: 1,
          initialPosition: { x: 2.4, y: 0 },
          initialVelocity: { x: 0, y: 2.6 },
          springAnchor: { x: 0, y: 0 },
          springConstant: 4.2,
          dampingCoefficient: 0.08,
          comparisonStepSeconds: 0.2,
          referenceStepSeconds: 0.01,
        },
        snapshot: { timeSeconds: 3 },
      }),
    )

    expect(imported.scenario.id).toBe("spring-oscillator-comparison")
    expect(imported.solverMethod).toBe("symplectic")
    expect(imported.scenario.springConstant).toBe(4.2)
  })
})

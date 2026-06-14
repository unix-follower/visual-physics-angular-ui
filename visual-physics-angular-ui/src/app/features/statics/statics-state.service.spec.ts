import { StaticsStateService } from "./statics-state.service"

describe("StaticsStateService", () => {
  it("computes beam-support reactions from force and torque balance", () => {
    const service = new StaticsStateService()

    service.selectScenario("beam-support")
    service.updateScenarioField("anchorPoint.x", 1)
    service.updateScenarioField("secondaryPoint.x", 9)
    service.updateScenarioField("loadPosition", 5)
    service.updateScenarioField("loadMagnitude", 12)

    const snapshot = service.currentState()

    expect(snapshot.primaryReactionForce.y).toBeCloseTo(6, 6)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(6, 6)
    expect(snapshot.residualForce.y).toBeCloseTo(0, 6)
    expect(snapshot.residualTorque).toBeCloseTo(0, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("updates asymmetric beam-support reactions when the load shifts", () => {
    const service = new StaticsStateService()

    service.selectScenario("beam-support")
    service.updateScenarioField("loadPosition", 3)
    service.updateScenarioField("loadMagnitude", 16)

    const snapshot = service.currentState()

    expect(snapshot.primaryReactionForce.y).toBeCloseTo(12, 6)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(4, 6)
    expect(snapshot.position.x).toBeCloseTo(3, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("clamps beam-support inputs to stay inside the support span", () => {
    const service = new StaticsStateService()

    service.selectScenario("beam-support")
    service.updateScenarioField("anchorPoint.x", 2)
    service.updateScenarioField("secondaryPoint.x", 8)
    service.updateScenarioField("loadPosition", 20)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.loadPosition).toBeCloseTo(8, 6)
    expect(snapshot.position.x).toBeCloseTo(8, 6)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(scenario.loadMagnitude ?? 0, 6)
  })

  it("restores an imported statics scenario into the selected preset", () => {
    const service = new StaticsStateService()

    service.importScenarioState({
      id: "beam-support",
      name: "Beam Support Equilibrium",
      summary: "Imported beam case",
      equationSummary: "Sigma F = 0, Sigma tau = 0",
      status: "Imported",
      durationSeconds: 1,
      viewBounds: { minX: -1, maxX: 11, minY: -4, maxY: 4 },
      focusArea: "Reaction forces",
      initialPosition: { x: 6, y: 0 },
      appliedForce: { x: 0, y: -18 },
      anchorPoint: { x: 2, y: 0 },
      secondaryPoint: { x: 10, y: 0 },
      loadPosition: 6,
      loadMagnitude: 18,
    })

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.status).toBe("Imported")
    expect(snapshot.position.x).toBeCloseTo(6, 6)
    expect(snapshot.primaryReactionForce.y).toBeCloseTo(9, 6)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(9, 6)
  })

  it("solves an inclined-plane equilibrium with normal and friction forces", () => {
    const service = new StaticsStateService()

    service.selectScenario("inclined-plane")

    const snapshot = service.currentState()

    expect(snapshot.primaryReactionForce.x).toBeCloseTo(-8.4957, 3)
    expect(snapshot.primaryReactionForce.y).toBeCloseTo(14.715, 3)
    expect(snapshot.secondaryReactionForce?.x).toBeCloseTo(8.4957, 3)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(4.905, 3)
    expect(snapshot.residualForce.x).toBeCloseTo(0, 6)
    expect(snapshot.residualForce.y).toBeCloseTo(0, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("marks the inclined plane unstable when friction is below equilibrium demand", () => {
    const service = new StaticsStateService()

    service.importScenarioState({
      ...service.listScenarios().find((scenario) => scenario.id === "inclined-plane")!,
      frictionCoefficient: 0.2,
    })

    const snapshot = service.currentState()

    expect(snapshot.secondaryReactionForce?.x).toBeLessThan(8.4957)
    expect(snapshot.residualForce.y).toBeLessThan(0)
    expect(snapshot.stable).toBe(false)
  })

  it("updates inclined-plane equilibrium when mass, angle, and friction change", () => {
    const service = new StaticsStateService()

    service.selectScenario("inclined-plane")
    service.updateScenarioField("mass", 3)
    service.updateScenarioField("angleDegrees", 20)
    service.updateScenarioField("frictionCoefficient", 0.5)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.mass).toBeCloseTo(3, 6)
    expect(scenario.angleDegrees).toBeCloseTo(20, 6)
    expect(scenario.frictionCoefficient).toBeCloseTo(0.5, 6)
    expect(snapshot.primaryReactionForce.y).toBeGreaterThan(0)
    expect(snapshot.secondaryReactionForce?.x).toBeGreaterThan(0)
    expect(snapshot.stable).toBe(true)
  })

  it("clamps inclined-plane angle edits into a static-solver range", () => {
    const service = new StaticsStateService()

    service.selectScenario("inclined-plane")
    service.updateScenarioField("angleDegrees", 120)

    expect(service.selectedScenario().angleDegrees).toBe(85)
  })

  it("solves pulley equilibrium when the paired loads match", () => {
    const service = new StaticsStateService()

    service.selectScenario("pulley-equilibrium")

    const snapshot = service.currentState()

    expect(snapshot.primaryReactionForce.y).toBeCloseTo(9.81, 6)
    expect(snapshot.secondaryReactionForce?.y).toBeCloseTo(9.81, 6)
    expect(snapshot.residualForce.y).toBeCloseTo(0, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("marks pulley equilibrium unstable when the paired loads diverge", () => {
    const service = new StaticsStateService()

    service.selectScenario("pulley-equilibrium")
    service.updateScenarioField("mass", 1)
    service.updateScenarioField("secondaryMass", 1.5)

    const snapshot = service.currentState()

    expect(snapshot.primaryReactionForce.y).toBeCloseTo(9.81, 6)
    expect(snapshot.appliedForce.y).toBeCloseTo(-24.525, 6)
    expect(snapshot.residualForce.y).toBeCloseTo(-4.905, 6)
    expect(snapshot.stable).toBe(false)
  })

  it("prefers an explicit secondary pulley mass over legacy load magnitude state", () => {
    const service = new StaticsStateService()

    service.importScenarioState({
      ...service.listScenarios().find((scenario) => scenario.id === "pulley-equilibrium")!,
      mass: 1,
      secondaryMass: 1.4,
      loadMagnitude: 5,
    })

    const snapshot = service.currentState()

    expect(snapshot.appliedForce.y).toBeCloseTo(-(1 + 1.4) * 9.81, 6)
    expect(snapshot.residualForce.y).toBeCloseTo(-(1.4 - 1) * 9.81, 6)
  })
})

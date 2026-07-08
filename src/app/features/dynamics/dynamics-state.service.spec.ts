import { DynamicsStateService } from "./dynamics-state.service"

describe("DynamicsStateService", () => {
  it("computes constant-force motion with force-derived acceleration", () => {
    const service = new DynamicsStateService()

    service.selectScenario("constant-force")
    service.setTimeSeconds(2.5)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(9.25, 6)
    expect(snapshot.position.y).toBeCloseTo(2.5625, 6)
    expect(snapshot.velocity.x).toBeCloseTo(6.2, 6)
    expect(snapshot.velocity.y).toBeCloseTo(1.65, 6)
    expect(snapshot.acceleration.x).toBeCloseTo(2, 6)
    expect(snapshot.acceleration.y).toBeCloseTo(0.5, 6)
  })

  it("computes spring-oscillator state with bounded energy drift", () => {
    const service = new DynamicsStateService()

    service.selectScenario("spring-oscillator")
    service.setTimeSeconds(1)

    const snapshot = service.currentState()
    const samples = service.sampledStates()
    const totalEnergyValues = samples.map((sample) => sample.totalEnergy)
    const energySpan = Math.max(...totalEnergyValues) - Math.min(...totalEnergyValues)

    expect(snapshot.position.x).toBeLessThan(4)
    expect(Math.abs(snapshot.position.y)).toBeGreaterThan(0.1)
    expect(snapshot.totalEnergy).toBeGreaterThan(0)
    expect(energySpan).toBeLessThan(2.5)
  })

  it("computes projectile motion with drag and gravity", () => {
    const service = new DynamicsStateService()

    service.selectScenario("drag-projectile")
    service.setTimeSeconds(1.5)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeGreaterThan(6)
    expect(snapshot.position.x).toBeLessThan(10)
    expect(snapshot.position.y).toBeGreaterThan(3)
    expect(snapshot.velocity.x).toBeLessThan(8.5)
    expect(snapshot.velocity.y).toBeLessThan(0)
    expect(snapshot.acceleration.y).toBeLessThan(0)
  })

  it("computes orbital motion near a circular orbit quarter-turn", () => {
    const service = new DynamicsStateService()

    service.selectScenario("orbital-motion")
    service.setTimeSeconds((Math.PI * 2.5) / 2)

    const snapshot = service.currentState()
    const radius = Math.hypot(snapshot.position.x, snapshot.position.y)

    expect(snapshot.position.x).toBeCloseTo(0, 1)
    expect(snapshot.position.y).toBeCloseTo(5, 1)
    expect(radius).toBeCloseTo(5, 1)
    expect(snapshot.totalEnergy).toBeLessThan(0)
  })

  it("reflects elastically from the view bounds with near-conserved speed", () => {
    const service = new DynamicsStateService()

    service.selectScenario("elastic-collision")
    service.setTimeSeconds(2.4)

    const snapshot = service.currentState()
    const scenario = service.selectedScenario()
    const initialSpeed = Math.hypot(scenario.initialVelocity.x, scenario.initialVelocity.y)

    expect(snapshot.position.x).toBeGreaterThanOrEqual(scenario.viewBounds.minX)
    expect(snapshot.position.x).toBeLessThanOrEqual(scenario.viewBounds.maxX)
    expect(snapshot.position.y).toBeGreaterThanOrEqual(scenario.viewBounds.minY)
    expect(snapshot.position.y).toBeLessThanOrEqual(scenario.viewBounds.maxY)
    expect(snapshot.velocity.x).toBeLessThan(0)
    expect(snapshot.speed).toBeCloseTo(initialSpeed, 2)
    expect(snapshot.totalEnergy).toBeCloseTo(0.5 * scenario.mass * initialSpeed * initialSpeed, 2)
  })

  it("applies scenario overrides and resets them", () => {
    const service = new DynamicsStateService()

    service.selectScenario("constant-force")
    service.updateScenarioField("mass", 4)
    service.updateScenarioField("netForce.x", 8)
    service.setTimeSeconds(2)

    let snapshot = service.currentState()

    expect(snapshot.acceleration.x).toBeCloseTo(2, 6)
    expect(snapshot.velocity.x).toBeCloseTo(5.2, 6)

    service.resetScenarioParameters()
    service.setTimeSeconds(2)
    snapshot = service.currentState()

    expect(snapshot.acceleration.x).toBeCloseTo(2, 6)
    expect(snapshot.velocity.x).toBeCloseTo(5.2, 6)
  })

  it("builds sampled states for the selected scenario", () => {
    const service = new DynamicsStateService()

    service.selectScenario("spring-oscillator")

    const samples = service.sampledStates()

    expect(samples).toHaveLength(48)
    expect(samples[0]?.xPosition).toBeCloseTo(4, 6)
    expect(samples.at(-1)?.timeSeconds).toBeCloseTo(12, 6)
  })

  it("restores an exported dynamics scenario state and clamps time to imported duration", () => {
    const service = new DynamicsStateService()

    service.importScenarioState(
      {
        id: "elastic-collision",
        name: "Imported Collision",
        summary: "Imported dynamics state",
        equationSummary: 'x" = 0',
        durationSeconds: 3,
        viewBounds: { minX: -3, maxX: 3, minY: -2, maxY: 2 },
        mass: 2,
        initialPosition: { x: -2, y: 1 },
        initialVelocity: { x: 2.5, y: -0.5 },
        restitutionCoefficient: 0.75,
      },
      8,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.name).toBe("Imported Collision")
    expect(scenario.restitutionCoefficient).toBeCloseTo(0.75)
    expect(service.timeSeconds()).toBeCloseTo(3)
    expect(snapshot.position.x).toBeGreaterThanOrEqual(-3)
    expect(snapshot.position.x).toBeLessThanOrEqual(3)
  })
})

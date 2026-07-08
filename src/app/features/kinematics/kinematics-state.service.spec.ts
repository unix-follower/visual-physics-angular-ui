import { KinematicsStateService } from "./kinematics-state.service"

describe("KinematicsStateService", () => {
  it("computes constant velocity motion deterministically", () => {
    const service = new KinematicsStateService()

    service.selectScenario("constant-velocity")
    service.setTimeSeconds(2.5)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(6)
    expect(snapshot.position.y).toBeCloseTo(2.25)
    expect(snapshot.velocity.x).toBeCloseTo(2.4)
    expect(snapshot.velocity.y).toBeCloseTo(0.9)
    expect(snapshot.accelerationMagnitude).toBeCloseTo(0)
  })

  it("computes projectile motion with gravity", () => {
    const service = new KinematicsStateService()

    service.selectScenario("projectile")
    service.setTimeSeconds(1.5)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(10.8)
    expect(snapshot.position.y).toBeCloseTo(5.16375)
    expect(snapshot.velocity.x).toBeCloseTo(7.2)
    expect(snapshot.velocity.y).toBeCloseTo(-3.915)
    expect(snapshot.acceleration.y).toBeCloseTo(-9.81)
  })

  it("computes relative motion against the observer frame", () => {
    const service = new KinematicsStateService()

    service.selectScenario("relative-motion")
    service.setTimeSeconds(3)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(13.8)
    expect(snapshot.position.y).toBeCloseTo(4.2)
    expect(snapshot.relativePosition?.x).toBeCloseTo(8.4)
    expect(snapshot.relativePosition?.y).toBeCloseTo(3)
    expect(snapshot.relativeVelocity?.x).toBeCloseTo(2.8)
    expect(snapshot.relativeVelocity?.y).toBeCloseTo(1)
  })

  it("computes uniform circular motion from radius and angular speed", () => {
    const service = new KinematicsStateService()

    service.selectScenario("uniform-circular-motion")
    service.setTimeSeconds(Math.PI / (2 * 0.9))

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(0, 5)
    expect(snapshot.position.y).toBeCloseTo(4, 5)
    expect(snapshot.velocity.x).toBeCloseTo(-3.6, 5)
    expect(snapshot.velocity.y).toBeCloseTo(0, 5)
    expect(snapshot.acceleration.x).toBeCloseTo(0, 5)
    expect(snapshot.acceleration.y).toBeCloseTo(-3.24, 5)
  })

  it("applies editable scenario overrides and resets them", () => {
    const service = new KinematicsStateService()

    service.selectScenario("constant-acceleration")
    service.updateScenarioField("initialVelocity.x", 3.2)
    service.updateScenarioField("acceleration.y", 1.1)
    service.setTimeSeconds(2)

    let snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(7.3)
    expect(snapshot.position.y).toBeCloseTo(4.6)
    expect(snapshot.velocity.x).toBeCloseTo(4.1)
    expect(snapshot.velocity.y).toBeCloseTo(3.4)

    service.resetScenarioParameters()
    service.setTimeSeconds(2)
    snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(3.9)
    expect(snapshot.position.y).toBeCloseTo(4)
    expect(snapshot.velocity.x).toBeCloseTo(2.4)
    expect(snapshot.velocity.y).toBeCloseTo(2.8)
  })

  it("builds sampled states from the currently selected scenario", () => {
    const service = new KinematicsStateService()

    service.selectScenario("projectile")

    const samples = service.sampledStates()

    expect(samples).toHaveLength(48)
    expect(samples[0]?.xPosition).toBeCloseTo(0)
    expect(samples[0]?.yPosition).toBeCloseTo(0)
    expect(samples.at(-1)?.timeSeconds).toBeCloseTo(2.8)
  })

  it("restores an exported scenario state and clamps time to the imported duration", () => {
    const service = new KinematicsStateService()

    service.importScenarioState(
      {
        id: "constant-velocity",
        name: "Constant Velocity",
        summary: "Imported state",
        equationSummary: "x(t) = x0 + v t, a(t) = 0",
        durationSeconds: 4,
        viewBounds: { minX: -1, maxX: 18, minY: -2, maxY: 8 },
        initialPosition: { x: 1, y: -2 },
        initialVelocity: { x: 3, y: 0.5 },
        acceleration: { x: 0, y: 0 },
      },
      9,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.summary).toBe("Imported state")
    expect(service.timeSeconds()).toBeCloseTo(4)
    expect(snapshot.position.x).toBeCloseTo(13)
    expect(snapshot.position.y).toBeCloseTo(0)
  })
})

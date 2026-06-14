import { ElectromagnetismStateService } from "./electromagnetism-state.service"

describe("ElectromagnetismStateService", () => {
  it("builds a symmetric electrostatics snapshot around the centered probe", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("point-charge-electrostatics")
    service.updateScenarioField("probePoint.x", 0)
    service.updateScenarioField("probePoint.y", 1.5)

    const snapshot = service.currentState()

    expect(snapshot.position.x).toBeCloseTo(0, 6)
    expect(snapshot.position.y).toBeCloseTo(1.5, 6)
    expect(snapshot.electricField.x).toBeGreaterThan(0)
    expect(snapshot.electricField.y).toBeCloseTo(0, 6)
    expect(snapshot.fieldMagnitude).toBeGreaterThan(0)
    expect(snapshot.stable).toBe(true)
  })

  it("updates moving-charge position when time advances", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("moving-charge-magnetic-field")
    const initialSnapshot = service.currentState()

    service.updateTimeSeconds(2.5)
    const advancedSnapshot = service.currentState()

    expect(service.currentTimeSeconds()).toBeCloseTo(2.5, 6)
    expect(advancedSnapshot.position.x).not.toBeCloseTo(initialSnapshot.position.x, 6)
    expect(advancedSnapshot.position.y).not.toBeCloseTo(initialSnapshot.position.y, 6)
    expect(advancedSnapshot.forceMagnitude).toBeGreaterThan(0)
    expect(advancedSnapshot.stable).toBe(false)
  })

  it("resets scenario time when switching presets", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("moving-charge-magnetic-field")
    service.updateTimeSeconds(4.2)
    service.selectScenario("current-loop-magnetic-field")

    expect(service.currentTimeSeconds()).toBe(0)
    expect(service.selectedScenario().id).toBe("current-loop-magnetic-field")
  })

  it("updates current-loop field strength when current and radius change", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("current-loop-magnetic-field")
    service.updateScenarioField("current", 6)
    service.updateScenarioField("loopRadius", 2)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()
    const probeRadius = Math.hypot(scenario.probePoint?.x ?? 0, scenario.probePoint?.y ?? 0)
    const expectedField =
      (1.25663706 * 6 * 2 * 2) / (2 * Math.pow(2 * 2 + probeRadius * probeRadius, 1.5))

    expect(scenario.current).toBeCloseTo(6, 6)
    expect(scenario.loopRadius).toBeCloseTo(2, 6)
    expect(snapshot.position.y).toBeCloseTo(2, 6)
    expect(snapshot.fieldMagnitude).toBeCloseTo(expectedField, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("updates capacitor field and potential when plate spacing changes", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("capacitor-potential-field")
    service.updateScenarioField("plateSeparation", 3)
    service.updateScenarioField("potentialDifference", 15)

    const snapshot = service.currentState()

    expect(snapshot.fieldMagnitude).toBeCloseTo(5, 6)
    expect(snapshot.forceMagnitude).toBeCloseTo(5, 6)
    expect(snapshot.position.x).toBeCloseTo(0, 6)
    expect(snapshot.potential).toBeCloseTo(7.5, 6)
    expect(snapshot.stable).toBe(true)
  })

  it("updates induction emf magnitude when flux rate and inductance change", () => {
    const service = new ElectromagnetismStateService()

    service.selectScenario("electromagnetic-induction")
    service.updateScenarioField("fluxRate", 3)
    service.updateScenarioField("inductance", 2)

    const snapshot = service.currentState()

    expect(snapshot.potential).toBeCloseTo(-6, 6)
    expect(snapshot.forceMagnitude).toBeCloseTo(6, 6)
    expect(snapshot.fieldMagnitude).toBeCloseTo(0, 6)
    expect(service.selectedScenario().durationSeconds).toBeCloseTo(6, 6)
    expect(snapshot.stable).toBe(true)
  })
})

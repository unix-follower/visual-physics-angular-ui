import { TestBed } from "@angular/core/testing"

import { PlasmaPhysicsStateService } from "./plasma-physics-state.service"

describe("PlasmaPhysicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlasmaPhysicsStateService],
    })
  })

  it("initializes the locked Phase 33 starter trio and plasma-oscillation snapshot", () => {
    const service = TestBed.inject(PlasmaPhysicsStateService)
    const scenarios = service.listScenarios()
    const snapshot = service.currentState()

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "plasma-oscillation",
      "debye-screening",
      "magnetic-confinement",
    ])
    expect(service.selectedScenario().id).toBe("plasma-oscillation")
    expect(snapshot.plasmaFrequencyGigahertz).toBeGreaterThan(0)
    expect(snapshot.restoringFieldKilovoltsPerMeter).toBeGreaterThan(0)
  })

  it("clamps confinement inputs and keeps derived confinement diagnostics finite", () => {
    const service = TestBed.inject(PlasmaPhysicsStateService)
    service.selectScenario("magnetic-confinement")
    service.updateField("magneticFieldTesla", -2)
    service.updateField("plasmaCurrentMegaAmperes", 999)
    service.updateField("majorRadiusMeters", 0.1)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.magneticFieldTesla).toBe(0.3)
    expect(scenario.plasmaCurrentMegaAmperes).toBe(15)
    expect(scenario.majorRadiusMeters).toBe(0.5)
    expect(snapshot.larmorRadiusMillimeters).toBeGreaterThan(0)
    expect(Number.isFinite(snapshot.safetyFactor ?? Number.NaN)).toBe(true)
  })
})

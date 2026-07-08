import { TestBed } from "@angular/core/testing"

import { SolidStatePhysicsStateService } from "./solid-state-physics-state.service"

describe("SolidStatePhysicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SolidStatePhysicsStateService],
    })
  })

  it("initializes the locked Phase 29 starter trio and crystal elasticity snapshot", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    const scenarios = service.listScenarios()
    const snapshot = service.currentState()

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "crystal-elasticity",
      "phonon-dispersion",
      "electronic-structure",
    ])
    expect(service.selectedScenario().id).toBe("crystal-elasticity")
    expect(snapshot.stressMegapascals).toBeGreaterThan(0)
    expect(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter).toBeGreaterThan(0)
  })

  it("normalizes imported phonon view bounds and drops cross-scenario elasticity fields", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    service.importScenarioState({
      scenario: {
        id: "phonon-dispersion",
        name: "Imported phonon dispersion",
        summary: "Imported phonon slice",
        equationSummary: "Imported relation",
        status: "Imported",
        durationSeconds: 1,
        viewBounds: { minX: 2, maxX: 1, minY: 3, maxY: 2 },
        focusArea: "Imported phonon focus",
        latticeSpacingNanometers: 0.5,
        springConstantNewtonsPerMeter: 22,
        atomicMassAmu: 31,
        youngsModulusGigapascals: 999,
      } as never,
      snapshot: { timeSeconds: 0.4 },
    })

    const scenario = service.selectedScenario()
    expect(scenario.id).toBe("phonon-dispersion")
    expect(scenario.viewBounds).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 12 })
    expect(scenario.latticeSpacingNanometers).toBe(0.5)
    expect(
      (scenario as { youngsModulusGigapascals?: number }).youngsModulusGigapascals,
    ).toBeUndefined()
  })
})

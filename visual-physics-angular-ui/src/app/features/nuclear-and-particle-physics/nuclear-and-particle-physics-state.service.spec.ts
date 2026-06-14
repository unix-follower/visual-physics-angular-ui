import { TestBed } from "@angular/core/testing"

import { NuclearAndParticlePhysicsStateService } from "./nuclear-and-particle-physics-state.service"

describe("NuclearAndParticlePhysicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NuclearAndParticlePhysicsStateService],
    })
  })

  it("initializes the locked Phase 31 starter trio and radioactive decay snapshot", () => {
    const service = TestBed.inject(NuclearAndParticlePhysicsStateService)
    const scenarios = service.listScenarios()
    const snapshot = service.currentState()

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "radioactive-decay",
      "binding-energy-curve",
      "proton-proton-collision",
    ])
    expect(service.selectedScenario().id).toBe("radioactive-decay")
    expect(snapshot.remainingFraction).toBeGreaterThan(0)
    expect(snapshot.activityTerabecquerels).toBeGreaterThan(0)
  })

  it("clamps collider inputs and keeps derived collision diagnostics finite", () => {
    const service = TestBed.inject(NuclearAndParticlePhysicsStateService)
    service.selectScenario("proton-proton-collision")
    service.updateField("beamEnergyGeV", -4)
    service.updateField("scatteringAngleDegrees", 999)
    service.updateField("detectorRadiusMeters", 0.05)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.beamEnergyGeV).toBe(0.5)
    expect(scenario.scatteringAngleDegrees).toBe(175)
    expect(scenario.detectorRadiusMeters).toBe(0.2)
    expect(snapshot.invariantMassGeV).toBeGreaterThan(0)
    expect(Number.isFinite(snapshot.pseudorapidity ?? Number.NaN)).toBe(true)
  })
})

import { TestBed } from "@angular/core/testing"

import { ThermodynamicsStateService } from "./thermodynamics-state.service"

describe("ThermodynamicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThermodynamicsStateService],
    })
  })

  it("computes ideal-gas diagnostics for the default scenario", () => {
    const service = TestBed.inject(ThermodynamicsStateService)
    const snapshot = service.currentState()

    expect(snapshot.pressureKpa ?? 0).toBeCloseTo(110.86, 2)
    expect(snapshot.densityKgPerM3 ?? 0).toBeCloseTo(1.207, 3)
    expect(snapshot.internalEnergyKj ?? 0).toBeCloseTo(3.991, 3)
    expect(snapshot.compressibilityFactor ?? 0).toBeCloseTo(1, 9)
    expect(snapshot.stable).toBe(true)
  })

  it("lowers pressure when the chamber volume is increased", () => {
    const service = TestBed.inject(ThermodynamicsStateService)
    const before = service.currentState().pressureKpa ?? 0

    service.updateScenarioField("volumeCubicMeters", 0.05)

    const after = service.currentState().pressureKpa ?? 0
    expect(after).toBeLessThan(before)
  })

  it("computes transient slab-conduction diagnostics for the heat slice", () => {
    const service = TestBed.inject(ThermodynamicsStateService)
    service.selectScenario("heat-conduction-slab")
    service.updateTimeSeconds(120)
    const snapshot = service.currentState()

    expect(snapshot.centerTemperatureCelsius ?? 0).toBeGreaterThan(25)
    expect(snapshot.centerTemperatureCelsius ?? 0).toBeLessThan(145)
    expect(snapshot.heatFluxWPerM2 ?? 0).toBeGreaterThan(0)
    expect(snapshot.fourierNumber ?? 0).toBeGreaterThan(0)
  })

  it("computes Carnot-cycle diagnostics for the cycle slice", () => {
    const service = TestBed.inject(ThermodynamicsStateService)
    service.selectScenario("carnot-cycle")
    service.updateTimeSeconds(180)
    const snapshot = service.currentState()

    expect(snapshot.thermalEfficiency ?? 0).toBeGreaterThan(0)
    expect(snapshot.thermalEfficiency ?? 0).toBeLessThan(1)
    expect(snapshot.netWorkKj ?? 0).toBeGreaterThan(0)
    expect(snapshot.absorbedHeatKj ?? 0).toBeGreaterThan(snapshot.rejectedHeatKj ?? 0)
    expect(snapshot.cycleStageLabel).toBeTruthy()
  })
})

import { TestBed } from "@angular/core/testing"

import { FluidMechanicsStateService } from "./fluid-mechanics-state.service"

describe("FluidMechanicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FluidMechanicsStateService],
    })
  })

  it("computes stable floating equilibrium for the default buoyancy block", () => {
    const service = TestBed.inject(FluidMechanicsStateService)
    const snapshot = service.currentState()

    expect(snapshot.stable).toBe(true)
    expect(snapshot.immersionRatio).toBeCloseTo(0.6, 3)
    expect(snapshot.submersionDepth).toBeCloseTo(0.72, 3)
    expect(snapshot.buoyantForce ?? 0).toBeCloseTo(snapshot.weightForce ?? 0, 3)
  })

  it("marks the block as sinking when block density exceeds fluid density", () => {
    const service = TestBed.inject(FluidMechanicsStateService)
    service.updateScenarioField("blockDensity", 1200)
    const snapshot = service.currentState()

    expect(snapshot.stable).toBe(false)
    expect(snapshot.submersionDepth).toBeCloseTo(service.selectedScenario().blockHeight ?? 0, 6)
    expect(snapshot.netForce ?? 0).toBeLessThan(0)
  })

  it("computes laminar pipe-flow diagnostics for the Poiseuille slice", () => {
    const service = TestBed.inject(FluidMechanicsStateService)
    service.selectScenario("poiseuille-pipe")
    const snapshot = service.currentState()

    expect(snapshot.volumetricFlowRate ?? 0).toBeGreaterThan(0)
    expect(snapshot.averageVelocity ?? 0).toBeGreaterThan(0)
    expect(snapshot.centerlineVelocity ?? 0).toBeCloseTo((snapshot.averageVelocity ?? 0) * 2, 6)
    expect(snapshot.reynoldsNumber ?? 0).toBeLessThan(2300)
  })

  it("computes subcritical open-channel diagnostics for the uniform-flow slice", () => {
    const service = TestBed.inject(FluidMechanicsStateService)
    service.selectScenario("open-channel-flow")
    const snapshot = service.currentState()

    expect(snapshot.discharge ?? 0).toBeGreaterThan(0)
    expect(snapshot.averageVelocity ?? 0).toBeGreaterThan(0)
    expect(snapshot.hydraulicRadius ?? 0).toBeGreaterThan(0)
    expect(snapshot.froudeNumber ?? 0).toBeLessThan(1)
  })
})

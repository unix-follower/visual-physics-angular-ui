import { TestBed } from "@angular/core/testing"

import { OpticsStateService } from "./optics-state.service"

describe("OpticsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpticsStateService],
    })
  })

  it("computes a refracted ray angle for the default Snell slice", () => {
    const service = TestBed.inject(OpticsStateService)
    const snapshot = service.currentState()

    expect(snapshot.totalInternalReflection).toBe(false)
    expect(snapshot.refractedAngleDegrees ?? 0).toBeGreaterThan(0)
    expect(snapshot.refractedAngleDegrees ?? 0).toBeLessThan(snapshot.incidentAngleDegrees ?? 0)
  })

  it("switches into total internal reflection for a high-to-low index interface", () => {
    const service = TestBed.inject(OpticsStateService)
    service.updateScenarioField("mediumARefractiveIndex", 1.52)
    service.updateScenarioField("mediumBRefractiveIndex", 1)
    service.updateScenarioField("incidentAngleDegrees", 60)

    const snapshot = service.currentState()
    expect(snapshot.totalInternalReflection).toBe(true)
    expect(snapshot.refractedAngleDegrees).toBeUndefined()
    expect(snapshot.criticalAngleDegrees ?? 0).toBeGreaterThan(0)
  })

  it("computes a real inverted image for the thin-lens slice", () => {
    const service = TestBed.inject(OpticsStateService)
    service.selectScenario("thin-lens-imaging")

    const snapshot = service.currentState()
    expect(snapshot.imageDistanceCentimeters ?? 0).toBeGreaterThan(0)
    expect(snapshot.magnification ?? 0).toBeLessThan(0)
    expect(snapshot.realImage).toBe(true)
    expect(snapshot.invertedImage).toBe(true)
  })

  it("computes diffraction minima for the single-slit slice", () => {
    const service = TestBed.inject(OpticsStateService)
    service.selectScenario("single-slit-diffraction")

    const snapshot = service.currentState()
    expect(snapshot.firstMinimumOffsetMillimeters ?? 0).toBeGreaterThan(0)
    expect(snapshot.centralMaximumWidthMillimeters ?? 0).toBeCloseTo(
      (snapshot.firstMinimumOffsetMillimeters ?? 0) * 2,
      5,
    )
    expect(snapshot.stable).toBe(true)
  })
})

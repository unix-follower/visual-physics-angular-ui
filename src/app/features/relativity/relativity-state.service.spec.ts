import { TestBed } from "@angular/core/testing"

import { RelativityStateService } from "./relativity-state.service"

describe("RelativityStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativityStateService],
    })
  })

  it("computes the default time-dilation slice", () => {
    const service = TestBed.inject(RelativityStateService)
    const snapshot = service.currentState()

    expect(snapshot.relativeVelocityFractionOfLight).toBeCloseTo(0.8, 6)
    expect(snapshot.lorentzFactorGamma).toBeCloseTo(1.6666667, 6)
    expect(snapshot.dilatedTimeSeconds).toBeCloseTo(1.6666667, 6)
    expect(snapshot.stable).toBe(true)
    expect(service.sampledStates().length).toBe(49)
  })

  it("recomputes the time-dilation curve when beta changes", () => {
    const service = TestBed.inject(RelativityStateService)
    service.updateScenarioField("relativeVelocityFractionOfLight", 0.6)

    const snapshot = service.currentState()
    expect(snapshot.relativeVelocityFractionOfLight).toBeCloseTo(0.6, 6)
    expect(snapshot.lorentzFactorGamma).toBeCloseTo(1.25, 6)
    expect(snapshot.dilatedTimeSeconds).toBeCloseTo(1.25, 6)
  })

  it("computes a relativistic doppler redshift for the default motion state", () => {
    const service = TestBed.inject(RelativityStateService)
    service.selectScenario("relativistic-doppler")

    const snapshot = service.currentState()
    expect(snapshot.relativeVelocityFractionOfLight ?? 0).toBeGreaterThan(0)
    expect(snapshot.observedFrequencyHertz ?? 0).toBeLessThan(440)
    expect(snapshot.classicalObservedFrequencyHertz ?? 0).toBeGreaterThan(0)
    expect(snapshot.redshift).toBe(true)
  })

  it("computes gravitational time dilation below the far-field clock rate", () => {
    const service = TestBed.inject(RelativityStateService)
    service.selectScenario("gravitational-time-dilation")

    const snapshot = service.currentState()
    expect(snapshot.gravitationalTimeFactor ?? 0).toBeLessThan(1)
    expect(snapshot.localElapsedTimeSeconds ?? 0).toBeLessThan(snapshot.timeSeconds)
    expect(snapshot.schwarzschildRadiusKilometers ?? 0).toBeGreaterThan(0)
  })

  it("restores imported snapshot time into the time-dilation scenario state", () => {
    const service = TestBed.inject(RelativityStateService)
    service.importScenarioState(
      {
        id: "time-dilation",
        name: "Inertial Time Dilation",
        summary: "Imported time check.",
        equationSummary: "gamma = 1 / sqrt(1 - beta^2), t = gamma tau",
        status: "Initial analytic slice",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 0.98, minY: 0, maxY: 6 },
        focusArea: "Normalization check.",
        relativeVelocityFractionOfLight: 0.5,
        properTimeSeconds: 9,
      },
      1.75,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.properTimeSeconds).toBe(1.75)
    expect(snapshot.timeSeconds).toBe(1.75)
    expect(snapshot.properTimeSeconds).toBe(1.75)
    expect(snapshot.relativeVelocityFractionOfLight).toBeCloseTo(0.5, 6)
  })

  it("restores invalid imported relativity view bounds to the scenario default range", () => {
    const service = TestBed.inject(RelativityStateService)
    service.importScenarioState(
      {
        id: "gravitational-time-dilation",
        name: "Gravitational Time Dilation",
        summary: "Imported invalid bounds.",
        equationSummary: "d tau = d t sqrt(1 - r_s / r)",
        status: "Initial analytic slice",
        durationSeconds: 1,
        viewBounds: { minX: 8, maxX: 2, minY: 3, maxY: 3 },
        focusArea: "Normalization check.",
        centralMassSolarMasses: 2,
        orbitalRadiusSchwarzschildRadii: 5,
        coordinateTimeSeconds: 1,
      },
      1,
    )

    expect(service.selectedScenario().viewBounds).toEqual({
      minX: 1,
      maxX: 12,
      minY: 0,
      maxY: 1.1,
    })
  })
})

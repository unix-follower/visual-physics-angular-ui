import { TestBed } from "@angular/core/testing"

import { AstrophysicsStateService } from "./astrophysics-state.service"

describe("AstrophysicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AstrophysicsStateService],
    })
  })

  it("computes the default planetary-orbit slice", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const snapshot = service.currentState()

    expect(snapshot.orbitalRadiusAstronomicalUnits).toBeCloseTo(1, 6)
    expect(snapshot.orbitalPeriodDays ?? 0).toBeGreaterThan(300)
    expect(snapshot.orbitalSpeedKilometersPerSecond ?? 0).toBeGreaterThan(20)
    expect(snapshot.escapeSpeedKilometersPerSecond ?? 0).toBeGreaterThan(
      snapshot.orbitalSpeedKilometersPerSecond ?? 0,
    )
    expect(snapshot.stable).toBe(true)
    expect(service.sampledStates().length).toBe(49)
  })

  it("computes stellar luminosity and habitable-zone diagnostics", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    service.selectScenario("stellar-luminosity")

    const snapshot = service.currentState()
    expect(snapshot.luminositySolarUnits).toBeCloseTo(1, 6)
    expect(snapshot.habitableZoneInnerAstronomicalUnits ?? 0).toBeGreaterThan(0)
    expect(snapshot.habitableZoneOuterAstronomicalUnits ?? 0).toBeGreaterThan(
      snapshot.habitableZoneInnerAstronomicalUnits ?? 0,
    )
  })

  it("computes Hubble-law recession diagnostics", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    service.selectScenario("hubble-expansion")

    const snapshot = service.currentState()
    expect(snapshot.recessionVelocityKilometersPerSecond).toBeCloseTo(28_000, 6)
    expect(snapshot.redshift ?? 0).toBeGreaterThan(0)
    expect(service.sampledStates().length).toBe(33)
  })

  it("preserves snapshot time for stellar and hubble slices", () => {
    const service = TestBed.inject(AstrophysicsStateService)

    service.selectScenario("stellar-luminosity")
    service.updateScenarioField("timeSeconds", 0.4)
    expect(service.currentState().timeSeconds).toBeCloseTo(0.4, 6)
    const stellarActiveAtLowTime = service.sampledStates().find((sample) => sample.active)?.position
    service.updateScenarioField("timeSeconds", 0.9)
    const stellarActiveAtHighTime = service
      .sampledStates()
      .find((sample) => sample.active)?.position
    expect(stellarActiveAtHighTime).toBeGreaterThan(stellarActiveAtLowTime ?? 0)

    service.selectScenario("hubble-expansion")
    service.updateScenarioField("timeSeconds", 0.2)
    expect(service.currentState().timeSeconds).toBeCloseTo(0.2, 6)
    const hubbleActiveAtLowTime = service.sampledStates().find((sample) => sample.active)?.position
    service.updateScenarioField("timeSeconds", 0.8)
    const hubbleActiveAtHighTime = service.sampledStates().find((sample) => sample.active)?.position
    expect(hubbleActiveAtHighTime).toBeGreaterThan(hubbleActiveAtLowTime ?? 0)
  })

  it("restores invalid imported view bounds to the planetary default range", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    service.importScenarioState(
      {
        id: "planetary-orbit",
        name: "Imported orbit",
        summary: "Imported invalid view bounds.",
        equationSummary: "T = 2 pi sqrt(r^3 / GM)",
        status: "Imported",
        durationSeconds: 1,
        viewBounds: { minX: 4, maxX: 2, minY: 1, maxY: 1 },
        focusArea: "Normalization check.",
        centralMassSolarMasses: 1.4,
        orbitalRadiusAstronomicalUnits: 1.8,
        orbitalEccentricity: 0.2,
      },
      0.75,
    )

    expect(service.selectedScenario().viewBounds).toEqual({
      minX: -1.6,
      maxX: 1.6,
      minY: -1.6,
      maxY: 1.6,
    })
    expect(service.currentState().timeSeconds).toBeCloseTo(0.75, 6)
  })
})

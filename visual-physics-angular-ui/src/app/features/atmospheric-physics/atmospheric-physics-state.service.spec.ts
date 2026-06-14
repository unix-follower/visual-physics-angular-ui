import { TestBed } from "@angular/core/testing"

import { AtmosphericPhysicsScenario } from "./atmospheric-physics.models"
import { AtmosphericPhysicsStateService } from "./atmospheric-physics-state.service"

describe("AtmosphericPhysicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AtmosphericPhysicsStateService],
    })
  })

  it("computes the default barometric slice", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    const snapshot = service.currentState()

    expect(snapshot.pressureKilopascals ?? 0).toBeGreaterThan(70)
    expect(snapshot.relativeDensity ?? 0).toBeGreaterThan(0.7)
    expect(snapshot.stable).toBe(true)
    expect(service.sampledStates().length).toBe(33)
  })

  it("normalizes imported convection values before selecting the restored scenario", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    service.importScenarioState(
      {
        id: "convection-column",
        name: "Convection Column",
        summary: "Imported invalid convection values.",
        equationSummary: "a_b approx g * Delta T / T",
        status: "Imported",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 22 },
        focusArea: "Normalization check.",
        surfaceTemperatureKelvin: -10,
        environmentalLapseRateKelvinPerKilometer: 99,
        parcelTemperatureExcessKelvin: -4,
        columnHeightKilometers: 99,
      },
      0.75,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.surfaceTemperatureKelvin).toBe(200)
    expect(scenario.environmentalLapseRateKelvinPerKilometer).toBe(11)
    expect(scenario.parcelTemperatureExcessKelvin).toBe(0.2)
    expect(scenario.columnHeightKilometers).toBe(14)
    expect(snapshot.timeSeconds).toBeCloseTo(0.75, 6)
  })

  it("drops cross-scenario fields from imported state before future exports can reuse them", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    const importedScenario = {
      id: "barometric-formula",
      name: "Barometric Formula",
      summary: "Imported mixed payload.",
      equationSummary: "P(z) = P0 exp(-z / H)",
      status: "Imported",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 105 },
      focusArea: "Normalization check.",
      seaLevelPressureKilopascals: 95,
      scaleHeightKilometers: 7.5,
      tropopauseHeightKilometers: 18,
      parcelTemperatureExcessKelvin: 9,
    } as unknown as AtmosphericPhysicsScenario

    service.importScenarioState(importedScenario, 0.1)

    const scenario = service.selectedScenario() as unknown as Record<string, unknown>
    expect(scenario["id"]).toBe("barometric-formula")
    expect(scenario["seaLevelPressureKilopascals"]).toBe(95)
    expect(scenario["scaleHeightKilometers"]).toBe(7.5)
    expect("tropopauseHeightKilometers" in scenario).toBe(false)
    expect("parcelTemperatureExcessKelvin" in scenario).toBe(false)
  })

  it("restores invalid imported view bounds to the scenario default range", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    service.importScenarioState(
      {
        id: "adiabatic-lapse-rate",
        name: "Adiabatic Lapse Rate",
        summary: "Imported invalid bounds.",
        equationSummary: "T(z) = T0 - Gamma z",
        status: "Imported",
        durationSeconds: 1,
        viewBounds: { minX: 5, maxX: 5, minY: 500, maxY: 100 },
        focusArea: "Normalization check.",
        surfaceTemperatureKelvin: 288,
        lapseRateKelvinPerKilometer: 9.8,
        tropopauseHeightKilometers: 11,
      },
      0.25,
    )

    expect(service.selectedScenario().viewBounds).toEqual({
      minX: 0,
      maxX: 12,
      minY: 190,
      maxY: 310,
    })
  })
})

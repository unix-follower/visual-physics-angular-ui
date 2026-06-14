import { TestBed } from "@angular/core/testing"

import { QuantumMechanicsScenario } from "./quantum-mechanics.models"
import { QuantumMechanicsStateService } from "./quantum-mechanics-state.service"

describe("QuantumMechanicsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuantumMechanicsStateService],
    })
  })

  it("computes a bound-state energy for the default particle-in-a-box slice", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    const snapshot = service.currentState()

    expect(snapshot.energyLevelEv ?? 0).toBeGreaterThan(0)
    expect(snapshot.nodeCount).toBe(0)
    expect(snapshot.deBroglieWavelengthNanometers ?? 0).toBeGreaterThan(0)
    expect(snapshot.stable).toBe(true)
  })

  it("computes tunneling metrics for the finite-barrier slice", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.selectScenario("finite-potential-well-tunneling")

    const snapshot = service.currentState()
    expect(snapshot.transmissionProbability ?? 0).toBeGreaterThan(0)
    expect(snapshot.transmissionProbability ?? 0).toBeLessThan(1)
    expect(snapshot.reflectionProbability ?? 0).toBeCloseTo(
      1 - (snapshot.transmissionProbability ?? 0),
      6,
    )
    expect(snapshot.decayLengthNanometers ?? 0).toBeGreaterThan(0)
  })

  it("computes interference spacing for the double-slit slice", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.selectScenario("double-slit-interference")

    const snapshot = service.currentState()
    expect(snapshot.fringeSpacingMillimeters ?? 0).toBeGreaterThan(0)
    expect(snapshot.centralMaximumWidthMillimeters ?? 0).toBeGreaterThan(
      snapshot.fringeSpacingMillimeters ?? 0,
    )
    expect(snapshot.coherenceEstimate ?? 0).toBeGreaterThan(0)
    expect(snapshot.stable).toBe(true)
  })

  it("rounds the particle quantum number to a valid integer", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.updateScenarioField("quantumNumber", 2.6)

    expect(service.selectedScenario().quantumNumber).toBe(3)
    expect(service.currentState().nodeCount).toBe(2)
  })

  it("normalizes edited tunneling values before they reach exportable scenario state", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.selectScenario("finite-potential-well-tunneling")
    service.updateScenarioField("particleEnergyEv", -2)
    service.updateScenarioField("barrierHeightEv", -1)
    service.updateScenarioField("barrierWidthNanometers", -0.5)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.particleEnergyEv).toBe(0.05)
    expect(scenario.barrierHeightEv).toBeCloseTo(0.06, 6)
    expect(scenario.barrierWidthNanometers).toBe(0.05)
    expect(snapshot.particleEnergyEv).toBe(scenario.particleEnergyEv)
    expect(snapshot.barrierHeightEv).toBe(scenario.barrierHeightEv)
    expect(snapshot.barrierWidthNanometers).toBe(scenario.barrierWidthNanometers)
  })

  it("normalizes imported particle-in-a-box values before selecting the restored scenario", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.importScenarioState(
      {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Imported invalid box values.",
        equationSummary: "E_n = n^2 h^2 / (8 m L^2)",
        status: "Implemented",
        durationSeconds: 0,
        viewBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
        focusArea: "Normalization check.",
        boxLengthNanometers: -4,
        quantumNumber: 0.2,
      },
      0,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.boxLengthNanometers).toBe(0.1)
    expect(scenario.quantumNumber).toBe(1)
    expect(snapshot.boxLengthNanometers).toBe(0.1)
    expect(snapshot.quantumNumber).toBe(1)
  })

  it("restores imported snapshot time into the selected scenario state", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.importScenarioState(
      {
        id: "finite-potential-well-tunneling",
        name: "Finite Barrier Tunneling",
        summary: "Imported time check.",
        equationSummary: "T ~ exp(-2 kappa a)",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Normalization check.",
        particleEnergyEv: 1.8,
        barrierHeightEv: 3.9,
        barrierWidthNanometers: 0.6,
      },
      0.75,
    )

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.durationSeconds).toBe(1)
    expect(snapshot.timeSeconds).toBe(0.75)
    expect(snapshot.particleEnergyEv).toBe(1.8)
  })

  it("drops cross-scenario fields from imported state before future exports can reuse them", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    const importedScenario = {
      id: "particle-in-a-box",
      name: "Particle in a One-Dimensional Box",
      summary: "Imported mixed payload.",
      equationSummary: "E_n = n^2 h^2 / (8 m L^2)",
      status: "Implemented",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
      focusArea: "Normalization check.",
      boxLengthNanometers: 1.5,
      quantumNumber: 2,
      barrierHeightEv: 9.9,
      barrierWidthNanometers: 4.2,
    } as unknown as QuantumMechanicsScenario

    service.importScenarioState(importedScenario, 0)

    const scenario = service.selectedScenario()

    expect(scenario.id).toBe("particle-in-a-box")
    expect(scenario.boxLengthNanometers).toBe(1.5)
    expect(scenario.quantumNumber).toBe(2)
    expect("barrierHeightEv" in scenario).toBe(false)
    expect("barrierWidthNanometers" in scenario).toBe(false)
  })

  it("restores invalid imported view bounds to the scenario default range", () => {
    const service = TestBed.inject(QuantumMechanicsStateService)
    service.importScenarioState(
      {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Imported invalid bounds.",
        equationSummary: "Delta y ~ lambda L / d",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 5, maxX: 5, minY: 9, maxY: 1 },
        focusArea: "Normalization check.",
        wavelengthNanometers: 520,
        slitSeparationMicrometers: 120,
        slitWidthMicrometers: 40,
        screenDistanceMeters: 1.8,
      },
      0,
    )

    expect(service.selectedScenario().viewBounds).toEqual({
      minX: 0,
      maxX: 10,
      minY: 0,
      maxY: 10,
    })
  })
})

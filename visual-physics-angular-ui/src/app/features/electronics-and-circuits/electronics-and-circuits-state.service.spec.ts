import { TestBed } from "@angular/core/testing"

import { ElectronicsAndCircuitsStateService } from "./electronics-and-circuits-state.service"

describe("ElectronicsAndCircuitsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({})
  })

  it("computes the RC transient snapshot and clamps time", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.updateScenarioField("sourceVoltage", 10)
    service.updateScenarioField("resistance", 100)
    service.updateScenarioField("capacitance", 0.02)
    service.updateTimeSeconds(2.5)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(2.5, 6)
    expect(snapshot.timeConstant).toBeCloseTo(2, 6)
    expect(snapshot.capacitorVoltage).toBeGreaterThan(0)
    expect(snapshot.capacitorVoltage).toBeLessThan(10.1)
    expect(snapshot.current).toBeGreaterThanOrEqual(0)
  })

  it("computes an RL transient snapshot with inductor-voltage decay and current rise", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rl-transient")
    service.updateScenarioField("sourceVoltage", 9)
    service.updateScenarioField("resistance", 6)
    service.updateScenarioField("inductance", 0.5)
    service.updateTimeSeconds(0.2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(0.2, 6)
    expect(snapshot.timeConstant).toBeCloseTo(0.5 / 6, 6)
    expect(snapshot.outputVoltage).toBeGreaterThan(0.7)
    expect(snapshot.outputVoltage).toBeLessThan(0.9)
    expect(snapshot.current).toBeGreaterThan(1.3)
    expect(snapshot.current).toBeLessThan(1.4)
    expect(snapshot.storedEnergy).toBeGreaterThan(0.45)
  })

  it("computes a half-wave rectifier sample with diode clipping and load current", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("half-wave-rectifier")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 220)
    service.updateTimeSeconds(0.005)

    const snapshot = service.currentState()
    expect(snapshot.capacitorVoltage).toBeGreaterThan(7.9)
    expect(snapshot.outputVoltage).toBeGreaterThan(7.2)
    expect(snapshot.outputVoltage).toBeLessThan(7.4)
    expect(snapshot.current).toBeGreaterThan(0.032)
    expect(snapshot.current).toBeLessThan(0.034)
    expect(snapshot.branchPower).toBeGreaterThan(0.23)
  })

  it("computes a full-wave rectifier sample with bridge rectification and doubled ripple", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("full-wave-rectifier")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 220)
    service.updateTimeSeconds(0.015)

    const snapshot = service.currentState()
    expect(snapshot.capacitorVoltage).toBeLessThan(-7.9)
    expect(snapshot.outputVoltage).toBeGreaterThan(6.5)
    expect(snapshot.outputVoltage).toBeLessThan(6.7)
    expect(snapshot.current).toBeGreaterThan(0.029)
    expect(snapshot.current).toBeLessThan(0.031)
    expect(snapshot.timeConstant).toBeCloseTo(0.01, 6)
  })

  it("computes a smoothed rectifier sample with ripple filtering and stored capacitor energy", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("smoothed-rectifier")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 220)
    service.updateScenarioField("capacitance", 0.00047)
    service.updateTimeSeconds(0.015)

    const snapshot = service.currentState()
    expect(snapshot.capacitorVoltage).toBeLessThan(-7.9)
    expect(snapshot.outputVoltage).toBeGreaterThan(5.9)
    expect(snapshot.outputVoltage).toBeLessThan(6.7)
    expect(snapshot.current).toBeGreaterThan(0.026)
    expect(snapshot.current).toBeLessThan(0.031)
    expect(snapshot.charge).toBeGreaterThan(0.0025)
    expect(snapshot.storedEnergy).toBeGreaterThan(0.008)
    expect(snapshot.timeConstant).toBeCloseTo(220 * 0.00047, 6)
  })

  it("imports a scenario and restores time within bounds", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    const scenario = {
      ...service.selectedScenario(),
      sourceVoltage: 5,
      resistance: 50,
      capacitance: 0.05,
      durationSeconds: 4,
    }

    service.importScenario(scenario, 9)

    expect(service.selectedScenario().sourceVoltage).toBe(5)
    expect(service.currentTimeSeconds()).toBe(4)
  })

  it("computes resistor-divider output for the resistor-network scenario", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("resistor-network")
    service.updateScenarioField("sourceVoltage", 12)
    service.updateScenarioField("resistance", 200)
    service.updateScenarioField("secondaryResistance", 300)

    const snapshot = service.currentState()
    expect(snapshot.outputVoltage).toBeCloseTo(7.2, 6)
    expect(snapshot.current).toBeCloseTo(0.024, 6)
    expect(snapshot.equivalentResistance).toBeCloseTo(500, 6)
    expect(snapshot.branchPower).toBeGreaterThan(0)
  })

  it("computes an RC low-pass filter sweep point with attenuation near cutoff", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rc-low-pass")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 100)
    service.updateScenarioField("capacitance", 0.001)
    service.updateTimeSeconds(2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(2, 6)
    expect(snapshot.outputVoltage).toBeGreaterThan(4.8)
    expect(snapshot.outputVoltage).toBeLessThan(5.1)
    expect(snapshot.current).toBeGreaterThan(0.06)
    expect(snapshot.timeConstant).toBeCloseTo(1 / (2 * Math.PI * 100 * 0.001), 6)
  })

  it("computes an RC high-pass filter sweep point with passband recovery near cutoff", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rc-high-pass")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 100)
    service.updateScenarioField("capacitance", 0.001)
    service.updateTimeSeconds(2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(2, 6)
    expect(snapshot.outputVoltage).toBeGreaterThan(6.2)
    expect(snapshot.outputVoltage).toBeLessThan(6.4)
    expect(snapshot.capacitorVoltage).toBeLessThan(5.1)
    expect(snapshot.branchPower).toBeGreaterThan(0.39)
    expect(snapshot.timeConstant).toBeCloseTo(1 / (2 * Math.PI * 100 * 0.001), 6)
  })

  it("computes an RL low-pass filter sweep point with attenuation near cutoff", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rl-low-pass")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 4)
    service.updateScenarioField("inductance", 0.2)
    service.updateTimeSeconds(3.2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(3.2, 6)
    expect(snapshot.outputVoltage).toBeGreaterThan(5.5)
    expect(snapshot.outputVoltage).toBeLessThan(5.8)
    expect(snapshot.capacitorVoltage).toBeGreaterThan(5.5)
    expect(snapshot.storedEnergy).toBeGreaterThan(0.09)
    expect(snapshot.timeConstant).toBeCloseTo(4 / (2 * Math.PI * 0.2), 6)
  })

  it("computes an RL high-pass filter sweep point with passband recovery near cutoff", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rl-high-pass")
    service.updateScenarioField("sourceVoltage", 8)
    service.updateScenarioField("resistance", 4)
    service.updateScenarioField("inductance", 0.2)
    service.updateTimeSeconds(3.2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(3.2, 6)
    expect(snapshot.outputVoltage).toBeGreaterThan(5.5)
    expect(snapshot.outputVoltage).toBeLessThan(5.8)
    expect(snapshot.capacitorVoltage).toBeGreaterThan(5.5)
    expect(snapshot.storedEnergy).toBeGreaterThan(0.09)
    expect(snapshot.timeConstant).toBeCloseTo(4 / (2 * Math.PI * 0.2), 6)
  })

  it("computes a damped RLC response with stored energy and current evolution", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rlc-response")
    service.updateScenarioField("sourceVoltage", 9)
    service.updateScenarioField("resistance", 6)
    service.updateScenarioField("inductance", 0.5)
    service.updateScenarioField("capacitance", 0.05)
    service.updateTimeSeconds(1.2)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(1.2, 6)
    expect(snapshot.current).not.toBeNaN()
    expect(snapshot.storedEnergy).toBeGreaterThanOrEqual(0)
    expect(snapshot.timeConstant).toBeCloseTo(0.5 / 6, 6)
  })

  it("computes an RLC resonance sweep with a current and power peak near resonance", () => {
    const service = TestBed.inject(ElectronicsAndCircuitsStateService)
    service.selectScenario("rlc-resonance")
    service.updateScenarioField("sourceVoltage", 6)
    service.updateScenarioField("resistance", 4)
    service.updateScenarioField("inductance", 0.2)
    service.updateScenarioField("capacitance", 0.005)
    service.updateTimeSeconds(5)

    const snapshot = service.currentState()
    expect(snapshot.timeSeconds).toBeCloseTo(5, 6)
    expect(snapshot.current).toBeGreaterThan(1.4)
    expect(snapshot.capacitorVoltage).toBeGreaterThan(9)
    expect(snapshot.branchPower).toBeGreaterThan(8.5)
    expect(snapshot.timeConstant).toBeCloseTo(4 / (2 * Math.PI * 0.2), 6)
  })
})

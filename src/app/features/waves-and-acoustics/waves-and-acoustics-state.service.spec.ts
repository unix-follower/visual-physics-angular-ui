import { TestBed } from "@angular/core/testing"

import { WavesAndAcousticsStateService } from "./waves-and-acoustics-state.service"

describe("WavesAndAcousticsStateService", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WavesAndAcousticsStateService],
    })
  })

  it("computes standing-wave diagnostics for the default slice", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)
    const snapshot = service.currentState()

    expect(snapshot.harmonicNumber).toBe(2)
    expect(snapshot.wavelengthMeters).toBeCloseTo(1.2, 6)
    expect(snapshot.frequencyHertz).toBeCloseTo(20, 6)
    expect(snapshot.stable).toBe(true)
    expect(service.sampledStates().length).toBe(73)
  })

  it("computes a higher apparent frequency for an approaching doppler source", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)
    service.selectScenario("doppler-effect")

    const snapshot = service.currentState()

    expect(snapshot.emittedFrequencyHertz).toBe(440)
    expect(snapshot.apparentFrequencyHertz ?? 0).toBeGreaterThan(440)
    expect(snapshot.wavelengthMeters ?? 0).toBeGreaterThan(0)
    expect(snapshot.stable).toBe(true)
  })

  it("updates the active standing-wave harmonic before recomputing the mode shape", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)
    service.updateScenarioField("harmonicNumber", 3.2)

    const scenario = service.selectedScenario()
    const snapshot = service.currentState()

    expect(scenario.harmonicNumber).toBe(3)
    expect(snapshot.harmonicNumber).toBe(3)
    expect(snapshot.wavelengthMeters).toBeCloseTo(0.8, 6)
    expect(snapshot.frequencyHertz).toBeCloseTo(30, 6)
  })

  it("updates the active standing-wave snapshot time before recomputing the oscillation profile", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)

    const initialSample = service.sampledStates()[18]?.primaryValue ?? 0
    service.updateScenarioField("timeSeconds", 1 / 80)

    const snapshot = service.currentState()
    const updatedSample = service.sampledStates()[18]?.primaryValue ?? 0

    expect(snapshot.timeSeconds).toBeCloseTo(1 / 80, 6)
    expect(Math.abs(initialSample)).toBeGreaterThan(0.1)
    expect(updatedSample).toBeCloseTo(0, 6)
  })

  it("updates the active traveling-wave snapshot time before recomputing sampled states", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)
    service.selectScenario("traveling-wave")

    const initialSample = service.sampledStates()[9]?.primaryValue ?? 0
    service.updateScenarioField("timeSeconds", 0)

    const snapshot = service.currentState()
    const updatedSample = service.sampledStates()[9]?.primaryValue ?? 0

    expect(snapshot.timeSeconds).toBe(0)
    expect(updatedSample).not.toBeCloseTo(initialSample, 6)
  })

  it("updates the active doppler snapshot time before recomputing the frequency profile", () => {
    const service = TestBed.inject(WavesAndAcousticsStateService)
    service.selectScenario("doppler-effect")

    const initialSample = service.sampledStates()[12]?.primaryValue ?? 0
    service.updateScenarioField("timeSeconds", 0.75)

    const snapshot = service.currentState()
    const updatedSample = service.sampledStates()[12]?.primaryValue ?? 0

    expect(snapshot.timeSeconds).toBe(0.75)
    expect(updatedSample).not.toBeCloseTo(initialSample, 6)
  })
})

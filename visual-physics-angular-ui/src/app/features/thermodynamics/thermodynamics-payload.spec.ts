import { buildExportPayload, parseImportPayload } from "./thermodynamics-payload"
import { ThermodynamicsScenario, ThermodynamicsStateSnapshot } from "./thermodynamics.models"

describe("thermodynamics-payload", () => {
  const scenario: ThermodynamicsScenario = {
    id: "ideal-gas-state",
    name: "Ideal Gas State Evolution",
    summary: "Summary",
    equationSummary: "PV = nRT",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea: "Focus",
    amountMoles: 1,
    temperatureKelvin: 320,
    volumeCubicMeters: 0.024,
    molarMassKgPerMol: 0.02897,
  }
  const snapshot: ThermodynamicsStateSnapshot = {
    timeSeconds: 0,
    pressureKpa: 110,
    densityKgPerM3: 1.2,
    internalEnergyKj: 4,
    rmsSpeedMs: 525,
    compressibilityFactor: 1,
    stable: true,
  }

  it("round-trips a thermodynamics export payload", () => {
    const payload = buildExportPayload(
      scenario,
      snapshot,
      { showPressureCurve: true, showParticleGuide: true, showEnergyGuide: false },
      [],
    )

    const parsed = parseImportPayload(JSON.stringify(payload))
    expect(parsed.scenario.id).toBe("ideal-gas-state")
    expect(parsed.snapshot.timeSeconds).toBe(0)
    expect(parsed.overlays?.showEnergyGuide).toBe(false)
  })

  it("rejects malformed thermodynamics payloads", () => {
    expect(() => parseImportPayload('{"scenario": {}}')).toThrow("Invalid payload")
  })

  it("accepts a transient heat-conduction payload with restored time", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "heat-conduction-slab",
          name: "Transient Heat Conduction in a Slab",
          summary: "Summary",
          equationSummary: "Fo = alpha t / L_c^2",
          status: "Implemented",
          durationSeconds: 240,
          viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
          focusArea: "Focus",
          slabThicknessMeters: 0.08,
          thermalConductivityWPerMK: 1.35,
          thermalDiffusivityM2PerS: 0.0000012,
          initialTemperatureCelsius: 25,
          boundaryTemperatureCelsius: 145,
        },
        snapshot: { timeSeconds: 120 },
        overlays: {
          showPressureCurve: true,
          showParticleGuide: false,
          showEnergyGuide: true,
        },
      }),
    )

    expect(parsed.scenario.id).toBe("heat-conduction-slab")
    expect(parsed.snapshot.timeSeconds).toBe(120)
  })

  it("accepts a Carnot-cycle payload with restored time", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "carnot-cycle",
          name: "Carnot Cycle",
          summary: "Summary",
          equationSummary: "eta = 1 - T_c/T_h",
          status: "Implemented",
          durationSeconds: 400,
          viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
          focusArea: "Focus",
          amountMoles: 1.2,
          hotReservoirTemperatureKelvin: 600,
          coldReservoirTemperatureKelvin: 320,
          cycleMinVolumeCubicMeters: 0.015,
          cycleVolumeRatio: 2.2,
        },
        snapshot: { timeSeconds: 250 },
        overlays: {
          showPressureCurve: true,
          showParticleGuide: true,
          showEnergyGuide: false,
        },
      }),
    )

    expect(parsed.scenario.id).toBe("carnot-cycle")
    expect(parsed.snapshot.timeSeconds).toBe(250)
  })
})

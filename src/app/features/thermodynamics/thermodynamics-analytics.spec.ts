import { buildInsightCards } from "./thermodynamics-analytics"

describe("thermodynamics-analytics", () => {
  it("builds ideal-gas insight cards", () => {
    const cards = buildInsightCards(
      {
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
      },
      {
        timeSeconds: 0,
        pressureKpa: 110,
        densityKgPerM3: 1.2,
        internalEnergyKj: 4,
        rmsSpeedMs: 525,
        compressibilityFactor: 1,
        stable: true,
      },
    )

    expect(cards.length).toBe(4)
    expect(cards[0].label).toContain("Pressure")
    expect(cards[3].value).toContain("Z 1.000")
  })

  it("builds heat-conduction insight cards", () => {
    const cards = buildInsightCards(
      {
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
      {
        timeSeconds: 120,
        centerTemperatureCelsius: 87,
        surfaceTemperatureCelsius: 145,
        heatFluxWPerM2: 2000,
        fourierNumber: 0.09,
        normalizedTemperature: 0.48,
        stable: false,
      },
    )

    expect(cards.length).toBe(4)
    expect(cards[0].label).toContain("Center")
    expect(cards[2].value).toContain("Fo")
  })

  it("builds Carnot-cycle insight cards", () => {
    const cards = buildInsightCards(
      {
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
      {
        timeSeconds: 180,
        volumeCubicMeters: 0.03,
        pressureKpa: 160,
        internalEnergyKj: 10,
        thermalEfficiency: 0.4667,
        absorbedHeatKj: 4.7,
        rejectedHeatKj: 2.5,
        netWorkKj: 2.2,
        entropyTransferKjPerK: 0.0078,
        cycleStageLabel: "Adiabatic expansion",
        stable: true,
      },
    )

    expect(cards.length).toBe(4)
    expect(cards[0].value).toContain("%")
    expect(cards[3].value).toContain("Adiabatic")
  })
})

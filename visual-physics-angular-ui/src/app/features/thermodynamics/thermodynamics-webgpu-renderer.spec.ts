import { buildThermodynamicsViewportGeometry } from "./thermodynamics-webgpu-renderer"

describe("thermodynamics-webgpu-renderer", () => {
  it("builds viewport geometry for the ideal-gas slice", () => {
    const geometry = buildThermodynamicsViewportGeometry(
      {
        timeSeconds: 0,
        pressureKpa: 110,
        densityKgPerM3: 1.2,
        internalEnergyKj: 4,
        rmsSpeedMs: 525,
        compressibilityFactor: 1,
        stable: true,
      },
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
      { showPressureCurve: true, showParticleGuide: true, showEnergyGuide: true },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the heat-conduction slice", () => {
    const geometry = buildThermodynamicsViewportGeometry(
      {
        timeSeconds: 120,
        centerTemperatureCelsius: 87,
        surfaceTemperatureCelsius: 145,
        heatFluxWPerM2: 2000,
        fourierNumber: 0.09,
        normalizedTemperature: 0.48,
        stable: false,
      },
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
      { showPressureCurve: true, showParticleGuide: true, showEnergyGuide: true },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the Carnot-cycle slice", () => {
    const geometry = buildThermodynamicsViewportGeometry(
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
      { showPressureCurve: true, showParticleGuide: true, showEnergyGuide: true },
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })
})

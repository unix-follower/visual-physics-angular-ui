import {
  buildThermodynamicsReportCsv,
  buildThermodynamicsReportSummaryRows,
} from "./thermodynamics-report"

describe("thermodynamics-report", () => {
  it("builds summary rows for the ideal-gas slice", () => {
    const rows = buildThermodynamicsReportSummaryRows(
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
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "pressure_kpa",
      "density_kg_m3",
      "internal_energy_kj",
      "rms_speed_m_s",
    ])
  })

  it("builds a summary-first CSV export", () => {
    const csv = buildThermodynamicsReportCsv(
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
      [
        {
          timeSeconds: 0,
          volumeCubicMeters: 0.024,
          pressureKpa: 110,
          densityKgPerM3: 1.2,
          internalEnergyKj: 4,
          rmsSpeedMs: 525,
          stable: true,
        },
      ],
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("sample_time_seconds,sample_volume_m3")
  })

  it("builds summary rows and CSV for the heat-conduction slice", () => {
    const rows = buildThermodynamicsReportSummaryRows(
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
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "center_temperature_c",
      "surface_temperature_c",
      "heat_flux_w_m2",
      "fourier_number",
    ])

    const csv = buildThermodynamicsReportCsv(
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
      [
        {
          timeSeconds: 120,
          positionMeters: 0.04,
          temperatureCelsius: 87,
          heatFluxWPerM2: 2000,
          normalizedTemperature: 0.48,
          stable: false,
        },
      ],
    )

    expect(csv).toContain("sample_time_seconds,sample_position_m")
  })

  it("builds summary rows and CSV for the Carnot-cycle slice", () => {
    const rows = buildThermodynamicsReportSummaryRows(
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
      [],
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "thermal_efficiency",
      "absorbed_heat_kj",
      "rejected_heat_kj",
      "net_work_kj",
    ])

    const csv = buildThermodynamicsReportCsv(
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
      [
        {
          timeSeconds: 180,
          volumeCubicMeters: 0.03,
          pressureKpa: 160,
          internalEnergyKj: 10,
          entropyTransferKjPerK: 0.0078,
          stageLabel: "Adiabatic expansion",
          stable: true,
        },
      ],
    )

    expect(csv).toContain("sample_time_seconds,sample_stage,sample_volume_m3")
  })
})

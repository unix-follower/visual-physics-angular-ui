import {
  buildQuantumMechanicsReportCsv,
  buildQuantumMechanicsReportSummaryRows,
} from "./quantum-mechanics-report"

describe("quantum-mechanics-report", () => {
  it("builds particle-in-a-box summary rows", () => {
    const rows = buildQuantumMechanicsReportSummaryRows(
      {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        boxLengthNanometers: 1.2,
        quantumNumber: 2,
      },
      {
        timeSeconds: 0,
        energyLevelEv: 0.23,
        nodeCount: 1,
        boxLengthNanometers: 1.2,
        stable: true,
      },
    )

    expect(rows.map((row) => row.metric)).toEqual(["energy_level", "node_count", "well_length_nm"])
  })

  it("builds tunneling summary rows", () => {
    const rows = buildQuantumMechanicsReportSummaryRows(
      {
        id: "finite-potential-well-tunneling",
        name: "Finite Barrier Tunneling",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        particleEnergyEv: 2.1,
        barrierHeightEv: 3.8,
        barrierWidthNanometers: 0.45,
      },
      {
        timeSeconds: 0,
        transmissionProbability: 0.031,
        reflectionProbability: 0.969,
        barrierHeightEv: 3.8,
        stable: true,
      },
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "transmission_probability",
      "reflection_probability",
      "barrier_height_ev",
    ])
  })

  it("builds a summary-first CSV export for the interference slice", () => {
    const csv = buildQuantumMechanicsReportCsv(
      {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        wavelengthNanometers: 520,
        slitSeparationMicrometers: 120,
        slitWidthMicrometers: 40,
        screenDistanceMeters: 1.8,
      },
      {
        timeSeconds: 0,
        fringeSpacingMillimeters: 7.8,
        centralMaximumWidthMillimeters: 46.8,
        screenDistanceMeters: 1.8,
        stable: true,
      },
      [
        {
          position: 0,
          primaryValue: 1,
          label: "screen-intensity",
          active: true,
        },
      ],
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("fringe_spacing_mm")
    expect(csv).toContain("sampleLabel,position,primaryValue,secondaryValue,active")
    expect(csv).toContain("screen-intensity")
  })
})

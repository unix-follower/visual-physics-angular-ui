import {
  buildWavesAndAcousticsReportCsv,
  buildWavesAndAcousticsReportSummaryRows,
} from "./waves-and-acoustics-report"

describe("waves-and-acoustics-report", () => {
  it("builds standing-wave summary rows", () => {
    const rows = buildWavesAndAcousticsReportSummaryRows(
      {
        id: "standing-wave",
        name: "Standing Wave on a String",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 1, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
      },
      {
        timeSeconds: 0,
        wavelengthMeters: 1.2,
        frequencyHertz: 20,
        harmonicNumber: 2,
        stable: true,
      },
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "snapshot_time_s",
      "frequency_hz",
      "wavelength_m",
      "harmonic_number",
    ])
    expect(rows[0]?.value).toBe("0.000000")
  })

  it("builds traveling-wave summary rows", () => {
    const rows = buildWavesAndAcousticsReportSummaryRows(
      {
        id: "traveling-wave",
        name: "Traveling Wave Pulse Train",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Scaffolded",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 2.4, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 18,
        amplitudeMillimeters: 4,
        frequencyHertz: 6,
      },
      {
        timeSeconds: 0.25,
        waveSpeedMetersPerSecond: 18,
        frequencyHertz: 6,
        wavelengthMeters: 3,
        stable: true,
      },
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "snapshot_time_s",
      "frequency_hz",
      "wavelength_m",
      "wave_speed_m_per_s",
    ])
    expect(rows[0]?.value).toBe("0.250000")
  })

  it("builds a summary-first CSV export for the doppler slice", () => {
    const csv = buildWavesAndAcousticsReportCsv(
      {
        id: "doppler-effect",
        name: "One-Dimensional Doppler Shift",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Scaffolded",
        durationSeconds: 1,
        viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
      },
      {
        timeSeconds: 0,
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
        apparentFrequencyHertz: 464.385382,
        wavelengthMeters: 0.779545,
        stable: true,
      },
      [
        {
          position: -12,
          primaryValue: 440,
          label: "doppler-frequency-shift",
          active: true,
        },
      ],
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("snapshot_time_s")
    expect(csv).toContain("apparent_frequency_hz")
    expect(csv).toContain("sampleLabel,position,primaryValue,secondaryValue,active")
    expect(csv).toContain("doppler-frequency-shift")
  })
})

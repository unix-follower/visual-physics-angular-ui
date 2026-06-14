import { buildExportPayload, parseImportPayload } from "./waves-and-acoustics-payload"

describe("waves-and-acoustics-payload", () => {
  it("builds an export payload with the active scenario, snapshot, overlays, and samples", () => {
    const payload = buildExportPayload(
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
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
        wavelengthMeters: 1.2,
        frequencyHertz: 20,
        stable: true,
      },
      {
        showWaveGuides: true,
        showNodeMarkers: false,
        showReferenceCurve: true,
      },
      [
        {
          position: 0,
          primaryValue: 0,
          label: "standing-wave-profile",
          active: true,
        },
      ],
    )

    expect(payload.scenario.id).toBe("standing-wave")
    expect(payload.overlays.showNodeMarkers).toBe(false)
    expect(payload.samples).toHaveLength(1)
    expect(payload.exportedAt).toMatch(/T/)
  })

  it("parses a valid traveling-wave import payload", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
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
        snapshot: {
          timeSeconds: 0.25,
        },
        overlays: {
          showWaveGuides: true,
          showNodeMarkers: true,
          showReferenceCurve: false,
        },
      }),
    )

    expect(parsed.scenario.id).toBe("traveling-wave")
    expect(parsed.overlays?.showReferenceCurve).toBe(false)
  })

  it("rejects payloads with mismatched scenario fields", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "doppler-effect",
            name: "Doppler",
            summary: "Summary",
            equationSummary: "Equation",
            status: "Scaffolded",
            durationSeconds: 1,
            viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
            focusArea: "Focus",
            waveSpeedMetersPerSecond: 343,
            emittedFrequencyHertz: 440,
            sourceSpeedMetersPerSecond: 18,
          },
          snapshot: { timeSeconds: 0 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })

  it("rejects payloads with non-finite numeric values", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "standing-wave",
            name: "Standing Wave",
            summary: "Summary",
            equationSummary: "Equation",
            status: "Implemented",
            durationSeconds: 1,
            viewBounds: { minX: 0, maxX: 1, minY: -1.2, maxY: 1.2 },
            focusArea: "Focus",
            stringLengthMeters: 1.2,
            waveSpeedMetersPerSecond: 1e309,
            amplitudeMillimeters: 6,
            harmonicNumber: 2,
          },
          snapshot: { timeSeconds: 0 },
        }),
      ),
    ).toThrowError("Invalid payload")

    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "traveling-wave",
            name: "Traveling Wave",
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
          snapshot: { timeSeconds: 1e309 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })
})

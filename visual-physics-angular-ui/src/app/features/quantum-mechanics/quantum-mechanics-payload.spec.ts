import { buildExportPayload, parseImportPayload } from "./quantum-mechanics-payload"

describe("quantum-mechanics-payload", () => {
  it("builds an export payload with the selected scenario, snapshot, overlays, and samples", () => {
    const payload = buildExportPayload(
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
        quantumNumber: 1,
      },
      {
        timeSeconds: 0,
        boxLengthNanometers: 1.2,
        quantumNumber: 1,
        energyLevelEv: 0.2,
        nodeCount: 0,
        stable: true,
      },
      {
        showProbabilityGuide: true,
        showPotentialGuide: false,
        showPhaseGuide: true,
      },
      [
        {
          position: 0,
          primaryValue: 1,
          secondaryValue: 0,
          label: "probability-density",
          active: true,
        },
      ],
    )

    expect(payload.scenario.id).toBe("particle-in-a-box")
    expect(payload.overlays.showPotentialGuide).toBe(false)
    expect(payload.samples).toHaveLength(1)
    expect(payload.exportedAt).toMatch(/T/)
  })

  it("parses a valid tunneling import payload", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
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
        snapshot: {
          timeSeconds: 0,
        },
        overlays: {
          showProbabilityGuide: true,
          showPotentialGuide: true,
          showPhaseGuide: false,
        },
      }),
    )

    expect(parsed.scenario.id).toBe("finite-potential-well-tunneling")
    expect(parsed.overlays?.showPhaseGuide).toBe(false)
  })

  it("rejects payloads with mismatched scenario fields", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "double-slit-interference",
            name: "Double Slit",
            summary: "Summary",
            equationSummary: "Equation",
            status: "Implemented",
            durationSeconds: 1,
            viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
            focusArea: "Focus",
            wavelengthNanometers: 520,
            slitSeparationMicrometers: 120,
            slitWidthMicrometers: 40,
          },
          snapshot: { timeSeconds: 0 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })

  it("rejects payloads with non-finite numeric scenario values", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "double-slit-interference",
            name: "Double Slit",
            summary: "Summary",
            equationSummary: "Equation",
            status: "Implemented",
            durationSeconds: 1e309,
            viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
            focusArea: "Focus",
            wavelengthNanometers: 520,
            slitSeparationMicrometers: 120,
            slitWidthMicrometers: 40,
            screenDistanceMeters: 1.8,
          },
          snapshot: { timeSeconds: 0 },
        }),
      ),
    ).toThrowError("Invalid payload")

    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
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
            barrierWidthNanometers: 1e309,
          },
          snapshot: { timeSeconds: 1e309 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })
})

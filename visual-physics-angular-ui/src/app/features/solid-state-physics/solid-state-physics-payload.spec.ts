import { parseImportPayload } from "./solid-state-physics-payload"

describe("solid-state-physics-payload", () => {
  it("accepts a valid phonon-dispersion payload", () => {
    const payload = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "phonon-dispersion",
          name: "Phonon Dispersion",
          summary: "Imported phonon sweep",
          equationSummary: "omega_a approx omega_max sin(pi k / 2)",
          status: "Imported",
          durationSeconds: 1,
          viewBounds: { minX: 0, maxX: 1, minY: 0, maxY: 12 },
          focusArea: "Imported phonon focus",
          latticeSpacingNanometers: 0.52,
          springConstantNewtonsPerMeter: 22,
          atomicMassAmu: 31,
        },
        snapshot: { timeSeconds: 0.4 },
        overlays: {
          showReferenceGuides: true,
          showActiveMarker: false,
          showComparisonBand: true,
        },
      }),
    )

    expect(payload.scenario.id).toBe("phonon-dispersion")
    expect(payload.snapshot.timeSeconds).toBe(0.4)
    expect(payload.overlays?.showActiveMarker).toBe(false)
  })

  it("rejects malformed or incomplete payloads", () => {
    expect(() => parseImportPayload("{bad json")).toThrowError("Invalid payload")
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: {
            id: "electronic-structure",
            name: "Electronic Structure",
            summary: "Incomplete payload",
            equationSummary: "g(E)",
            status: "Invalid",
            durationSeconds: 1,
            viewBounds: { minX: -1, maxX: 2, minY: 0, maxY: 1 },
            focusArea: "Invalid payload",
            bandGapElectronVolts: 1.2,
            effectiveMassRatio: 0.25,
          },
          snapshot: { timeSeconds: 0.5 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })
})

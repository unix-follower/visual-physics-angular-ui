import { buildExportPayload, parseImportPayload, StaticsOverlayOptions } from "./statics-payload"

describe("statics-payload", () => {
  const overlays: StaticsOverlayOptions = {
    showAppliedForce: true,
    showReactionForces: true,
    showResidualGuides: false,
  }

  it("round-trips statics overlay configuration in exported payloads", () => {
    const payload = buildExportPayload(
      {
        id: "beam-support",
        name: "Beam Support Equilibrium",
        summary: "Beam test",
        equationSummary: "Sigma F = 0",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -1, maxX: 11, minY: -4, maxY: 4 },
        focusArea: "Reaction forces",
        initialPosition: { x: 5, y: 0 },
        appliedForce: { x: 0, y: -12 },
        anchorPoint: { x: 1, y: 0 },
        secondaryPoint: { x: 9, y: 0 },
        loadPosition: 5,
        loadMagnitude: 12,
      },
      {
        timeSeconds: 0,
        position: { x: 5, y: 0 },
        appliedForce: { x: 0, y: -12 },
        primaryReactionForce: { x: 0, y: 6 },
        secondaryReactionForce: { x: 0, y: 6 },
        residualForce: { x: 0, y: 0 },
        residualTorque: 0,
        stable: true,
      },
      overlays,
      [
        {
          timeSeconds: 0,
          residualForceMagnitude: 0,
          residualTorque: 0,
          stable: true,
        },
      ],
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.snapshot.timeSeconds).toBeCloseTo(0)
    expect(parsed.overlays).toEqual(overlays)
    expect(parsed.scenario.id).toBe("beam-support")
  })

  it("accepts pulley payloads with an explicit secondary mass", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "pulley-equilibrium",
          name: "Pulley Equilibrium",
          summary: "Pulley test",
          equationSummary: "T_left = T_right",
          status: "Test",
          durationSeconds: 1,
          viewBounds: { minX: -4, maxX: 4, minY: -8, maxY: 4 },
          focusArea: "Tension balance",
          initialPosition: { x: 0, y: -2 },
          appliedForce: { x: 0, y: -19.62 },
          anchorPoint: { x: -2, y: -4 },
          secondaryPoint: { x: 2, y: -4 },
          mass: 1,
          secondaryMass: 1.5,
        },
        snapshot: { timeSeconds: 0 },
      }),
    )

    expect(parsed.scenario.id).toBe("pulley-equilibrium")
    expect(parsed.scenario.secondaryMass).toBeCloseTo(1.5, 6)
  })

  it("rejects payloads with malformed overlay flags", () => {
    const malformed = JSON.stringify({
      scenario: {
        id: "beam-support",
        name: "Beam Support Equilibrium",
        summary: "Test",
        equationSummary: "Sigma F = 0",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -1, maxX: 11, minY: -4, maxY: 4 },
        focusArea: "Reaction forces",
        initialPosition: { x: 5, y: 0 },
        appliedForce: { x: 0, y: -12 },
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showAppliedForce: true,
        showReactionForces: "yes",
        showResidualGuides: false,
      },
    })

    expect(() => parseImportPayload(malformed)).toThrowError("Invalid payload")
  })
})

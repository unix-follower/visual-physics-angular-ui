import {
  buildExportPayload,
  ElectromagnetismOverlayOptions,
  parseImportPayload,
} from "./electromagnetism-payload"

describe("electromagnetism-payload", () => {
  const overlays: ElectromagnetismOverlayOptions = {
    showFieldVectors: true,
    showMagneticField: false,
    showForceVectors: true,
    showPotentialGuides: true,
    showTrajectory: false,
  }

  it("round-trips electromagnetism overlay configuration in exported payloads", () => {
    const payload = buildExportPayload(
      {
        id: "moving-charge-magnetic-field",
        name: "Moving Charge In Magnetic Field",
        summary: "Test magnetic motion",
        equationSummary: "F = q v x B",
        status: "Test",
        durationSeconds: 6,
        viewBounds: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
        focusArea: "Lorentz force",
        initialPosition: { x: -3, y: 0 },
        initialVelocity: { x: 2.4, y: 1.2 },
        chargeMagnitude: 1,
        mass: 1,
        magneticFieldStrength: 1.5,
      },
      {
        timeSeconds: 1,
        position: { x: -1.5, y: 1.2 },
        electricField: { x: 0, y: 0 },
        magneticField: { x: 0, y: 1.5 },
        force: { x: 1.8, y: -0.6 },
        potential: 0,
        fieldMagnitude: 1.5,
        forceMagnitude: 1.897,
        energy: 3.2,
        stable: false,
      },
      overlays,
      [
        {
          timeSeconds: 0,
          xPosition: -3,
          yPosition: 0,
          fieldMagnitude: 1.5,
          forceMagnitude: 3,
          potential: 0,
        },
      ],
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.snapshot.timeSeconds).toBeCloseTo(1, 6)
    expect(parsed.overlays).toEqual(overlays)
    expect(parsed.scenario.id).toBe("moving-charge-magnetic-field")
  })

  it("accepts capacitor payloads with scenario-specific fields", () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "capacitor-potential-field",
          name: "Capacitor Potential Field",
          summary: "Capacitor test",
          equationSummary: "E = V / d",
          status: "Test",
          durationSeconds: 1,
          viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
          focusArea: "Uniform field",
          initialPosition: { x: 0, y: 0 },
          plateSeparation: 2.5,
          potentialDifference: 14,
        },
        snapshot: { timeSeconds: 0 },
      }),
    )

    expect(parsed.scenario.id).toBe("capacitor-potential-field")
    expect(parsed.scenario.plateSeparation).toBeCloseTo(2.5, 6)
    expect(parsed.scenario.potentialDifference).toBeCloseTo(14, 6)
  })

  it("accepts current-loop and induction payloads with probe and time-specific fields", () => {
    const loopParsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "current-loop-magnetic-field",
          name: "Current Loop Magnetic Field",
          summary: "Loop test",
          equationSummary: "B = mu0 I / 2R",
          status: "Test",
          durationSeconds: 1,
          viewBounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
          focusArea: "Loop field",
          initialPosition: { x: 0, y: 0 },
          probePoint: { x: 1.2, y: 2.4 },
          current: 5,
          loopRadius: 1.6,
        },
        snapshot: { timeSeconds: 0 },
      }),
    )

    const inductionParsed = parseImportPayload(
      JSON.stringify({
        scenario: {
          id: "electromagnetic-induction",
          name: "Electromagnetic Induction",
          summary: "Induction test",
          equationSummary: "emf = -L dPhi / dt",
          status: "Test",
          durationSeconds: 6,
          viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
          focusArea: "Induced emf",
          initialPosition: { x: 0, y: 0 },
          probePoint: { x: 0, y: 0 },
          fluxRate: 3.4,
          inductance: 1.8,
        },
        snapshot: { timeSeconds: 2.5 },
      }),
    )

    expect(loopParsed.scenario.probePoint?.x).toBeCloseTo(1.2, 6)
    expect(loopParsed.scenario.probePoint?.y).toBeCloseTo(2.4, 6)
    expect(inductionParsed.snapshot.timeSeconds).toBeCloseTo(2.5, 6)
    expect(inductionParsed.scenario.durationSeconds).toBeCloseTo(6, 6)
  })

  it("rejects payloads with malformed electromagnetism overlay flags", () => {
    const malformed = JSON.stringify({
      scenario: {
        id: "electromagnetic-induction",
        name: "Electromagnetic Induction",
        summary: "Test",
        equationSummary: "emf = -L dPhi / dt",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
        focusArea: "Induced emf",
        initialPosition: { x: 0, y: 0 },
        fluxRate: 2.5,
        inductance: 1.2,
      },
      snapshot: { timeSeconds: 0 },
      overlays: {
        showFieldVectors: true,
        showMagneticField: "yes",
        showForceVectors: true,
        showPotentialGuides: true,
        showTrajectory: false,
      },
    })

    expect(() => parseImportPayload(malformed)).toThrowError("Invalid payload")
  })
})

import { buildExportPayload, parseImportPayload } from "./dynamics-payload"
import { DynamicsOverlayOptions } from "./dynamics-webgpu-renderer"

describe("dynamics-payload", () => {
  const overlays: DynamicsOverlayOptions = {
    showMomentumVector: true,
    showVelocityVector: false,
    showForceVector: true,
    showScenarioGuides: false,
  }

  it("round-trips overlay configuration in exported payloads", () => {
    const payload = buildExportPayload(
      {
        id: "orbital-motion",
        name: "Orbital Motion",
        summary: "Gravity-driven orbit",
        equationSummary: 'm x" = -μ m r / |r|^3',
        durationSeconds: 8,
        viewBounds: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
        mass: 1,
        initialPosition: { x: 4, y: 0 },
        initialVelocity: { x: 0, y: 2.2 },
        orbitalCenter: { x: 0, y: 0 },
        gravitationalParameter: 18,
      },
      {
        timeSeconds: 1.2,
        position: { x: 3.3, y: 1.1 },
        velocity: { x: -0.6, y: 2.0 },
        acceleration: { x: -1.2, y: -0.4 },
        netForce: { x: -1.2, y: -0.4 },
        momentum: { x: -0.6, y: 2.0 },
        speed: 2.08806130178211,
        kineticEnergy: 2.18,
        potentialEnergy: -4.4,
        totalEnergy: -2.22,
      },
      overlays,
      [
        {
          timeSeconds: 0,
          xPosition: 4,
          yPosition: 0,
          speed: 2.2,
          totalEnergy: -2.2,
        },
      ],
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.snapshot.timeSeconds).toBeCloseTo(1.2)
    expect(parsed.overlays).toEqual(overlays)
    expect(parsed.scenario.id).toBe("orbital-motion")
  })

  it("rejects payloads with malformed overlay flags", () => {
    const malformed = JSON.stringify({
      scenario: {
        id: "constant-force",
        name: "Constant Force Motion",
        summary: "Test",
        equationSummary: 'm x" = F',
        durationSeconds: 5,
        viewBounds: { minX: -1, maxX: 5, minY: -1, maxY: 5 },
        mass: 1,
        initialPosition: { x: 0, y: 0 },
        initialVelocity: { x: 1, y: 0 },
        netForce: { x: 1, y: 0 },
      },
      snapshot: { timeSeconds: 1 },
      overlays: {
        showMomentumVector: true,
        showVelocityVector: "yes",
        showForceVector: true,
        showScenarioGuides: true,
      },
    })

    expect(() => parseImportPayload(malformed)).toThrowError("Invalid payload")
  })
})

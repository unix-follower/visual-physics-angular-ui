import { buildStaticsViewportGeometry, StaticsViewportGeometry } from "./statics-webgpu-renderer"
import { StaticsScenario, StaticsStateSnapshot } from "./statics.models"
import { StaticsOverlayOptions } from "./statics-payload"

const overlays: StaticsOverlayOptions = {
  showAppliedForce: true,
  showReactionForces: true,
  showResidualGuides: true,
}

describe("statics-webgpu-renderer geometry", () => {
  it("builds beam-support geometry with beam lines and support/load markers", () => {
    const geometry = buildStaticsViewportGeometry(
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
      overlays,
    )

    expect(geometry.lineVertices.length).toBe(28)
    expect(geometry.markerVertices.length).toBe(36)
    expect(Array.from(geometry.lineVertices)).toContain(0)
  })

  it("builds inclined-plane geometry with ramp lines and a body marker", () => {
    const geometry = buildStaticsViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 3, y: 2 },
        appliedForce: { x: 0, y: -19.62 },
        primaryReactionForce: { x: -8.4957, y: 14.715 },
        secondaryReactionForce: { x: 8.4957, y: 4.905 },
        residualForce: { x: 0, y: 0 },
        residualTorque: 0,
        stable: true,
      },
      {
        id: "inclined-plane",
        name: "Inclined Plane Equilibrium",
        summary: "Incline test",
        equationSummary: "Sigma F = 0",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -2, maxX: 8, minY: -2, maxY: 6 },
        focusArea: "Contact forces",
        initialPosition: { x: 3, y: 2 },
        appliedForce: { x: 0, y: -9.8 },
        anchorPoint: { x: 0, y: 0 },
        mass: 2,
        angleDegrees: 30,
        frictionCoefficient: 0.7,
      },
      overlays,
    )

    expect(geometry.lineVertices.length).toBe(28)
    expect(geometry.markerVertices.length).toBe(24)
    expect(Math.max(...Array.from(geometry.lineVertices))).toBeGreaterThan(0.2)
  })

  it("builds pulley geometry with rope guides and three markers", () => {
    const geometry = buildStaticsViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 0, y: -2 },
        appliedForce: { x: 0, y: -24.525 },
        primaryReactionForce: { x: 0, y: 9.81 },
        secondaryReactionForce: { x: 0, y: 9.81 },
        residualForce: { x: 0, y: -4.905 },
        residualTorque: 0,
        stable: false,
      },
      {
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
      overlays,
    )

    expect(geometry.lineVertices.length).toBe(36)
    expect(geometry.markerVertices.length).toBe(36)
    expect(minY(geometry)).toBeLessThan(-0.25)
  })
})

function minY(geometry: StaticsViewportGeometry): number {
  const values = Array.from(geometry.lineVertices)
  let minimum = Number.POSITIVE_INFINITY
  for (let index = 1; index < values.length; index += 2) {
    minimum = Math.min(minimum, values[index])
  }
  return minimum
}

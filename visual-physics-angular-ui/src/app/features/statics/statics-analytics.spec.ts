import { buildGraphPath, buildInsightCards } from "./statics-analytics"

describe("statics-analytics", () => {
  it("builds a residual graph path from statics samples", () => {
    const path = buildGraphPath(
      [
        { timeSeconds: 0, residualForceMagnitude: 0.4, residualTorque: 0.2, stable: false },
        { timeSeconds: 0.5, residualForceMagnitude: 0.1, residualTorque: 0.05, stable: true },
      ],
      "residualForceMagnitude",
    )

    expect(path).toContain("M 0.00")
    expect(path).toContain("L 320.00")
  })

  it("builds beam-support insight cards with support split detail", () => {
    const cards = buildInsightCards(
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
    )

    expect(cards.some((card) => card.label === "Support split")).toBe(true)
    expect(cards.some((card) => card.value.includes("6.00 N / 6.00 N"))).toBe(true)
  })

  it("builds inclined-plane insight cards with plane-angle detail", () => {
    const cards = buildInsightCards(
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
    )

    expect(cards.some((card) => card.label === "Plane angle")).toBe(true)
    expect(cards.some((card) => card.value === "30.0 deg")).toBe(true)
  })

  it("builds pulley insight cards with constraint regime detail", () => {
    const cards = buildInsightCards(
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
        appliedForce: { x: 0, y: -24.525 },
        anchorPoint: { x: -2, y: -4 },
        secondaryPoint: { x: 2, y: -4 },
        mass: 1,
        secondaryMass: 1.5,
      },
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
    )

    expect(cards.some((card) => card.label === "Constraint regime")).toBe(true)
    expect(cards.some((card) => card.value === "Unbalanced tension")).toBe(true)
  })
})

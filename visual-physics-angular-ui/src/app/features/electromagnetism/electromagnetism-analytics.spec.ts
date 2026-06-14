import { buildGraphPath, buildInsightCards } from "./electromagnetism-analytics"

describe("electromagnetism-analytics", () => {
  it("builds a field graph path from electromagnetism samples", () => {
    const path = buildGraphPath(
      [
        {
          timeSeconds: 0,
          xPosition: 0,
          yPosition: 0,
          fieldMagnitude: 0.5,
          forceMagnitude: 0.2,
          potential: 1.4,
        },
        {
          timeSeconds: 1,
          xPosition: 1,
          yPosition: 1,
          fieldMagnitude: 1.5,
          forceMagnitude: 0.6,
          potential: 0.8,
        },
      ],
      "fieldMagnitude",
    )

    expect(path).toContain("M 0.00")
    expect(path).toContain("L 320.00")
  })

  it("builds current-loop insight cards with loop-current detail", () => {
    const cards = buildInsightCards(
      {
        id: "current-loop-magnetic-field",
        name: "Current Loop Magnetic Field",
        summary: "Loop test",
        equationSummary: "B = mu0 I / 2R",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
        focusArea: "Loop field",
        initialPosition: { x: 0, y: 0 },
        current: 4,
        loopRadius: 1.8,
      },
      {
        timeSeconds: 0,
        position: { x: 0, y: 0 },
        electricField: { x: 0, y: 0 },
        magneticField: { x: 0, y: 1.4 },
        force: { x: 0, y: 0 },
        potential: 0,
        fieldMagnitude: 1.4,
        forceMagnitude: 0,
        energy: 14.4,
        stable: true,
      },
    )

    expect(cards.some((card) => card.label === "Loop current")).toBe(true)
    expect(cards.some((card) => card.value === "4.00 A")).toBe(true)
  })

  it("builds capacitor insight cards with plate-separation detail", () => {
    const cards = buildInsightCards(
      {
        id: "capacitor-potential-field",
        name: "Capacitor Potential Field",
        summary: "Capacitor test",
        equationSummary: "E = V / d",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
        focusArea: "Uniform field",
        initialPosition: { x: 0, y: 0 },
        plateSeparation: 2,
        potentialDifference: 12,
      },
      {
        timeSeconds: 0,
        position: { x: 0, y: 0 },
        electricField: { x: 0, y: 6 },
        magneticField: { x: 0, y: 0 },
        force: { x: 0, y: 6 },
        potential: 12,
        fieldMagnitude: 6,
        forceMagnitude: 6,
        energy: 72,
        stable: true,
      },
    )

    expect(cards.some((card) => card.label === "Plate separation")).toBe(true)
    expect(cards.some((card) => card.value === "2.00 m")).toBe(true)
  })

  it("builds induction insight cards with flux-change detail", () => {
    const cards = buildInsightCards(
      {
        id: "electromagnetic-induction",
        name: "Electromagnetic Induction",
        summary: "Induction test",
        equationSummary: "emf = -L dPhi / dt",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
        focusArea: "Induced emf",
        initialPosition: { x: 0, y: 0 },
        fluxRate: 2.5,
        inductance: 1.2,
      },
      {
        timeSeconds: 0,
        position: { x: 0, y: 0 },
        electricField: { x: -3, y: 0 },
        magneticField: { x: 0, y: 2.5 },
        force: { x: -3, y: 0 },
        potential: -3,
        fieldMagnitude: 2.5,
        forceMagnitude: 3,
        energy: 3.75,
        stable: true,
      },
    )

    expect(cards.some((card) => card.label === "Flux change")).toBe(true)
    expect(cards.some((card) => card.value === "2.50 Wb/s")).toBe(true)
  })
})

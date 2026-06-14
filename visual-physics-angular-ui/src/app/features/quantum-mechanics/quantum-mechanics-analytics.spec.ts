import { buildInsightCards } from "./quantum-mechanics-analytics"

describe("quantum-mechanics-analytics", () => {
  it("builds particle-in-a-box insight cards", () => {
    const cards = buildInsightCards(
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
        quantumNumber: 2,
      },
      {
        timeSeconds: 0,
        energyLevelEv: 1.234,
        nodeCount: 1,
        deBroglieWavelengthNanometers: 1.2,
        stable: true,
      },
    )

    expect(cards.map((card) => card.label)).toEqual([
      "Energy Level",
      "Node Count",
      "de Broglie Wavelength",
    ])
    expect(cards[0]?.value).toBe("1.234 eV")
  })

  it("builds tunneling insight cards", () => {
    const cards = buildInsightCards(
      {
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
      {
        timeSeconds: 0,
        transmissionProbability: 0.031,
        reflectionProbability: 0.969,
        decayLengthNanometers: 0.087,
        stable: true,
      },
    )

    expect(cards.map((card) => card.label)).toEqual(["Transmission", "Reflection", "Decay Length"])
    expect(cards[0]?.value).toBe("3.10%")
  })

  it("builds double-slit insight cards", () => {
    const cards = buildInsightCards(
      {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        wavelengthNanometers: 520,
        slitSeparationMicrometers: 120,
        slitWidthMicrometers: 40,
        screenDistanceMeters: 1.8,
      },
      {
        timeSeconds: 0,
        fringeSpacingMillimeters: 7.8,
        centralMaximumWidthMillimeters: 46.8,
        coherenceEstimate: 3,
        stable: true,
      },
    )

    expect(cards.map((card) => card.label)).toEqual([
      "Fringe Spacing",
      "Central Maximum",
      "Coherence Ratio",
    ])
    expect(cards[2]?.value).toBe("3.00")
  })
})

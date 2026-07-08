import { buildInsightCards } from "./plasma-physics-analytics"

describe("plasma-physics-analytics", () => {
  it("builds oscillation insight cards with collective diagnostics", () => {
    const cards = buildInsightCards(
      {
        id: "plasma-oscillation",
        name: "Plasma Oscillation",
        summary: "Collective test slice",
        equationSummary: "omega_p",
        status: "Test",
        durationSeconds: 1,
        focusArea: "Oscillation focus",
        electronDensityPerCubicMeter: 3.2e18,
        electronTemperatureElectronVolts: 6,
        perturbationAmplitudePercent: 12,
      },
      {
        timeSeconds: 0.35,
        plasmaFrequencyGigahertz: 16.07,
        oscillationPeriodNanoseconds: 0.06,
        restoringFieldKilovoltsPerMeter: 1.11,
        stable: true,
      },
    )

    expect(cards.map((card) => card.title)).toEqual([
      "Plasma frequency",
      "Oscillation period",
      "Restoring field",
    ])
    expect(cards[0]?.value).toContain("GHz")
  })

  it("builds confinement insight cards with safety-factor detail", () => {
    const cards = buildInsightCards(
      {
        id: "magnetic-confinement",
        name: "Magnetic Confinement",
        summary: "Confinement test slice",
        equationSummary: "q ~ BR / I",
        status: "Test",
        durationSeconds: 1,
        focusArea: "Confinement focus",
        magneticFieldTesla: 3.6,
        plasmaCurrentMegaAmperes: 1.4,
        majorRadiusMeters: 2.8,
      },
      {
        timeSeconds: 0.55,
        larmorRadiusMillimeters: 1.31,
        betaPercent: 1.33,
        safetyFactor: 36,
        stable: false,
      },
    )

    expect(cards.some((card) => card.title === "Safety factor")).toBe(true)
    expect(cards.some((card) => card.value.includes("%"))).toBe(true)
  })
})

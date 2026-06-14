import { buildInsightCards } from "./fluid-mechanics-analytics"
import { FluidMechanicsScenario } from "./fluid-mechanics.models"

describe("fluid-mechanics-analytics", () => {
  const scenario: FluidMechanicsScenario = {
    id: "buoyancy-block",
    name: "Buoyancy of a Floating Block",
    summary: "Balance buoyant force and weight.",
    equationSummary: "Fb = rho g V",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea: "Buoyancy",
    fluidDensity: 1000,
    blockDensity: 600,
    gravity: 9.81,
    blockWidth: 1.2,
    blockHeight: 1.2,
    blockDepth: 0.8,
  }

  it("builds stable-floating insight cards", () => {
    const cards = buildInsightCards(scenario, {
      timeSeconds: 0,
      submersionDepth: 0.72,
      displacedVolume: 0.6912,
      buoyantForce: 6780.672,
      weightForce: 6780.672,
      netForce: 0,
      immersionRatio: 0.6,
      equilibriumDepth: 0.72,
      stable: true,
    })

    expect(cards[0].label).toBe("Stable float")
    expect(cards[0].value).toContain("60.0% immersed")
  })

  it("describes sinking behavior when the block is too dense", () => {
    const cards = buildInsightCards(scenario, {
      timeSeconds: 0,
      submersionDepth: 1.2,
      displacedVolume: 1.152,
      buoyantForce: 11301.12,
      weightForce: 13561.344,
      netForce: -2260.224,
      immersionRatio: 1,
      equilibriumDepth: 1.2,
      stable: false,
    })

    expect(cards[0].label).toBe("Sinking tendency")
    expect(cards[0].detail).toContain("denser than the surrounding fluid")
  })

  it("builds laminar pipe-flow insight cards", () => {
    const cards = buildInsightCards(
      {
        id: "poiseuille-pipe",
        name: "Laminar Pipe Flow",
        summary: "Estimate steady laminar pipe flow.",
        equationSummary: "Q = pi R^4 DeltaP / (8 mu L)",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 10 },
        focusArea: "Pipe flow",
        fluidDensity: 998,
        pipeRadius: 0.045,
        pipeLength: 12,
        pressureDrop: 180,
        dynamicViscosity: 0.001,
      },
      {
        timeSeconds: 0,
        volumetricFlowRate: 0.0048,
        averageVelocity: 0.75,
        centerlineVelocity: 1.5,
        reynoldsNumber: 900,
        pressureGradient: 15,
        stable: true,
      },
    )

    expect(cards[0].label).toBe("Laminar regime")
    expect(cards[0].value).toContain("Re 900")
    expect(cards[1].label).toBe("Volumetric flow rate")
  })

  it("builds open-channel insight cards", () => {
    const cards = buildInsightCards(
      {
        id: "open-channel-flow",
        name: "Uniform Open-Channel Flow",
        summary: "Uniform flow in a rectangular channel.",
        equationSummary: "Q = (1 / n) A R_h^(2/3) S^(1/2)",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 18, minY: 0, maxY: 10 },
        focusArea: "Open channel",
        gravity: 9.81,
        channelWidth: 3,
        channelDepth: 1.2,
        channelSlope: 0.0015,
        roughnessCoefficient: 0.03,
        channelLength: 30,
      },
      {
        timeSeconds: 0,
        discharge: 3.541,
        hydraulicRadius: 0.667,
        averageVelocity: 0.984,
        froudeNumber: 0.287,
        stable: true,
      },
    )

    expect(cards[0].label).toBe("Subcritical regime")
    expect(cards[0].value).toContain("Fr 0.29")
    expect(cards[1].label).toBe("Discharge")
  })
})

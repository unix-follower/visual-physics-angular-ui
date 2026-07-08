import { buildExportPayload, parseImportPayload } from "./fluid-mechanics-payload"
import { FluidMechanicsScenario, FluidMechanicsStateSnapshot } from "./fluid-mechanics.models"

describe("fluid-mechanics-payload", () => {
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

  const snapshot: FluidMechanicsStateSnapshot = {
    timeSeconds: 0,
    submersionDepth: 0.72,
    displacedVolume: 0.6912,
    buoyantForce: 6780.672,
    weightForce: 6780.672,
    netForce: 0,
    immersionRatio: 0.6,
    equilibriumDepth: 0.72,
    stable: true,
  }

  it("round-trips a valid payload", () => {
    const payload = buildExportPayload(
      scenario,
      snapshot,
      { showForceGuides: true, showWaterline: true, showEquilibriumGuide: false },
      [],
    )
    const imported = parseImportPayload(JSON.stringify(payload))

    expect(imported.scenario.id).toBe("buoyancy-block")
    expect(imported.scenario.fluidDensity).toBe(1000)
    expect(imported.overlays?.showEquilibriumGuide).toBe(false)
  })

  it("rejects malformed payloads", () => {
    expect(() =>
      parseImportPayload(
        JSON.stringify({
          scenario: { ...scenario, fluidDensity: "water" },
          snapshot: { timeSeconds: 0 },
        }),
      ),
    ).toThrowError("Invalid payload")
  })

  it("round-trips a pipe-flow payload", () => {
    const payload = buildExportPayload(
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
      { showForceGuides: true, showWaterline: true, showEquilibriumGuide: true },
      [],
    )
    const imported = parseImportPayload(JSON.stringify(payload))

    expect(imported.scenario.id).toBe("poiseuille-pipe")
    expect(imported.scenario.pipeRadius).toBe(0.045)
    expect(imported.scenario.dynamicViscosity).toBe(0.001)
  })

  it("round-trips an open-channel payload", () => {
    const payload = buildExportPayload(
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
      { showForceGuides: true, showWaterline: true, showEquilibriumGuide: true },
      [],
    )
    const imported = parseImportPayload(JSON.stringify(payload))

    expect(imported.scenario.id).toBe("open-channel-flow")
    expect(imported.scenario.channelWidth).toBe(3)
    expect(imported.scenario.roughnessCoefficient).toBe(0.03)
  })
})

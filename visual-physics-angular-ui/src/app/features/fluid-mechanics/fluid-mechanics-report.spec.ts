import {
  buildFluidMechanicsReportCsv,
  buildFluidMechanicsReportSummaryRows,
} from "./fluid-mechanics-report"
import {
  FluidMechanicsSample,
  FluidMechanicsScenario,
  FluidMechanicsStateSnapshot,
} from "./fluid-mechanics.models"

describe("fluid-mechanics-report", () => {
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

  const samples: FluidMechanicsSample[] = [
    {
      timeSeconds: 0,
      submersionDepth: 0,
      displacedVolume: 0,
      buoyantForce: 0,
      weightForce: 6780.672,
      netForce: -6780.672,
      immersionRatio: 0,
      stable: false,
    },
    {
      timeSeconds: 0.72,
      submersionDepth: 0.72,
      displacedVolume: 0.6912,
      buoyantForce: 6780.672,
      weightForce: 6780.672,
      netForce: 0,
      immersionRatio: 0.6,
      stable: true,
    },
  ]

  it("builds summary rows for the buoyancy slice", () => {
    const rows = buildFluidMechanicsReportSummaryRows(scenario, snapshot, samples)

    expect(rows.map((row) => row.metric)).toContain("equilibrium_depth_m")
    expect(rows.map((row) => row.metric)).toContain("immersion_ratio")
  })

  it("builds a summary-first CSV export", () => {
    const csv = buildFluidMechanicsReportCsv(scenario, snapshot, samples)

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("summary,equilibrium_depth_m")
    expect(csv).toContain("sample_submersion_depth_m")
  })

  it("builds a pipe-flow summary and axial-pressure CSV export", () => {
    const pipeScenario: FluidMechanicsScenario = {
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
    }
    const pipeSnapshot: FluidMechanicsStateSnapshot = {
      timeSeconds: 0,
      volumetricFlowRate: 0.0048,
      averageVelocity: 0.75,
      centerlineVelocity: 1.5,
      reynoldsNumber: 900,
      pressureGradient: 15,
      stable: true,
    }
    const pipeSamples: FluidMechanicsSample[] = [
      {
        timeSeconds: 0,
        axialPosition: 0,
        pressure: 180,
        averageVelocity: 0.75,
        reynoldsNumber: 900,
        stable: true,
      },
      {
        timeSeconds: 1,
        axialPosition: 12,
        pressure: 0,
        averageVelocity: 0.75,
        reynoldsNumber: 900,
        stable: true,
      },
    ]

    const rows = buildFluidMechanicsReportSummaryRows(pipeScenario, pipeSnapshot, pipeSamples)
    const csv = buildFluidMechanicsReportCsv(pipeScenario, pipeSnapshot, pipeSamples)

    expect(rows.map((row) => row.metric)).toContain("volumetric_flow_rate_m3_s")
    expect(rows.map((row) => row.metric)).toContain("reynolds_number")
    expect(csv).toContain("sample_axial_position_m")
    expect(csv).toContain("summary,pressure_gradient_pa_m")
  })

  it("builds an open-channel summary and axial-elevation CSV export", () => {
    const channelScenario: FluidMechanicsScenario = {
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
    }
    const channelSnapshot: FluidMechanicsStateSnapshot = {
      timeSeconds: 0,
      discharge: 3.541,
      hydraulicRadius: 0.667,
      averageVelocity: 0.984,
      froudeNumber: 0.287,
      stable: true,
    }
    const channelSamples: FluidMechanicsSample[] = [
      {
        timeSeconds: 0,
        axialPosition: 0,
        bedElevation: 0,
        waterSurfaceElevation: 1.2,
        averageVelocity: 0.984,
        froudeNumber: 0.287,
        stable: true,
      },
      {
        timeSeconds: 1,
        axialPosition: 30,
        bedElevation: -0.045,
        waterSurfaceElevation: 1.155,
        averageVelocity: 0.984,
        froudeNumber: 0.287,
        stable: true,
      },
    ]

    const rows = buildFluidMechanicsReportSummaryRows(
      channelScenario,
      channelSnapshot,
      channelSamples,
    )
    const csv = buildFluidMechanicsReportCsv(channelScenario, channelSnapshot, channelSamples)

    expect(rows.map((row) => row.metric)).toContain("discharge_m3_s")
    expect(rows.map((row) => row.metric)).toContain("froude_number")
    expect(csv).toContain("sample_bed_elevation_m")
    expect(csv).toContain("summary,channel_slope")
  })
})

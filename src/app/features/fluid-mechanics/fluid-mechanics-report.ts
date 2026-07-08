import {
  FluidMechanicsSample,
  FluidMechanicsScenario,
  FluidMechanicsStateSnapshot,
} from "./fluid-mechanics.models"

export interface FluidMechanicsReportSummaryRow {
  metric: string
  label: string
  displayValue: string
  csvValue: string
  detail: string
}

export function buildFluidMechanicsReportSummaryRows(
  scenario: FluidMechanicsScenario,
  snapshot: FluidMechanicsStateSnapshot,
  _samples: readonly FluidMechanicsSample[],
): FluidMechanicsReportSummaryRow[] {
  if (scenario.id === "open-channel-flow") {
    return [
      {
        metric: "discharge_m3_s",
        label: "Discharge",
        displayValue: `${(snapshot.discharge ?? 0).toFixed(4)} m^3/s`,
        csvValue: (snapshot.discharge ?? 0).toFixed(6),
        detail:
          "Predicted uniform-flow discharge for the rectangular channel under Manning-style roughness assumptions.",
      },
      {
        metric: "average_velocity_m_s",
        label: "Average velocity",
        displayValue: `${(snapshot.averageVelocity ?? 0).toFixed(4)} m/s`,
        csvValue: (snapshot.averageVelocity ?? 0).toFixed(6),
        detail: "Mean streamwise speed based on discharge divided by flow area.",
      },
      {
        metric: "hydraulic_radius_m",
        label: "Hydraulic radius",
        displayValue: `${(snapshot.hydraulicRadius ?? 0).toFixed(4)} m`,
        csvValue: (snapshot.hydraulicRadius ?? 0).toFixed(6),
        detail: "Wetted area divided by wetted perimeter for the active rectangular section.",
      },
      {
        metric: "froude_number",
        label: "Froude number",
        displayValue: `${(snapshot.froudeNumber ?? 0).toFixed(4)}`,
        csvValue: (snapshot.froudeNumber ?? 0).toFixed(6),
        detail: snapshot.stable
          ? "Below one, so the flow remains subcritical and gravity waves can travel upstream."
          : "Above one, so the flow becomes supercritical and rapidly varied effects become more important.",
      },
      {
        metric: "channel_slope",
        label: "Channel slope",
        displayValue: `${(scenario.channelSlope ?? 0).toFixed(5)}`,
        csvValue: (scenario.channelSlope ?? 0).toFixed(6),
        detail: "Bed slope driving the gravity-dominated open-channel conveyance.",
      },
    ]
  }

  if (scenario.id === "poiseuille-pipe") {
    return [
      {
        metric: "volumetric_flow_rate_m3_s",
        label: "Volumetric flow rate",
        displayValue: `${(snapshot.volumetricFlowRate ?? 0).toExponential(3)} m^3/s`,
        csvValue: (snapshot.volumetricFlowRate ?? 0).toFixed(9),
        detail: "Steady laminar flow rate predicted by the Poiseuille solution.",
      },
      {
        metric: "average_velocity_m_s",
        label: "Average velocity",
        displayValue: `${(snapshot.averageVelocity ?? 0).toFixed(4)} m/s`,
        csvValue: (snapshot.averageVelocity ?? 0).toFixed(6),
        detail: "Cross-section averaged axial velocity in the circular pipe.",
      },
      {
        metric: "reynolds_number",
        label: "Reynolds number",
        displayValue: `${(snapshot.reynoldsNumber ?? 0).toFixed(1)}`,
        csvValue: (snapshot.reynoldsNumber ?? 0).toFixed(6),
        detail:
          "Laminar validity check for the current density, viscosity, radius, and mean velocity.",
      },
      {
        metric: "pressure_gradient_pa_m",
        label: "Pressure gradient",
        displayValue: `${(snapshot.pressureGradient ?? 0).toFixed(3)} Pa/m`,
        csvValue: (snapshot.pressureGradient ?? 0).toFixed(6),
        detail: "Linear axial pressure drop applied over the selected pipe length.",
      },
      {
        metric: "pipe_radius_m",
        label: "Pipe radius",
        displayValue: `${(scenario.pipeRadius ?? 0).toFixed(3)} m`,
        csvValue: (scenario.pipeRadius ?? 0).toFixed(6),
        detail: "The flow rate sensitivity is strongest with respect to this radius term.",
      },
    ]
  }

  return [
    {
      metric: "equilibrium_depth_m",
      label: "Equilibrium depth",
      displayValue: `${(snapshot.equilibriumDepth ?? 0).toFixed(3)} m`,
      csvValue: (snapshot.equilibriumDepth ?? 0).toFixed(6),
      detail: "Required submersion depth for the displaced-fluid weight to match the block weight.",
    },
    {
      metric: "immersion_ratio",
      label: "Immersion ratio",
      displayValue: `${((snapshot.immersionRatio ?? 0) * 100).toFixed(1)}%`,
      csvValue: (snapshot.immersionRatio ?? 0).toFixed(6),
      detail:
        "Fraction of the block height lying below the waterline at the active equilibrium state.",
    },
    {
      metric: "displaced_volume_m3",
      label: "Displaced volume",
      displayValue: `${(snapshot.displacedVolume ?? 0).toFixed(3)} m^3`,
      csvValue: (snapshot.displacedVolume ?? 0).toFixed(6),
      detail: "Submerged block volume that determines the buoyant response.",
    },
    {
      metric: "net_force_n",
      label: "Net force",
      displayValue: `${(snapshot.netForce ?? 0).toFixed(3)} N`,
      csvValue: (snapshot.netForce ?? 0).toFixed(6),
      detail: snapshot.stable
        ? "Near-zero net force confirms static floating equilibrium."
        : "Negative net force shows that even full submersion cannot support the block.",
    },
    {
      metric: "fluid_density_kg_m3",
      label: "Fluid density",
      displayValue: `${(scenario.fluidDensity ?? 0).toFixed(1)} kg/m^3`,
      csvValue: (scenario.fluidDensity ?? 0).toFixed(6),
      detail: "Reference fluid density used for the Archimedes balance.",
    },
  ]
}

export function buildFluidMechanicsReportCsv(
  scenario: FluidMechanicsScenario,
  snapshot: FluidMechanicsStateSnapshot,
  samples: readonly FluidMechanicsSample[],
): string {
  const summaryRows = buildFluidMechanicsReportSummaryRows(scenario, snapshot, samples)
  const sampleHeader =
    scenario.id === "open-channel-flow"
      ? "sample_axial_position_m,sample_bed_elevation_m,sample_water_surface_elevation_m,sample_average_velocity_m_s,sample_froude_number,stable"
      : scenario.id === "poiseuille-pipe"
        ? "sample_axial_position_m,sample_pressure_pa,sample_average_velocity_m_s,sample_reynolds_number,stable"
        : "sample_submersion_depth_m,sample_displaced_volume_m3,sample_buoyant_force_n,sample_weight_force_n,sample_net_force_n,sample_immersion_ratio,stable"
  const sampleRows =
    scenario.id === "open-channel-flow"
      ? samples.map((sample) =>
          [
            (sample.axialPosition ?? 0).toFixed(6),
            (sample.bedElevation ?? 0).toFixed(6),
            (sample.waterSurfaceElevation ?? 0).toFixed(6),
            (sample.averageVelocity ?? 0).toFixed(6),
            (sample.froudeNumber ?? 0).toFixed(6),
            sample.stable ? "true" : "false",
          ].join(","),
        )
      : scenario.id === "poiseuille-pipe"
        ? samples.map((sample) =>
            [
              (sample.axialPosition ?? 0).toFixed(6),
              (sample.pressure ?? 0).toFixed(6),
              (sample.averageVelocity ?? 0).toFixed(6),
              (sample.reynoldsNumber ?? 0).toFixed(6),
              sample.stable ? "true" : "false",
            ].join(","),
          )
        : samples.map((sample) =>
            [
              (sample.submersionDepth ?? 0).toFixed(6),
              (sample.displacedVolume ?? 0).toFixed(6),
              (sample.buoyantForce ?? 0).toFixed(6),
              (sample.weightForce ?? 0).toFixed(6),
              (sample.netForce ?? 0).toFixed(6),
              (sample.immersionRatio ?? 0).toFixed(6),
              sample.stable ? "true" : "false",
            ].join(","),
          )
  const lines = [
    "category,metric,label,value,detail",
    ...summaryRows.map(
      (row) =>
        `summary,${row.metric},${escapeCsv(row.label)},${row.csvValue},${escapeCsv(row.detail)}`,
    ),
    "",
    sampleHeader,
    ...sampleRows,
  ]

  return lines.join("\n")
}

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

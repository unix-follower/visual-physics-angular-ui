import {
  QuantumMechanicsSample,
  QuantumMechanicsScenario,
  QuantumMechanicsStateSnapshot,
} from "./quantum-mechanics.models"

interface ReportSummaryRow {
  metric: string
  label: string
  value: number | string
  detail: string
}

function escapeCsv(value: string | number): string {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

export function buildQuantumMechanicsReportCsv(
  scenario: QuantumMechanicsScenario,
  snapshot: QuantumMechanicsStateSnapshot,
  samples: readonly QuantumMechanicsSample[],
): string {
  const summaryRows = buildQuantumMechanicsReportSummaryRows(scenario, snapshot)
  const summarySection = summaryRows
    .map(
      (row) =>
        `${escapeCsv("summary")},${escapeCsv(row.metric)},${escapeCsv(row.label)},${escapeCsv(row.value)},${escapeCsv(row.detail)}`,
    )
    .join("\n")
  const samplesSection = samples
    .map(
      (sample) =>
        `${escapeCsv(sample.label)},${sample.position},${sample.primaryValue},${sample.secondaryValue ?? ""},${sample.active}`,
    )
    .join("\n")

  return [
    "category,metric,label,value,detail",
    summarySection,
    "",
    "sampleLabel,position,primaryValue,secondaryValue,active",
    samplesSection,
  ]
    .filter((line) => line.length > 0 || line === "")
    .join("\n")
}

export function buildQuantumMechanicsReportSummaryRows(
  scenario: QuantumMechanicsScenario,
  snapshot: QuantumMechanicsStateSnapshot,
): readonly ReportSummaryRow[] {
  if (scenario.id === "particle-in-a-box") {
    return [
      {
        metric: "energy_level",
        label: "Energy level",
        value: (snapshot.energyLevelEv ?? 0).toFixed(6),
        detail: "Bound-state energy for the chosen stationary mode.",
      },
      {
        metric: "node_count",
        label: "Node count",
        value: snapshot.nodeCount ?? 0,
        detail: "Number of interior probability nodes.",
      },
      {
        metric: "well_length_nm",
        label: "Well length",
        value: (snapshot.boxLengthNanometers ?? 0).toFixed(6),
        detail: "Rigid-wall separation used for the 1D box.",
      },
    ]
  }

  if (scenario.id === "finite-potential-well-tunneling") {
    return [
      {
        metric: "transmission_probability",
        label: "Transmission probability",
        value: (snapshot.transmissionProbability ?? 0).toFixed(6),
        detail: "Approximate tunneling probability through the rectangular barrier.",
      },
      {
        metric: "reflection_probability",
        label: "Reflection probability",
        value: (snapshot.reflectionProbability ?? 0).toFixed(6),
        detail: "Complementary reflected probability.",
      },
      {
        metric: "barrier_height_ev",
        label: "Barrier height",
        value: (snapshot.barrierHeightEv ?? 0).toFixed(6),
        detail: "Barrier height above the reference zero level.",
      },
    ]
  }

  return [
    {
      metric: "fringe_spacing_mm",
      label: "Fringe spacing",
      value: (snapshot.fringeSpacingMillimeters ?? 0).toFixed(6),
      detail: "Screen separation between neighboring bright fringes.",
    },
    {
      metric: "central_maximum_width_mm",
      label: "Central maximum width",
      value: (snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(6),
      detail: "Envelope-limited width of the brightest central interference lobe.",
    },
    {
      metric: "screen_distance_m",
      label: "Screen distance",
      value: (snapshot.screenDistanceMeters ?? 0).toFixed(6),
      detail: "Source-to-screen propagation distance.",
    },
  ]
}

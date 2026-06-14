import { RelativitySample, RelativityScenario, RelativityStateSnapshot } from "./relativity.models"

export interface RelativityReportSummaryRow {
  metric: string
  label: string
  displayValue: string
  csvValue: string
  detail: string
}

function escapeCsv(value: string | number): string {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

export function buildRelativityReportSummaryRows(
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
): readonly RelativityReportSummaryRow[] {
  if (scenario.id === "relativistic-doppler") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        displayValue: `${snapshot.timeSeconds.toFixed(3)} s`,
        csvValue: snapshot.timeSeconds.toFixed(6),
        detail: "Static analytic Doppler slice uses zero dynamic time.",
      },
      {
        metric: "relative_velocity_fraction_c",
        label: "Relative velocity",
        displayValue: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
        csvValue: (snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(6),
        detail: "Effective source-observer velocity after relativistic composition.",
      },
      {
        metric: "observed_frequency_hz",
        label: "Observed frequency",
        displayValue: `${(snapshot.observedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        csvValue: (snapshot.observedFrequencyHertz ?? 0).toFixed(6),
        detail: "Relativistic longitudinal Doppler prediction for the active geometry.",
      },
      {
        metric: "classical_frequency_hz",
        label: "Classical comparison",
        displayValue: `${(snapshot.classicalObservedFrequencyHertz ?? 0).toFixed(2)} Hz`,
        csvValue: (snapshot.classicalObservedFrequencyHertz ?? 0).toFixed(6),
        detail: "Classical comparison frequency for the same relative speed.",
      },
      {
        metric: "shift_ratio",
        label: "Shift ratio",
        displayValue: (snapshot.shiftRatio ?? 0).toFixed(4),
        csvValue: (snapshot.shiftRatio ?? 0).toFixed(6),
        detail: "Observed-to-emitted frequency ratio for the active relativistic motion state.",
      },
    ]
  }

  if (scenario.id === "gravitational-time-dilation") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Coordinate time",
        displayValue: `${snapshot.timeSeconds.toFixed(3)} s`,
        csvValue: snapshot.timeSeconds.toFixed(6),
        detail: "Far-field elapsed time used as the comparison interval.",
      },
      {
        metric: "gravitational_factor",
        label: "Gravitational factor",
        displayValue: (snapshot.gravitationalTimeFactor ?? 0).toFixed(4),
        csvValue: (snapshot.gravitationalTimeFactor ?? 0).toFixed(6),
        detail: "Clock-rate suppression relative to a far-field observer.",
      },
      {
        metric: "local_elapsed_time_s",
        label: "Local elapsed time",
        displayValue: `${(snapshot.localElapsedTimeSeconds ?? 0).toFixed(3)} s`,
        csvValue: (snapshot.localElapsedTimeSeconds ?? 0).toFixed(6),
        detail: "Elapsed proper time for a clock at the selected radius.",
      },
      {
        metric: "orbital_radius_rs",
        label: "Active radius",
        displayValue: `${(snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(2)} r_s`,
        csvValue: (snapshot.orbitalRadiusSchwarzschildRadii ?? 0).toFixed(6),
        detail: "Selected orbital radius expressed in Schwarzschild-radius units.",
      },
      {
        metric: "schwarzschild_radius_km",
        label: "Schwarzschild radius",
        displayValue: `${(snapshot.schwarzschildRadiusKilometers ?? 0).toFixed(2)} km`,
        csvValue: (snapshot.schwarzschildRadiusKilometers ?? 0).toFixed(6),
        detail: "Characteristic radius for the chosen central mass.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Proper time",
      displayValue: `${snapshot.timeSeconds.toFixed(3)} s`,
      csvValue: snapshot.timeSeconds.toFixed(6),
      detail: "Clock time measured in the moving frame.",
    },
    {
      metric: "lorentz_factor_gamma",
      label: "Lorentz factor",
      displayValue: (snapshot.lorentzFactorGamma ?? 0).toFixed(4),
      csvValue: (snapshot.lorentzFactorGamma ?? 0).toFixed(6),
      detail: "Relativistic scaling factor linking proper and coordinate time.",
    },
    {
      metric: "dilated_time_s",
      label: "Dilated time",
      displayValue: `${(snapshot.dilatedTimeSeconds ?? 0).toFixed(3)} s`,
      csvValue: (snapshot.dilatedTimeSeconds ?? 0).toFixed(6),
      detail: "Elapsed time measured in the rest frame of the observer.",
    },
    {
      metric: "velocity_fraction_c",
      label: "Velocity fraction of c",
      displayValue: `${(snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(3)} c`,
      csvValue: (snapshot.relativeVelocityFractionOfLight ?? 0).toFixed(6),
      detail: "Signed inertial speed normalized by the speed of light.",
    },
    {
      metric: "time_gap_s",
      label: "Time gap",
      displayValue: `${(snapshot.timeDifferenceSeconds ?? 0).toFixed(4)} s`,
      csvValue: (snapshot.timeDifferenceSeconds ?? 0).toFixed(6),
      detail: "Difference between the dilated observer time and the moving clock proper time.",
    },
  ]
}

export function buildRelativityReportCsv(
  scenario: RelativityScenario,
  snapshot: RelativityStateSnapshot,
  samples: readonly RelativitySample[],
): string {
  const summaryRows = buildRelativityReportSummaryRows(scenario, snapshot)
  const summarySection = summaryRows
    .map(
      (row) =>
        `${escapeCsv("summary")},${escapeCsv(row.metric)},${escapeCsv(row.label)},${escapeCsv(row.csvValue)},${escapeCsv(row.detail)}`,
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

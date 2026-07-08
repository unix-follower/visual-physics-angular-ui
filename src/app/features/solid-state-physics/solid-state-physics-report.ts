import {
  SolidStatePhysicsReportRow,
  SolidStatePhysicsSample,
  SolidStatePhysicsScenario,
  SolidStatePhysicsStateSnapshot,
} from "./solid-state-physics.models"

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toFixed(6)
}

function formatRange(min: number, max: number): string {
  return `${min.toFixed(6)}..${max.toFixed(6)}`
}

export function buildSolidStatePhysicsReportSummaryRows(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
): readonly SolidStatePhysicsReportRow[] {
  if (scenario.id === "phonon-dispersion") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active reduced wave-vector position for the dispersion sweep.",
      },
      {
        metric: "wave_vector_fraction",
        label: "Wave vector",
        value: formatNumber(snapshot.waveVectorFraction),
        detail: "Reduced Brillouin-zone position for the active phonon sample.",
      },
      {
        metric: "acoustic_frequency_thz",
        label: "Acoustic frequency",
        value: formatNumber(snapshot.acousticFrequencyTerahertz),
        detail: "Acoustic branch frequency at the active wave-vector.",
      },
      {
        metric: "optical_frequency_thz",
        label: "Optical frequency",
        value: formatNumber(snapshot.opticalFrequencyTerahertz),
        detail: "Optical branch frequency at the active wave-vector.",
      },
      {
        metric: "group_velocity_km_s",
        label: "Group velocity",
        value: formatNumber(snapshot.groupVelocityKilometersPerSecond),
        detail: "Slope-derived transport speed for the active acoustic branch sample.",
      },
    ]
  }

  if (scenario.id === "electronic-structure") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active inspected energy position for the band-structure slice.",
      },
      {
        metric: "energy_ev",
        label: "Energy",
        value: formatNumber(snapshot.energyElectronVolts),
        detail: "Active inspected energy coordinate.",
      },
      {
        metric: "density_of_states_au",
        label: "Density of states",
        value: formatNumber(snapshot.densityOfStatesArbitraryUnits),
        detail: "Density-of-states estimate at the active energy.",
      },
      {
        metric: "occupation_probability",
        label: "Occupation probability",
        value: formatNumber(snapshot.occupationProbability),
        detail: "Fermi-like occupation estimate at the active energy sample.",
      },
      {
        metric: "band_gap_ev",
        label: "Band gap",
        value: formatNumber(scenario.bandGapElectronVolts),
        detail: "Scenario-configured band-gap separation used for the current DOS slice.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Snapshot time",
      value: formatNumber(snapshot.timeSeconds),
      detail: "Active inspected strain position on the stress-strain curve.",
    },
    {
      metric: "stress_mpa",
      label: "Stress",
      value: formatNumber(snapshot.stressMegapascals),
      detail: "Stress at the active strain point.",
    },
    {
      metric: "elastic_energy_density_mj_m3",
      label: "Elastic energy density",
      value: formatNumber(snapshot.elasticEnergyDensityMegajoulesPerCubicMeter),
      detail: "Stored elastic energy density at the active strain point.",
    },
    {
      metric: "max_strain_percent",
      label: "Max strain",
      value: formatNumber(scenario.maxStrainPercent),
      detail: "Scenario-configured strain envelope used for the deterministic material sweep.",
    },
    {
      metric: "yield_strength_mpa",
      label: "Yield strength",
      value: formatNumber(scenario.yieldStrengthMegapascals),
      detail: "Yield comparison guide used to contextualize the active stress sample.",
    },
  ]
}

export function buildSolidStatePhysicsReportCsv(
  scenario: SolidStatePhysicsScenario,
  snapshot: SolidStatePhysicsStateSnapshot,
  samples: readonly SolidStatePhysicsSample[],
): string {
  const summaryRows = buildSolidStatePhysicsReportSummaryRows(scenario, snapshot)
  const lines = ["category,metric,label,value,detail"]
  const activeSample = samples.find((sample) => sample.active) ?? samples[0]
  const primaryValues = samples.map((sample) => sample.primaryValue)
  const secondaryValues = samples
    .map((sample) => sample.secondaryValue)
    .filter((value): value is number => value !== undefined)

  for (const row of summaryRows) {
    lines.push(`"summary","${row.metric}","${row.label}","${row.value}","${row.detail}"`)
  }

  lines.push("", "sampleLabel,position,primaryValue,secondaryValue,active")
  for (const sample of samples) {
    lines.push(
      `"${sample.label}",${sample.position},${sample.primaryValue},${sample.secondaryValue ?? ""},${sample.active}`,
    )
  }

  lines.push("", "category,metric,label,value,detail")
  lines.push(
    `"report_stats","sample_count","Sample count","${samples.length}","Deterministic samples included in the current Solid State report export."`,
  )
  lines.push(
    `"report_stats","active_sample_position","Active sample position","${formatNumber(activeSample?.position)}","Position of the active sample encoded in the sampled profile section."`,
  )
  lines.push(
    `"report_stats","primary_value_range","Primary value range","${formatRange(Math.min(...primaryValues), Math.max(...primaryValues))}","Range covered by the primary sampled values in the current report export."`,
  )
  if (secondaryValues.length > 0) {
    lines.push(
      `"report_stats","secondary_value_range","Secondary value range","${formatRange(Math.min(...secondaryValues), Math.max(...secondaryValues))}","Range covered by the secondary comparison values in the current report export."`,
    )
  }

  return lines.join("\n")
}

import {
  AtmosphericPhysicsReportRow,
  AtmosphericPhysicsSample,
  AtmosphericPhysicsScenario,
  AtmosphericPhysicsStateSnapshot,
} from "./atmospheric-physics.models"

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toFixed(6)
}

export function buildAtmosphericPhysicsReportSummaryRows(
  scenario: AtmosphericPhysicsScenario,
  snapshot: AtmosphericPhysicsStateSnapshot,
): readonly AtmosphericPhysicsReportRow[] {
  if (scenario.id === "adiabatic-lapse-rate") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active inspected altitude position for the lapse-rate profile.",
      },
      {
        metric: "temperature_k",
        label: "Temperature",
        value: formatNumber(snapshot.temperatureKelvin),
        detail: "Dry-adiabatic profile temperature at the active altitude.",
      },
      {
        metric: "reference_temperature_k",
        label: "Reference temperature",
        value: formatNumber(snapshot.referenceTemperatureKelvin),
        detail: "Comparison environmental profile at the active altitude.",
      },
    ]
  }

  if (scenario.id === "convection-column") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active parcel time within the convective ascent cycle.",
      },
      {
        metric: "parcel_altitude_km",
        label: "Parcel altitude",
        value: formatNumber(snapshot.parcelAltitudeKilometers),
        detail: "Current parcel altitude in the convective column.",
      },
      {
        metric: "updraft_velocity_m_s",
        label: "Updraft velocity",
        value: formatNumber(snapshot.updraftVelocityMetersPerSecond),
        detail: "Current updraft speed for the active parcel.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Snapshot time",
      value: formatNumber(snapshot.timeSeconds),
      detail: "Active inspected altitude for the pressure profile.",
    },
    {
      metric: "pressure_kpa",
      label: "Pressure",
      value: formatNumber(snapshot.pressureKilopascals),
      detail: "Atmospheric pressure at the active altitude.",
    },
    {
      metric: "relative_density",
      label: "Relative density",
      value: formatNumber(snapshot.relativeDensity),
      detail: "Density ratio relative to sea-level conditions.",
    },
  ]
}

export function buildAtmosphericPhysicsReportCsv(
  scenario: AtmosphericPhysicsScenario,
  snapshot: AtmosphericPhysicsStateSnapshot,
  samples: readonly AtmosphericPhysicsSample[],
): string {
  const summaryRows = buildAtmosphericPhysicsReportSummaryRows(scenario, snapshot)
  const lines = ["category,metric,label,value,detail"]

  for (const row of summaryRows) {
    lines.push(`"summary","${row.metric}","${row.label}","${row.value}","${row.detail}"`)
  }

  lines.push("", "sampleLabel,position,primaryValue,secondaryValue,active")
  for (const sample of samples) {
    lines.push(
      `"${sample.label}",${sample.position},${sample.primaryValue},${sample.secondaryValue ?? ""},${sample.active}`,
    )
  }

  return lines.join("\n")
}

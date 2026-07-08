import {
  AstrophysicsSample,
  AstrophysicsScenario,
  AstrophysicsStateSnapshot,
} from "./astrophysics.models"

export interface AstrophysicsReportSummaryRow {
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

export function buildAstrophysicsReportSummaryRows(
  scenario: AstrophysicsScenario,
  snapshot: AstrophysicsStateSnapshot,
): readonly AstrophysicsReportSummaryRow[] {
  const snapshotTimeRow = {
    metric: "snapshot_time_s",
    label: "Snapshot time",
    displayValue: `${snapshot.timeSeconds.toFixed(3)} s`,
    csvValue: snapshot.timeSeconds.toFixed(6),
    detail: "Active snapshot time used for the sampled scenario state.",
  } satisfies AstrophysicsReportSummaryRow

  if (scenario.id === "stellar-luminosity") {
    return [
      snapshotTimeRow,
      {
        metric: "luminosity_solar_units",
        label: "Luminosity",
        displayValue: `${(snapshot.luminositySolarUnits ?? 0).toFixed(3)} Lsun`,
        csvValue: (snapshot.luminositySolarUnits ?? 0).toFixed(6),
        detail: "Total stellar luminosity relative to the Sun.",
      },
      {
        metric: "inner_habitable_zone_au",
        label: "Inner habitable edge",
        displayValue: `${(snapshot.habitableZoneInnerAstronomicalUnits ?? 0).toFixed(3)} AU`,
        csvValue: (snapshot.habitableZoneInnerAstronomicalUnits ?? 0).toFixed(6),
        detail: "Conservative inner edge for Earth-like irradiance assumptions.",
      },
      {
        metric: "outer_habitable_zone_au",
        label: "Outer habitable edge",
        displayValue: `${(snapshot.habitableZoneOuterAstronomicalUnits ?? 0).toFixed(3)} AU`,
        csvValue: (snapshot.habitableZoneOuterAstronomicalUnits ?? 0).toFixed(6),
        detail: "Approximate outer edge for retained surface heating.",
      },
    ]
  }

  if (scenario.id === "hubble-expansion") {
    return [
      snapshotTimeRow,
      {
        metric: "distance_mpc",
        label: "Distance",
        displayValue: `${(snapshot.distanceMegaparsecs ?? 0).toFixed(1)} Mpc`,
        csvValue: (snapshot.distanceMegaparsecs ?? 0).toFixed(6),
        detail: "Proper distance used in the Hubble-law estimate.",
      },
      {
        metric: "recession_velocity_km_s",
        label: "Recession velocity",
        displayValue: `${(snapshot.recessionVelocityKilometersPerSecond ?? 0).toFixed(2)} km/s`,
        csvValue: (snapshot.recessionVelocityKilometersPerSecond ?? 0).toFixed(6),
        detail: "Approximate recession speed from the active Hubble constant.",
      },
      {
        metric: "redshift",
        label: "Approximate redshift",
        displayValue: (snapshot.redshift ?? 0).toFixed(4),
        csvValue: (snapshot.redshift ?? 0).toFixed(6),
        detail: "Low-redshift approximation z ~= v/c for the active distance.",
      },
    ]
  }

  return [
    {
      ...snapshotTimeRow,
      detail: "Current orbit snapshot time within the sampled trajectory cycle.",
    },
    {
      metric: "orbital_period_days",
      label: "Orbital period",
      displayValue: `${(snapshot.orbitalPeriodDays ?? 0).toFixed(3)} days`,
      csvValue: (snapshot.orbitalPeriodDays ?? 0).toFixed(6),
      detail: "Time required to complete one full orbit around the selected star.",
    },
    {
      metric: "orbital_speed_km_s",
      label: "Orbital speed",
      displayValue: `${(snapshot.orbitalSpeedKilometersPerSecond ?? 0).toFixed(3)} km/s`,
      csvValue: (snapshot.orbitalSpeedKilometersPerSecond ?? 0).toFixed(6),
      detail: "Circular-orbit speed implied by the selected central mass and orbital radius.",
    },
    {
      metric: "escape_speed_km_s",
      label: "Escape speed",
      displayValue: `${(snapshot.escapeSpeedKilometersPerSecond ?? 0).toFixed(3)} km/s`,
      csvValue: (snapshot.escapeSpeedKilometersPerSecond ?? 0).toFixed(6),
      detail: "Escape speed at the same orbital radius for comparison with the bound orbit speed.",
    },
    {
      metric: "specific_orbital_energy_mj_kg",
      label: "Specific orbital energy",
      displayValue: `${(snapshot.specificOrbitalEnergyMegajoulesPerKilogram ?? 0).toFixed(4)} MJ/kg`,
      csvValue: (snapshot.specificOrbitalEnergyMegajoulesPerKilogram ?? 0).toFixed(6),
      detail: "Specific binding energy for the selected orbit.",
    },
  ]
}

export function buildAstrophysicsReportCsv(
  scenario: AstrophysicsScenario,
  snapshot: AstrophysicsStateSnapshot,
  samples: readonly AstrophysicsSample[],
): string {
  const summaryRows = buildAstrophysicsReportSummaryRows(scenario, snapshot)
  const summarySection = summaryRows
    .map(
      (row) =>
        `${escapeCsv("summary")},${escapeCsv(row.metric)},${escapeCsv(row.label)},${escapeCsv(row.csvValue)},${escapeCsv(row.detail)}`,
    )
    .join("\n")
  const sampleSection = samples
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
    sampleSection,
  ]
    .filter((line) => line.length > 0 || line === "")
    .join("\n")
}

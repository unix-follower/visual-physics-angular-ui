import {
  PlasmaPhysicsReportRow,
  PlasmaPhysicsSample,
  PlasmaPhysicsScenario,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toFixed(6)
}

export function buildPlasmaPhysicsReportSummaryRows(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
): readonly PlasmaPhysicsReportRow[] {
  if (scenario.id === "debye-screening") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active screening cursor within the probe-shielding sweep.",
      },
      {
        metric: "debye_length_mm",
        label: "Debye length",
        value: formatNumber(snapshot.debyeLengthMillimeters),
        detail: "Characteristic shielding length for the active plasma state.",
      },
      {
        metric: "shielding_fraction",
        label: "Shielding fraction",
        value: formatNumber(snapshot.shieldingFraction),
        detail: "Fraction of the probe potential shielded at the active radius.",
      },
    ]
  }

  if (scenario.id === "magnetic-confinement") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active confinement cursor within the simplified toroidal slice.",
      },
      {
        metric: "larmor_radius_mm",
        label: "Larmor radius",
        value: formatNumber(snapshot.larmorRadiusMillimeters),
        detail: "Gyroradius estimate for the active confinement state.",
      },
      {
        metric: "safety_factor",
        label: "Safety factor",
        value: formatNumber(snapshot.safetyFactor),
        detail: "Simple confinement-quality cue for the active plasma column.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Snapshot time",
      value: formatNumber(snapshot.timeSeconds),
      detail: "Active collective-oscillation cursor in the shared plasma sweep.",
    },
    {
      metric: "plasma_frequency_ghz",
      label: "Plasma frequency",
      value: formatNumber(snapshot.plasmaFrequencyGigahertz),
      detail: "Collective oscillation frequency for the active electron density.",
    },
    {
      metric: "restoring_field_kv_m",
      label: "Restoring field",
      value: formatNumber(snapshot.restoringFieldKilovoltsPerMeter),
      detail: "Effective restoring field strength for the active perturbation.",
    },
  ]
}

export function buildPlasmaPhysicsReportCsv(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
  samples: readonly PlasmaPhysicsSample[],
): string {
  const summaryRows = buildPlasmaPhysicsReportSummaryRows(scenario, snapshot)
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

import {
  NuclearAndParticlePhysicsReportRow,
  NuclearAndParticlePhysicsSample,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

function formatNumber(value: number | undefined): string {
  return (value ?? 0).toFixed(6)
}

export function buildNuclearAndParticlePhysicsReportSummaryRows(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
): readonly NuclearAndParticlePhysicsReportRow[] {
  if (scenario.id === "binding-energy-curve") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active structure-scan cursor for the selected nucleus.",
      },
      {
        metric: "total_binding_energy_mev",
        label: "Total binding energy",
        value: formatNumber(snapshot.totalBindingEnergyMeV),
        detail: "Total estimated binding energy for the active nucleus.",
      },
      {
        metric: "stability_index",
        label: "Stability index",
        value: formatNumber(snapshot.stabilityIndex),
        detail: "Simple proton-fraction stability cue for the current slice.",
      },
    ]
  }

  if (scenario.id === "proton-proton-collision") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: formatNumber(snapshot.timeSeconds),
        detail: "Active collider-event cursor within the simplified event sweep.",
      },
      {
        metric: "invariant_mass_gev",
        label: "Invariant mass",
        value: formatNumber(snapshot.invariantMassGeV),
        detail: "Derived event mass scale for the active scattering geometry.",
      },
      {
        metric: "transverse_momentum_gev",
        label: "Transverse momentum",
        value: formatNumber(snapshot.transverseMomentumGeV),
        detail: "Transverse event momentum derived from the current angle.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Snapshot time",
      value: formatNumber(snapshot.timeSeconds),
      detail: "Active decay cursor within the shared half-life sweep.",
    },
    {
      metric: "remaining_fraction",
      label: "Remaining fraction",
      value: formatNumber(snapshot.remainingFraction),
      detail: "Residual isotope fraction after the active elapsed time.",
    },
    {
      metric: "activity_tbq",
      label: "Activity",
      value: formatNumber(snapshot.activityTerabecquerels),
      detail: "Estimated activity for the active decay sample.",
    },
  ]
}

export function buildNuclearAndParticlePhysicsReportCsv(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
  samples: readonly NuclearAndParticlePhysicsSample[],
): string {
  const summaryRows = buildNuclearAndParticlePhysicsReportSummaryRows(scenario, snapshot)
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

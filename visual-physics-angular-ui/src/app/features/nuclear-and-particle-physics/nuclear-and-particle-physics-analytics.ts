import {
  NuclearAndParticlePhysicsInsightCard,
  NuclearAndParticlePhysicsScenario,
  NuclearAndParticlePhysicsStateSnapshot,
} from "./nuclear-and-particle-physics.models"

function formatNumber(value: number | undefined, digits = 2): string {
  return (value ?? 0).toFixed(digits)
}

export function buildInsightCards(
  scenario: NuclearAndParticlePhysicsScenario,
  snapshot: NuclearAndParticlePhysicsStateSnapshot,
): readonly NuclearAndParticlePhysicsInsightCard[] {
  if (scenario.id === "binding-energy-curve") {
    return [
      {
        title: "Total binding energy",
        value: `${formatNumber(snapshot.totalBindingEnergyMeV, 1)} MeV`,
        detail: "Tracks the aggregate binding estimate for the active nucleus.",
      },
      {
        title: "Stability index",
        value: formatNumber(snapshot.stabilityIndex, 2),
        detail: "Summarizes how close the proton fraction sits to the starter stability band.",
      },
      {
        title: "Mass scale",
        value: `${scenario.massNumber ?? 0}`,
        detail: "Keeps the active nuclear-structure slice anchored to its selected mass number.",
      },
    ]
  }

  if (scenario.id === "proton-proton-collision") {
    return [
      {
        title: "Invariant mass",
        value: `${formatNumber(snapshot.invariantMassGeV)} GeV`,
        detail: "Captures the event-scale mass estimate for the active scattering geometry.",
      },
      {
        title: "Transverse momentum",
        value: `${formatNumber(snapshot.transverseMomentumGeV)} GeV`,
        detail: "Summarizes the lateral momentum content of the active event.",
      },
      {
        title: "Pseudorapidity",
        value: formatNumber(snapshot.pseudorapidity, 2),
        detail: "Condenses the active angular opening into a collider-friendly rapidity cue.",
      },
    ]
  }

  return [
    {
      title: "Remaining fraction",
      value: formatNumber(snapshot.remainingFraction, 3),
      detail: "Shows the surviving isotope fraction after the active elapsed time.",
    },
    {
      title: "Activity",
      value: `${formatNumber(snapshot.activityTerabecquerels)} TBq`,
      detail: "Summarizes the active decay-rate estimate for the starter radioactive source.",
    },
    {
      title: "Elapsed time",
      value: `${formatNumber(snapshot.elapsedHours)} h`,
      detail: "Keeps the active decay sample tied to its inspected half-life position.",
    },
  ]
}

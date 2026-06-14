import {
  PlasmaPhysicsInsightCard,
  PlasmaPhysicsScenario,
  PlasmaPhysicsStateSnapshot,
} from "./plasma-physics.models"

function formatNumber(value: number | undefined, digits = 2): string {
  return (value ?? 0).toFixed(digits)
}

export function buildInsightCards(
  scenario: PlasmaPhysicsScenario,
  snapshot: PlasmaPhysicsStateSnapshot,
): readonly PlasmaPhysicsInsightCard[] {
  if (scenario.id === "debye-screening") {
    return [
      {
        title: "Debye length",
        value: `${formatNumber(snapshot.debyeLengthMillimeters)} mm`,
        detail: "Characteristic shielding length for the active warm-plasma state.",
      },
      {
        title: "Shielding fraction",
        value: formatNumber(snapshot.shieldingFraction),
        detail: "Fraction of the probe potential screened at the active cursor radius.",
      },
      {
        title: "Probe potential",
        value: `${formatNumber(scenario.probePotentialVolts)} V`,
        detail: "Applied probe bias that sets the initial unscreened potential.",
      },
    ]
  }

  if (scenario.id === "magnetic-confinement") {
    return [
      {
        title: "Larmor radius",
        value: `${formatNumber(snapshot.larmorRadiusMillimeters)} mm`,
        detail: "Gyroradius estimate for the active confinement state.",
      },
      {
        title: "Safety factor",
        value: formatNumber(snapshot.safetyFactor),
        detail: "Simple winding-stability cue for the active toroidal slice.",
      },
      {
        title: "Beta proxy",
        value: `${formatNumber(snapshot.betaPercent)} %`,
        detail: "Pressure-to-field proxy used by the starter confinement diagnostics.",
      },
    ]
  }

  return [
    {
      title: "Plasma frequency",
      value: `${formatNumber(snapshot.plasmaFrequencyGigahertz)} GHz`,
      detail: "Collective oscillation frequency driven by the active electron density.",
    },
    {
      title: "Oscillation period",
      value: `${formatNumber(snapshot.oscillationPeriodNanoseconds)} ns`,
      detail: "Time-scale cue for the active collective oscillation slice.",
    },
    {
      title: "Restoring field",
      value: `${formatNumber(snapshot.restoringFieldKilovoltsPerMeter)} kV/m`,
      detail: "Effective restoring field for the active density perturbation.",
    },
  ]
}

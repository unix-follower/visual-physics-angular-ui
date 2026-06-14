import { QuantumMechanicsScenario, QuantumMechanicsStateSnapshot } from "./quantum-mechanics.models"

export interface InsightCard {
  label: string
  value: string
  detail: string
}

export function buildInsightCards(
  scenario: QuantumMechanicsScenario,
  snapshot: QuantumMechanicsStateSnapshot,
): readonly InsightCard[] {
  if (scenario.id === "particle-in-a-box") {
    return [
      {
        label: "Energy Level",
        value: `${(snapshot.energyLevelEv ?? 0).toFixed(3)} eV`,
        detail: "Analytic stationary-state energy for the selected box length and quantum number.",
      },
      {
        label: "Node Count",
        value: `${snapshot.nodeCount ?? 0}`,
        detail:
          "Spatial nodes increase with quantum number and shape the standing probability pattern.",
      },
      {
        label: "de Broglie Wavelength",
        value: `${(snapshot.deBroglieWavelengthNanometers ?? 0).toFixed(3)} nm`,
        detail: "The standing-wave fit inside the well sets the allowed wavelength family.",
      },
    ]
  }

  if (scenario.id === "finite-potential-well-tunneling") {
    return [
      {
        label: "Transmission",
        value: `${((snapshot.transmissionProbability ?? 0) * 100).toFixed(2)}%`,
        detail:
          "Nonzero transmission survives even when the incident energy remains below the barrier top.",
      },
      {
        label: "Reflection",
        value: `${((snapshot.reflectionProbability ?? 0) * 100).toFixed(2)}%`,
        detail: "The remaining probability reflects from the rectangular barrier interface.",
      },
      {
        label: "Decay Length",
        value: `${(snapshot.decayLengthNanometers ?? 0).toFixed(3)} nm`,
        detail: "The evanescent envelope decays exponentially inside the forbidden region.",
      },
    ]
  }

  return [
    {
      label: "Fringe Spacing",
      value: `${(snapshot.fringeSpacingMillimeters ?? 0).toFixed(3)} mm`,
      detail:
        "Successive bright fringes spread farther apart when wavelength or screen distance grows.",
    },
    {
      label: "Central Maximum",
      value: `${(snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(3)} mm`,
      detail: "The single-slit envelope sets the width of the bright central interference lobe.",
    },
    {
      label: "Coherence Ratio",
      value: `${(snapshot.coherenceEstimate ?? 0).toFixed(2)}`,
      detail: "A larger slit-separation to slit-width ratio sharpens the interference structure.",
    },
  ]
}

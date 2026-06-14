import {
  ElectromagnetismScenario,
  ElectromagnetismStateSnapshot,
  ElectromagnetismSample,
} from "./electromagnetism.models"

export interface InsightCard {
  label: string
  value: string
  detail: string
}

export function buildGraphPath(
  samples: readonly ElectromagnetismSample[],
  metric: "fieldMagnitude" | "forceMagnitude" | "potential",
): string {
  if (samples.length === 0) {
    return ""
  }

  const values = samples.map((sample) => sample[metric])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1e-6)

  return samples
    .map((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * 320
      const y = 120 - ((sample[metric] - min) / span) * 120
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

export function buildInsightCards(
  scenario: ElectromagnetismScenario,
  snapshot: ElectromagnetismStateSnapshot,
): InsightCard[] {
  const cards: InsightCard[] = [
    {
      label: "Field magnitude",
      value: `${snapshot.fieldMagnitude.toFixed(2)} units`,
      detail: "Magnitude of the dominant electric or magnetic field for the active scenario.",
    },
    {
      label: "Force magnitude",
      value: `${snapshot.forceMagnitude.toFixed(2)} units`,
      detail: "Net electromagnetic force acting on the tracked probe or particle.",
    },
    {
      label: "Potential / energy",
      value: `${snapshot.potential.toFixed(2)} / ${snapshot.energy.toFixed(2)}`,
      detail: "Potential-like scalar and energy-style readout for the current state snapshot.",
    },
  ]

  if (scenario.id === "point-charge-electrostatics") {
    cards.push({
      label: "Charge pair",
      value: `${(scenario.chargeMagnitude ?? 0).toFixed(1)} / ${(scenario.secondaryChargeMagnitude ?? 0).toFixed(1)} q`,
      detail: "Primary and secondary source charges driving the superposed electric field.",
    })
  }

  if (scenario.id === "moving-charge-magnetic-field") {
    cards.push({
      label: "Magnetic regime",
      value: `${(scenario.magneticFieldStrength ?? 0).toFixed(2)} T`,
      detail: "Uniform magnetic-field strength used to bend the moving charge trajectory.",
    })
  }

  if (scenario.id === "current-loop-magnetic-field") {
    cards.push({
      label: "Loop current",
      value: `${(scenario.current ?? 0).toFixed(2)} A`,
      detail: "Current circulating around the loop that generates the magnetic field estimate.",
    })
  }

  if (scenario.id === "capacitor-potential-field") {
    cards.push({
      label: "Plate separation",
      value: `${(scenario.plateSeparation ?? 0).toFixed(2)} m`,
      detail: "Spacing between capacitor plates used in the uniform-field approximation.",
    })
  }

  if (scenario.id === "electromagnetic-induction") {
    cards.push({
      label: "Flux change",
      value: `${(scenario.fluxRate ?? 0).toFixed(2)} Wb/s`,
      detail: "Magnetic flux change rate that drives the induced emf estimate.",
    })
  }

  return cards
}

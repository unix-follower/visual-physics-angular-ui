import { StaticsSample, StaticsScenario, StaticsStateSnapshot } from "./statics.models"

export interface InsightCard {
  label: string
  value: string
  detail: string
}

export function buildGraphPath(
  samples: readonly StaticsSample[],
  metric: "residualForceMagnitude" | "residualTorque",
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
  scenario: StaticsScenario,
  snapshot: StaticsStateSnapshot,
): InsightCard[] {
  const reactionMagnitude = Math.hypot(
    snapshot.primaryReactionForce.x,
    snapshot.primaryReactionForce.y,
  )
  const secondaryReactionMagnitude = snapshot.secondaryReactionForce
    ? Math.hypot(snapshot.secondaryReactionForce.x, snapshot.secondaryReactionForce.y)
    : 0
  const residualMagnitude = Math.hypot(snapshot.residualForce.x, snapshot.residualForce.y)
  const cards: InsightCard[] = [
    {
      label: "Primary reaction",
      value: `${reactionMagnitude.toFixed(2)} N`,
      detail: "Support or constraint force balancing the applied load at the primary anchor.",
    },
    {
      label: "Residual force",
      value: `${residualMagnitude.toFixed(3)} N`,
      detail: "Net remaining force after combining applied and reaction-force terms.",
    },
    {
      label: "Residual torque",
      value: `${snapshot.residualTorque.toFixed(3)} N*m`,
      detail: "Moment balance about the chosen support or reference point.",
    },
  ]

  if (scenario.id === "beam-support") {
    cards.push({
      label: "Support split",
      value: `${reactionMagnitude.toFixed(2)} N / ${secondaryReactionMagnitude.toFixed(2)} N`,
      detail: "Reaction distribution between the left and right beam supports.",
    })
  }

  if (scenario.id === "inclined-plane") {
    cards.push({
      label: "Plane angle",
      value: `${(scenario.angleDegrees ?? 0).toFixed(1)} deg`,
      detail: "The contact angle determines the decomposition of the weight vector.",
    })
  }

  if (scenario.id === "pulley-equilibrium") {
    cards.push({
      label: "Constraint regime",
      value: snapshot.stable ? "Balanced tension" : "Unbalanced tension",
      detail: "Equilibrium requires the pulley constraint to hold on both connected loads.",
    })
  }

  return cards
}

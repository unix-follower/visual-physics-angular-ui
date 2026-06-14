import { DynamicsSample, DynamicsScenario, DynamicsStateSnapshot } from "./dynamics.models"
import { DynamicsOverlayOptions } from "./dynamics-webgpu-renderer"

export interface InsightCard {
  label: string
  value: string
  detail: string
}

export interface ViewportGuideLabel {
  label: string
  detail: string
}

export function buildGraphPath(
  samples: readonly DynamicsSample[],
  metric: "xPosition" | "yPosition" | "speed" | "totalEnergy",
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
  scenario: DynamicsScenario,
  snapshot: DynamicsStateSnapshot,
  energyDrift: number,
): InsightCard[] {
  const displacementMagnitude = Math.hypot(snapshot.position.x, snapshot.position.y)
  const forceMagnitude = Math.hypot(snapshot.netForce.x, snapshot.netForce.y)
  const momentumMagnitude = Math.hypot(snapshot.momentum.x, snapshot.momentum.y)
  const headingDegrees = normalizeDegrees(
    radiansToDegrees(Math.atan2(snapshot.velocity.y, snapshot.velocity.x)),
  )
  const cards: InsightCard[] = [
    {
      label: "Momentum magnitude",
      value: `${momentumMagnitude.toFixed(2)} kg·m/s`,
      detail: "Instantaneous linear momentum from the current velocity and mass.",
    },
    {
      label: "Force response",
      value: `${forceMagnitude.toFixed(2)} N`,
      detail: "The active net force controlling acceleration at the current state.",
    },
    {
      label: "Energy drift span",
      value: `${energyDrift.toFixed(3)} J`,
      detail: "Variation across sampled total energy values for the current scenario window.",
    },
  ]

  if (scenario.id === "constant-force") {
    cards.push({
      label: "Acceleration cue",
      value: "Constant acceleration",
      detail: "A fixed net force keeps acceleration constant while velocity changes linearly.",
    })
  }

  if (scenario.id === "drag-projectile") {
    cards.push({
      label: "Flight phase",
      value: snapshot.velocity.y >= 0 ? "Ascending" : "Descending",
      detail: "The sign of the vertical velocity shows whether the projectile is still climbing.",
    })
  }

  if (scenario.id === "spring-oscillator") {
    cards.push({
      label: "Oscillation offset",
      value: `${displacementMagnitude.toFixed(2)} m`,
      detail: "Distance from the origin, which acts as the default spring anchor in this preset.",
    })
  }

  if (scenario.id === "orbital-motion") {
    cards.push({
      label: "Orbit heading",
      value: `${headingDegrees.toFixed(1)} deg`,
      detail: "Velocity direction measured counterclockwise from +x along the orbital path.",
    })
  }

  if (scenario.id === "elastic-collision") {
    cards.push({
      label: "Collision regime",
      value: `${(scenario.restitutionCoefficient ?? 1).toFixed(2)} restitution`,
      detail:
        "A restitution of 1 preserves speed at impact; lower values dissipate kinetic energy.",
    })
  }

  return cards
}

export function buildViewportGuideLabels(
  scenario: DynamicsScenario,
  snapshot: DynamicsStateSnapshot,
  overlays: DynamicsOverlayOptions,
): ViewportGuideLabel[] {
  const labels: ViewportGuideLabel[] = []

  if (overlays.showMomentumVector) {
    labels.push({
      label: "Momentum",
      detail: `|p| = ${Math.hypot(snapshot.momentum.x, snapshot.momentum.y).toFixed(2)} kg·m/s`,
    })
  }

  if (overlays.showVelocityVector) {
    labels.push({
      label: "Velocity",
      detail: `${snapshot.speed.toFixed(2)} m/s tangent direction cue`,
    })
  }

  if (overlays.showForceVector) {
    labels.push({
      label: "Net force",
      detail: `|F| = ${Math.hypot(snapshot.netForce.x, snapshot.netForce.y).toFixed(2)} N`,
    })
  }

  if (overlays.showScenarioGuides) {
    if (scenario.id === "spring-oscillator" && scenario.springAnchor) {
      labels.push({
        label: "Spring anchor",
        detail: `(${scenario.springAnchor.x.toFixed(1)}, ${scenario.springAnchor.y.toFixed(1)}) m equilibrium reference`,
      })
    }

    if (scenario.id === "orbital-motion" && scenario.orbitalCenter) {
      labels.push({
        label: "Orbital center",
        detail: `Radius ${Math.hypot(
          snapshot.position.x - scenario.orbitalCenter.x,
          snapshot.position.y - scenario.orbitalCenter.y,
        ).toFixed(2)} m from focus`,
      })
    }

    if (scenario.id === "elastic-collision") {
      labels.push({
        label: "Collision bounds",
        detail: `e = ${(scenario.restitutionCoefficient ?? 1).toFixed(2)} within viewport walls`,
      })
    }
  }

  return labels
}

function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}

function normalizeDegrees(degrees: number): number {
  return (degrees + 360) % 360
}

import { buildGraphPath, buildInsightCards, buildViewportGuideLabels } from "./dynamics-analytics"
import { DynamicsOverlayOptions } from "./dynamics-webgpu-renderer"

describe("dynamics-analytics", () => {
  const overlays: DynamicsOverlayOptions = {
    showMomentumVector: true,
    showVelocityVector: true,
    showForceVector: true,
    showScenarioGuides: true,
  }

  it("builds a deterministic SVG path for sampled metrics", () => {
    const path = buildGraphPath(
      [
        { timeSeconds: 0, xPosition: 0, yPosition: 2, speed: 1, totalEnergy: 4 },
        { timeSeconds: 1, xPosition: 3, yPosition: 4, speed: 2, totalEnergy: 5 },
        { timeSeconds: 2, xPosition: 6, yPosition: 1, speed: 4, totalEnergy: 7 },
      ],
      "xPosition",
    )

    expect(path).toBe("M 0.00 120.00 L 160.00 60.00 L 320.00 0.00")
  })

  it("adds orbital insight and guide labels for orbital motion", () => {
    const scenario = {
      id: "orbital-motion" as const,
      name: "Orbital Motion",
      summary: "Gravity-driven orbit",
      equationSummary: 'm x" = -μ m r / |r|^3',
      durationSeconds: 8,
      viewBounds: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
      mass: 1,
      initialPosition: { x: 4, y: 0 },
      initialVelocity: { x: 0, y: 2.2 },
      orbitalCenter: { x: 0, y: 0 },
      gravitationalParameter: 18,
    }
    const snapshot = {
      timeSeconds: 1.2,
      position: { x: 3, y: 4 },
      velocity: { x: -2, y: 1 },
      acceleration: { x: -0.6, y: -0.8 },
      netForce: { x: -0.6, y: -0.8 },
      momentum: { x: -2, y: 1 },
      speed: 2.2360679775,
      kineticEnergy: 2.5,
      potentialEnergy: -3.1,
      totalEnergy: -0.6,
    }

    const insights = buildInsightCards(scenario, snapshot, 0.125)
    const guides = buildViewportGuideLabels(scenario, snapshot, overlays)

    expect(
      insights.some((card) => card.label === "Orbit heading" && card.value === "153.4 deg"),
    ).toBe(true)
    expect(guides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Momentum", detail: "|p| = 2.24 kg·m/s" }),
        expect.objectContaining({ label: "Orbital center", detail: "Radius 5.00 m from focus" }),
      ]),
    )
  })

  it("emits collision guide labels only when scenario guides are enabled", () => {
    const scenario = {
      id: "elastic-collision" as const,
      name: "Elastic Boundary Collision",
      summary: "Reflective motion",
      equationSummary: 'x" = 0',
      durationSeconds: 5,
      viewBounds: { minX: -3, maxX: 3, minY: -2, maxY: 2 },
      mass: 1,
      initialPosition: { x: 0, y: 0 },
      initialVelocity: { x: 1, y: 1 },
      restitutionCoefficient: 0.8,
    }
    const snapshot = {
      timeSeconds: 1,
      position: { x: 1, y: 0.5 },
      velocity: { x: 1, y: -1 },
      acceleration: { x: 0, y: 0 },
      netForce: { x: 0, y: 0 },
      momentum: { x: 1, y: -1 },
      speed: 1.4142135624,
      kineticEnergy: 1,
      potentialEnergy: 0,
      totalEnergy: 1,
    }

    const withoutGuides = buildViewportGuideLabels(scenario, snapshot, {
      ...overlays,
      showScenarioGuides: false,
    })
    const withGuides = buildViewportGuideLabels(scenario, snapshot, overlays)

    expect(withoutGuides.some((guide) => guide.label === "Collision bounds")).toBe(false)
    expect(withGuides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Collision bounds",
          detail: "e = 0.80 within viewport walls",
        }),
      ]),
    )
  })
})

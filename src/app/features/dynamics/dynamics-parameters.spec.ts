import { buildParameterSections } from "./dynamics-parameters"

describe("dynamics-parameters", () => {
  it("includes orbital gravity controls for orbital motion", () => {
    const sections = buildParameterSections({
      id: "orbital-motion",
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
    })

    expect(sections.map((section) => section.heading)).toEqual(["Body state", "Gravity field"])
    expect(sections[1]?.fields.map((field) => field.field)).toEqual([
      "orbitalCenter.x",
      "orbitalCenter.y",
      "gravitationalParameter",
    ])
  })

  it("includes restitution control for elastic collision", () => {
    const sections = buildParameterSections({
      id: "elastic-collision",
      name: "Elastic Boundary Collision",
      summary: "Reflective motion",
      equationSummary: 'x" = 0',
      durationSeconds: 5,
      viewBounds: { minX: -3, maxX: 3, minY: -2, maxY: 2 },
      mass: 1,
      initialPosition: { x: 0, y: 0 },
      initialVelocity: { x: 1, y: 1 },
      restitutionCoefficient: 0.8,
    })

    expect(sections.map((section) => section.heading)).toEqual(["Body state", "Collision bounds"])
    expect(sections[1]?.fields).toEqual([
      expect.objectContaining({
        field: "restitutionCoefficient",
        label: "Restitution e",
        value: 0.8,
        step: 0.01,
      }),
    ])
  })
})

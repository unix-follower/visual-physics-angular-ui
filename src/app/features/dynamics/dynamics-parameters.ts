import { DynamicsScenario } from "./dynamics.models"
import { EditableScenarioField } from "./dynamics-state.service"

export interface ParameterField {
  field: EditableScenarioField
  label: string
  value: number
  step: number
}

export interface ParameterSection {
  heading: string
  fields: ParameterField[]
}

export function buildParameterSections(scenario: DynamicsScenario): ParameterSection[] {
  const sections: ParameterSection[] = [
    {
      heading: "Body state",
      fields: [
        { field: "mass", label: "Mass (kg)", value: scenario.mass, step: 0.1 },
        {
          field: "initialPosition.x",
          label: "x0 (m)",
          value: scenario.initialPosition.x,
          step: 0.1,
        },
        {
          field: "initialPosition.y",
          label: "y0 (m)",
          value: scenario.initialPosition.y,
          step: 0.1,
        },
        {
          field: "initialVelocity.x",
          label: "vx0 (m/s)",
          value: scenario.initialVelocity.x,
          step: 0.1,
        },
        {
          field: "initialVelocity.y",
          label: "vy0 (m/s)",
          value: scenario.initialVelocity.y,
          step: 0.1,
        },
      ],
    },
  ]

  if (scenario.id === "constant-force") {
    sections.push({
      heading: "Net force",
      fields: [
        {
          field: "netForce.x",
          label: "Fx (N)",
          value: scenario.netForce?.x ?? 0,
          step: 0.1,
        },
        {
          field: "netForce.y",
          label: "Fy (N)",
          value: scenario.netForce?.y ?? 0,
          step: 0.1,
        },
      ],
    })
  }

  if (scenario.id === "drag-projectile") {
    sections.push({
      heading: "Environment",
      fields: [
        {
          field: "gravity.x",
          label: "gx (m/s²)",
          value: scenario.gravity?.x ?? 0,
          step: 0.1,
        },
        {
          field: "gravity.y",
          label: "gy (m/s²)",
          value: scenario.gravity?.y ?? 0,
          step: 0.1,
        },
        {
          field: "dragCoefficient",
          label: "Drag c",
          value: scenario.dragCoefficient ?? 0,
          step: 0.01,
        },
      ],
    })
  }

  if (scenario.id === "spring-oscillator") {
    sections.push({
      heading: "Spring system",
      fields: [
        {
          field: "springAnchor.x",
          label: "Anchor x (m)",
          value: scenario.springAnchor?.x ?? 0,
          step: 0.1,
        },
        {
          field: "springAnchor.y",
          label: "Anchor y (m)",
          value: scenario.springAnchor?.y ?? 0,
          step: 0.1,
        },
        {
          field: "springConstant",
          label: "k (N/m)",
          value: scenario.springConstant ?? 0,
          step: 0.1,
        },
        {
          field: "dampingCoefficient",
          label: "c (N·s/m)",
          value: scenario.dampingCoefficient ?? 0,
          step: 0.01,
        },
      ],
    })
  }

  if (scenario.id === "orbital-motion") {
    sections.push({
      heading: "Gravity field",
      fields: [
        {
          field: "orbitalCenter.x",
          label: "Center x (m)",
          value: scenario.orbitalCenter?.x ?? 0,
          step: 0.1,
        },
        {
          field: "orbitalCenter.y",
          label: "Center y (m)",
          value: scenario.orbitalCenter?.y ?? 0,
          step: 0.1,
        },
        {
          field: "gravitationalParameter",
          label: "μ (m³/s²)",
          value: scenario.gravitationalParameter ?? 0,
          step: 0.1,
        },
      ],
    })
  }

  if (scenario.id === "elastic-collision") {
    sections.push({
      heading: "Collision bounds",
      fields: [
        {
          field: "restitutionCoefficient",
          label: "Restitution e",
          value: scenario.restitutionCoefficient ?? 1,
          step: 0.01,
        },
      ],
    })
  }

  return sections
}

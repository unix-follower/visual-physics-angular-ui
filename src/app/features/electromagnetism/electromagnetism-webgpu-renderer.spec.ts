import {
  buildElectromagnetismViewportGeometry,
  ElectromagnetismViewportGeometry,
} from "./electromagnetism-webgpu-renderer"
import {
  ElectromagnetismSample,
  ElectromagnetismScenario,
  ElectromagnetismStateSnapshot,
} from "./electromagnetism.models"
import { ElectromagnetismOverlayOptions } from "./electromagnetism-payload"

const overlays: ElectromagnetismOverlayOptions = {
  showFieldVectors: true,
  showMagneticField: true,
  showForceVectors: true,
  showPotentialGuides: true,
  showTrajectory: true,
}

describe("electromagnetism-webgpu-renderer geometry", () => {
  it("builds point-charge electrostatics geometry with charge and probe markers", () => {
    const geometry = buildElectromagnetismViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 0, y: 1.5 },
        electricField: { x: 0, y: 0.8 },
        magneticField: { x: 0, y: 0 },
        force: { x: 0, y: 0.8 },
        potential: 1.2,
        fieldMagnitude: 0.8,
        forceMagnitude: 0.8,
        energy: 1.2,
        stable: true,
      },
      {
        id: "point-charge-electrostatics",
        name: "Point-Charge Electrostatics",
        summary: "Test electrostatics",
        equationSummary: "F = k q1 q2 / r^2",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -6, maxX: 6, minY: -4, maxY: 4 },
        focusArea: "Electric field",
        initialPosition: { x: 0, y: 0 },
        sourcePoint: { x: -2, y: 0 },
        secondarySourcePoint: { x: 2, y: 0 },
        probePoint: { x: 0, y: 1.5 },
        chargeMagnitude: 1,
        secondaryChargeMagnitude: -1,
      },
      overlays,
      [],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(32)
    expect(geometry.markerVertices.length).toBe(36)
    expect(maxAbsCoordinate(geometry)).toBeLessThanOrEqual(1)
  })

  it("builds moving-charge geometry with sampled trajectory segments", () => {
    const samples: ElectromagnetismSample[] = [
      {
        timeSeconds: 0,
        xPosition: -3,
        yPosition: 0,
        fieldMagnitude: 1.5,
        forceMagnitude: 3,
        potential: 0,
      },
      {
        timeSeconds: 1,
        xPosition: -1.5,
        yPosition: 1.2,
        fieldMagnitude: 1.5,
        forceMagnitude: 3,
        potential: 0,
      },
      {
        timeSeconds: 2,
        xPosition: 0.2,
        yPosition: 1.6,
        fieldMagnitude: 1.5,
        forceMagnitude: 3,
        potential: 0,
      },
    ]

    const geometry = buildElectromagnetismViewportGeometry(
      {
        timeSeconds: 2,
        position: { x: 0.2, y: 1.6 },
        electricField: { x: 0, y: 0 },
        magneticField: { x: 0, y: 1.5 },
        force: { x: 1.8, y: -0.6 },
        potential: 0,
        fieldMagnitude: 1.5,
        forceMagnitude: 1.897,
        energy: 3.2,
        stable: false,
      },
      {
        id: "moving-charge-magnetic-field",
        name: "Moving Charge In Magnetic Field",
        summary: "Test magnetic motion",
        equationSummary: "F = q v x B",
        status: "Test",
        durationSeconds: 6,
        viewBounds: { minX: -6, maxX: 6, minY: -6, maxY: 6 },
        focusArea: "Lorentz force",
        initialPosition: { x: -3, y: 0 },
        initialVelocity: { x: 2.4, y: 1.2 },
        chargeMagnitude: 1,
        mass: 1,
        magneticFieldStrength: 1.5,
      },
      overlays,
      samples,
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(40)
    expect(geometry.markerVertices.length).toBe(12)
    expect(minY(geometry)).toBeGreaterThanOrEqual(-1)
  })

  it("builds current-loop geometry with loop outline and center marker", () => {
    const geometry = buildElectromagnetismViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 0, y: 2 },
        electricField: { x: 0, y: 0 },
        magneticField: { x: 0, y: 0.7 },
        force: { x: 0, y: 0 },
        potential: 0,
        fieldMagnitude: 0.7,
        forceMagnitude: 0,
        energy: 14.4,
        stable: true,
      },
      {
        id: "current-loop-magnetic-field",
        name: "Current Loop Magnetic Field",
        summary: "Test current loop",
        equationSummary: "B = mu0 I / 2R",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -5, maxY: 5 },
        focusArea: "Loop field",
        initialPosition: { x: 0, y: 0 },
        probePoint: { x: 0, y: 2 },
        current: 4,
        loopRadius: 1.8,
      },
      overlays,
      [],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(220)
    expect(geometry.markerVertices.length).toBe(24)
  })

  it("builds capacitor geometry with plate markers", () => {
    const geometry = buildElectromagnetismViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 0.3, y: 0.6 },
        electricField: { x: 6, y: 0 },
        magneticField: { x: 0, y: 0 },
        force: { x: 6, y: 0 },
        potential: 4.2,
        fieldMagnitude: 6,
        forceMagnitude: 6,
        energy: 72,
        stable: true,
      },
      {
        id: "capacitor-potential-field",
        name: "Capacitor Potential Field",
        summary: "Test capacitor",
        equationSummary: "E = V / d",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
        focusArea: "Uniform field",
        initialPosition: { x: 0, y: 0 },
        probePoint: { x: 0.3, y: 0.6 },
        plateSeparation: 2,
        potentialDifference: 12,
      },
      overlays,
      [],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(90)
    expect(geometry.markerVertices.length).toBe(36)
  })

  it("builds induction geometry with loop and terminal markers", () => {
    const samples: ElectromagnetismSample[] = [
      {
        timeSeconds: 0,
        xPosition: 0,
        yPosition: 0,
        fieldMagnitude: 0,
        forceMagnitude: 3,
        potential: -3,
      },
      {
        timeSeconds: 1,
        xPosition: 0,
        yPosition: 0,
        fieldMagnitude: 1.4,
        forceMagnitude: 1.5,
        potential: 0,
      },
      {
        timeSeconds: 2,
        xPosition: 0,
        yPosition: 0,
        fieldMagnitude: 2.5,
        forceMagnitude: 0.4,
        potential: 2.8,
      },
    ]

    const geometry = buildElectromagnetismViewportGeometry(
      {
        timeSeconds: 0,
        position: { x: 0, y: 0 },
        electricField: { x: -3, y: 0 },
        magneticField: { x: 0, y: 2.5 },
        force: { x: -3, y: 0 },
        potential: -3,
        fieldMagnitude: 2.5,
        forceMagnitude: 3,
        energy: 3.75,
        stable: true,
      },
      {
        id: "electromagnetic-induction",
        name: "Electromagnetic Induction",
        summary: "Test induction",
        equationSummary: "emf = -L dPhi / dt",
        status: "Test",
        durationSeconds: 1,
        viewBounds: { minX: -5, maxX: 5, minY: -4, maxY: 4 },
        focusArea: "Induced emf",
        initialPosition: { x: 0, y: 0 },
        fluxRate: 2.5,
        inductance: 1.2,
      },
      overlays,
      samples,
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(90)
    expect(geometry.markerVertices.length).toBe(36)
    const coordinates = Array.from(geometry.markerVertices)
    expect(coordinates.some((value) => value < -0.2)).toBe(true)
    expect(coordinates.some((value) => value > 0.2)).toBe(true)
  })
})

function maxAbsCoordinate(geometry: ElectromagnetismViewportGeometry): number {
  return Math.max(...Array.from(geometry.lineVertices).map((value) => Math.abs(value)))
}

function minY(geometry: ElectromagnetismViewportGeometry): number {
  const values = Array.from(geometry.lineVertices)
  let minimum = Number.POSITIVE_INFINITY
  for (let index = 1; index < values.length; index += 2) {
    minimum = Math.min(minimum, values[index])
  }
  return minimum
}

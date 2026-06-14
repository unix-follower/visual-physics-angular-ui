import { buildQuantumMechanicsViewportGeometry } from "./quantum-mechanics-webgpu-renderer"

describe("quantum-mechanics-webgpu-renderer", () => {
  it("builds viewport geometry for the particle-in-a-box slice", () => {
    const geometry = buildQuantumMechanicsViewportGeometry(
      {
        timeSeconds: 0,
        boxLengthNanometers: 1.2,
        quantumNumber: 2,
        energyLevelEv: 1.1,
        nodeCount: 1,
        stable: true,
      },
      {
        id: "particle-in-a-box",
        name: "Particle in a One-Dimensional Box",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        boxLengthNanometers: 1.2,
        quantumNumber: 2,
      },
      {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: true,
      },
      [
        {
          position: 0,
          primaryValue: 0,
          secondaryValue: -1,
          label: "probability-density",
          active: true,
        },
        {
          position: 0.6,
          primaryValue: 1,
          secondaryValue: 1,
          label: "probability-density",
          active: true,
        },
        {
          position: 1.2,
          primaryValue: 0,
          secondaryValue: -1,
          label: "probability-density",
          active: true,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the finite-barrier tunneling slice", () => {
    const geometry = buildQuantumMechanicsViewportGeometry(
      {
        timeSeconds: 0,
        particleEnergyEv: 2.1,
        barrierHeightEv: 3.8,
        barrierWidthNanometers: 0.45,
        transmissionProbability: 0.08,
        reflectionProbability: 0.92,
        decayLengthNanometers: 0.1,
        stable: true,
      },
      {
        id: "finite-potential-well-tunneling",
        name: "Finite Barrier Tunneling",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        particleEnergyEv: 2.1,
        barrierHeightEv: 3.8,
        barrierWidthNanometers: 0.45,
      },
      {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: true,
      },
      [
        { position: 0, primaryValue: 1, label: "tunneling-envelope", active: true },
        { position: 0.6, primaryValue: 0.3, label: "tunneling-envelope", active: true },
        { position: 1.2, primaryValue: 0.08, label: "tunneling-envelope", active: true },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the double-slit slice", () => {
    const geometry = buildQuantumMechanicsViewportGeometry(
      {
        timeSeconds: 0,
        wavelengthNanometers: 520,
        slitSeparationMicrometers: 120,
        slitWidthMicrometers: 40,
        screenDistanceMeters: 1.8,
        fringeSpacingMillimeters: 7.8,
        centralMaximumWidthMillimeters: 46.8,
        coherenceEstimate: 3,
        stable: true,
      },
      {
        id: "double-slit-interference",
        name: "Double-Slit Interference Pattern",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        focusArea: "Focus",
        wavelengthNanometers: 520,
        slitSeparationMicrometers: 120,
        slitWidthMicrometers: 40,
        screenDistanceMeters: 1.8,
      },
      {
        showProbabilityGuide: true,
        showPotentialGuide: true,
        showPhaseGuide: true,
      },
      [
        { position: -3, primaryValue: 0.1, label: "screen-intensity", active: true },
        { position: 0, primaryValue: 1, label: "screen-intensity", active: true },
        { position: 3, primaryValue: 0.1, label: "screen-intensity", active: true },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })
})

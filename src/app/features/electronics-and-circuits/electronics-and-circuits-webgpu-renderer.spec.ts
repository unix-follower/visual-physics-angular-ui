import { buildElectronicsAndCircuitsViewportGeometry } from "./electronics-and-circuits-webgpu-renderer"

describe("electronics-and-circuits-webgpu-renderer", () => {
  it("builds line and marker geometry for the RC viewport", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 1,
        capacitorVoltage: 3,
        outputVoltage: 3,
        current: 0.02,
        charge: 0.03,
        storedEnergy: 0.045,
        branchPower: 0.18,
        resistorVoltageDrop: 6,
        sourceVoltage: 9,
        steadyStateError: 6,
        timeConstant: 2.2,
        equivalentResistance: 220,
      },
      {
        id: "rc-transient",
        name: "RC Transient Response",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 6,
        viewBounds: { minX: 0, maxX: 6, minY: -0.5, maxY: 12 },
        focusArea: "",
        sourceVoltage: 9,
        resistance: 220,
        capacitance: 0.01,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: false,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 0,
          current: 0.04,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0.36,
        },
        {
          timeSeconds: 1,
          capacitorVoltage: 3,
          outputVoltage: 3,
          current: 0.02,
          charge: 0.03,
          storedEnergy: 0.045,
          branchPower: 0.18,
        },
        {
          timeSeconds: 2,
          capacitorVoltage: 5,
          outputVoltage: 5,
          current: 0.01,
          charge: 0.05,
          storedEnergy: 0.125,
          branchPower: 0.09,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds schematic geometry for the resistor-network viewport", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 0,
        capacitorVoltage: 7.2,
        outputVoltage: 7.2,
        current: 0.024,
        charge: 0,
        storedEnergy: 0,
        branchPower: 0.1728,
        resistorVoltageDrop: 4.8,
        sourceVoltage: 12,
        steadyStateError: 0,
        timeConstant: 0,
        equivalentResistance: 500,
      },
      {
        id: "resistor-network",
        name: "Resistor Divider Network",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 1,
        viewBounds: { minX: -1, maxX: 11, minY: -2.5, maxY: 2.5 },
        focusArea: "",
        sourceVoltage: 12,
        resistance: 220,
        secondaryResistance: 330,
        capacitance: 1,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 7.2,
          outputVoltage: 7.2,
          current: 0.024,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0.1728,
        },
        {
          timeSeconds: 1,
          capacitorVoltage: 7.2,
          outputVoltage: 7.2,
          current: 0.024,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0.1728,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(20)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RC low-pass geometry cues for cutoff and active sweep markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 2,
        capacitorVoltage: 4.98,
        outputVoltage: 4.98,
        current: 0.0627,
        charge: 0.00498,
        storedEnergy: 0.0124,
        branchPower: 0.393,
        resistorVoltageDrop: 6.27,
        sourceVoltage: 8,
        steadyStateError: 3.02,
        timeConstant: 1.591549,
        equivalentResistance: 100,
      },
      {
        id: "rc-low-pass",
        name: "RC Low-Pass Filter",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 100,
        capacitance: 0.001,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0.5,
          capacitorVoltage: 7.63,
          outputVoltage: 7.63,
          current: 0.0299,
          charge: 0.00763,
          storedEnergy: 0.0291,
          branchPower: 0.0894,
        },
        {
          timeSeconds: 2,
          capacitorVoltage: 4.98,
          outputVoltage: 4.98,
          current: 0.0627,
          charge: 0.00498,
          storedEnergy: 0.0124,
          branchPower: 0.393,
        },
        {
          timeSeconds: 8,
          capacitorVoltage: 1.55,
          outputVoltage: 1.55,
          current: 0.0785,
          charge: 0.00155,
          storedEnergy: 0.0012,
          branchPower: 0.616,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RC high-pass geometry cues for cutoff and active sweep markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 2,
        capacitorVoltage: 4.98,
        outputVoltage: 6.26,
        current: 0.0626,
        charge: 0.00498,
        storedEnergy: 0.0124,
        branchPower: 0.3919,
        resistorVoltageDrop: 6.26,
        sourceVoltage: 8,
        steadyStateError: 1.74,
        timeConstant: 1.591549,
        equivalentResistance: 100,
      },
      {
        id: "rc-high-pass",
        name: "RC High-Pass Filter",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 100,
        capacitance: 0.001,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0.5,
          capacitorVoltage: 7.63,
          outputVoltage: 2.39,
          current: 0.0239,
          charge: 0.00763,
          storedEnergy: 0.0291,
          branchPower: 0.0571,
        },
        {
          timeSeconds: 2,
          capacitorVoltage: 4.98,
          outputVoltage: 6.26,
          current: 0.0626,
          charge: 0.00498,
          storedEnergy: 0.0124,
          branchPower: 0.3919,
        },
        {
          timeSeconds: 8,
          capacitorVoltage: 1.55,
          outputVoltage: 7.85,
          current: 0.0785,
          charge: 0.00155,
          storedEnergy: 0.0012,
          branchPower: 0.616,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RL transient geometry cues for steady-state energy and the active time marker", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 0.2,
        capacitorVoltage: 8.19,
        outputVoltage: 0.81,
        current: 1.365,
        charge: 0.6825,
        storedEnergy: 0.4658,
        branchPower: 11.178,
        resistorVoltageDrop: 8.19,
        sourceVoltage: 9,
        steadyStateError: 0.81,
        timeConstant: 0.083333,
        equivalentResistance: 6,
      },
      {
        id: "rl-transient",
        name: "RL Transient Response",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 4,
        viewBounds: { minX: 0, maxX: 4, minY: -0.5, maxY: 12 },
        focusArea: "",
        sourceVoltage: 9,
        resistance: 6,
        inductance: 0.5,
        capacitance: 0.01,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 9,
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
        {
          timeSeconds: 0.2,
          capacitorVoltage: 8.19,
          outputVoltage: 0.81,
          current: 1.365,
          charge: 0.6825,
          storedEnergy: 0.4658,
          branchPower: 11.178,
        },
        {
          timeSeconds: 0.4,
          capacitorVoltage: 8.93,
          outputVoltage: 0.07,
          current: 1.488,
          charge: 0.744,
          storedEnergy: 0.5535,
          branchPower: 13.29,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds half-wave rectifier geometry cues for waveform clipping and active sample markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 0.005,
        capacitorVoltage: 8,
        outputVoltage: 7.3,
        current: 0.0332,
        charge: 1,
        storedEnergy: 0.2422,
        branchPower: 0.2422,
        resistorVoltageDrop: 7.3,
        sourceVoltage: 8,
        steadyStateError: 0.7,
        timeConstant: 0.02,
        equivalentResistance: 220,
      },
      {
        id: "half-wave-rectifier",
        name: "Half-Wave Rectifier",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 0.04,
        viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 220,
        capacitance: 0.01,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 0,
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
        {
          timeSeconds: 0.005,
          capacitorVoltage: 8,
          outputVoltage: 7.3,
          current: 0.0332,
          charge: 1,
          storedEnergy: 0.2422,
          branchPower: 0.2422,
        },
        {
          timeSeconds: 0.015,
          capacitorVoltage: -8,
          outputVoltage: 0,
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(18)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds full-wave rectifier geometry cues for bridge-rectified waveform markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 0.015,
        capacitorVoltage: -8,
        outputVoltage: 6.6,
        current: 0.03,
        charge: 1,
        storedEnergy: 0.198,
        branchPower: 0.198,
        resistorVoltageDrop: 6.6,
        sourceVoltage: 8,
        steadyStateError: 1.4,
        timeConstant: 0.01,
        equivalentResistance: 220,
      },
      {
        id: "full-wave-rectifier",
        name: "Full-Wave Rectifier",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 0.04,
        viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 220,
        capacitance: 0.01,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 0,
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
        {
          timeSeconds: 0.005,
          capacitorVoltage: 8,
          outputVoltage: 6.6,
          current: 0.03,
          charge: 1,
          storedEnergy: 0.198,
          branchPower: 0.198,
        },
        {
          timeSeconds: 0.015,
          capacitorVoltage: -8,
          outputVoltage: 6.6,
          current: 0.03,
          charge: 1,
          storedEnergy: 0.198,
          branchPower: 0.198,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(18)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds smoothed rectifier geometry cues for capacitor-energy and active-ripple markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 0.015,
        capacitorVoltage: -8,
        outputVoltage: 6.05,
        current: 0.0275,
        charge: 0.00284,
        storedEnergy: 0.0086,
        branchPower: 0.1664,
        resistorVoltageDrop: 6.05,
        sourceVoltage: 8,
        steadyStateError: 0.55,
        timeConstant: 0.1034,
        equivalentResistance: 220,
      },
      {
        id: "smoothed-rectifier",
        name: "Smoothed Bridge Rectifier",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 0.04,
        viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 220,
        capacitance: 0.00047,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 6.55,
          current: 0.0298,
          charge: 0.00308,
          storedEnergy: 0.0101,
          branchPower: 0.1951,
        },
        {
          timeSeconds: 0.01,
          capacitorVoltage: 0,
          outputVoltage: 5.98,
          current: 0.0272,
          charge: 0.00281,
          storedEnergy: 0.0084,
          branchPower: 0.1625,
        },
        {
          timeSeconds: 0.02,
          capacitorVoltage: 0,
          outputVoltage: 6.48,
          current: 0.0295,
          charge: 0.00305,
          storedEnergy: 0.0099,
          branchPower: 0.191,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(18)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RL low-pass geometry cues for cutoff and active sweep markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 3.2,
        capacitorVoltage: 5.67,
        outputVoltage: 5.64,
        current: 1.41,
        charge: 0.282,
        storedEnergy: 0.199,
        branchPower: 7.95,
        resistorVoltageDrop: 5.64,
        sourceVoltage: 8,
        steadyStateError: 2.36,
        timeConstant: 3.183099,
        equivalentResistance: 4,
      },
      {
        id: "rl-low-pass",
        name: "RL Low-Pass Filter",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 4,
        inductance: 0.2,
        capacitance: 0.001,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0.5,
          capacitorVoltage: 2.98,
          outputVoltage: 7.42,
          current: 1.854,
          charge: 0.371,
          storedEnergy: 0.344,
          branchPower: 13.75,
        },
        {
          timeSeconds: 3.2,
          capacitorVoltage: 5.67,
          outputVoltage: 5.64,
          current: 1.41,
          charge: 0.282,
          storedEnergy: 0.199,
          branchPower: 7.95,
        },
        {
          timeSeconds: 8,
          capacitorVoltage: 7.43,
          outputVoltage: 2.96,
          current: 0.741,
          charge: 0.148,
          storedEnergy: 0.055,
          branchPower: 2.19,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RL high-pass geometry cues for cutoff and active sweep markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 3.2,
        capacitorVoltage: 5.67,
        outputVoltage: 5.64,
        current: 1.41,
        charge: 0.282,
        storedEnergy: 0.199,
        branchPower: 7.95,
        resistorVoltageDrop: 5.67,
        sourceVoltage: 8,
        steadyStateError: 2.36,
        timeConstant: 3.183099,
        equivalentResistance: 4,
      },
      {
        id: "rl-high-pass",
        name: "RL High-Pass Filter",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 12,
        viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
        focusArea: "",
        sourceVoltage: 8,
        resistance: 4,
        inductance: 0.2,
        capacitance: 0.001,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0.5,
          capacitorVoltage: 7.42,
          outputVoltage: 2.98,
          current: 1.854,
          charge: 0.371,
          storedEnergy: 0.344,
          branchPower: 13.75,
        },
        {
          timeSeconds: 3.2,
          capacitorVoltage: 5.67,
          outputVoltage: 5.64,
          current: 1.41,
          charge: 0.282,
          storedEnergy: 0.199,
          branchPower: 7.95,
        },
        {
          timeSeconds: 8,
          capacitorVoltage: 2.96,
          outputVoltage: 7.43,
          current: 0.741,
          charge: 0.148,
          storedEnergy: 0.055,
          branchPower: 2.19,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds RLC-specific geometry cues for settling bands and current reversals", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 1.2,
        capacitorVoltage: 8.1,
        outputVoltage: 8.1,
        current: -0.14,
        charge: 0.405,
        storedEnergy: 1.75,
        branchPower: -1.26,
        resistorVoltageDrop: -0.84,
        sourceVoltage: 9,
        steadyStateError: 0.9,
        timeConstant: 0.083333,
        equivalentResistance: 6,
      },
      {
        id: "rlc-response",
        name: "RLC Step Response",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 4,
        viewBounds: { minX: 0, maxX: 4, minY: -4, maxY: 12 },
        focusArea: "",
        sourceVoltage: 9,
        resistance: 6,
        capacitance: 0.05,
        inductance: 0.5,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 0,
          capacitorVoltage: 0,
          outputVoltage: 0,
          current: 0.7,
          charge: 0,
          storedEnergy: 0.1,
          branchPower: 6.3,
        },
        {
          timeSeconds: 0.5,
          capacitorVoltage: 10.2,
          outputVoltage: 10.2,
          current: 0.2,
          charge: 0.51,
          storedEnergy: 2.7,
          branchPower: 1.8,
        },
        {
          timeSeconds: 1.0,
          capacitorVoltage: 8.7,
          outputVoltage: 8.7,
          current: -0.14,
          charge: 0.435,
          storedEnergy: 1.75,
          branchPower: -1.26,
        },
        {
          timeSeconds: 1.5,
          capacitorVoltage: 9.1,
          outputVoltage: 9.1,
          current: 0.03,
          charge: 0.455,
          storedEnergy: 2.08,
          branchPower: 0.27,
        },
        {
          timeSeconds: 2.0,
          capacitorVoltage: 8.98,
          outputVoltage: 8.98,
          current: -0.01,
          charge: 0.449,
          storedEnergy: 2.02,
          branchPower: -0.09,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(40)
    expect(geometry.markerVertices.length).toBe(6)
  })

  it("builds resonance-sweep geometry cues for resonance and active frequency markers", () => {
    const geometry = buildElectronicsAndCircuitsViewportGeometry(
      {
        timeSeconds: 5,
        capacitorVoltage: 9.55,
        outputVoltage: 9.55,
        current: 1.5,
        charge: 0.04775,
        storedEnergy: 0.34025,
        branchPower: 9,
        resistorVoltageDrop: 6,
        sourceVoltage: 6,
        steadyStateError: 0.03,
        timeConstant: 3.183099,
        equivalentResistance: 4,
      },
      {
        id: "rlc-resonance",
        name: "RLC Resonance Sweep",
        summary: "",
        equationSummary: "",
        status: "",
        durationSeconds: 20,
        viewBounds: { minX: 0, maxX: 20, minY: 0, maxY: 12 },
        focusArea: "",
        sourceVoltage: 6,
        resistance: 4,
        capacitance: 0.005,
        inductance: 0.2,
        initialCharge: 0,
      },
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: true,
        showEnergyMarkers: true,
      },
      [
        {
          timeSeconds: 1,
          capacitorVoltage: 1.99,
          outputVoltage: 1.99,
          current: 0.125,
          charge: 0.00995,
          storedEnergy: 0.00255,
          branchPower: 0.0625,
        },
        {
          timeSeconds: 5,
          capacitorVoltage: 9.55,
          outputVoltage: 9.55,
          current: 1.5,
          charge: 0.04775,
          storedEnergy: 0.34025,
          branchPower: 9,
        },
        {
          timeSeconds: 9,
          capacitorVoltage: 1.06,
          outputVoltage: 1.06,
          current: 0.298,
          charge: 0.0053,
          storedEnergy: 0.00944,
          branchPower: 0.355,
        },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(24)
    expect(geometry.markerVertices.length).toBe(6)
  })
})

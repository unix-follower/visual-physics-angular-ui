import {
  buildFullWaveRectifierDiagnostics,
  buildHalfWaveRectifierDiagnostics,
  buildGraphPath,
  buildRlTransientDiagnostics,
  buildRlHighPassDiagnostics,
  buildRlLowPassDiagnostics,
  buildRcHighPassDiagnostics,
  buildRcLowPassDiagnostics,
  buildSmoothedRectifierDiagnostics,
  buildInsightCards,
  buildPlotGuides,
  buildResonanceDiagnostics,
  buildRlcDiagnostics,
} from "./electronics-and-circuits-analytics"

describe("electronics-and-circuits-analytics", () => {
  it("builds an SVG graph path for RC samples", () => {
    const path = buildGraphPath(
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
      "capacitorVoltage",
    )

    expect(path.startsWith("M ")).toBe(true)
    expect(path.includes("L ")).toBe(true)
  })

  it("builds RC insight cards", () => {
    const cards = buildInsightCards(
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
    )

    expect(cards).toHaveLength(4)
    expect(cards[0].label).toContain("Time constant")
    expect(cards[1].value).toContain("3.00")
  })

  it("builds half-wave rectifier diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "half-wave-rectifier" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildHalfWaveRectifierDiagnostics(samples)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.peakOutputVoltage).toBeCloseTo(7.3, 6)
    expect(diagnostics.averageOutputVoltage).toBeGreaterThan(2.4)
    expect(diagnostics.rmsOutputVoltage).toBeGreaterThan(4.1)
    expect(cards[0].label).toContain("Peak output voltage")
    expect(cards[3].label).toContain("Conduction duty")
    expect(guides.primary[0]?.label).toBe("Peak output")
  })

  it("builds full-wave rectifier diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "full-wave-rectifier" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildFullWaveRectifierDiagnostics(samples)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.peakOutputVoltage).toBeCloseTo(6.6, 6)
    expect(diagnostics.averageOutputVoltage).toBeGreaterThan(4.3)
    expect(diagnostics.rippleFrequencyHertz).toBe(100)
    expect(cards[3].label).toContain("Ripple frequency")
    expect(guides.primary[0]?.label).toBe("Average output")
  })

  it("builds smoothed rectifier diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "smoothed-rectifier" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildSmoothedRectifierDiagnostics(samples)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.averageOutputVoltage).toBeGreaterThan(6.2)
    expect(diagnostics.minimumOutputVoltage).toBeCloseTo(5.98, 6)
    expect(diagnostics.rippleVoltage).toBeGreaterThan(0.5)
    expect(cards[1].label).toContain("Ripple voltage")
    expect(cards[2].label).toContain("Ripple factor")
    expect(guides.primary[0]?.label).toBe("Average output")
    expect(guides.primary[1]?.label).toBe("Ripple floor")
  })

  it("builds RL transient diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "rl-transient" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildRlTransientDiagnostics(scenario, snapshot)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.timeConstantSeconds).toBeCloseTo(0.0833, 3)
    expect(diagnostics.currentRisePercent).toBeGreaterThan(90)
    expect(diagnostics.remainingInductorVoltagePercent).toBeLessThan(10)
    expect(cards[0].label).toContain("Time constant")
    expect(cards[3].label).toContain("Flux linkage")
    expect(guides.primary[0]?.label).toBe("Time constant")
    expect(guides.tertiary[0]?.label).toBe("Magnetic energy")
  })

  it("builds RC low-pass diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "rc-low-pass" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildRcLowPassDiagnostics(scenario, snapshot)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.cutoffFrequencyHertz).toBeCloseTo(1.59, 2)
    expect(diagnostics.gainMagnitude).toBeCloseTo(0.6225, 3)
    expect(diagnostics.phaseLagDegrees).toBeLessThan(-40)
    expect(cards[0].label).toContain("Cutoff frequency")
    expect(cards[1].value).toContain("0.623")
    expect(guides.primary[0]?.label).toBe("Cutoff frequency")
    expect(guides.primary[1]?.label).toBe("-3 dB output")
  })

  it("builds RC high-pass diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "rc-high-pass" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildRcHighPassDiagnostics(scenario, snapshot)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.cutoffFrequencyHertz).toBeCloseTo(1.59, 2)
    expect(diagnostics.gainMagnitude).toBeCloseTo(0.7825, 3)
    expect(diagnostics.phaseLeadDegrees).toBeGreaterThan(35)
    expect(cards[0].label).toContain("Cutoff frequency")
    expect(cards[2].label).toContain("Phase lead")
    expect(guides.primary[0]?.label).toBe("Cutoff frequency")
    expect(guides.primary[1]?.label).toBe("-3 dB output")
  })

  it("builds RL low-pass diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "rl-low-pass" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildRlLowPassDiagnostics(scenario, snapshot)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.cutoffFrequencyHertz).toBeCloseTo(3.18, 2)
    expect(diagnostics.gainMagnitude).toBeCloseTo(0.705, 2)
    expect(diagnostics.phaseLagDegrees).toBeLessThan(-40)
    expect(cards[0].label).toContain("Cutoff frequency")
    expect(cards[3].label).toContain("Magnetic energy")
    expect(guides.primary[0]?.label).toBe("Cutoff frequency")
    expect(guides.tertiary[0]?.label).toBe("Magnetic energy")
  })

  it("builds RL high-pass diagnostics, insight cards, and plot guides", () => {
    const scenario = {
      id: "rl-high-pass" as const,
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
    }
    const snapshot = {
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
    }
    const samples = [
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
    ]

    const diagnostics = buildRlHighPassDiagnostics(scenario, snapshot)
    const cards = buildInsightCards(scenario, snapshot, samples)
    const guides = buildPlotGuides(scenario, snapshot, samples)

    expect(diagnostics.cutoffFrequencyHertz).toBeCloseTo(3.18, 2)
    expect(diagnostics.gainMagnitude).toBeCloseTo(0.705, 2)
    expect(diagnostics.phaseLeadDegrees).toBeGreaterThan(40)
    expect(cards[2].label).toContain("Phase lead")
    expect(cards[3].label).toContain("Magnetic energy")
    expect(guides.primary[0]?.label).toBe("Cutoff frequency")
    expect(guides.tertiary[0]?.label).toBe("Magnetic energy")
  })

  it("builds resistor-network insight cards", () => {
    const cards = buildInsightCards(
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
    )

    expect(cards).toHaveLength(4)
    expect(cards[0].label).toContain("Equivalent resistance")
    expect(cards[1].value).toContain("7.20")
  })

  it("builds RLC insight cards", () => {
    const samples = [
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
    ]
    const cards = buildInsightCards(
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
      samples,
    )

    expect(cards).toHaveLength(5)
    expect(cards[0].label).toContain("Damping regime")
    expect(cards[0].value).toContain("Underdamped")
    expect(cards[1].value).toContain("1.20")
    expect(cards[3].value).toContain("2")
  })

  it("builds RLC diagnostics from sampled oscillation behavior", () => {
    const diagnostics = buildRlcDiagnostics(
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

    expect(diagnostics.dampingRegime).toBe("Underdamped")
    expect(diagnostics.peakOvershootVoltage).toBeCloseTo(1.2, 6)
    expect(diagnostics.currentReversalCount).toBe(3)
    expect(diagnostics.settlingTimeSeconds).toBeCloseTo(1.0, 6)
  })

  it("builds resonance diagnostics and insight cards from a frequency sweep", () => {
    const samples = [
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
    ]
    const diagnostics = buildResonanceDiagnostics(
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
      samples,
    )
    const cards = buildInsightCards(
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
      samples,
    )

    expect(diagnostics.resonantFrequencyHertz).toBeCloseTo(5.03, 2)
    expect(diagnostics.peakCurrentFrequencyHertz).toBeCloseTo(5, 6)
    expect(diagnostics.peakPowerWatts).toBeCloseTo(9, 6)
    expect(cards[0].label).toContain("Resonant frequency")
    expect(cards[2].value).toContain("9.55")
  })

  it("builds scenario-specific plot guides for RLC settling and overshoot cues", () => {
    const guides = buildPlotGuides(
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

    expect(guides.primary.map((guide) => guide.label)).toContain("Source setpoint")
    expect(guides.primary.map((guide) => guide.label)).toContain("Peak overshoot")
    expect(guides.primary.map((guide) => guide.label)).toContain("Settling time")
    expect(guides.secondary[0]?.label).toBe("Current zero")
  })
})

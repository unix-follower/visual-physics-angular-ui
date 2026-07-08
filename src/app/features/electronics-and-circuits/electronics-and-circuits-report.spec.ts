import {
  buildCircuitReportCsv,
  buildCircuitReportSummaryRows,
} from "./electronics-and-circuits-report"

describe("electronics-and-circuits-report", () => {
  it("builds an RC transient CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Time constant")
    expect(summaryRows[0]?.displayValue).toBe("2.200 s")
    expect(csv).toContain("metric,value")
    expect(csv).toContain("time_constant,2.200000")
    expect(csv).toContain("steady_state_error,6.000000")
    expect(csv).toContain("active_capacitor_voltage,3.000000")
    expect(csv).toContain("scenario_id,scenario_name,source_voltage,resistance")
    expect(csv).toContain("rc-transient,RC Transient Response")
    expect(csv).toContain("1.000000,3.000000,0.020000,0.030000,0.045000,6.000000,2.200000")
  })

  it("builds a resistor-network CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
        equivalentResistance: 550,
      },
      [],
    )
    const csv = buildCircuitReportCsv(
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
        equivalentResistance: 550,
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Equivalent resistance")
    expect(summaryRows[0]?.displayValue).toBe("550.0 Ω")
    expect(csv).toContain("metric,value")
    expect(csv).toContain("equivalent_resistance,550.000000")
    expect(csv).toContain("output_voltage,7.200000")
    expect(csv).toContain("load_power,0.172800")
    expect(csv).toContain(
      "scenario_id,scenario_name,source_voltage,upper_resistance,lower_resistance",
    )
    expect(csv).toContain("resistor-network,Resistor Divider Network")
    expect(csv).toContain("0.000000,7.200000,0.024000,550.000000,4.800000,0.172800")
  })

  it("builds an RC low-pass CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Cutoff frequency")
    expect(summaryRows[1]?.label).toBe("Active gain")
    expect(csv).toContain("cutoff_frequency_hz,1.591549")
    expect(csv).toContain("phase_lag_degrees")
    expect(csv).toContain("rc-low-pass,RC Low-Pass Filter")
    expect(csv).toContain("2.000000,4.980000,0.062700")
  })

  it("builds an RC high-pass CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Cutoff frequency")
    expect(summaryRows[2]?.label).toBe("Phase lead")
    expect(csv).toContain("cutoff_frequency_hz,1.591549")
    expect(csv).toContain("phase_lead_degrees")
    expect(csv).toContain("rc-high-pass,RC High-Pass Filter")
    expect(csv).toContain("2.000000,6.260000,0.062600")
  })

  it("builds an RL transient CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Time constant")
    expect(summaryRows[3]?.label).toBe("Flux linkage")
    expect(csv).toContain("rl-transient,RL Transient Response")
    expect(csv).toContain("time_constant_seconds,0.083333")
    expect(csv).toContain("0.200000,0.810000,1.365000")
  })

  it("builds a half-wave rectifier CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Peak output voltage")
    expect(summaryRows[3]?.label).toBe("Conduction duty")
    expect(csv).toContain("half-wave-rectifier,Half-Wave Rectifier")
    expect(csv).toContain("peak_output_voltage,7.300000")
    expect(csv).toContain("0.005000,8.000000,7.300000,0.033200")
  })

  it("builds a full-wave rectifier CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
    const csv = buildCircuitReportCsv(
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

    expect(summaryRows[3]?.label).toBe("Ripple frequency")
    expect(csv).toContain("full-wave-rectifier,Full-Wave Rectifier")
    expect(csv).toContain("ripple_frequency_hz,100.000000")
    expect(csv).toContain("0.015000,-8.000000,6.600000,0.030000")
  })

  it("builds a smoothed rectifier CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
    const csv = buildCircuitReportCsv(
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
      [
        {
          timeSeconds: 0.015,
          capacitorVoltage: -8,
          outputVoltage: 6.05,
          current: 0.0275,
          charge: 0.00284,
          storedEnergy: 0.0086,
          branchPower: 0.1664,
        },
      ],
    )

    expect(summaryRows[0]?.label).toBe("Average DC output")
    expect(summaryRows[2]?.label).toBe("Ripple voltage")
    expect(csv).toContain("smoothed-rectifier,Smoothed Bridge Rectifier")
    expect(csv).toContain("ripple_voltage")
    expect(csv).toContain("0.015000,-8.000000,6.050000,0.027500,0.002840")
  })

  it("builds an RL low-pass CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Cutoff frequency")
    expect(summaryRows[4]?.label).toBe("Magnetic energy")
    expect(csv).toContain("cutoff_frequency_hz,3.183099")
    expect(csv).toContain("phase_lag_degrees")
    expect(csv).toContain("rl-low-pass,RL Low-Pass Filter")
    expect(csv).toContain("3.200000,5.640000,1.410000")
  })

  it("builds an RL high-pass CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      [],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Cutoff frequency")
    expect(summaryRows[2]?.label).toBe("Phase lead")
    expect(summaryRows[4]?.label).toBe("Magnetic energy")
    expect(csv).toContain("cutoff_frequency_hz,3.183099")
    expect(csv).toContain("phase_lead_degrees")
    expect(csv).toContain("rl-high-pass,RL High-Pass Filter")
    expect(csv).toContain("3.200000,5.640000,1.410000")
  })

  it("builds an RLC CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
        {
          timeSeconds: 1.2,
          capacitorVoltage: 8.1,
          outputVoltage: 8.1,
          current: -0.14,
          charge: 0.405,
          storedEnergy: 1.75,
          branchPower: -1.26,
        },
      ],
    )
    const csv = buildCircuitReportCsv(
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
          current: 0,
          charge: 0,
          storedEnergy: 0,
          branchPower: 0,
        },
        {
          timeSeconds: 1.2,
          capacitorVoltage: 8.1,
          outputVoltage: 8.1,
          current: -0.14,
          charge: 0.405,
          storedEnergy: 1.75,
          branchPower: -1.26,
        },
      ],
    )

    expect(summaryRows[0]?.label).toBe("Damping regime")
    expect(summaryRows[0]?.displayValue).toBe("Underdamped")
    expect(csv).toContain("metric,value")
    expect(csv).toContain("damping_regime,Underdamped")
    expect(csv).toContain("peak_overshoot_voltage,0.000000")
    expect(csv).toContain("settling_time_seconds,not-settled")
    expect(csv).toContain("current_reversal_count,0")
    expect(csv).toContain(
      "scenario_id,scenario_name,source_voltage,resistance,inductance,capacitance",
    )
    expect(csv).toContain("rlc-response,RLC Step Response")
    expect(csv).toContain("1.200000,8.100000,-0.140000,0.405000,1.750000,-0.840000,0.083333")
  })

  it("builds an RLC resonance CSV report", () => {
    const summaryRows = buildCircuitReportSummaryRows(
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
      ],
    )
    const csv = buildCircuitReportCsv(
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
      ],
    )

    expect(summaryRows[0]?.label).toBe("Resonant frequency")
    expect(summaryRows[1]?.displayValue).toBe("1.58")
    expect(csv).toContain("resonant_frequency_hz,5.032921")
    expect(csv).toContain("peak_power_watts,9.000000")
    expect(csv).toContain(
      "scenario_id,scenario_name,source_voltage,resistance,inductance,capacitance,frequency_hz",
    )
    expect(csv).toContain("rlc-resonance,RLC Resonance Sweep")
    expect(csv).toContain(
      "5.000000,9.550000,1.500000,0.047750,0.340250,6.000000,9.000000,5.032921,3.183099",
    )
  })
})

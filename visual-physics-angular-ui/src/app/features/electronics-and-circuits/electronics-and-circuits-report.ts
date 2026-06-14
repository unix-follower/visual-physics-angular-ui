import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenario,
  ElectronicsAndCircuitsStateSnapshot,
} from "./electronics-and-circuits.models"
import {
  buildFullWaveRectifierDiagnostics,
  buildHalfWaveRectifierDiagnostics,
  buildSmoothedRectifierDiagnostics,
  buildRlTransientDiagnostics,
  buildRlHighPassDiagnostics,
  buildRlLowPassDiagnostics,
  buildRcHighPassDiagnostics,
  buildRcLowPassDiagnostics,
  buildResonanceDiagnostics,
  buildRlcDiagnostics,
} from "./electronics-and-circuits-analytics"

export interface CircuitReportSummaryRow {
  metric: string
  label: string
  displayValue: string
  csvValue: string
  detail: string
}

export function buildCircuitReportSummaryRows(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): CircuitReportSummaryRow[] {
  if (scenario.id === "smoothed-rectifier") {
    const diagnostics = buildSmoothedRectifierDiagnostics(samples)
    return [
      {
        metric: "average_output_voltage",
        label: "Average DC output",
        displayValue: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.averageOutputVoltage.toFixed(6),
        detail: "Average smoothed output voltage across the sampled steady-state window.",
      },
      {
        metric: "minimum_output_voltage",
        label: "Minimum output voltage",
        displayValue: `${diagnostics.minimumOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.minimumOutputVoltage.toFixed(6),
        detail: "Lowest output voltage reached before the reservoir capacitor is recharged.",
      },
      {
        metric: "ripple_voltage",
        label: "Ripple voltage",
        displayValue: `${diagnostics.rippleVoltage.toFixed(2)} V`,
        csvValue: diagnostics.rippleVoltage.toFixed(6),
        detail: "Peak-to-peak ripple across the smoothed DC output.",
      },
      {
        metric: "ripple_percent",
        label: "Ripple factor",
        displayValue: `${diagnostics.ripplePercent.toFixed(1)}%`,
        csvValue: diagnostics.ripplePercent.toFixed(6),
        detail: "Ripple voltage expressed as a percentage of the average DC output.",
      },
      {
        metric: "active_stored_energy",
        label: "Active stored energy",
        displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
        csvValue: snapshot.storedEnergy.toFixed(6),
        detail: "Energy stored in the reservoir capacitor at the active time cursor.",
      },
    ]
  }

  if (scenario.id === "full-wave-rectifier") {
    const diagnostics = buildFullWaveRectifierDiagnostics(samples)
    return [
      {
        metric: "peak_output_voltage",
        label: "Peak output voltage",
        displayValue: `${diagnostics.peakOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.peakOutputVoltage.toFixed(6),
        detail:
          "Maximum full-wave rectified load voltage observed across the sampled source waveform.",
      },
      {
        metric: "average_output_voltage",
        label: "Average output",
        displayValue: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.averageOutputVoltage.toFixed(6),
        detail: "Average full-wave rectified load voltage across the sampled interval.",
      },
      {
        metric: "rms_output_voltage",
        label: "RMS output",
        displayValue: `${diagnostics.rmsOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.rmsOutputVoltage.toFixed(6),
        detail: "Effective full-wave load voltage across the sampled interval.",
      },
      {
        metric: "ripple_frequency_hz",
        label: "Ripple frequency",
        displayValue: `${diagnostics.rippleFrequencyHertz.toFixed(0)} Hz`,
        csvValue: diagnostics.rippleFrequencyHertz.toFixed(6),
        detail: "Bridge rectification doubles the line ripple frequency at the load.",
      },
      {
        metric: "active_load_power",
        label: "Active load power",
        displayValue: `${snapshot.branchPower.toFixed(4)} W`,
        csvValue: snapshot.branchPower.toFixed(6),
        detail: "Instantaneous resistor power at the active time cursor.",
      },
    ]
  }

  if (scenario.id === "half-wave-rectifier") {
    const diagnostics = buildHalfWaveRectifierDiagnostics(samples)
    return [
      {
        metric: "peak_output_voltage",
        label: "Peak output voltage",
        displayValue: `${diagnostics.peakOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.peakOutputVoltage.toFixed(6),
        detail: "Maximum rectified load voltage observed across the sampled source waveform.",
      },
      {
        metric: "average_output_voltage",
        label: "Average output",
        displayValue: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.averageOutputVoltage.toFixed(6),
        detail: "Average rectified load voltage across the sampled interval.",
      },
      {
        metric: "rms_output_voltage",
        label: "RMS output",
        displayValue: `${diagnostics.rmsOutputVoltage.toFixed(2)} V`,
        csvValue: diagnostics.rmsOutputVoltage.toFixed(6),
        detail: "Effective load voltage across the sampled interval.",
      },
      {
        metric: "conduction_duty_percent",
        label: "Conduction duty",
        displayValue: `${diagnostics.conductionDutyPercent.toFixed(1)}%`,
        csvValue: diagnostics.conductionDutyPercent.toFixed(6),
        detail: "Sampled fraction of time where the diode conducts current into the load.",
      },
      {
        metric: "active_load_power",
        label: "Active load power",
        displayValue: `${snapshot.branchPower.toFixed(4)} W`,
        csvValue: snapshot.branchPower.toFixed(6),
        detail: "Instantaneous resistor power at the active time cursor.",
      },
    ]
  }

  if (scenario.id === "rl-transient") {
    const diagnostics = buildRlTransientDiagnostics(scenario, snapshot)
    return [
      {
        metric: "time_constant_seconds",
        label: "Time constant",
        displayValue: `${diagnostics.timeConstantSeconds.toFixed(3)} s`,
        csvValue: diagnostics.timeConstantSeconds.toFixed(6),
        detail: "Characteristic RL current-rise timescale after the step input.",
      },
      {
        metric: "current_rise_percent",
        label: "Current rise",
        displayValue: `${diagnostics.currentRisePercent.toFixed(1)}%`,
        csvValue: diagnostics.currentRisePercent.toFixed(6),
        detail: "Fraction of the final branch current reached at the active time selection.",
      },
      {
        metric: "remaining_inductor_voltage_percent",
        label: "Remaining inductor voltage",
        displayValue: `${diagnostics.remainingInductorVoltagePercent.toFixed(1)}%`,
        csvValue: diagnostics.remainingInductorVoltagePercent.toFixed(6),
        detail:
          "Fraction of the initial inductor voltage still present at the active time selection.",
      },
      {
        metric: "flux_linkage",
        label: "Flux linkage",
        displayValue: `${diagnostics.fluxLinkage.toFixed(4)} Wb-turn`,
        csvValue: diagnostics.fluxLinkage.toFixed(6),
        detail: "Magnetic flux linkage accumulated in the inductor.",
      },
      {
        metric: "stored_energy",
        label: "Stored energy",
        displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
        csvValue: snapshot.storedEnergy.toFixed(6),
        detail: "Inductor energy at the selected transient instant.",
      },
    ]
  }

  if (scenario.id === "rl-high-pass") {
    const diagnostics = buildRlHighPassDiagnostics(scenario, snapshot)
    return [
      {
        metric: "cutoff_frequency_hz",
        label: "Cutoff frequency",
        displayValue: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.cutoffFrequencyHertz.toFixed(6),
        detail: "Frequency where the first-order RL high-pass filter reaches its -3 dB corner.",
      },
      {
        metric: "active_gain",
        label: "Active gain",
        displayValue: diagnostics.gainMagnitude.toFixed(3),
        csvValue: diagnostics.gainMagnitude.toFixed(6),
        detail:
          "Inductor-output magnitude ratio relative to the source at the active sweep frequency.",
      },
      {
        metric: "phase_lead_degrees",
        label: "Phase lead",
        displayValue: `${diagnostics.phaseLeadDegrees.toFixed(1)}°`,
        csvValue: diagnostics.phaseLeadDegrees.toFixed(6),
        detail: "Output phase lead of the inductor node relative to the source.",
      },
      {
        metric: "active_output_voltage",
        label: "Active output voltage",
        displayValue: `${snapshot.outputVoltage.toFixed(2)} V`,
        csvValue: snapshot.outputVoltage.toFixed(6),
        detail: "RL high-pass output magnitude at the selected frequency.",
      },
      {
        metric: "magnetic_energy",
        label: "Magnetic energy",
        displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
        csvValue: snapshot.storedEnergy.toFixed(6),
        detail: "Energy stored in the inductor at the active sweep frequency.",
      },
    ]
  }

  if (scenario.id === "rl-low-pass") {
    const diagnostics = buildRlLowPassDiagnostics(scenario, snapshot)
    return [
      {
        metric: "cutoff_frequency_hz",
        label: "Cutoff frequency",
        displayValue: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.cutoffFrequencyHertz.toFixed(6),
        detail: "Frequency where the first-order RL low-pass filter reaches its -3 dB corner.",
      },
      {
        metric: "active_gain",
        label: "Active gain",
        displayValue: diagnostics.gainMagnitude.toFixed(3),
        csvValue: diagnostics.gainMagnitude.toFixed(6),
        detail:
          "Resistor-output magnitude ratio relative to the source at the active sweep frequency.",
      },
      {
        metric: "phase_lag_degrees",
        label: "Phase lag",
        displayValue: `${diagnostics.phaseLagDegrees.toFixed(1)}°`,
        csvValue: diagnostics.phaseLagDegrees.toFixed(6),
        detail: "Output phase lag of the resistor node relative to the source.",
      },
      {
        metric: "active_output_voltage",
        label: "Active output voltage",
        displayValue: `${snapshot.outputVoltage.toFixed(2)} V`,
        csvValue: snapshot.outputVoltage.toFixed(6),
        detail: "RL low-pass output magnitude at the selected frequency.",
      },
      {
        metric: "magnetic_energy",
        label: "Magnetic energy",
        displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
        csvValue: snapshot.storedEnergy.toFixed(6),
        detail: "Energy stored in the inductor at the active sweep frequency.",
      },
    ]
  }

  if (scenario.id === "rc-high-pass") {
    const diagnostics = buildRcHighPassDiagnostics(scenario, snapshot)
    return [
      {
        metric: "cutoff_frequency_hz",
        label: "Cutoff frequency",
        displayValue: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.cutoffFrequencyHertz.toFixed(6),
        detail: "Frequency where the first-order RC high-pass filter reaches its -3 dB corner.",
      },
      {
        metric: "active_gain",
        label: "Active gain",
        displayValue: diagnostics.gainMagnitude.toFixed(3),
        csvValue: diagnostics.gainMagnitude.toFixed(6),
        detail:
          "Resistor-output magnitude ratio relative to the source at the active sweep frequency.",
      },
      {
        metric: "phase_lead_degrees",
        label: "Phase lead",
        displayValue: `${diagnostics.phaseLeadDegrees.toFixed(1)}°`,
        csvValue: diagnostics.phaseLeadDegrees.toFixed(6),
        detail: "Output phase lead of the resistor node relative to the source.",
      },
      {
        metric: "active_output_voltage",
        label: "Active output voltage",
        displayValue: `${snapshot.outputVoltage.toFixed(2)} V`,
        csvValue: snapshot.outputVoltage.toFixed(6),
        detail: "High-pass output magnitude at the selected frequency.",
      },
      {
        metric: "dissipated_power",
        label: "Dissipated power",
        displayValue: `${snapshot.branchPower.toFixed(4)} W`,
        csvValue: snapshot.branchPower.toFixed(6),
        detail: "Resistor power at the active sweep frequency.",
      },
    ]
  }

  if (scenario.id === "rc-low-pass") {
    const diagnostics = buildRcLowPassDiagnostics(scenario, snapshot)
    return [
      {
        metric: "cutoff_frequency_hz",
        label: "Cutoff frequency",
        displayValue: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.cutoffFrequencyHertz.toFixed(6),
        detail: "Frequency where the first-order RC filter reaches its -3 dB corner.",
      },
      {
        metric: "active_gain",
        label: "Active gain",
        displayValue: diagnostics.gainMagnitude.toFixed(3),
        csvValue: diagnostics.gainMagnitude.toFixed(6),
        detail: "Output-to-source magnitude ratio at the active sweep frequency.",
      },
      {
        metric: "phase_lag_degrees",
        label: "Phase lag",
        displayValue: `${diagnostics.phaseLagDegrees.toFixed(1)}°`,
        csvValue: diagnostics.phaseLagDegrees.toFixed(6),
        detail: "Output phase lag of the capacitor node relative to the source.",
      },
      {
        metric: "active_output_voltage",
        label: "Active output voltage",
        displayValue: `${snapshot.outputVoltage.toFixed(2)} V`,
        csvValue: snapshot.outputVoltage.toFixed(6),
        detail: "Filter output magnitude at the selected frequency.",
      },
      {
        metric: "stored_energy",
        label: "Stored energy",
        displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
        csvValue: snapshot.storedEnergy.toFixed(6),
        detail: "Capacitor energy associated with the active output magnitude.",
      },
    ]
  }

  if (scenario.id === "resistor-network") {
    return [
      {
        metric: "equivalent_resistance",
        label: "Equivalent resistance",
        displayValue: `${snapshot.equivalentResistance.toFixed(1)} Ω`,
        csvValue: snapshot.equivalentResistance.toFixed(6),
        detail: "Combined series resistance seen by the source across the divider branch.",
      },
      {
        metric: "output_voltage",
        label: "Output voltage",
        displayValue: `${snapshot.outputVoltage.toFixed(2)} V`,
        csvValue: snapshot.outputVoltage.toFixed(6),
        detail: "Divider output measured across the lower resistor.",
      },
      {
        metric: "branch_current",
        label: "Branch current",
        displayValue: `${snapshot.current.toFixed(4)} A`,
        csvValue: snapshot.current.toFixed(6),
        detail: "Current through the two-resistor series branch.",
      },
      {
        metric: "upper_resistor_drop",
        label: "Upper resistor drop",
        displayValue: `${snapshot.resistorVoltageDrop.toFixed(2)} V`,
        csvValue: snapshot.resistorVoltageDrop.toFixed(6),
        detail: "Voltage dropped across the upper divider resistor.",
      },
      {
        metric: "load_power",
        label: "Load power",
        displayValue: `${snapshot.branchPower.toFixed(4)} W`,
        csvValue: snapshot.branchPower.toFixed(6),
        detail: "Power dissipated across the lower resistor load.",
      },
    ]
  }

  if (scenario.id === "rlc-resonance") {
    const diagnostics = buildResonanceDiagnostics(scenario, samples)
    return [
      {
        metric: "resonant_frequency_hz",
        label: "Resonant frequency",
        displayValue: `${diagnostics.resonantFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.resonantFrequencyHertz.toFixed(6),
        detail: "Natural frequency where the sweep impedance reaches its minimum.",
      },
      {
        metric: "quality_factor",
        label: "Quality factor",
        displayValue: diagnostics.qualityFactor.toFixed(2),
        csvValue: diagnostics.qualityFactor.toFixed(6),
        detail: "Resonance sharpness for the active series RLC sweep.",
      },
      {
        metric: "peak_capacitor_voltage",
        label: "Peak capacitor voltage",
        displayValue: `${diagnostics.peakCapacitorVoltage.toFixed(2)} V`,
        csvValue: diagnostics.peakCapacitorVoltage.toFixed(6),
        detail: "Maximum sampled capacitor voltage across the frequency sweep.",
      },
      {
        metric: "peak_current_frequency_hz",
        label: "Peak current frequency",
        displayValue: `${diagnostics.peakCurrentFrequencyHertz.toFixed(2)} Hz`,
        csvValue: diagnostics.peakCurrentFrequencyHertz.toFixed(6),
        detail: "Sampled frequency where the series current is largest.",
      },
      {
        metric: "peak_power_watts",
        label: "Peak dissipated power",
        displayValue: `${diagnostics.peakPowerWatts.toFixed(2)} W`,
        csvValue: diagnostics.peakPowerWatts.toFixed(6),
        detail: "Largest resistor power encountered across the sweep.",
      },
    ]
  }

  if (scenario.id === "rlc-response") {
    const diagnostics = buildRlcDiagnostics(scenario, samples)
    return [
      {
        metric: "damping_regime",
        label: "Damping regime",
        displayValue: diagnostics.dampingRegime,
        csvValue: diagnostics.dampingRegime,
        detail: "Qualitative classification of the series RLC step response.",
      },
      {
        metric: "damping_ratio",
        label: "Damping ratio",
        displayValue: diagnostics.dampingRatio.toFixed(2),
        csvValue: diagnostics.dampingRatio.toFixed(6),
        detail:
          "Computed from $\zeta = \frac{R}{2}\sqrt{\frac{C}{L}}$ for the active configuration.",
      },
      {
        metric: "peak_overshoot_voltage",
        label: "Peak overshoot",
        displayValue: `${diagnostics.peakOvershootVoltage.toFixed(2)} V`,
        csvValue: diagnostics.peakOvershootVoltage.toFixed(6),
        detail: "Maximum sampled capacitor-voltage excursion above the source setpoint.",
      },
      {
        metric: "settling_time_seconds",
        label: "Settling time",
        displayValue:
          diagnostics.settlingTimeSeconds === null
            ? "Not settled"
            : `${diagnostics.settlingTimeSeconds.toFixed(2)} s`,
        csvValue:
          diagnostics.settlingTimeSeconds === null
            ? "not-settled"
            : diagnostics.settlingTimeSeconds.toFixed(6),
        detail:
          "First sampled time after which the capacitor voltage stays inside the 5% settling band.",
      },
      {
        metric: "current_reversal_count",
        label: "Current reversals",
        displayValue: `${diagnostics.currentReversalCount}`,
        csvValue: `${diagnostics.currentReversalCount}`,
        detail: "Number of sampled current sign changes during the transient.",
      },
    ]
  }

  return [
    {
      metric: "time_constant",
      label: "Time constant",
      displayValue: `${snapshot.timeConstant.toFixed(3)} s`,
      csvValue: snapshot.timeConstant.toFixed(6),
      detail: "Characteristic RC charging timescale for the active transient.",
    },
    {
      metric: "steady_state_error",
      label: "Steady-state error",
      displayValue: `${snapshot.steadyStateError.toFixed(2)} V`,
      csvValue: snapshot.steadyStateError.toFixed(6),
      detail: "Voltage gap between the source and capacitor at the active time cursor.",
    },
    {
      metric: "active_capacitor_voltage",
      label: "Active capacitor voltage",
      displayValue: `${snapshot.capacitorVoltage.toFixed(2)} V`,
      csvValue: snapshot.capacitorVoltage.toFixed(6),
      detail: "Capacitor voltage at the current time selection.",
    },
    {
      metric: "active_current",
      label: "Active current",
      displayValue: `${snapshot.current.toFixed(4)} A`,
      csvValue: snapshot.current.toFixed(6),
      detail: "Charging current through the RC branch at the active time cursor.",
    },
    {
      metric: "stored_energy",
      label: "Stored energy",
      displayValue: `${snapshot.storedEnergy.toFixed(4)} J`,
      csvValue: snapshot.storedEnergy.toFixed(6),
      detail: "Energy stored in the capacitor at the selected instant.",
    },
  ]
}

export function buildCircuitReportCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  if (scenario.id === "smoothed-rectifier") {
    return buildSmoothedRectifierCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "full-wave-rectifier") {
    return buildFullWaveRectifierCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "half-wave-rectifier") {
    return buildHalfWaveRectifierCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rl-transient") {
    return buildRlTransientCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rl-high-pass") {
    return buildRlHighPassCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rl-low-pass") {
    return buildRlLowPassCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rc-high-pass") {
    return buildRcHighPassCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rc-low-pass") {
    return buildRcLowPassCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "resistor-network") {
    return buildResistorNetworkCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rlc-resonance") {
    return buildRlcResonanceCsv(scenario, snapshot, samples)
  }

  if (scenario.id === "rlc-response") {
    return buildRlcResponseCsv(scenario, snapshot, samples)
  }

  return buildRcTransientCsv(scenario, snapshot, samples)
}

function buildRcTransientCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,capacitance,initial_charge,time_seconds,capacitor_voltage,current,charge,stored_energy,resistor_voltage_drop,time_constant",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        scenario.capacitance.toFixed(6),
        scenario.initialCharge.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        formatInterpolatedDrop(sample, snapshot, samples).toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRlTransientCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const inductance = scenario.inductance ?? 0
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,inductance,time_seconds,inductor_voltage,current,flux_linkage,stored_energy,resistor_voltage_drop,branch_power,time_constant_seconds",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        inductance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.branchPower.toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildHalfWaveRectifierCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_amplitude,resistance,time_seconds,input_voltage,output_voltage,current,conduction_state,load_power,cycle_seconds",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.branchPower.toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildFullWaveRectifierCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const lineFrequencyHertz = 50
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_amplitude,resistance,line_frequency_hz,time_seconds,source_voltage,output_voltage,current,branch_power,ripple_period_seconds",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        lineFrequencyHertz.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.branchPower.toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildSmoothedRectifierCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const lineFrequencyHertz = 50
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_amplitude,resistance,capacitance,line_frequency_hz,time_seconds,source_voltage,output_voltage,current,charge,stored_energy,branch_power,rc_time_constant",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        scenario.capacitance.toFixed(6),
        lineFrequencyHertz.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        sample.branchPower.toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRcLowPassCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const diagnostics = buildRcLowPassDiagnostics(scenario, snapshot)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,capacitance,frequency_hz,output_voltage,current,charge,stored_energy,resistor_voltage_drop,branch_power,cutoff_frequency_hz,phase_lag_degrees,active_gain",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        scenario.capacitance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        (scenario.sourceVoltage - sample.outputVoltage).toFixed(6),
        sample.branchPower.toFixed(6),
        diagnostics.cutoffFrequencyHertz.toFixed(6),
        (
          -(
            Math.atan(
              2 * Math.PI * sample.timeSeconds * scenario.resistance * scenario.capacitance,
            ) * 180
          ) / Math.PI
        ).toFixed(6),
        (Math.abs(scenario.sourceVoltage) <= 1e-6
          ? 0
          : Math.abs(sample.outputVoltage) / Math.abs(scenario.sourceVoltage)
        ).toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRcHighPassCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const diagnostics = buildRcHighPassDiagnostics(scenario, snapshot)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,capacitance,frequency_hz,output_voltage,current,capacitor_voltage,charge,stored_energy,resistor_voltage_drop,branch_power,cutoff_frequency_hz,phase_lead_degrees,active_gain",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        scenario.capacitance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.branchPower.toFixed(6),
        diagnostics.cutoffFrequencyHertz.toFixed(6),
        (
          (Math.atan(
            1 /
              Math.max(
                2 * Math.PI * sample.timeSeconds * scenario.resistance * scenario.capacitance,
                1e-6,
              ),
          ) *
            180) /
          Math.PI
        ).toFixed(6),
        (Math.abs(scenario.sourceVoltage) <= 1e-6
          ? 0
          : Math.abs(sample.outputVoltage) / Math.abs(scenario.sourceVoltage)
        ).toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRlLowPassCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const diagnostics = buildRlLowPassDiagnostics(scenario, snapshot)
  const inductance = scenario.inductance ?? 0
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,inductance,frequency_hz,output_voltage,current,inductor_voltage,magnetic_flux_linkage,stored_energy,resistor_voltage_drop,branch_power,cutoff_frequency_hz,phase_lag_degrees,active_gain",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        inductance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.branchPower.toFixed(6),
        diagnostics.cutoffFrequencyHertz.toFixed(6),
        (
          -(
            Math.atan(
              (2 * Math.PI * sample.timeSeconds * Math.max(inductance, 1e-6)) /
                Math.max(scenario.resistance, 1e-6),
            ) * 180
          ) / Math.PI
        ).toFixed(6),
        (Math.abs(scenario.sourceVoltage) <= 1e-6
          ? 0
          : Math.abs(sample.outputVoltage) / Math.abs(scenario.sourceVoltage)
        ).toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRlHighPassCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const diagnostics = buildRlHighPassDiagnostics(scenario, snapshot)
  const inductance = scenario.inductance ?? 0
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,inductance,frequency_hz,output_voltage,current,resistor_voltage,magnetic_flux_linkage,stored_energy,resistor_voltage_drop,branch_power,cutoff_frequency_hz,phase_lead_degrees,active_gain",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        inductance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.branchPower.toFixed(6),
        diagnostics.cutoffFrequencyHertz.toFixed(6),
        (
          (Math.atan(
            Math.max(scenario.resistance, 1e-6) /
              Math.max(2 * Math.PI * sample.timeSeconds * Math.max(inductance, 1e-6), 1e-6),
          ) *
            180) /
          Math.PI
        ).toFixed(6),
        (Math.abs(scenario.sourceVoltage) <= 1e-6
          ? 0
          : Math.abs(sample.outputVoltage) / Math.abs(scenario.sourceVoltage)
        ).toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildResistorNetworkCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,upper_resistance,lower_resistance,time_seconds,output_voltage,branch_current,equivalent_resistance,upper_resistor_drop,load_power",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        (scenario.secondaryResistance ?? 0).toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.outputVoltage.toFixed(6),
        sample.current.toFixed(6),
        snapshot.equivalentResistance.toFixed(6),
        snapshot.resistorVoltageDrop.toFixed(6),
        sample.branchPower.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRlcResponseCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,inductance,capacitance,initial_charge,time_seconds,capacitor_voltage,current,charge,stored_energy,resistor_voltage_drop,damping_timescale",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        (scenario.inductance ?? 0).toFixed(6),
        scenario.capacitance.toFixed(6),
        scenario.initialCharge.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        (snapshot.equivalentResistance * sample.current).toFixed(6),
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function buildRlcResonanceCsv(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): string {
  const summaryRows = buildCircuitReportSummaryRows(scenario, snapshot, samples)
  const inductance = scenario.inductance ?? 0
  const resonantFrequencyHertz =
    summaryRows.find((row) => row.metric === "resonant_frequency_hz")?.csvValue ?? "0.000000"
  const rows = [
    "metric,value",
    ...summaryRows.map((row) => `${row.metric},${row.csvValue}`),
    "",
    "scenario_id,scenario_name,source_voltage,resistance,inductance,capacitance,frequency_hz,capacitor_voltage,current,charge,stored_energy,resistor_voltage_drop,branch_power,resonant_frequency_hz,bandwidth_hz",
    ...samples.map((sample) =>
      [
        scenario.id,
        formatCsvText(scenario.name),
        scenario.sourceVoltage.toFixed(6),
        scenario.resistance.toFixed(6),
        inductance.toFixed(6),
        scenario.capacitance.toFixed(6),
        sample.timeSeconds.toFixed(6),
        sample.capacitorVoltage.toFixed(6),
        sample.current.toFixed(6),
        sample.charge.toFixed(6),
        sample.storedEnergy.toFixed(6),
        (snapshot.equivalentResistance * sample.current).toFixed(6),
        sample.branchPower.toFixed(6),
        resonantFrequencyHertz,
        snapshot.timeConstant.toFixed(6),
      ].join(","),
    ),
  ]

  return rows.join("\n")
}

function formatInterpolatedDrop(
  sample: ElectronicsAndCircuitsSample,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): number {
  if (samples.length <= 1) {
    return snapshot.resistorVoltageDrop
  }

  return snapshot.sourceVoltage - sample.capacitorVoltage
}

function formatCsvText(value: string): string {
  return value.includes(",") ? `"${value.replaceAll('"', '""')}"` : value
}

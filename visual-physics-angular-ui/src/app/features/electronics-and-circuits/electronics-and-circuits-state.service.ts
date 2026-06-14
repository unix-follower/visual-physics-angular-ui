import { computed, Injectable, signal } from "@angular/core"

import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenario,
  ElectronicsAndCircuitsScenarioId,
  ElectronicsAndCircuitsStateSnapshot,
} from "./electronics-and-circuits.models"

export type EditableElectronicsAndCircuitsField =
  | "sourceVoltage"
  | "resistance"
  | "secondaryResistance"
  | "capacitance"
  | "inductance"
  | "initialCharge"

const SCENARIOS: readonly ElectronicsAndCircuitsScenario[] = [
  {
    id: "rc-transient",
    name: "RC Transient Response",
    summary: "Track capacitor charging and current decay in a first-order RC circuit.",
    equationSummary: "Vc(t) = Vs + (V0 - Vs)e^{-t/RC}, i(t) = (Vs - Vc)/R",
    status: "Initial slice",
    durationSeconds: 6,
    viewBounds: { minX: 0, maxX: 6, minY: -0.5, maxY: 12 },
    focusArea: "Time constant, capacitor charge curve, current decay, stored energy",
    sourceVoltage: 9,
    resistance: 220,
    capacitance: 0.01,
    initialCharge: 0,
  },
  {
    id: "rl-transient",
    name: "RL Transient Response",
    summary: "Track inductor voltage decay and current rise in a first-order RL step response.",
    equationSummary: "i(t) = Vs/R (1 - e^{-tR/L}), VL(t) = Vs e^{-tR/L}",
    status: "Initial slice",
    durationSeconds: 4,
    viewBounds: { minX: 0, maxX: 4, minY: -0.5, maxY: 12 },
    focusArea: "Inductor voltage decay, branch current rise, magnetic flux linkage, stored energy",
    sourceVoltage: 9,
    resistance: 6,
    inductance: 0.5,
    capacitance: 0.01,
    initialCharge: 0,
  },
  {
    id: "half-wave-rectifier",
    name: "Half-Wave Rectifier",
    summary:
      "Inspect a diode-clipped sinusoidal source driving a resistive load through a half-wave rectifier.",
    equationSummary: "Vin = Vp sin(2πft), Vout = max(Vin - Vd, 0)",
    status: "Initial slice",
    durationSeconds: 0.04,
    viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
    focusArea: "Conduction interval, diode drop, average output, RMS load voltage, load power",
    sourceVoltage: 8,
    resistance: 220,
    capacitance: 0.01,
    initialCharge: 0,
  },
  {
    id: "full-wave-rectifier",
    name: "Full-Wave Rectifier",
    summary:
      "Inspect bridge-rectified AC delivery into a resistive load through a full-wave rectifier.",
    equationSummary: "Vin = Vp sin(2πft), Vout = max(|Vin| - 2Vd, 0)",
    status: "Initial slice",
    durationSeconds: 0.04,
    viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
    focusArea:
      "Bridge conduction, doubled ripple frequency, average output, RMS load voltage, load power",
    sourceVoltage: 8,
    resistance: 220,
    capacitance: 0.01,
    initialCharge: 0,
  },
  {
    id: "smoothed-rectifier",
    name: "Smoothed Bridge Rectifier",
    summary:
      "Inspect a bridge rectifier feeding a reservoir capacitor and resistive load in steady ripple operation.",
    equationSummary:
      "Vout \approx envelope(max(|Vin| - 2Vd, 0)) with RC discharge between recharge peaks",
    status: "Initial slice",
    durationSeconds: 0.04,
    viewBounds: { minX: 0, maxX: 0.04, minY: -10, maxY: 10 },
    focusArea:
      "Reservoir-capacitor smoothing, ripple voltage, average DC output, capacitor charge, stored energy",
    sourceVoltage: 8,
    resistance: 220,
    capacitance: 0.00047,
    initialCharge: 0,
  },
  {
    id: "rc-low-pass",
    name: "RC Low-Pass Filter",
    summary:
      "Sweep frequency through a first-order RC filter to inspect attenuation, phase lag, and cutoff behavior.",
    equationSummary: "|H(jω)| = 1 / sqrt(1 + (ωRC)^2), φ = -atan(ωRC)",
    status: "Initial slice",
    durationSeconds: 12,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
    focusArea: "Cutoff frequency, output attenuation, phase lag, branch current, stored energy",
    sourceVoltage: 8,
    resistance: 100,
    capacitance: 0.001,
    initialCharge: 0,
  },
  {
    id: "rc-high-pass",
    name: "RC High-Pass Filter",
    summary:
      "Sweep frequency through a first-order RC filter to inspect passband recovery, phase lead, and cutoff behavior at the resistor output.",
    equationSummary: "|H(jω)| = ωRC / sqrt(1 + (ωRC)^2), φ = tan^{-1}(1/(ωRC))",
    status: "Initial slice",
    durationSeconds: 12,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
    focusArea: "Cutoff frequency, passband gain, phase lead, branch current, dissipated power",
    sourceVoltage: 8,
    resistance: 100,
    capacitance: 0.001,
    initialCharge: 0,
  },
  {
    id: "rl-low-pass",
    name: "RL Low-Pass Filter",
    summary:
      "Sweep frequency through a first-order RL filter to inspect resistor-output attenuation, phase lag, and magnetic-energy storage.",
    equationSummary: "|H(jω)| = R / sqrt(R^2 + (ωL)^2), φ = -atan(ωL / R)",
    status: "Initial slice",
    durationSeconds: 12,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
    focusArea:
      "Cutoff frequency, resistor-output attenuation, phase lag, branch current, magnetic energy",
    sourceVoltage: 8,
    resistance: 4,
    inductance: 0.2,
    capacitance: 0.001,
    initialCharge: 0,
  },
  {
    id: "rl-high-pass",
    name: "RL High-Pass Filter",
    summary:
      "Sweep frequency through a first-order RL filter to inspect inductor-output recovery, phase lead, and magnetic-energy storage.",
    equationSummary: "|H(jω)| = ωL / sqrt(R^2 + (ωL)^2), φ = tan^{-1}(R / (ωL))",
    status: "Initial slice",
    durationSeconds: 12,
    viewBounds: { minX: 0, maxX: 12, minY: 0, maxY: 9 },
    focusArea:
      "Cutoff frequency, inductor-output gain, phase lead, branch current, magnetic energy",
    sourceVoltage: 8,
    resistance: 4,
    inductance: 0.2,
    capacitance: 0.001,
    initialCharge: 0,
  },
  {
    id: "resistor-network",
    name: "Resistor Divider Network",
    summary: "Inspect current, output voltage, and load power for a two-resistor divider.",
    equationSummary: "Vout = Vs R2 / (R1 + R2), I = Vs / (R1 + R2)",
    status: "Initial slice",
    durationSeconds: 1,
    viewBounds: { minX: -1, maxX: 11, minY: -2.5, maxY: 2.5 },
    focusArea:
      "Equivalent resistance, divider output voltage, branch current, power in the lower resistor",
    sourceVoltage: 12,
    resistance: 220,
    secondaryResistance: 330,
    capacitance: 1,
    initialCharge: 0,
  },
  {
    id: "rlc-response",
    name: "RLC Step Response",
    summary: "Track damped oscillation in a driven series RLC circuit after a step input.",
    equationSummary: "Lq\" + Rq' + q/C = Vs",
    status: "Initial slice",
    durationSeconds: 4,
    viewBounds: { minX: 0, maxX: 4, minY: -4, maxY: 12 },
    focusArea: "Damped oscillation, capacitor overshoot, current reversal, stored energy exchange",
    sourceVoltage: 9,
    resistance: 6,
    capacitance: 0.05,
    inductance: 0.5,
    initialCharge: 0,
  },
  {
    id: "rlc-resonance",
    name: "RLC Resonance Sweep",
    summary:
      "Sweep frequency through a driven series RLC circuit to inspect resonance, gain, and dissipated power.",
    equationSummary: "|Z| = sqrt(R^2 + (ωL - 1/(ωC))^2), I = Vs / |Z|",
    status: "Initial slice",
    durationSeconds: 20,
    viewBounds: { minX: 0, maxX: 20, minY: 0, maxY: 12 },
    focusArea: "Resonant frequency, quality factor, capacitor gain, current peak, dissipated power",
    sourceVoltage: 6,
    resistance: 4,
    capacitance: 0.005,
    inductance: 0.2,
    initialCharge: 0,
  },
] as const

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function sanitizeScenario(
  scenario: ElectronicsAndCircuitsScenario,
): ElectronicsAndCircuitsScenario {
  return {
    ...scenario,
    durationSeconds: Math.max(scenario.durationSeconds, 0.2),
    resistance: Math.max(scenario.resistance, 1e-3),
    secondaryResistance:
      scenario.secondaryResistance === undefined
        ? undefined
        : Math.max(scenario.secondaryResistance, 1e-3),
    inductance: scenario.inductance === undefined ? undefined : Math.max(scenario.inductance, 1e-6),
    capacitance: Math.max(scenario.capacitance, 1e-6),
  }
}

function buildRcSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const timeConstant = scenario.resistance * scenario.capacitance
  const initialVoltage = scenario.initialCharge / scenario.capacitance
  const exponential = Math.exp(-clampedTime / timeConstant)
  const capacitorVoltage =
    scenario.sourceVoltage + (initialVoltage - scenario.sourceVoltage) * exponential
  const current = ((scenario.sourceVoltage - initialVoltage) / scenario.resistance) * exponential
  const charge = scenario.capacitance * capacitorVoltage
  const storedEnergy = 0.5 * scenario.capacitance * capacitorVoltage * capacitorVoltage
  const resistorVoltageDrop = scenario.sourceVoltage - capacitorVoltage
  const steadyStateError = Math.abs(scenario.sourceVoltage - capacitorVoltage)

  return {
    timeSeconds: clampedTime,
    capacitorVoltage,
    outputVoltage: capacitorVoltage,
    current,
    charge,
    storedEnergy,
    branchPower: scenario.sourceVoltage * current,
    resistorVoltageDrop,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError,
    timeConstant,
    equivalentResistance: scenario.resistance,
  }
}

function buildRlTransientSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const timeConstant = inductance / Math.max(scenario.resistance, 1e-6)
  const exponential = Math.exp(-clampedTime / timeConstant)
  const steadyStateCurrent = scenario.sourceVoltage / Math.max(scenario.resistance, 1e-6)
  const current = steadyStateCurrent * (1 - exponential)
  const inductorVoltage = scenario.sourceVoltage * exponential
  const resistorVoltageDrop = scenario.sourceVoltage - inductorVoltage
  const magneticFluxLinkage = inductance * current
  const storedEnergy = 0.5 * inductance * current * current

  return {
    timeSeconds: clampedTime,
    capacitorVoltage: resistorVoltageDrop,
    outputVoltage: inductorVoltage,
    current,
    charge: magneticFluxLinkage,
    storedEnergy,
    branchPower: resistorVoltageDrop * current,
    resistorVoltageDrop,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(inductorVoltage),
    timeConstant,
    equivalentResistance: scenario.resistance,
  }
}

function buildHalfWaveRectifierSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const lineFrequencyHertz = 50
  const angularFrequency = 2 * Math.PI * lineFrequencyHertz
  const diodeDrop = 0.7
  const sourceWaveform = scenario.sourceVoltage * Math.sin(angularFrequency * clampedTime)
  const outputVoltage = Math.max(sourceWaveform - diodeDrop, 0)
  const current = outputVoltage / Math.max(scenario.resistance, 1e-6)
  const branchPower = outputVoltage * current
  const loadPeriodSeconds = 1 / lineFrequencyHertz

  return {
    timeSeconds: clampedTime,
    capacitorVoltage: sourceWaveform,
    outputVoltage,
    current,
    charge: sourceWaveform > diodeDrop ? 1 : 0,
    storedEnergy: branchPower,
    branchPower,
    resistorVoltageDrop: outputVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.max(sourceWaveform - outputVoltage, 0),
    timeConstant: loadPeriodSeconds,
    equivalentResistance: scenario.resistance,
  }
}

function buildFullWaveRectifierSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const lineFrequencyHertz = 50
  const angularFrequency = 2 * Math.PI * lineFrequencyHertz
  const diodeDrop = 1.4
  const sourceWaveform = scenario.sourceVoltage * Math.sin(angularFrequency * clampedTime)
  const rectifiedWaveform = Math.abs(sourceWaveform)
  const outputVoltage = Math.max(rectifiedWaveform - diodeDrop, 0)
  const current = outputVoltage / Math.max(scenario.resistance, 1e-6)
  const branchPower = outputVoltage * current
  const ripplePeriodSeconds = 1 / (2 * lineFrequencyHertz)

  return {
    timeSeconds: clampedTime,
    capacitorVoltage: sourceWaveform,
    outputVoltage,
    current,
    charge: rectifiedWaveform > diodeDrop ? 1 : 0,
    storedEnergy: branchPower,
    branchPower,
    resistorVoltageDrop: outputVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.max(rectifiedWaveform - outputVoltage, 0),
    timeConstant: ripplePeriodSeconds,
    equivalentResistance: scenario.resistance,
  }
}

function buildSmoothedRectifierSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const lineFrequencyHertz = 50
  const angularFrequency = 2 * Math.PI * lineFrequencyHertz
  const bridgeDrop = 1.4
  const resistance = Math.max(scenario.resistance, 1e-6)
  const capacitance = Math.max(scenario.capacitance, 1e-6)
  const warmupSeconds = 6 / lineFrequencyHertz
  const totalTime = warmupSeconds + clampedTime
  const stepCount = Math.max(1, Math.ceil(totalTime / 0.0001))
  const deltaTime = totalTime / stepCount
  let filteredVoltage = 0
  let sourceWaveform = 0
  let rectifiedWaveform = 0
  let peakEnvelope = 0

  for (let index = 0; index < stepCount; index += 1) {
    const timeSeconds = (index + 1) * deltaTime
    sourceWaveform = scenario.sourceVoltage * Math.sin(angularFrequency * timeSeconds)
    rectifiedWaveform = Math.max(Math.abs(sourceWaveform) - bridgeDrop, 0)
    peakEnvelope = Math.max(peakEnvelope, rectifiedWaveform)

    if (rectifiedWaveform >= filteredVoltage) {
      filteredVoltage = rectifiedWaveform
    } else {
      filteredVoltage *= Math.exp(-deltaTime / (resistance * capacitance))
    }
  }

  const current = filteredVoltage / resistance
  const charge = capacitance * filteredVoltage
  const storedEnergy = 0.5 * capacitance * filteredVoltage * filteredVoltage
  const branchPower = filteredVoltage * current

  return {
    timeSeconds: clampedTime,
    capacitorVoltage: sourceWaveform,
    outputVoltage: filteredVoltage,
    current,
    charge,
    storedEnergy,
    branchPower,
    resistorVoltageDrop: filteredVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.max(peakEnvelope - filteredVoltage, 0),
    timeConstant: resistance * capacitance,
    equivalentResistance: resistance,
  }
}

function buildRcLowPassSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedFrequencyHertz: number,
): ElectronicsAndCircuitsStateSnapshot {
  const frequencyHertz = Math.max(clampedFrequencyHertz, 0.1)
  const angularFrequency = 2 * Math.PI * frequencyHertz
  const capacitiveReactance = 1 / (angularFrequency * scenario.capacitance)
  const impedanceMagnitude = Math.sqrt(
    scenario.resistance * scenario.resistance + capacitiveReactance * capacitiveReactance,
  )
  const current = scenario.sourceVoltage / Math.max(impedanceMagnitude, 1e-6)
  const capacitorVoltage = current * capacitiveReactance
  const charge = scenario.capacitance * capacitorVoltage
  const storedEnergy = 0.5 * scenario.capacitance * capacitorVoltage * capacitorVoltage
  const resistorVoltageDrop = current * scenario.resistance
  const cutoffFrequencyHertz = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)

  return {
    timeSeconds: frequencyHertz,
    capacitorVoltage,
    outputVoltage: capacitorVoltage,
    current,
    charge,
    storedEnergy,
    branchPower: current * current * scenario.resistance,
    resistorVoltageDrop,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(scenario.sourceVoltage - capacitorVoltage),
    timeConstant: cutoffFrequencyHertz,
    equivalentResistance: scenario.resistance,
  }
}

function buildRcHighPassSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedFrequencyHertz: number,
): ElectronicsAndCircuitsStateSnapshot {
  const frequencyHertz = Math.max(clampedFrequencyHertz, 0.1)
  const angularFrequency = 2 * Math.PI * frequencyHertz
  const reactiveTerm = angularFrequency * scenario.resistance * scenario.capacitance
  const gainMagnitude = reactiveTerm / Math.sqrt(1 + reactiveTerm * reactiveTerm)
  const outputVoltage = scenario.sourceVoltage * gainMagnitude
  const current = outputVoltage / Math.max(scenario.resistance, 1e-6)
  const capacitorVoltage = scenario.sourceVoltage / Math.sqrt(1 + reactiveTerm * reactiveTerm)
  const charge = scenario.capacitance * capacitorVoltage
  const storedEnergy = 0.5 * scenario.capacitance * capacitorVoltage * capacitorVoltage
  const branchPower = current * current * scenario.resistance
  const cutoffFrequencyHertz = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)

  return {
    timeSeconds: frequencyHertz,
    capacitorVoltage,
    outputVoltage,
    current,
    charge,
    storedEnergy,
    branchPower,
    resistorVoltageDrop: outputVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(scenario.sourceVoltage - outputVoltage),
    timeConstant: cutoffFrequencyHertz,
    equivalentResistance: scenario.resistance,
  }
}

function buildRlLowPassSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedFrequencyHertz: number,
): ElectronicsAndCircuitsStateSnapshot {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const frequencyHertz = Math.max(clampedFrequencyHertz, 0.1)
  const angularFrequency = 2 * Math.PI * frequencyHertz
  const inductiveReactance = angularFrequency * inductance
  const gainMagnitude =
    scenario.resistance /
    Math.sqrt(scenario.resistance * scenario.resistance + inductiveReactance * inductiveReactance)
  const outputVoltage = scenario.sourceVoltage * gainMagnitude
  const current = outputVoltage / Math.max(scenario.resistance, 1e-6)
  const inductorVoltage = current * inductiveReactance
  const magneticFluxLinkage = inductance * current
  const storedEnergy = 0.5 * inductance * current * current
  const cutoffFrequencyHertz = scenario.resistance / (2 * Math.PI * inductance)

  return {
    timeSeconds: frequencyHertz,
    capacitorVoltage: inductorVoltage,
    outputVoltage,
    current,
    charge: magneticFluxLinkage,
    storedEnergy,
    branchPower: current * current * scenario.resistance,
    resistorVoltageDrop: outputVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(scenario.sourceVoltage - outputVoltage),
    timeConstant: cutoffFrequencyHertz,
    equivalentResistance: scenario.resistance,
  }
}

function buildRlHighPassSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedFrequencyHertz: number,
): ElectronicsAndCircuitsStateSnapshot {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const frequencyHertz = Math.max(clampedFrequencyHertz, 0.1)
  const angularFrequency = 2 * Math.PI * frequencyHertz
  const inductiveReactance = angularFrequency * inductance
  const impedanceMagnitude = Math.sqrt(
    scenario.resistance * scenario.resistance + inductiveReactance * inductiveReactance,
  )
  const current = scenario.sourceVoltage / Math.max(impedanceMagnitude, 1e-6)
  const outputVoltage = current * inductiveReactance
  const resistorVoltage = current * scenario.resistance
  const magneticFluxLinkage = inductance * current
  const storedEnergy = 0.5 * inductance * current * current
  const cutoffFrequencyHertz = scenario.resistance / (2 * Math.PI * inductance)

  return {
    timeSeconds: frequencyHertz,
    capacitorVoltage: resistorVoltage,
    outputVoltage,
    current,
    charge: magneticFluxLinkage,
    storedEnergy,
    branchPower: current * current * scenario.resistance,
    resistorVoltageDrop: resistorVoltage,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(scenario.sourceVoltage - outputVoltage),
    timeConstant: cutoffFrequencyHertz,
    equivalentResistance: scenario.resistance,
  }
}

function buildResistorNetworkSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
): ElectronicsAndCircuitsStateSnapshot {
  const secondaryResistance = Math.max(scenario.secondaryResistance ?? scenario.resistance, 1e-3)
  const equivalentResistance = scenario.resistance + secondaryResistance
  const current = scenario.sourceVoltage / equivalentResistance
  const outputVoltage = current * secondaryResistance
  const resistorVoltageDrop = current * scenario.resistance
  const branchPower = outputVoltage * current

  return {
    timeSeconds: 0,
    capacitorVoltage: outputVoltage,
    outputVoltage,
    current,
    charge: 0,
    storedEnergy: 0,
    branchPower,
    resistorVoltageDrop,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: 0,
    timeConstant: 0,
    equivalentResistance,
  }
}

function buildRlcSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedTime: number,
): ElectronicsAndCircuitsStateSnapshot {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const state = integrateSeriesRlc(scenario, clampedTime, inductance)
  const capacitorVoltage = state.charge / scenario.capacitance
  const storedEnergy =
    0.5 * scenario.capacitance * capacitorVoltage * capacitorVoltage +
    0.5 * inductance * state.current * state.current

  return {
    timeSeconds: clampedTime,
    capacitorVoltage,
    outputVoltage: capacitorVoltage,
    current: state.current,
    charge: state.charge,
    storedEnergy,
    branchPower: scenario.sourceVoltage * state.current,
    resistorVoltageDrop: scenario.resistance * state.current,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(scenario.sourceVoltage - capacitorVoltage),
    timeConstant: inductance / Math.max(scenario.resistance, 1e-6),
    equivalentResistance: scenario.resistance,
  }
}

function buildRlcResonanceSnapshot(
  scenario: ElectronicsAndCircuitsScenario,
  clampedFrequencyHertz: number,
): ElectronicsAndCircuitsStateSnapshot {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const frequencyHertz = Math.max(clampedFrequencyHertz, 0.1)
  const angularFrequency = 2 * Math.PI * frequencyHertz
  const inductiveReactance = angularFrequency * inductance
  const capacitiveReactance = 1 / (angularFrequency * scenario.capacitance)
  const netReactance = inductiveReactance - capacitiveReactance
  const impedanceMagnitude = Math.sqrt(
    scenario.resistance * scenario.resistance + netReactance * netReactance,
  )
  const current = scenario.sourceVoltage / Math.max(impedanceMagnitude, 1e-6)
  const capacitorVoltage = current * capacitiveReactance
  const resistorVoltageDrop = current * scenario.resistance
  const charge = scenario.capacitance * capacitorVoltage
  const storedEnergy =
    0.5 * scenario.capacitance * capacitorVoltage * capacitorVoltage +
    0.5 * inductance * current * current
  const resonantFrequencyHertz = 1 / (2 * Math.PI * Math.sqrt(inductance * scenario.capacitance))
  const bandwidthHertz = scenario.resistance / (2 * Math.PI * inductance)

  return {
    timeSeconds: frequencyHertz,
    capacitorVoltage,
    outputVoltage: capacitorVoltage,
    current,
    charge,
    storedEnergy,
    branchPower: current * current * scenario.resistance,
    resistorVoltageDrop,
    sourceVoltage: scenario.sourceVoltage,
    steadyStateError: Math.abs(frequencyHertz - resonantFrequencyHertz),
    timeConstant: bandwidthHertz,
    equivalentResistance: scenario.resistance,
  }
}

function buildInitialCursor(scenario: ElectronicsAndCircuitsScenario): number {
  return scenario.id === "rlc-resonance" ||
    scenario.id === "rc-low-pass" ||
    scenario.id === "rc-high-pass" ||
    scenario.id === "rl-low-pass" ||
    scenario.id === "rl-high-pass"
    ? 0.5
    : 0
}

export function sampleScenario(
  scenario: ElectronicsAndCircuitsScenario,
  timeSeconds = 0,
): ElectronicsAndCircuitsStateSnapshot {
  const safeScenario = sanitizeScenario(scenario)
  const clampedTime = clamp(timeSeconds, 0, safeScenario.durationSeconds)

  if (safeScenario.id === "resistor-network") {
    return buildResistorNetworkSnapshot(safeScenario)
  }

  if (safeScenario.id === "rl-transient") {
    return buildRlTransientSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "half-wave-rectifier") {
    return buildHalfWaveRectifierSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "full-wave-rectifier") {
    return buildFullWaveRectifierSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "smoothed-rectifier") {
    return buildSmoothedRectifierSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rc-low-pass") {
    return buildRcLowPassSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rc-high-pass") {
    return buildRcHighPassSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rl-low-pass") {
    return buildRlLowPassSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rl-high-pass") {
    return buildRlHighPassSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rlc-response") {
    return buildRlcSnapshot(safeScenario, clampedTime)
  }

  if (safeScenario.id === "rlc-resonance") {
    return buildRlcResonanceSnapshot(safeScenario, clampedTime)
  }

  return buildRcSnapshot(safeScenario, clampedTime)
}

function integrateSeriesRlc(
  scenario: ElectronicsAndCircuitsScenario,
  timeSeconds: number,
  inductance: number,
): { charge: number; current: number } {
  const stepCount = Math.max(1, Math.ceil(timeSeconds / 0.01))
  const deltaTime = timeSeconds / stepCount
  let charge = scenario.initialCharge
  let current = 0

  for (let index = 0; index < stepCount; index += 1) {
    const k1 = buildRlcDerivative(charge, current, scenario, inductance)
    const k2 = buildRlcDerivative(
      charge + k1.chargeRate * deltaTime * 0.5,
      current + k1.currentRate * deltaTime * 0.5,
      scenario,
      inductance,
    )
    const k3 = buildRlcDerivative(
      charge + k2.chargeRate * deltaTime * 0.5,
      current + k2.currentRate * deltaTime * 0.5,
      scenario,
      inductance,
    )
    const k4 = buildRlcDerivative(
      charge + k3.chargeRate * deltaTime,
      current + k3.currentRate * deltaTime,
      scenario,
      inductance,
    )

    charge +=
      (deltaTime / 6) * (k1.chargeRate + 2 * k2.chargeRate + 2 * k3.chargeRate + k4.chargeRate)
    current +=
      (deltaTime / 6) * (k1.currentRate + 2 * k2.currentRate + 2 * k3.currentRate + k4.currentRate)
  }

  return { charge, current }
}

function buildRlcDerivative(
  charge: number,
  current: number,
  scenario: ElectronicsAndCircuitsScenario,
  inductance: number,
): { chargeRate: number; currentRate: number } {
  const capacitorVoltage = charge / scenario.capacitance
  return {
    chargeRate: current,
    currentRate:
      (scenario.sourceVoltage - scenario.resistance * current - capacitorVoltage) / inductance,
  }
}

export function buildSamples(
  scenario: ElectronicsAndCircuitsScenario,
  sampleCount = 48,
): ElectronicsAndCircuitsSample[] {
  const safeScenario = sanitizeScenario(scenario)
  const count = Math.max(sampleCount, 2)
  return Array.from({ length: count }, (_, index) => {
    const timeSeconds = (index / Math.max(count - 1, 1)) * safeScenario.durationSeconds
    const snapshot = sampleScenario(safeScenario, timeSeconds)
    return {
      timeSeconds,
      capacitorVoltage: snapshot.capacitorVoltage,
      outputVoltage: snapshot.outputVoltage,
      current: snapshot.current,
      charge: snapshot.charge,
      storedEnergy: snapshot.storedEnergy,
      branchPower: snapshot.branchPower,
    }
  })
}

@Injectable({ providedIn: "root" })
export class ElectronicsAndCircuitsStateService {
  private readonly selectedScenarioState = signal<ElectronicsAndCircuitsScenario>(SCENARIOS[0])
  private readonly currentTimeState = signal(0)

  readonly selectedScenario = computed(() => this.selectedScenarioState())
  readonly currentTimeSeconds = computed(() => this.currentTimeState())
  readonly currentState = computed(() =>
    sampleScenario(this.selectedScenarioState(), this.currentTimeState()),
  )
  readonly sampledStates = computed(() => buildSamples(this.selectedScenarioState()))

  listScenarios(): readonly ElectronicsAndCircuitsScenario[] {
    return SCENARIOS
  }

  selectScenario(id: ElectronicsAndCircuitsScenarioId): void {
    const match = SCENARIOS.find((scenario) => scenario.id === id)
    if (!match) {
      return
    }

    this.selectedScenarioState.set(match)
    this.currentTimeState.set(buildInitialCursor(match))
  }

  updateTimeSeconds(value: number): void {
    this.currentTimeState.set(clamp(value, 0, this.selectedScenarioState().durationSeconds))
  }

  updateScenarioField(field: EditableElectronicsAndCircuitsField, value: number): void {
    this.selectedScenarioState.update((current) => {
      const next = sanitizeScenario({ ...current, [field]: value })
      this.currentTimeState.update((timeSeconds) => clamp(timeSeconds, 0, next.durationSeconds))
      return next
    })
  }

  importScenario(scenario: ElectronicsAndCircuitsScenario, timeSeconds: number): void {
    const nextScenario = sanitizeScenario(scenario)
    this.selectedScenarioState.set(nextScenario)
    this.currentTimeState.set(clamp(timeSeconds, 0, nextScenario.durationSeconds))
  }
}

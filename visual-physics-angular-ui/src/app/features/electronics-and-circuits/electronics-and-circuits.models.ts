export type ElectronicsAndCircuitsScenarioId =
  | "rc-transient"
  | "rl-transient"
  | "half-wave-rectifier"
  | "full-wave-rectifier"
  | "smoothed-rectifier"
  | "rc-low-pass"
  | "rc-high-pass"
  | "rl-low-pass"
  | "rl-high-pass"
  | "resistor-network"
  | "rlc-response"
  | "rlc-resonance"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface ElectronicsAndCircuitsScenario {
  id: ElectronicsAndCircuitsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  sourceVoltage: number
  resistance: number
  capacitance: number
  initialCharge: number
  secondaryResistance?: number
  inductance?: number
}

export interface ElectronicsAndCircuitsStateSnapshot {
  timeSeconds: number
  capacitorVoltage: number
  outputVoltage: number
  current: number
  charge: number
  storedEnergy: number
  branchPower: number
  resistorVoltageDrop: number
  sourceVoltage: number
  steadyStateError: number
  timeConstant: number
  equivalentResistance: number
}

export interface ElectronicsAndCircuitsSample {
  timeSeconds: number
  capacitorVoltage: number
  outputVoltage: number
  current: number
  charge: number
  storedEnergy: number
  branchPower: number
}

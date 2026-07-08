import {
  ElectronicsAndCircuitsSample,
  ElectronicsAndCircuitsScenario,
  ElectronicsAndCircuitsStateSnapshot,
} from "./electronics-and-circuits.models"

export interface InsightCard {
  label: string
  value: string
  detail: string
}

export interface RlcDiagnostics {
  dampingRegime: "Overdamped" | "Critically damped" | "Underdamped"
  dampingRatio: number
  peakOvershootVoltage: number
  peakOvershootPercent: number
  settlingTimeSeconds: number | null
  currentReversalCount: number
}

export interface ResonanceDiagnostics {
  resonantFrequencyHertz: number
  qualityFactor: number
  peakCapacitorVoltage: number
  peakCurrentFrequencyHertz: number
  peakPowerWatts: number
}

export interface RcLowPassDiagnostics {
  cutoffFrequencyHertz: number
  gainMagnitude: number
  phaseLagDegrees: number
  outputVoltageRatio: number
}

export interface RcHighPassDiagnostics {
  cutoffFrequencyHertz: number
  gainMagnitude: number
  phaseLeadDegrees: number
  passbandRecoveryPercent: number
}

export interface RlLowPassDiagnostics {
  cutoffFrequencyHertz: number
  gainMagnitude: number
  phaseLagDegrees: number
  outputVoltageRatio: number
}

export interface RlHighPassDiagnostics {
  cutoffFrequencyHertz: number
  gainMagnitude: number
  phaseLeadDegrees: number
  passbandRecoveryPercent: number
}

export interface RlTransientDiagnostics {
  timeConstantSeconds: number
  currentRisePercent: number
  remainingInductorVoltagePercent: number
  fluxLinkage: number
}

export interface HalfWaveRectifierDiagnostics {
  peakOutputVoltage: number
  averageOutputVoltage: number
  rmsOutputVoltage: number
  conductionDutyPercent: number
}

export interface FullWaveRectifierDiagnostics {
  peakOutputVoltage: number
  averageOutputVoltage: number
  rmsOutputVoltage: number
  conductionDutyPercent: number
  rippleFrequencyHertz: number
}

export interface SmoothedRectifierDiagnostics {
  peakOutputVoltage: number
  averageOutputVoltage: number
  minimumOutputVoltage: number
  rippleVoltage: number
  ripplePercent: number
}

export interface PlotGuide {
  label: string
  path: string
}

export interface PlotGuideSet {
  primary: PlotGuide[]
  secondary: PlotGuide[]
  tertiary: PlotGuide[]
}

type PlotMetric =
  | "capacitorVoltage"
  | "outputVoltage"
  | "current"
  | "charge"
  | "branchPower"
  | "storedEnergy"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120

export function buildGraphPath(
  samples: readonly ElectronicsAndCircuitsSample[],
  metric: PlotMetric,
): string {
  if (samples.length === 0) {
    return ""
  }

  const { min, span } = buildMetricScale(samples, metric)

  return samples
    .map((sample, index) => {
      const x = (index / Math.max(samples.length - 1, 1)) * PLOT_WIDTH
      const y = PLOT_HEIGHT - ((sample[metric] - min) / span) * PLOT_HEIGHT
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

export function buildPlotGuides(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[],
): PlotGuideSet {
  if (scenario.id === "smoothed-rectifier") {
    const diagnostics = buildSmoothedRectifierDiagnostics(samples)
    return {
      primary: [
        buildHorizontalGuide(
          samples,
          "outputVoltage",
          diagnostics.averageOutputVoltage,
          "Average output",
          [diagnostics.averageOutputVoltage],
        ),
        buildHorizontalGuide(
          samples,
          "outputVoltage",
          diagnostics.minimumOutputVoltage,
          "Ripple floor",
          [diagnostics.minimumOutputVoltage],
        ),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Capacitor energy"),
      ],
    }
  }

  if (scenario.id === "full-wave-rectifier") {
    const diagnostics = buildFullWaveRectifierDiagnostics(samples)
    return {
      primary: [
        buildHorizontalGuide(
          samples,
          "outputVoltage",
          diagnostics.averageOutputVoltage,
          "Average output",
          [diagnostics.averageOutputVoltage],
        ),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(
          samples,
          "branchPower",
          (diagnostics.rmsOutputVoltage * diagnostics.rmsOutputVoltage) /
            Math.max(scenario.resistance, 1e-6),
          "RMS power proxy",
        ),
      ],
    }
  }

  if (scenario.id === "half-wave-rectifier") {
    const diagnostics = buildHalfWaveRectifierDiagnostics(samples)
    return {
      primary: [
        buildHorizontalGuide(
          samples,
          "outputVoltage",
          diagnostics.peakOutputVoltage,
          "Peak output",
          [diagnostics.peakOutputVoltage],
        ),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(
          samples,
          "branchPower",
          (diagnostics.rmsOutputVoltage * diagnostics.rmsOutputVoltage) /
            Math.max(scenario.resistance, 1e-6),
          "RMS power proxy",
        ),
      ],
    }
  }

  if (scenario.id === "rl-transient") {
    const diagnostics = buildRlTransientDiagnostics(scenario, snapshot)
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.timeConstantSeconds, "Time constant"),
        buildHorizontalGuide(
          samples,
          "outputVoltage",
          scenario.sourceVoltage,
          "Initial inductor voltage",
          [scenario.sourceVoltage],
        ),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Magnetic energy"),
      ],
    }
  }

  if (scenario.id === "rl-high-pass") {
    const diagnostics = buildRlHighPassDiagnostics(scenario, snapshot)
    const cutoffVoltage = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.cutoffFrequencyHertz, "Cutoff frequency"),
        buildHorizontalGuide(samples, "outputVoltage", cutoffVoltage, "-3 dB output", [
          cutoffVoltage,
        ]),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Magnetic energy"),
      ],
    }
  }

  if (scenario.id === "rl-low-pass") {
    const diagnostics = buildRlLowPassDiagnostics(scenario, snapshot)
    const cutoffVoltage = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.cutoffFrequencyHertz, "Cutoff frequency"),
        buildHorizontalGuide(samples, "outputVoltage", cutoffVoltage, "-3 dB output", [
          cutoffVoltage,
        ]),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Magnetic energy"),
      ],
    }
  }

  if (scenario.id === "rc-high-pass") {
    const diagnostics = buildRcHighPassDiagnostics(scenario, snapshot)
    const cutoffVoltage = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.cutoffFrequencyHertz, "Cutoff frequency"),
        buildHorizontalGuide(samples, "outputVoltage", cutoffVoltage, "-3 dB output", [
          cutoffVoltage,
        ]),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "branchPower", snapshot.branchPower, "Active power"),
      ],
    }
  }

  if (scenario.id === "rc-low-pass") {
    const diagnostics = buildRcLowPassDiagnostics(scenario, snapshot)
    const cutoffVoltage = Math.abs(scenario.sourceVoltage) / Math.SQRT2
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.cutoffFrequencyHertz, "Cutoff frequency"),
        buildHorizontalGuide(samples, "capacitorVoltage", cutoffVoltage, "-3 dB output", [
          cutoffVoltage,
        ]),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Active energy"),
      ],
    }
  }

  if (scenario.id === "resistor-network") {
    return {
      primary: [
        buildHorizontalGuide(samples, "outputVoltage", snapshot.outputVoltage, "Output target"),
      ],
      secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Branch current")],
      tertiary: [buildHorizontalGuide(samples, "branchPower", snapshot.branchPower, "Load power")],
    }
  }

  if (scenario.id === "rlc-resonance") {
    const diagnostics = buildResonanceDiagnostics(scenario, samples)
    return {
      primary: [
        buildVerticalGuide(samples, diagnostics.resonantFrequencyHertz, "Resonant frequency"),
        buildHorizontalGuide(
          samples,
          "capacitorVoltage",
          diagnostics.peakCapacitorVoltage,
          "Peak capacitor voltage",
          [diagnostics.peakCapacitorVoltage],
        ),
      ],
      secondary: [
        buildVerticalGuide(
          samples,
          diagnostics.peakCurrentFrequencyHertz,
          "Peak current frequency",
        ),
        buildHorizontalGuide(samples, "current", snapshot.current, "Active current"),
      ],
      tertiary: [
        buildHorizontalGuide(samples, "branchPower", diagnostics.peakPowerWatts, "Peak power", [
          diagnostics.peakPowerWatts,
        ]),
        buildVerticalGuide(samples, diagnostics.peakCurrentFrequencyHertz, "Peak power point"),
      ],
    }
  }

  if (scenario.id === "rlc-response") {
    const diagnostics = buildRlcDiagnostics(scenario, samples)
    const primaryGuides = [
      buildHorizontalGuide(samples, "capacitorVoltage", scenario.sourceVoltage, "Source setpoint", [
        scenario.sourceVoltage,
      ]),
    ]
    if (diagnostics.peakOvershootVoltage > 0) {
      primaryGuides.push(
        buildHorizontalGuide(
          samples,
          "capacitorVoltage",
          scenario.sourceVoltage + diagnostics.peakOvershootVoltage,
          "Peak overshoot",
          [scenario.sourceVoltage + diagnostics.peakOvershootVoltage],
        ),
      )
    }
    if (diagnostics.settlingTimeSeconds !== null) {
      primaryGuides.push(
        buildVerticalGuide(samples, diagnostics.settlingTimeSeconds, "Settling time"),
      )
    }

    return {
      primary: primaryGuides,
      secondary: [buildHorizontalGuide(samples, "current", 0, "Current zero", [0])],
      tertiary: [
        buildHorizontalGuide(samples, "storedEnergy", snapshot.storedEnergy, "Active energy"),
      ],
    }
  }

  return {
    primary: [
      buildHorizontalGuide(samples, "capacitorVoltage", scenario.sourceVoltage, "Source setpoint", [
        scenario.sourceVoltage,
      ]),
    ],
    secondary: [buildHorizontalGuide(samples, "current", snapshot.current, "Active current")],
    tertiary: [buildHorizontalGuide(samples, "charge", snapshot.charge, "Stored charge")],
  }
}

export function buildInsightCards(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
  samples: readonly ElectronicsAndCircuitsSample[] = [],
): InsightCard[] {
  if (scenario.id === "smoothed-rectifier") {
    const diagnostics = buildSmoothedRectifierDiagnostics(samples)
    return [
      {
        label: "Average DC output",
        value: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        detail: "Average load voltage after full-wave rectification and capacitor smoothing.",
      },
      {
        label: "Ripple voltage",
        value: `${diagnostics.rippleVoltage.toFixed(2)} V`,
        detail:
          "Peak-to-peak ripple across the smoothed output over the sampled steady-state window.",
      },
      {
        label: "Ripple factor",
        value: `${diagnostics.ripplePercent.toFixed(1)}%`,
        detail: "Ripple voltage as a percentage of the average smoothed DC output.",
      },
      {
        label: "Capacitor minimum voltage",
        value: `${diagnostics.minimumOutputVoltage.toFixed(2)} V`,
        detail:
          "Lowest output voltage reached before the bridge recharges the reservoir capacitor.",
      },
    ]
  }

  if (scenario.id === "full-wave-rectifier") {
    const diagnostics = buildFullWaveRectifierDiagnostics(samples)
    return [
      {
        label: "Peak output voltage",
        value: `${diagnostics.peakOutputVoltage.toFixed(2)} V`,
        detail: "Maximum bridge-rectified load voltage after accounting for the two diode drops.",
      },
      {
        label: "Average output",
        value: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        detail: "Average load voltage over the sampled full-wave rectified waveform.",
      },
      {
        label: "RMS output",
        value: `${diagnostics.rmsOutputVoltage.toFixed(2)} V`,
        detail: "Effective full-wave load voltage that determines equivalent resistor heating.",
      },
      {
        label: "Ripple frequency",
        value: `${diagnostics.rippleFrequencyHertz.toFixed(0)} Hz`,
        detail: "Output ripple frequency doubles the input line frequency in a full-wave bridge.",
      },
    ]
  }

  if (scenario.id === "half-wave-rectifier") {
    const diagnostics = buildHalfWaveRectifierDiagnostics(samples)
    return [
      {
        label: "Peak output voltage",
        value: `${diagnostics.peakOutputVoltage.toFixed(2)} V`,
        detail: "Maximum rectified load voltage after accounting for the diode threshold.",
      },
      {
        label: "Average output",
        value: `${diagnostics.averageOutputVoltage.toFixed(2)} V`,
        detail: "Average load voltage over the sampled AC waveform.",
      },
      {
        label: "RMS output",
        value: `${diagnostics.rmsOutputVoltage.toFixed(2)} V`,
        detail: "Effective load voltage that determines equivalent resistor heating.",
      },
      {
        label: "Conduction duty",
        value: `${diagnostics.conductionDutyPercent.toFixed(1)}%`,
        detail: "Percentage of sampled time during which the diode conducts current into the load.",
      },
    ]
  }

  if (scenario.id === "rl-transient") {
    const diagnostics = buildRlTransientDiagnostics(scenario, snapshot)
    return [
      {
        label: "Time constant",
        value: `${diagnostics.timeConstantSeconds.toFixed(3)} s`,
        detail: "Characteristic RL timescale predicted by $\tau = L / R$.",
      },
      {
        label: "Current rise",
        value: `${diagnostics.currentRisePercent.toFixed(1)}%`,
        detail: "Fraction of the final branch current reached at the active time cursor.",
      },
      {
        label: "Remaining inductor voltage",
        value: `${diagnostics.remainingInductorVoltagePercent.toFixed(1)}%`,
        detail: "Fraction of the initial inductor voltage still present after the step input.",
      },
      {
        label: "Flux linkage",
        value: `${diagnostics.fluxLinkage.toFixed(4)} Wb-turn`,
        detail: `Inductor flux linkage for ${scenario.name.toLowerCase()} at the active time cursor.`,
      },
    ]
  }

  if (scenario.id === "rl-high-pass") {
    const diagnostics = buildRlHighPassDiagnostics(scenario, snapshot)
    return [
      {
        label: "Cutoff frequency",
        value: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        detail: "First-order RL corner frequency predicted by $f_c = \frac{R}{2\pi L}$.",
      },
      {
        label: "Active gain",
        value: `${diagnostics.gainMagnitude.toFixed(3)} (${diagnostics.passbandRecoveryPercent.toFixed(1)}%)`,
        detail:
          "Magnitude ratio between the inductor output and the source at the active sweep frequency.",
      },
      {
        label: "Phase lead",
        value: `${diagnostics.phaseLeadDegrees.toFixed(1)}°`,
        detail:
          "Output phase lead from the first-order response $\phi = \tan^{-1}(R / (\omega L))$.",
      },
      {
        label: "Magnetic energy",
        value: `${snapshot.storedEnergy.toFixed(4)} J`,
        detail: `Energy stored in the inductor for ${scenario.name.toLowerCase()} at the active sweep point.`,
      },
    ]
  }

  if (scenario.id === "rl-low-pass") {
    const diagnostics = buildRlLowPassDiagnostics(scenario, snapshot)
    return [
      {
        label: "Cutoff frequency",
        value: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        detail: "First-order RL corner frequency predicted by $f_c = \frac{R}{2\pi L}$.",
      },
      {
        label: "Active gain",
        value: `${diagnostics.gainMagnitude.toFixed(3)} (${(diagnostics.outputVoltageRatio * 100).toFixed(1)}%)`,
        detail:
          "Magnitude ratio between the resistor output and the source at the active sweep frequency.",
      },
      {
        label: "Phase lag",
        value: `${diagnostics.phaseLagDegrees.toFixed(1)}°`,
        detail: "Output phase lag from the first-order response $\phi = -\tan^{-1}(\omega L / R)$.",
      },
      {
        label: "Magnetic energy",
        value: `${snapshot.storedEnergy.toFixed(4)} J`,
        detail: `Energy stored in the inductor for ${scenario.name.toLowerCase()} at the active sweep point.`,
      },
    ]
  }

  if (scenario.id === "rc-high-pass") {
    const diagnostics = buildRcHighPassDiagnostics(scenario, snapshot)
    return [
      {
        label: "Cutoff frequency",
        value: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        detail: "First-order RC corner frequency predicted by $f_c = \frac{1}{2\pi RC}$.",
      },
      {
        label: "Active gain",
        value: `${diagnostics.gainMagnitude.toFixed(3)} (${diagnostics.passbandRecoveryPercent.toFixed(1)}%)`,
        detail:
          "Magnitude ratio between the resistor output and the source at the active sweep frequency.",
      },
      {
        label: "Phase lead",
        value: `${diagnostics.phaseLeadDegrees.toFixed(1)}°`,
        detail:
          "Output phase lead from the first-order response $\phi = \tan^{-1}(1 / (\omega RC))$.",
      },
      {
        label: "Dissipated power",
        value: `${snapshot.branchPower.toFixed(4)} W`,
        detail: `Power dissipated in the resistor for ${scenario.name.toLowerCase()} at the active sweep point.`,
      },
    ]
  }

  if (scenario.id === "rc-low-pass") {
    const diagnostics = buildRcLowPassDiagnostics(scenario, snapshot)
    return [
      {
        label: "Cutoff frequency",
        value: `${diagnostics.cutoffFrequencyHertz.toFixed(2)} Hz`,
        detail: "First-order RC corner frequency predicted by $f_c = \frac{1}{2\pi RC}$.",
      },
      {
        label: "Active gain",
        value: `${diagnostics.gainMagnitude.toFixed(3)} (${(diagnostics.outputVoltageRatio * 100).toFixed(1)}%)`,
        detail:
          "Magnitude ratio between the capacitor output and the source at the active sweep frequency.",
      },
      {
        label: "Phase lag",
        value: `${diagnostics.phaseLagDegrees.toFixed(1)}°`,
        detail: "Output phase lag from the first-order response $\phi = -\tan^{-1}(\omega RC)$.",
      },
      {
        label: "Stored energy",
        value: `${snapshot.storedEnergy.toFixed(4)} J`,
        detail: `Energy stored in the capacitor for ${scenario.name.toLowerCase()} at the active sweep point.`,
      },
    ]
  }

  if (scenario.id === "resistor-network") {
    return [
      {
        label: "Equivalent resistance",
        value: `${snapshot.equivalentResistance.toFixed(1)} Ω`,
        detail: "Total series resistance seen by the source in the divider branch.",
      },
      {
        label: "Divider output",
        value: `${snapshot.outputVoltage.toFixed(2)} V`,
        detail: "Voltage taken across the lower resistor in the two-resistor divider.",
      },
      {
        label: "Branch current",
        value: `${snapshot.current.toFixed(4)} A`,
        detail:
          "Current flowing through both series resistors for the active divider configuration.",
      },
      {
        label: "Load power",
        value: `${snapshot.branchPower.toFixed(4)} W`,
        detail: `Power dissipated across the lower resistor for ${scenario.name.toLowerCase()}.`,
      },
    ]
  }

  if (scenario.id === "rlc-response") {
    const diagnostics = buildRlcDiagnostics(scenario, samples)
    return [
      {
        label: "Damping regime",
        value: `${diagnostics.dampingRegime} ($\zeta=${diagnostics.dampingRatio.toFixed(2)}$)`,
        detail:
          "Classification of the series RLC response from the damping ratio $\zeta = \frac{R}{2}\sqrt{\frac{C}{L}}$.",
      },
      {
        label: "Peak overshoot",
        value: `${diagnostics.peakOvershootVoltage.toFixed(2)} V (${diagnostics.peakOvershootPercent.toFixed(1)}%)`,
        detail:
          "Maximum capacitor-voltage excursion above the source setpoint across the sampled RLC step response.",
      },
      {
        label: "Settling time",
        value:
          diagnostics.settlingTimeSeconds === null
            ? "Not settled"
            : `${diagnostics.settlingTimeSeconds.toFixed(2)} s`,
        detail:
          "First sampled time after which the capacitor voltage stays within a 5% band around the source voltage.",
      },
      {
        label: "Current reversals",
        value: `${diagnostics.currentReversalCount}`,
        detail:
          "Number of sign changes in the sampled series current, indicating energy exchange between the inductor and capacitor.",
      },
      {
        label: "Instantaneous energy",
        value: `${snapshot.storedEnergy.toFixed(4)} J`,
        detail: `Combined capacitor and inductor energy for ${scenario.name.toLowerCase()} at the active time cursor.`,
      },
    ]
  }

  if (scenario.id === "rlc-resonance") {
    const diagnostics = buildResonanceDiagnostics(scenario, samples)
    return [
      {
        label: "Resonant frequency",
        value: `${diagnostics.resonantFrequencyHertz.toFixed(2)} Hz`,
        detail: "Natural series-RLC resonance predicted by $f_0 = \frac{1}{2\pi\sqrt{LC}}$.",
      },
      {
        label: "Quality factor",
        value: diagnostics.qualityFactor.toFixed(2),
        detail: "Sharper resonance corresponds to larger $Q = \frac{1}{R}\sqrt{\frac{L}{C}}$.",
      },
      {
        label: "Peak capacitor voltage",
        value: `${diagnostics.peakCapacitorVoltage.toFixed(2)} V`,
        detail: "Largest sampled capacitor-voltage gain across the frequency sweep.",
      },
      {
        label: "Peak current frequency",
        value: `${diagnostics.peakCurrentFrequencyHertz.toFixed(2)} Hz`,
        detail: "Sampled frequency where the series current reaches its maximum magnitude.",
      },
      {
        label: "Peak dissipated power",
        value: `${diagnostics.peakPowerWatts.toFixed(2)} W`,
        detail: "Largest resistor power seen during the resonance sweep.",
      },
    ]
  }

  return [
    {
      label: "Time constant",
      value: `${snapshot.timeConstant.toFixed(3)} s`,
      detail: "The characteristic RC charging time that sets how fast the transient settles.",
    },
    {
      label: "Capacitor voltage",
      value: `${snapshot.capacitorVoltage.toFixed(2)} V`,
      detail: "Instantaneous capacitor voltage for the active point on the charging curve.",
    },
    {
      label: "Charging current",
      value: `${snapshot.current.toFixed(4)} A`,
      detail:
        "Current through the resistor-capacitor branch as the circuit approaches steady state.",
    },
    {
      label: "Stored energy",
      value: `${snapshot.storedEnergy.toFixed(4)} J`,
      detail: `Energy stored in the capacitor for ${scenario.name.toLowerCase()}.`,
    },
  ]
}

export function buildRlLowPassDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
): RlLowPassDiagnostics {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const cutoffFrequencyHertz = scenario.resistance / (2 * Math.PI * inductance)
  const gainMagnitude =
    Math.abs(scenario.sourceVoltage) <= 1e-6
      ? 0
      : Math.abs(snapshot.outputVoltage) / Math.abs(scenario.sourceVoltage)
  const phaseLagDegrees =
    -(
      Math.atan(
        (2 * Math.PI * snapshot.timeSeconds * inductance) / Math.max(scenario.resistance, 1e-6),
      ) * 180
    ) / Math.PI

  return {
    cutoffFrequencyHertz,
    gainMagnitude,
    phaseLagDegrees,
    outputVoltageRatio: gainMagnitude,
  }
}

export function buildRlHighPassDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
): RlHighPassDiagnostics {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const cutoffFrequencyHertz = scenario.resistance / (2 * Math.PI * inductance)
  const gainMagnitude =
    Math.abs(scenario.sourceVoltage) <= 1e-6
      ? 0
      : Math.abs(snapshot.outputVoltage) / Math.abs(scenario.sourceVoltage)
  const phaseLeadDegrees =
    (Math.atan(
      Math.max(scenario.resistance, 1e-6) /
        Math.max(2 * Math.PI * snapshot.timeSeconds * inductance, 1e-6),
    ) *
      180) /
    Math.PI

  return {
    cutoffFrequencyHertz,
    gainMagnitude,
    phaseLeadDegrees,
    passbandRecoveryPercent: gainMagnitude * 100,
  }
}

export function buildRlTransientDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
): RlTransientDiagnostics {
  const inductance = Math.max(scenario.inductance ?? 0.1, 1e-6)
  const timeConstantSeconds = inductance / Math.max(scenario.resistance, 1e-6)
  const steadyStateCurrent = scenario.sourceVoltage / Math.max(scenario.resistance, 1e-6)
  const currentRisePercent =
    Math.abs(steadyStateCurrent) <= 1e-6 ? 0 : (snapshot.current / steadyStateCurrent) * 100
  const remainingInductorVoltagePercent =
    Math.abs(scenario.sourceVoltage) <= 1e-6
      ? 0
      : (Math.abs(snapshot.outputVoltage) / Math.abs(scenario.sourceVoltage)) * 100

  return {
    timeConstantSeconds,
    currentRisePercent,
    remainingInductorVoltagePercent,
    fluxLinkage: snapshot.charge,
  }
}

export function buildHalfWaveRectifierDiagnostics(
  samples: readonly ElectronicsAndCircuitsSample[],
): HalfWaveRectifierDiagnostics {
  if (samples.length === 0) {
    return {
      peakOutputVoltage: 0,
      averageOutputVoltage: 0,
      rmsOutputVoltage: 0,
      conductionDutyPercent: 0,
    }
  }

  const peakOutputVoltage = Math.max(...samples.map((sample) => sample.outputVoltage))
  const averageOutputVoltage =
    samples.reduce((total, sample) => total + sample.outputVoltage, 0) / samples.length
  const rmsOutputVoltage = Math.sqrt(
    samples.reduce((total, sample) => total + sample.outputVoltage * sample.outputVoltage, 0) /
      samples.length,
  )
  const conductionDutyPercent =
    (samples.filter((sample) => sample.outputVoltage > 1e-6).length / samples.length) * 100

  return {
    peakOutputVoltage,
    averageOutputVoltage,
    rmsOutputVoltage,
    conductionDutyPercent,
  }
}

export function buildFullWaveRectifierDiagnostics(
  samples: readonly ElectronicsAndCircuitsSample[],
): FullWaveRectifierDiagnostics {
  if (samples.length === 0) {
    return {
      peakOutputVoltage: 0,
      averageOutputVoltage: 0,
      rmsOutputVoltage: 0,
      conductionDutyPercent: 0,
      rippleFrequencyHertz: 100,
    }
  }

  const peakOutputVoltage = Math.max(...samples.map((sample) => sample.outputVoltage))
  const averageOutputVoltage =
    samples.reduce((total, sample) => total + sample.outputVoltage, 0) / samples.length
  const rmsOutputVoltage = Math.sqrt(
    samples.reduce((total, sample) => total + sample.outputVoltage * sample.outputVoltage, 0) /
      samples.length,
  )
  const conductionDutyPercent =
    (samples.filter((sample) => sample.outputVoltage > 1e-6).length / samples.length) * 100

  return {
    peakOutputVoltage,
    averageOutputVoltage,
    rmsOutputVoltage,
    conductionDutyPercent,
    rippleFrequencyHertz: 100,
  }
}

export function buildSmoothedRectifierDiagnostics(
  samples: readonly ElectronicsAndCircuitsSample[],
): SmoothedRectifierDiagnostics {
  if (samples.length === 0) {
    return {
      peakOutputVoltage: 0,
      averageOutputVoltage: 0,
      minimumOutputVoltage: 0,
      rippleVoltage: 0,
      ripplePercent: 0,
    }
  }

  const peakOutputVoltage = Math.max(...samples.map((sample) => sample.outputVoltage))
  const minimumOutputVoltage = Math.min(...samples.map((sample) => sample.outputVoltage))
  const averageOutputVoltage =
    samples.reduce((total, sample) => total + sample.outputVoltage, 0) / samples.length
  const rippleVoltage = peakOutputVoltage - minimumOutputVoltage
  const ripplePercent =
    averageOutputVoltage <= 1e-6 ? 0 : (rippleVoltage / averageOutputVoltage) * 100

  return {
    peakOutputVoltage,
    averageOutputVoltage,
    minimumOutputVoltage,
    rippleVoltage: rippleVoltage,
    ripplePercent: ripplePercent,
  }
}

export function buildRcHighPassDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
): RcHighPassDiagnostics {
  const cutoffFrequencyHertz = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)
  const gainMagnitude =
    Math.abs(scenario.sourceVoltage) <= 1e-6
      ? 0
      : Math.abs(snapshot.outputVoltage) / Math.abs(scenario.sourceVoltage)
  const phaseLeadDegrees =
    (Math.atan(
      1 /
        Math.max(
          2 * Math.PI * snapshot.timeSeconds * scenario.resistance * scenario.capacitance,
          1e-6,
        ),
    ) *
      180) /
    Math.PI

  return {
    cutoffFrequencyHertz,
    gainMagnitude,
    phaseLeadDegrees,
    passbandRecoveryPercent: gainMagnitude * 100,
  }
}

export function buildRcLowPassDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  snapshot: ElectronicsAndCircuitsStateSnapshot,
): RcLowPassDiagnostics {
  const cutoffFrequencyHertz = 1 / (2 * Math.PI * scenario.resistance * scenario.capacitance)
  const gainMagnitude =
    Math.abs(scenario.sourceVoltage) <= 1e-6
      ? 0
      : Math.abs(snapshot.outputVoltage) / Math.abs(scenario.sourceVoltage)
  const phaseLagDegrees =
    -(
      Math.atan(2 * Math.PI * snapshot.timeSeconds * scenario.resistance * scenario.capacitance) *
      180
    ) / Math.PI

  return {
    cutoffFrequencyHertz,
    gainMagnitude,
    phaseLagDegrees,
    outputVoltageRatio: gainMagnitude,
  }
}

export function buildResonanceDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  samples: readonly ElectronicsAndCircuitsSample[],
): ResonanceDiagnostics {
  const inductance = Math.max(scenario.inductance ?? 1e-6, 1e-6)
  const capacitance = Math.max(scenario.capacitance, 1e-6)
  const resonantFrequencyHertz = 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance))
  const qualityFactor =
    (1 / Math.max(scenario.resistance, 1e-6)) * Math.sqrt(inductance / capacitance)
  const peakVoltageSample =
    samples.length === 0
      ? null
      : samples.reduce((best, sample) =>
          sample.capacitorVoltage > best.capacitorVoltage ? sample : best,
        )
  const peakCurrentSample =
    samples.length === 0
      ? null
      : samples.reduce((best, sample) => (sample.current > best.current ? sample : best))
  const peakPowerSample =
    samples.length === 0
      ? null
      : samples.reduce((best, sample) => (sample.branchPower > best.branchPower ? sample : best))

  return {
    resonantFrequencyHertz,
    qualityFactor,
    peakCapacitorVoltage: peakVoltageSample?.capacitorVoltage ?? 0,
    peakCurrentFrequencyHertz: peakCurrentSample?.timeSeconds ?? resonantFrequencyHertz,
    peakPowerWatts: peakPowerSample?.branchPower ?? 0,
  }
}

export function buildRlcDiagnostics(
  scenario: ElectronicsAndCircuitsScenario,
  samples: readonly ElectronicsAndCircuitsSample[],
): RlcDiagnostics {
  const inductance = Math.max(scenario.inductance ?? 1e-6, 1e-6)
  const capacitance = Math.max(scenario.capacitance, 1e-6)
  const dampingRatio = (scenario.resistance / 2) * Math.sqrt(capacitance / inductance)
  const dampingRegime =
    dampingRatio > 1.001 ? "Overdamped" : dampingRatio < 0.999 ? "Underdamped" : "Critically damped"
  const peakVoltage =
    samples.length === 0 ? 0 : Math.max(...samples.map((sample) => sample.capacitorVoltage))
  const peakOvershootVoltage = Math.max(peakVoltage - scenario.sourceVoltage, 0)
  const peakOvershootPercent =
    scenario.sourceVoltage === 0
      ? 0
      : (peakOvershootVoltage / Math.abs(scenario.sourceVoltage)) * 100
  const tolerance = Math.max(Math.abs(scenario.sourceVoltage) * 0.05, 0.05)
  let settlingTimeSeconds: number | null = null

  for (let index = 0; index < samples.length; index += 1) {
    const settled = samples
      .slice(index)
      .every((sample) => Math.abs(sample.capacitorVoltage - scenario.sourceVoltage) <= tolerance)
    if (settled) {
      settlingTimeSeconds = samples[index]?.timeSeconds ?? null
      break
    }
  }

  let currentReversalCount = 0
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1].current
    const current = samples[index].current
    if ((previous < 0 && current > 0) || (previous > 0 && current < 0)) {
      currentReversalCount += 1
    }
  }

  return {
    dampingRegime,
    dampingRatio,
    peakOvershootVoltage,
    peakOvershootPercent,
    settlingTimeSeconds,
    currentReversalCount,
  }
}

function buildHorizontalGuide(
  samples: readonly ElectronicsAndCircuitsSample[],
  metric: PlotMetric,
  value: number,
  label: string,
  extraValues: readonly number[] = [],
): PlotGuide {
  const y = toPlotY(samples, metric, value, extraValues)
  return {
    label,
    path: `M 0 ${y.toFixed(2)} L ${PLOT_WIDTH} ${y.toFixed(2)}`,
  }
}

function buildVerticalGuide(
  samples: readonly ElectronicsAndCircuitsSample[],
  timeSeconds: number,
  label: string,
): PlotGuide {
  const x = toPlotX(samples, timeSeconds)
  return {
    label,
    path: `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} ${PLOT_HEIGHT}`,
  }
}

function buildMetricScale(
  samples: readonly ElectronicsAndCircuitsSample[],
  metric: PlotMetric,
  extraValues: readonly number[] = [],
): { min: number; span: number } {
  const values = [...samples.map((sample) => sample[metric]), ...extraValues]
  const min = Math.min(...values)
  const max = Math.max(...values)
  return {
    min,
    span: Math.max(max - min, 1e-6),
  }
}

function toPlotY(
  samples: readonly ElectronicsAndCircuitsSample[],
  metric: PlotMetric,
  value: number,
  extraValues: readonly number[] = [],
): number {
  const { min, span } = buildMetricScale(samples, metric, extraValues)
  return PLOT_HEIGHT - ((value - min) / span) * PLOT_HEIGHT
}

function toPlotX(samples: readonly ElectronicsAndCircuitsSample[], timeSeconds: number): number {
  if (samples.length <= 1) {
    return 0
  }

  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < samples.length; index += 1) {
    const distance = Math.abs(samples[index].timeSeconds - timeSeconds)
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  }

  return (closestIndex / Math.max(samples.length - 1, 1)) * PLOT_WIDTH
}

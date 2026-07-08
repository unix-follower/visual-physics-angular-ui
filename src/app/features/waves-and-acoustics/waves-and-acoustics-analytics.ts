import {
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 120

export interface WavesAndAcousticsInsightCard {
  label: string
  value: string
  detail: string
}

export interface WavesAndAcousticsPlotGuide {
  label: string
  value: string
  path: string
}

export interface WavesAndAcousticsPlotMarker {
  cx: number
  cy: number
}

interface SampleScale {
  minPosition: number
  positionSpan: number
  minValue: number
  valueSpan: number
}

function buildSampleScale(samples: readonly WavesAndAcousticsSample[]): SampleScale {
  const minPosition = samples[0]?.position ?? 0
  const maxPosition = samples[samples.length - 1]?.position ?? minPosition
  const positionSpan = Math.max(maxPosition - minPosition, 1e-6)
  const values = samples.map((sample) => sample.primaryValue)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueSpan = Math.max(maxValue - minValue, 1e-6)

  return {
    minPosition,
    positionSpan,
    minValue,
    valueSpan,
  }
}

function buildHorizontalGuide(
  scale: SampleScale,
  value: number,
  label: string,
  units: string,
): WavesAndAcousticsPlotGuide {
  const y = PLOT_HEIGHT - ((value - scale.minValue) / scale.valueSpan) * PLOT_HEIGHT
  return {
    label,
    value: `${value.toFixed(3)} ${units}`,
    path: `M 0 ${y.toFixed(2)} L ${PLOT_WIDTH} ${y.toFixed(2)}`,
  }
}

function buildVerticalGuide(
  scale: SampleScale,
  position: number,
  label: string,
  units: string,
): WavesAndAcousticsPlotGuide {
  const x = ((position - scale.minPosition) / scale.positionSpan) * PLOT_WIDTH
  return {
    label,
    value: `${position.toFixed(3)} ${units}`,
    path: `M ${x.toFixed(2)} 0 L ${x.toFixed(2)} ${PLOT_HEIGHT}`,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function buildSampleGraphPath(samples: readonly WavesAndAcousticsSample[]): string {
  if (samples.length === 0) {
    return ""
  }

  const scale = buildSampleScale(samples)

  return samples
    .map((sample, index) => {
      const x = ((sample.position - scale.minPosition) / scale.positionSpan) * PLOT_WIDTH
      const y =
        PLOT_HEIGHT - ((sample.primaryValue - scale.minValue) / scale.valueSpan) * PLOT_HEIGHT
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
}

export function buildSamplePlotGuides(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
  samples: readonly WavesAndAcousticsSample[],
): readonly WavesAndAcousticsPlotGuide[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)

  if (scenario.id === "standing-wave") {
    return [
      buildHorizontalGuide(scale, 0, "Equilibrium line", "mm"),
      buildVerticalGuide(scale, (snapshot.wavelengthMeters ?? 0) / 2, "Node spacing", "m"),
    ]
  }

  if (scenario.id === "traveling-wave") {
    return [
      buildHorizontalGuide(scale, 0, "Equilibrium line", "mm"),
      buildVerticalGuide(scale, snapshot.wavelengthMeters ?? 0, "One wavelength", "m"),
    ]
  }

  const sourcePosition = clamp(
    -6 + (snapshot.sourceSpeedMetersPerSecond ?? 0) * snapshot.timeSeconds * 0.18,
    -9,
    7,
  )
  const observerPosition = clamp(
    6 + (snapshot.observerSpeedMetersPerSecond ?? 0) * snapshot.timeSeconds * 0.18,
    sourcePosition + 1,
    10,
  )

  return [
    buildHorizontalGuide(scale, snapshot.emittedFrequencyHertz ?? 0, "Emitted frequency", "Hz"),
    buildHorizontalGuide(
      scale,
      snapshot.apparentFrequencyHertz ?? snapshot.emittedFrequencyHertz ?? 0,
      "Observed frequency",
      "Hz",
    ),
    buildVerticalGuide(scale, sourcePosition, "Source position", "m"),
    buildVerticalGuide(scale, observerPosition, "Observer position", "m"),
  ]
}

export function buildSampleReferencePath(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
  samples: readonly WavesAndAcousticsSample[],
): string {
  if (samples.length === 0) {
    return ""
  }

  const scale = buildSampleScale(samples)
  const referenceValue =
    scenario.id === "doppler-effect" ? (snapshot.emittedFrequencyHertz ?? 0) : 0
  const y = PLOT_HEIGHT - ((referenceValue - scale.minValue) / scale.valueSpan) * PLOT_HEIGHT
  return `M 0 ${y.toFixed(2)} L ${PLOT_WIDTH} ${y.toFixed(2)}`
}

export function buildSampleMarkerPoints(
  samples: readonly WavesAndAcousticsSample[],
): readonly WavesAndAcousticsPlotMarker[] {
  if (samples.length === 0) {
    return []
  }

  const scale = buildSampleScale(samples)
  const stride = Math.max(Math.floor(samples.length / 9), 1)

  return samples
    .filter((_, index) => index % stride === 0 || index === samples.length - 1)
    .map((sample) => ({
      cx: ((sample.position - scale.minPosition) / scale.positionSpan) * PLOT_WIDTH,
      cy: PLOT_HEIGHT - ((sample.primaryValue - scale.minValue) / scale.valueSpan) * PLOT_HEIGHT,
    }))
}

export function buildInsightCards(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
): readonly WavesAndAcousticsInsightCard[] {
  if (scenario.id === "standing-wave") {
    const nodeSpacing = (snapshot.wavelengthMeters ?? 0) / 2
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail:
          "The active time cursor sets the instantaneous standing-wave displacement while nodes remain fixed.",
      },
      {
        label: "Resonant mode",
        value: `n=${snapshot.harmonicNumber ?? 1}`,
        detail:
          "Integer harmonics fit a whole-number count of half-wavelengths onto the fixed string length.",
      },
      {
        label: "Node spacing",
        value: `${nodeSpacing.toFixed(3)} m`,
        detail:
          "Adjacent nodes stay separated by half a wavelength for an ideal standing-wave mode.",
      },
      {
        label: "Resonant frequency",
        value: `${(snapshot.frequencyHertz ?? 0).toFixed(2)} Hz`,
        detail:
          "The selected mode oscillates at the frequency implied by wave speed, string length, and harmonic number.",
      },
      {
        label: "Peak amplitude",
        value: `${(snapshot.amplitudeMillimeters ?? 0).toFixed(2)} mm`,
        detail:
          "Antinodes reach the configured peak displacement while the nodes remain fixed in place.",
      },
    ]
  }

  if (scenario.id === "traveling-wave") {
    const periodSeconds =
      (snapshot.frequencyHertz ?? 0) > 0 ? 1 / (snapshot.frequencyHertz ?? 1) : 0
    return [
      {
        label: "Snapshot time",
        value: `${snapshot.timeSeconds.toFixed(3)} s`,
        detail:
          "The active time cursor shifts the phase of the propagated waveform through the one-dimensional medium.",
      },
      {
        label: "Propagation speed",
        value: `${(snapshot.waveSpeedMetersPerSecond ?? 0).toFixed(2)} m/s`,
        detail: "The phase profile translates through the medium at the configured wave speed.",
      },
      {
        label: "Wavelength",
        value: `${(snapshot.wavelengthMeters ?? 0).toFixed(3)} m`,
        detail:
          "The distance between repeated crest locations follows directly from speed divided by frequency.",
      },
      {
        label: "Period",
        value: `${periodSeconds.toFixed(3)} s`,
        detail: "One full oscillation repeats after the inverse of the active driving frequency.",
      },
      {
        label: "Pulse amplitude",
        value: `${(snapshot.amplitudeMillimeters ?? 0).toFixed(2)} mm`,
        detail:
          "The peak displacement travels without changing the underlying one-dimensional propagation speed.",
      },
    ]
  }

  const frequencyShift =
    (snapshot.apparentFrequencyHertz ?? 0) - (snapshot.emittedFrequencyHertz ?? 0)
  const shiftLabel = frequencyShift >= 0 ? "Compressed wavefronts" : "Dilated wavefronts"
  const shiftDetail =
    frequencyShift >= 0
      ? "Relative motion shortens the observed spacing between wavefront arrivals and raises the detected pitch."
      : "Relative motion stretches the observed spacing between wavefront arrivals and lowers the detected pitch."

  return [
    {
      label: "Snapshot time",
      value: `${snapshot.timeSeconds.toFixed(3)} s`,
      detail:
        "The active time cursor shifts the moving source-observer slice used for the Doppler frequency transition.",
    },
    {
      label: shiftLabel,
      value: `${(snapshot.apparentFrequencyHertz ?? 0).toFixed(2)} Hz`,
      detail: shiftDetail,
    },
    {
      label: "Frequency shift",
      value: `${frequencyShift >= 0 ? "+" : ""}${frequencyShift.toFixed(2)} Hz`,
      detail:
        "Observed frequency differs from the emitted value because source and observer motion alter arrival timing.",
    },
    {
      label: "Source speed",
      value: `${(snapshot.sourceSpeedMetersPerSecond ?? 0).toFixed(2)} m/s`,
      detail:
        "Positive source speed moves the emitter toward the observer in this one-dimensional slice.",
    },
    {
      label: "Observer speed",
      value: `${(snapshot.observerSpeedMetersPerSecond ?? 0).toFixed(2)} m/s`,
      detail:
        "Observer motion changes the wavefront encounter rate even when the emitted frequency stays fixed.",
    },
  ]
}

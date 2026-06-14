import {
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"

export interface WavesAndAcousticsReportSummaryRow {
  metric: string
  label: string
  value: number | string
  detail: string
}

function escapeCsv(value: string | number): string {
  const text = String(value).replaceAll('"', '""')
  return `"${text}"`
}

export function buildWavesAndAcousticsReportCsv(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
  samples: readonly WavesAndAcousticsSample[],
): string {
  const summaryRows = buildWavesAndAcousticsReportSummaryRows(scenario, snapshot)
  const summarySection = summaryRows
    .map(
      (row) =>
        `${escapeCsv("summary")},${escapeCsv(row.metric)},${escapeCsv(row.label)},${escapeCsv(row.value)},${escapeCsv(row.detail)}`,
    )
    .join("\n")
  const samplesSection = samples
    .map(
      (sample) =>
        `${escapeCsv(sample.label)},${sample.position},${sample.primaryValue},${sample.secondaryValue ?? ""},${sample.active}`,
    )
    .join("\n")

  return [
    "category,metric,label,value,detail",
    summarySection,
    "",
    "sampleLabel,position,primaryValue,secondaryValue,active",
    samplesSection,
  ]
    .filter((line) => line.length > 0 || line === "")
    .join("\n")
}

export function buildWavesAndAcousticsReportSummaryRows(
  scenario: WavesAndAcousticsScenario,
  snapshot: WavesAndAcousticsStateSnapshot,
): readonly WavesAndAcousticsReportSummaryRow[] {
  if (scenario.id === "standing-wave") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: snapshot.timeSeconds.toFixed(6),
        detail: "Active time cursor used for the sampled standing-wave profile.",
      },
      {
        metric: "frequency_hz",
        label: "Frequency",
        value: (snapshot.frequencyHertz ?? 0).toFixed(6),
        detail: "Resonant standing-wave frequency for the selected harmonic.",
      },
      {
        metric: "wavelength_m",
        label: "Wavelength",
        value: (snapshot.wavelengthMeters ?? 0).toFixed(6),
        detail: "Spatial period implied by the current string length and harmonic.",
      },
      {
        metric: "harmonic_number",
        label: "Harmonic number",
        value: snapshot.harmonicNumber ?? 0,
        detail: "Selected standing-wave mode index.",
      },
    ]
  }

  if (scenario.id === "traveling-wave") {
    return [
      {
        metric: "snapshot_time_s",
        label: "Snapshot time",
        value: snapshot.timeSeconds.toFixed(6),
        detail: "Active time cursor used for the propagated waveform sample set.",
      },
      {
        metric: "frequency_hz",
        label: "Frequency",
        value: (snapshot.frequencyHertz ?? 0).toFixed(6),
        detail: "Oscillation frequency derived from wave speed and wavelength.",
      },
      {
        metric: "wavelength_m",
        label: "Wavelength",
        value: (snapshot.wavelengthMeters ?? 0).toFixed(6),
        detail: "Distance between repeated points on the propagated waveform.",
      },
      {
        metric: "wave_speed_m_per_s",
        label: "Wave speed",
        value: (snapshot.waveSpeedMetersPerSecond ?? 0).toFixed(6),
        detail: "Propagation speed in the active one-dimensional medium.",
      },
    ]
  }

  return [
    {
      metric: "snapshot_time_s",
      label: "Snapshot time",
      value: snapshot.timeSeconds.toFixed(6),
      detail: "Active time cursor used for the moving source-observer Doppler slice.",
    },
    {
      metric: "emitted_frequency_hz",
      label: "Emitted frequency",
      value: (snapshot.emittedFrequencyHertz ?? 0).toFixed(6),
      detail: "Source frequency before relative-motion shift is applied.",
    },
    {
      metric: "apparent_frequency_hz",
      label: "Apparent frequency",
      value: (snapshot.apparentFrequencyHertz ?? 0).toFixed(6),
      detail: "Observed frequency after Doppler compression or dilation.",
    },
    {
      metric: "source_speed_m_per_s",
      label: "Source speed",
      value: (snapshot.sourceSpeedMetersPerSecond ?? 0).toFixed(6),
      detail: "Signed source speed relative to the acoustic medium.",
    },
  ]
}

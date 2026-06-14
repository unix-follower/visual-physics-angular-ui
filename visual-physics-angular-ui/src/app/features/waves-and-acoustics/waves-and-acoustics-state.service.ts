import { computed, Injectable, signal } from "@angular/core"

import {
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsScenarioId,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"

export type EditableWavesAndAcousticsField =
  | "timeSeconds"
  | "stringLengthMeters"
  | "waveSpeedMetersPerSecond"
  | "amplitudeMillimeters"
  | "harmonicNumber"
  | "frequencyHertz"
  | "emittedFrequencyHertz"
  | "sourceSpeedMetersPerSecond"
  | "observerSpeedMetersPerSecond"

const SCENARIOS: readonly WavesAndAcousticsScenario[] = [
  {
    id: "standing-wave",
    name: "Standing Wave on a String",
    summary:
      "Resolve harmonic mode shape, wavelength, and resonant frequency for a stretched one-dimensional string.",
    equationSummary: "f_n = n v / (2L), lambda_n = 2L / n",
    status: "Validated shared slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 1, minY: -1.2, maxY: 1.2 },
    focusArea:
      "Harmonic mode count, standing-wave node spacing, and wavelength-frequency scaling at fixed wave speed.",
    stringLengthMeters: 1.2,
    waveSpeedMetersPerSecond: 24,
    amplitudeMillimeters: 6,
    harmonicNumber: 2,
  },
  {
    id: "traveling-wave",
    name: "Traveling Wave Pulse Train",
    summary:
      "Track a sinusoidal traveling wave using wavelength, frequency, and propagation speed on a one-dimensional medium.",
    equationSummary: "y(x,t) = A sin(2 pi (x / lambda - f t))",
    status: "Validated shared slice",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 2.4, minY: -1.2, maxY: 1.2 },
    focusArea:
      "Propagation speed, phase advance, and wavelength-frequency coupling for a deterministic traveling-wave trace.",
    waveSpeedMetersPerSecond: 18,
    amplitudeMillimeters: 4,
    frequencyHertz: 6,
  },
  {
    id: "doppler-effect",
    name: "One-Dimensional Doppler Shift",
    summary:
      "Estimate apparent frequency shifts for a moving source and observer in a shared acoustic medium.",
    equationSummary: "f' = f (v + v_o) / (v - v_s)",
    status: "Validated shared slice",
    durationSeconds: 1,
    viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
    focusArea:
      "Apparent pitch shift, relative source-observer motion, and wavelength compression or dilation in the medium.",
    waveSpeedMetersPerSecond: 343,
    emittedFrequencyHertz: 440,
    sourceSpeedMetersPerSecond: 18,
    observerSpeedMetersPerSecond: 0,
  },
]

const DEFAULT_SNAPSHOT_TIMES: Readonly<Record<WavesAndAcousticsScenarioId, number>> = {
  "standing-wave": 0,
  "traveling-wave": 0.25,
  "doppler-effect": 0,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getDefaultScenario(id: WavesAndAcousticsScenarioId): WavesAndAcousticsScenario {
  switch (id) {
    case "standing-wave":
      return SCENARIOS[0]
    case "traveling-wave":
      return SCENARIOS[1]
    case "doppler-effect":
      return SCENARIOS[2]
  }
}

function normalizeSnapshotTime(timeSeconds: number, fallback: number): number {
  return Number.isFinite(timeSeconds) && timeSeconds >= 0 ? timeSeconds : fallback
}

function normalizeScenario(scenario: WavesAndAcousticsScenario): WavesAndAcousticsScenario {
  const defaultScenario = getDefaultScenario(scenario.id)
  const sharedScenario = {
    id: scenario.id,
    name: scenario.name,
    summary: scenario.summary,
    equationSummary: scenario.equationSummary,
    status: scenario.status,
    durationSeconds: Math.max(scenario.durationSeconds, 0),
    viewBounds: scenario.viewBounds,
    focusArea: scenario.focusArea,
  }

  if (scenario.id === "standing-wave") {
    return {
      ...sharedScenario,
      stringLengthMeters: Math.max(
        scenario.stringLengthMeters ?? defaultScenario.stringLengthMeters ?? 1.2,
        0.1,
      ),
      waveSpeedMetersPerSecond: Math.max(
        scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 24,
        0.1,
      ),
      amplitudeMillimeters: Math.max(
        scenario.amplitudeMillimeters ?? defaultScenario.amplitudeMillimeters ?? 6,
        0.1,
      ),
      harmonicNumber: Math.max(
        1,
        Math.round(scenario.harmonicNumber ?? defaultScenario.harmonicNumber ?? 1),
      ),
    }
  }

  if (scenario.id === "traveling-wave") {
    return {
      ...sharedScenario,
      waveSpeedMetersPerSecond: Math.max(
        scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 18,
        0.1,
      ),
      amplitudeMillimeters: Math.max(
        scenario.amplitudeMillimeters ?? defaultScenario.amplitudeMillimeters ?? 4,
        0.1,
      ),
      frequencyHertz: Math.max(scenario.frequencyHertz ?? defaultScenario.frequencyHertz ?? 6, 0.1),
    }
  }

  return {
    ...sharedScenario,
    waveSpeedMetersPerSecond: Math.max(
      scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 343,
      0.1,
    ),
    emittedFrequencyHertz: Math.max(
      scenario.emittedFrequencyHertz ?? defaultScenario.emittedFrequencyHertz ?? 440,
      0.1,
    ),
    sourceSpeedMetersPerSecond: clamp(
      scenario.sourceSpeedMetersPerSecond ?? defaultScenario.sourceSpeedMetersPerSecond ?? 18,
      -0.9 * (scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 343),
      0.9 * (scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 343),
    ),
    observerSpeedMetersPerSecond: clamp(
      scenario.observerSpeedMetersPerSecond ?? defaultScenario.observerSpeedMetersPerSecond ?? 0,
      -0.9 * (scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 343),
      0.9 * (scenario.waveSpeedMetersPerSecond ?? defaultScenario.waveSpeedMetersPerSecond ?? 343),
    ),
  }
}

function buildStandingWaveSnapshot(
  scenario: WavesAndAcousticsScenario,
): WavesAndAcousticsStateSnapshot {
  const stringLengthMeters = Math.max(scenario.stringLengthMeters ?? 1.2, 0.1)
  const waveSpeedMetersPerSecond = Math.max(scenario.waveSpeedMetersPerSecond ?? 24, 0.1)
  const amplitudeMillimeters = Math.max(scenario.amplitudeMillimeters ?? 6, 0.1)
  const harmonicNumber = Math.max(1, Math.round(scenario.harmonicNumber ?? 1))
  const wavelengthMeters = (2 * stringLengthMeters) / harmonicNumber
  const frequencyHertz = waveSpeedMetersPerSecond / wavelengthMeters

  return {
    timeSeconds: 0,
    stringLengthMeters,
    waveSpeedMetersPerSecond,
    amplitudeMillimeters,
    harmonicNumber,
    wavelengthMeters,
    frequencyHertz,
    stable: Number.isFinite(frequencyHertz),
  }
}

function buildTravelingWaveSnapshot(
  scenario: WavesAndAcousticsScenario,
): WavesAndAcousticsStateSnapshot {
  const waveSpeedMetersPerSecond = Math.max(scenario.waveSpeedMetersPerSecond ?? 18, 0.1)
  const amplitudeMillimeters = Math.max(scenario.amplitudeMillimeters ?? 4, 0.1)
  const frequencyHertz = Math.max(scenario.frequencyHertz ?? 6, 0.1)
  const wavelengthMeters = waveSpeedMetersPerSecond / frequencyHertz

  return {
    timeSeconds: 0.25,
    waveSpeedMetersPerSecond,
    amplitudeMillimeters,
    frequencyHertz,
    wavelengthMeters,
    stable: Number.isFinite(wavelengthMeters),
  }
}

function buildDopplerSnapshot(scenario: WavesAndAcousticsScenario): WavesAndAcousticsStateSnapshot {
  const waveSpeedMetersPerSecond = Math.max(scenario.waveSpeedMetersPerSecond ?? 343, 0.1)
  const emittedFrequencyHertz = Math.max(scenario.emittedFrequencyHertz ?? 440, 0.1)
  const sourceSpeedMetersPerSecond = clamp(
    scenario.sourceSpeedMetersPerSecond ?? 18,
    -waveSpeedMetersPerSecond * 0.9,
    waveSpeedMetersPerSecond * 0.9,
  )
  const observerSpeedMetersPerSecond = clamp(
    scenario.observerSpeedMetersPerSecond ?? 0,
    -waveSpeedMetersPerSecond * 0.9,
    waveSpeedMetersPerSecond * 0.9,
  )
  const apparentFrequencyHertz =
    emittedFrequencyHertz *
    ((waveSpeedMetersPerSecond + observerSpeedMetersPerSecond) /
      (waveSpeedMetersPerSecond - sourceSpeedMetersPerSecond))
  const wavelengthMeters = waveSpeedMetersPerSecond / emittedFrequencyHertz

  return {
    timeSeconds: 0,
    waveSpeedMetersPerSecond,
    emittedFrequencyHertz,
    sourceSpeedMetersPerSecond,
    observerSpeedMetersPerSecond,
    apparentFrequencyHertz,
    wavelengthMeters,
    stable: Number.isFinite(apparentFrequencyHertz),
  }
}

function buildStandingWaveSamples(
  snapshot: WavesAndAcousticsStateSnapshot,
): readonly WavesAndAcousticsSample[] {
  const length = snapshot.stringLengthMeters ?? 1.2
  const harmonic = Math.max(1, Math.round(snapshot.harmonicNumber ?? 1))
  const amplitude = snapshot.amplitudeMillimeters ?? 6
  const frequency = Math.max(snapshot.frequencyHertz ?? 0, 0)
  const temporalScale = Math.cos(2 * Math.PI * frequency * snapshot.timeSeconds)
  const samples: WavesAndAcousticsSample[] = []
  for (let index = 0; index <= 72; index += 1) {
    const position = (index / 72) * length
    const displacement =
      amplitude * Math.sin((harmonic * Math.PI * position) / length) * temporalScale
    samples.push({
      position,
      primaryValue: displacement,
      label: "standing-wave-profile",
      active: true,
    })
  }
  return samples
}

function buildTravelingWaveSamples(
  snapshot: WavesAndAcousticsStateSnapshot,
): readonly WavesAndAcousticsSample[] {
  const amplitude = snapshot.amplitudeMillimeters ?? 4
  const wavelength = snapshot.wavelengthMeters ?? 3
  const frequency = snapshot.frequencyHertz ?? 6
  const timeSeconds = snapshot.timeSeconds
  const samples: WavesAndAcousticsSample[] = []
  for (let index = 0; index <= 72; index += 1) {
    const position = (index / 72) * (wavelength * 2)
    const phase = 2 * Math.PI * (position / wavelength - frequency * timeSeconds)
    samples.push({
      position,
      primaryValue: amplitude * Math.sin(phase),
      label: "traveling-wave-profile",
      active: true,
    })
  }
  return samples
}

function buildDopplerSamples(
  snapshot: WavesAndAcousticsStateSnapshot,
): readonly WavesAndAcousticsSample[] {
  const emittedFrequencyHertz = snapshot.emittedFrequencyHertz ?? 440
  const apparentFrequencyHertz = snapshot.apparentFrequencyHertz ?? emittedFrequencyHertz
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
  const samples: WavesAndAcousticsSample[] = []
  for (let index = 0; index <= 24; index += 1) {
    const position = -12 + index
    const interpolation = clamp(
      (position - sourcePosition) / Math.max(observerPosition - sourcePosition, 1),
      0,
      1,
    )
    const smoothedInterpolation = interpolation * interpolation * (3 - 2 * interpolation)
    samples.push({
      position,
      primaryValue:
        emittedFrequencyHertz +
        (apparentFrequencyHertz - emittedFrequencyHertz) * smoothedInterpolation,
      label: "doppler-frequency-shift",
      active: true,
    })
  }
  return samples
}

@Injectable({ providedIn: "root" })
export class WavesAndAcousticsStateService {
  private readonly scenarios = signal<
    Record<WavesAndAcousticsScenarioId, WavesAndAcousticsScenario>
  >({
    "standing-wave": { ...SCENARIOS[0] },
    "traveling-wave": { ...SCENARIOS[1] },
    "doppler-effect": { ...SCENARIOS[2] },
  })
  private readonly snapshotTimes = signal<Record<WavesAndAcousticsScenarioId, number>>({
    ...DEFAULT_SNAPSHOT_TIMES,
  })
  private readonly selectedScenarioId = signal<WavesAndAcousticsScenarioId>("standing-wave")

  protected readonly scenarioMap = this.scenarios.asReadonly()
  readonly selectedScenario = computed(() => this.scenarios()[this.selectedScenarioId()])
  readonly currentState = computed(() => {
    const scenario = this.selectedScenario()
    const restoredTimeSeconds = this.snapshotTimes()[scenario.id]
    switch (scenario.id) {
      case "standing-wave":
        return {
          ...buildStandingWaveSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
      case "traveling-wave":
        return {
          ...buildTravelingWaveSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
      case "doppler-effect":
        return {
          ...buildDopplerSnapshot(scenario),
          timeSeconds: restoredTimeSeconds,
        }
    }
  })
  readonly sampledStates = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()
    switch (scenario.id) {
      case "standing-wave":
        return buildStandingWaveSamples(snapshot)
      case "traveling-wave":
        return buildTravelingWaveSamples(snapshot)
      case "doppler-effect":
        return buildDopplerSamples(snapshot)
    }
  })

  listScenarios(): readonly WavesAndAcousticsScenario[] {
    return [
      this.scenarios()["standing-wave"],
      this.scenarios()["traveling-wave"],
      this.scenarios()["doppler-effect"],
    ]
  }

  selectScenario(id: WavesAndAcousticsScenarioId): void {
    this.selectedScenarioId.set(id)
  }

  updateScenarioField(field: EditableWavesAndAcousticsField, value: number): void {
    const scenarioId = this.selectedScenarioId()
    if (field === "timeSeconds") {
      this.snapshotTimes.update((current) => ({
        ...current,
        [scenarioId]: normalizeSnapshotTime(value, DEFAULT_SNAPSHOT_TIMES[scenarioId]),
      }))
      return
    }

    this.scenarios.update((current) => ({
      ...current,
      [scenarioId]: {
        ...normalizeScenario({
          ...current[scenarioId],
          [field]: value,
        }),
      },
    }))
  }

  importScenarioState(scenario: WavesAndAcousticsScenario, timeSeconds: number): void {
    const normalizedTimeSeconds = normalizeSnapshotTime(
      timeSeconds,
      DEFAULT_SNAPSHOT_TIMES[scenario.id],
    )
    this.scenarios.update((current) => ({
      ...current,
      [scenario.id]: normalizeScenario({
        ...scenario,
        durationSeconds: Math.max(normalizedTimeSeconds, scenario.durationSeconds),
      }),
    }))
    this.snapshotTimes.update((times) => ({
      ...times,
      [scenario.id]: normalizedTimeSeconds,
    }))
    this.selectedScenarioId.set(scenario.id)
  }

  resetSelectedScenario(): void {
    const scenarioId = this.selectedScenarioId()
    this.scenarios.update((current) => ({
      ...current,
      [scenarioId]: { ...getDefaultScenario(scenarioId) },
    }))
    this.snapshotTimes.update((times) => ({
      ...times,
      [scenarioId]: DEFAULT_SNAPSHOT_TIMES[scenarioId],
    }))
  }
}

import { buildWavesAndAcousticsViewportGeometry } from "./waves-and-acoustics-webgpu-renderer"

describe("waves-and-acoustics-webgpu-renderer", () => {
  it("builds viewport geometry for the standing-wave slice", () => {
    const geometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0,
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
        wavelengthMeters: 1.2,
        frequencyHertz: 20,
        stable: true,
      },
      {
        id: "standing-wave",
        name: "Standing Wave on a String",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Implemented",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 1, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
      },
      {
        showWaveGuides: true,
        showNodeMarkers: true,
        showReferenceCurve: true,
      },
      [
        { position: 0, primaryValue: 0, label: "standing-wave-profile", active: true },
        { position: 0.6, primaryValue: 6, label: "standing-wave-profile", active: true },
        { position: 1.2, primaryValue: 0, label: "standing-wave-profile", active: true },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("changes standing-wave guide geometry when the standing-wave snapshot time changes", () => {
    const scenario = {
      id: "standing-wave",
      name: "Standing Wave on a String",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Implemented",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 1, minY: -1.2, maxY: 1.2 },
      focusArea: "Focus",
      stringLengthMeters: 1.2,
      waveSpeedMetersPerSecond: 24,
      amplitudeMillimeters: 6,
      harmonicNumber: 2,
    } as const
    const overlays = {
      showWaveGuides: true,
      showNodeMarkers: true,
      showReferenceCurve: true,
    } as const

    const peakGeometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0,
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
        wavelengthMeters: 1.2,
        frequencyHertz: 20,
        stable: true,
      },
      scenario,
      overlays,
      [
        { position: 0, primaryValue: 0, label: "standing-wave-profile", active: true },
        { position: 0.6, primaryValue: 6, label: "standing-wave-profile", active: true },
        { position: 1.2, primaryValue: 0, label: "standing-wave-profile", active: true },
      ],
    )

    const nodeGeometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 1 / 80,
        stringLengthMeters: 1.2,
        waveSpeedMetersPerSecond: 24,
        amplitudeMillimeters: 6,
        harmonicNumber: 2,
        wavelengthMeters: 1.2,
        frequencyHertz: 20,
        stable: true,
      },
      scenario,
      overlays,
      [
        { position: 0, primaryValue: 0, label: "standing-wave-profile", active: true },
        { position: 0.6, primaryValue: 0, label: "standing-wave-profile", active: true },
        { position: 1.2, primaryValue: 0, label: "standing-wave-profile", active: true },
      ],
    )

    expect(Array.from(peakGeometry.lineVertices)).not.toEqual(Array.from(nodeGeometry.lineVertices))
    expect(peakGeometry.markerVertices.length).toBe(nodeGeometry.markerVertices.length)
  })

  it("builds viewport geometry for the traveling-wave slice", () => {
    const geometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0.25,
        waveSpeedMetersPerSecond: 18,
        amplitudeMillimeters: 4,
        frequencyHertz: 6,
        wavelengthMeters: 3,
        stable: true,
      },
      {
        id: "traveling-wave",
        name: "Traveling Wave Pulse Train",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Scaffolded",
        durationSeconds: 1,
        viewBounds: { minX: 0, maxX: 2.4, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 18,
        amplitudeMillimeters: 4,
        frequencyHertz: 6,
      },
      {
        showWaveGuides: true,
        showNodeMarkers: true,
        showReferenceCurve: true,
      },
      [
        { position: 0, primaryValue: 0, label: "traveling-wave-profile", active: true },
        { position: 1, primaryValue: 4, label: "traveling-wave-profile", active: true },
        { position: 2, primaryValue: 0, label: "traveling-wave-profile", active: true },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds viewport geometry for the doppler slice", () => {
    const geometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0,
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
        apparentFrequencyHertz: 464.38,
        stable: true,
      },
      {
        id: "doppler-effect",
        name: "One-Dimensional Doppler Shift",
        summary: "Summary",
        equationSummary: "Equation",
        status: "Scaffolded",
        durationSeconds: 1,
        viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
        focusArea: "Focus",
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
      },
      {
        showWaveGuides: true,
        showNodeMarkers: true,
        showReferenceCurve: true,
      },
      [
        { position: -12, primaryValue: 440, label: "doppler-frequency-shift", active: true },
        { position: 0, primaryValue: 452, label: "doppler-frequency-shift", active: true },
        { position: 12, primaryValue: 464.38, label: "doppler-frequency-shift", active: true },
      ],
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("changes doppler geometry when the doppler snapshot time changes", () => {
    const scenario = {
      id: "doppler-effect",
      name: "One-Dimensional Doppler Shift",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scaffolded",
      durationSeconds: 1,
      viewBounds: { minX: -20, maxX: 20, minY: -1.2, maxY: 1.2 },
      focusArea: "Focus",
      waveSpeedMetersPerSecond: 343,
      emittedFrequencyHertz: 440,
      sourceSpeedMetersPerSecond: 18,
      observerSpeedMetersPerSecond: 0,
    } as const
    const overlays = {
      showWaveGuides: true,
      showNodeMarkers: true,
      showReferenceCurve: true,
    } as const

    const initialGeometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0,
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
        apparentFrequencyHertz: 464.38,
        stable: true,
      },
      scenario,
      overlays,
      [
        { position: -12, primaryValue: 440, label: "doppler-frequency-shift", active: true },
        { position: 0, primaryValue: 452, label: "doppler-frequency-shift", active: true },
        { position: 12, primaryValue: 464.38, label: "doppler-frequency-shift", active: true },
      ],
    )

    const shiftedGeometry = buildWavesAndAcousticsViewportGeometry(
      {
        timeSeconds: 0.75,
        waveSpeedMetersPerSecond: 343,
        emittedFrequencyHertz: 440,
        sourceSpeedMetersPerSecond: 18,
        observerSpeedMetersPerSecond: 0,
        apparentFrequencyHertz: 464.38,
        stable: true,
      },
      scenario,
      overlays,
      [
        { position: -12, primaryValue: 440, label: "doppler-frequency-shift", active: true },
        { position: 0, primaryValue: 447, label: "doppler-frequency-shift", active: true },
        { position: 12, primaryValue: 464.38, label: "doppler-frequency-shift", active: true },
      ],
    )

    expect(Array.from(initialGeometry.lineVertices)).not.toEqual(
      Array.from(shiftedGeometry.lineVertices),
    )
    expect(initialGeometry.markerVertices.length).toBe(shiftedGeometry.markerVertices.length)
  })
})

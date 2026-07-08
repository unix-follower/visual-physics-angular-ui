import {
  buildInsightCards,
  buildSampleMarkerPoints,
  buildSampleGraphPath,
  buildSamplePlotGuides,
  buildSampleReferencePath,
} from "./waves-and-acoustics-analytics"
import {
  WavesAndAcousticsSample,
  WavesAndAcousticsScenario,
  WavesAndAcousticsStateSnapshot,
} from "./waves-and-acoustics.models"

describe("buildSampleGraphPath", () => {
  it("builds an SVG path from sampled wave values", () => {
    const samples: WavesAndAcousticsSample[] = [
      { position: 0, primaryValue: 0, label: "wave", active: true },
      { position: 0.5, primaryValue: 2, label: "wave", active: true },
      { position: 1, primaryValue: -1, label: "wave", active: true },
    ]

    const path = buildSampleGraphPath(samples)

    expect(path).toContain("M 0.00")
    expect(path).toContain("L 160.00")
    expect(path).toContain("L 320.00")
  })
})

describe("buildSamplePlotGuides", () => {
  it("builds standing-wave plot guides", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "standing-wave",
      name: "Standing Wave on a String",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 1.2, minY: -1, maxY: 1 },
      focusArea: "Focus",
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0,
      wavelengthMeters: 0.8,
      stable: true,
    }
    const samples: WavesAndAcousticsSample[] = [
      { position: 0, primaryValue: -2, label: "wave", active: true },
      { position: 0.4, primaryValue: 2, label: "wave", active: true },
      { position: 0.8, primaryValue: -2, label: "wave", active: true },
    ]

    const guides = buildSamplePlotGuides(scenario, snapshot, samples)

    expect(guides[0]?.label).toBe("Equilibrium line")
    expect(guides[1]?.value).toBe("0.400 m")
  })

  it("builds doppler plot guides", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "doppler-effect",
      name: "One-Dimensional Doppler Shift",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: -30, maxX: 30, minY: -1, maxY: 1 },
      focusArea: "Focus",
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0,
      emittedFrequencyHertz: 440,
      apparentFrequencyHertz: 464.38,
      stable: true,
    }
    const samples: WavesAndAcousticsSample[] = [
      { position: -1, primaryValue: 440, label: "wave", active: true },
      { position: 0, primaryValue: 452, label: "wave", active: true },
      { position: 1, primaryValue: 464.38, label: "wave", active: true },
    ]

    const guides = buildSamplePlotGuides(scenario, snapshot, samples)

    expect(guides[0]?.label).toBe("Emitted frequency")
    expect(guides[1]?.label).toBe("Observed frequency")
    expect(guides[2]?.label).toBe("Source position")
    expect(guides[3]?.label).toBe("Observer position")
  })
})

describe("plot overlay helpers", () => {
  it("builds a reference path for doppler plots", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "doppler-effect",
      name: "One-Dimensional Doppler Shift",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: -30, maxX: 30, minY: -1, maxY: 1 },
      focusArea: "Focus",
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0,
      emittedFrequencyHertz: 440,
      apparentFrequencyHertz: 464.38,
      stable: true,
    }
    const samples: WavesAndAcousticsSample[] = [
      { position: -1, primaryValue: 440, label: "wave", active: true },
      { position: 0, primaryValue: 452, label: "wave", active: true },
      { position: 1, primaryValue: 464.38, label: "wave", active: true },
    ]

    const path = buildSampleReferencePath(scenario, snapshot, samples)

    expect(path).toContain("M 0")
    expect(path).toContain("L 320")
  })

  it("builds decimated sample markers for the plot", () => {
    const samples = Array.from(
      { length: 10 },
      (_, index) =>
        ({
          position: index,
          primaryValue: index - 5,
          label: "wave",
          active: true,
        }) satisfies WavesAndAcousticsSample,
    )

    const markers = buildSampleMarkerPoints(samples)

    expect(markers.length).toBeGreaterThan(1)
    expect(markers[0]?.cx).toBe(0)
  })
})

describe("buildInsightCards", () => {
  it("builds standing-wave insight cards", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "standing-wave",
      name: "Standing Wave on a String",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 1.2, minY: -1, maxY: 1 },
      focusArea: "Focus",
      stringLengthMeters: 1.2,
      waveSpeedMetersPerSecond: 24,
      amplitudeMillimeters: 6,
      harmonicNumber: 3,
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0,
      stringLengthMeters: 1.2,
      waveSpeedMetersPerSecond: 24,
      amplitudeMillimeters: 6,
      harmonicNumber: 3,
      wavelengthMeters: 0.8,
      frequencyHertz: 30,
      stable: true,
    }

    const cards = buildInsightCards(scenario, snapshot)

    expect(cards[0]?.label).toBe("Snapshot time")
    expect(cards[0]?.value).toBe("0.000 s")
    expect(cards[1]?.label).toBe("Resonant mode")
    expect(cards[2]?.value).toBe("0.400 m")
    expect(cards[3]?.value).toBe("30.00 Hz")
  })

  it("builds traveling-wave insight cards", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "traveling-wave",
      name: "Traveling Wave Pulse Train",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: 0, maxX: 2.4, minY: -1.2, maxY: 1.2 },
      focusArea: "Focus",
      waveSpeedMetersPerSecond: 18,
      amplitudeMillimeters: 4,
      frequencyHertz: 6,
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0.25,
      waveSpeedMetersPerSecond: 18,
      amplitudeMillimeters: 4,
      frequencyHertz: 6,
      wavelengthMeters: 3,
      stable: true,
    }

    const cards = buildInsightCards(scenario, snapshot)

    expect(cards[0]?.label).toBe("Snapshot time")
    expect(cards[0]?.value).toBe("0.250 s")
    expect(cards[1]?.label).toBe("Propagation speed")
    expect(cards[2]?.value).toBe("3.000 m")
    expect(cards[3]?.value).toBe("0.167 s")
  })

  it("builds doppler insight cards for an approaching source", () => {
    const scenario: WavesAndAcousticsScenario = {
      id: "doppler-effect",
      name: "One-Dimensional Doppler Shift",
      summary: "Summary",
      equationSummary: "Equation",
      status: "Scenario contract locked",
      durationSeconds: 1,
      viewBounds: { minX: -30, maxX: 30, minY: -1.5, maxY: 1.5 },
      focusArea: "Focus",
      waveSpeedMetersPerSecond: 343,
      emittedFrequencyHertz: 440,
      sourceSpeedMetersPerSecond: 18,
      observerSpeedMetersPerSecond: 0,
    }
    const snapshot: WavesAndAcousticsStateSnapshot = {
      timeSeconds: 0,
      waveSpeedMetersPerSecond: 343,
      emittedFrequencyHertz: 440,
      sourceSpeedMetersPerSecond: 18,
      observerSpeedMetersPerSecond: 0,
      apparentFrequencyHertz: 464.38,
      stable: true,
    }

    const cards = buildInsightCards(scenario, snapshot)

    expect(cards[0]?.label).toBe("Snapshot time")
    expect(cards[0]?.value).toBe("0.000 s")
    expect(cards[1]?.label).toBe("Compressed wavefronts")
    expect(cards[2]?.value).toContain("+24.38")
    expect(cards[3]?.value).toBe("18.00 m/s")
  })
})

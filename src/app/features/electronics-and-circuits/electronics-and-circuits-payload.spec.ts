import { buildSamples, sampleScenario } from "./electronics-and-circuits-state.service"
import { buildExportPayload, parseImportPayload } from "./electronics-and-circuits-payload"

const scenario = {
  id: "rc-transient" as const,
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
}

describe("electronics-and-circuits-payload", () => {
  it("round-trips a valid RC import payload shape", () => {
    const snapshot = sampleScenario(scenario, 1.2)
    const samples = buildSamples(scenario, 8)
    const payload = buildExportPayload(
      scenario,
      snapshot,
      {
        showVoltageTrace: true,
        showCurrentTrace: true,
        showChargeTrace: false,
        showEnergyMarkers: true,
      },
      samples,
    )

    const imported = parseImportPayload(JSON.stringify(payload))

    expect(imported.scenario.id).toBe("rc-transient")
    expect(imported.snapshot.timeSeconds).toBeCloseTo(1.2, 6)
    expect(imported.overlays?.showEnergyMarkers).toBe(true)
  })

  it("rejects malformed payloads", () => {
    expect(() => parseImportPayload('{"scenario":{},"snapshot":{}}')).toThrowError(
      "Invalid payload",
    )
  })

  it("accepts resistor-network payloads with a secondary resistor value", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "resistor-network",
          name: "Resistor Divider Network",
          secondaryResistance: 330,
        },
        snapshot: { timeSeconds: 0 },
      }),
    )

    expect(imported.scenario.id).toBe("resistor-network")
    expect(imported.scenario.secondaryResistance).toBe(330)
  })

  it("accepts RL transient payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rl-transient",
          name: "RL Transient Response",
          inductance: 0.5,
          durationSeconds: 4,
        },
        snapshot: { timeSeconds: 0.2 },
      }),
    )

    expect(imported.scenario.id).toBe("rl-transient")
    expect(imported.scenario.inductance).toBe(0.5)
  })

  it("accepts half-wave rectifier payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "half-wave-rectifier",
          name: "Half-Wave Rectifier",
          durationSeconds: 0.04,
        },
        snapshot: { timeSeconds: 0.005 },
      }),
    )

    expect(imported.scenario.id).toBe("half-wave-rectifier")
    expect(imported.snapshot.timeSeconds).toBe(0.005)
  })

  it("accepts full-wave rectifier payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "full-wave-rectifier",
          name: "Full-Wave Rectifier",
          durationSeconds: 0.04,
        },
        snapshot: { timeSeconds: 0.015 },
      }),
    )

    expect(imported.scenario.id).toBe("full-wave-rectifier")
    expect(imported.snapshot.timeSeconds).toBe(0.015)
  })

  it("accepts smoothed rectifier payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "smoothed-rectifier",
          name: "Smoothed Bridge Rectifier",
          capacitance: 0.00047,
          durationSeconds: 0.04,
        },
        snapshot: { timeSeconds: 0.015 },
      }),
    )

    expect(imported.scenario.id).toBe("smoothed-rectifier")
    expect(imported.scenario.capacitance).toBe(0.00047)
  })

  it("accepts RC low-pass payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rc-low-pass",
          name: "RC Low-Pass Filter",
          durationSeconds: 12,
        },
        snapshot: { timeSeconds: 2 },
      }),
    )

    expect(imported.scenario.id).toBe("rc-low-pass")
    expect(imported.snapshot.timeSeconds).toBe(2)
  })

  it("accepts RC high-pass payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rc-high-pass",
          name: "RC High-Pass Filter",
          durationSeconds: 12,
        },
        snapshot: { timeSeconds: 2 },
      }),
    )

    expect(imported.scenario.id).toBe("rc-high-pass")
    expect(imported.snapshot.timeSeconds).toBe(2)
  })

  it("accepts RL low-pass payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rl-low-pass",
          name: "RL Low-Pass Filter",
          inductance: 0.2,
          durationSeconds: 12,
        },
        snapshot: { timeSeconds: 3.2 },
      }),
    )

    expect(imported.scenario.id).toBe("rl-low-pass")
    expect(imported.scenario.inductance).toBe(0.2)
  })

  it("accepts RL high-pass payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rl-high-pass",
          name: "RL High-Pass Filter",
          inductance: 0.2,
          durationSeconds: 12,
        },
        snapshot: { timeSeconds: 3.2 },
      }),
    )

    expect(imported.scenario.id).toBe("rl-high-pass")
    expect(imported.scenario.inductance).toBe(0.2)
  })

  it("accepts RLC payloads with an inductance value", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rlc-response",
          name: "RLC Step Response",
          inductance: 0.5,
        },
        snapshot: { timeSeconds: 0.4 },
      }),
    )

    expect(imported.scenario.id).toBe("rlc-response")
    expect(imported.scenario.inductance).toBe(0.5)
  })

  it("accepts RLC resonance payloads", () => {
    const imported = parseImportPayload(
      JSON.stringify({
        scenario: {
          ...scenario,
          id: "rlc-resonance",
          name: "RLC Resonance Sweep",
          inductance: 0.2,
          capacitance: 0.005,
          durationSeconds: 20,
        },
        snapshot: { timeSeconds: 5 },
      }),
    )

    expect(imported.scenario.id).toBe("rlc-resonance")
    expect(imported.snapshot.timeSeconds).toBe(5)
  })
})

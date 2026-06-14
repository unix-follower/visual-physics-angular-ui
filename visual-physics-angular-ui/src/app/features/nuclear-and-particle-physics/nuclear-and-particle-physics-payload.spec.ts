import { buildExportPayload, parseImportPayload } from "./nuclear-and-particle-physics-payload"
import { NuclearAndParticlePhysicsStateService } from "./nuclear-and-particle-physics-state.service"

describe("nuclear-and-particle-physics-payload", () => {
  it("roundtrips a proton collision payload with overlays and samples", () => {
    const service = new NuclearAndParticlePhysicsStateService()
    service.selectScenario("proton-proton-collision")
    const payload = buildExportPayload(
      service.selectedScenario(),
      service.currentState(),
      { showReferenceGuides: true, showActiveMarker: true, showComparisonBand: false },
      service.sampledStates(),
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.scenario.id).toBe("proton-proton-collision")
    expect(parsed.snapshot.timeSeconds).toBeCloseTo(service.currentState().timeSeconds)
    expect(parsed.overlays?.showActiveMarker).toBe(true)
  })

  it("rejects malformed payloads", () => {
    expect(() => parseImportPayload("{")).toThrowError("Invalid payload")
    expect(() => parseImportPayload(JSON.stringify({ scenario: {}, snapshot: {} }))).toThrowError(
      "Invalid payload",
    )
  })
})

import { buildExportPayload, parseImportPayload } from "./plasma-physics-payload"
import { PlasmaPhysicsStateService } from "./plasma-physics-state.service"

describe("plasma-physics-payload", () => {
  it("roundtrips a magnetic-confinement payload with overlays and samples", () => {
    const service = new PlasmaPhysicsStateService()
    service.selectScenario("magnetic-confinement")
    const payload = buildExportPayload(
      service.selectedScenario(),
      service.currentState(),
      { showReferenceGuides: true, showActiveMarker: true, showComparisonBand: false },
      service.sampledStates(),
    )

    const parsed = parseImportPayload(JSON.stringify(payload))

    expect(parsed.scenario.id).toBe("magnetic-confinement")
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

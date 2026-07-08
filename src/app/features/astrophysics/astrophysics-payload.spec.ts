import { TestBed } from "@angular/core/testing"

import { buildExportPayload, parseImportPayload } from "./astrophysics-payload"
import { AstrophysicsStateService } from "./astrophysics-state.service"

describe("astrophysics-payload", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AstrophysicsStateService],
    })
  })

  it("round-trips the default planetary-orbit payload", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const payload = buildExportPayload(
      service.selectedScenario(),
      service.currentState(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: false,
      },
      service.sampledStates(),
    )

    const parsed = parseImportPayload(JSON.stringify(payload))
    expect(parsed.scenario.id).toBe("planetary-orbit")
    expect(parsed.snapshot.timeSeconds).toBeCloseTo(0.2, 6)
    expect(parsed.overlays?.showActiveMarker).toBe(true)
  })

  it("rejects malformed payloads", () => {
    expect(() => parseImportPayload('{"scenario": 1}')).toThrowError("Invalid payload")
  })

  it("rejects non-finite numeric scenario fields", () => {
    expect(() =>
      parseImportPayload(`{
				"scenario": {
					"id": "planetary-orbit",
					"name": "Planetary Orbit Explorer",
					"summary": "Summary",
					"equationSummary": "Equation",
					"status": "Imported",
					"durationSeconds": 1,
					"viewBounds": { "minX": -1.6, "maxX": 1.6, "minY": -1.6, "maxY": 1.6 },
					"focusArea": "Focus",
					"centralMassSolarMasses": 1,
					"orbitalRadiusAstronomicalUnits": 1e309,
					"orbitalEccentricity": 0.1
				},
				"snapshot": { "timeSeconds": 0.2 }
			}`),
    ).toThrowError("Invalid payload")
  })
})

import { TestBed } from "@angular/core/testing"

import { buildExportPayload, parseImportPayload } from "./relativity-payload"
import { RelativityStateService } from "./relativity-state.service"

describe("relativity-payload", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativityStateService],
    })
  })

  it("round-trips the default time-dilation payload", () => {
    const service = TestBed.inject(RelativityStateService)
    const payload = buildExportPayload(
      service.selectedScenario(),
      service.currentState(),
      {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
      service.sampledStates(),
    )

    const parsed = parseImportPayload(JSON.stringify(payload))
    expect(parsed.scenario.id).toBe("time-dilation")
    expect(parsed.snapshot.timeSeconds).toBeCloseTo(1, 6)
    expect(parsed.overlays?.showComparisonCurve).toBe(true)
  })

  it("rejects malformed payloads", () => {
    expect(() => parseImportPayload('{"scenario": 1}')).toThrowError("Invalid payload")
  })

  it("rejects non-finite numeric values in scenario fields", () => {
    expect(() =>
      parseImportPayload(`{
				"scenario": {
					"id": "gravitational-time-dilation",
					"name": "Gravitational Time Dilation",
					"summary": "Summary",
					"equationSummary": "Equation",
					"status": "Imported",
					"durationSeconds": 1,
					"viewBounds": { "minX": 1, "maxX": 12, "minY": 0, "maxY": 1.1 },
					"focusArea": "Focus",
					"centralMassSolarMasses": 1e309,
					"orbitalRadiusSchwarzschildRadii": 6,
					"coordinateTimeSeconds": 1
				},
				"snapshot": { "timeSeconds": 1 }
			}`),
    ).toThrowError("Invalid payload")
  })
})

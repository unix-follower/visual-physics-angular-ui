import { TestBed } from "@angular/core/testing"

import { AtmosphericPhysicsStateService } from "./atmospheric-physics-state.service"
import { buildExportPayload, parseImportPayload } from "./atmospheric-physics-payload"

describe("atmospheric-physics-payload", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AtmosphericPhysicsStateService],
    })
  })

  it("round-trips the default barometric payload", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
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
    expect(parsed.scenario.id).toBe("barometric-formula")
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
					"id": "convection-column",
					"name": "Convection Column",
					"summary": "Summary",
					"equationSummary": "Equation",
					"status": "Imported",
					"durationSeconds": 1,
					"viewBounds": { "minX": 0, "maxX": 10, "minY": 0, "maxY": 22 },
					"focusArea": "Focus",
					"surfaceTemperatureKelvin": 300,
					"environmentalLapseRateKelvinPerKilometer": 6.5,
					"parcelTemperatureExcessKelvin": 1e309,
					"columnHeightKilometers": 9
				},
				"snapshot": { "timeSeconds": 0.2 }
			}`),
    ).toThrowError("Invalid payload")
  })
})

import { TestBed } from "@angular/core/testing"

import { buildRelativityViewportGeometry } from "./relativity-webgpu-renderer"
import { RelativityStateService } from "./relativity-state.service"

describe("relativity-webgpu-renderer", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativityStateService],
    })
  })

  it("builds non-empty line geometry for the default time-dilation viewport", () => {
    const service = TestBed.inject(RelativityStateService)
    const geometry = buildRelativityViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
      service.sampledStates(),
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
  })

  it("builds distinct scenario-aware geometry for relativistic doppler and gravitational slices", () => {
    const service = TestBed.inject(RelativityStateService)

    service.selectScenario("relativistic-doppler")
    const dopplerGeometry = buildRelativityViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
      service.sampledStates(),
    )

    service.selectScenario("gravitational-time-dilation")
    const gravitationalGeometry = buildRelativityViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
      service.sampledStates(),
    )

    expect(dopplerGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(gravitationalGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(Array.from(dopplerGeometry.lineVertices)).not.toEqual(
      Array.from(gravitationalGeometry.lineVertices),
    )
  })

  it("reduces viewport geometry when relativity overlays are disabled", () => {
    const service = TestBed.inject(RelativityStateService)
    const withOverlays = buildRelativityViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showComparisonCurve: true,
        showActiveMarker: true,
      },
      service.sampledStates(),
    )
    const withoutOverlays = buildRelativityViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: false,
        showComparisonCurve: false,
        showActiveMarker: false,
      },
      service.sampledStates(),
    )

    expect(withOverlays.lineVertices.length).toBeGreaterThan(withoutOverlays.lineVertices.length)
  })
})

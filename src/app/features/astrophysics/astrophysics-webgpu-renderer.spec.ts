import { TestBed } from "@angular/core/testing"

import { buildAstrophysicsViewportGeometry } from "./astrophysics-webgpu-renderer"
import { AstrophysicsStateService } from "./astrophysics-state.service"

describe("astrophysics-webgpu-renderer", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AstrophysicsStateService],
    })
  })

  it("builds non-empty line geometry for the default planetary-orbit viewport", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const geometry = buildAstrophysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(0)
  })

  it("builds distinct scenario-aware geometry for stellar-luminosity and hubble-expansion slices", () => {
    const service = TestBed.inject(AstrophysicsStateService)

    service.selectScenario("stellar-luminosity")
    const stellarGeometry = buildAstrophysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    service.selectScenario("hubble-expansion")
    const hubbleGeometry = buildAstrophysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    expect(stellarGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(hubbleGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(Array.from(stellarGeometry.lineVertices)).not.toEqual(
      Array.from(hubbleGeometry.lineVertices),
    )
  })

  it("reduces viewport geometry when astrophysics overlays are disabled", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const withOverlays = buildAstrophysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )
    const withoutOverlays = buildAstrophysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: false,
        showActiveMarker: false,
        showComparisonBand: false,
      },
      service.sampledStates(),
    )

    expect(withOverlays.lineVertices.length).toBeGreaterThan(withoutOverlays.lineVertices.length)
  })
})

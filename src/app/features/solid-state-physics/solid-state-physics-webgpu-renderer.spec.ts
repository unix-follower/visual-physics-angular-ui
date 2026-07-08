import { TestBed } from "@angular/core/testing"

import { SolidStatePhysicsStateService } from "./solid-state-physics-state.service"
import { buildSolidStatePhysicsViewportGeometry } from "./solid-state-physics-webgpu-renderer"

describe("solid-state-physics-webgpu-renderer", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SolidStatePhysicsStateService],
    })
  })

  it("builds non-empty viewport geometry for the default crystal-elasticity slice", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    const geometry = buildSolidStatePhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    expect(geometry.lineVertices.length).toBeGreaterThan(40)
    expect(geometry.markerVertices.length).toBeGreaterThan(0)
  })

  it("builds distinct scenario-aware geometry for phonon and electronic slices", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)

    service.selectScenario("phonon-dispersion")
    const phononGeometry = buildSolidStatePhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    service.selectScenario("electronic-structure")
    const electronicGeometry = buildSolidStatePhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    expect(phononGeometry.lineVertices.length).toBeGreaterThan(60)
    expect(electronicGeometry.lineVertices.length).toBeGreaterThan(60)
    expect(Array.from(phononGeometry.lineVertices)).not.toEqual(
      Array.from(electronicGeometry.lineVertices),
    )
  })

  it("reduces geometry when solid-state overlays are disabled", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    service.selectScenario("electronic-structure")

    const withOverlays = buildSolidStatePhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )
    const withoutOverlays = buildSolidStatePhysicsViewportGeometry(
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
    expect(withOverlays.markerVertices.length).toBeGreaterThan(
      withoutOverlays.markerVertices.length,
    )
  })
})

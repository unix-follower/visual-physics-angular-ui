import { TestBed } from "@angular/core/testing"

import { AtmosphericPhysicsStateService } from "./atmospheric-physics-state.service"
import { buildAtmosphericPhysicsViewportGeometry } from "./atmospheric-physics-webgpu-renderer"

describe("atmospheric-physics-webgpu-renderer", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AtmosphericPhysicsStateService],
    })
  })

  it("builds non-empty line geometry for the default barometric viewport", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    const geometry = buildAtmosphericPhysicsViewportGeometry(
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

  it("builds distinct scenario-aware geometry for adiabatic and convection slices", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)

    service.selectScenario("adiabatic-lapse-rate")
    const adiabaticGeometry = buildAtmosphericPhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    service.selectScenario("convection-column")
    const convectionGeometry = buildAtmosphericPhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )

    expect(adiabaticGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(convectionGeometry.lineVertices.length).toBeGreaterThan(40)
    expect(Array.from(adiabaticGeometry.lineVertices)).not.toEqual(
      Array.from(convectionGeometry.lineVertices),
    )
  })

  it("reduces viewport geometry when atmospheric overlays are disabled", () => {
    const service = TestBed.inject(AtmosphericPhysicsStateService)
    service.selectScenario("convection-column")

    const withOverlays = buildAtmosphericPhysicsViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceGuides: true,
        showActiveMarker: true,
        showComparisonBand: true,
      },
      service.sampledStates(),
    )
    const withoutOverlays = buildAtmosphericPhysicsViewportGeometry(
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

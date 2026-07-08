import {
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
} from "./plasma-physics-plot"
import { PlasmaPhysicsStateService } from "./plasma-physics-state.service"

describe("plasma-physics-plot", () => {
  it("builds graph and comparison paths for the oscillation samples", () => {
    const service = new PlasmaPhysicsStateService()
    const samples = service.sampledStates()

    expect(buildSampleGraphPath(samples)).toContain("M ")
    expect(buildSampleComparisonPath(samples)).toContain("L ")
    expect(buildSampleMarkerPoints(samples).length).toBeGreaterThan(0)
  })

  it("builds confinement plot guides for the active confinement snapshot", () => {
    const service = new PlasmaPhysicsStateService()
    service.selectScenario("magnetic-confinement")
    const guides = buildSamplePlotGuides(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(guides.map((guide) => guide.label)).toEqual(["Active radius fraction", "Safety factor"])
    expect(guides.every((guide) => guide.path.startsWith("M "))).toBe(true)
  })
})

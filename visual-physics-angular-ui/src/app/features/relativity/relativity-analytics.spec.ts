import { TestBed } from "@angular/core/testing"

import {
  buildInsightCards,
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSamplePlotGuides,
} from "./relativity-analytics"
import { RelativityStateService } from "./relativity-state.service"

describe("relativity-analytics", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativityStateService],
    })
  })

  it("builds time-dilation insight cards and plot paths", () => {
    const service = TestBed.inject(RelativityStateService)
    const cards = buildInsightCards(service.selectedScenario(), service.currentState())
    const path = buildSampleGraphPath(service.sampledStates())
    const comparison = buildSampleComparisonPath(service.sampledStates())
    const guides = buildSamplePlotGuides(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(cards[0]?.label).toBe("Velocity")
    expect(path.startsWith("M ")).toBe(true)
    expect(comparison.startsWith("M ")).toBe(true)
    expect(guides.length).toBe(2)
  })
})

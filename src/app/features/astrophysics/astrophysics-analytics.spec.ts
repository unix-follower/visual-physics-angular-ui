import { TestBed } from "@angular/core/testing"

import {
  buildInsightCards,
  buildSampleComparisonPath,
  buildSampleGraphPath,
  buildSampleMarkerPoints,
  buildSamplePlotGuides,
} from "./astrophysics-analytics"
import { AstrophysicsStateService } from "./astrophysics-state.service"

describe("astrophysics-analytics", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AstrophysicsStateService],
    })
  })

  it("builds deterministic plot helpers and orbit insight cards", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const scenario = service.selectedScenario()
    const snapshot = service.currentState()
    const samples = service.sampledStates()

    expect(buildSampleGraphPath(samples)).toContain("M")
    expect(buildSampleComparisonPath(samples)).toContain("L")
    expect(buildSamplePlotGuides(scenario, snapshot, samples).length).toBeGreaterThan(0)
    expect(buildSampleMarkerPoints(samples).length).toBe(1)
    expect(buildInsightCards(scenario, snapshot)[0]?.label).toBe("Snapshot time")
    expect(buildInsightCards(scenario, snapshot)[0]?.value).toContain("s")
  })

  it("includes snapshot-time insight cards for stellar and hubble slices", () => {
    const service = TestBed.inject(AstrophysicsStateService)

    service.selectScenario("stellar-luminosity")
    service.updateScenarioField("timeSeconds", 0.4)
    let cards = buildInsightCards(service.selectedScenario(), service.currentState())
    let guides = buildSamplePlotGuides(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )
    let activeSample = service.sampledStates().find((sample) => sample.active)
    expect(cards[0]?.label).toBe("Snapshot time")
    expect(cards[0]?.value).toBe("0.400 s")
    expect(guides.find((guide) => guide.label === "Active distance")?.value).toBe(
      `${activeSample?.position.toFixed(3)} AU`,
    )

    service.selectScenario("hubble-expansion")
    service.updateScenarioField("timeSeconds", 0.6)
    cards = buildInsightCards(service.selectedScenario(), service.currentState())
    guides = buildSamplePlotGuides(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )
    activeSample = service.sampledStates().find((sample) => sample.active)
    expect(cards[0]?.label).toBe("Snapshot time")
    expect(cards[0]?.value).toBe("0.600 s")
    expect(guides.find((guide) => guide.label === "Active distance")?.value).toBe(
      `${activeSample?.position.toFixed(3)} Mpc`,
    )
    expect(guides.find((guide) => guide.label === "Active recession speed")?.value).toBe(
      `${activeSample?.primaryValue.toFixed(3)} km/s`,
    )
  })
})

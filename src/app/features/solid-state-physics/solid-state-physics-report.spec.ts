import { TestBed } from "@angular/core/testing"

import {
  buildSolidStatePhysicsReportCsv,
  buildSolidStatePhysicsReportSummaryRows,
} from "./solid-state-physics-report"
import { SolidStatePhysicsStateService } from "./solid-state-physics-state.service"

describe("solid-state-physics-report", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SolidStatePhysicsStateService],
    })
  })

  it("builds deeper crystal-elasticity summary rows with scenario limits and yield detail", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    const rows = buildSolidStatePhysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )

    expect(rows).toHaveLength(5)
    expect(rows.map((row) => row.label)).toEqual([
      "Snapshot time",
      "Stress",
      "Elastic energy density",
      "Max strain",
      "Yield strength",
    ])
  })

  it("builds deeper phonon summary rows with transport detail", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    service.selectScenario("phonon-dispersion")

    const rows = buildSolidStatePhysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )

    expect(rows).toHaveLength(5)
    expect(rows.map((row) => row.label)).toContain("Wave vector")
    expect(rows.map((row) => row.label)).toContain("Group velocity")
  })

  it("includes report-stat lines in the solid-state CSV export", () => {
    const service = TestBed.inject(SolidStatePhysicsStateService)
    service.selectScenario("electronic-structure")

    const csv = buildSolidStatePhysicsReportCsv(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(csv).toContain('"summary","occupation_probability","Occupation probability"')
    expect(csv).toContain('"summary","band_gap_ev","Band gap"')
    expect(csv).toContain('"report_stats","sample_count","Sample count"')
    expect(csv).toContain('"report_stats","active_sample_position","Active sample position"')
    expect(csv).toContain('"report_stats","primary_value_range","Primary value range"')
    expect(csv).toContain('"report_stats","secondary_value_range","Secondary value range"')
  })
})

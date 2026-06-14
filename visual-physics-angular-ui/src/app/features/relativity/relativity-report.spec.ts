import { TestBed } from "@angular/core/testing"

import { buildRelativityReportCsv, buildRelativityReportSummaryRows } from "./relativity-report"
import { RelativityStateService } from "./relativity-state.service"

describe("relativity-report", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RelativityStateService],
    })
  })

  it("builds a summary-first csv for the time-dilation slice", () => {
    const service = TestBed.inject(RelativityStateService)
    const csv = buildRelativityReportCsv(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain('"summary","snapshot_time_s"')
    expect(csv).toContain('"summary","lorentz_factor_gamma"')
    expect(csv).toContain('"summary","time_gap_s"')
    expect(csv).toContain("sampleLabel,position,primaryValue,secondaryValue,active")
    expect(csv).toContain("time-dilation-curve")
  })

  it("separates display values from csv values in summary rows", () => {
    const service = TestBed.inject(RelativityStateService)
    const rows = buildRelativityReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )

    expect(rows[0]?.displayValue).toBe("1.000 s")
    expect(rows[0]?.csvValue).toBe("1.000000")
    expect(rows.some((row) => row.metric === "time_gap_s" && row.displayValue === "0.6667 s")).toBe(
      true,
    )
  })
})

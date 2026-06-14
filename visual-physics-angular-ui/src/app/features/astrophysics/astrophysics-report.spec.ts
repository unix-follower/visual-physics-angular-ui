import { TestBed } from "@angular/core/testing"

import {
  buildAstrophysicsReportCsv,
  buildAstrophysicsReportSummaryRows,
} from "./astrophysics-report"
import { AstrophysicsStateService } from "./astrophysics-state.service"

describe("astrophysics-report", () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AstrophysicsStateService],
    })
  })

  it("builds summary-first CSV for planetary orbit", () => {
    const service = TestBed.inject(AstrophysicsStateService)
    const rows = buildAstrophysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )
    const csv = buildAstrophysicsReportCsv(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(rows[0]?.metric).toBe("snapshot_time_s")
    expect(csv).toContain('"summary","orbital_period_days"')
    expect(csv).toContain("planetary-orbit-trajectory")
  })

  it("includes snapshot time in stellar and hubble summary rows", () => {
    const service = TestBed.inject(AstrophysicsStateService)

    service.selectScenario("stellar-luminosity")
    let rows = buildAstrophysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )
    expect(rows[0]?.metric).toBe("snapshot_time_s")
    expect(rows[0]?.displayValue).toContain("s")

    service.selectScenario("hubble-expansion")
    rows = buildAstrophysicsReportSummaryRows(service.selectedScenario(), service.currentState())
    expect(rows[0]?.metric).toBe("snapshot_time_s")
    expect(rows[0]?.csvValue).toContain(".")
  })
})

import {
  buildPlasmaPhysicsReportCsv,
  buildPlasmaPhysicsReportSummaryRows,
} from "./plasma-physics-report"
import { PlasmaPhysicsStateService } from "./plasma-physics-state.service"

describe("plasma-physics-report", () => {
  it("builds summary rows for plasma oscillation", () => {
    const service = new PlasmaPhysicsStateService()
    const rows = buildPlasmaPhysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "snapshot_time_s",
      "plasma_frequency_ghz",
      "restoring_field_kv_m",
    ])
  })

  it("builds csv with summary rows and samples for debye screening", () => {
    const service = new PlasmaPhysicsStateService()
    service.selectScenario("debye-screening")
    const csv = buildPlasmaPhysicsReportCsv(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("debye_length_mm")
    expect(csv).toContain("sampleLabel,position,primaryValue,secondaryValue,active")
    expect(csv).toContain("debye-screening-profile")
  })
})

import {
  buildNuclearAndParticlePhysicsReportCsv,
  buildNuclearAndParticlePhysicsReportSummaryRows,
} from "./nuclear-and-particle-physics-report"
import { NuclearAndParticlePhysicsStateService } from "./nuclear-and-particle-physics-state.service"

describe("nuclear-and-particle-physics-report", () => {
  it("builds summary rows for radioactive decay", () => {
    const service = new NuclearAndParticlePhysicsStateService()
    const rows = buildNuclearAndParticlePhysicsReportSummaryRows(
      service.selectedScenario(),
      service.currentState(),
    )

    expect(rows.map((row) => row.metric)).toEqual([
      "snapshot_time_s",
      "remaining_fraction",
      "activity_tbq",
    ])
  })

  it("builds csv with summary rows and samples for collision", () => {
    const service = new NuclearAndParticlePhysicsStateService()
    service.selectScenario("proton-proton-collision")
    const csv = buildNuclearAndParticlePhysicsReportCsv(
      service.selectedScenario(),
      service.currentState(),
      service.sampledStates(),
    )

    expect(csv).toContain("category,metric,label,value,detail")
    expect(csv).toContain("invariant_mass_gev")
    expect(csv).toContain("sampleLabel,position,primaryValue,secondaryValue,active")
    expect(csv).toContain("proton-proton-collision-profile")
  })
})

import { buildViewportGeometry } from "./computational-physics-webgpu-renderer"
import { ComputationalPhysicsStateService } from "./computational-physics-state.service"

describe("ComputationalPhysicsWebGpuRenderer", () => {
  it("builds normalized trajectories and error bars for the active comparison snapshot", () => {
    const service = new ComputationalPhysicsStateService()
    service.updateTimeSeconds(1.2)

    const geometry = buildViewportGeometry(
      service.currentState(),
      service.selectedScenario(),
      {
        showReferenceTrajectory: true,
        showEulerTrajectory: true,
        showSymplecticTrajectory: true,
        showRk4Trajectory: false,
        showErrorBars: true,
      },
      service.sampledStates(),
    )

    expect(geometry.referenceTrajectory.length).toBeGreaterThan(10)
    expect(geometry.eulerTrajectory.length).toBeGreaterThan(10)
    expect(geometry.symplecticTrajectory.length).toBeGreaterThan(10)
    expect(geometry.rk4Trajectory).toHaveLength(0)
    expect(geometry.errorBars).toHaveLength(6)
    expect(geometry.markerPoints).toHaveLength(4)
    expect(geometry.referenceTrajectory[0].x).toBeGreaterThanOrEqual(0)
    expect(geometry.referenceTrajectory[0].x).toBeLessThanOrEqual(1)
  })
})

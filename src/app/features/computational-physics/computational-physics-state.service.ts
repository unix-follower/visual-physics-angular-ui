import { computed, Injectable, signal } from "@angular/core"

import {
  ComputationalPhysicsScenario,
  ComputationalPhysicsScenarioId,
  OrbitalInvariantHistorySample,
  SpringInvariantHistorySample,
  SolverConvergenceSample,
  SolverComparisonSample,
  SolverComparisonState,
  SolverMethodId,
  SolverMetrics,
  Vector2,
} from "./computational-physics.models"

const DEFAULT_SAMPLE_COUNT = 48
const CONVERGENCE_DIVISORS = [1, 2, 4, 8] as const

export type EditableComputationalField =
  | "mass"
  | "initialPosition.x"
  | "initialPosition.y"
  | "initialVelocity.x"
  | "initialVelocity.y"
  | "gravity.x"
  | "gravity.y"
  | "dragCoefficient"
  | "orbitalCenter.x"
  | "orbitalCenter.y"
  | "gravitationalParameter"
  | "springAnchor.x"
  | "springAnchor.y"
  | "springConstant"
  | "dampingCoefficient"
  | "comparisonStepSeconds"

const SCENARIOS: readonly ComputationalPhysicsScenario[] = [
  {
    id: "projectile-solver-comparison",
    name: "Projectile Solver Comparison",
    summary:
      "Compare Euler and RK4 integration against a high-resolution reference trajectory for projectile motion with linear drag.",
    equationSummary: 'x\" = g - (c / m) v',
    status: "Phase 9 initial slice",
    durationSeconds: 4,
    viewBounds: { minX: -1, maxX: 26, minY: -4, maxY: 14 },
    focusArea:
      "Integration accuracy, timestep sensitivity, cumulative path drift, and solver trade-offs",
    mass: 1,
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 8.5, y: 11 },
    gravity: { x: 0, y: -9.81 },
    dragCoefficient: 0.45,
    comparisonStepSeconds: 0.2,
    referenceStepSeconds: 1 / 480,
  },
  {
    id: "orbital-solver-comparison",
    name: "Orbital Solver Comparison",
    summary:
      "Compare Euler and RK4 integration against a high-resolution orbital reference trajectory under inverse-square gravity.",
    equationSummary: 'x" = -\u03bc r / |r|^3',
    status: "Phase 9 second slice",
    durationSeconds: 16,
    viewBounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
    focusArea:
      "Long-horizon drift, orbital stability, and integrator error accumulation over repeated motion",
    mass: 1,
    initialPosition: { x: 5, y: 0 },
    initialVelocity: { x: 0, y: 2 },
    orbitalCenter: { x: 0, y: 0 },
    gravitationalParameter: 20,
    comparisonStepSeconds: 0.2,
    referenceStepSeconds: 1 / 480,
  },
  {
    id: "spring-oscillator-comparison",
    name: "Spring Oscillator Comparison",
    summary:
      "Compare Euler, symplectic, and RK4 integration against a high-resolution reference trajectory for a 2D spring-mass oscillator with light damping.",
    equationSummary: 'x" = -(k / m) (x - x0) - (c / m) v',
    status: "Phase 9 oscillator slice",
    durationSeconds: 12,
    viewBounds: { minX: -3.5, maxX: 3.5, minY: -3.5, maxY: 3.5 },
    focusArea: "Phase drift, numerical damping, and long-horizon stability for oscillatory motion",
    mass: 1,
    initialPosition: { x: 2.4, y: 0 },
    initialVelocity: { x: 0, y: 2.6 },
    springAnchor: { x: 0, y: 0 },
    springConstant: 4.2,
    dampingCoefficient: 0.08,
    comparisonStepSeconds: 0.2,
    referenceStepSeconds: 1 / 480,
  },
]

interface IntegratorState {
  position: Vector2
  velocity: Vector2
}

@Injectable({ providedIn: "root" })
export class ComputationalPhysicsStateService {
  readonly scenarios = SCENARIOS
  readonly selectedScenarioId = signal<ComputationalPhysicsScenarioId>(SCENARIOS[0].id)
  readonly selectedSolverMethod = signal<SolverMethodId>("rk4")
  readonly currentTimeSeconds = signal(0)
  private readonly scenarioOverrides = signal<Partial<ComputationalPhysicsScenario>>({})

  readonly selectedScenario = computed(() => {
    const baseScenario =
      this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios[0]
    return mergeScenario(baseScenario, this.scenarioOverrides())
  })

  readonly currentState = computed(() =>
    sampleScenarioComparison(this.selectedScenario(), this.currentTimeSeconds()),
  )

  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), DEFAULT_SAMPLE_COUNT),
  )

  readonly convergenceStudy = computed(() => buildConvergenceStudy(this.selectedScenario()))

  readonly orbitalInvariantHistory = computed(() =>
    buildOrbitalInvariantHistory(this.selectedScenario(), DEFAULT_SAMPLE_COUNT),
  )

  readonly springInvariantHistory = computed(() =>
    buildSpringInvariantHistory(this.selectedScenario(), DEFAULT_SAMPLE_COUNT),
  )

  readonly solverMetrics = computed<Record<SolverMethodId, SolverMetrics>>(() =>
    buildSolverMetrics(this.sampledStates(), this.currentState()),
  )

  listScenarios(): readonly ComputationalPhysicsScenario[] {
    return this.scenarios
  }

  selectScenario(id: ComputationalPhysicsScenarioId): void {
    this.selectedScenarioId.set(id)
    this.scenarioOverrides.set({})
    this.currentTimeSeconds.set(0)
    this.selectedSolverMethod.set("rk4")
  }

  selectSolverMethod(method: SolverMethodId): void {
    this.selectedSolverMethod.set(method)
  }

  updateScenarioField(field: EditableComputationalField, value: number): void {
    const baseScenario = this.selectedScenario()

    this.scenarioOverrides.update((overrides) => {
      const nextOverrides = cloneScenarioOverrides(overrides, baseScenario)

      switch (field) {
        case "mass":
          nextOverrides.mass = Math.max(value, 0.1)
          break
        case "initialPosition.x":
          nextOverrides.initialPosition ??= { ...baseScenario.initialPosition }
          nextOverrides.initialPosition.x = value
          break
        case "initialPosition.y":
          nextOverrides.initialPosition ??= { ...baseScenario.initialPosition }
          nextOverrides.initialPosition.y = value
          break
        case "initialVelocity.x":
          nextOverrides.initialVelocity ??= { ...baseScenario.initialVelocity }
          nextOverrides.initialVelocity.x = value
          break
        case "initialVelocity.y":
          nextOverrides.initialVelocity ??= { ...baseScenario.initialVelocity }
          nextOverrides.initialVelocity.y = value
          break
        case "gravity.x":
          nextOverrides.gravity ??= scenarioGravity(baseScenario)
          nextOverrides.gravity.x = value
          break
        case "gravity.y":
          nextOverrides.gravity ??= scenarioGravity(baseScenario)
          nextOverrides.gravity.y = value
          break
        case "dragCoefficient":
          nextOverrides.dragCoefficient = Math.max(value, 0)
          break
        case "orbitalCenter.x":
          nextOverrides.orbitalCenter ??= scenarioOrbitalCenter(baseScenario)
          nextOverrides.orbitalCenter.x = value
          break
        case "orbitalCenter.y":
          nextOverrides.orbitalCenter ??= scenarioOrbitalCenter(baseScenario)
          nextOverrides.orbitalCenter.y = value
          break
        case "gravitationalParameter":
          nextOverrides.gravitationalParameter = Math.max(value, 0.1)
          break
        case "springAnchor.x":
          nextOverrides.springAnchor ??= scenarioSpringAnchor(baseScenario)
          nextOverrides.springAnchor.x = value
          break
        case "springAnchor.y":
          nextOverrides.springAnchor ??= scenarioSpringAnchor(baseScenario)
          nextOverrides.springAnchor.y = value
          break
        case "springConstant":
          nextOverrides.springConstant = Math.max(value, 0.1)
          break
        case "dampingCoefficient":
          nextOverrides.dampingCoefficient = Math.max(value, 0)
          break
        case "comparisonStepSeconds":
          nextOverrides.comparisonStepSeconds = clamp(value, 0.02, 0.5)
          break
      }

      return nextOverrides
    })

    this.currentTimeSeconds.set(0)
  }

  updateTimeSeconds(seconds: number): void {
    this.currentTimeSeconds.set(clamp(seconds, 0, this.selectedScenario().durationSeconds))
  }

  resetScenarioParameters(): void {
    this.scenarioOverrides.set({})
    this.currentTimeSeconds.set(0)
    this.selectedSolverMethod.set("rk4")
  }

  importScenarioState(
    scenario: ComputationalPhysicsScenario,
    timeSeconds: number,
    solverMethod: SolverMethodId = "rk4",
  ): void {
    const baseScenario =
      this.scenarios.find((candidate) => candidate.id === scenario.id) ?? undefined

    if (baseScenario === undefined) {
      throw new Error(`Unknown scenario id: ${scenario.id}`)
    }

    this.selectedScenarioId.set(baseScenario.id)
    this.scenarioOverrides.set(cloneImportedScenario(scenario))
    this.currentTimeSeconds.set(clamp(timeSeconds, 0, scenario.durationSeconds))
    this.selectedSolverMethod.set(solverMethod)
  }
}

export function buildSamples(
  scenario: ComputationalPhysicsScenario,
  count: number,
): SolverComparisonSample[] {
  const safeCount = Math.max(count, 2)
  const samples: SolverComparisonSample[] = []

  for (let index = 0; index < safeCount; index += 1) {
    const timeSeconds = (index / (safeCount - 1)) * scenario.durationSeconds
    const snapshot = sampleScenarioComparison(scenario, timeSeconds)
    samples.push({
      timeSeconds,
      referencePosition: snapshot.referencePosition,
      eulerPosition: snapshot.eulerPosition,
      symplecticPosition: snapshot.symplecticPosition,
      rk4Position: snapshot.rk4Position,
      eulerPositionError: snapshot.eulerPositionError,
      symplecticPositionError: snapshot.symplecticPositionError,
      rk4PositionError: snapshot.rk4PositionError,
    })
  }

  return samples
}

export function sampleScenarioComparison(
  scenario: ComputationalPhysicsScenario,
  timeSeconds: number,
): SolverComparisonState {
  const clampedTime = clamp(timeSeconds, 0, scenario.durationSeconds)
  const referenceState = integrateScenario(
    scenario,
    clampedTime,
    scenario.referenceStepSeconds,
    integrateWithRk4,
  )
  const eulerState = integrateScenario(
    scenario,
    clampedTime,
    scenario.comparisonStepSeconds,
    integrateWithEuler,
  )
  const symplecticState = integrateScenario(
    scenario,
    clampedTime,
    scenario.comparisonStepSeconds,
    integrateWithSymplectic,
  )
  const rk4State = integrateScenario(
    scenario,
    clampedTime,
    scenario.comparisonStepSeconds,
    integrateWithRk4,
  )

  return {
    timeSeconds: clampedTime,
    referencePosition: referenceState.position,
    referenceVelocity: referenceState.velocity,
    eulerPosition: eulerState.position,
    eulerVelocity: eulerState.velocity,
    symplecticPosition: symplecticState.position,
    symplecticVelocity: symplecticState.velocity,
    rk4Position: rk4State.position,
    rk4Velocity: rk4State.velocity,
    referenceSpeed: magnitude(referenceState.velocity),
    eulerSpeed: magnitude(eulerState.velocity),
    symplecticSpeed: magnitude(symplecticState.velocity),
    rk4Speed: magnitude(rk4State.velocity),
    eulerPositionError: distance(referenceState.position, eulerState.position),
    symplecticPositionError: distance(referenceState.position, symplecticState.position),
    rk4PositionError: distance(referenceState.position, rk4State.position),
    eulerSpeedError: Math.abs(magnitude(referenceState.velocity) - magnitude(eulerState.velocity)),
    symplecticSpeedError: Math.abs(
      magnitude(referenceState.velocity) - magnitude(symplecticState.velocity),
    ),
    rk4SpeedError: Math.abs(magnitude(referenceState.velocity) - magnitude(rk4State.velocity)),
    orbitalDiagnostics: buildOrbitalDiagnostics(
      scenario,
      referenceState,
      eulerState,
      symplecticState,
      rk4State,
    ),
    springDiagnostics: buildSpringDiagnostics(
      scenario,
      referenceState,
      eulerState,
      symplecticState,
      rk4State,
    ),
  }
}

export function buildConvergenceStudy(
  scenario: ComputationalPhysicsScenario,
): SolverConvergenceSample[] {
  const rows: SolverConvergenceSample[] = []
  const seenSteps = new Set<number>()

  for (const divisor of CONVERGENCE_DIVISORS) {
    const stepSeconds = clamp(scenario.comparisonStepSeconds / divisor, 0.02, 0.5)
    const key = Number(stepSeconds.toFixed(6))
    if (seenSteps.has(key)) {
      continue
    }
    seenSteps.add(key)

    const refinedScenario = {
      ...scenario,
      comparisonStepSeconds: stepSeconds,
    }
    const snapshot = sampleScenarioComparison(refinedScenario, refinedScenario.durationSeconds)
    rows.push({
      stepSeconds,
      eulerFinalPositionError: snapshot.eulerPositionError,
      symplecticFinalPositionError: snapshot.symplecticPositionError,
      rk4FinalPositionError: snapshot.rk4PositionError,
      eulerFinalSpecificEnergyError: snapshot.orbitalDiagnostics?.eulerSpecificEnergyError,
      symplecticFinalSpecificEnergyError:
        snapshot.orbitalDiagnostics?.symplecticSpecificEnergyError,
      rk4FinalSpecificEnergyError: snapshot.orbitalDiagnostics?.rk4SpecificEnergyError,
      eulerFinalAngularMomentumError: snapshot.orbitalDiagnostics?.eulerAngularMomentumError,
      symplecticFinalAngularMomentumError:
        snapshot.orbitalDiagnostics?.symplecticAngularMomentumError,
      rk4FinalAngularMomentumError: snapshot.orbitalDiagnostics?.rk4AngularMomentumError,
      eulerFinalSpringEnergyError: snapshot.springDiagnostics?.eulerTotalEnergyError,
      symplecticFinalSpringEnergyError: snapshot.springDiagnostics?.symplecticTotalEnergyError,
      rk4FinalSpringEnergyError: snapshot.springDiagnostics?.rk4TotalEnergyError,
      eulerFinalSpringPhaseError: snapshot.springDiagnostics?.eulerPhaseAngleError,
      symplecticFinalSpringPhaseError: snapshot.springDiagnostics?.symplecticPhaseAngleError,
      rk4FinalSpringPhaseError: snapshot.springDiagnostics?.rk4PhaseAngleError,
    })
  }

  return rows
}

export function buildOrbitalInvariantHistory(
  scenario: ComputationalPhysicsScenario,
  count: number,
): OrbitalInvariantHistorySample[] {
  if (scenario.id !== "orbital-solver-comparison") {
    return []
  }

  const safeCount = Math.max(count, 2)
  const history: OrbitalInvariantHistorySample[] = []

  for (let index = 0; index < safeCount; index += 1) {
    const timeSeconds = (index / (safeCount - 1)) * scenario.durationSeconds
    const snapshot = sampleScenarioComparison(scenario, timeSeconds)
    const diagnostics = snapshot.orbitalDiagnostics
    if (!diagnostics) {
      continue
    }

    history.push({
      timeSeconds,
      eulerSpecificEnergyError: diagnostics.eulerSpecificEnergyError,
      symplecticSpecificEnergyError: diagnostics.symplecticSpecificEnergyError,
      rk4SpecificEnergyError: diagnostics.rk4SpecificEnergyError,
      eulerAngularMomentumError: diagnostics.eulerAngularMomentumError,
      symplecticAngularMomentumError: diagnostics.symplecticAngularMomentumError,
      rk4AngularMomentumError: diagnostics.rk4AngularMomentumError,
    })
  }

  return history
}

export function buildSpringInvariantHistory(
  scenario: ComputationalPhysicsScenario,
  count: number,
): SpringInvariantHistorySample[] {
  if (scenario.id !== "spring-oscillator-comparison") {
    return []
  }

  const safeCount = Math.max(count, 2)
  const history: SpringInvariantHistorySample[] = []

  for (let index = 0; index < safeCount; index += 1) {
    const timeSeconds = (index / (safeCount - 1)) * scenario.durationSeconds
    const snapshot = sampleScenarioComparison(scenario, timeSeconds)
    const diagnostics = snapshot.springDiagnostics
    if (!diagnostics) {
      continue
    }

    history.push({
      timeSeconds,
      eulerTotalEnergyError: diagnostics.eulerTotalEnergyError,
      symplecticTotalEnergyError: diagnostics.symplecticTotalEnergyError,
      rk4TotalEnergyError: diagnostics.rk4TotalEnergyError,
      eulerDisplacementMagnitudeError: diagnostics.eulerDisplacementMagnitudeError,
      symplecticDisplacementMagnitudeError: diagnostics.symplecticDisplacementMagnitudeError,
      rk4DisplacementMagnitudeError: diagnostics.rk4DisplacementMagnitudeError,
      eulerPhaseAngleError: diagnostics.eulerPhaseAngleError,
      symplecticPhaseAngleError: diagnostics.symplecticPhaseAngleError,
      rk4PhaseAngleError: diagnostics.rk4PhaseAngleError,
    })
  }

  return history
}

function buildSolverMetrics(
  samples: readonly SolverComparisonSample[],
  currentState: SolverComparisonState,
): Record<SolverMethodId, SolverMetrics> {
  const eulerMaxPathDeviation = Math.max(...samples.map((sample) => sample.eulerPositionError))
  const symplecticMaxPathDeviation = Math.max(
    ...samples.map((sample) => sample.symplecticPositionError),
  )
  const rk4MaxPathDeviation = Math.max(...samples.map((sample) => sample.rk4PositionError))

  return {
    euler: {
      solverMethod: "euler",
      finalPositionError: currentState.eulerPositionError,
      finalSpeedError: currentState.eulerSpeedError,
      maxPathDeviation: eulerMaxPathDeviation,
    },
    symplectic: {
      solverMethod: "symplectic",
      finalPositionError: currentState.symplecticPositionError,
      finalSpeedError: currentState.symplecticSpeedError,
      maxPathDeviation: symplecticMaxPathDeviation,
    },
    rk4: {
      solverMethod: "rk4",
      finalPositionError: currentState.rk4PositionError,
      finalSpeedError: currentState.rk4SpeedError,
      maxPathDeviation: rk4MaxPathDeviation,
    },
  }
}

function integrateScenario(
  scenario: ComputationalPhysicsScenario,
  timeSeconds: number,
  stepSeconds: number,
  integrator: (
    scenario: ComputationalPhysicsScenario,
    state: IntegratorState,
    deltaSeconds: number,
  ) => IntegratorState,
): IntegratorState {
  let elapsed = 0
  let state: IntegratorState = {
    position: { ...scenario.initialPosition },
    velocity: { ...scenario.initialVelocity },
  }

  while (elapsed < timeSeconds - 1e-9) {
    const deltaSeconds = Math.min(stepSeconds, timeSeconds - elapsed)
    state = integrator(scenario, state, deltaSeconds)
    elapsed += deltaSeconds
  }

  return state
}

function integrateWithEuler(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
  deltaSeconds: number,
): IntegratorState {
  const acceleration = computeAcceleration(scenario, state.position, state.velocity)
  return {
    position: add(state.position, scale(state.velocity, deltaSeconds)),
    velocity: add(state.velocity, scale(acceleration, deltaSeconds)),
  }
}

function integrateWithSymplectic(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
  deltaSeconds: number,
): IntegratorState {
  const acceleration = computeAcceleration(scenario, state.position, state.velocity)
  const velocity = add(state.velocity, scale(acceleration, deltaSeconds))
  return {
    position: add(state.position, scale(velocity, deltaSeconds)),
    velocity,
  }
}

function integrateWithRk4(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
  deltaSeconds: number,
): IntegratorState {
  const derivative = (input: IntegratorState) => ({
    position: input.velocity,
    velocity: computeAcceleration(scenario, input.position, input.velocity),
  })

  const k1 = derivative(state)
  const k2 = derivative({
    position: add(state.position, scale(k1.position, deltaSeconds / 2)),
    velocity: add(state.velocity, scale(k1.velocity, deltaSeconds / 2)),
  })
  const k3 = derivative({
    position: add(state.position, scale(k2.position, deltaSeconds / 2)),
    velocity: add(state.velocity, scale(k2.velocity, deltaSeconds / 2)),
  })
  const k4 = derivative({
    position: add(state.position, scale(k3.position, deltaSeconds)),
    velocity: add(state.velocity, scale(k3.velocity, deltaSeconds)),
  })

  return {
    position: add(
      state.position,
      scale(
        addMany([k1.position, scale(k2.position, 2), scale(k3.position, 2), k4.position]),
        deltaSeconds / 6,
      ),
    ),
    velocity: add(
      state.velocity,
      scale(
        addMany([k1.velocity, scale(k2.velocity, 2), scale(k3.velocity, 2), k4.velocity]),
        deltaSeconds / 6,
      ),
    ),
  }
}

function computeAcceleration(
  scenario: ComputationalPhysicsScenario,
  position: Vector2,
  velocity: Vector2,
): Vector2 {
  if (scenario.id === "orbital-solver-comparison") {
    const center = scenarioOrbitalCenter(scenario)
    const offset = subtract(position, center)
    const distanceSquared = Math.max(squaredMagnitude(offset), 0.25)
    const distance = Math.sqrt(distanceSquared)
    const scaleFactor = -((scenario.gravitationalParameter ?? 0) / (distanceSquared * distance))
    return scale(offset, scaleFactor)
  }

  if (scenario.id === "spring-oscillator-comparison") {
    const anchor = scenarioSpringAnchor(scenario)
    const displacement = subtract(position, anchor)
    const springScale = -((scenario.springConstant ?? 0) / scenario.mass)
    const dampingScale = -((scenario.dampingCoefficient ?? 0) / scenario.mass)
    return add(scale(displacement, springScale), scale(velocity, dampingScale))
  }

  return {
    x: (scenario.gravity?.x ?? 0) - ((scenario.dragCoefficient ?? 0) / scenario.mass) * velocity.x,
    y: (scenario.gravity?.y ?? 0) - ((scenario.dragCoefficient ?? 0) / scenario.mass) * velocity.y,
  }
}

function buildOrbitalDiagnostics(
  scenario: ComputationalPhysicsScenario,
  referenceState: IntegratorState,
  eulerState: IntegratorState,
  symplecticState: IntegratorState,
  rk4State: IntegratorState,
) {
  if (scenario.id !== "orbital-solver-comparison") {
    return undefined
  }

  const referenceSpecificEnergy = computeOrbitalSpecificEnergy(scenario, referenceState)
  const eulerSpecificEnergy = computeOrbitalSpecificEnergy(scenario, eulerState)
  const symplecticSpecificEnergy = computeOrbitalSpecificEnergy(scenario, symplecticState)
  const rk4SpecificEnergy = computeOrbitalSpecificEnergy(scenario, rk4State)
  const referenceAngularMomentum = computeAngularMomentumMagnitude(scenario, referenceState)
  const eulerAngularMomentum = computeAngularMomentumMagnitude(scenario, eulerState)
  const symplecticAngularMomentum = computeAngularMomentumMagnitude(scenario, symplecticState)
  const rk4AngularMomentum = computeAngularMomentumMagnitude(scenario, rk4State)

  return {
    referenceSpecificEnergy,
    eulerSpecificEnergy,
    symplecticSpecificEnergy,
    rk4SpecificEnergy,
    eulerSpecificEnergyError: Math.abs(eulerSpecificEnergy - referenceSpecificEnergy),
    symplecticSpecificEnergyError: Math.abs(symplecticSpecificEnergy - referenceSpecificEnergy),
    rk4SpecificEnergyError: Math.abs(rk4SpecificEnergy - referenceSpecificEnergy),
    referenceAngularMomentum,
    eulerAngularMomentum,
    symplecticAngularMomentum,
    rk4AngularMomentum,
    eulerAngularMomentumError: Math.abs(eulerAngularMomentum - referenceAngularMomentum),
    symplecticAngularMomentumError: Math.abs(symplecticAngularMomentum - referenceAngularMomentum),
    rk4AngularMomentumError: Math.abs(rk4AngularMomentum - referenceAngularMomentum),
  }
}

function buildSpringDiagnostics(
  scenario: ComputationalPhysicsScenario,
  referenceState: IntegratorState,
  eulerState: IntegratorState,
  symplecticState: IntegratorState,
  rk4State: IntegratorState,
) {
  if (scenario.id !== "spring-oscillator-comparison") {
    return undefined
  }

  const referenceTotalEnergy = computeSpringTotalEnergy(scenario, referenceState)
  const eulerTotalEnergy = computeSpringTotalEnergy(scenario, eulerState)
  const symplecticTotalEnergy = computeSpringTotalEnergy(scenario, symplecticState)
  const rk4TotalEnergy = computeSpringTotalEnergy(scenario, rk4State)
  const referenceDisplacementMagnitude = computeSpringDisplacementMagnitude(
    scenario,
    referenceState,
  )
  const eulerDisplacementMagnitude = computeSpringDisplacementMagnitude(scenario, eulerState)
  const symplecticDisplacementMagnitude = computeSpringDisplacementMagnitude(
    scenario,
    symplecticState,
  )
  const rk4DisplacementMagnitude = computeSpringDisplacementMagnitude(scenario, rk4State)
  const referencePhaseAngle = computeSpringPhaseAngle(scenario, referenceState)
  const eulerPhaseAngle = computeSpringPhaseAngle(scenario, eulerState)
  const symplecticPhaseAngle = computeSpringPhaseAngle(scenario, symplecticState)
  const rk4PhaseAngle = computeSpringPhaseAngle(scenario, rk4State)

  return {
    referenceTotalEnergy,
    eulerTotalEnergy,
    symplecticTotalEnergy,
    rk4TotalEnergy,
    eulerTotalEnergyError: Math.abs(eulerTotalEnergy - referenceTotalEnergy),
    symplecticTotalEnergyError: Math.abs(symplecticTotalEnergy - referenceTotalEnergy),
    rk4TotalEnergyError: Math.abs(rk4TotalEnergy - referenceTotalEnergy),
    referenceDisplacementMagnitude,
    eulerDisplacementMagnitude,
    symplecticDisplacementMagnitude,
    rk4DisplacementMagnitude,
    eulerDisplacementMagnitudeError: Math.abs(
      eulerDisplacementMagnitude - referenceDisplacementMagnitude,
    ),
    symplecticDisplacementMagnitudeError: Math.abs(
      symplecticDisplacementMagnitude - referenceDisplacementMagnitude,
    ),
    rk4DisplacementMagnitudeError: Math.abs(
      rk4DisplacementMagnitude - referenceDisplacementMagnitude,
    ),
    referencePhaseAngle,
    eulerPhaseAngle,
    symplecticPhaseAngle,
    rk4PhaseAngle,
    eulerPhaseAngleError: computeWrappedAngleDifference(eulerPhaseAngle, referencePhaseAngle),
    symplecticPhaseAngleError: computeWrappedAngleDifference(
      symplecticPhaseAngle,
      referencePhaseAngle,
    ),
    rk4PhaseAngleError: computeWrappedAngleDifference(rk4PhaseAngle, referencePhaseAngle),
  }
}

function computeOrbitalSpecificEnergy(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
): number {
  const center = scenarioOrbitalCenter(scenario)
  const radius = Math.max(distance(state.position, center), 1e-6)
  const speedSquared = squaredMagnitude(state.velocity)
  return 0.5 * speedSquared - (scenario.gravitationalParameter ?? 0) / radius
}

function computeAngularMomentumMagnitude(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
): number {
  const center = scenarioOrbitalCenter(scenario)
  const offset = subtract(state.position, center)
  return Math.abs(offset.x * state.velocity.y - offset.y * state.velocity.x)
}

function computeSpringTotalEnergy(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
): number {
  const displacement = computeSpringDisplacementMagnitude(scenario, state)
  const speedSquared = squaredMagnitude(state.velocity)
  return (
    0.5 * scenario.mass * speedSquared +
    0.5 * (scenario.springConstant ?? 0) * displacement * displacement
  )
}

function computeSpringDisplacementMagnitude(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
): number {
  const anchor = scenarioSpringAnchor(scenario)
  return distance(state.position, anchor)
}

function computeSpringPhaseAngle(
  scenario: ComputationalPhysicsScenario,
  state: IntegratorState,
): number {
  const anchor = scenarioSpringAnchor(scenario)
  const displacement = subtract(state.position, anchor)
  return Math.atan2(displacement.y, displacement.x)
}

function computeWrappedAngleDifference(left: number, right: number): number {
  const rawDifference = left - right
  const wrapped = Math.atan2(Math.sin(rawDifference), Math.cos(rawDifference))
  return Math.abs(wrapped)
}

function mergeScenario(
  baseScenario: ComputationalPhysicsScenario,
  overrides: Partial<ComputationalPhysicsScenario>,
): ComputationalPhysicsScenario {
  return {
    ...baseScenario,
    ...overrides,
    initialPosition: overrides.initialPosition ?? baseScenario.initialPosition,
    initialVelocity: overrides.initialVelocity ?? baseScenario.initialVelocity,
    gravity: overrides.gravity ?? baseScenario.gravity,
    orbitalCenter: overrides.orbitalCenter ?? baseScenario.orbitalCenter,
    springAnchor: overrides.springAnchor ?? baseScenario.springAnchor,
  }
}

function cloneScenarioOverrides(
  overrides: Partial<ComputationalPhysicsScenario>,
  baseScenario: ComputationalPhysicsScenario,
): Partial<ComputationalPhysicsScenario> {
  return {
    ...overrides,
    initialPosition: overrides.initialPosition ?? { ...baseScenario.initialPosition },
    initialVelocity: overrides.initialVelocity ?? { ...baseScenario.initialVelocity },
    gravity: baseScenario.gravity
      ? (overrides.gravity ?? { ...baseScenario.gravity })
      : overrides.gravity,
    orbitalCenter: baseScenario.orbitalCenter
      ? (overrides.orbitalCenter ?? { ...baseScenario.orbitalCenter })
      : overrides.orbitalCenter,
    springAnchor: baseScenario.springAnchor
      ? (overrides.springAnchor ?? { ...baseScenario.springAnchor })
      : overrides.springAnchor,
  }
}

function cloneImportedScenario(
  scenario: ComputationalPhysicsScenario,
): Partial<ComputationalPhysicsScenario> {
  return {
    ...scenario,
    initialPosition: { ...scenario.initialPosition },
    initialVelocity: { ...scenario.initialVelocity },
    gravity: scenario.gravity ? { ...scenario.gravity } : undefined,
    orbitalCenter: scenario.orbitalCenter ? { ...scenario.orbitalCenter } : undefined,
    springAnchor: scenario.springAnchor ? { ...scenario.springAnchor } : undefined,
  }
}

function scenarioOrbitalCenter(scenario: ComputationalPhysicsScenario): Vector2 {
  return scenario.orbitalCenter ? { ...scenario.orbitalCenter } : { x: 0, y: 0 }
}

function scenarioGravity(scenario: ComputationalPhysicsScenario): Vector2 {
  return scenario.gravity ? { ...scenario.gravity } : { x: 0, y: -9.81 }
}

function scenarioSpringAnchor(scenario: ComputationalPhysicsScenario): Vector2 {
  return scenario.springAnchor ? { ...scenario.springAnchor } : { x: 0, y: 0 }
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x - right.x, y: left.y - right.y }
}

function squaredMagnitude(value: Vector2): number {
  return value.x * value.x + value.y * value.y
}

function add(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x + right.x, y: left.y + right.y }
}

function addMany(values: readonly Vector2[]): Vector2 {
  return values.reduce((sum, value) => add(sum, value), { x: 0, y: 0 })
}

function scale(value: Vector2, factor: number): Vector2 {
  return { x: value.x * factor, y: value.y * factor }
}

function magnitude(value: Vector2): number {
  return Math.hypot(value.x, value.y)
}

function distance(left: Vector2, right: Vector2): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

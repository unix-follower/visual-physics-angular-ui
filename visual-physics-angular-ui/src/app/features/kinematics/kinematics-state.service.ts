import { computed, Injectable, signal } from "@angular/core"

import {
  KinematicsSample,
  KinematicsScenario,
  KinematicsScenarioId,
  KinematicsStateSnapshot,
  Vector2,
} from "./kinematics.models"

const DEFAULT_SAMPLE_COUNT = 48

type EditableScenarioField =
  | "initialPosition.x"
  | "initialPosition.y"
  | "initialVelocity.x"
  | "initialVelocity.y"
  | "acceleration.x"
  | "acceleration.y"
  | "observerVelocity.x"
  | "observerVelocity.y"
  | "radius"
  | "angularSpeed"

const SCENARIOS: readonly KinematicsScenario[] = [
  {
    id: "constant-velocity",
    name: "Constant Velocity",
    summary: "Linear motion with fixed velocity and zero acceleration.",
    equationSummary: "x(t) = x0 + v t, a(t) = 0",
    durationSeconds: 10,
    viewBounds: { minX: -2, maxX: 28, minY: -4, maxY: 12 },
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 2.4, y: 0.9 },
    acceleration: { x: 0, y: 0 },
  },
  {
    id: "constant-acceleration",
    name: "Constant Acceleration",
    summary: "Planar motion with a uniform acceleration vector.",
    equationSummary: "x(t) = x0 + v0 t + 1/2 a t^2",
    durationSeconds: 8,
    viewBounds: { minX: -2, maxX: 28, minY: -4, maxY: 28 },
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 1.5, y: 1.2 },
    acceleration: { x: 0.45, y: 0.8 },
  },
  {
    id: "projectile",
    name: "Projectile Motion",
    summary: "Launch motion with gravity acting along the vertical axis.",
    equationSummary: "x(t) = x0 + v0 t + 1/2 g t^2",
    durationSeconds: 2.8,
    viewBounds: { minX: -2, maxX: 22, minY: -2, maxY: 10 },
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 7.2, y: 10.8 },
    acceleration: { x: 0, y: -9.81 },
  },
  {
    id: "relative-motion",
    name: "Relative Motion",
    summary: "Object velocity observed from a moving frame.",
    equationSummary: "v_rel = v_object - v_observer",
    durationSeconds: 9,
    viewBounds: { minX: -2, maxX: 32, minY: -6, maxY: 12 },
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 4.6, y: 1.4 },
    acceleration: { x: 0, y: 0 },
    observerVelocity: { x: 1.8, y: 0.4 },
  },
  {
    id: "uniform-circular-motion",
    name: "Uniform Circular Motion",
    summary: "Constant-speed rotation with centripetal acceleration.",
    equationSummary: "r(t) = c + R(cos wt, sin wt)",
    durationSeconds: 10,
    viewBounds: { minX: -7, maxX: 7, minY: -7, maxY: 7 },
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 0, y: 0 },
    acceleration: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    radius: 4,
    angularSpeed: 0.9,
  },
]

@Injectable({ providedIn: "root" })
export class KinematicsStateService {
  readonly scenarios = SCENARIOS
  readonly selectedScenarioId = signal<KinematicsScenarioId>(SCENARIOS[0].id)
  readonly timeSeconds = signal(0)
  readonly isPlaying = signal(false)
  private readonly scenarioOverrides = signal<Partial<KinematicsScenario>>({})

  readonly selectedScenario = computed(() => {
    const baseScenario =
      this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios[0]
    const overrides = this.scenarioOverrides()

    return mergeScenario(baseScenario, overrides)
  })

  readonly currentState = computed(() =>
    sampleScenario(this.selectedScenario(), this.timeSeconds()),
  )

  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), DEFAULT_SAMPLE_COUNT),
  )

  selectScenario(id: KinematicsScenarioId): void {
    this.selectedScenarioId.set(id)
    this.scenarioOverrides.set({})
    this.timeSeconds.set(0)
    this.isPlaying.set(false)
  }

  updateScenarioField(field: EditableScenarioField, value: number): void {
    const baseScenario = this.selectedScenario()

    this.scenarioOverrides.update((overrides) => {
      const nextOverrides = cloneScenarioOverrides(overrides, baseScenario)

      switch (field) {
        case "initialPosition.x":
          nextOverrides.initialPosition ??= { x: 0, y: 0 }
          nextOverrides.initialPosition.x = value
          break
        case "initialPosition.y":
          nextOverrides.initialPosition ??= { x: 0, y: 0 }
          nextOverrides.initialPosition.y = value
          break
        case "initialVelocity.x":
          nextOverrides.initialVelocity ??= { x: 0, y: 0 }
          nextOverrides.initialVelocity.x = value
          break
        case "initialVelocity.y":
          nextOverrides.initialVelocity ??= { x: 0, y: 0 }
          nextOverrides.initialVelocity.y = value
          break
        case "acceleration.x":
          nextOverrides.acceleration ??= { x: 0, y: 0 }
          nextOverrides.acceleration.x = value
          break
        case "acceleration.y":
          nextOverrides.acceleration ??= { x: 0, y: 0 }
          nextOverrides.acceleration.y = value
          break
        case "observerVelocity.x":
          nextOverrides.observerVelocity ??= { x: 0, y: 0 }
          nextOverrides.observerVelocity.x = value
          break
        case "observerVelocity.y":
          nextOverrides.observerVelocity ??= { x: 0, y: 0 }
          nextOverrides.observerVelocity.y = value
          break
        case "radius":
          nextOverrides.radius = value
          break
        case "angularSpeed":
          nextOverrides.angularSpeed = value
          break
      }

      return nextOverrides
    })
    this.timeSeconds.set(0)
    this.isPlaying.set(false)
  }

  importScenarioState(scenario: KinematicsScenario, timeSeconds: number): void {
    const baseScenario =
      this.scenarios.find((candidate) => candidate.id === scenario.id) ?? undefined

    if (baseScenario === undefined) {
      throw new Error(`Unknown scenario id: ${scenario.id}`)
    }

    this.selectedScenarioId.set(baseScenario.id)
    this.scenarioOverrides.set(cloneImportedScenario(scenario))
    this.timeSeconds.set(clamp(timeSeconds, 0, scenario.durationSeconds))
    this.isPlaying.set(false)
  }

  resetScenarioParameters(): void {
    this.scenarioOverrides.set({})
    this.timeSeconds.set(0)
    this.isPlaying.set(false)
  }

  setTimeSeconds(seconds: number): void {
    const durationSeconds = this.selectedScenario().durationSeconds
    this.timeSeconds.set(clamp(seconds, 0, durationSeconds))
  }

  stepBy(deltaSeconds: number): void {
    this.setTimeSeconds(this.timeSeconds() + deltaSeconds)
  }

  togglePlayback(): void {
    this.isPlaying.update((value) => !value)
  }

  pause(): void {
    this.isPlaying.set(false)
  }

  reset(): void {
    this.timeSeconds.set(0)
    this.isPlaying.set(false)
  }
}

function sampleScenario(
  scenario: KinematicsScenario,
  timeSeconds: number,
): KinematicsStateSnapshot {
  switch (scenario.id) {
    case "uniform-circular-motion":
      return sampleUniformCircularMotion(scenario, timeSeconds)
    case "relative-motion":
      return sampleRelativeMotion(scenario, timeSeconds)
    default:
      return sampleLinearMotion(scenario, timeSeconds)
  }
}

function sampleLinearMotion(
  scenario: KinematicsScenario,
  timeSeconds: number,
): KinematicsStateSnapshot {
  const position = {
    x:
      scenario.initialPosition.x +
      scenario.initialVelocity.x * timeSeconds +
      0.5 * scenario.acceleration.x * timeSeconds * timeSeconds,
    y:
      scenario.initialPosition.y +
      scenario.initialVelocity.y * timeSeconds +
      0.5 * scenario.acceleration.y * timeSeconds * timeSeconds,
  }

  const velocity = {
    x: scenario.initialVelocity.x + scenario.acceleration.x * timeSeconds,
    y: scenario.initialVelocity.y + scenario.acceleration.y * timeSeconds,
  }

  return {
    timeSeconds,
    position,
    velocity,
    acceleration: scenario.acceleration,
    speed: magnitude(velocity),
    accelerationMagnitude: magnitude(scenario.acceleration),
  }
}

function sampleRelativeMotion(
  scenario: KinematicsScenario,
  timeSeconds: number,
): KinematicsStateSnapshot {
  const absoluteState = sampleLinearMotion(scenario, timeSeconds)
  const observerVelocity = scenario.observerVelocity ?? { x: 0, y: 0 }
  const relativeVelocity = subtract(absoluteState.velocity, observerVelocity)
  const relativePosition = {
    x: absoluteState.position.x - observerVelocity.x * timeSeconds,
    y: absoluteState.position.y - observerVelocity.y * timeSeconds,
  }

  return {
    ...absoluteState,
    relativePosition,
    relativeVelocity,
  }
}

function sampleUniformCircularMotion(
  scenario: KinematicsScenario,
  timeSeconds: number,
): KinematicsStateSnapshot {
  const radius = scenario.radius ?? 1
  const angularSpeed = scenario.angularSpeed ?? 1
  const center = scenario.center ?? { x: 0, y: 0 }
  const angle = angularSpeed * timeSeconds
  const cosAngle = Math.cos(angle)
  const sinAngle = Math.sin(angle)

  const position = {
    x: center.x + radius * cosAngle,
    y: center.y + radius * sinAngle,
  }

  const velocity = {
    x: -radius * angularSpeed * sinAngle,
    y: radius * angularSpeed * cosAngle,
  }

  const acceleration = {
    x: -radius * angularSpeed * angularSpeed * cosAngle,
    y: -radius * angularSpeed * angularSpeed * sinAngle,
  }

  return {
    timeSeconds,
    position,
    velocity,
    acceleration,
    speed: magnitude(velocity),
    accelerationMagnitude: magnitude(acceleration),
  }
}

function buildSamples(scenario: KinematicsScenario, sampleCount: number): KinematicsSample[] {
  return Array.from({ length: sampleCount }, (_, index) => {
    const timeSeconds = scenario.durationSeconds * (index / Math.max(sampleCount - 1, 1))
    const snapshot = sampleScenario(scenario, timeSeconds)

    return {
      timeSeconds,
      xPosition: snapshot.position.x,
      yPosition: snapshot.position.y,
      speed: snapshot.speed,
      accelerationMagnitude: snapshot.accelerationMagnitude,
    }
  })
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return {
    x: left.x - right.x,
    y: left.y - right.y,
  }
}

function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function mergeScenario(
  baseScenario: KinematicsScenario,
  overrides: Partial<KinematicsScenario>,
): KinematicsScenario {
  return {
    ...baseScenario,
    ...overrides,
    initialPosition: overrides.initialPosition ?? baseScenario.initialPosition,
    initialVelocity: overrides.initialVelocity ?? baseScenario.initialVelocity,
    acceleration: overrides.acceleration ?? baseScenario.acceleration,
    observerVelocity: overrides.observerVelocity ?? baseScenario.observerVelocity,
    center: overrides.center ?? baseScenario.center,
  }
}

function cloneScenarioOverrides(
  overrides: Partial<KinematicsScenario>,
  baseScenario: KinematicsScenario,
): Partial<KinematicsScenario> {
  let observerVelocity = overrides.observerVelocity
  if (observerVelocity === undefined && baseScenario.observerVelocity) {
    observerVelocity = { ...baseScenario.observerVelocity }
  }

  return {
    ...overrides,
    initialPosition: overrides.initialPosition
      ? { ...overrides.initialPosition }
      : { ...baseScenario.initialPosition },
    initialVelocity: overrides.initialVelocity
      ? { ...overrides.initialVelocity }
      : { ...baseScenario.initialVelocity },
    acceleration: overrides.acceleration
      ? { ...overrides.acceleration }
      : { ...baseScenario.acceleration },
    observerVelocity,
    center: overrides.center ? { ...overrides.center } : undefined,
  }
}

function cloneImportedScenario(scenario: KinematicsScenario): Partial<KinematicsScenario> {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
    initialPosition: { ...scenario.initialPosition },
    initialVelocity: { ...scenario.initialVelocity },
    acceleration: { ...scenario.acceleration },
    observerVelocity: scenario.observerVelocity ? { ...scenario.observerVelocity } : undefined,
    center: scenario.center ? { ...scenario.center } : undefined,
  }
}

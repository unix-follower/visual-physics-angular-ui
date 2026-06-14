import { computed, Injectable, signal } from "@angular/core"

import {
  DynamicsSample,
  DynamicsScenario,
  DynamicsScenarioId,
  DynamicsStateSnapshot,
  Vector2,
} from "./dynamics.models"

const DEFAULT_SAMPLE_COUNT = 48
const DEFAULT_TIME_STEP_SECONDS = 1 / 120

export type EditableScenarioField =
  | "mass"
  | "initialPosition.x"
  | "initialPosition.y"
  | "initialVelocity.x"
  | "initialVelocity.y"
  | "netForce.x"
  | "netForce.y"
  | "gravity.x"
  | "gravity.y"
  | "dragCoefficient"
  | "springAnchor.x"
  | "springAnchor.y"
  | "springConstant"
  | "dampingCoefficient"
  | "orbitalCenter.x"
  | "orbitalCenter.y"
  | "gravitationalParameter"
  | "restitutionCoefficient"

const SCENARIOS: readonly DynamicsScenario[] = [
  {
    id: "constant-force",
    name: "Constant Force Motion",
    summary: "A body moves under a fixed net force with acceleration determined by F = ma.",
    equationSummary: 'm x" = F_net',
    durationSeconds: 10,
    viewBounds: { minX: -2, maxX: 44, minY: -4, maxY: 16 },
    mass: 2,
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 1.2, y: 0.4 },
    netForce: { x: 4, y: 1 },
  },
  {
    id: "drag-projectile",
    name: "Projectile With Drag",
    summary: "A launched body experiences gravity and linear air resistance.",
    equationSummary: 'm x" = m g - c v',
    durationSeconds: 4,
    viewBounds: { minX: -2, maxX: 24, minY: -4, maxY: 14 },
    mass: 1,
    initialPosition: { x: 0, y: 0 },
    initialVelocity: { x: 8.5, y: 11 },
    gravity: { x: 0, y: -9.81 },
    dragCoefficient: 0.45,
  },
  {
    id: "spring-oscillator",
    name: "Spring Oscillator",
    summary: "A mass oscillates about an anchor under Hooke's law with optional damping.",
    equationSummary: 'm x" = -k(x - x_eq) - c v',
    durationSeconds: 12,
    viewBounds: { minX: -8, maxX: 8, minY: -6, maxY: 6 },
    mass: 1.5,
    initialPosition: { x: 4, y: 0 },
    initialVelocity: { x: 0, y: 1.2 },
    springAnchor: { x: 0, y: 0 },
    springConstant: 3.6,
    dampingCoefficient: 0,
  },
  {
    id: "orbital-motion",
    name: "Orbital Motion",
    summary: "A body follows a gravity-driven orbit around a central mass.",
    equationSummary: 'm x" = -\u03bc m r / |r|^3',
    durationSeconds: 16,
    viewBounds: { minX: -8, maxX: 8, minY: -8, maxY: 8 },
    mass: 1,
    initialPosition: { x: 5, y: 0 },
    initialVelocity: { x: 0, y: 2 },
    orbitalCenter: { x: 0, y: 0 },
    gravitationalParameter: 20,
  },
  {
    id: "elastic-collision",
    name: "Elastic Boundary Collision",
    summary:
      "A body travels freely and reflects off the viewport boundaries with configurable restitution.",
    equationSummary: 'x" = 0, v_after = -e v_before at boundary contact',
    durationSeconds: 10,
    viewBounds: { minX: -6, maxX: 6, minY: -4, maxY: 4 },
    mass: 1.2,
    initialPosition: { x: -4.5, y: -1.8 },
    initialVelocity: { x: 4.8, y: 2.6 },
    restitutionCoefficient: 1,
  },
]

@Injectable({ providedIn: "root" })
export class DynamicsStateService {
  readonly scenarios = SCENARIOS
  readonly selectedScenarioId = signal<DynamicsScenarioId>(SCENARIOS[0].id)
  readonly timeSeconds = signal(0)
  readonly isPlaying = signal(false)
  private readonly scenarioOverrides = signal<Partial<DynamicsScenario>>({})

  readonly selectedScenario = computed(() => {
    const baseScenario =
      this.scenarios.find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios[0]
    return mergeScenario(baseScenario, this.scenarioOverrides())
  })

  readonly currentState = computed(() =>
    sampleScenario(this.selectedScenario(), this.timeSeconds()),
  )

  readonly sampledStates = computed(() =>
    buildSamples(this.selectedScenario(), DEFAULT_SAMPLE_COUNT),
  )

  selectScenario(id: DynamicsScenarioId): void {
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
        case "mass":
          nextOverrides.mass = Math.max(value, 0.1)
          break
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
        case "netForce.x":
          nextOverrides.netForce ??= { x: 0, y: 0 }
          nextOverrides.netForce.x = value
          break
        case "netForce.y":
          nextOverrides.netForce ??= { x: 0, y: 0 }
          nextOverrides.netForce.y = value
          break
        case "gravity.x":
          nextOverrides.gravity ??= { x: 0, y: 0 }
          nextOverrides.gravity.x = value
          break
        case "gravity.y":
          nextOverrides.gravity ??= { x: 0, y: 0 }
          nextOverrides.gravity.y = value
          break
        case "dragCoefficient":
          nextOverrides.dragCoefficient = Math.max(value, 0)
          break
        case "springAnchor.x":
          nextOverrides.springAnchor ??= { x: 0, y: 0 }
          nextOverrides.springAnchor.x = value
          break
        case "springAnchor.y":
          nextOverrides.springAnchor ??= { x: 0, y: 0 }
          nextOverrides.springAnchor.y = value
          break
        case "springConstant":
          nextOverrides.springConstant = Math.max(value, 0.1)
          break
        case "dampingCoefficient":
          nextOverrides.dampingCoefficient = Math.max(value, 0)
          break
        case "orbitalCenter.x":
          nextOverrides.orbitalCenter ??= { x: 0, y: 0 }
          nextOverrides.orbitalCenter.x = value
          break
        case "orbitalCenter.y":
          nextOverrides.orbitalCenter ??= { x: 0, y: 0 }
          nextOverrides.orbitalCenter.y = value
          break
        case "gravitationalParameter":
          nextOverrides.gravitationalParameter = Math.max(value, 0.1)
          break
        case "restitutionCoefficient":
          nextOverrides.restitutionCoefficient = clamp(value, 0, 1)
          break
      }

      return nextOverrides
    })

    this.timeSeconds.set(0)
    this.isPlaying.set(false)
  }

  importScenarioState(scenario: DynamicsScenario, timeSeconds: number): void {
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
    this.timeSeconds.set(clamp(seconds, 0, this.selectedScenario().durationSeconds))
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

function sampleScenario(scenario: DynamicsScenario, timeSeconds: number): DynamicsStateSnapshot {
  const clampedTime = clamp(timeSeconds, 0, scenario.durationSeconds)
  const state = integrateScenario(scenario, clampedTime)
  const netForce = computeNetForce(scenario, state.position, state.velocity)
  const acceleration = scale(netForce, 1 / Math.max(scenario.mass, 0.1))
  const kineticEnergy = 0.5 * scenario.mass * squaredMagnitude(state.velocity)
  const potentialEnergy = computePotentialEnergy(scenario, state.position)

  return {
    timeSeconds: clampedTime,
    position: state.position,
    velocity: state.velocity,
    acceleration,
    netForce,
    momentum: scale(state.velocity, scenario.mass),
    speed: magnitude(state.velocity),
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
  }
}

function buildSamples(scenario: DynamicsScenario, sampleCount: number): DynamicsSample[] {
  return Array.from({ length: sampleCount }, (_, index) => {
    const normalized = sampleCount <= 1 ? 0 : index / (sampleCount - 1)
    const snapshot = sampleScenario(scenario, scenario.durationSeconds * normalized)
    return {
      timeSeconds: snapshot.timeSeconds,
      xPosition: snapshot.position.x,
      yPosition: snapshot.position.y,
      speed: snapshot.speed,
      totalEnergy: snapshot.totalEnergy,
    }
  })
}

function integrateScenario(
  scenario: DynamicsScenario,
  timeSeconds: number,
): { position: Vector2; velocity: Vector2 } {
  if (timeSeconds <= 0) {
    return {
      position: scenario.initialPosition,
      velocity: scenario.initialVelocity,
    }
  }

  let position = scenario.initialPosition
  let velocity = scenario.initialVelocity
  let elapsed = 0

  while (elapsed < timeSeconds) {
    const dt = Math.min(DEFAULT_TIME_STEP_SECONDS, timeSeconds - elapsed)
    const next = integrateStep(scenario, position, velocity, dt)
    const resolved = resolveCollision(scenario, next.position, next.velocity)
    position = resolved.position
    velocity = resolved.velocity
    elapsed += dt
  }

  return { position, velocity }
}

function integrateStep(
  scenario: DynamicsScenario,
  position: Vector2,
  velocity: Vector2,
  deltaSeconds: number,
): { position: Vector2; velocity: Vector2 } {
  const k1 = evaluateDerivative(scenario, position, velocity)
  const k2 = evaluateDerivative(
    scenario,
    add(position, scale(k1.positionDerivative, deltaSeconds * 0.5)),
    add(velocity, scale(k1.velocityDerivative, deltaSeconds * 0.5)),
  )
  const k3 = evaluateDerivative(
    scenario,
    add(position, scale(k2.positionDerivative, deltaSeconds * 0.5)),
    add(velocity, scale(k2.velocityDerivative, deltaSeconds * 0.5)),
  )
  const k4 = evaluateDerivative(
    scenario,
    add(position, scale(k3.positionDerivative, deltaSeconds)),
    add(velocity, scale(k3.velocityDerivative, deltaSeconds)),
  )

  return {
    position: add(
      position,
      scale(
        addMany(
          k1.positionDerivative,
          scale(k2.positionDerivative, 2),
          scale(k3.positionDerivative, 2),
          k4.positionDerivative,
        ),
        deltaSeconds / 6,
      ),
    ),
    velocity: add(
      velocity,
      scale(
        addMany(
          k1.velocityDerivative,
          scale(k2.velocityDerivative, 2),
          scale(k3.velocityDerivative, 2),
          k4.velocityDerivative,
        ),
        deltaSeconds / 6,
      ),
    ),
  }
}

function evaluateDerivative(
  scenario: DynamicsScenario,
  position: Vector2,
  velocity: Vector2,
): { positionDerivative: Vector2; velocityDerivative: Vector2 } {
  const netForce = computeNetForce(scenario, position, velocity)
  return {
    positionDerivative: velocity,
    velocityDerivative: scale(netForce, 1 / Math.max(scenario.mass, 0.1)),
  }
}

function computeNetForce(
  scenario: DynamicsScenario,
  position: Vector2,
  velocity: Vector2,
): Vector2 {
  if (scenario.id === "constant-force") {
    return scenario.netForce ?? { x: 0, y: 0 }
  }

  if (scenario.id === "drag-projectile") {
    const gravity = scenario.gravity ?? { x: 0, y: -9.81 }
    const dragCoefficient = scenario.dragCoefficient ?? 0
    return {
      x: scenario.mass * gravity.x - dragCoefficient * velocity.x,
      y: scenario.mass * gravity.y - dragCoefficient * velocity.y,
    }
  }

  if (scenario.id === "orbital-motion") {
    const center = scenario.orbitalCenter ?? { x: 0, y: 0 }
    const offset = subtract(position, center)
    const distanceSquared = Math.max(squaredMagnitude(offset), 0.25)
    const distance = Math.sqrt(distanceSquared)
    const scaleFactor =
      -((scenario.gravitationalParameter ?? 0) * scenario.mass) / (distanceSquared * distance)
    return scale(offset, scaleFactor)
  }

  if (scenario.id === "elastic-collision") {
    return { x: 0, y: 0 }
  }

  const springAnchor = scenario.springAnchor ?? { x: 0, y: 0 }
  const springConstant = scenario.springConstant ?? 0
  const dampingCoefficient = scenario.dampingCoefficient ?? 0
  const displacement = subtract(position, springAnchor)

  return {
    x: -springConstant * displacement.x - dampingCoefficient * velocity.x,
    y: -springConstant * displacement.y - dampingCoefficient * velocity.y,
  }
}

function computePotentialEnergy(scenario: DynamicsScenario, position: Vector2): number {
  if (scenario.id === "constant-force") {
    const force = scenario.netForce ?? { x: 0, y: 0 }
    const displacement = subtract(position, scenario.initialPosition)
    return -(force.x * displacement.x + force.y * displacement.y)
  }

  if (scenario.id === "drag-projectile") {
    const gravity = scenario.gravity ?? { x: 0, y: -9.81 }
    return -scenario.mass * (gravity.x * position.x + gravity.y * position.y)
  }

  if (scenario.id === "orbital-motion") {
    const center = scenario.orbitalCenter ?? { x: 0, y: 0 }
    const distance = Math.max(magnitude(subtract(position, center)), 0.5)
    return (-(scenario.gravitationalParameter ?? 0) * scenario.mass) / distance
  }

  if (scenario.id === "elastic-collision") {
    return 0
  }

  const anchor = scenario.springAnchor ?? { x: 0, y: 0 }
  const springConstant = scenario.springConstant ?? 0
  const extension = subtract(position, anchor)
  return 0.5 * springConstant * squaredMagnitude(extension)
}

function mergeScenario(
  baseScenario: DynamicsScenario,
  overrides: Partial<DynamicsScenario>,
): DynamicsScenario {
  return {
    ...baseScenario,
    ...overrides,
    initialPosition: overrides.initialPosition ?? baseScenario.initialPosition,
    initialVelocity: overrides.initialVelocity ?? baseScenario.initialVelocity,
    netForce: overrides.netForce ?? baseScenario.netForce,
    gravity: overrides.gravity ?? baseScenario.gravity,
    springAnchor: overrides.springAnchor ?? baseScenario.springAnchor,
    orbitalCenter: overrides.orbitalCenter ?? baseScenario.orbitalCenter,
    restitutionCoefficient: overrides.restitutionCoefficient ?? baseScenario.restitutionCoefficient,
  }
}

function cloneScenarioOverrides(
  overrides: Partial<DynamicsScenario>,
  baseScenario: DynamicsScenario,
): Partial<DynamicsScenario> {
  return {
    ...overrides,
    initialPosition: cloneVector(overrides.initialPosition ?? baseScenario.initialPosition),
    initialVelocity: cloneVector(overrides.initialVelocity ?? baseScenario.initialVelocity),
    netForce: baseScenario.netForce
      ? cloneVector(overrides.netForce ?? baseScenario.netForce)
      : overrides.netForce,
    gravity: baseScenario.gravity
      ? cloneVector(overrides.gravity ?? baseScenario.gravity)
      : overrides.gravity,
    springAnchor: baseScenario.springAnchor
      ? cloneVector(overrides.springAnchor ?? baseScenario.springAnchor)
      : overrides.springAnchor,
    orbitalCenter: baseScenario.orbitalCenter
      ? cloneVector(overrides.orbitalCenter ?? baseScenario.orbitalCenter)
      : overrides.orbitalCenter,
    restitutionCoefficient: overrides.restitutionCoefficient ?? baseScenario.restitutionCoefficient,
  }
}

function cloneImportedScenario(scenario: DynamicsScenario): Partial<DynamicsScenario> {
  return {
    ...scenario,
    viewBounds: { ...scenario.viewBounds },
    initialPosition: { ...scenario.initialPosition },
    initialVelocity: { ...scenario.initialVelocity },
    netForce: cloneVector(scenario.netForce),
    gravity: cloneVector(scenario.gravity),
    springAnchor: cloneVector(scenario.springAnchor),
    orbitalCenter: cloneVector(scenario.orbitalCenter),
  }
}

function resolveCollision(
  scenario: DynamicsScenario,
  position: Vector2,
  velocity: Vector2,
): { position: Vector2; velocity: Vector2 } {
  if (scenario.id !== "elastic-collision") {
    return { position, velocity }
  }

  const restitution = clamp(scenario.restitutionCoefficient ?? 1, 0, 1)
  const nextPosition = { ...position }
  const nextVelocity = { ...velocity }
  const { minX, maxX, minY, maxY } = scenario.viewBounds

  if (nextPosition.x < minX) {
    nextPosition.x = minX + (minX - nextPosition.x)
    nextVelocity.x = Math.abs(nextVelocity.x) * restitution
  } else if (nextPosition.x > maxX) {
    nextPosition.x = maxX - (nextPosition.x - maxX)
    nextVelocity.x = -Math.abs(nextVelocity.x) * restitution
  }

  if (nextPosition.y < minY) {
    nextPosition.y = minY + (minY - nextPosition.y)
    nextVelocity.y = Math.abs(nextVelocity.y) * restitution
  } else if (nextPosition.y > maxY) {
    nextPosition.y = maxY - (nextPosition.y - maxY)
    nextVelocity.y = -Math.abs(nextVelocity.y) * restitution
  }

  return { position: nextPosition, velocity: nextVelocity }
}

function cloneVector(vector: Vector2 | undefined): Vector2 | undefined {
  return vector ? { ...vector } : undefined
}

function add(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x + right.x, y: left.y + right.y }
}

function addMany(...vectors: Vector2[]): Vector2 {
  return vectors.reduce((sum, vector) => add(sum, vector), { x: 0, y: 0 })
}

function subtract(left: Vector2, right: Vector2): Vector2 {
  return { x: left.x - right.x, y: left.y - right.y }
}

function scale(vector: Vector2, factor: number): Vector2 {
  return { x: vector.x * factor, y: vector.y * factor }
}

function squaredMagnitude(vector: Vector2): number {
  return vector.x * vector.x + vector.y * vector.y
}

function magnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

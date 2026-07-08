import { computed, Injectable, signal } from "@angular/core"

import {
  OpticsSample,
  OpticsScenario,
  OpticsScenarioId,
  OpticsStateSnapshot,
} from "./optics.models"

export type EditableOpticsField =
  | "incidentAngleDegrees"
  | "mediumARefractiveIndex"
  | "mediumBRefractiveIndex"
  | "focalLengthCentimeters"
  | "objectDistanceCentimeters"
  | "objectHeightCentimeters"
  | "slitWidthMicrometers"
  | "wavelengthNanometers"
  | "screenDistanceMeters"

const SCENARIOS: readonly OpticsScenario[] = [
  {
    id: "snell-refraction",
    name: "Snell Refraction at a Flat Interface",
    summary:
      "Track the incident, reflected, and refracted ray geometry for a light ray crossing a flat material boundary.",
    equationSummary: "n_1 sin(theta_1) = n_2 sin(theta_2)",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Refraction angle, total internal reflection, critical angle threshold, and deterministic ray geometry.",
    incidentAngleDegrees: 32,
    mediumARefractiveIndex: 1,
    mediumBRefractiveIndex: 1.52,
  },
  {
    id: "thin-lens-imaging",
    name: "Thin Lens Image Formation",
    summary:
      "Solve the image distance, magnification, and image orientation for a thin converging lens with a single object.",
    equationSummary: "1 / f = 1 / d_o + 1 / d_i, m = -d_i / d_o",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Image distance, upright versus inverted images, magnification, and principal-ray geometry across a converging lens.",
    focalLengthCentimeters: 18,
    objectDistanceCentimeters: 42,
    objectHeightCentimeters: 4,
  },
  {
    id: "single-slit-diffraction",
    name: "Single Slit Diffraction Pattern",
    summary:
      "Estimate the central diffraction envelope and first-minimum offsets for monochromatic light passing through a single narrow slit.",
    equationSummary: "a sin(theta) = m lambda, y_1 ~= L lambda / a",
    status: "Implemented",
    durationSeconds: 1,
    viewBounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
    focusArea:
      "Central maximum width, first-minimum positions, wavelength and slit-width scaling, and screen-plane diffraction markers.",
    slitWidthMicrometers: 40,
    wavelengthNanometers: 520,
    screenDistanceMeters: 1.6,
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function toRadians(angleDegrees: number): number {
  return (angleDegrees * Math.PI) / 180
}

function toDegrees(angleRadians: number): number {
  return (angleRadians * 180) / Math.PI
}

function buildSnellSnapshot(scenario: OpticsScenario): OpticsStateSnapshot {
  const incidentAngleDegrees = clamp(scenario.incidentAngleDegrees ?? 0, 0, 89.5)
  const mediumARefractiveIndex = Math.max(scenario.mediumARefractiveIndex ?? 1, 1)
  const mediumBRefractiveIndex = Math.max(scenario.mediumBRefractiveIndex ?? 1, 1)
  const incidentRadians = toRadians(incidentAngleDegrees)
  const sineRatio = (mediumARefractiveIndex / mediumBRefractiveIndex) * Math.sin(incidentRadians)
  const totalInternalReflection = Math.abs(sineRatio) > 1
  const refractedAngleDegrees = totalInternalReflection
    ? undefined
    : toDegrees(Math.asin(clamp(sineRatio, -1, 1)))
  const criticalAngleDegrees =
    mediumARefractiveIndex > mediumBRefractiveIndex
      ? toDegrees(Math.asin(mediumBRefractiveIndex / mediumARefractiveIndex))
      : undefined

  return {
    timeSeconds: 0,
    incidentAngleDegrees,
    reflectedAngleDegrees: incidentAngleDegrees,
    refractedAngleDegrees,
    criticalAngleDegrees,
    relativeRefractiveIndex: mediumARefractiveIndex / mediumBRefractiveIndex,
    totalInternalReflection,
    stable: Number.isFinite(sineRatio),
  }
}

function buildThinLensSnapshot(scenario: OpticsScenario): OpticsStateSnapshot {
  const focalLengthCentimeters = Math.max(scenario.focalLengthCentimeters ?? 18, 1)
  const objectDistanceCentimeters = Math.max(scenario.objectDistanceCentimeters ?? 42, 1.1)
  const objectHeightCentimeters = Math.max(scenario.objectHeightCentimeters ?? 4, 0.25)
  const denominator = 1 / focalLengthCentimeters - 1 / objectDistanceCentimeters
  const stable = Math.abs(denominator) > 1e-6
  const imageDistanceCentimeters = stable ? 1 / denominator : undefined
  const magnification =
    imageDistanceCentimeters === undefined
      ? undefined
      : -imageDistanceCentimeters / objectDistanceCentimeters
  const imageHeightCentimeters =
    magnification === undefined ? undefined : magnification * objectHeightCentimeters
  const realImage =
    imageDistanceCentimeters === undefined ? undefined : imageDistanceCentimeters > 0
  const invertedImage =
    imageHeightCentimeters === undefined ? undefined : imageHeightCentimeters < 0

  return {
    timeSeconds: 0,
    focalLengthCentimeters,
    objectDistanceCentimeters,
    objectHeightCentimeters,
    imageDistanceCentimeters,
    imageHeightCentimeters,
    magnification,
    realImage,
    invertedImage,
    stable,
  }
}

function buildSingleSlitSnapshot(scenario: OpticsScenario): OpticsStateSnapshot {
  const slitWidthMicrometers = Math.max(scenario.slitWidthMicrometers ?? 40, 1)
  const wavelengthNanometers = Math.max(scenario.wavelengthNanometers ?? 520, 100)
  const screenDistanceMeters = Math.max(scenario.screenDistanceMeters ?? 1.6, 0.1)
  const slitWidthMeters = slitWidthMicrometers * 1e-6
  const wavelengthMeters = wavelengthNanometers * 1e-9
  const firstMinimumOffsetMillimeters =
    (screenDistanceMeters * wavelengthMeters * 1000) / slitWidthMeters
  const centralMaximumWidthMillimeters = firstMinimumOffsetMillimeters * 2

  return {
    timeSeconds: 0,
    slitWidthMicrometers,
    wavelengthNanometers,
    screenDistanceMeters,
    firstMinimumOffsetMillimeters,
    centralMaximumWidthMillimeters,
    fringeSpacingMillimeters: firstMinimumOffsetMillimeters,
    stable: Number.isFinite(firstMinimumOffsetMillimeters),
  }
}

function buildSnellSamples(snapshot: OpticsStateSnapshot): readonly OpticsSample[] {
  const originX = 5
  const originY = 5
  const rayLength = 3.2
  const incidentAngleDegrees = snapshot.incidentAngleDegrees ?? 0
  const reflectedAngleDegrees = snapshot.reflectedAngleDegrees ?? 0
  const incidentRadians = toRadians(incidentAngleDegrees)
  const reflectedRadians = toRadians(reflectedAngleDegrees)
  const incidentSample: OpticsSample = {
    rayLabel: "incident",
    startX: originX - Math.sin(incidentRadians) * rayLength,
    startY: originY + Math.cos(incidentRadians) * rayLength,
    endX: originX,
    endY: originY,
    angleDegrees: incidentAngleDegrees,
    active: true,
  }
  const reflectedSample: OpticsSample = {
    rayLabel: "reflected",
    startX: originX,
    startY: originY,
    endX: originX + Math.sin(reflectedRadians) * rayLength,
    endY: originY + Math.cos(reflectedRadians) * rayLength,
    angleDegrees: reflectedAngleDegrees,
    active: true,
  }
  const refractedRadians = toRadians(snapshot.refractedAngleDegrees ?? 0)
  const refractedSample: OpticsSample = {
    rayLabel: "refracted",
    startX: originX,
    startY: originY,
    endX: originX + Math.sin(refractedRadians) * rayLength,
    endY: originY - Math.cos(refractedRadians) * rayLength,
    angleDegrees: snapshot.refractedAngleDegrees ?? 0,
    active: !snapshot.totalInternalReflection,
  }

  return [incidentSample, reflectedSample, refractedSample]
}

function buildThinLensSamples(snapshot: OpticsStateSnapshot): readonly OpticsSample[] {
  const lensX = 5
  const axisY = 5
  const objectDistance = snapshot.objectDistanceCentimeters ?? 42
  const imageDistance = snapshot.imageDistanceCentimeters ?? 0
  const objectHeight = snapshot.objectHeightCentimeters ?? 4
  const imageHeight = snapshot.imageHeightCentimeters ?? 0
  const objectX = clamp(lensX - objectDistance / 12, 1.1, 4.2)
  const imageX = clamp(lensX + imageDistance / 12, 1.4, 8.9)
  const objectTopY = axisY - objectHeight * 0.35
  const imageTopY = axisY - imageHeight * 0.35

  return [
    {
      rayLabel: "object",
      startX: objectX,
      startY: axisY,
      endX: objectX,
      endY: objectTopY,
      angleDegrees: 90,
      active: true,
    },
    {
      rayLabel: "parallel-ray",
      startX: objectX,
      startY: objectTopY,
      endX: lensX,
      endY: objectTopY,
      angleDegrees: 0,
      active: true,
    },
    {
      rayLabel: "focus-ray",
      startX: lensX,
      startY: objectTopY,
      endX: imageX,
      endY: axisY,
      angleDegrees: 0,
      active: snapshot.stable,
    },
    {
      rayLabel: "center-ray",
      startX: objectX,
      startY: objectTopY,
      endX: imageX,
      endY: imageTopY,
      angleDegrees: 0,
      active: snapshot.stable,
    },
    {
      rayLabel: "image",
      startX: imageX,
      startY: axisY,
      endX: imageX,
      endY: imageTopY,
      angleDegrees: 90,
      active: snapshot.stable,
    },
  ]
}

function buildSingleSlitSamples(snapshot: OpticsStateSnapshot): readonly OpticsSample[] {
  const slitX = 3.1
  const screenX = 8.2
  const axisY = 5
  const firstMinimumOffset = Math.min(2.2, (snapshot.firstMinimumOffsetMillimeters ?? 0) / 8)

  return [
    {
      rayLabel: "aperture-upper-edge",
      startX: slitX,
      startY: 2.2,
      endX: slitX,
      endY: axisY - 0.4,
      angleDegrees: 90,
      active: true,
    },
    {
      rayLabel: "aperture-lower-edge",
      startX: slitX,
      startY: axisY + 0.4,
      endX: slitX,
      endY: 7.8,
      angleDegrees: 90,
      active: true,
    },
    {
      rayLabel: "screen-center",
      startX: screenX,
      startY: axisY - 0.35,
      endX: screenX,
      endY: axisY + 0.35,
      angleDegrees: 90,
      active: true,
    },
    {
      rayLabel: "screen-upper-minimum",
      startX: screenX,
      startY: axisY - firstMinimumOffset - 0.18,
      endX: screenX,
      endY: axisY - firstMinimumOffset + 0.18,
      angleDegrees: 90,
      active: true,
    },
    {
      rayLabel: "screen-lower-minimum",
      startX: screenX,
      startY: axisY + firstMinimumOffset - 0.18,
      endX: screenX,
      endY: axisY + firstMinimumOffset + 0.18,
      angleDegrees: 90,
      active: true,
    },
  ]
}

@Injectable({ providedIn: "root" })
export class OpticsStateService {
  private readonly scenarios = signal<readonly OpticsScenario[]>(SCENARIOS)
  private readonly selectedScenarioId = signal<OpticsScenarioId>("snell-refraction")
  private readonly currentTimeSecondsState = signal(0)

  readonly selectedScenario = computed(
    () =>
      this.scenarios().find((scenario) => scenario.id === this.selectedScenarioId()) ??
      this.scenarios()[0],
  )
  readonly currentTimeSeconds = this.currentTimeSecondsState.asReadonly()
  readonly currentState = computed(() => {
    const scenario = this.selectedScenario()
    if (scenario.id === "snell-refraction") {
      return buildSnellSnapshot(scenario)
    }

    if (scenario.id === "thin-lens-imaging") {
      return buildThinLensSnapshot(scenario)
    }

    return buildSingleSlitSnapshot(scenario)
  })
  readonly sampledStates = computed(() => {
    const scenario = this.selectedScenario()
    const snapshot = this.currentState()
    if (scenario.id === "snell-refraction") {
      return buildSnellSamples(snapshot)
    }

    if (scenario.id === "thin-lens-imaging") {
      return buildThinLensSamples(snapshot)
    }

    return buildSingleSlitSamples(snapshot)
  })

  listScenarios(): readonly OpticsScenario[] {
    return this.scenarios()
  }

  selectScenario(scenarioId: OpticsScenarioId): void {
    this.selectedScenarioId.set(scenarioId)
    this.currentTimeSecondsState.set(0)
  }

  updateScenarioField(field: EditableOpticsField, value: number): void {
    this.scenarios.update((current) =>
      current.map((scenario) =>
        scenario.id === this.selectedScenarioId()
          ? {
              ...scenario,
              [field]: value,
            }
          : scenario,
      ),
    )
  }

  importScenarioState(scenario: OpticsScenario, timeSeconds: number): void {
    this.scenarios.update((current) =>
      current.map((existing) => (existing.id === scenario.id ? scenario : existing)),
    )
    this.selectedScenarioId.set(scenario.id)
    this.currentTimeSecondsState.set(timeSeconds)
  }
}

import { OpticsScenario, OpticsStateSnapshot } from "./optics.models"

export interface OpticsInsightCard {
  label: string
  value: string
  detail: string
}

export function buildInsightCards(
  scenario: OpticsScenario,
  snapshot: OpticsStateSnapshot,
): OpticsInsightCard[] {
  if (scenario.id === "thin-lens-imaging") {
    return [
      {
        label: "Image distance",
        value: `${(snapshot.imageDistanceCentimeters ?? 0).toFixed(1)} cm`,
        detail:
          "The thin-lens equation predicts where the principal rays intersect to form the image.",
      },
      {
        label: "Magnification",
        value: `${(snapshot.magnification ?? 0).toFixed(2)}x`,
        detail:
          "Magnification equals the negative image-distance to object-distance ratio, setting size and orientation together.",
      },
      {
        label: "Image height",
        value: `${(snapshot.imageHeightCentimeters ?? 0).toFixed(2)} cm`,
        detail: snapshot.invertedImage
          ? "A negative image height indicates an inverted real image below the principal axis."
          : "A positive image height indicates an upright virtual image on the object side of the lens.",
      },
      {
        label: "Image type",
        value: snapshot.realImage ? "Real image" : "Virtual image",
        detail: snapshot.realImage
          ? "Positive image distance places the image on the outgoing side of the lens, where it can be projected on a screen."
          : "Negative image distance keeps the image on the object side of the lens, where it stays virtual and upright.",
      },
    ]
  }

  if (scenario.id === "single-slit-diffraction") {
    return [
      {
        label: "First minimum",
        value: `${(snapshot.firstMinimumOffsetMillimeters ?? 0).toFixed(2)} mm`,
        detail:
          "The first dark fringe appears where the slit path difference reaches one wavelength across the aperture.",
      },
      {
        label: "Central maximum width",
        value: `${(snapshot.centralMaximumWidthMillimeters ?? 0).toFixed(2)} mm`,
        detail: "The central bright lobe spans twice the first-minimum offset on the screen plane.",
      },
      {
        label: "Wavelength",
        value: `${(snapshot.wavelengthNanometers ?? 0).toFixed(0)} nm`,
        detail:
          "Longer wavelengths spread the diffraction envelope farther across the observation screen.",
      },
      {
        label: "Slit width",
        value: `${(snapshot.slitWidthMicrometers ?? 0).toFixed(1)} um`,
        detail:
          "Narrower apertures produce wider diffraction envelopes and larger screen-plane minima offsets.",
      },
    ]
  }

  return [
    {
      label: "Incident angle",
      value: `${(snapshot.incidentAngleDegrees ?? 0).toFixed(1)} deg`,
      detail: `${scenario.name} measures all ray angles from the interface normal at the boundary crossing point.`,
    },
    {
      label: "Refracted angle",
      value: snapshot.totalInternalReflection
        ? "No transmitted ray"
        : `${(snapshot.refractedAngleDegrees ?? 0).toFixed(1)} deg`,
      detail: snapshot.totalInternalReflection
        ? "The incident angle exceeds the critical angle for this medium pair, so the transmitted ray collapses into total internal reflection."
        : "Snell's law resolves the transmitted direction from the ratio between the two refractive indices.",
    },
    {
      label: "Critical angle",
      value:
        snapshot.criticalAngleDegrees === undefined
          ? "Not applicable"
          : `${snapshot.criticalAngleDegrees.toFixed(1)} deg`,
      detail:
        "A critical angle exists only when light attempts to pass from a higher-index medium into a lower-index medium.",
    },
    {
      label: "Index ratio",
      value: (snapshot.relativeRefractiveIndex ?? 0).toFixed(3),
      detail:
        "The relative refractive-index ratio indicates whether the transmitted ray bends toward or away from the normal.",
    },
  ]
}

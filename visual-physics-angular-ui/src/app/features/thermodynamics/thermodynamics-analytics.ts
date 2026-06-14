import { ThermodynamicsScenario, ThermodynamicsStateSnapshot } from "./thermodynamics.models"

export interface ThermodynamicsInsightCard {
  label: string
  value: string
  detail: string
}

export function buildInsightCards(
  scenario: ThermodynamicsScenario,
  snapshot: ThermodynamicsStateSnapshot,
): ThermodynamicsInsightCard[] {
  if (scenario.id === "carnot-cycle") {
    return [
      {
        label: "Thermal efficiency",
        value: `${((snapshot.thermalEfficiency ?? 0) * 100).toFixed(1)}%`,
        detail: `${scenario.name} reports the ideal reversible upper bound set only by the hot and cold reservoir temperatures.`,
      },
      {
        label: "Net cycle work",
        value: `${(snapshot.netWorkKj ?? 0).toFixed(3)} kJ`,
        detail:
          "Net work equals absorbed heat minus rejected heat for the current idealized loop settings.",
      },
      {
        label: "Heat input",
        value: `${(snapshot.absorbedHeatKj ?? 0).toFixed(3)} kJ`,
        detail:
          "The hot isotherm transfers this amount of reversible heat into the working fluid over one full cycle.",
      },
      {
        label: "Active stage",
        value: snapshot.cycleStageLabel ?? "Stage unavailable",
        detail: `Current point pressure is ${(snapshot.pressureKpa ?? 0).toFixed(1)} kPa at ${(snapshot.volumeCubicMeters ?? 0).toFixed(4)} m^3 along the sampled Carnot loop.`,
      },
    ]
  }

  if (scenario.id === "heat-conduction-slab") {
    return [
      {
        label: "Center temperature",
        value: `${(snapshot.centerTemperatureCelsius ?? 0).toFixed(1)} degC`,
        detail: `${scenario.name} tracks the transient centerline response as the slab diffuses toward the fixed boundary temperature.`,
      },
      {
        label: "Boundary heat flux",
        value: `${(snapshot.heatFluxWPerM2 ?? 0).toFixed(0)} W/m^2`,
        detail:
          "The reported flux uses the current center-to-boundary gradient across the slab half-thickness.",
      },
      {
        label: "Fourier progress",
        value: `Fo ${(snapshot.fourierNumber ?? 0).toFixed(3)}`,
        detail:
          "The Fourier number non-dimensionalizes transient conduction progress with diffusivity, time, and characteristic length.",
      },
      {
        label: "Thermal settling",
        value: `${((1 - (snapshot.normalizedTemperature ?? 0)) * 100).toFixed(1)}%`,
        detail: snapshot.stable
          ? "The slab centerline is close to the boundary condition, so the transient is nearly settled."
          : "A noticeable center-to-boundary gradient remains, so the transient is still evolving.",
      },
    ]
  }

  return [
    {
      label: "Pressure state",
      value: `${(snapshot.pressureKpa ?? 0).toFixed(1)} kPa`,
      detail: `${scenario.name} closes pressure from the selected amount of gas, temperature, and chamber volume.`,
    },
    {
      label: "Gas density",
      value: `${(snapshot.densityKgPerM3 ?? 0).toFixed(3)} kg/m^3`,
      detail:
        "Density follows total gas mass divided by chamber volume for the active thermodynamic state.",
    },
    {
      label: "Internal energy proxy",
      value: `${(snapshot.internalEnergyKj ?? 0).toFixed(3)} kJ`,
      detail:
        "This slice uses a translational ideal-gas internal-energy proxy proportional to absolute temperature.",
    },
    {
      label: "Ideal-gas closure",
      value: `Z ${(snapshot.compressibilityFactor ?? 0).toFixed(3)}`,
      detail: snapshot.stable
        ? "The compressibility factor stays at one, matching the ideal-gas closure used by this scenario."
        : "The selected state no longer matches the ideal-gas closure assumed by this scenario.",
    },
  ]
}

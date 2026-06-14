import { FluidMechanicsScenario, FluidMechanicsStateSnapshot } from "./fluid-mechanics.models"

export interface FluidMechanicsInsightCard {
  label: string
  value: string
  detail: string
}

export function buildInsightCards(
  scenario: FluidMechanicsScenario,
  snapshot: FluidMechanicsStateSnapshot,
): FluidMechanicsInsightCard[] {
  if (scenario.id === "open-channel-flow") {
    return [
      {
        label: snapshot.stable ? "Subcritical regime" : "Supercritical tendency",
        value: `Fr ${(snapshot.froudeNumber ?? 0).toFixed(2)}`,
        detail: snapshot.stable
          ? "Froude number below one indicates tranquil, subcritical channel flow."
          : "Froude number above one indicates rapidly varied, supercritical channel behavior.",
      },
      {
        label: "Discharge",
        value: `${(snapshot.discharge ?? 0).toFixed(3)} m^3/s`,
        detail:
          "Manning-type discharge combines channel area, hydraulic radius, bed slope, and roughness.",
      },
      {
        label: "Hydraulic radius",
        value: `${(snapshot.hydraulicRadius ?? 0).toFixed(3)} m`,
        detail:
          "Wetted area divided by wetted perimeter captures how efficiently the cross-section conveys flow.",
      },
      {
        label: "Average velocity",
        value: `${(snapshot.averageVelocity ?? 0).toFixed(3)} m/s`,
        detail: `${scenario.name} uses discharge divided by rectangular flow area for the mean streamwise speed.`,
      },
    ]
  }

  if (scenario.id === "poiseuille-pipe") {
    return [
      {
        label: snapshot.stable ? "Laminar regime" : "Transition risk",
        value: `Re ${Math.round(snapshot.reynoldsNumber ?? 0)}`,
        detail: snapshot.stable
          ? "The Reynolds number stays below the classical laminar-transition threshold for pipe flow."
          : "The Reynolds number exceeds the nominal laminar threshold, so the Poiseuille model becomes less reliable.",
      },
      {
        label: "Volumetric flow rate",
        value: `${(snapshot.volumetricFlowRate ?? 0).toExponential(2)} m^3/s`,
        detail:
          "Poiseuille flow rate rises with the fourth power of pipe radius and linearly with pressure drop.",
      },
      {
        label: "Average velocity",
        value: `${(snapshot.averageVelocity ?? 0).toFixed(3)} m/s`,
        detail: "Mean axial speed across the full circular pipe cross-section.",
      },
      {
        label: "Pressure gradient",
        value: `${(snapshot.pressureGradient ?? 0).toFixed(2)} Pa/m`,
        detail: `${scenario.name} assumes a linear axial pressure drop along the pipe length.`,
      },
    ]
  }

  const floatingLabel = snapshot.stable ? "Stable float" : "Sinking tendency"
  const floatingDetail = snapshot.stable
    ? "Buoyant force balances weight at the computed equilibrium depth."
    : "The block is denser than the surrounding fluid, so full submersion still leaves a downward net force."

  return [
    {
      label: floatingLabel,
      value: `${((snapshot.immersionRatio ?? 0) * 100).toFixed(1)}% immersed`,
      detail: floatingDetail,
    },
    {
      label: "Buoyant force",
      value: `${(snapshot.buoyantForce ?? 0).toFixed(1)} N`,
      detail:
        "Fluid pressure integrates to an upward force equal to the weight of the displaced fluid.",
    },
    {
      label: "Weight",
      value: `${(snapshot.weightForce ?? 0).toFixed(1)} N`,
      detail: `${scenario.name} compares block weight directly against the buoyant response of the fluid volume.`,
    },
    {
      label: "Net force",
      value: `${(snapshot.netForce ?? 0).toFixed(1)} N`,
      detail:
        "Positive values rise, negative values sink, and near-zero values indicate static buoyant equilibrium.",
    },
  ]
}

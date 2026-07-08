import { Routes } from "@angular/router"

export const routes: Routes = [
  {
    path: "",
    pathMatch: "full",
    redirectTo: "kinematics",
  },
  {
    path: "kinematics",
    loadComponent: () =>
      import("./features/kinematics/kinematics-page.component").then(
        (module) => module.KinematicsPageComponent,
      ),
  },
  {
    path: "dynamics",
    loadComponent: () =>
      import("./features/dynamics/dynamics-page.component").then(
        (module) => module.DynamicsPageComponent,
      ),
  },
  {
    path: "statics",
    loadComponent: () =>
      import("./features/statics/statics-page.component").then(
        (module) => module.StaticsPageComponent,
      ),
  },
  {
    path: "electromagnetism",
    loadComponent: () =>
      import("./features/electromagnetism/electromagnetism-page.component").then(
        (module) => module.ElectromagnetismPageComponent,
      ),
  },
  {
    path: "computational-physics",
    loadComponent: () =>
      import("./features/computational-physics/computational-physics-page.component").then(
        (module) => module.ComputationalPhysicsPageComponent,
      ),
  },
  {
    path: "electronics-and-circuits",
    loadComponent: () =>
      import("./features/electronics-and-circuits/electronics-and-circuits-page.component").then(
        (module) => module.ElectronicsAndCircuitsPageComponent,
      ),
  },
  {
    path: "fluid-mechanics",
    loadComponent: () =>
      import("./features/fluid-mechanics/fluid-mechanics-page.component").then(
        (module) => module.FluidMechanicsPageComponent,
      ),
  },
  {
    path: "thermodynamics",
    loadComponent: () =>
      import("./features/thermodynamics/thermodynamics-page.component").then(
        (module) => module.ThermodynamicsPageComponent,
      ),
  },
  {
    path: "optics",
    loadComponent: () =>
      import("./features/optics/optics-page.component").then(
        (module) => module.OpticsPageComponent,
      ),
  },
  {
    path: "quantum-mechanics",
    loadComponent: () =>
      import("./features/quantum-mechanics/quantum-mechanics-page.component").then(
        (module) => module.QuantumMechanicsPageComponent,
      ),
  },
  {
    path: "waves-and-acoustics",
    loadComponent: () =>
      import("./features/waves-and-acoustics/waves-and-acoustics-page.component").then(
        (module) => module.WavesAndAcousticsPageComponent,
      ),
  },
  {
    path: "relativity",
    loadComponent: () =>
      import("./features/relativity/relativity-page.component").then(
        (module) => module.RelativityPageComponent,
      ),
  },
  {
    path: "astrophysics",
    loadComponent: () =>
      import("./features/astrophysics/astrophysics-page.component").then(
        (module) => module.AstrophysicsPageComponent,
      ),
  },
  {
    path: "atmospheric-physics",
    loadComponent: () =>
      import("./features/atmospheric-physics/atmospheric-physics-page.component").then(
        (module) => module.AtmosphericPhysicsPageComponent,
      ),
  },
  {
    path: "solid-state-physics",
    loadComponent: () =>
      import("./features/solid-state-physics/solid-state-physics-page.component").then(
        (module) => module.SolidStatePhysicsPageComponent,
      ),
  },
  {
    path: "nuclear-and-particle-physics",
    loadComponent: () =>
      import("./features/nuclear-and-particle-physics/nuclear-and-particle-physics-page.component").then(
        (module) => module.NuclearAndParticlePhysicsPageComponent,
      ),
  },
  {
    path: "plasma-physics",
    loadComponent: () =>
      import("./features/plasma-physics/plasma-physics-page.component").then(
        (module) => module.PlasmaPhysicsPageComponent,
      ),
  },
  {
    path: "**",
    redirectTo: "kinematics",
  },
]

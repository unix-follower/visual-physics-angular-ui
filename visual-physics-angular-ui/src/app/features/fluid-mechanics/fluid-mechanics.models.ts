export type FluidMechanicsScenarioId = "buoyancy-block" | "poiseuille-pipe" | "open-channel-flow"

export interface ViewBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface FluidMechanicsScenario {
  id: FluidMechanicsScenarioId
  name: string
  summary: string
  equationSummary: string
  status: string
  durationSeconds: number
  viewBounds: ViewBounds
  focusArea: string
  fluidDensity?: number
  blockDensity?: number
  gravity?: number
  blockWidth?: number
  blockHeight?: number
  blockDepth?: number
  pipeRadius?: number
  pipeLength?: number
  pressureDrop?: number
  dynamicViscosity?: number
  channelWidth?: number
  channelDepth?: number
  channelSlope?: number
  roughnessCoefficient?: number
  channelLength?: number
}

export interface FluidMechanicsStateSnapshot {
  timeSeconds: number
  submersionDepth?: number
  displacedVolume?: number
  buoyantForce?: number
  weightForce?: number
  netForce?: number
  immersionRatio?: number
  equilibriumDepth?: number
  volumetricFlowRate?: number
  averageVelocity?: number
  centerlineVelocity?: number
  reynoldsNumber?: number
  pressureGradient?: number
  discharge?: number
  hydraulicRadius?: number
  froudeNumber?: number
  stable: boolean
}

export interface FluidMechanicsSample {
  timeSeconds: number
  submersionDepth?: number
  displacedVolume?: number
  buoyantForce?: number
  weightForce?: number
  netForce?: number
  immersionRatio?: number
  axialPosition?: number
  pressure?: number
  averageVelocity?: number
  centerlineVelocity?: number
  reynoldsNumber?: number
  waterSurfaceElevation?: number
  bedElevation?: number
  discharge?: number
  froudeNumber?: number
  stable: boolean
}

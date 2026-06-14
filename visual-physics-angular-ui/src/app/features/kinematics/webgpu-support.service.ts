import { Injectable } from "@angular/core"

import { WebGpuSupportStatus } from "./kinematics.models"

export interface GpuAdapterLike {
  requestDevice: () => Promise<GpuDeviceLike>
}

export interface GpuBindGroupLike {}

export interface GpuBufferLike {
  destroy: () => void
}

export interface GpuCommandBufferLike {}

export interface GpuCommandEncoderLike {
  beginRenderPass: (descriptor: unknown) => GpuRenderPassEncoderLike
  finish: () => GpuCommandBufferLike
}

export interface GpuDeviceLike {
  queue: GpuQueueLike
  createBindGroup: (descriptor: unknown) => GpuBindGroupLike
  createBuffer: (descriptor: unknown) => GpuBufferLike
  createCommandEncoder: () => GpuCommandEncoderLike
  createRenderPipeline: (descriptor: unknown) => GpuRenderPipelineLike
  createShaderModule: (descriptor: unknown) => GpuShaderModuleLike
}

export interface GpuQueueLike {
  submit: (commandBuffers: readonly GpuCommandBufferLike[]) => void
  writeBuffer: (buffer: GpuBufferLike, bufferOffset: number, data: Float32Array) => void
}

export interface GpuRenderPassEncoderLike {
  end: () => void
  draw: (vertexCount: number) => void
  setBindGroup: (index: number, bindGroup: GpuBindGroupLike) => void
  setPipeline: (pipeline: GpuRenderPipelineLike) => void
}

export interface GpuRenderPipelineLike {
  getBindGroupLayout: (index: number) => unknown
}

export interface GpuShaderModuleLike {}

export interface GpuTextureLike {
  createView: () => unknown
}

export interface GpuCanvasContextLike {
  configure: (descriptor: unknown) => void
  getCurrentTexture: () => GpuTextureLike
}

export interface NavigatorGpuLike {
  getPreferredCanvasFormat: () => string
  requestAdapter: () => Promise<GpuAdapterLike | null>
}

type NavigatorWithGpu = Navigator & { gpu?: NavigatorGpuLike }

export interface WebGpuSetupResult extends WebGpuSupportStatus {
  adapter?: GpuAdapterLike
  canvasFormat?: string
  gpu?: NavigatorGpuLike
}

@Injectable({ providedIn: "root" })
export class WebGpuSupportService {
  async getStatus(): Promise<WebGpuSetupResult> {
    if (typeof navigator === "undefined") {
      return {
        supported: false,
        message: "WebGPU is checked only in the browser.",
      }
    }

    const browserNavigator = navigator as NavigatorWithGpu

    if (browserNavigator.gpu === undefined) {
      return {
        supported: false,
        message:
          "WebGPU is unavailable in this browser. Use a Chromium-based browser with WebGPU enabled.",
      }
    }

    const adapter = await browserNavigator.gpu.requestAdapter()
    if (!adapter) {
      return {
        supported: false,
        message: "No WebGPU adapter is available on this device.",
      }
    }

    return {
      supported: true,
      message: "WebGPU adapter acquired.",
      adapter,
      canvasFormat: browserNavigator.gpu.getPreferredCanvasFormat(),
      gpu: browserNavigator.gpu,
    }
  }
}

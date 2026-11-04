import type { MountGpuProductStudioResult } from '../src/index.js';
export async function prepareReference(studio: MountGpuProductStudioResult): Promise<void> {
  studio.cameraControls?.setEnabled(false);
  await studio.cameraControls?.whenIdle?.();
}

import { mountGpuProductStudio, type ProductStudioMotionPerformanceSnapshot } from '../src/index.js';
export async function mountBudgetedStudio(root: HTMLElement) {
  const studio = await mountGpuProductStudio({ root, motionPerformance: { targetFrameRate: 24 },
    __showcaseFeatureLoaders: { performance: () => import('@plasius/gpu-performance') } });
  const snapshot: ProductStudioMotionPerformanceSnapshot | null = studio.getMotionPerformanceSnapshot();
  return snapshot?.renderedSamplesPerPixel;
}

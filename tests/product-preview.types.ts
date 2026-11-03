import type { MountGpuProductStudioResult } from '../src/index.js';
export async function prepareReference(studio: MountGpuProductStudioResult): Promise<void> {
  studio.cameraControls?.setEnabled(false);
  await studio.cameraControls?.whenIdle?.();
}

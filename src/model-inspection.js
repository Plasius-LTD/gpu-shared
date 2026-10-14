import { createWavefrontPathTracingComputeRenderer } from '@plasius/gpu-renderer';
import { loadGltfModel } from './gltf-loader.js';
import { createProductStudioMeshes } from './product-studio-runtime.js';
import { createNativeDemoCamera } from './material-study-helpers/native-demo-camera.js';
import { createInspectionRuntime } from './model-inspection-runtime.js';

/** Lazy subpath entry. No DOM, asset request or GPU allocation on import. */
export function createModelInspection(options) {
  return createInspectionRuntime(options, { load: loadGltfModel, meshes: createProductStudioMeshes,
    renderer: createWavefrontPathTracingComputeRenderer, camera: createNativeDemoCamera });
}

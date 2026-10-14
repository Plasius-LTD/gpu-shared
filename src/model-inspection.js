import { createWavefrontPathTracingComputeRenderer } from '@plasius/gpu-renderer';
import { loadGltfModel } from './gltf-loader.js';
import { createProductStudioMeshes } from './product-studio-runtime.js';
import { createNativeDemoCamera } from './material-study-helpers/native-demo-camera.js';
import { createInspectionRuntime } from './model-inspection-runtime.js';

/** Lazy subpath entry. No DOM, asset request or GPU allocation on import. */
export function createModelInspection(options) {
  return createInspectionRuntime(options, { load: loadGltfModel, meshes: createProductStudioMeshes,
    adaptive: async()=>{
      const [renderer,lighting]=await Promise.all([import('@plasius/gpu-renderer/adaptive'),import('@plasius/gpu-lighting/radial-sampling')]);
      return {renderer:renderer.createAdaptiveWavefrontRenderer,createPlan:lighting.createRadialSamplingPlan};
    }, renderer: createWavefrontPathTracingComputeRenderer, camera: createNativeDemoCamera });
}

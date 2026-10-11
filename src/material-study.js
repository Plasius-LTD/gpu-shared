import { createNativeSceneRenderer } from '@plasius/gpu-renderer';
import { loadGltfModel } from './gltf-loader.js';
import { createNativeDemoCamera } from './material-study-helpers/native-demo-camera.js';
import { createStudyRuntime } from './material-study-runtime.js';

/** The isolated, on-demand shared material demonstration. No renderer is allocated on import. */
export function createMaterialStudy(options) {
  return createStudyRuntime(options,{load:loadGltfModel,createRenderer:createNativeSceneRenderer,createCamera:createNativeDemoCamera});
}

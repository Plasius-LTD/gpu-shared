import { createModelInspection, type ModelInspection } from '../src/model-inspection.js';
declare const canvas: HTMLCanvasElement;
const runtime: Promise<ModelInspection> = createModelInspection({ canvas, modelUrl: 'https://example.test/scene.gltf', integrity: {}, enabled: true });
void runtime;
async function qualityContract() {
  const inspection=await runtime;
  await inspection.setQuality({samplesPerPixel:128,maxDepth:8,width:1280,height:720,denoise:false});
  inspection.setPaused(true);inspection.destroy();
}
void qualityContract;

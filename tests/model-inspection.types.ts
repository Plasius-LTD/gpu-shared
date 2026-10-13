import { createModelInspection, type ModelInspection } from '../src/model-inspection.js';
declare const canvas: HTMLCanvasElement;
const runtime: Promise<ModelInspection> = createModelInspection({ canvas, modelUrl: 'https://example.test/scene.gltf', integrity: {}, enabled: true });
void runtime;

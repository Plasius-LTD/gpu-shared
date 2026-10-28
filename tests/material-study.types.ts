import { createMaterialStudy, type MaterialStudy } from '../src/material-study.js';
import { loadGltfModel } from '../src/index.js';
import type { MaterialStudyFailure } from '../src/material-study.js';
declare const canvas: HTMLCanvasElement;
const study: Promise<MaterialStudy> = createMaterialStudy({canvas,modelUrl:new URL('https://example.test/wooden_crate_01.gltf'),signal:new AbortController().signal,onHintChange:visible=>{const boolean:boolean=visible;void boolean;}});
void study.then(async s=>{await s.update({varnishWear:1,ropeFray:.3});s.resize();s.destroy();});
void loadGltfModel('https://example.test/model.gltf',{signal:new AbortController().signal,integrity:{}});
void loadGltfModel(new URL('https://example.test/model.glb'));
void createMaterialStudy({canvas,modelUrl:'https://example.test/wooden_crate_01.gltf',onUnavailable:failure=>{
 const typed:MaterialStudyFailure=failure;
 const code:'render-unavailable'=typed.code;
 const message:'Material study rendering is unavailable.'=typed.message;
 // @ts-expect-error failure notifications are immutable
 typed.code='other';
 void code;void message;
}});
// @ts-expect-error fray must be numeric
void study.then(s=>s.update({ropeFray:'high'}));

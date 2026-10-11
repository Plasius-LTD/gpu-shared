import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyRuntime } from '../src/material-study-runtime.js';

const texture = { width: 1, height: 1, data: new Uint8Array([255,220,0,255]) };
const model = { primitives: [{ name:'wooden_crate_01-0', indices:Array.from({length:5508*3}, (_,i)=>i%3),
  positions:[0,0,0,1,0,0,0,1,1], normals:[0,1,0,0,1,0,0,1,0], uvs:[0,0,1,0,0,1],
  material:{color:{r:1,g:1,b:1},roughness:1,metallic:1,baseColorTexture:texture,metallicRoughnessTexture:texture} }] };
function setup(extra={}) {
 const frames=[], renderers=[], cameras=[];
 const canvas={clientWidth:800,clientHeight:500,width:0,height:0};
 const deps={load:async()=>model,createRenderer:async()=>{ const r={destroyed:0,render:f=>{frames.push(f);return {vertexCount:f.vertices.length/12};},destroy(){this.destroyed++;}};renderers.push(r);return r; },
  createCamera:options=>{const c={...options,read:()=>options.camera,destroyed:0,destroy(){this.destroyed++;}};cameras.push(c);return c;},...extra};
 return {canvas,deps,frames,renderers,cameras};
}
test('shared study preserves camera, defaults, bare-wood endpoint and independent fray', async()=>{
 const s=setup(); const study=await createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},s.deps);
 assert.equal(study.read().ropeFray,.3);assert.equal(study.read().varnishWear,.9);
 assert.equal(s.frames[0].water,false);assert.equal(s.frames[0].surfaces.at(-1).materialIndex,4);
 const camera=s.frames[0].camera; await study.update({varnishWear:1});
 assert.equal(study.read().varnishWear,1);assert.equal(s.frames.at(-1).camera,camera);
 assert.equal(s.renderers[0].destroyed,1);assert.equal(s.cameras.length,1);
 await study.update({ropeFray:0, fibres:false, materials:false});
 assert.equal(s.frames.at(-1).surfaces,undefined); assert.equal(s.renderers.length,2);
 s.canvas.clientWidth=0; study.resize(); s.canvas.clientWidth=10000;study.resize();assert.ok(s.canvas.width<=1440);
 await assert.rejects(study.update({ropeFray:2}),/ageing/);
 await assert.rejects(study.update({fibres:'yes'}),/boolean/);
 study.destroy();study.destroy();study.resize();s.cameras[0].onChange();
 assert.equal(s.renderers[1].destroyed,1);assert.equal(s.cameras[0].destroyed,1);
 await assert.rejects(study.update({ropeFray:.5}),{name:'AbortError'});
});
test('abort after GPU allocation disposes resources and never attaches input',async()=>{
 const ac=new AbortController(),s=setup();const base=s.deps.createRenderer;
 s.deps.createRenderer=async x=>{const result=await base(x);ac.abort();return result;};
 await assert.rejects(createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf',signal:ac.signal},s.deps),{name:'AbortError'});
 assert.equal(s.renderers[0].destroyed,1);assert.equal(s.cameras.length,0);
});
test('failed material replacement fails closed; pending replacement is destroyed after disposal',async()=>{
 const s=setup(),study=await createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},s.deps);
 let resolve; const base=s.deps.createRenderer;s.deps.createRenderer=()=>new Promise(r=>{resolve=r;});
 const pending=study.update({varnishWear:.2}); await assert.rejects(study.update({varnishWear:.3}),/busy/);
 study.destroy(); const replacement=await base(); resolve(replacement);await assert.rejects(pending,{name:'AbortError'}); assert.equal(replacement.destroyed,1);
 const x=setup(),other=await createStudyRuntime({canvas:x.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},x.deps);
 x.deps.createRenderer=async()=>{throw new Error('GPU unavailable');};
 await assert.rejects(other.update({varnishWear:0}),/GPU unavailable/);other.destroy();assert.equal(x.renderers[0].destroyed,1);
});
test('bad URLs, cancelled loads and invalid geometry fail without a renderer',async()=>{
 const s=setup();await assert.rejects(createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/other.gltf'},s.deps),/reviewed/);
 const ac=new AbortController();ac.abort();await assert.rejects(createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf',signal:ac.signal},s.deps),{name:'AbortError'});
 s.deps.load=async()=>({...model,primitives:[]});await assert.rejects(createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},s.deps),/geometry/);
 assert.equal(s.renderers.length,0);
});

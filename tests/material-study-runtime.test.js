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

test('resolution caps preserve portrait and landscape proportions without replacing resources',async t=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'devicePixelRatio');
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'devicePixelRatio',previous);else delete globalThis.devicePixelRatio;});
 Object.defineProperty(globalThis,'devicePixelRatio',{configurable:true,writable:true,value:2});
 const s=setup();s.canvas.clientWidth=500;s.canvas.clientHeight=1000;
 const study=await createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},s.deps);
 t.after(()=>study.destroy());
 assert.deepEqual([s.canvas.width,s.canvas.height],[720,1440]);
 const camera=s.frames[0].camera;
 for(const [width,height,dpr,expected] of [
  [700,768,2,[1313,1440]], [1000,500,2,[1440,720]],
  [700,700,2,[1400,1400]], [800,500,1,[800,500]],
  [800,500,3,[1440,900]], [500,1000,1,[500,1000]],
 ]) {
  s.canvas.clientWidth=width;s.canvas.clientHeight=height;globalThis.devicePixelRatio=dpr;
  study.resize();
  assert.deepEqual([s.canvas.width,s.canvas.height],expected,`${width}x${height} at DPR${dpr}`);
  assert.equal(s.frames.at(-1).camera,camera);
 }
 for(const dpr of [0.75,1,2,4])for(const [width,height] of [[500,1000],[1000,500],[700,768],[700,700],[1,100000],[100000,1]]) {
  s.canvas.clientWidth=width;s.canvas.clientHeight=height;globalThis.devicePixelRatio=dpr;
  study.resize();
  assert.ok(s.canvas.width>=1 && s.canvas.width<=1440);
  assert.ok(s.canvas.height>=1 && s.canvas.height<=1440);
  // Compare the shorter edge with the aspect implied by the longer edge;
  // allow one pixel for rounding and the minimum one-pixel buffer size.
  if(width<=height)assert.ok(Math.abs(s.canvas.width-s.canvas.height*width/height)<=1);
  else assert.ok(Math.abs(s.canvas.height-s.canvas.width*height/width)<=1);
  assert.equal(s.frames.at(-1).camera,camera);
 }
 assert.equal(s.renderers.length,1);assert.equal(s.cameras.length,1);
 assert.equal(s.renderers[0].destroyed,0);assert.equal(s.cameras[0].destroyed,0);
});

test('hidden material canvases skip drawing and recover at the current orientation',async t=>{
 const s=setup(),study=await createStudyRuntime({canvas:s.canvas,modelUrl:'https://example.test/wooden_crate_01.gltf'},s.deps);
 t.after(()=>study.destroy());
 const before=s.frames.length,buffer=[s.canvas.width,s.canvas.height],camera=s.frames[0].camera;
 for(const [width,height] of [[0,500],[800,0],[0,0]]) {
  s.canvas.clientWidth=width;s.canvas.clientHeight=height;
  study.resize();s.cameras[0].onChange();
  assert.equal(s.frames.length,before);assert.deepEqual([s.canvas.width,s.canvas.height],buffer);
 }
 s.canvas.clientWidth=500;s.canvas.clientHeight=1000;study.resize();
 assert.equal(s.frames.length,before+1);assert.equal(s.frames.at(-1).camera,camera);
 assert.equal(s.renderers.length,1);assert.equal(s.cameras.length,1);
});

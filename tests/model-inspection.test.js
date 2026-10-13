import test from 'node:test';
import assert from 'node:assert/strict';
import { createInspectionRuntime } from '../src/model-inspection-runtime.js';
import { createModelInspection } from '../src/model-inspection.js';

const url = 'http://localhost/models/door/scene.gltf';
const options = () => ({canvas:{width:640,height:480},modelUrl:url,
  enabled:true,integrity:{[url]:'sha256-'+'A'.repeat(43)+'='}});
function fixture() {
  const calls=[];
  const renderer={renderOnce:()=>calls.push('render'),updateCamera:c=>calls.push(c),
    device:{destroy:()=>calls.push('device.destroy'),queue:{onSubmittedWorkDone:async()=>{}}},destroy:()=>calls.push('destroy')};
  const deps={load:async(u,o)=>{calls.push(o);return {primitives:[{indices:[0,1,2]}]};},
    meshes:()=>[{id:1},{id:1000,material:{transmission:1}}],
    renderer:async o=>{calls.push(o);return renderer;},
    camera:o=>{calls.push(o);return {read:()=>o.camera,reset:()=>o.onChange(),destroy:()=>calls.push('camera.destroy')};}};
  return {calls,deps,renderer};
}
test('disabled or invalid fixtures cannot allocate renderer resources',async()=>{
  const {deps,calls}=fixture();
  for(const patch of [{enabled:false},{integrity:{}},{modelUrl:'file:///secret'},
    {width:5000},{height:NaN},{canvas:null},{integrity:{[url]:'bad'}}]) {
    await assert.rejects(createInspectionRuntime({...options(),...patch},deps));
  }
  assert.equal(calls.length,0);
  await assert.rejects(createModelInspection(),/enabled/);
});
test('preserves model materials, reuses camera and releases exactly once',async()=>{
  const {deps,calls}=fixture();const abort=new AbortController();
  const runtime=await createInspectionRuntime({...options(),signal:abort.signal,width:800,height:600},deps);
  assert.equal(runtime.triangleCount,1);assert.equal(runtime.primitiveCount,1);
  assert.equal(calls[0].integrity[url],options().integrity[url]);
  assert.equal(calls[1].meshes.length,1);
  assert.equal(calls[1].meshes[0].material.transmission,1);
  runtime.reset();await runtime.draw();abort.abort();runtime.destroy();
  assert.equal(calls.filter(c=>c==='destroy').length,1);
  assert.equal(calls.filter(c=>c==='device.destroy').length,1);
  assert.equal(calls.filter(c=>c==='camera.destroy').length,1);
  await runtime.draw();
});
test('load failures, oversized meshes and aborted late allocation fail closed',async()=>{
  let f=fixture();f.deps.load=async()=>{throw new Error('hash mismatch');};
  await assert.rejects(createInspectionRuntime(options(),f.deps),/hash mismatch/);
  f=fixture();f.deps.load=async()=>({primitives:[{indices:{length:1500003}}]});
  await assert.rejects(createInspectionRuntime(options(),f.deps),/triangle/);
  f=fixture();f.deps.load=async()=>({primitives:[]});
  await assert.rejects(createInspectionRuntime(options(),f.deps),/triangle/);
  f=fixture();const abort=new AbortController();f.deps.renderer=async()=>{abort.abort();return f.renderer;};
  await assert.rejects(createInspectionRuntime({...options(),signal:abort.signal},f.deps),/abort/i);
  assert.equal(f.calls.filter(c=>c==='destroy').length,1);
  f=fixture();f.deps.camera=()=>{throw new Error('camera failed');};
  await assert.rejects(createInspectionRuntime(options(),f.deps),/camera failed/);
  assert.equal(f.calls.filter(c=>c==='destroy').length,1);
});
test('render errors are visible, and initial abort performs no loading',async()=>{
  const f=fixture();const errors=[];
  const runtime=await createInspectionRuntime({...options(),onError:e=>errors.push(e.message)},f.deps);
  f.renderer.renderOnce=()=>{throw new Error('GPU lost');};
  await assert.rejects(runtime.draw(),/GPU lost/);assert.deepEqual(errors,['GPU lost']);
  assert.equal(f.calls.filter(c=>c==='destroy').length,1);
  const abort=new AbortController();abort.abort();const g=fixture();
  await assert.rejects(createInspectionRuntime({...options(),signal:abort.signal},g.deps));
  assert.equal(g.calls.length,0);
});
test('cancellation releases a pending GPU wait promptly',async()=>{
  const f=fixture(),abort=new AbortController();
  f.renderer.device.queue.onSubmittedWorkDone=()=>new Promise(()=>{});
  const ready=createInspectionRuntime({...options(),signal:abort.signal},f.deps);
  await new Promise(resolve=>setImmediate(resolve));abort.abort();
  await assert.rejects(ready,/abort/i);
  assert.equal(f.calls.filter(c=>c==='destroy').length,1);
});

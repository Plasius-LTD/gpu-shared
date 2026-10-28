import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectionBatchSize, inspectionQuality } from '../src/model-inspection-quality.js';
import { createInspectionRuntime } from '../src/model-inspection-runtime.js';
import { createModelInspection, createSceneInspection } from '../src/model-inspection.js';

const url = 'http://localhost/models/door/scene.gltf';
const options = () => ({canvas:{width:640,height:480},modelUrl:url,
  enabled:true,integrity:{[url]:'sha256-'+'A'.repeat(43)+'='}});
function fixture() {
  const calls=[];
  const renderer={resetAccumulation:()=>calls.push('reset'),renderOnce:quality=>{assert.ok(quality.samplesPerPixel<=calls.findLast(c=>c?.meshes).samplesPerPixel,'submitted batch exceeds allocated renderer capacity');calls.push('render');},updateCamera:c=>calls.push(c),
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
  await assert.rejects(createSceneInspection(),/explicitly enabled/);
});
test('preserves model materials, reuses camera and releases exactly once',async()=>{
  const {deps,calls}=fixture();const abort=new AbortController();
  const runtime=await createInspectionRuntime({...options(),signal:abort.signal,width:800,height:600},deps);
  assert.equal(runtime.triangleCount,1);assert.equal(runtime.primitiveCount,1);
  assert.equal(calls[0].integrity[url],options().integrity[url]);
  assert.equal(calls.find(c=>c?.meshes).meshes.length,1);
  assert.equal(calls.find(c=>c?.meshes).meshes[0].material.transmission,1);
  runtime.reset();await runtime.draw();abort.abort();runtime.destroy();
  assert.equal(calls.filter(c=>c==='destroy').length,1);
  assert.equal(calls.filter(c=>c==='device.destroy').length,1);
  assert.equal(calls.filter(c=>c==='camera.destroy').length,1);
  await runtime.draw();
});
test('load failures, malformed meshes and aborted late allocation fail closed',async()=>{
  let f=fixture();f.deps.load=async()=>{throw new Error('hash mismatch');};
  await assert.rejects(createInspectionRuntime(options(),f.deps),/hash mismatch/);
  f=fixture();f.deps.load=async()=>({primitives:[{indices:{length:1.5}}]});
  await assert.rejects(createInspectionRuntime(options(),f.deps),/triangle/);
  f=fixture();f.deps.load=async()=>({primitives:[]});
  await assert.rejects(createInspectionRuntime(options(),f.deps),/triangle/);
  f=fixture();const abort=new AbortController();f.deps.renderer=async()=>{abort.abort();return f.renderer;};
  await assert.rejects(createInspectionRuntime({...options(),signal:abort.signal},f.deps),/abort/i);
  assert.equal(f.calls.filter(c=>c==='destroy').length,1);
  f=fixture();f.deps.camera=()=>{throw new Error('camera failed');};
  await assert.rejects(createInspectionRuntime(options(),f.deps),/camera failed/);
  assert.equal(f.calls.filter(c=>c==='destroy').length,0);
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

test('quality controls bound work and preserve camera while rebuilding the renderer',async()=>{
  const f=fixture(),progress=[];
  const runtime=await createInspectionRuntime({...options(),quality:{samplesPerPixel:16},onProgress:p=>progress.push(p)},f.deps);
  assert.equal(f.calls.find(c=>c?.meshes).progressive,true);
  assert.equal(progress.at(-1).samples,1);
  const cameras=f.calls.filter(c=>c?.onChange).length;
  await runtime.setQuality({maxDepth:10,denoise:false,width:480,height:360});
  const last=f.calls.filter(c=>c?.meshes).at(-1);
  assert.equal(last.maxDepth,10);assert.equal(last.denoise,false);assert.equal(last.width,480);
  assert.equal(f.calls.filter(c=>c?.onChange).length,cameras);
  await assert.rejects(runtime.setQuality({samplesPerPixel:257}),/quality/i);
  for(const patch of [null,[],{canvas:{}},{tileSize:4096}])await assert.rejects(runtime.setQuality(patch),/quality/);
  runtime.destroy();
});
test('idle refinement stops at the exact target and pauses while hidden',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout','Date']});
  const f=fixture(),progress=[];
  const runtime=await createInspectionRuntime({...options(),quality:{samplesPerPixel:6},onProgress:p=>progress.push(p)},f.deps);
  const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
  t.mock.timers.tick(199);await flush();assert.equal(progress.at(-1).samples,1);
  runtime.setPaused(true);t.mock.timers.tick(500);await flush();assert.equal(progress.at(-1).samples,1);
  runtime.setPaused(false);t.mock.timers.tick(200);await flush();assert.equal(progress.at(-1).samples,5);
  t.mock.timers.tick(200);await flush();assert.equal(progress.at(-1).samples,6);
  assert.equal(progress.at(-1).phase,'complete');
  const count=f.calls.filter(c=>c==='render').length;t.mock.timers.tick(1000);await flush();assert.equal(f.calls.filter(c=>c==='render').length,count);
  await runtime.draw();assert.equal(progress.at(-1).samples,1);
  runtime.destroy();
});

test('camera changes during a pending batch discard stale progress and coalesce to latest camera',async()=>{
  const f=fixture(),progress=[];
  const runtime=await createInspectionRuntime({...options(),onProgress:p=>progress.push(p)},f.deps);
  let done;f.renderer.device.queue.onSubmittedWorkDone=()=>new Promise(resolve=>{done=resolve;});
  const pending=runtime.draw();runtime.draw();runtime.draw();
  f.renderer.device.queue.onSubmittedWorkDone=async()=>{};done();await pending;
  assert.equal(progress.at(-1).samples,1);
  assert.equal(f.calls.filter(c=>c==='render').length,3);
  runtime.destroy();
});
test('a stalled GPU reports a timeout and cancels refinement; invalid qualities do not allocate',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture(),errors=[];
  const runtime=await createInspectionRuntime({...options(),onError:e=>errors.push(e.message)},f.deps);
  f.renderer.device.queue.onSubmittedWorkDone=()=>new Promise(()=>{});
  const pending=runtime.draw();const rejected=assert.rejects(pending,/timed out/);
  t.mock.timers.tick(60000);await rejected;assert.match(errors[0],/timed out/);
  runtime.setPaused(false);await runtime.setQuality({samplesPerPixel:8});
  for(const quality of [{samplesPerPixel:0},{maxDepth:13},{denoise:'yes'}]) {
    await assert.rejects(createInspectionRuntime({...options(),quality},fixture().deps),/quality/);
  }
});
test('rapid quality changes reuse loaded meshes and keep the most recent settings',async()=>{
  const f=fixture();let loads=0;
  const load=f.deps.load;f.deps.load=async(...args)=>{loads++;return load(...args);};
  const runtime=await createInspectionRuntime(options(),f.deps);
  let complete;f.deps.renderer=o=>{f.calls.push(o);return new Promise(resolve=>{complete=()=>resolve(f.renderer);});};
  const first=runtime.setQuality({maxDepth:8});
  const last=runtime.setQuality({maxDepth:12,denoise:false});
  f.deps.renderer=async o=>{f.calls.push(o);return f.renderer;};complete();await first;await last;
  assert.equal(loads,1);assert.equal(f.calls.filter(c=>c?.meshes).at(-1).maxDepth,12);
  runtime.destroy();
});

test('UHD renders native pixels while oversized and over-budget targets fail before allocation',async()=>{
  const f=fixture();
  const runtime=await createInspectionRuntime({...options(),width:3840,height:2160,quality:{samplesPerPixel:1}},f.deps);
  const allocation=f.calls.find(c=>c?.meshes);
  assert.equal(allocation.width,3840);assert.equal(allocation.height,2160);
  for(const patch of [{width:3841},{width:3840,height:2161},{width:3000,height:3000}]) {
    await assert.rejects(runtime.setQuality(patch),/quality|pixel budget/);
  }
  assert.equal(f.calls.filter(c=>c?.meshes).length,1);
  await runtime.setQuality({width:2160,height:3840});
  assert.equal(f.calls.filter(c=>c?.meshes).at(-1).height,3840);
  runtime.destroy();
});

test('identical quality changes preserve completed history without rendering again',async()=>{
  const f=fixture(),runtime=await createInspectionRuntime({...options(),width:3840,height:2160,quality:{samplesPerPixel:1}},f.deps);
  const renders=f.calls.filter(c=>c==='render').length,resets=f.calls.filter(c=>c==='reset').length;
  await runtime.setQuality({width:3840,height:2160,samplesPerPixel:1,maxDepth:6,denoise:true});
  assert.equal(f.calls.filter(c=>c==='render').length,renders);
  assert.equal(f.calls.filter(c=>c==='reset').length,resets);
  runtime.destroy();
});


test('UHD at twelve bounces completes 256 samples in single-sample submissions',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout','Date']});
  const f=fixture(),batches=[],progress=[];
  f.renderer.renderOnce=quality=>batches.push(quality.samplesPerPixel);
  const runtime=await createInspectionRuntime({...options(),width:3840,height:2160,
    quality:{samplesPerPixel:256,maxDepth:12},onProgress:p=>progress.push(p)},f.deps);
  for(let i=1;i<256;i++){
    t.mock.timers.tick(200);
    for(let j=0;j<15;j++)await Promise.resolve();
    assert.equal(progress.at(-1).samples,i+1);
  }
  assert.deepEqual(batches,Array(256).fill(1));
  assert.equal(progress.at(-1).phase,'complete');
  assert.deepEqual([progress.at(-1).width,progress.at(-1).height,progress.at(-1).maxDepth],[3840,2160,12]);
  t.mock.timers.tick(1000);
  for(let j=0;j<15;j++)await Promise.resolve();
  assert.equal(batches.length,256);
  runtime.destroy();
});


test('batch budget scales with pixel count and depth without changing quality',()=>{
  for(const [width,height,maxDepth,expected] of [
    [800,600,6,4],[1920,1080,4,2],[1920,1080,8,1],[3840,2160,12,1],
    [2160,3840,12,1],[1024,1024,4,4],[1025,1024,4,3],
  ]){
    const quality=inspectionQuality({width,height,maxDepth,samplesPerPixel:256});
    assert.equal(inspectionBatchSize(quality,0),1);
    assert.equal(inspectionBatchSize(quality,1),expected);
    assert.equal(inspectionBatchSize(quality,255),1);
    assert.equal(inspectionBatchSize(quality,256),0);
  }
});

test('inspection delegates geometry admission to the renderer byte budget rather than 500K triangles',async()=>{
  const f=fixture();f.deps.load=async()=>({primitives:[{indices:{length:1800000}}]});
  const runtime=await createInspectionRuntime({...options(),memoryBudgetBytes:512*1024*1024},f.deps);
  assert.equal(runtime.triangleCount,600000);
  assert.equal(f.calls.find(c=>c?.meshes).memoryBudgetBytes,512*1024*1024);runtime.destroy();
});

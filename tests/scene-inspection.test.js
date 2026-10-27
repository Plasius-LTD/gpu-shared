import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneInspectionRuntime } from '../src/scene-inspection.js';
import { createProductStudioMeshes } from '../src/product-studio-runtime.js';

const source = (key, patch = {}) => ({
  modelUrl: `https://models.test/${key}.gltf`,
  integrity: { [`https://models.test/${key}.gltf`]: `sha256-${'A'.repeat(43)}=` },
  anchor: [0, 0, 0], size: 2, yaw: 0, ...patch,
});
const options = (models = [source('a'), source('b')]) => ({
  canvas: {}, enabled: true, models, quality: { samplesPerPixel: 1 },
});
function fixture() {
  const texture = { width: 1, height: 1, data: new Uint8Array(4) };
  const material = { roughness: .6, baseColorTexture: texture };
  const primitive = { positions: [-1, -2, 0, 1, -2, 0, 0, 2, 0],
    normals: [0, 0, 1, 0, 0, 1, 0, 0, 1], indices: [0, 1, 2], material };
  const model = { primitives: [primitive, primitive] };
  const calls = [];
  const renderer = { resetAccumulation() {}, updateCamera() {}, renderOnce() {},
    device: { queue: { onSubmittedWorkDone: async () => {} }, destroy: () => calls.push('device.destroy') },
    destroy: () => calls.push('renderer.destroy') };
  const deps = { load: async (url, config) => { calls.push({ url, config }); return model; },
    meshes: createProductStudioMeshes,
    renderer: async config => { calls.push(config); return renderer; },
    camera: config => ({ read: () => config.camera, reset: config.onChange,
      destroy: () => calls.push('camera.destroy') }) };
  return { deps, calls, model, texture };
}
test('places intact models on a shared ground with isolated identities and rotated normals', async () => {
  const f = fixture(), before = structuredClone(f.model);
  const runtime = await createSceneInspectionRuntime(options([
    source('a', { anchor: [2, 0, 1], yaw: Math.PI / 2 }),
    source('b', { anchor: [-2, 1, 0] }),
  ]), f.deps);
  const meshes = f.calls.find(c => c.meshes).meshes;
  assert.equal(meshes.length, 5);
  assert.equal(new Set(meshes.map(m => m.id)).size, 5);
  const [floor, a, a2, b] = meshes;
  assert.equal(Math.min(...floor.positions.filter((_, i) => i % 3 === 1)), 0);
  assert.equal(Math.min(...a.positions.filter((_, i) => i % 3 === 1)), 0);
  assert.equal(Math.max(...a.positions.filter((_, i) => i % 3 === 1)), 2);
  assert.equal(Math.min(...b.positions.filter((_, i) => i % 3 === 1)), 1);
  assert.ok(Math.abs(a.positions[0] - 2) < 1e-10);
  assert.ok(Math.abs(a.positions[2] - 1.5) < 1e-10);
  assert.ok(Math.abs(a.normals[0] - 1) < 1e-10);
  assert.ok(Math.abs(a.normals[2]) < 1e-10);
  assert.equal(a.materialRefId, a2.materialRefId);
  assert.notEqual(a.materialRefId, b.materialRefId);
  assert.equal(a.baseColorTexture, f.texture);
  assert.equal(a.material.roughness, .6);
  assert.deepEqual(f.model, before);
  assert.equal(runtime.triangleCount, 6); // Four source triangles plus the ground.
  assert.equal(runtime.modelCount, 2);
  assert.equal(runtime.textureBytes, 4);
  runtime.destroy(); runtime.destroy();
  for (const name of ['camera.destroy', 'renderer.destroy', 'device.destroy']) {
    assert.equal(f.calls.filter(c => c === name).length, 1);
  }
});
test('invalid source lists, transforms and manifests perform no loading', async () => {
  const f = fixture();
  const invalid = [[], Array.from({ length: 7 }, (_, i) => source(`source-${i}`)),
    Array.from({ length: 129 }, () => source('a')), null,
    [source('a', { anchor: [0, -1, 0] })], [source('a', { anchor: [NaN, 0, 0] })],
    [source('a', { size: .1 })], [source('a', { yaw: Infinity })],
    [source('a', { modelUrl: 'file:///private/model.gltf' })],
    [source('a', { integrity: {} })], [source('a', { integrity: { x: 'invalid' } })]];
  for (const models of invalid) await assert.rejects(createSceneInspectionRuntime(options(models), f.deps));
  await assert.rejects(createSceneInspectionRuntime({ ...options(), enabled: false }, f.deps));
  assert.equal(f.calls.length, 0);
});
test('invalid geometry and decoded CPU texture budgets reject before GPU allocation', async () => {
  const f = fixture();
  f.deps.load = async () => ({ primitives: [{ indices: { length: 1.5 } }] });
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /triangle/i);
  f.deps.load = async () => ({ primitives: [{ ...f.model.primitives[0],
    material: { baseColorTexture: { data: new Uint8Array(128 * 1024 * 1024 + 1) } } }] });
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /texture/i);
  f.deps.load = async () => ({ primitives: [] });
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /triangle/i);
  assert.equal(f.calls.some(c => c.meshes), false);
});
test('sequential loading stops on cancellation and on missing external integrity', async () => {
  const f = fixture(), abort = new AbortController(); let loads = 0;
  f.deps.load = async (url, config) => {
    loads++; assert.equal(config.signal.aborted, false);
    assert.equal(config.integrity[url], source('a').integrity[source('a').modelUrl]);
    abort.abort(); return f.model;
  };
  await assert.rejects(createSceneInspectionRuntime({ ...options(), signal: abort.signal }, f.deps), /abort/i);
  assert.equal(loads, 1); assert.equal(f.calls.length, 0);
  f.deps.load = async () => { throw new Error('Missing integrity for texture.png'); };
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /Missing integrity/);
});
test('composites share the existing UHD, quality, pause, reset and timeout lifecycle', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = fixture();
  const runtime = await createSceneInspectionRuntime(options(), f.deps);
  await runtime.setQuality({ width: 3840, height: 2160, denoise: false, maxDepth: 8 });
  assert.equal(f.calls.filter(c => c.meshes).at(-1).width, 3840);
  runtime.setPaused(true); runtime.reset(); runtime.setPaused(false);
  runtime.destroy();
  f.deps.load = () => new Promise(() => {});
  const stalled = createSceneInspectionRuntime(options(), f.deps);
  const rejected = assert.rejects(stalled, /timed out/);
  t.mock.timers.tick(60000); await rejected;
});

test('absent normals remain absent while malformed projected geometry fails closed', async () => {
  const f = fixture();
  delete f.model.primitives[0].normals;
  const runtime = await createSceneInspectionRuntime(options([source('a', { yaw: undefined })]), f.deps);
  assert.equal(f.calls.find(c => c.meshes).meshes[1].normals, null);
  runtime.destroy();
  f.deps.meshes = () => [];
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /invalid mesh/);
  f.deps.meshes = () => [{ id: 1000, positions: [NaN] }, { id: 1001, positions: [0] }];
  await assert.rejects(createSceneInspectionRuntime(options(), f.deps), /invalid geometry/);
});

for (const count of [50, 100, 128]) {
  test(`${count} placements load one source and share materials without sharing transformed positions`, async () => {
    const f = fixture(); let projections = 0;
    f.deps.meshes = (...args) => { projections++; return createProductStudioMeshes(...args); };
    const placements = Array.from({ length: count }, (_, i) => source('astronaut', {
      anchor: [(i % 10) - 5, 0, Math.floor(i / 10) - 6], yaw: i * .01,
    }));
    const before = structuredClone(placements);
    const runtime = await createSceneInspectionRuntime(options(placements), f.deps);
    const meshes = f.calls.find(c => c.meshes).meshes;
    assert.equal(f.calls.filter(c => c.url).length, 1);
    assert.equal(projections, 1);
    assert.equal(runtime.modelCount, count);
    assert.equal(runtime.sourceCount, 1);
    assert.equal(runtime.geometryMode, 'expanded');
    assert.equal(runtime.triangleCount, count * 2 + 2);
    assert.equal(new Set(meshes.map(m => m.id)).size, count * 2 + 1);
    assert.equal(new Set(meshes.slice(1).map(m => m.materialRefId)).size, 1);
    assert.equal(new Set(meshes.slice(1).map(m => m.baseColorTexture)).size, 1);
    assert.notEqual(meshes[1].positions, meshes[3].positions);
    assert.notDeepEqual(meshes[1].positions, meshes[3].positions);
    assert.deepEqual(placements, before);
    assert.equal(runtime.textureBytes, 4);
    runtime.destroy();
  });
}

test('source reuse checks canonical manifest equality before I/O', async () => {
  const f = fixture(), a = source('a'), url = a.modelUrl;
  const b = source('a', { integrity: { [url]: `sha256-${'B'.repeat(43)}=` } });
  await assert.rejects(createSceneInspectionRuntime(options([a, b]), f.deps), /conflicting.*integrity/i);
  assert.equal(f.calls.length, 0);
  const extra = 'https://models.test/texture.png', hash = `sha256-${'C'.repeat(43)}=`;
  const runtime = await createSceneInspectionRuntime(options([
    source('a', { integrity: { [extra]: hash, ...a.integrity } }),
    source('a', { integrity: { ...a.integrity, [extra]: hash } }),
  ]), f.deps);
  assert.equal(runtime.sourceCount, 1);
  assert.equal(f.calls.filter(c => c.url).length, 1);
  runtime.destroy();
});

test('validates source triangles before projecting or allocating scene geometry', async () => {
  const f = fixture(); let projections = 0, loads = 0;
  f.deps.load = async () => { loads++; return { primitives: [{ indices: { length: 1.5 } }] }; };
  f.deps.meshes = () => { projections++; return []; };
  await assert.rejects(createSceneInspectionRuntime(options(
    Array.from({ length: 50 }, () => source('a'))), f.deps), /triangle count/i);
  assert.equal(loads, 1);
  assert.equal(projections, 0);
  assert.equal(f.calls.some(c => c.meshes), false);
});

test('projects repeated sources once per requested size and retains source material identity', async () => {
  const f = fixture(); let projections = 0;
  f.deps.meshes = (...args) => { projections++; return createProductStudioMeshes(...args); };
  const runtime = await createSceneInspectionRuntime(options([
    source('a', { size: 1 }), source('a', { size: 2 }), source('a', { size: 1 }), source('b'),
  ]), f.deps);
  const meshes = f.calls.find(c => c.meshes).meshes;
  assert.equal(projections, 3);
  assert.equal(runtime.sourceCount, 2);
  assert.equal(meshes[1].materialRefId, meshes[3].materialRefId);
  assert.notEqual(meshes[1].materialRefId, meshes[7].materialRefId);
  assert.equal(Math.max(...meshes[1].positions.filter((_, i) => i % 3 === 1)), 1);
  assert.equal(Math.max(...meshes[3].positions.filter((_, i) => i % 3 === 1)), 2);
  runtime.destroy();
});

test('instanced scenes retain unique geometry across 100 varied-size placements and quality rebuilds',async()=>{
  const f=fixture();let projections=0;f.deps.meshes=(...args)=>{projections++;return createProductStudioMeshes(...args);};
  const renderer=f.deps.renderer;
  f.deps.renderer=async config=>({...await renderer(config),getSnapshot:()=>({instanceCount:config.instances.length,allocations:{allocatedBytes:1234,budgetBytes:4096}})});
  const placements=Array.from({length:100},(_,i)=>source('a',{anchor:[i%10,0,Math.floor(i/10)],size:i%2?1:2,yaw:i*.1}));
  const runtime=await createSceneInspectionRuntime({...options(placements),instancing:true,memoryBudgetBytes:4096},f.deps);
  const config=f.calls.find(c=>c.meshes);
  assert.equal(projections,1);assert.equal(config.meshes.length,3);assert.equal(config.instances.length,201);
  assert.equal(runtime.geometryMode,'instanced');assert.equal(runtime.triangleCount,4);assert.equal(runtime.instanceCount,201);
  assert.equal(config.memoryBudgetBytes,4096);assert.equal(runtime.getAllocationSnapshot().allocatedBytes,1234);
  assert.equal(new Set(config.instances.map(i=>i.id)).size,201);
  assert.equal(config.instances[1].meshId,config.instances[3].meshId);
  const meshes=config.meshes,instances=config.instances;await runtime.setQuality({width:1920,height:1080});
  const rebuilt=f.calls.filter(c=>c.meshes).at(-1);assert.equal(rebuilt.meshes,meshes);assert.equal(rebuilt.instances,instances);
  runtime.destroy();
});
test('instancing refuses an older renderer instead of silently drawing one source',async()=>{
  const f=fixture();await assert.rejects(createSceneInspectionRuntime({...options(),instancing:true},f.deps),/instanc/i);
  assert.ok(f.calls.includes('renderer.destroy'));
});
test('instancing and byte-budget options fail before network requests when malformed',async()=>{
  for(const patch of [{instancing:'yes'},{memoryBudgetBytes:0},{memoryBudgetBytes:Infinity}]){
    const f=fixture();await assert.rejects(createSceneInspectionRuntime({...options(),...patch},f.deps));assert.equal(f.calls.length,0);
  }
});

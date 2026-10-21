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
  const invalid = [[], Array.from({ length: 7 }, () => source('a')), null,
    [source('a', { anchor: [0, -1, 0] })], [source('a', { anchor: [NaN, 0, 0] })],
    [source('a', { size: .1 })], [source('a', { yaw: Infinity })],
    [source('a', { modelUrl: 'file:///private/model.gltf' })],
    [source('a', { integrity: {} })], [source('a', { integrity: { x: 'invalid' } })]];
  for (const models of invalid) await assert.rejects(createSceneInspectionRuntime(options(models), f.deps));
  await assert.rejects(createSceneInspectionRuntime({ ...options(), enabled: false }, f.deps));
  assert.equal(f.calls.length, 0);
});
test('aggregate geometry and decoded texture budgets reject before GPU allocation or the next model', async () => {
  const f = fixture();
  f.deps.load = async () => ({ primitives: [{ indices: { length: 1500000 } }] });
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

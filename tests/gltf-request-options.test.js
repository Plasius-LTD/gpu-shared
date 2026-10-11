import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGltfModel } from '../src/gltf-loader.js';

test('aborted model loads fail before network access or inline fallback', async () => {
  const controller = new AbortController(); controller.abort();
  const old = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('must not fetch'); };
  try { await assert.rejects(loadGltfModel('https://example.test/model.gltf', { signal: controller.signal }), { name: 'AbortError' }); }
  finally { globalThis.fetch = old; }
});
test('a declared asset integrity manifest fails closed for unlisted resources', async () => {
  const old = globalThis.fetch, seen = [], controller = new AbortController();
  globalThis.fetch = async (url, options) => { seen.push([String(url), options]); return {ok: true, url: String(url), json: async () => ({buffers: [{uri:'mesh.bin'}]})}; };
  try {
    await assert.rejects(loadGltfModel('https://example.test/model.gltf', { signal: controller.signal,
      integrity: { 'https://example.test/model.gltf': 'sha256-reviewed' } }), /integrity manifest/);
    assert.equal(seen.length, 1); assert.equal(seen[0][1].signal, controller.signal);
    assert.equal(seen[0][1].integrity, 'sha256-reviewed');
  } finally { globalThis.fetch = old; }
});

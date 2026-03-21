import test from "node:test";
import assert from "node:assert/strict";

import {
  loadGltfModel,
  mountGpuShowcase,
  resolveShowcaseAssetUrl,
  showcaseFocusModes,
} from "../src/index.js";

test("public API exports the shared showcase entrypoints", () => {
  assert.equal(typeof mountGpuShowcase, "function");
  assert.equal(typeof loadGltfModel, "function");
  assert.equal(typeof resolveShowcaseAssetUrl, "function");
});

test("showcase focus modes remain stable for family demos", () => {
  assert.deepEqual(showcaseFocusModes, [
    "integrated",
    "lighting",
    "cloth",
    "fluid",
    "physics",
    "performance",
    "debug",
  ]);
});

test("showcase asset resolution targets the shared brigantine asset", () => {
  const url = resolveShowcaseAssetUrl("file:///tmp/dist/index.js");
  assert.equal(url.href, "file:///tmp/assets/brigantine.gltf");
});

test("loadGltfModel delegates through the shared loader", async () => {
  const originalFetch = globalThis.fetch;
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  const indices = new Uint16Array([0, 1, 2]);
  const bytes = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(indices.buffer),
  ]);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ uri: `data:application/octet-stream;base64,${bytes.toString("base64")}` }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      {
        buffer: 0,
        byteOffset: positions.byteLength,
        byteLength: indices.byteLength,
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
      },
      {
        bufferView: 1,
        componentType: 5123,
        count: 3,
        type: "SCALAR",
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
          },
        ],
      },
    ],
    nodes: [
      {
        name: "ship",
        mesh: 0,
        extras: {
          physics: {
            shape: "box",
          },
        },
      },
    ],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });

  try {
    const model = await loadGltfModel("https://example.test/brigantine.gltf");
    assert.equal(model.name, "ship");
    assert.equal(model.indices.length, 3);
    assert.equal(model.physics.shape, "box");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mountGpuShowcase delegates to the injected runtime loader", async () => {
  const calls = [];
  const result = await mountGpuShowcase({
    root: { id: "app" },
    focus: "physics",
    __runtimeLoader: async () => ({
      async mountGpuShowcase(options) {
        calls.push(options);
        return { ok: true };
      },
    }),
  });

  assert.deepEqual(calls, [
    {
      root: { id: "app" },
      focus: "physics",
    },
  ]);
  assert.deepEqual(result, { ok: true });
});

import test from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "@plasius/translations";

import {
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
  createGpuSharedTranslator,
  createProductStudioMeshes,
  gpuSharedEnGbTranslations,
  gpuSharedTranslationKeys,
  gpuSharedTranslations,
  loadGltfModel,
  mountGpuProductStudio,
  mountGpuShowcase,
  resolveShowcaseAssetUrl,
  showcaseDemoModes,
  showcaseFocusModes,
  translateGpuSharedText,
} from "../src/index.js";
import * as gpuSharedPublicApi from "../src/index.js";

test("public API exports the shared showcase entrypoints", () => {
  assert.equal(typeof mountGpuShowcase, "function");
  assert.equal(typeof mountGpuProductStudio, "function");
  assert.equal(typeof createProductStudioMeshes, "function");
  assert.equal(Object.hasOwn(gpuSharedPublicApi, "createProductStudioSceneObjects"), false);
  assert.equal(typeof loadGltfModel, "function");
  assert.equal(typeof resolveShowcaseAssetUrl, "function");
  assert.equal(typeof translateGpuSharedText, "function");
  assert.equal(typeof createGpuSharedTranslator, "function");
  assert.equal(GPU_SHOWCASE_REALISTIC_MODELS_FEATURE, "gpu_showcase_realistic_models_v1");
  assert.equal(
    GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
    "gpu_showcase_product_studio_wavefront_v1"
  );
});

test("showcase translation keys resolve through bundled en-GB defaults", () => {
  const keys = Object.values(gpuSharedTranslationKeys);
  assert.equal(keys.length > 0, true);
  assert.equal(keys.every((key) => Object.hasOwn(gpuSharedEnGbTranslations, key)), true);
  assert.equal(
    translateGpuSharedText(gpuSharedTranslationKeys.statusLive, { fps: "59.9" }),
    "3D scene live - 59.9 FPS"
  );
  assert.equal(
    createGpuSharedTranslator((key, args) =>
      key === gpuSharedTranslationKeys.debugAdapterShowcase
        ? `Localized ${args?.adapter ?? "showcase"}`
        : undefined
    )(gpuSharedTranslationKeys.debugAdapterShowcase, { adapter: "adapter" }),
    "Localized adapter"
  );
});

test("showcase dictionaries can be consumed by @plasius/translations", () => {
  const i18n = createI18n({
    language: "en-GB",
    fallback: "en-GB",
    translations: gpuSharedTranslations,
  });

  assert.equal(
    i18n.t(gpuSharedTranslationKeys.debugMainColorBuffer),
    "Main color buffer"
  );
  assert.equal(
    i18n.t(gpuSharedTranslationKeys.statusLive, { fps: "60.0" }),
    "3D scene live - 60.0 FPS"
  );
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
  assert.deepEqual(showcaseDemoModes, ["harbor", "product-studio"]);
});

test("mountGpuShowcase routes product studio mode to the product runtime loader", async () => {
  let receivedOptions = null;
  const featureFlags = {
    enabled: {
      [GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE]: true,
    },
  };
  const result = await mountGpuShowcase({
    demoMode: "product-studio",
    productAssetUrl: "/data/eames.gltf",
    __featureFlags: featureFlags,
    __productRuntimeLoader: async () => ({
      async mountGpuProductStudio(options, featureFlags) {
        receivedOptions = options;
        return {
          state: { featureFlags },
          destroy() {},
        };
      },
    }),
  });

  assert.equal(receivedOptions.productAssetUrl, "/data/eames.gltf");
  assert.equal(receivedOptions.__productRuntimeLoader, undefined);
  assert.equal(result.state.featureFlags, featureFlags);
});

test("mountGpuShowcase fails closed when product studio feature flag is disabled", async () => {
  let productRuntimeLoaded = false;
  await assert.rejects(
    () =>
      mountGpuShowcase({
        demoMode: "product-studio",
        __featureFlags: {
          enabled: {
            [GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE]: false,
          },
        },
        __productRuntimeLoader: async () => {
          productRuntimeLoaded = true;
          return {};
        },
      }),
    /gpu_showcase_product_studio_wavefront_v1 must be enabled/u
  );
  assert.equal(productRuntimeLoaded, false);
});

test("showcase asset resolution targets the shared brigantine asset", () => {
  const url = resolveShowcaseAssetUrl("file:///tmp/dist/index.js");
  assert.equal(url.href, "file:///tmp/assets/brigantine.gltf");
});

test("showcase asset resolution can target the richer shared asset catalog", () => {
  const url = resolveShowcaseAssetUrl("file:///tmp/dist/index.js", "lighthouse");
  const cutterUrl = resolveShowcaseAssetUrl("cutter");
  assert.equal(url.href, "file:///tmp/assets/lighthouse.gltf");
  assert.match(cutterUrl.href, /cutter\.gltf$/);
});

test("showcase asset resolution falls back to an inline asset when the base URL is invalid", () => {
  const url = resolveShowcaseAssetUrl("");
  assert.match(url.href, /\/assets\/brigantine\.gltf$/);
});

test("loadGltfModel can load the inline fallback asset URL", async () => {
  const model = await loadGltfModel(resolveShowcaseAssetUrl(""));
  assert.equal(model.name, "brigantine");
  assert.equal(model.indices.length > 0, true);
  assert.equal(model.physics.shape, "box");
  assert.equal(model.primitives.length >= 3, true);
  assert.equal(model.primitives.some((primitive) => primitive.material.name === "sail-canvas"), true);
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
    assert.equal(model.primitives.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadGltfModel aggregates large mesh primitives without spread-call overflow", async () => {
  const originalFetch = globalThis.fetch;
  const vertexCount = 70_000;
  const positions = new Float32Array(vertexCount * 3);
  for (let index = 0; index < vertexCount; index += 1) {
    const offset = index * 3;
    positions[offset] = index % 1024;
    positions[offset + 1] = Math.floor(index / 1024);
    positions[offset + 2] = index % 7;
  }
  const indices = new Uint32Array([0, 1, 2]);
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
        count: vertexCount,
        type: "VEC3",
      },
      {
        bufferView: 1,
        componentType: 5125,
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
    nodes: [{ name: "large-mesh", mesh: 0 }],
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
    const model = await loadGltfModel("https://example.test/large.gltf");
    assert.equal(model.name, "large-mesh");
    assert.equal(model.positions.length, vertexCount * 3);
    assert.equal(model.indices.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadGltfModel resolves external buffers against response.url when the request URL is relative", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
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
    buffers: [{ uri: "./brigantine.bin" }],
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
  const fetchCalls = [];

  globalThis.window = { location: { href: "https://plasius.co.uk/gpu-demo" } };
  globalThis.fetch = async (input) => {
    const href = input instanceof URL ? input.href : String(input);
    fetchCalls.push(href);

    if (fetchCalls.length === 1) {
      assert.equal(href, "/assets/brigantine.gltf");
      return {
        ok: true,
        url: "https://plasius.co.uk/assets/brigantine.gltf",
        async json() {
          return document;
        },
      };
    }

    assert.equal(href, "https://plasius.co.uk/assets/brigantine.bin");
    return {
      ok: true,
      async arrayBuffer() {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    };
  };

  try {
    const model = await loadGltfModel("/assets/brigantine.gltf");
    assert.deepEqual(fetchCalls, [
      "/assets/brigantine.gltf",
      "https://plasius.co.uk/assets/brigantine.bin",
    ]);
    assert.equal(model.name, "ship");
    assert.equal(model.indices.length, 3);
    assert.equal(model.physics.shape, "box");
    assert.equal(model.primitives.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("mountGpuShowcase delegates to the injected runtime loader", async () => {
  const calls = [];
  const destroy = () => undefined;
  const result = await mountGpuShowcase({
    root: { id: "app" },
    focus: "physics",
    __runtimeLoader: async () => ({
      async mountGpuShowcase(options) {
        calls.push(options);
        return { ok: true, destroy };
      },
    }),
  });

  assert.deepEqual(calls, [
    {
      root: { id: "app" },
      focus: "physics",
    },
  ]);
  assert.deepEqual(result, { ok: true, destroy });
});

test("showcase runtime exposes an idempotent destroy hook for browser consumers", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  const listenerRegistry = new Map();
  const removals = [];

  function createControl(id, extra = {}) {
    return {
      id,
      textContent: "",
      checked: false,
      value: "",
      addEventListener(type, handler) {
        listenerRegistry.set(`${id}:${type}`, handler);
      },
      removeEventListener(type, handler) {
        removals.push(`${id}:${type}`);
        assert.equal(listenerRegistry.get(`${id}:${type}`), handler);
        listenerRegistry.delete(`${id}:${type}`);
      },
      ...extra,
    };
  }

  const elements = {
    "#demoStatus": { textContent: "" },
    "#demoDetails": { textContent: "" },
    "#demoCanvas": {
      width: 1280,
      height: 720,
      getContext() {
        return {};
      },
    },
    "#pauseButton": createControl("pauseButton"),
    "#stressToggle": createControl("stressToggle"),
    "#focusMode": createControl("focusMode", { value: "integrated" }),
    "#sceneMetrics": { innerHTML: "" },
    "#qualityMetrics": { innerHTML: "" },
    "#debugMetrics": { innerHTML: "" },
    "#sceneNotes": { innerHTML: "" },
  };

  const root = {
    innerHTML: "<p>placeholder</p>",
    querySelector(selector) {
      return elements[selector] ?? null;
    },
  };

  const styleElements = new Map();
  const documentStub = {
    body: root,
    head: {
      appendChild(node) {
        if (node?.id) {
          styleElements.set(node.id, node);
        }
      },
    },
    createElement(tag) {
      return {
        tagName: String(tag).toUpperCase(),
        id: "",
        textContent: "",
      };
    },
    getElementById(id) {
      return styleElements.get(id) ?? null;
    },
  };

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

  const cancelledFrames = [];

  globalThis.document = documentStub;
  globalThis.window = {
    location: { search: "" },
    render_game_to_text: () => "previous",
    advanceTime: () => undefined,
  };
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = () => 42;
  globalThis.cancelAnimationFrame = (handle) => {
    cancelledFrames.push(handle);
  };

  try {
    const module = await import("../src/showcase-runtime.js");
    const showcase = await module.mountGpuShowcase({
      root,
      packageName: "@plasius/gpu-demo-viewer",
    });

    assert.equal(typeof showcase.destroy, "function");
    assert.notEqual(root.innerHTML, "<p>placeholder</p>");

    showcase.destroy();
    showcase.destroy();

    assert.deepEqual(cancelledFrames, [42]);
    assert.equal(root.innerHTML, "<p>placeholder</p>");
    assert.deepEqual(removals.sort(), [
      "focusMode:change",
      "pauseButton:click",
      "stressToggle:change",
    ]);
    assert.equal(globalThis.window.render_game_to_text(), "previous");
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  }
});

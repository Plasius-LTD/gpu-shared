import test from "node:test";
import assert from "node:assert/strict";

import {
  GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
  loadGltfModel,
  mountGpuProductStudio,
  mountGpuShowcase,
  resolveShowcaseAssetUrl,
  showcaseDemoModes,
  showcaseFocusModes,
} from "../src/index.js";

test("public API exports the shared showcase entrypoints", () => {
  assert.equal(typeof mountGpuShowcase, "function");
  assert.equal(typeof mountGpuProductStudio, "function");
  assert.equal(typeof loadGltfModel, "function");
  assert.equal(typeof resolveShowcaseAssetUrl, "function");
  assert.equal(
    GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
    "gpu-renderer.hit-driven-pathtrace.enabled"
  );
  assert.equal(
    GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
    "gpu_showcase_realistic_models_v1"
  );
  assert.equal(
    GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
    "gpu_showcase_product_studio_v1"
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
});

test("showcase demo modes include the product studio route", () => {
  assert.deepEqual(showcaseDemoModes, ["harbor", "product-studio"]);
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
  assert.match(url.href, /^data:application\/json;base64,/);
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

test("loadGltfModel preserves UVs and path-tracing material texture descriptors", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2]);
  const bytes = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(normals.buffer),
    Buffer.from(uvs.buffer),
    Buffer.from(indices.buffer),
  ]);
  const document = {
    asset: { version: "2.0" },
    buffers: [{ uri: "./product.bin" }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
      {
        buffer: 0,
        byteOffset: positions.byteLength,
        byteLength: normals.byteLength,
      },
      {
        buffer: 0,
        byteOffset: positions.byteLength + normals.byteLength,
        byteLength: uvs.byteLength,
      },
      {
        buffer: 0,
        byteOffset: positions.byteLength + normals.byteLength + uvs.byteLength,
        byteLength: indices.byteLength,
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 3, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    images: [
      { uri: "leather-base.jpg" },
      { uri: "leather-normal.png" },
      { uri: "leather-roughness.jpg" },
      { uri: "glow.png" },
    ],
    textures: [
      { source: 0, name: "leather-base" },
      { source: 1, name: "leather-normal" },
      { source: 2, name: "leather-roughness" },
      { source: 3, name: "button-glow" },
    ],
    materials: [
      {
        name: "leather",
        alphaMode: "MASK",
        alphaCutoff: 0.42,
        pbrMetallicRoughness: {
          baseColorFactor: [0.8, 0.7, 0.6, 0.9],
          baseColorTexture: {
            index: 0,
            extensions: {
              KHR_texture_transform: {
                offset: [0.15, 0.2],
                scale: [0.7, 0.7],
                texCoord: 0,
              },
            },
          },
          metallicRoughnessTexture: { index: 2 },
          metallicFactor: 0.1,
          roughnessFactor: 0.38,
        },
        normalTexture: { index: 1, scale: 0.8 },
        emissiveFactor: [0.05, 0.02, 0.01],
      },
      {
        name: "button",
        emissiveTexture: { index: 3 },
        extensions: {
          KHR_materials_specular: {
            specularFactor: 0.6,
            specularColorFactor: [1, 0.9, 0.8],
          },
          KHR_materials_transmission: {
            transmissionFactor: 0.2,
          },
          KHR_materials_ior: {
            ior: 1.42,
          },
        },
      },
    ],
    meshes: [
      {
        name: "chair",
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 1,
          },
        ],
      },
    ],
    nodes: [{ name: "product", mesh: 0 }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
  const fetchCalls = [];

  globalThis.window = { location: { href: "https://plasius.co.uk/studio/" } };
  globalThis.fetch = async (input) => {
    const href = input instanceof URL ? input.href : String(input);
    fetchCalls.push(href);
    if (fetchCalls.length === 1) {
      return {
        ok: true,
        url: "https://plasius.co.uk/assets/eames/product.gltf",
        async json() {
          return document;
        },
      };
    }
    return {
      ok: true,
      async arrayBuffer() {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    };
  };

  try {
    const model = await loadGltfModel("/assets/eames/product.gltf");
    assert.deepEqual(fetchCalls, [
      "/assets/eames/product.gltf",
      "https://plasius.co.uk/assets/eames/product.bin",
    ]);
    assert.equal(model.primitives.length, 2);
    assert.equal(model.materials.length, 2);

    const leather = model.primitives[0];
    assert.equal(leather.meshName, "chair");
    assert.equal(leather.materialIndex, 0);
    assert.deepEqual(leather.uvs, Array.from(uvs));
    assert.equal(leather.tangentSpace.source, "generated-from-uv-normal-position");
    assert.equal(
      leather.material.baseColorTexture.uri,
      "https://plasius.co.uk/assets/eames/leather-base.jpg"
    );
    assert.deepEqual(leather.material.baseColorTexture.transform.offset, [0.15, 0.2]);
    assert.deepEqual(leather.material.baseColorTexture.transform.scale, [0.7, 0.7]);
    assert.equal(
      leather.material.normalTexture.uri,
      "https://plasius.co.uk/assets/eames/leather-normal.png"
    );
    assert.equal(leather.material.normalTexture.scale, 0.8);
    assert.equal(
      leather.material.metallicRoughnessTexture.uri,
      "https://plasius.co.uk/assets/eames/leather-roughness.jpg"
    );
    assert.equal(leather.material.alphaMode, "MASK");
    assert.equal(leather.material.alphaCutoff, 0.42);
    assert.deepEqual(leather.material.emissiveFactor, [0.05, 0.02, 0.01]);

    const button = model.primitives[1];
    assert.equal(
      button.material.emissiveTexture.uri,
      "https://plasius.co.uk/assets/eames/glow.png"
    );
    assert.deepEqual(button.material.specular.colorFactor, [1, 0.9, 0.8]);
    assert.equal(button.material.transmission.factor, 0.2);
    assert.equal(button.material.ior, 1.42);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

test("mountGpuShowcase delegates to the injected runtime loader", async () => {
  const calls = [];
  const featureFlagCalls = [];
  const destroy = () => undefined;
  const featureFlags = {
    [GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE]: false,
  };
  const result = await mountGpuShowcase({
    root: { id: "app" },
    focus: "physics",
    featureFlags,
    __featureFlags: {
      [GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE]: true,
    },
    __runtimeLoader: async () => ({
      async mountGpuShowcase(options, runtimeFeatureFlags) {
        calls.push(options);
        featureFlagCalls.push(runtimeFeatureFlags);
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
  assert.deepEqual(featureFlagCalls, [featureFlags]);
  assert.deepEqual(result, { ok: true, destroy });
});

test("mountGpuShowcase routes product studio mode to the product runtime loader", async () => {
  const calls = [];
  const featureFlags = {
    [GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE]: true,
  };
  const result = await mountGpuShowcase({
    root: { id: "app" },
    mode: "product-studio",
    productAssetUrl: "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf",
    featureFlags,
    __productRuntimeLoader: async () => ({
      async mountGpuProductStudio(options, runtimeFeatureFlags) {
        calls.push({ options, runtimeFeatureFlags });
        return { ok: true, destroy() {} };
      },
    }),
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    {
      options: {
        root: { id: "app" },
        mode: "product-studio",
        productAssetUrl:
          "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf",
      },
      runtimeFeatureFlags: featureFlags,
    },
  ]);
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

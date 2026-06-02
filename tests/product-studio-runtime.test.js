import test from "node:test";
import assert from "node:assert/strict";

import {
  __testOnlyBuildProductStudioCamera,
  __testOnlyBuildProductTriangles,
  mountGpuProductStudio,
  resolveProductMaterialColor,
  resolveProductStudioAssetUrl,
  sampleProductTexture,
} from "../src/product-studio-runtime.js";
import { GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE } from "../src/index.js";

function createCanvasContext() {
  const operations = [];
  const push = (type, ...args) => {
    operations.push({ type, args });
  };
  const createGradient = (type, args) => ({
    addColorStop(offset, color) {
      push(`${type}:stop`, ...args, offset, color);
    },
  });

  return {
    operations,
    createLinearGradient(...args) {
      push("createLinearGradient", ...args);
      return createGradient("linearGradient", args);
    },
    createRadialGradient(...args) {
      push("createRadialGradient", ...args);
      return createGradient("radialGradient", args);
    },
    fillRect(...args) {
      push("fillRect", ...args);
    },
    beginPath() {
      push("beginPath");
    },
    ellipse(...args) {
      push("ellipse", ...args);
    },
    moveTo(...args) {
      push("moveTo", ...args);
    },
    lineTo(...args) {
      push("lineTo", ...args);
    },
    closePath() {
      push("closePath");
    },
    fill() {
      push("fill");
    },
    save() {
      push("save");
    },
    restore() {
      push("restore");
    },
  };
}

function createControl(id, registry, removals, extra = {}) {
  return {
    id,
    value: "",
    textContent: "",
    addEventListener(type, handler) {
      registry.set(`${id}:${type}`, handler);
    },
    removeEventListener(type, handler) {
      removals.push(`${id}:${type}`);
      assert.equal(registry.get(`${id}:${type}`), handler);
      registry.delete(`${id}:${type}`);
    },
    ...extra,
  };
}

function createProductHarness({ search = "" } = {}) {
  const ctx = createCanvasContext();
  const registry = new Map();
  const removals = [];
  const classNames = new Set();
  const styles = new Map();
  const elements = {
    "#productCanvas": {
      width: 800,
      height: 520,
      clientWidth: 800,
      clientHeight: 520,
      getBoundingClientRect() {
        return { width: 800, height: 520 };
      },
      getContext() {
        return ctx;
      },
    },
    "#productPauseButton": createControl("productPauseButton", registry, removals),
    "#productAngle": createControl("productAngle", registry, removals, { value: "hero" }),
    "#productQuality": createControl("productQuality", registry, removals, { value: "max" }),
    "#productStatus": { textContent: "" },
    "#productMetrics": { innerHTML: "" },
  };
  const root = {
    innerHTML: "<p>before</p>",
    classList: {
      add(name) {
        classNames.add(name);
      },
      remove(name) {
        classNames.delete(name);
      },
      contains(name) {
        return classNames.has(name);
      },
    },
    querySelector(selector) {
      return elements[selector] ?? null;
    },
  };
  const documentStub = {
    body: root,
    head: {
      appendChild(node) {
        styles.set(node.id, node);
      },
    },
    createElement(tag) {
      return { tagName: String(tag).toUpperCase(), id: "", textContent: "" };
    },
    getElementById(id) {
      return styles.get(id) ?? null;
    },
  };

  return {
    ctx,
    elements,
    root,
    registry,
    removals,
    styles,
    classNames,
    documentStub,
    windowStub: {
      location: {
        search,
        href: "https://plasius.co.uk/gpu-shared/demo/",
      },
      render_game_to_text: () => "previous-text",
      advanceTime: () => "previous-time",
    },
  };
}

function createProductDocument() {
  const positions = new Float32Array([
    -0.4, 0, -0.2,
    0.4, 0, -0.2,
    -0.2, 0.55, 0.22,
    0.45, 0.04, 0.2,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
    0, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
    1, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2, 1, 3, 2]);
  const bytes = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(normals.buffer),
    Buffer.from(uvs.buffer),
    Buffer.from(indices.buffer),
  ]);

  return {
    bytes,
    document: {
      asset: { version: "2.0" },
      buffers: [{ uri: "./eames.bin" }],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
        { buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength },
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
        { bufferView: 0, componentType: 5126, count: 4, type: "VEC3" },
        { bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
        { bufferView: 2, componentType: 5126, count: 4, type: "VEC2" },
        { bufferView: 3, componentType: 5123, count: 6, type: "SCALAR" },
      ],
      images: [
        { uri: "leather.jpg" },
        { uri: "leather-normal.png" },
      ],
      textures: [
        { source: 0, name: "leather-base" },
        { source: 1, name: "leather-normal" },
      ],
      materials: [
        {
          name: "Eames_Lounge_Chair_Ottoman_Leather_",
          pbrMetallicRoughness: {
            baseColorFactor: [0.05, 0.05, 0.05, 1],
            baseColorTexture: { index: 0 },
            roughnessFactor: 0.32,
          },
          normalTexture: { index: 1, scale: 0.75 },
        },
      ],
      meshes: [
        {
          name: "eames",
          primitives: [
            {
              attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
              indices: 3,
              material: 0,
            },
          ],
        },
      ],
      nodes: [{ name: "eames-chair", mesh: 0 }],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
  };
}

test("product studio asset URL defaults to the local Eames data folder", () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: {
      href: "https://plasius.co.uk/gpu-shared/demo/",
      search: "",
    },
  };
  try {
    assert.equal(
      resolveProductStudioAssetUrl(),
      "https://plasius.co.uk/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf"
    );
  } finally {
    globalThis.window = originalWindow;
  }
});

test("product studio texture sampling applies transforms and material factors", () => {
  const texture = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255,
    ]),
  };
  const textureInfo = {
    uri: "memory://texture",
    transform: { offset: [0, 0], scale: [1, 1], rotation: 0 },
  };
  const sample = sampleProductTexture(texture, { u: 0.75, v: 0.75 }, textureInfo);
  assert.deepEqual(sample, { r: 0, g: 1, b: 0, a: 1 });

  const materialColor = resolveProductMaterialColor(
    {
      color: { r: 1, g: 1, b: 1, a: 1 },
      baseColorFactor: [0.5, 0.25, 1, 1],
      baseColorTexture: textureInfo,
    },
    { u: 0.75, v: 0.75 },
    new Map([["memory://texture", texture]])
  );
  assert.deepEqual(materialColor, { r: 0, g: 0.25, b: 0, a: 1 });
});

test("mountGpuProductStudio renders, exposes text state, and restores browser hooks", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const harness = createProductHarness({ search: "?mode=product-studio&quality=max" });
  const fixture = createProductDocument();
  const animationFrames = [];
  const cancelledFrames = [];
  let nextAnimationFrameId = 1;

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  delete globalThis.createImageBitmap;
  globalThis.fetch = async (input) => {
    const href = input instanceof URL ? input.href : String(input);
    if (href.endsWith(".gltf")) {
      return {
        ok: true,
        url: "https://plasius.co.uk/data/models/eames/product.gltf",
        async json() {
          return fixture.document;
        },
      };
    }
    return {
      ok: true,
      async arrayBuffer() {
        return fixture.bytes.buffer.slice(
          fixture.bytes.byteOffset,
          fixture.bytes.byteOffset + fixture.bytes.byteLength
        );
      },
    };
  };
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.push({ id, callback });
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelledFrames.push(id);
  };

  try {
    const studio = await mountGpuProductStudio({
      root: harness.root,
      productAssetUrl: "https://plasius.co.uk/data/models/eames/product.gltf",
      frameExport: true,
    });

    assert.equal(studio.productModel.name, "eames-chair");
    assert.equal(harness.classNames.has("plasius-product-studio-root"), true);
    assert.equal(harness.styles.has("plasius-product-studio-style"), true);
    assert.equal(animationFrames.length, 1);

    animationFrames.shift().callback(16.7);
    assert.ok(harness.ctx.operations.length > 10);
    assert.match(harness.elements["#productStatus"].textContent, /eames-chair rendered/);
    const textState = JSON.parse(globalThis.window.render_game_to_text());
    assert.equal(textState.mode, "product-studio");
    assert.equal(textState.productStudioEnabled, true);
    assert.equal(textState.textureUris.length, 2);
    assert.equal(textState.triangles.total, 2);

    const capture = globalThis.window.__plasiusCaptureFrame({ stepMs: 16.7 });
    assert.equal(capture.mode, "product-studio");
    assert.equal(capture.texturesLoaded, 0);

    harness.elements["#productAngle"].value = "turntable";
    harness.registry.get("productAngle:change")();
    harness.elements["#productQuality"].value = "preview";
    harness.registry.get("productQuality:change")();
    globalThis.window.advanceTime(100);
    assert.equal(studio.state.angle, "turntable");
    assert.equal(studio.state.quality, "preview");

    const camera = __testOnlyBuildProductStudioCamera(
      studio.productModel,
      harness.elements["#productCanvas"],
      studio.state
    );
    const build = __testOnlyBuildProductTriangles(
      studio.productModel,
      camera,
      { width: 800, height: 520 },
      studio.state
    );
    assert.equal(build.totalTriangles, 2);
    assert.ok(build.submittedTriangles > 0);

    studio.destroy();
    studio.destroy();
    assert.deepEqual(harness.removals.sort(), [
      "productAngle:change",
      "productPauseButton:click",
      "productQuality:change",
    ]);
    assert.equal(harness.root.innerHTML, "<p>before</p>");
    assert.equal(globalThis.window.render_game_to_text(), "previous-text");
    assert.equal(globalThis.window.advanceTime(), "previous-time");
    assert.deepEqual(cancelledFrames, [2]);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.createImageBitmap = originalCreateImageBitmap;
  }
});

test("mountGpuProductStudio reports feature-flag disabled state without loading assets", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const harness = createProductHarness();
  let fetchCalled = false;

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("asset fetch should not run");
  };

  try {
    const studio = await mountGpuProductStudio(
      { root: harness.root },
      { [GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE]: false }
    );
    assert.equal(fetchCalled, false);
    assert.equal(studio.productModel, null);
    assert.match(harness.elements["#productStatus"].textContent, /disabled by feature flag/);
    assert.equal(JSON.parse(globalThis.window.render_game_to_text()).productStudioEnabled, false);
    studio.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

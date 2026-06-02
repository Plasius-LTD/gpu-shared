import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProductStudioSceneObjects,
  mountGpuProductStudio,
} from "../src/product-studio-runtime.js";

function createProductModel() {
  return Object.freeze({
    name: "Eames_Lounge_Chair_Ottoman",
    positions: Object.freeze([]),
    indices: Object.freeze(Array.from({ length: 300 }, (_, index) => index)),
    bounds: Object.freeze({
      min: Object.freeze([-2, -0.4, -1]),
      max: Object.freeze([2, 1.6, 1]),
    }),
    color: Object.freeze({ r: 0.4, g: 0.2, b: 0.1, a: 1 }),
    physics: Object.freeze({}),
    primitives: Object.freeze([
      Object.freeze({
        name: "wood-shell",
        positions: Object.freeze([]),
        indices: Object.freeze([0, 1, 2]),
        normals: null,
        colors: null,
        material: Object.freeze({
          name: "Eames_Lounge_Chair_Ottoman_Wood_",
          color: Object.freeze({ r: 0.56, g: 0.33, b: 0.22, a: 1 }),
          roughness: 0.25,
          metallic: 0,
          emissive: Object.freeze({ r: 0, g: 0, b: 0 }),
        }),
        bounds: Object.freeze({
          min: Object.freeze([-2, 0, -1]),
          max: Object.freeze([0.2, 1.4, 0.8]),
        }),
      }),
      Object.freeze({
        name: "chrome-base",
        positions: Object.freeze([]),
        indices: Object.freeze([0, 1, 2]),
        normals: null,
        colors: null,
        material: Object.freeze({
          name: "Eames_Lounge_Chair_Ottoman_Chrome_",
          color: Object.freeze({ r: 0.56, g: 0.55, b: 0.55, a: 1 }),
          roughness: 0.03,
          metallic: 0.8,
          emissive: Object.freeze({ r: 0, g: 0, b: 0 }),
        }),
        bounds: Object.freeze({
          min: Object.freeze([0.1, -0.4, -0.2]),
          max: Object.freeze([2, 0.2, 0.2]),
        }),
      }),
    ]),
  });
}

function installDomHarness() {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const classNames = new Set();
  const styles = new Map();
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {};
    },
  };
  const status = { textContent: "" };
  const root = {
    innerHTML: "<p>previous</p>",
    classList: {
      add(value) {
        classNames.add(value);
      },
      remove(value) {
        classNames.delete(value);
      },
    },
    querySelector(selector) {
      if (selector === "#productStudioCanvas") {
        return canvas;
      }
      if (selector === "#productStudioStatus") {
        return status;
      }
      return null;
    },
  };
  globalThis.document = {
    body: root,
    head: {
      appendChild(node) {
        styles.set(node.id, node);
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
      return styles.get(id) ?? null;
    },
  };
  globalThis.window = {};
  return {
    canvas,
    classNames,
    root,
    status,
    restore() {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    },
  };
}

test("product studio builds a renderer scene from model primitive bounds", () => {
  const sceneObjects = buildProductStudioSceneObjects(createProductModel());

  assert.equal(sceneObjects.length, 5);
  assert.equal(sceneObjects[0].kind, "box");
  assert.equal(sceneObjects[2].kind, "sphere");
  assert.equal(sceneObjects[2].materialKind, 5);
  assert.equal(sceneObjects[3].materialKind, 1);
  assert.equal(sceneObjects[4].materialKind, 2);
  assert.deepEqual(sceneObjects[3].color, [0.44, 0.24, 0.12, 1]);
});

test("product studio mounts the WebGPU wavefront renderer with model-derived objects", async () => {
  const harness = installDomHarness();
  let rendererOptions = null;
  let destroyed = false;
  try {
    const result = await mountGpuProductStudio({
      root: harness.root,
      productAssetUrl: "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf",
      width: 640,
      height: 360,
      maxDepth: 4,
      __modelLoader: async (url) => {
        assert.equal(
          url,
          "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf"
        );
        return createProductModel();
      },
      __rendererLoader: async () => ({
        rendererWavefrontComputeMode: "webgpu-compute",
        supportsWavefrontPathTracingCompute: () => true,
        async createWavefrontPathTracingComputeRenderer(options) {
          rendererOptions = options;
          return {
            async renderFrame() {
              return {
                outputProbe: { nonZeroSamples: 7, sampledPixels: 9, maxChannel: 255 },
                bounces: [],
                termination: { emissive: 1, environment: 0, ambientFallback: 0, maxDepth: 0 },
              };
            },
            destroy() {
              destroyed = true;
            },
          };
        },
      }),
    });

    assert.equal(rendererOptions.canvas, harness.canvas);
    assert.equal(rendererOptions.width, 640);
    assert.equal(rendererOptions.height, 360);
    assert.equal(rendererOptions.maxDepth, 4);
    assert.equal(rendererOptions.sceneObjects.length, 5);
    assert.equal(result.productModel.name, "Eames_Lounge_Chair_Ottoman");
    assert.equal(result.state.rendererMode, "webgpu-compute");
    assert.match(harness.status.textContent, /5 trace objects/);
    assert.match(globalThis.window.render_game_to_text(), /"mode":"product-studio"/);

    result.destroy();
    assert.equal(destroyed, true);
    assert.equal(harness.root.innerHTML, "<p>previous</p>");
    assert.equal(harness.classNames.has("plasius-product-studio-root"), false);
  } finally {
    harness.restore();
  }
});

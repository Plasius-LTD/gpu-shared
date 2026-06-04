import test from "node:test";
import assert from "node:assert/strict";

import {
  createProductStudioMeshes,
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
        positions: Object.freeze([-1, 0, -0.5, 0, 0.4, -0.25, -0.4, 0.9, 0.5]),
        indices: Object.freeze([0, 1, 2]),
        normals: Object.freeze([0, 1, 0, 0, 1, 0, 0, 1, 0]),
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
        positions: Object.freeze([0.1, -0.4, -0.2, 1.8, -0.3, 0.1, 1.2, 0.2, -0.1]),
        indices: Object.freeze([0, 1, 2]),
        normals: Object.freeze([0, 0, 1, 0, 0, 1, 0, 0, 1]),
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
  const children = [];
  const canvas = {
    width: 0,
    height: 0,
    dataset: {},
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
    ownerDocument: null,
    appendChild(node) {
      children.push(node);
      return node;
    },
    getBoundingClientRect() {
      return { width: 640, height: 360 };
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
      if (tag === "canvas") {
        return canvas;
      }
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
    children,
    classNames,
    root,
    status,
    restore() {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    },
  };
}

test("product studio builds triangle mesh inputs for display-quality rendering", () => {
  const meshes = createProductStudioMeshes(createProductModel());

  assert.equal(meshes.length, 6);
  assert.equal(meshes[0].indices.length, 6);
  assert.equal(meshes[3].materialKind, "emissive");
  assert.equal(meshes[4].materialKind, "diffuse");
  assert.equal(meshes[5].materialKind, "metal");
  assert.deepEqual(meshes[4].color, [0.56, 0.33, 0.22, 1]);
  assert.deepEqual(meshes[4].normals, [0, 1, 0, 0, 1, 0, 0, 1, 0]);
});

test("product studio mounts the WebGPU wavefront renderer with model-derived meshes", async () => {
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
      samplesPerPixel: 4,
      denoise: true,
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
            renderOnce() {
              return {
                frame: 1,
                triangleCount: 12,
                primaryRays: 921600,
              };
            },
            destroy() {
              destroyed = true;
            },
          };
        },
      }),
      __lightingLoader: async () => ({
        createWavefrontEnvironmentLightingOptions() {
          return {
            environmentColor: [0.35, 0.43, 0.49, 1],
            ambientColor: [0.02, 0.024, 0.028, 1],
          };
        },
      }),
    });

    assert.equal(rendererOptions.canvas, harness.canvas);
    assert.equal(rendererOptions.width, 640);
    assert.equal(rendererOptions.height, 360);
    assert.equal(rendererOptions.maxDepth, 4);
    assert.equal(rendererOptions.samplesPerPixel, 4);
    assert.equal(rendererOptions.denoise, true);
    assert.equal(rendererOptions.displayQuality, true);
    assert.equal(rendererOptions.meshes.length, 6);
    assert.equal(rendererOptions.sceneObjects, undefined);
    assert.equal(result.productModel.name, "Eames_Lounge_Chair_Ottoman");
    assert.equal(result.model.name, "Eames_Lounge_Chair_Ottoman");
    assert.equal(result.meshes.length, 6);
    assert.equal(result.state.geometryMode, "mesh-bvh-display-quality");
    assert.equal(result.state.requiresMeshBvhForDisplayQuality, true);
    assert.match(globalThis.window.render_game_to_text(), /"surface":"gpu-product-studio-wavefront"/);

    result.destroy();
    assert.equal(destroyed, true);
    assert.equal(harness.root.innerHTML, "<p>previous</p>");
    assert.equal(harness.classNames.has("plasius-product-studio-wavefront"), false);
  } finally {
    harness.restore();
  }
});

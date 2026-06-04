import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductStudioMeshes,
  mountGpuProductStudio,
} from "../src/index.js";

function createModelFixture() {
  return {
    name: "fixture-chair",
    bounds: {
      min: [-2, 0, -1],
      max: [2, 2, 1],
    },
    color: { r: 0.5, g: 0.4, b: 0.3, a: 1 },
    physics: {},
    positions: [],
    indices: [],
    primitives: [
      {
        name: "shell",
        positions: [
          -2, 0, -1,
          2, 0, -1,
          -2, 2, -1,
          2, 2, -1,
          -1, 0.4, 1,
          1, 0.4, 1,
          -1, 1.6, 1,
          1, 1.6, 1,
        ],
        indices: [0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6],
        normals: null,
        colors: null,
        bounds: {
          min: [-2, 0, -1],
          max: [2, 2, 1],
        },
        material: {
          name: "wood",
          color: { r: 0.42, g: 0.25, b: 0.12, a: 1 },
          roughness: 0.5,
          metallic: 0.1,
          emissive: { r: 0, g: 0, b: 0 },
        },
      },
      {
        name: "metal",
        positions: [
          -1, 0, -0.5,
          1, 0, -0.5,
          -1, 0.2, 0.5,
          1, 0.2, 0.5,
        ],
        indices: [0, 1, 2, 1, 3, 2],
        normals: null,
        colors: null,
        bounds: {
          min: [-1, 0, -0.5],
          max: [1, 0.2, 0.5],
        },
        material: {
          name: "chrome",
          color: { r: 0.8, g: 0.82, b: 0.84, a: 1 },
          roughness: 0.1,
          metallic: 0.9,
          emissive: { r: 0, g: 0, b: 0 },
        },
      },
    ],
  };
}

function createFakeDocument() {
  const styleElements = new Map();
  const head = {
    appendChild(element) {
      if (element.id) {
        styleElements.set(element.id, element);
      }
    },
  };
  const root = {
    innerHTML: "<p>previous</p>",
    ownerDocument: null,
    children: [],
    classList: {
      values: new Set(),
      add(value) {
        this.values.add(value);
      },
      remove(value) {
        this.values.delete(value);
      },
    },
    getBoundingClientRect() {
      return { width: 960, height: 540 };
    },
    appendChild(element) {
      this.children.push(element);
    },
  };
  const document = {
    head,
    body: root,
    getElementById(id) {
      return styleElements.get(id) ?? null;
    },
    createElement(name) {
      return {
        nodeName: name.toUpperCase(),
        id: "",
        style: {},
        dataset: {},
        textContent: "",
      };
    },
    querySelector() {
      return root;
    },
  };
  root.ownerDocument = document;
  return { document, root };
}

test("product studio meshes preserve GLTF primitive triangles for mesh BVH rendering", () => {
  const meshes = createProductStudioMeshes(createModelFixture());
  const modelMeshes = meshes.filter((mesh) => mesh.id >= 1000);

  assert.equal(modelMeshes.length, 2);
  assert.equal(modelMeshes[0].positions.length, 24);
  assert.equal(modelMeshes[0].indices.length, 12);
  assert.equal(modelMeshes[1].materialKind, "metal");
  assert.equal(meshes.some((mesh) => mesh.materialKind === "emissive"), true);
  assert.equal(meshes.every((mesh) => !Object.hasOwn(mesh, "bounds")), true);
  assert.equal(meshes.every((mesh) => !Object.hasOwn(mesh, "type")), true);
});

test("mountGpuProductStudio loads the model and delegates mesh BVH renderer inputs", async () => {
  const { document, root } = createFakeDocument();
  let rendererOptions = null;
  let destroyed = false;
  const result = await mountGpuProductStudio({
    document,
    root,
    productAssetUrl: "/data/model.gltf",
    lightingPreset: "product-studio",
    lightingIntensity: 1.15,
    __modelLoader: async (url) => {
      assert.equal(url, "/data/model.gltf");
      return createModelFixture();
    },
    __lightingLoader: async () => ({
      createWavefrontEnvironmentLightingOptions(options) {
        assert.deepEqual(options, {
          preset: "product-studio",
          intensity: 1.15,
        });
        return {
          environmentColor: [0.4, 0.5, 0.6, 1],
          ambientColor: [0.02, 0.03, 0.04, 1],
          environmentLighting: {
            horizonColor: [0.5, 0.6, 0.7, 1],
            zenithColor: [0.08, 0.1, 0.14, 1],
            sunDirection: [0, 1, 0],
            sunColor: [3, 2.8, 2.4, 1],
            intensity: 1.15,
          },
        };
      },
    }),
    __rendererLoader: async () => ({
      async createWavefrontPathTracingComputeRenderer(options) {
        rendererOptions = options;
        return {
          renderOnce() {
            return {
              frame: 1,
              width: options.width,
              height: options.height,
              maxDepth: options.maxDepth,
              samplesPerPixel: options.samplesPerPixel,
              screenRays: options.width * options.height,
              primaryRays: options.width * options.height * options.samplesPerPixel,
            };
          },
          destroy() {
            destroyed = true;
          },
        };
      },
    }),
  });

  assert.equal(result.state.modelName, "fixture-chair");
  assert.equal(result.state.sourceTriangleCount, 6);
  assert.equal(result.state.meshCount, result.meshes.length);
  assert.equal(result.state.geometryMode, "mesh-bvh-display-quality");
  assert.equal(result.state.requiresTriangleMeshRenderer, true);
  assert.equal(result.state.displayQuality, true);
  assert.equal(result.state.requiresMeshBvhForDisplayQuality, true);
  assert.equal(result.canvas.nodeName, "CANVAS");
  assert.equal(rendererOptions.width, 960);
  assert.equal(rendererOptions.height, 540);
  assert.equal(rendererOptions.displayQuality, true);
  assert.equal(rendererOptions.meshes.length, result.meshes.length);
  assert.equal(Object.hasOwn(rendererOptions, "sceneObjects"), false);
  assert.equal(rendererOptions.maxDepth, 6);
  assert.equal(rendererOptions.samplesPerPixel, 8);
  assert.equal(result.state.rendererStats.samplesPerPixel, 8);
  assert.equal(result.state.rendererStats.screenRays, 960 * 540);
  assert.equal(result.state.rendererStats.primaryRays, 960 * 540 * 8);
  assert.equal(result.productModel, result.model);
  const styleText = document.getElementById("plasius-product-studio-wavefront-style").textContent;
  assert.match(styleText, /aspect-ratio:\s*16 \/ 9/);
  assert.match(styleText, /object-fit:\s*contain/);
  assert.deepEqual(rendererOptions.environmentColor, [0.4, 0.5, 0.6, 1]);
  assert.deepEqual(rendererOptions.ambientColor, [0.02, 0.03, 0.04, 1]);
  assert.equal(rendererOptions.environmentLighting.intensity, 1.15);

  result.destroy();
  assert.equal(destroyed, true);
  assert.equal(root.innerHTML, "<p>previous</p>");
});

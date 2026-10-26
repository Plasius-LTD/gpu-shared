import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductStudioMeshes,
  loadPvoxModel,
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
          baseColorTexture: {
            width: 2,
            height: 2,
            texCoord: 0,
            data: new Uint8ClampedArray([
              64, 32, 16, 255,
              96, 48, 24, 255,
              128, 64, 32, 255,
              160, 80, 40, 255,
            ]),
          },
          normalTexture: {
            width: 2,
            height: 2,
            texCoord: 0,
            scale: 0.7,
            data: new Uint8ClampedArray([
              128, 128, 255, 255,
              128, 128, 255, 255,
              128, 128, 255, 255,
              128, 128, 255, 255,
            ]),
          },
        },
        uvs: [0, 0, 1, 0, 0, 1, 1, 1, 0.1, 0.2, 0.9, 0.2, 0.1, 0.8, 0.9, 0.8],
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
      contains(value) {
        return this.values.has(value);
      },
    },
    getBoundingClientRect() {
      return { width: 960, height: 540 };
    },
    appendChild(element) {
      this.children.push(element);
    },
  };
  let markup = root.innerHTML;
  Object.defineProperty(root, "innerHTML", {
    get() { return markup; },
    set(value) { markup = value; root.children = []; },
  });
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

test("loadPvoxModel validates PVOX and preserves decoded surface-property groups", async () => {
  const expectedArtifactSha256 = "a".repeat(64);
  const bytes = Uint8Array.from([0x50, 0x56, 0x4f, 0x58]);
  const decoded = {
    artifactSha256: expectedArtifactSha256,
    surfaces: [
      {
        surfaceIndex: 0,
        baseColor: [0.4, 0.2, 0.1, 1],
        roughness: 0.65,
        metallic: 0.1,
        specular: 0.8,
        emission: [0, 0, 0],
      },
      {
        surfaceIndex: 1,
        baseColor: [0.7, 0.72, 0.75, 1],
        roughness: 0.2,
        metallic: 0.9,
        specular: 1,
        emission: [0.05, 0.04, 0.03],
      },
    ],
  };
  const validatePvoxV1 = async (actualBytes, expectations) => {
    assert.deepEqual(actualBytes, bytes);
    assert.deepEqual(expectations, { artifactSha256: expectedArtifactSha256 });
    return decoded;
  };
  const createPvoxSurfaceMeshV1 = (actualDecoded) => {
    assert.equal(actualDecoded, decoded);
    return {
      representation: "pvox-derived-surface-cache",
      sourceArtifactSha256: expectedArtifactSha256,
      positions: new Float32Array([
        0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0,
        0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1,
      ]),
      normals: new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      ]),
      colors: new Float32Array([
        0.4, 0.2, 0.1, 1, 0.4, 0.2, 0.1, 1,
        0.4, 0.2, 0.1, 1, 0.4, 0.2, 0.1, 1,
        0.7, 0.72, 0.75, 1, 0.7, 0.72, 0.75, 1,
        0.7, 0.72, 0.75, 1, 0.7, 0.72, 0.75, 1,
      ]),
      surfaceIndices: new Uint32Array([0, 0, 0, 0, 1, 1, 1, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]),
      triangleCount: 4,
      bounds: { minimum: [0, 0, 0], maximum: [1, 1, 1] },
    };
  };

  const model = await loadPvoxModel("/api/gpu-demo/assets/model.pvox", {
    expectedArtifactSha256,
    fetch: async () => new Response(bytes, {
      status: 200,
      headers: { "Content-Type": "application/vnd.plasius.pvox" },
    }),
    moduleLoader: async () => ({ validatePvoxV1, createPvoxSurfaceMeshV1 }),
  });

  assert.equal(model.representation, "pvox");
  assert.equal(model.compatibilityProjection, "pvox-derived-surface-cache");
  assert.equal(model.sourceArtifactSha256, expectedArtifactSha256);
  assert.equal(model.primitives.length, 2);
  assert.equal(model.primitives[0].material.roughness, 0.65);
  assert.equal(model.primitives[1].material.metallic, 0.9);
  assert.deepEqual(model.primitives[1].material.emissive, {
    r: 0.05,
    g: 0.04,
    b: 0.03,
    a: 1,
  });
});

test("loadPvoxModel rejects MIME drift and oversized responses before PVOX validation", async () => {
  const validatePvoxV1 = async () => {
    throw new Error("validation must not be reached");
  };
  const moduleLoader = async () => ({
    PVOX_STATIC_MAXIMUM_ARTIFACT_BYTES_V1: 65_536,
    validatePvoxV1,
    createPvoxSurfaceMeshV1() {
      throw new Error("surface derivation must not be reached");
    },
  });

  await assert.rejects(
    loadPvoxModel("/api/gpu-demo/assets/model.pvox", {
      fetch: async () => new Response(Uint8Array.from([1]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      }),
      moduleLoader,
    }),
    /unexpected content type/u,
  );
  await assert.rejects(
    loadPvoxModel("/api/gpu-demo/assets/model.pvox", {
      fetch: async () => new Response(null, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.plasius.pvox",
          "Content-Length": "65537",
        },
      }),
      moduleLoader,
    }),
    /bounded artifact profile/u,
  );
});

test("product studio meshes preserve GLTF primitive triangles for mesh BVH rendering", () => {
  const meshes = createProductStudioMeshes(createModelFixture());
  const modelMeshes = meshes.filter((mesh) => mesh.id >= 1000);

  assert.equal(modelMeshes.length, 2);
  assert.equal(modelMeshes[0].positions.length, 24);
  assert.equal(modelMeshes[0].indices.length, 12);
  assert.deepEqual(modelMeshes[0].uvs, createModelFixture().primitives[0].uvs);
  assert.equal(modelMeshes[0].baseColorTexture.width, 2);
  assert.equal(modelMeshes[0].normalTexture.scale, 0.7);
  assert.deepEqual(modelMeshes[0].colors, createModelFixture().primitives[0].colors);
  assert.equal(modelMeshes[0].material.baseColorTexture.height, 2);
  assert.equal(modelMeshes[1].materialKind, "metal");
  assert.equal(meshes.some((mesh) => mesh.materialKind === "emissive"), true);
  assert.equal(meshes.every((mesh) => !Object.hasOwn(mesh, "bounds")), true);
  assert.equal(meshes.every((mesh) => !Object.hasOwn(mesh, "type")), true);
});

test("mountGpuProductStudio loads the model and delegates mesh BVH renderer inputs", async () => {
  const { document, root } = createFakeDocument();
  let rendererOptions = null;
  let destroyed = false;
  const featureFlags = {
    enabled: {
      "renderer.transport.strictPhysicalLowSppLighting": true,
      "renderer.transport.sourceStableDirectLighting.enabled": true,
      "renderer.transport.deterministicLowSppIndirect.enabled": true,
      "renderer.transport.stableSampleRouting.enabled": true,
      "renderer.transport.strictZeroOverflow.enabled": false,
      "renderer.transport.deferLowSppRussianRoulette.enabled": true,
      "renderer.transport.deterministicDirectLighting.enabled": false,
      "renderer.environment.productStudioImportance.enabled": true,
      "renderer.diagnostics.productTransportTelemetry.enabled": true,
    },
  };
  const result = await mountGpuProductStudio(
    {
      document,
      root,
      productAssetUrl: "/data/model.gltf",
      lightingPreset: "product-studio",
      lightingIntensity: 1.15,
      presentationOutput: "linear",
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
                transportContributions: {
                  directExplicitLuminance: 0.42,
                  cachedIndirectLuminance: 0.31,
                  stochasticResidualLuminance: 0.03,
                  zeroTerminationCount: 128,
                  deterministicChecksum: 123456,
                },
              };
            },
            destroy() {
              destroyed = true;
            },
          };
        },
      }),
    },
    featureFlags,
  );

  assert.equal(result.state.modelName, "fixture-chair");
  assert.equal(result.state.sourceTriangleCount, 6);
  assert.equal(result.state.meshCount, result.meshes.length);
  assert.equal(result.state.geometryMode, "mesh-bvh-display-quality");
  assert.equal(result.state.requiresTriangleMeshRenderer, true);
  assert.equal(result.state.displayQuality, true);
  assert.equal(result.state.requiresMeshBvhForDisplayQuality, true);
  assert.equal(result.canvas.nodeName, "CANVAS");
  assert.equal(rendererOptions.width, 640);
  assert.equal(rendererOptions.height, 360);
  assert.equal(rendererOptions.displayQuality, true);
  assert.equal(rendererOptions.presentationOutput, "linear");
  assert.equal(rendererOptions.meshes.length, result.meshes.length);
  assert.equal(Object.hasOwn(rendererOptions, "sceneObjects"), false);
  assert.equal(rendererOptions.featureFlags, featureFlags);
  assert.equal(rendererOptions.featureFlags.enabled["renderer.transport.stableSampleRouting.enabled"], true);
  assert.equal(rendererOptions.featureFlags.enabled["renderer.transport.sourceStableDirectLighting.enabled"], true);
  assert.equal(rendererOptions.featureFlags.enabled["renderer.transport.deterministicLowSppIndirect.enabled"], true);
  assert.equal(rendererOptions.featureFlags.enabled["renderer.transport.strictZeroOverflow.enabled"], false);
  assert.equal(rendererOptions.featureFlags.enabled["renderer.environment.productStudioImportance.enabled"], true);
  assert.equal(rendererOptions.maxDepth, 2);
  assert.equal(rendererOptions.samplesPerPixel, 8);
  assert.equal(result.state.rendererStats.samplesPerPixel, 8);
  assert.deepEqual(result.state.rendererStats.transportContributions, {
    directExplicitLuminance: 0.42,
    cachedIndirectLuminance: 0.31,
    stochasticResidualLuminance: 0.03,
    zeroTerminationCount: 128,
    deterministicChecksum: 123456,
  });
  assert.equal(result.state.rendererStats.screenRays, 640 * 360);
  assert.equal(result.state.rendererStats.primaryRays, 640 * 360 * 8);
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

test("mountGpuProductStudio selects the PVOX loader without falling back to GLTF", async () => {
  const { document, root } = createFakeDocument();
  const artifactSha256 = "b".repeat(64);
  const pvoxModel = {
    ...createModelFixture(),
    name: "uploaded-pvox-table",
    representation: "pvox",
    compatibilityProjection: "pvox-derived-surface-cache",
    sourceArtifactSha256: artifactSha256,
  };
  let rendererOptions = null;
  const result = await mountGpuProductStudio({
    document,
    root,
    productAssetUrl: "/api/gpu-demo/assets/pvox-demo/assets/table/hash/model.pvox",
    productAssetRepresentation: "pvox",
    productAssetSha256: artifactSha256,
    productAssetName: "Uploaded table",
    __modelLoader: async () => {
      throw new Error("GLTF loader must not be used for PVOX");
    },
    __pvoxModelLoader: async (url, options) => {
      assert.equal(url, "/api/gpu-demo/assets/pvox-demo/assets/table/hash/model.pvox");
      assert.equal(options.expectedArtifactSha256, artifactSha256);
      assert.equal(options.name, "Uploaded table");
      return pvoxModel;
    },
    __lightingLoader: async () => ({}),
    __rendererLoader: async () => ({
      async createWavefrontPathTracingComputeRenderer(options) {
        rendererOptions = options;
        return {
          renderOnce: () => ({ frame: 1 }),
          destroy() {},
        };
      },
    }),
  });

  assert.equal(result.state.modelName, "uploaded-pvox-table");
  assert.equal(result.state.sourceRepresentation, "pvox");
  assert.equal(result.state.compatibilityProjection, "pvox-derived-surface-cache");
  assert.equal(result.state.sourceArtifactSha256, artifactSha256);
  assert.equal(result.state.geometryMode, "pvox-derived-surface-cache-display-quality");
  assert.equal(rendererOptions.meshes.length, result.meshes.length);
  result.destroy();
});

test('actual Product Studio loader consumes enabled/disabled remote conversion decisions',async t=>{
  const {adapterFixture}=await import('./helpers/gltf-adapter-contract.js');
  const {document:source,bytes}=adapterFixture();
  t.mock.method(globalThis,'fetch',async url=>new Response(String(url).endsWith('.gltf')?JSON.stringify(source):bytes,{headers:{'content-type':String(url).endsWith('.gltf')?'model/gltf+json':'application/octet-stream'}}));
  for(const enabled of [true,false]){
    const {document,root}=createFakeDocument();let uploaded;
    const result=await mountGpuProductStudio({document,root,assetUrl:'https://example.test/model.gltf',
      __lightingLoader:async()=>null,__rendererLoader:async()=>({createWavefrontPathTracingComputeRenderer:async options=>{
        uploaded=options.meshes;return {renderOnce(){return {};},destroy(){}};
      }}),
    },{'gpu.model.conversion.enabled':enabled});
    assert.equal(result.model.importProfile,enabled?'gltf-static-resources-v1':undefined);
    assert.ok(uploaded.length>0);assert.equal(result.model.positions[0],10);result.destroy();
  }
});

const studioClass = "plasius-product-studio-wavefront";

function lifecycleFixture(overrides = {}) {
  const { document, root } = createFakeDocument();
  const calls = { allocated: 0, destroyed: 0, rendered: 0 };
  return {
    document, root, calls,
    options: {
      document, root,
      __modelLoader: async () => createModelFixture(),
      __lightingLoader: async () => null,
      __rendererLoader: async () => ({
        async createWavefrontPathTracingComputeRenderer() {
          calls.allocated++;
          return {
            renderOnce() { calls.rendered++; return {}; },
            destroy() { calls.destroyed++; },
          };
        },
      }),
      ...overrides,
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

for (const stage of ["model", "pvox", "module", "lighting", "lighting-options", "renderer", "draw"]) {
  test(`Product Studio rolls back ${stage} startup failure and permits retry`, async () => {
    const fixture = lifecycleFixture();
    const { options, root, calls } = fixture;
    const failure = new Error(`synthetic ${stage} failure`);
    const reject = async () => { throw failure; };
    if (stage === "model") options.__modelLoader = reject;
    if (stage === "pvox") {
      options.productAssetRepresentation = "pvox";
      options.__pvoxModelLoader = reject;
    }
    if (stage === "module") options.__rendererLoader = reject;
    if (stage === "lighting") options.__lightingLoader = reject;
    if (stage === "lighting-options") options.__lightingLoader = async () => ({
      createWavefrontEnvironmentLightingOptions() { throw failure; },
    });
    if (stage === "renderer" || stage === "draw") options.__rendererLoader = async () => ({
      async createWavefrontPathTracingComputeRenderer() {
        if (stage === "renderer") throw failure;
        calls.allocated++;
        return {
          renderOnce() { throw failure; },
          destroy() { calls.destroyed++; },
        };
      },
    });
    await assert.rejects(mountGpuProductStudio(options), error => error === failure);
    assert.equal(calls.destroyed, calls.allocated, "Every acquired renderer is released");
    assert.equal(root.innerHTML, "<p>previous</p>");
    assert.equal(root.children.length, 0);
    assert.equal(root.classList.contains(studioClass), false);
    const retry = await mountGpuProductStudio({ ...lifecycleFixture().options, document: fixture.document, root });
    retry.destroy();
    retry.destroy();
    assert.equal(root.innerHTML, "<p>previous</p>");
    assert.equal(root.classList.contains(studioClass), false);
  });
}

test("Product Studio restores state after invalid representation, geometry and renderer contract failures", async () => {
  for (const overrides of [
    { productAssetRepresentation: "unknown" },
    { __modelLoader: async () => ({ primitives: [] }) },
    { __rendererLoader: async () => ({}) },
  ]) {
    const { root, calls, options } = lifecycleFixture(overrides);
    await assert.rejects(mountGpuProductStudio(options));
    assert.equal(root.innerHTML, "<p>previous</p>");
    assert.equal(root.classList.contains(studioClass), false);
    assert.equal(calls.allocated, 0);
  }
});

test("Product Studio preserves caller classes and releases a successful renderer exactly once", async () => {
  const { root, calls, options } = lifecycleFixture();
  root.classList.add(studioClass);
  root.classList.add("caller-owned");
  const handle = await mountGpuProductStudio(options);
  handle.destroy();
  handle.destroy();
  assert.equal(calls.destroyed, 1);
  assert.equal(root.innerHTML, "<p>previous</p>");
  assert.deepEqual([...root.classList.values], [studioClass, "caller-owned"]);
});

test("Product Studio cleanup errors preserve startup failure and do not skip host restoration", async () => {
  const failure = new Error("first draw failed");
  let destroyed = 0;
  for (const drawFails of [true, false]) {
    const { root, options } = lifecycleFixture({
      __rendererLoader: async () => ({
        async createWavefrontPathTracingComputeRenderer() {
          return {
            renderOnce() { if (drawFails) throw failure; return {}; },
            destroy() { destroyed++; throw new Error("destroy failed"); },
          };
        },
      }),
    });
    root.classList.add(studioClass);
    if (drawFails) {
      await assert.rejects(mountGpuProductStudio(options), error => error === failure);
    } else {
      const handle = await mountGpuProductStudio(options);
      assert.throws(() => handle.destroy(), /destroy failed/);
      assert.doesNotThrow(() => handle.destroy());
    }
    assert.equal(root.innerHTML, "<p>previous</p>");
    assert.equal(root.classList.contains(studioClass), true);
  }
  assert.equal(destroyed, 2);
});

for (const stage of ["model", "renderer"]) {
  test(`A superseded ${stage} acquisition cannot replace or destroy the current mount`, async () => {
    const gate = deferred();
    const acquired = deferred();
    const fixture = lifecycleFixture();
    const { root, document, options, calls } = fixture;
    if (stage === "model") options.__modelLoader = () => { acquired.resolve(); return gate.promise; };
    else options.__rendererLoader = async () => ({
      createWavefrontPathTracingComputeRenderer() { acquired.resolve(); return gate.promise; },
    });
    const old = mountGpuProductStudio(options);
    const rejected = assert.rejects(old, /superseded/);
    await acquired.promise;
    const next = lifecycleFixture();
    const current = await mountGpuProductStudio({ ...next.options, root, document });
    const canvas = root.children[0];
    gate.resolve(stage === "model" ? createModelFixture() : {
      renderOnce() { calls.rendered++; return {}; },
      destroy() { calls.destroyed++; },
    });
    await rejected;
    assert.equal(root.children[0], canvas);
    assert.equal(root.classList.contains(studioClass), true);
    assert.equal(calls.rendered, 0, "Obsolete mounts never submit a frame");
    assert.equal(calls.destroyed, stage === "renderer" ? 1 : 0);
    assert.equal(next.calls.destroyed, 0);
    current.destroy();
    assert.equal(next.calls.destroyed, 1);
    assert.equal(root.innerHTML, "<p>previous</p>");
  });
}

test("Destroying a replaced handle cannot restore obsolete DOM or snapshot hooks", async () => {
  const previousWindow = globalThis.window;
  const original = () => "caller snapshot";
  globalThis.window = { render_game_to_text: original };
  try {
    const first = lifecycleFixture();
    const old = await mountGpuProductStudio(first.options);
    const next = lifecycleFixture();
    const current = await mountGpuProductStudio({ ...next.options, root: first.root, document: first.document });
    const snapshot = window.render_game_to_text;
    old.destroy();
    assert.equal(first.calls.destroyed, 1);
    assert.equal(window.render_game_to_text, snapshot);
    assert.equal(first.root.children[0], current.canvas);
    current.destroy();
    current.destroy();
    assert.equal(next.calls.destroyed, 1);
    assert.equal(window.render_game_to_text, original);
    assert.equal(first.root.innerHTML, "<p>previous</p>");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Snapshot ownership across roots never revives a disposed runtime", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    const first = await mountGpuProductStudio(lifecycleFixture().options);
    const second = await mountGpuProductStudio(lifecycleFixture().options);
    const currentSnapshot = window.render_game_to_text;
    first.destroy();
    assert.equal(window.render_game_to_text, currentSnapshot);
    second.destroy();
    assert.equal(Object.hasOwn(window, "render_game_to_text"), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("Class cleanup failure cannot mask startup failure or skip renderer and markup cleanup", async () => {
  const failure = new Error("original draw failure");
  let destroyed = 0;
  const { root, options } = lifecycleFixture({
    __rendererLoader: async () => ({
      async createWavefrontPathTracingComputeRenderer() {
        return {
          renderOnce() { throw failure; },
          destroy() { destroyed++; },
        };
      },
    }),
  });
  root.classList.remove = () => { throw new Error("class cleanup failed"); };
  await assert.rejects(mountGpuProductStudio(options), error => error === failure);
  assert.equal(destroyed, 1);
  assert.equal(root.innerHTML, "<p>previous</p>");
});

test("Renderer disposal can reenter destroy without releasing resources twice", async () => {
  let handle;
  let destroyed = 0;
  const { root, options } = lifecycleFixture({
    __rendererLoader: async () => ({
      async createWavefrontPathTracingComputeRenderer() {
        return {
          renderOnce() { return {}; },
          destroy() { destroyed++; handle.destroy(); },
        };
      },
    }),
  });
  handle = await mountGpuProductStudio(options);
  handle.destroy();
  assert.equal(destroyed, 1);
  assert.equal(root.innerHTML, "<p>previous</p>");
});

test("Admitted enabled, disabled, unavailable and rollback snapshots retain unconditional cleanup", async () => {
  for (const featureFlags of [
    { enabled: { "gpu-demo.scene-fidelity.enabled": true } },
    { enabled: { "gpu-demo.scene-fidelity.enabled": false } },
    null,
    { enabled: { "gpu-demo.scene-fidelity.enabled": false }, revision: "rollback" },
  ]) {
    const { root, calls, options } = lifecycleFixture();
    const handle = await mountGpuProductStudio(options, featureFlags);
    assert.equal(handle.state.featureFlags, featureFlags);
    handle.destroy();
    handle.destroy();
    assert.equal(calls.destroyed, 1);
    assert.equal(root.innerHTML, "<p>previous</p>");
  }
});

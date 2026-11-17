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
            renderFrame(renderOptions) {
              return {
                frame: 1,
                width: options.width,
                height: options.height,
                maxDepth: options.maxDepth,
                samplesPerPixel: renderOptions.samplesPerPixel,
                screenRays: options.width * options.height,
                primaryRays: options.width * options.height * renderOptions.samplesPerPixel,
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
  assert.equal(result.state.rendererStats.samplesPerPixel, 2);
  assert.deepEqual(result.state.rendererStats.transportContributions, {
    directExplicitLuminance: 0.42,
    cachedIndirectLuminance: 0.31,
    stochasticResidualLuminance: 0.03,
    zeroTerminationCount: 128,
    deterministicChecksum: 123456,
  });
  assert.equal(result.state.rendererStats.screenRays, 640 * 360);
  assert.equal(result.state.rendererStats.primaryRays, 640 * 360 * 2);
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
          renderFrame: () => ({ frame: 1 }),
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
        uploaded=options.meshes;return {renderFrame(){return {};},destroy(){}};
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
            renderFrame() { calls.rendered++; return {}; },
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
          renderFrame() { throw failure; },
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
            renderFrame() { if (drawFails) throw failure; return {}; },
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
      renderFrame() { calls.rendered++; return {}; },
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
          renderFrame() { throw failure; },
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
          renderFrame() { return {}; },
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


test("Product Studio camera updates the renderer, coalesces draws and suspends for exclusive work", async () => {
  const f=lifecycleFixture(); const events=new Map(), captures=new Set(), frames=new Map(), updates=[];
  const original=f.document.createElement.bind(f.document);
  f.document.defaultView={requestAnimationFrame:fn=>{frames.set(1,fn);return 1;},cancelAnimationFrame:id=>frames.delete(id)};
  f.document.createElement=name=>name==='canvas'?Object.assign(original(name),{
    ownerDocument:f.document,clientHeight:400,
    addEventListener:(type,fn)=>events.set(type,fn),removeEventListener:type=>events.delete(type),
    focus(){f.document.activeElement=this;},setPointerCapture:id=>captures.add(id),
    hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
  }):original(name);
  f.options.cameraControls={enabled:true};
  f.options.__rendererLoader=async()=>({createWavefrontPathTracingComputeRenderer:async()=>({
    updateCamera:value=>updates.push(value),renderFrame:()=>{f.calls.rendered++;return {};},destroy:()=>f.calls.destroyed++,
  })});
  const result=await mountGpuProductStudio(f.options);
  const send=(type,extra={})=>events.get(type)?.({target:result.canvas,pointerType:'mouse',pointerId:1,button:0,clientX:0,clientY:0,preventDefault(){},...extra});
  send('pointerdown');send('pointermove',{clientX:40});send('pointermove',{clientX:60});
  assert.equal(frames.size,1);assert.equal(updates.length,0);
  frames.get(1)();frames.clear();await new Promise(resolve => setImmediate(resolve));assert.equal(updates.length,1);assert.equal(f.calls.rendered,2);
  assert.notEqual(updates[0].position[0],0);
  send('pointermove',{clientX:80});result.cameraControls.setEnabled(false);
  assert.equal(frames.size,0);assert.equal(captures.size,0);
  result.cameraControls.reset();assert.equal(frames.size,0);
  result.cameraControls.setEnabled(true);result.cameraControls.reset();
  frames.get(1)();frames.clear();await new Promise(resolve => setImmediate(resolve));assert.deepEqual(updates.at(-1).position,[0,1.12,5.05]);
  send('pointerdown');send('pointermove',{clientX:30});result.destroy();
  assert.equal(frames.size,0);assert.equal(events.size,0);assert.equal(captures.size,0);
});

test('Product Studio awaits a bounded preview without changing its fixed-reference target', async () => {
  const f = lifecycleFixture({ samplesPerPixel: 128 });
  const gate = deferred();
  const rendered = [];
  let configured;
  f.options.__rendererLoader = async () => ({
    async createWavefrontPathTracingComputeRenderer(options) {
      configured = options;
      return {
        renderOnce(o) { rendered.push({ kind: 'unawaited', options: o }); return {}; },
        async renderFrame(o) { rendered.push({ kind: 'awaited', options: o }); await gate.promise; return { samplesPerPixel: o.samplesPerPixel }; },
        destroy() {},
      };
    },
  });
  let mounted = false;
  const pending = mountGpuProductStudio(f.options).then(value => { mounted = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(configured.samplesPerPixel, 128, 'fixed reference target must stay at 128');
  assert.equal(mounted, false, 'mount must not report ready while preview is queued');
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].kind, 'awaited');
  assert.equal(rendered[0].options.samplesPerPixel, 2);
  assert.equal(rendered[0].options.awaitGPUCompletion, true);
  gate.resolve();
  const result = await pending;
  assert.equal(result.state.rendererStats.samplesPerPixel, 2);
  result.destroy();
});

test('Product Studio coalesces camera poses until GPU completion and cancels deferred input for references', async () => {
  const f = lifecycleFixture({ samplesPerPixel: 128 });
  const events = new Map(), frames = new Map(), poses = [], jobs = [];
  let nextFrame = 0;
  const makeElement = f.document.createElement.bind(f.document);
  f.document.defaultView = { requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame(id) { frames.delete(id); } };
  f.document.createElement = name => name === 'canvas' ? Object.assign(makeElement(name), {
    ownerDocument: f.document, clientHeight: 400,
    addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name),
    focus() { f.document.activeElement = this; }, setPointerCapture() {}, hasPointerCapture() { return false; }, releasePointerCapture() {},
  }) : makeElement(name);
  const errors = [];
  f.options.cameraControls = { enabled: true, onError: error => errors.push(error) };
  let initial = true;
  f.options.__rendererLoader = async () => ({ async createWavefrontPathTracingComputeRenderer() { return {
    updateCamera(pose) { poses.push(pose); },
    renderOnce() { jobs.push('unbounded'); return {}; },
    renderFrame(options) { assert.equal(options.samplesPerPixel, 2); if(initial) { initial = false; return Promise.resolve({}); } const job = deferred(); jobs.push(job); return job.promise; },
    destroy() {},
  }; } });
  const result = await mountGpuProductStudio(f.options);
  const flush = async () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); };
  const move = x => events.get('pointermove')?.({ target: result.canvas, pointerType: 'mouse', pointerId: 1, clientX: x, clientY: 0, preventDefault() {} });
  events.get('pointerdown')({ target: result.canvas, pointerType: 'mouse', pointerId: 1, button: 0, clientX: 0, clientY: 0, preventDefault() {} });
  move(20); await flush();
  assert.equal(jobs.length, 1);
  assert.notEqual(jobs[0], 'unbounded', 'camera redraw must await bounded work');
  move(40); await flush(); move(60); await flush();
  assert.equal(jobs.length, 1, 'no second camera frame before GPU completion');
  jobs[0].resolve({}); await flush(); await flush();
  assert.equal(jobs.length, 2, 'latest pending pose is drawn once');
  assert.notDeepEqual(poses[0], poses[1]);
  move(80); result.cameraControls.setEnabled(false);
  let idle = false;
  const idleJob = result.cameraControls.whenIdle().then(() => { idle = true; });
  await flush(); assert.equal(idle, false, 'reference must wait for queued preview');
  jobs[1].resolve({}); await idleJob; await flush(); await flush();
  assert.equal(jobs.length, 2, 'reference suspension discards pending preview');
  result.cameraControls.setEnabled(true); result.cameraControls.reset(); await flush();
  assert.equal(jobs.length, 3);
  const failure = new Error('GPU preview failed');
  const failedIdle = assert.rejects(result.cameraControls.whenIdle(), failure);
  jobs[2].reject(failure); await failedIdle; await flush();
  assert.deepEqual(errors, [failure]);
  result.cameraControls.reset(); await flush();
  assert.equal(jobs.length, 3, 'failed previews suspend input until explicit recovery');
  result.cameraControls.setEnabled(true); result.cameraControls.reset(); await flush();
  assert.equal(jobs.length, 4);
  result.destroy(); jobs[3].reject(new Error('disposed GPU')); await flush();
  assert.deepEqual(errors, [failure], 'late disposed work cannot report a new scene error');
  assert.equal(jobs.length, 4);
  assert.equal(frames.size, 0);
  await assert.rejects(result.cameraControls.whenIdle(), /superseded/);
});

for (const previewFails of [false, true]) {
  test(`superseding an awaited preview preserves the new scene when old work ${previewFails ? 'fails' : 'completes'}`, async () => {
    const f = lifecycleFixture(), acquired = deferred(), preview = deferred();
    const failure = new Error('old preview device lost');
    f.options.__rendererLoader = async () => ({ async createWavefrontPathTracingComputeRenderer() { return {
      renderFrame() { acquired.resolve(); return preview.promise; },
      destroy() { f.calls.destroyed++; },
    }; } });
    const old = mountGpuProductStudio(f.options);
    const rejected = assert.rejects(old, previewFails ? failure : /superseded/);
    await acquired.promise;
    const next = lifecycleFixture();
    const current = await mountGpuProductStudio({ ...next.options, root: f.root, document: f.document });
    const canvas = f.root.children[0];
    if(previewFails) preview.reject(failure); else preview.resolve({});
    await rejected;
    assert.equal(f.calls.destroyed, 1);
    assert.equal(next.calls.destroyed, 0);
    assert.equal(f.root.children[0], canvas);
    current.destroy();
    assert.equal(next.calls.destroyed, 1);
    assert.equal(f.root.innerHTML, '<p>previous</p>');
  });
}

test('Product Studio budgets completed motion with host policy, preserves references and excludes disposed work', async () => {
  const f = lifecycleFixture({ samplesPerPixel: 128, motionPerformance: { targetFrameRate: 24 } });
  const performanceModule = await import('@plasius/gpu-performance');
  let time = 0, governor, initial = true;
  const frames = new Map(), jobs = [], draws = [];
  let nextFrame = 0;
  f.document.defaultView = { performance: { now: () => time },
    requestAnimationFrame(fn) { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame(id) { frames.delete(id); } };
  const original = f.document.createElement.bind(f.document);
  f.document.createElement = name => name === 'canvas' ? Object.assign(original(name), {
    ownerDocument: f.document, clientHeight: 400, addEventListener() {}, removeEventListener() {},
  }) : original(name);
  f.options.cameraControls = { enabled: true };
  f.options.__showcaseFeatureLoaders = { performance: async () => ({ ...performanceModule,
    createGpuPerformanceGovernor(options) { governor = performanceModule.createGpuPerformanceGovernor(options); return governor; } }) };
  f.options.__rendererLoader = async () => ({ async createWavefrontPathTracingComputeRenderer(config) {
    assert.equal(config.samplesPerPixel, 128);
    return { updateCamera() { time += 2; }, destroy() { f.calls.destroyed++; },
      renderFrame(options) {
        draws.push(options);
        if(initial) { initial = false; time += 10; return Promise.resolve({ renderedSamplesPerPixel: 1 }); }
        const job = deferred(); jobs.push(job); return job.promise;
      },
    };
  } });
  const result = await mountGpuProductStudio(f.options);
  assert.equal(draws[0].samplesPerPixel, 128);
  assert.equal(draws[0].minimumSamplesPerPixel, 1);
  assert.equal(draws[0].frameTimeBudgetMs, 1000/24);
  assert.equal(result.getMotionPerformanceSnapshot().renderedSamplesPerPixel, 1);
  const flush = async () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)); };
  time = 10000; result.cameraControls.reset(); time += 5; await flush();
  assert.equal(draws[1].frameTimeBudgetMs, 1000/24 - 7);
  result.cameraControls.reset(); await flush(); assert.equal(jobs.length, 1);
  time = 10030; jobs[0].resolve({ renderedSamplesPerPixel: 4 }); await result.cameraControls.whenIdle();
  assert.equal(governor.getState().metrics.latestFrameTimeMs, 30, 'idle time is excluded; scheduling/update work included');
  assert.equal(result.getMotionPerformanceSnapshot().renderedSamplesPerPixel, 4);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(jobs.length, 2, 'queued motion starts as soon as the awaited GPU slot is free, without another animation-frame delay');
  result.cameraControls.setEnabled(false); time += 10; jobs[1].resolve({ renderedSamplesPerPixel: 2 });
  await result.cameraControls.whenIdle(); await flush(); assert.equal(jobs.length, 2);
  // Exclusive reference callers still use the unmodified renderer without a motion budget.
  const reference = result.renderer.renderFrame({ samplesPerPixel: 128, awaitGPUCompletion: true });
  assert.equal(draws.at(-1).frameTimeBudgetMs, undefined);
  jobs[2].resolve({ renderedSamplesPerPixel: 128 }); await reference;
  assert.equal(result.getMotionPerformanceSnapshot().completedFrames, 3);
  result.cameraControls.setEnabled(true); result.cameraControls.reset(); await flush();
  result.destroy(); time += 100; jobs[3].resolve({ renderedSamplesPerPixel: 2 }); await flush();
  assert.equal(result.getMotionPerformanceSnapshot().completedFrames, 3, 'disposed completion cannot update telemetry');
  assert.equal(f.calls.destroyed, 1);
});

test('an explicitly requested unavailable performance module fails mount and restores ownership', async () => {
  const f = lifecycleFixture({ motionPerformance: { targetFrameRate: 24 } });
  await assert.rejects(mountGpuProductStudio(f.options), /performance.*loader/i);
  assert.equal(f.root.innerHTML, '<p>previous</p>');
});

test('joint motion caps apply only during movement and settle after the pending GPU job', async () => {
  const f = lifecycleFixture({ maxDepth: 4, samplesPerPixel: 8,
    motionPerformance: { targetFrameRate: 60, minimumBounceDepth: 1 } });
  let time = 0, id = 0;
  const frames = new Map(), timers = new Map(), draws = [];
  const pending = deferred();
  f.document.defaultView = { performance: { now: () => time },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn) { timers.set(++id, fn); return id; }, clearTimeout(id) { timers.delete(id); } };
  const original = f.document.createElement.bind(f.document);
  f.document.createElement = name => name === 'canvas' ? Object.assign(original(name), {
    ownerDocument: f.document, clientHeight: 400, addEventListener() {}, removeEventListener() {},
  }) : original(name);
  f.options.cameraControls = { enabled: true };
  f.options.__showcaseFeatureLoaders = { performance: () => import('@plasius/gpu-performance') };
  f.options.__rendererLoader = async () => ({ async createWavefrontPathTracingComputeRenderer(config) {
    return { supportsFrameMaxDepth: true, config, updateCamera() {}, destroy() {},
      renderFrame(options) {
        draws.push(options);
        return draws.length === 2 ? pending.promise
          : { maxDepth: options.maxDepth ?? config.maxDepth, renderedSamplesPerPixel: options.samplesPerPixel };
      } };
  } });
  const flush = async (work) => {
    const callbacks = [...work.values()]; work.clear(); callbacks.forEach(fn => fn());
    await new Promise(resolve => setImmediate(resolve));
  };
  const result = await mountGpuProductStudio(f.options);
  assert.equal(draws[0].maxDepth, undefined);
  assert.equal(result.getMotionPerformanceSnapshot(), null);
  result.cameraControls.reset(); await flush(frames);
  assert.equal(draws[1].maxDepth, result.renderer.config.maxDepth);
  assert.equal(draws[1].samplesPerPixel, result.renderer.config.samplesPerPixel);
  assert.equal(draws[1].minimumSamplesPerPixel, 1);
  time = 25; await flush(timers); await flush(frames);
  assert.equal(draws.length, 2, 'settle cannot submit over the active GPU job');
  pending.resolve({ maxDepth: result.renderer.config.maxDepth, renderedSamplesPerPixel: 1 });
  await flush(frames);
  assert.equal(draws.length, 3);
  assert.equal(draws[2].maxDepth, undefined, 'settled frame uses configured depth');
  assert.equal(draws[2].samplesPerPixel, 2);
  assert.equal(result.getMotionPerformanceSnapshot().completedFrames, 1, 'only movement trains the governor');
  assert.equal(result.getMotionPerformanceSnapshot().overBudget, true);
  result.cameraControls.reset();
  assert.equal(timers.size, 1);
  result.cameraControls.setEnabled(false);
  await result.cameraControls.whenIdle();
  await flush(timers); await flush(frames);
  assert.equal(draws.length, 3, 'exclusive reference cancels pending motion and settle');
  await result.renderer.renderFrame({ samplesPerPixel: 8, awaitGPUCompletion: true });
  assert.equal(draws[3].maxDepth, undefined);
  assert.equal(result.getMotionPerformanceSnapshot().completedFrames, 1);
  result.destroy();
});

test('joint motion refuses a renderer that cannot limit frame depth', async () => {
  const f = lifecycleFixture({ motionPerformance: { targetFrameRate: 60, minimumBounceDepth: 1 } });
  f.options.__showcaseFeatureLoaders = { performance: () => import('@plasius/gpu-performance') };
  await assert.rejects(mountGpuProductStudio(f.options), /per-frame.*depth/i);
  assert.equal(f.calls.rendered, 0);
  assert.equal(f.calls.destroyed, 1);
});

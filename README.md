# @plasius/gpu-shared

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-shared.svg)](https://www.npmjs.com/package/@plasius/gpu-shared)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-shared/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-shared/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-shared)](https://codecov.io/gh/Plasius-LTD/gpu-shared)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-shared)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Build browser scenes from generated geometry or your own glTF/GLB assets. Use
`gpu-shared` to load materials, fit meshes into a studio, or add camera gestures
and progressive inspection to an authored scene. `@plasius/gpu-renderer` supplies
the WebGPU rendering; no Plasius website, account or service is required.

The shared helpers prepare assets, materials and camera interaction, while the
renderer owns path tracing, accumulation and GPU resources. This separation lets
you compose a scene in JavaScript or TypeScript with explicit rendering controls.

Apache-2.0 · ESM and CommonJS · TypeScript declarations included.

## Install

```sh
npm install @plasius/gpu-shared @plasius/gpu-renderer
```

Use a browser bundler, such as the one in your existing application, and serve it
over HTTPS or localhost in a WebGPU-capable browser. The renderer is an optional
peer of `gpu-shared` (compatible range `^0.2.49`) and is needed for this example.
Installing the packages in Node does not provide a browser GPU.

## Create a scene: a material gallery

Make three faceted sculptures with different finishes: rough terracotta, polished
copper and blue ceramic. Generate the geometry locally, then let `gpu-shared` fit
it into a lit studio. No downloaded models or site assets are needed.

Add a container and a live status message to your page:

```html
<div id="gallery" style="max-width:960px"></div>
<p id="status" role="status">Preparing the material gallery…</p>
```

Run this complete JavaScript module through your bundler. It creates a tiny glTF
asset in memory and passes its URL to the shared scene runtime:

```js
import { mountGpuProductStudio } from "@plasius/gpu-shared";

// One octahedron, reused by three independently positioned nodes.
const positions = new Float32Array([
  0, 1.6, 0, 0, 0, 0,
  -0.5, 0.8, 0, 0, 0.8, 0.5, 0.5, 0.8, 0, 0, 0.8, -0.5,
]);
const indices = new Uint16Array([
  0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 2,
  1, 3, 2, 1, 4, 3, 1, 5, 4, 1, 2, 5,
]);
const bytes = new Uint8Array(positions.byteLength + indices.byteLength);
bytes.set(new Uint8Array(positions.buffer));
bytes.set(new Uint8Array(indices.buffer), positions.byteLength);
const finishes = [
  { name: "Terracotta", color: [0.6, 0.16, 0.07, 1], roughness: 0.85, metallic: 0 },
  { name: "Copper", color: [0.95, 0.64, 0.54, 1], roughness: 0.22, metallic: 1 },
  { name: "Ceramic", color: [0.04, 0.22, 0.48, 1], roughness: 0.32, metallic: 0 },
];
const gltf = {
  asset: { version: "2.0" }, scene: 0,
  scenes: [{ name: "Material gallery", nodes: [0, 1, 2] }],
  nodes: finishes.map((finish, i) => ({
    name: finish.name, mesh: i, translation: [(i - 1) * 1.1, 0, 0],
  })),
  meshes: finishes.map((_, material) => ({
    primitives: [{ attributes: { POSITION: 0 }, indices: 1, material }],
  })),
  materials: finishes.map(finish => ({
    name: finish.name,
    pbrMetallicRoughness: { baseColorFactor: finish.color,
      roughnessFactor: finish.roughness, metallicFactor: finish.metallic },
  })),
  buffers: [{ byteLength: bytes.length,
    uri: `data:application/octet-stream;base64,${btoa(String.fromCharCode(...bytes))}` }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 6, type: "VEC3",
      min: [-0.5, 0, -0.5], max: [0.5, 1.6, 0.5] },
    { bufferView: 1, componentType: 5123, count: 24, type: "SCALAR" },
  ],
};

const root = document.querySelector("#gallery");
const status = document.querySelector("#status");
if (!(root instanceof HTMLElement) || !status) {
  throw new Error("Add the gallery and status markup first.");
}
const assetUrl = URL.createObjectURL(new Blob([JSON.stringify(gltf)], {
  type: "model/gltf+json",
}));
/** @type {Awaited<ReturnType<typeof mountGpuProductStudio>> | undefined} */
let gallery;
try {
  gallery = await mountGpuProductStudio({
    root, productAssetUrl: assetUrl,
    width: 640, height: 360, samplesPerPixel: 64, maxDepth: 4, denoise: true,
  });
  gallery.canvas.setAttribute("role", "img");
  gallery.canvas.setAttribute("aria-label",
    "Three faceted sculptures: terracotta, copper and blue ceramic, in a lit studio");
  status.textContent = "Gallery submitted. The image appears when the GPU finishes.";
} catch (error) {
  dispose();
  root.replaceChildren();
  status.textContent = error instanceof Error ? error.message : "Unable to render the gallery.";
} finally {
  URL.revokeObjectURL(assetUrl);
}

// Call this when leaving the page or unmounting the component.
export function dispose() {
  gallery?.destroy();
  gallery = undefined;
}
```

You authored the geometry, layout and materials. `mountGpuProductStudio` loads
that glTF, applies its node transforms and material factors, fits the complete
model, adds a floor, two walls and an emissive light, and delegates rendering to
`@plasius/gpu-renderer`. Despite the API's name, it accepts your own scene; the
provided URL prevents the default product asset from being loaded.

This entry submits one bounded render with a fixed studio camera. It does not
attach camera controls or progressively refine. Its promise resolves after
submission, so the status deliberately does not claim GPU completion. The Blob
URL is released after loading, and `dispose()` releases the scene when unmounted.
For larger scenes, export a glTF/GLB file instead of building a base64 buffer in
JavaScript. The small in-memory geometry above is just a self-contained starting
point. Normals are omitted to use flat facets.


## Adopt the glTF adapter

Existing `loadGltfModel(url)` calls keep their compatibility behaviour. Pass the
host's remotely evaluated `gpu.model.conversion.enabled` decision as
`conversionEnabled` to use the lazy `@plasius/gpu-model-gltf` importer. The adapter
validates JSON/GLB and nested resources; the shared renderer projection preserves
source coordinates, materials, textures and physics. `timeoutMs` and
`maxInputBytes` can tighten its 30-second deadline and 16 MiB entry ceiling.

The showcase and Product Studio consume the same decision from their existing
feature-flag snapshot. Their `gltfLoadOptions` option forwards cancellation,
integrity and tighter budgets; the remote snapshot owns the conversion decision.
Disabling the remote flag selects the existing loader on the next load. There is
no persistent conversion cache; each load reacquires external resource revisions.

Adapter results expose `importProfile: "gltf-static-resources-v1"`. Explicitly
unsupported features such as WebP retain the bounded compatibility projection
and report `importProfile: "legacy"` with `compatibilityReason`. The existing
approved brigantine network fallback also reports its reason. Malformed input,
validation, byte budgets, cancellation and integrity failures never downgrade to
another scene. An integrity manifest must list every external resource; embedded
normalized resources retain the admitted source identity.

With conversion enabled, a signal that is already aborted rejects with
`name: "GltfAdapterLoadError"` and `code: "aborted-or-timeout"`, just like
mid-load cancellation or the deadline. The loader does not read or retain the
signal's arbitrary reason, start a request or select a compatibility fallback.
Missing/disabled conversion decisions retain the existing legacy error behaviour.

See [the migration contract](docs/tdrs/tdr-0007-gltf-adapter-migration.md) for
limits, source/canonical coordinate differences, fallback and release guidance.
The [cancellation contract](docs/tdrs/tdr-0008-adapter-preflight-cancellation.md)
describes preflight failure and its regression coverage.


## Make the scene yours

| Change | Where to edit |
| --- | --- |
| Sculpture shape | `positions` and `indices`; update accessor counts, bounds and buffer offsets if the geometry size changes |
| Placement or scale | glTF `nodes`: `translation`, `rotation` (quaternion) and `scale`; the studio fits the complete group |
| Colour and finish | `finishes`: RGB values are linear; roughness runs from smooth `0` to rough `1`, metallic from dielectric `0` to metal `1` |
| Image quality | `samplesPerPixel`, `maxDepth`, `denoise`, `width` and `height`; retain the studio's 16:9 presentation ratio |
| Your own environment and interactive camera | Use the [inspection entry](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/model-inspection.md), which does not add the studio environment |

To use an authored scene, replace `assetUrl` with
`new URL("/models/my-scene.glb", location.href)` and omit the geometry/Blob creation.
Serve your model at that URL and keep any external buffers/textures beside it.
The loader decodes glTF/GLB, shares authored materials within each load, and honours
`EXT_texture_webp` sources. The mesh adapter carries UVs and supported material
maps/factors to the renderer. Source licences and attribution remain your
responsibility.

You can also reuse loading and mesh conversion independently:

```js
import { loadGltfModel, createProductStudioMeshes } from "@plasius/gpu-shared";

const controller = new AbortController();
const modelUrl = new URL("/models/my-scene.glb", location.href);
const model = await loadGltfModel(modelUrl, { signal: controller.signal });
const studioMeshes = createProductStudioMeshes(model, {
  targetCenter: [0, 0.85, 0], targetSize: 3.2,
});
```

`createProductStudioMeshes` fits the longest model dimension to `targetSize` and
includes the four studio environment meshes. `loadGltfModel(url, options?)`
accepts an optional `AbortSignal` and `integrity` map from absolute resource URLs
to browser Subresource Integrity digests. Supply a digest for the model and every
external buffer/image; an unlisted resource is rejected before its request.
The same signal and each declared digest reach the corresponding fetch. Call
`controller.abort()` to cancel acquisition. This does not interrupt synchronous
mesh processing or image decoding already underway.

One-argument calls retain the existing showcase fallback. Aborted loads and loads
with an integrity manifest never substitute the inline showcase model. ESM and
CommonJS exports apply the same policy. See the [request policy](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/tdrs/tdr-0006-public-loader-request-options.md)
for a manifest example and the inspection entry's separate lifecycle controls.

## Add interaction and explore other features

- **Camera and progressive refinement:** [inspect your own scene](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/model-inspection.md)
- **Several models together:** [arrange a composite study](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/composite-model-inspection.md) with explicit placement, shared lighting and one progressive camera using `createSceneInspection`.
  with mouse, touch and keyboard controls, SHA-256 asset verification, samples,
  bounces, denoising and native render sizes up to 3840 × 2160. The shared runtime
  refines while the camera is still; your application supplies UI and handles
  visibility and cleanup. It currently renders static poses with fixed-SPP batches.
- **Material ageing:** the [isolated material study](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/material-study.md)
  demonstrates varnish wear and rope fraying on its supplied crate. These effects
  are specific to that study, not automatically applied to arbitrary models.
  Resizing preserves the canvas proportions with a shared scale capped at DPR 2
  and 1440 pixels per drawing-buffer dimension, including tall portrait canvases.
- **Voxel assets, animation, translations and ready-made scenes:** see the
  [integration guide](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/showcase-integration.md).
  The harbour remains available through `mountGpuShowcase`; it is a separate
  prebuilt example. PVOX loading needs the optional `@plasius/gpu-model-voxel` peer.
  Harbour headers, translated labels and diagnostic lists accept plain text.
  HTML-looking strings and entity syntax display literally, including text from
  `describeState()`; consumers do not need to pre-escape these values.
- **Structured diagnostics:** [validate consented diagnostic packets](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/feedback-diagnostics.md)
  before passing them to your application's delivery service.

Import `@plasius/gpu-shared/model-inspection` or `@plasius/gpu-shared/material-study`
only when their view is needed. Hosts own access policy, visible errors and
resource disposal. The package consumes caller-supplied decisions; it does not
connect to Plasius account or feature services.

Public declarations: [root helpers](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/index.d.ts),
[inspection](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/model-inspection.d.ts),
[material study](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/material-study.d.ts).

## Development

For checkout setup and required validation, start with the
[development guide](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/maintainers/development.md).

`npm run demo` also requires Python 3. It serves the parent directory; with the
checkout named `gpu-shared`, open `http://localhost:8000/gpu-shared/demo/`.
See [contributing](https://github.com/Plasius-LTD/gpu-shared/blob/main/CONTRIBUTING.md)
and [release operations](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/maintainers/releasing.md).

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. CI validates repository-owned
branch pushes on explicit `[self-hosted, Linux, X64]` runners in the approved
`Public CI - Quarantined` group. Scheduled dependency validation uses the same
group; matching labels in Default cannot satisfy either selector. Pull-request and
`pull_request_target` events do not execute CI code. Maintainers review fork
contributions before moving accepted commits to repository-owned branches.
Release preparation and
publication use a two-run exact-main protocol on GitHub-hosted Node.js 24.18.0
LTS. A read-only job seals the package tarball and SBOM before a dependency-free
production job publishes that exact artifact through npm OIDC with provenance;
there is no npm write-token fallback. Production publication remains gated by
the npm trusted-publisher binding and the protected-branch-only GitHub
production environment.
<!-- END PLASIUS RELEASE INTEGRITY -->

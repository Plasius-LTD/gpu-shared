# @plasius/gpu-shared

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-shared.svg)](https://www.npmjs.com/package/@plasius/gpu-shared)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-shared/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-shared/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-shared)](https://codecov.io/gh/Plasius-LTD/gpu-shared)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-shared)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Shared browser-safe demo runtime and asset helpers for the Plasius `gpu-*`
package family.

Apache-2.0. ESM + CJS builds.

## Install

```bash
npm install @plasius/gpu-shared
```

## What It Solves

- Moves shared 3D showcase/demo runtime ownership out of `gpu-demo-viewer`.
- Provides one package home for GLTF loading and harbor/showcase mounting.
- Coordinates cloth, fluid, lighting, performance, debug, and physics integration
  through explicit feature adapters supplied by family packages at mount time.
- Keeps package demos aligned on the same family-owned scene contract instead of
  carrying duplicated runtime copies.
- Preserves one shared fix point for cloth motion, visible water continuity, and
  occluded harbor-light reflections across GPU demo consumers.
- Ships a package-owned showcase asset catalog with distinct brigantine,
  cutter, lighthouse, harbor-dock, and shoreline models instead of relying on
  one tiny hull mesh plus placeholder box geometry.
- Converts Product Studio GLTF primitives into triangle mesh inputs for the
  renderer-owned mesh-BVH wavefront path instead of customer-visible analytic
  scene objects.
- Preserves Product Studio UVs, decoded glTF material textures, and core
  `KHR_materials_*` factors so renderer-owned leather, wood, chrome, and
  transmissive surface response can be driven from the source asset.
- Adds `animation-adventure` mode for the GPU Animation demo, loading Peasant
  Girl plus selected clips, generating deterministic farm props, and delegating
  autoplay route/blend/camera playback to `@plasius/gpu-renderer`.

## Usage

The package remains feature-contract neutral at install time; family packages
inject domain contracts through `__showcaseFeatureLoaders` so `gpu-shared` does
not hard-reference package-private imports.

```js
import { mountGpuShowcase } from "@plasius/gpu-shared";

const showcase = await mountGpuShowcase({
  root: document.getElementById("app"),
  packageName: "@plasius/gpu-demo-viewer",
  title: "Flag by the Sea",
  subtitle: "Shared 3D validation scene for the gpu-* family.",
});

// Teardown is safe to call repeatedly from a route/page cleanup.
showcase.destroy();
```

```js
await mountGpuShowcase({
  packageName: "@plasius/gpu-cloth",
  __showcaseFeatureLoaders: {
    cloth: () => import("@plasius/gpu-cloth/dist/index.js"),
  },
});
```

### Showcase Translations

The shared showcase owns its display keys and bundled `en-GB` defaults without
making the browser runtime React-bound. Consumers that already use
`@plasius/translations` can register the package dictionary and pass a
translator into `mountGpuShowcase`:

```js
import { createI18n } from "@plasius/translations";
import {
  gpuSharedTranslationKeys,
  gpuSharedTranslations,
  mountGpuShowcase,
} from "@plasius/gpu-shared";

const i18n = createI18n({
  language: "en-GB",
  fallback: "en-GB",
  translations: gpuSharedTranslations,
});

await mountGpuShowcase({
  root: document.getElementById("app"),
  translate: (key, args) => i18n.t(key, args),
});

console.log(i18n.t(gpuSharedTranslationKeys.debugMainColorBuffer));
```

### Product Studio Mode

Consumers can route the shared showcase entrypoint to Product Studio by passing
`demoMode: "product-studio"` and a Product Studio GLTF URL. This mode loads the
model with the shared GLTF loader and delegates GPU execution to
`@plasius/gpu-renderer`.
Product Studio submits source triangle mesh data to the renderer. Display-quality
path tracing anywhere in the project requires the renderer mesh BVH path so ray
hits use source triangles, barycentric data, geometric normals, and interpolated
vertex normals for bounce decisions.
When `@plasius/gpu-lighting` exposes `createWavefrontEnvironmentLightingOptions`,
Product Studio uses the lighting-owned `product-studio` environment preset;
older installed lighting packages fall back to the previous local colours.
The shared Product Studio adapter defaults to 8 samples per pixel for the
Eames-quality benchmark render and uses a rough studio floor so the current
single-frame preview is not dominated by unresolved low-sample reflection
noise. The Product Studio canvas preserves a 16:9 presentation ratio inside
flexible host layouts so the rendered product is not stretched by non-16:9
containers.

```js
import { mountGpuShowcase } from "@plasius/gpu-shared";

await mountGpuShowcase({
  root: document.getElementById("app"),
  demoMode: "product-studio",
  productAssetUrl:
    "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf",
  samplesPerPixel: 8,
});
```

The legacy analytic proxy scene-object path is disabled and is not a customer
visible fallback. Stale callers must move to `createProductStudioMeshes(...)`
or `mountGpuShowcase({ demoMode: "product-studio" })`, both of which use mesh
inputs for renderer-owned BVH construction. For compatibility with older demo
pages and validation harnesses, the package also re-exports
`buildProductStudioSceneObjects(...)` as an alias of
`createProductStudioMeshes(...)`.

Install `@plasius/gpu-renderer` alongside `@plasius/gpu-shared` when Product
Studio or Animation Adventure mode is used. Harbor-only consumers do not need
the renderer peer.

### Animation Adventure Mode

`demoMode: "animation-adventure"` mounts an autoplay farm-adventure scene. The
mode is gated by `gpu-demo.animation-adventure.enabled`, accepts an
`animationAdventure` manifest with Peasant Girl, clip refs, route points,
scripted beats, prop seed, and camera defaults, then submits the scene to the
renderer-owned animated scene surface. The shared runtime loads the model and
clip GLB bytes, passes those buffers to `@plasius/gpu-renderer`, and returns
renderer snapshot fields that distinguish loaded payloads from skinned model
renderability.

For browser-only demos served without a bundler, keep the import surface on the
published package name and resolve it with an import map rather than importing a
viewer-private or workspace-private source file:

```html
<script type="importmap">
  {
    "imports": {
      "@plasius/gpu-shared": "../node_modules/@plasius/gpu-shared/dist/index.js"
    }
  }
</script>
```

## Asset Helpers

```js
import {
  createProductStudioMeshes,
  loadGltfModel,
  resolveShowcaseAssetUrl,
  showcaseFocusModes,
} from "@plasius/gpu-shared";

const shipUrl = resolveShowcaseAssetUrl();
const lighthouseUrl = resolveShowcaseAssetUrl("lighthouse");
const shipModel = await loadGltfModel(shipUrl);
const lighthouseModel = await loadGltfModel(lighthouseUrl);

console.log(showcaseFocusModes);
console.log(shipModel.physics);
console.log(shipModel.primitives.length, lighthouseModel.primitives.length);

const productMeshes = createProductStudioMeshes(lighthouseModel);
console.log(productMeshes.length);
```

## Demo

```bash
npm run demo
```

Then open `http://localhost:8000/gpu-shared/demo/`.

This package demo mounts the integrated harbor showcase so the shared runtime
can be validated independently of `gpu-demo-viewer`.

The harbor showcase uses a render-first canvas layout with compact pause,
stress, and focus controls plus a collapsed runtime diagnostics drawer. The
older always-visible hero, status, metrics, notes, and validation footer panels
are no longer part of the default viewport, so consumers can embed the runtime
inside production showcase pages without debug copy occupying the render area.

The integrated scene now includes a persistent flag cloth state, subdued ship
wakes and waterline ripples, and water reflections that are occluded by later
ship geometry instead of being painted through hulls. The harbor surface reads
the banded `@plasius/gpu-fluid` continuity envelope directly, so the default
camera keeps finite, visibly animated near-band water motion instead of
flattening or dropping the shared water mesh. The near shoreline band now
includes denser water geometry, broken foam segments tied to modeled rocks, and
lower-contrast ripple highlights, while the flag cloth carries subtle material
cues for weave, folds, and pinned-edge continuity.

The default showcase asset set now uses a multi-primitive brigantine, a
distinct cutter profile, a modeled lighthouse, a dock/warehouse scene, and a
generated rocky shoreline/breakwater so the harbor reads closer to a believable
coastal night view on high-end machines.

If `gpu_showcase_realistic_models_v1` is disabled, the harbor keeps the modeled
lighthouse/dock/shoreline environment and falls back only to a brigantine-only
ship catalog instead of reverting to placeholder harbor blocks.

For slide-deck screenshots or video capture, open the route with
`?capture=1&renderScale=1`. Capture mode hides the validation chrome, fills the
viewport with the scene canvas, and caps the backing buffer at 1080p by default
so recording stays smooth on local machines.

## Current Boundary

`@plasius/gpu-shared` owns the shared browser/demo orchestration surface. It
does not replace `@plasius/gpu-renderer` as the long-term runtime renderer API.
The current showcase still centralizes scene drawing here because
`@plasius/gpu-renderer` does not yet expose a reusable scene/mesh submission
surface for these family demos.

## API

- `mountGpuShowcase(options)`
  - Returns `{ state, shipModel, canvas, destroy() }`
  - Product Studio mode defaults to a host-safe `640x360` wavefront render at
    `maxDepth: 2`; callers can raise `width`, `height`, or `maxDepth`
    deliberately for capture or high-end review hardware.
  - `captureMode: true` enables fullscreen scene-only presentation for local
    screenshots and video capture.
  - `renderScale` overrides the canvas backing scale when a capture workflow
    needs a specific quality/performance balance.
- `mountGpuProductStudio(options)`
  - Returns `{ state, model, productModel, meshes, canvas, renderer, destroy() }`
  - Uses `@plasius/gpu-renderer` display-quality mesh BVH input and
    `@plasius/gpu-lighting` environment options.
- `createProductStudioMeshes(model, options)`
  - Converts GLTF primitives plus the Product Studio environment into renderer
    mesh records with positions, indices, normals, material kind, roughness,
    metallic, opacity, and emission.
- `loadGltfModel(url)`
- `resolveShowcaseAssetUrl(baseUrlOrAssetName?, assetName?)`
- `showcaseFocusModes`

`resolveShowcaseAssetUrl()` keeps consumers on package-owned showcase asset
URLs and still defaults to the brigantine for backward compatibility. If a host
cannot actually serve that asset, `loadGltfModel()` lazily activates the
built-in inline fallback instead of eagerly parsing that payload in the
top-level package entrypoint.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

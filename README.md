# @plasius/gpu-shared

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-shared.svg)](https://www.npmjs.com/package/@plasius/gpu-shared)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-shared/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-shared/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-shared)](https://codecov.io/gh/Plasius-LTD/gpu-shared)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-shared)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Browser scene orchestration, model loading and inspection tools for the Plasius
GPU packages. Embed the harbour showcase, inspect your own glTF/GLB models, or
use the asset helpers with a renderer of your choice. WebGPU rendering is supplied
by `@plasius/gpu-renderer`; this package manages loading, scene setup and interaction.

Apache-2.0 · ESM and CommonJS · TypeScript declarations included.

## Install

```sh
npm install @plasius/gpu-shared
```

For model inspection, material studies, Product Studio or native harbour rendering,
also install the optional renderer peer:

```sh
npm install @plasius/gpu-renderer
```

The renderer peer must satisfy `^0.2.49`. Use a WebGPU-capable browser over HTTPS
or localhost for those GPU paths. The default harbour has a Canvas2D compatibility
path. Optional PVOX loading needs `@plasius/gpu-model-voxel`; external translation
integration may use `@plasius/translations`. Neither is needed for the basic example.

## Quick start

Add a container to your page:

```html
<div id="app"></div>
```

Then run this module through your browser bundler:

```js
import { mountGpuShowcase } from "@plasius/gpu-shared";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app container");

const showcase = await mountGpuShowcase({ root });

// Call this from your route or component cleanup.
export function dispose() {
  showcase.destroy();
}
```

This mounts the default harbour and its controls. Importing the package alone does
not mount a scene. If you serve browser modules without a bundler, use an import map
for the package and its dependencies; do not import workspace-private source files.

## Choose an entry point

| Entry | Use it for |
| --- | --- |
| `@plasius/gpu-shared` | Harbour/Product Studio/animation mounting, glTF loading, mesh conversion and translations |
| `@plasius/gpu-shared/model-inspection` | Your own integrity-checked static models with camera and progressive quality controls |
| `@plasius/gpu-shared/material-study` | The supplied Wooden Crate 01 varnish and rope-fray study |
| `@plasius/gpu-shared/feedback-diagnostics` | Validating consented, structured diagnostic packets |

Import the inspection and material-study entries on demand so unrelated pages do
not load their renderer code. Model assets download when the selected view mounts.

## Inspect a model

`createModelInspection` requires a canvas, an absolute HTTP(S) `modelUrl`, an explicit
`enabled: true` decision, and an `integrity` map. Each map key is an absolute URL
for the model or one of its external buffers/images; each value is a
`sha256-<base64 digest>` SRI string. Generate it from the exact files you serve.
Missing or mismatched resources fail instead of substituting another model.

The following helper mounts the inspection and wires document visibility to pause
further GPU work. Pass your host's options, including an AbortSignal if initialization
must be cancellable when navigating away.

```js
import { createModelInspection } from "@plasius/gpu-shared/model-inspection";

/** @param {import("@plasius/gpu-shared/model-inspection").ModelInspectionOptions} options */
export async function mountInspection(options) {
  const inspection = await createModelInspection(options);
  const syncVisibility = () => inspection.setPaused(document.hidden);
  document.addEventListener("visibilitychange", syncVisibility);
  syncVisibility();

  return {
    inspection,
    dispose() {
      document.removeEventListener("visibilitychange", syncVisibility);
      inspection.destroy();
    },
  };
}
```

`onProgress` receives `{ phase, samples, target, width, height, maxDepth, denoise }`.
Samples count GPU-completed work. `onError` reports failures after initialization;
initialization errors reject the returned promise. `onHintChange` controls a brief
camera hint; the host supplies permanent accessible instructions and error/retry UI.

| Setting | Default | Supported values |
| --- | --- | --- |
| `quality.samplesPerPixel` | 64 | Integer 1–256 |
| `quality.maxDepth` | 6 | Integer 1–12 |
| `quality.denoise` | `true` | Boolean |
| `width`, `height` | 800 × 600 | Integer 1–3840 per axis, at most 8,294,400 pixels in total |

Use `inspection.setQuality({ samplesPerPixel, maxDepth, denoise, width, height })`
to change settings; only supplied fields change. Native 1920×1080, 2560×1440 and
3840×2160 targets are supported independently of CSS display size. Device limits
and model resources can still prevent allocation; 4K availability is not a promise
of real-time performance.

The first pass uses one sample. After 200ms of camera stillness, batches of up to
four refine toward the target. Moving the camera or changing quality resets history;
identical settings preserve it. `setPaused()` retains completed history, `reset()`
restarts refinement, and `destroy()` is safe to call more than once. Resize the
render target explicitly through `setQuality`; keep the displayed aspect ratio.

Inspection accepts 1–500,000 triangles and bounds initialization/GPU waits to
60 seconds. It renders static poses: source skinning/animation playback and adaptive
per-pixel sampling are not part of this entry. Mouse, touch and keyboard gestures
are described in the [camera guide](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/material-study.md#camera-and-accessibility).

## Asset helpers

```js
import {
  createProductStudioMeshes,
  loadGltfModel,
  resolveShowcaseAssetUrl,
} from "@plasius/gpu-shared";

const lighthouseUrl = resolveShowcaseAssetUrl("lighthouse");
const model = await loadGltfModel(lighthouseUrl);
const meshes = createProductStudioMeshes(model);
console.log(model.primitives.length, meshes.length);
```

The public `loadGltfModel(url)` convenience function accepts one argument and retains
legacy fallback behaviour. Cancellation and strict resource integrity are supplied
by the dedicated inspection/study runtimes; do not pass unsupported options to the
root loader. The loader handles glTF/GLB, shares authored materials within each load,
and honours `EXT_texture_webp` image sources. Models and texture resources must be
servable by your host; asset licences and attribution remain your responsibility.

## Other integrations

- [Harbour, Product Studio, PVOX, animation and translation integration](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/showcase-integration.md).
- [Material ageing study and camera gestures](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/material-study.md).
- [Feedback diagnostics and consent contract](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/feedback-diagnostics.md).
- Public declarations: [root APIs](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/index.d.ts), [inspection](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/model-inspection.d.ts), [material study](https://github.com/Plasius-LTD/gpu-shared/blob/main/src/material-study.d.ts).

`gpuSharedTranslations` contains the bundled `en-GB` dictionary for integration
with `@plasius/translations` or another host translator. The library evaluates
supplied decisions; it does not connect to a Plasius account or feature service.
Production hosts retain responsibility for access, rollout and diagnostics consent.

## Development

From a repository checkout, use Node.js 24 and npm:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:check
```

`npm run demo` also requires Python 3. It serves the parent directory; with the
checkout named `gpu-shared`, open `http://localhost:8000/gpu-shared/demo/`.
See [contributing](https://github.com/Plasius-LTD/gpu-shared/blob/main/CONTRIBUTING.md)
and [release operations](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/maintainers/releasing.md).

## Zero-Three architecture invariant

Three.js and dependency paths reaching it remain prohibited across runtime,
tooling and published artifacts. Run `npm run zero-three:source` before installing
and `npm run build && npm run zero-three` for package evidence. See the repository's
[architecture records](https://github.com/Plasius-LTD/gpu-shared/tree/main/docs/adrs)
for implementation decisions.

<!-- BEGIN PLASIUS RELEASE INTEGRITY -->
## Release integrity

CI keeps the administrative contributor registry outside Git and npm package
artifacts using exact, case-normalised path checks. CI validates repository-owned
branch pushes on explicit `[self-hosted, Linux, X64]` runners. Pull-request and
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

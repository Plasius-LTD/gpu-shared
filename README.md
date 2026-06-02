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
- Reuses `@plasius/gpu-cloth`, `@plasius/gpu-fluid`, `@plasius/gpu-lighting`,
  `@plasius/gpu-performance`, `@plasius/gpu-debug`, and browser-safe physics
  planning from `@plasius/gpu-physics/browser`.
- Keeps package demos aligned on the same family-owned scene contract instead of
  carrying duplicated runtime copies.
- Preserves one shared fix point for cloth motion, visible water continuity, and
  occluded harbor-light reflections across GPU demo consumers.
- Ships a package-owned showcase asset catalog with distinct brigantine,
  cutter, lighthouse, and harbor-dock models instead of relying on one tiny
  hull mesh plus placeholder box geometry.
- Adds a product-studio demo mode for high-fidelity local model validation,
  starting with the uncommitted workspace Eames lounge chair and ottoman data.

## Usage

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

## Feature Flags

`GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE`
(`gpu-renderer.hit-driven-pathtrace.enabled`) defaults on for shared showcase
mounts. Consumers with remote flag state can pass `featureFlags` to
`mountGpuShowcase(...)`; the flag can still be forced in local demo URLs with
`gpu-renderer.hit-driven-pathtrace.enabled=0|1` for validation.

`GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE` (`gpu_showcase_product_studio_v1`)
controls the product-studio mode. It defaults on for local validation and can
be disabled through remote `featureFlags` or the matching URL flag.

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
console.log(shipModel.primitives[0].uvs);
console.log(shipModel.primitives[0].material.baseColorTexture?.uri);
```

## Demo

```bash
npm run demo
```

Then open `http://localhost:8000/gpu-shared/demo/`.

This package demo mounts the integrated harbor showcase so the shared runtime
can be validated independently of `gpu-demo-viewer`.

Open `http://localhost:8000/gpu-shared/demo/?mode=product-studio` to mount the
product-studio renderer. The default product asset URL is
`/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf`, so
the command above serves the workspace-local `data/` folder without adding that
folder to the package. The same mode can be mounted directly:

```js
import { mountGpuShowcase } from "@plasius/gpu-shared";

await mountGpuShowcase({
  root: document.getElementById("app"),
  mode: "product-studio",
  productAssetUrl:
    "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf",
});
```

Product studio uses the widened `loadGltfModel(...)` contract to preserve UVs,
base-color textures, normal maps, metallic/roughness textures, alpha state,
emissive state, and generated tangent-space inputs. The renderer remains
package-local and Three.js-free while using `@plasius/gpu-lighting`,
`@plasius/gpu-performance`, and `@plasius/gpu-debug` contracts for lighting
passes, quality telemetry, and debug snapshots.

The integrated scene now includes a persistent flag cloth state, visible ship
wakes and collision ripples, and water reflections that are occluded by later
ship geometry instead of being painted through hulls. The harbor surface reads
the banded `@plasius/gpu-fluid` continuity envelope directly, so the default
camera keeps finite, visibly animated near-band water motion instead of
flattening or dropping the shared water mesh.

The default showcase asset set now uses a multi-primitive brigantine, a
distinct cutter profile, a modeled lighthouse, and a modeled dock/warehouse
scene so the harbor reads closer to a believable coastal night view on high-end
machines.
The generated ship hulls are authored for single-sided rendering: deck planking
faces upward toward the capture camera, and painted hull sides/caps keep
outward winding so the demo does not need a double-sided material fallback to
hide asset issues.
The harbor scene now adds a procedural shoreline, raised quay apron, seawall,
outer breakwater, and right-side pier behind the modeled assets, so buildings
and the lighthouse sit on coastal structures while the open water continues
well beyond the harbor mouth toward the horizon.

Time of day can be forced from the URL with `timeOfDay=day`, `timeOfDay=dawn`,
`timeOfDay=dusk`, `timeOfDay=night`, or `timeOfDay=cycle`. The cycling mode
animates through daylight, dusk, night, and dawn while keeping water color,
sun/moon reflections, stars, and local harbor lights in sync.

The capture renderer now mirrors ship and harbor geometry into the animated
water pass and layers sampled soft occlusion over it, so the lighting profile's
ray-traced reflection and shadow bands have a visible scene-level effect instead
of only appearing as quality metadata.
Those water samples, Kelvin wake arms, ripple rings, and wake-foam descriptors
come from `@plasius/gpu-fluid`; the water reflection and soft-shadow pass
metadata comes from `@plasius/gpu-lighting`.
Water mesh shading uses smoothed `@plasius/gpu-fluid` water normals instead of
per-face normals, and the renderer draws separate wake-foam, bow-spray,
impact-spray, and ripple-foam particles so effects read less like flat strokes.
The renderer asks `@plasius/gpu-fluid` to build the water field as contiguous
near, mid, far, and horizon slabs with shared depth boundaries, then supplies
harbor-specific exclusion footprints and per-hit color interpolation. The sky
pass only contributes horizon atmosphere instead of painting a separate sea
layer through the 3D water.
Scene shadows use `@plasius/gpu-lighting` post-process shadow-mask metadata, so
ray-traced shadow modes darken the final image through soft screen-space passes
instead of subtracting shadow strength inside each polygon fill.
The reflection and lighting presentation now starts from a real-world response:
rough water damps tall/rough object reflections, ship reflections are limited
to low hull/deck geometry, local light bloom follows distance falloff, and
ships cast a broader contact shadow before the softer screen-space occlusion
samples are applied.
Hit-driven shading also resolves normals at each trace impact point by
interpolating the triangle's authored vertex normals, then shades small
sub-triangle hit patches from those normals. This keeps curved hulls, cloth,
and water feeling smooth instead of letting a single polygon face normal drive
the whole triangle.
The renderer-owned lighting capture keeps the cloth validation flag out of the
harbor view, constrains the moon to an angular sky body, and treats the
celestial reflection as broken water glints rather than a screen-space oval.
Procedural piers and breakwaters are modeled at the harbor mouth so shoreline
structures cannot cross the foreground water as oversized slabs.
At the ultra tier, `@plasius/gpu-lighting` marks water reflections, water
shadows, and scene shadow masks as per-pixel resolves; the shared renderer
reports those passes in the quality HUD and keeps polygon shadow/reflection
contribution at zero for RT-owned effects.

For slide-deck screenshots or video capture, open the route with
`?capture=1&quality=ultra&resolution=720p&timeOfDay=cycle&renderScale=2`.
Capture mode hides the validation chrome, disables adaptive visual-detail
changes, and pins the scene to the maximum-quality water, cloth, and lighting
tiers for recording. The `resolution=720p` flag constrains the scene frame to a
1280x720 16:9 capture area while ultra mode caps the backing canvas at roughly
1280x720 pixels so high-end post-processing stays usable on MacBook-class GPUs.
Use `?capture=1&quality=adaptive&renderScale=1` only when a machine needs the
older smooth-recording fallback.

To render a deterministic 60 FPS video without relying on realtime browser
performance, keep the local demo server running and use:

```bash
npm run capture:video -- --duration=10 --fps=60 --output /private/tmp/plasius-gpu-demo.mp4
```

The capture script launches local Chrome, forces `frameExport=1`, advances the
scene by one simulation frame per PNG, and then asks FFmpeg to encode the frame
sequence at the requested frame rate. That means a slow machine can take longer
than realtime to render the frames while still producing a smooth 60 FPS video.
Use `--frames=600` instead of `--duration=10` for explicit frame counts, or
`--format=mpeg` when an MPEG-2 `.mpg` output is required.

## Current Boundary

`@plasius/gpu-shared` owns the shared browser/demo orchestration surface. It
does not replace `@plasius/gpu-renderer` as the long-term runtime renderer API.
The current showcase still centralizes scene drawing here because
`@plasius/gpu-renderer` does not yet expose a reusable scene/mesh submission
surface for these family demos.

## API

- `mountGpuShowcase(options)`
  - Returns `{ state, shipModel, canvas, destroy() }` for harbor mode and
    `{ state, productModel, canvas, destroy() }` for product studio.
  - `mode: "product-studio"` or `?mode=product-studio` mounts the
    Three.js-free product renderer.
  - `productAssetUrl`, `modelUrl`, or `assetUrl` selects a GLTF product asset.
  - `productAngle` or `angle=hero|leather|wood|turntable` selects the product
    camera preset.
  - `captureMode: true` enables fullscreen scene-only presentation for local
    screenshots and video capture.
  - `performanceMode: "max"` disables adaptive visual-detail changes and
    starts the scene on the maximum water, cloth, and lighting quality tiers.
  - `adaptivePerformance: false` and `maxQuality: true` are equivalent capture
    helpers for fixed maximum-quality rendering.
  - Query strings can force the same mode with `quality=ultra`.
  - `captureResolution` or `resolution=720p` constrains capture mode to a
    deterministic 1280x720 scene frame.
  - `frameExport: true` or `frameExport=1` pauses the realtime simulation loop
    and exposes `window.__plasiusCaptureFrame({ stepMs })` for deterministic
    frame-by-frame PNG/video capture tooling.
  - `timeOfDay` or `timeOfDay=cycle` controls day/night capture profiles and
    animated transitions.
  - `renderScale` overrides the canvas backing scale when a capture workflow
    needs a specific quality/performance balance.
  - `featureFlags` accepts remote rollout state. The
    `gpu-renderer.hit-driven-pathtrace.enabled` flag defaults to `true` and is
    reported through scene snapshots, `render_game_to_text()`, and deterministic
    frame-export metadata.
  - Fixed maximum-quality mode still applies a 1280x720 backing-buffer budget
    to avoid crashing local recording machines with 4K-plus post-processing
    workloads.
- `loadGltfModel(url)`
- `resolveShowcaseAssetUrl(baseUrlOrAssetName?, assetName?)`
- `showcaseFocusModes`
- `showcaseDemoModes`
- `GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE`
- `GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE`
- `GPU_SHOWCASE_REALISTIC_MODELS_FEATURE`

`resolveShowcaseAssetUrl()` keeps consumers on the package-owned brigantine
asset URL. If a host cannot actually serve that asset, `loadGltfModel()`
lazily activates the built-in inline fallback instead of eagerly parsing that
payload in the top-level package entrypoint.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

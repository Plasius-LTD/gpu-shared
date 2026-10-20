# Showcase integration

The default `mountGpuShowcase()` mode is the harbour. It supplies the scene and
its controls; use the dedicated model-inspection entry for your own static assets.
All rendering modes return a handle whose `destroy()` method belongs in host
route/component cleanup.

## Native harbour

The harbour can use `@plasius/gpu-renderer` native surface drawing when its caller
explicitly supplies the remote `gpu-demo.scene-fidelity.enabled` decision in
`__featureFlags`. This remains separate from route access capabilities. The native
path dynamically loads the renderer and supplies world geometry, camera, cloth and
wakes; unrelated pages do not load it. It requires renderer 0.2.46 or later,
which exports `createNativeSceneRenderer`.

The scene includes curved sails, standing rigging, boat and lighthouse railings,
continuous coastal terrain, a smaller animated flag, filtered cast shadows and
water reflections. The harbour has a coursed stone quay, separated timber pier
boards and structural supports, mooring ropes and ladder, overlapping slate roof
courses, a chimney, framed windows and a timber entrance. These are authored
procedural showcase assets, not game footage.
With native scene fidelity and realistic models enabled, six vessel families serve
four furnished berths: brigantines, cutters, tugs, fishing boats, pilot launches and
cargo coasters. Eight vessels establish the scene, with up to four underway.
Each vessel has one continuous visit, then leaves permanently; fresh identities
arrive to sustain traffic. Model families can recur. Boats travel bow-first along
smooth lanes, yield to traffic, slow at berths, and follow the water with restrained
heave, pitch and roll. Wakes start astern and stop when the vessel stops.

This is authored demonstration traffic, not a maritime-navigation simulator.
This raster pass does not claim ray tracing, photorealism or finished game art.

At the library boundary, a missing/disabled decision or unavailable WebGPU retains
the Canvas2D compatibility path. The public site's disabled decision instead
prevents mounting any demo and shows its existing managed-disabled panel.
Native setup errors remain visible. Device loss pauses the scene and requires a
reload. Reduced motion starts paused; pause stops GPU resubmission until the view
changes. Static harbour geometry and local vessel vertices are cached; a reusable
world-space frame buffer updates moving transforms. Render size and buffers are bounded,
and teardown releases GPU resources. Frame intervals are measured, not synthesized.
The diagnostics disclosure reports native submission counts, render size and the
scene's actual rendering techniques alongside its geometry and quality budgets.

See [ADR-0012](../adrs/adr-0012-native-shoreline-orchestration.md) for rollout and
the package/site release order, and the [harbour detail design](../design/shoreline-harbour-detail.md)
for geometry/download budgets and verification. Windows use opaque dark glazing;
this pass does not provide glass transmission or interior lighting. The
[one-visit traffic design](../design/harbour-traffic.md) describes scheduling,
bounds and long-run checks. Five extra fleet/quay assets are fetched only with
native fidelity, realistic models and WebGPU available. Failed fleet loading
reports the compatibility fallback; disabling native fidelity restores the existing
library scene. This adds no account, capability or telemetry collection.

## Feature adapters

Family packages can supply `__showcaseFeatureLoaders` for cloth, fluid, lighting,
performance, debug and physics. Each loader is a function returning the installed
package's public module. Install the packages you select and resolve them through
your bundler or import map. The shared runtime does not require every family
package just to import its root entry.

`__featureFlags` is the JavaScript showcase router's decision input. It accepts
an object of boolean decisions, a `flags`/`enabled` object, or an object exposing
`get(key)`. The runtime does not contact a remote service. Hosts supply their
already evaluated decisions and retain responsibility for authorization.
The current `MountGpuShowcaseOptions` declaration does not include this router
field; the dedicated, typed `mountGpuProductStudio` entry is preferable for a
Product Studio integration that performs its gating before mounting.

- `gpu-demo.scene-fidelity.enabled`: native harbour; absent/false retains the
  library's Canvas2D path.
- `gpu_showcase_realistic_models_v1`: expanded vessel catalogue.
- `gpu_showcase_product_studio_wavefront_v1`: admission through the generic
  showcase router for Product Studio.
- `gpu-demo.animation-adventure.enabled`: Animation Adventure router admission.
- `gpu-demo.animation-adventure.professional.enabled`: professional animation path.
- `gpu-demo.camera-modes.enabled`: additional animation camera modes.

The public Plasius site also composes its route capability with these decisions.
That site integration is separate from using this package in another application.

## Product Studio

Use the exported `mountGpuProductStudio({ root, productAssetUrl })` for glTF/GLB
product scenes after your host has admitted the view. It builds mesh inputs with
source UVs and material maps and delegates wavefront rendering to
`@plasius/gpu-renderer`. Install that peer first. Defaults are 640×360, depth 2
and 8 samples per pixel. Width, height, maxDepth, samplesPerPixel and denoise
are explicit options; `presentationOutput` selects `tone-mapped` or `linear`.
The surface preserves a 16:9 presentation ratio.

When an injected lighting adapter exposes `createWavefrontEnvironmentLightingOptions`,
the `product-studio` environment preset is used; otherwise the runtime uses its
built-in environment colours. `createProductStudioMeshes(model, options)` exposes
the conversion independently. `buildProductStudioSceneObjects` is its compatibility
alias and returns triangle meshes, not the former analytic proxy objects.

For PVOX, also install `@plasius/gpu-model-voxel`, pass
`productAssetRepresentation: "pvox"` and the immutable 64-character
`productAssetSha256`. The loader bounds and validates the artifact before deriving
a disposable triangle cache for the mesh-BVH renderer. It does not persist that
cache, claim native voxel rendering, or fall back to glTF after PVOX selection.

## Animation Adventure

`demoMode: "animation-adventure"` mounts an autoplay farm-adventure scene. The
mode is gated by `gpu-demo.animation-adventure.enabled`, accepts an
`animationAdventure` manifest with Peasant Girl, clip refs, route points,
scripted beats, prop seed, and camera defaults, then submits the scene to the
renderer-owned animated scene surface. The shared runtime loads the model and
clip GLB bytes, passes those buffers to `@plasius/gpu-renderer`, and returns
renderer snapshot fields that distinguish loaded payloads from skinned model
renderability.
Before playback starts, the shared runtime validates every scripted beat
against the selected clip `movementProfile`. Travel and jump beats require
root-authored or calibrated stride distance, stationary beats reject unexpected
root drift, and invalid manifests throw a beat/clip-specific movement
validation error instead of silently forcing route movement.

Professional Animation Adventure mode is controlled by
`gpu-demo.animation-adventure.professional.enabled` or by a manifest with
`renderMode: "webgpu-pbr"` and `motionPolicy: "root-motion-required"`. In this
mode, `gpu-shared` loads Peasant Girl, root-motion clips, and textured
environment GLBs, then mounts `@plasius/gpu-renderer` through
`createProfessionalAnimatedSceneRenderer`. Generated 2D farm props are not used
in the professional primary path; deterministic placement comes from
`environmentAssets` plus `environmentInstances`. Travel and jump beats reject
calibrated in-place clips and require authored root translation.

Camera modes are a separate rollout surface controlled by
`gpu-demo.camera-modes.enabled`. With the flag enabled, the
`animationAdventure.camera` object may request `viewMode: "editor"`,
`"spectator"`, `"third-person"`, or `"first-person"` plus camera constraints
and head-look settings. With the flag disabled, the shared runtime keeps
legacy `lagged-follow` callers on spectator behavior and only advertises
`["spectator"]` as available.

## Translations

`gpuSharedTranslations` and `gpuSharedTranslationKeys` expose the bundled `en-GB`
dictionary and keys. Pass a `translate` callback to `mountGpuShowcase` to integrate
another localization system; untranslated keys retain the package defaults.
For `@plasius/translations`, register `gpuSharedTranslations` with `createI18n`.
Only forward defined string/number/boolean interpolation values to its `t`
method. The shared callback type also permits undefined values, which that
translator does not accept. The package itself remains framework-independent.

## Capture and diagnostics

`captureMode: true` requests scene-only presentation; `renderScale` controls backing
scale. The repository demo also accepts `?capture=1&renderScale=1` and bounds its
capture buffer to 1080p by default. Frame intervals and native submission counts
are measurements of their named stages, not GPU completion or physical core counts.
Keep telemetry and validation-specific comparisons in your host's diagnostic UI.

# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- **Added**
  - Added a consent-required, closed and immutable game-diagnostics contract
    for the registered generator and GPU demo feedback surfaces, including
    coarse buckets, safe error codes and public-asset provenance metadata.
  - Added the focused `@plasius/gpu-shared/feedback-diagnostics` entrypoint so
    renderer clients do not load showcase or asset-loader modules.

- **Changed**
  - Correlated each diagnostics surface with its exact provenance and curated
    asset-set types so invalid cross-surface pairings fail TypeScript checks.
  - Backed the diagnostics vocabulary, bounds and correlated packet type with
    `@plasius/schema/feedback-diagnostics-vocabulary`, with runtime-schema
    parity tests kept outside the browser bundle.
  - Recorded the protected-CD-published `@plasius/schema ^1.4.0` dependency in
    the manifest and lock and revalidated diagnostics against the published
    artifact.
  - Refreshed transitive internal-package locks to surviving versions and updated the esbuild resolution to clear the current npm audit finding.
  - Raised the optional `@plasius/gpu-renderer` peer baseline to the first
    released package carrying immutable Zero-Three evidence.

- **Fixed**
  - Corrected stable/pre-release identity parsing after release metadata lands,
    and retry the protected merge after checks when repository auto-merge is
    unavailable.
  - Moved push-triggered validation from an unavailable self-hosted runner to
    GitHub-hosted Linux so exact-commit release gates can complete.
  - Made immutable tarball inventory validation consume the complete stream so
    `pipefail` cannot misclassify a valid `dist` directory after `tar` receives
    an early-reader SIGPIPE.
  - Passed the immutable publication tarball to npm with an explicit local
    `./` path so it cannot be misparsed as a Git dependency shorthand.
  - Aligned the GitHub-to-npm release boundary with the released
    `@plasius/schema` template, including pre-mutation privacy checks, sealed
    inventory revalidation, clean dependency installation, and redacted archive
    diagnostics.

- **Security**
  - Added permanent fail-closed Zero-Three validation across manifests,
    dependency graphs, imports, declarations, aliases, bundles, npm tarballs,
    SBOMs, and active documentation, with immutable CI/CD evidence and no
    compatibility fallback.

## [1.1.0] - 2026-08-28

- **Added**
  - Added bounded, independently validated PVOX Product Studio loading with a
    dynamically loaded voxel package and a disposable surface-property-grouped
    renderer compatibility cache.

- **Changed**
  - Refreshed transitive internal-package locks to surviving versions and updated the esbuild resolution to clear the current npm audit finding.
  - Product Studio now records the immutable source representation and artifact
    hash and fails closed instead of falling back to GLTF after PVOX selection.

- **Fixed**
  - Prevented the read-only checkout credential from overriding the narrowly
    scoped release-prep GitHub App token during approved CD branch creation.

- **Security**
  - Updated the development-tool dependency graph to the patched
    `brace-expansion` release after the feedback release audit.
  - Reject unknown diagnostic fields, unregistered `/player-system` evidence,
    provenance mismatches, exact values and unbounded counters so pixels,
    identity-bearing runtime data and device fingerprints cannot enter the
    shared feedback packet.
  - Snapshot strict data descriptors once, reject accessors, sparse/exotic
    arrays and proxy failures, and emit only one redacted validation error so
    time-of-check/time-of-use objects cannot smuggle arbitrary data.
  - Replaced token-based npm publication with a two-phase exact-main OIDC workflow, immutable tarball/SBOM hand-off, isolated pull-request validation, and fail-closed integrity checks.
  - Added fail-closed source and npm-package admission for the administrative contributor registry and pinned the CI/CD runtime to Node.js 24.18.0 LTS.
  - (placeholder)

## [1.0.14] - 2026-07-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)
  - Consume the RFC-remediated `@plasius/translations` release (task #97).

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.13] - 2026-07-10

- **Added**
  - (placeholder)

- **Changed**
  - Refreshed published dependency baselines to the latest stable releases,
    including `@plasius/gpu-lighting` 0.2.13, `@plasius/gpu-renderer` 0.2.39,
    `@plasius/translations` 1.0.22, ESLint 10.7.0, `globals` 17.7.0,
    React 19.2.7, and TypeScript 7.0.2.
  - Regenerated `package-lock.json` from a clean Node 24 install.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.12] - 2026-07-09

- **Added**
  - (placeholder)

- **Changed**
  - Forward Product Studio deterministic low-SPP indirect transport flags and
    renderer contribution diagnostics for `@plasius/gpu-renderer` validation.
  - Updated the optional `@plasius/gpu-renderer` peer range for the
    deterministic low-SPP indirect transport release.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.11] - 2026-07-03

- **Added**
  - Added professional Animation Adventure orchestration behind
    `gpu-demo.animation-adventure.professional.enabled`, including
    `webgpu-pbr`/`root-motion-required` manifest support, environment GLB asset
    loading, and delegation to `createProfessionalAnimatedSceneRenderer`.

- **Changed**
  - Changed professional Animation Adventure mounting to reject calibrated
    in-place travel clips and avoid generated 2D farm props in the primary path.
  - Updated the optional `@plasius/gpu-renderer` peer range for the
    professional animation renderer release.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.10] - 2026-07-03

- **Added**
  - (placeholder)

- **Changed**
  - Forwarded Product Studio `presentationOutput` into `@plasius/gpu-renderer`
    for source-stable lighting validation captures.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.9] - 2026-07-03

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.8] - 2026-07-03

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Fixed Animation Adventure movement validation so missing or null
    `movementProfile` metadata fails validation instead of throwing a
    `rootTranslationDistance` TypeError under task `#81`.

- **Security**
  - (placeholder)

## [1.0.7] - 2026-07-02

- **Added**
  - Added load-time Animation Adventure movement validation for clip
    `movementProfile` metadata and beat movement requirements.

- **Changed**
  - Changed Animation Adventure mounting to pass validated beat durations and
    clip movement profiles to `@plasius/gpu-renderer`, and to reject invalid
    manifests before playback starts.
  - Updated the optional `@plasius/gpu-renderer` peer range for the Product
    Studio transport experiment flag release.
  - Extended Product Studio regression coverage for forwarding the strict
    physical low-SPP transport experiment flags into `@plasius/gpu-renderer`.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.6] - 2026-07-02

- **Added**
  - (placeholder)

- **Changed**
  - Forward Product Studio feature flags into `@plasius/gpu-renderer` so
    renderer transport flags, including
    `renderer.transport.strictPhysicalLowSppLighting`, reach the wavefront
    renderer under task `#76`.
  - Updated the optional `@plasius/gpu-renderer` peer range for the strict
    physical low-SPP transport release.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.5] - 2026-07-02

- **Added**
  - Added `gpu-demo.camera-modes.enabled` and Animation Adventure camera
    pass-through for editor, spectator, third-person, and first-person view
    modes.

- **Changed**
  - Updated the optional `@plasius/gpu-renderer` peer range for the
    camera-aware animated renderer contract.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.4] - 2026-07-01

- **Added**
  - (placeholder)

- **Changed**
  - Pass loaded Animation Adventure Peasant Girl model and clip GLB buffers to
    `@plasius/gpu-renderer`, and surface renderer model-renderability snapshot
    fields in the mount result under task `#66`.

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.3] - 2026-07-01

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Fixed the shared glTF loader so Product Studio can load binary `.glb`
    catalog models, including the Peasant Girl demo asset, without parsing
    the GLB container as JSON.

- **Security**
  - (placeholder)

## [1.0.2] - 2026-06-30

- **Added**
  - Added Animation Adventure mode for deterministic farm props, Peasant Girl asset loading, scripted route beats, and renderer-owned autoplay playback.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [1.0.1] - 2026-06-27

- **Added**
  - (placeholder)

- **Changed**
  - The shared harbor showcase now keeps the modeled lighthouse, dock, and
    shoreline asset set even when `gpu_showcase_realistic_models_v1` is
    disabled, falling back only to a brigantine-only ship catalog.

- **Fixed**
  - Added regression coverage for the flag-disabled modeled-harbor path and
    the bounded legacy fallback used only when showcase asset loading fails.

- **Security**
  - (placeholder)

## [1.0.0] - 2026-06-27

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.20] - 2026-06-22

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.19] - 2026-06-22

- **Added**
  - Deterministic showcase asset generation for a richer shared brigantine,
    cutter, lighthouse, harbor-dock, and shoreline catalog.
  - Fullscreen capture mode for slide-deck screenshots and video recording,
    including scene-only layout and bounded 1080p canvas scaling.
  - Bundled `en-GB` translation keys and dictionaries for shared showcase labels
    that can be consumed through `@plasius/translations`.
  - Added Product Studio mode routing for `mountGpuShowcase(...)`, including
    Eames GLTF loading, source triangle mesh submission, and
    delegation to the `@plasius/gpu-renderer` WebGPU wavefront renderer.

- **Changed**
  - Reworked the shared harbor showcase chrome into a render-first canvas with
    compact controls and a collapsed runtime diagnostics drawer instead of
    always-visible hero, status, sidebar, and footer panels.
  - Improved the shared harbor shoreline presentation with a denser near-band
    water mesh, generated shoreline/breakwater geometry, broken waterline foam,
    subtler wake/ripple metadata, calmer ship traffic, and less exaggerated
    cloth material cues.
  - Re-exported `buildProductStudioSceneObjects(...)` as a compatibility alias
    of `createProductStudioMeshes(...)` so browser validation pages and runtime
    scene loaders can consume one stable Product Studio scene-builder contract.
  - Lowered Product Studio wavefront renderer defaults to a host-safe `640x360`
    frame at `maxDepth: 2` so browser demos do not start with a heavy 720p
    depth-6 GPU workload.
  - Updated the optional `@plasius/gpu-renderer` peer range to the 0.2 line so
    Product Studio and demo consumers can use the released realtime wavefront
    camera update API without npm peer conflicts.
  - Documented that project-wide display-quality path tracing requires renderer
    mesh BVH intersections and triangle normals; bounded model proxies are now
    disabled rather than exposed as a debug bridge.
  - Product Studio now submits GLTF primitive mesh inputs to the renderer with
    `displayQuality: true` instead of submitting analytic scene objects.
  - Product Studio wavefront rendering now consumes
    `@plasius/gpu-lighting` environment presets when available instead of
    relying only on local hardcoded environment colours.
  - Product Studio now defaults to 8 wavefront samples per pixel for the Eames
    quality benchmark and uses a rough studio floor to avoid unresolved
    low-sample reflection noise dominating the preview.
  - Product Studio now preserves a 16:9 canvas presentation ratio inside
    flexible host layouts so benchmark renders are not stretched by non-16:9
    containers.
  - Refactored feature loading so `@plasius/gpu-shared` uses injectable
    `__showcaseFeatureLoaders` for cloth/fluid/lighting/performance/debug/
    physics contracts and no longer imports sibling feature packages directly.
  - Routed showcase chrome and debug allocation labels through package-owned
    translation keys with an optional consumer translator override.
  - Expanded the shared GLTF loader contract to preserve the legacy flattened
    mesh fields while exposing transformed multi-primitive/material data for the
    realistic showcase scene.
  - The shared harbor runtime now renders distinct ship models and modeled
    harbor structures instead of one tiny hull mesh plus placeholder boxes.
  - Showcase lighting now adds local lantern response, a lighthouse beam pass,
    and a subtle atmospheric grade for more realistic recorded frames.
  - Declared `@plasius/gpu-renderer` as an optional Product Studio peer instead
    of a harbor/showcase hard dependency.

- **Fixed**
  - Restored the package CD workflow so protected `main` releases are prepared by PR and published without direct branch pushes.
  - GLTF model aggregation now appends large primitive arrays iteratively so
    real-world Product Studio meshes do not overflow the JavaScript call stack.
  - Product Studio GLTF loading now preserves UVs, decoded material textures,
    and stride-safe accessor reads so wood, leather, and other textured mesh
    surfaces reach the renderer intact instead of falling back to flat factors.
  - Product Studio GLTF texture-transform baking now resamples with bilinear
    filtering instead of nearest-neighbor lookups, reducing blocky localized
    distortion on transformed leather and wood texture regions.
  - Product Studio showcase routing now honors the rollout feature flag before
    loading the renderer or replacing the host DOM.
  - The shared showcase now propagates the realistic-model feature flag into
    scene state and initializes its DOM scaffold before canvas setup, allowing
    the local realistic asset catalog to mount in browser demos.
  - Generated cylindrical showcase geometry now emits outward-facing side
    winding, so towers, posts, masts, and lanterns no longer carry inverted side
    normals.
  - Generated cylindrical showcase geometry now carries smooth radial side
    normals, reducing the faceted placeholder look on lighthouse bands, masts,
    posts, and lantern glass.
  - The showcase renderer now culls with geometric face normals while shading
    with smoothed asset normals, keeping curved surfaces stable at glancing
    camera angles.
  - The generated lighthouse, mast, lantern, and dock-post assets now use denser
    radial geometry for cleaner silhouettes in recording shots.
  - Showcase shading now applies subtle deterministic material grain and
    lower-surface wear so wood, stone, painted hulls, and plaster read less like
    flat placeholder fills.
  - Low-lying ship triangles no longer pick up the water reflection term just
    because they are near the shoreline plane, so hulls stop reading like
    reflective water surfaces.

- **Security**
  - (placeholder)

## [0.1.11] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Restored shared harbor water-surface motion by reading the banded
    `@plasius/gpu-fluid` continuity envelope correctly, keeping near-band
    heights finite and visibly animated in the default GPU Demo camera.

- **Security**
  - (placeholder)

## [0.1.10] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.9] - 2026-05-13

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.8] - 2026-05-13

- **Added**
  - Deterministic showcase-runtime regression tests for the cloth simulation,
    visible water-motion overlays, and separated reflection light sources.

- **Changed**
  - The integrated harbor runtime now advances the flag as a persistent
    constraint-driven cloth state instead of re-creating a stateless sinusoid
    mesh every frame.
  - Water reflections are rendered as a dedicated water-layer pass so later
    ship geometry can occlude them naturally.

- **Fixed**
  - Shared GPU Demo water now has visible wake and ripple overlays at demo
    scale, the flag reads as cloth instead of a static ribbon, and lantern
    reflections no longer draw through hull geometry.

- **Security**
  - (placeholder)

## [0.1.7] - 2026-05-08

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Rebuilt the bundled showcase runtime against the bundle-safe
    `@plasius/gpu-lighting` module URL implementation so hosted GPU demos do
    not construct lighting technique URLs from generated `data:` module bases.

- **Security**
  - (placeholder)

## [0.1.6] - 2026-04-02

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Shared asset and glTF buffer loading now resolve reliably in browser consumers
    when the initial request URL is relative, using the fetched response URL as
    the stable base for nested asset requests.

- **Security**
  - (placeholder)

## [0.1.4] - 2026-03-26

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.3] - 2026-03-26

- **Added**
  - Public-contract tests that lock the package export surface for the shared
    runtime and bundled brigantine asset.
  - Public `destroy()` teardown hook on `mountGpuShowcase()` so browser consumers can clean up the shared runtime safely on route/page unmount.

- **Changed**
  - Documented the import-map pattern for browser demos so consumers stay on the
    published `@plasius/gpu-shared` package surface instead of deep internal
    paths.
  - README usage now documents the shared teardown contract for public consumers.

- **Fixed**
  - Shared brigantine asset resolution now falls back to an inline browser-safe
    data URL when a consuming bundler does not provide a valid module base URL,
    preventing `Invalid URL` crashes in hosted GPU demo catalogs.

- **Security**
  - (placeholder)

## [0.1.2] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.1] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.0] - 2026-03-21

- **Added**
  - Initial `@plasius/gpu-shared` package scaffold.
  - Shared harbor/showcase runtime migrated out of `gpu-demo-viewer`.
  - Shared GLTF loader and bundled brigantine demo asset.
  - ADRs, TDRs, design docs, and public API tests.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)


[0.1.0]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.0
[0.1.1]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.1
[0.1.2]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.2
[0.1.3]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.3
[0.1.4]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.4
[0.1.6]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.6
[0.1.7]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.7
[0.1.8]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.8
[0.1.9]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.9
[0.1.10]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.10
[0.1.11]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.11
[0.1.19]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.19
[0.1.20]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.20
[1.0.0]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.0
[1.0.1]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.1
[1.0.2]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.2
[1.0.3]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.3
[1.0.4]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.4
[1.0.5]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.5
[1.0.6]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.6
[1.0.7]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.7
[1.0.8]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.8
[1.0.9]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.9
[1.0.10]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.10
[1.0.11]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.11
[1.0.12]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.12
[1.0.13]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.13
[1.0.14]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.0.14
[1.1.0]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v1.1.0

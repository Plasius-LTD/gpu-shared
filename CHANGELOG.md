# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- **Added**
  - Deterministic showcase asset generation for a richer shared brigantine,
    cutter, lighthouse, and harbor-dock catalog.
  - Fullscreen capture mode for slide-deck screenshots and video recording,
    including scene-only layout and bounded 1080p canvas scaling.
  - Bundled `en-GB` translation keys and dictionaries for shared showcase labels
    that can be consumed through `@plasius/translations`.
  - Added Product Studio mode routing for `mountGpuShowcase(...)`, including
    Eames GLTF loading, source triangle mesh submission, and
    delegation to the `@plasius/gpu-renderer` WebGPU wavefront renderer.

- **Changed**
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
  - Realistic showcase shading now applies `COLOR_0` vertex colors when present
    so richer GLTF exports retain color transitions and paint details.

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

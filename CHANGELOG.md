# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- **Added**
  - Deterministic showcase asset generation for a richer shared brigantine,
    cutter, lighthouse, and harbor-dock catalog.
  - A Three.js-free product-studio demo mode for rendering the workspace-local
    Eames lounge chair and ottoman test model from the shared runtime.
  - Fullscreen capture mode for slide-deck screenshots and video recording,
    including scene-only layout and bounded 1080p canvas scaling.
  - A deterministic showcase video capture script that renders PNG frames
    through local Chrome and encodes them with FFmpeg as MP4 or MPEG output.

- **Changed**
  - Expanded the shared GLTF loader contract to preserve the legacy flattened
    mesh fields while exposing transformed multi-primitive/material data for the
    realistic showcase scene.
  - The shared GLTF loader now preserves UVs, texture descriptors, normal-map
    bindings, metallic/roughness textures, alpha state, emissive state, and
    generated tangent-space inputs for product-quality material rendering.
  - The shared harbor runtime now renders distinct ship models and modeled
    harbor structures instead of one tiny hull mesh plus placeholder boxes.
  - Showcase lighting now adds local lantern response, a lighthouse beam pass,
    and a subtle atmospheric grade for more realistic recorded frames.
  - Showcase lighting now uses a balanced night environment with softer
    moonlight, horizon fill, warm bounce, and less saturated local glows.
  - Showcase water now renders irregular wave crests, Kelvin wake arms, and
    localized foam patches instead of straight mesh-row highlight lines.
  - Showcase capture mode now defaults to fixed maximum-quality rendering,
    disables adaptive visual-detail changes, and starts water, cloth, and
    lighting on new ultra tiers for recording.
  - Showcase water now uses `@plasius/gpu-fluid` water-surface samples,
    `@plasius/gpu-lighting` water ray-trace pass metadata, soft specular glints,
    patch-based wake foam, mirrored scene reflections, and sampled water-shadow
    occlusion so ray-traced lighting bands have a visible rendering pass instead
    of only metadata.
  - Showcase water now shades from smoothed `@plasius/gpu-fluid` water normals
    and renders distinct wake-foam, bow-spray, impact-spray, and ripple-foam
    particle effects.
  - Showcase scene shadows now follow `@plasius/gpu-lighting` post-process
    shadow-mask metadata, removing polygon-level shadow darkening from
    ray-traced shadow modes.
  - Showcase ultra lighting now reports and uses per-pixel water reflection,
    water shadow, and scene shadow resolves with zero polygon contribution for
    RT-owned shadow/reflection effects.
  - Showcase documentation and tests now lock `quality=ultra` as the explicit
    query flag for fixed maximum-quality rendering.
  - Showcase fixed maximum-quality rendering now caps the backing canvas near
    1280x720 pixels so ultra post-processing does not push local MacBook-class
    GPUs into browser crashes.
  - Showcase capture mode now accepts `resolution=720p`/`captureResolution` to
    constrain the recording frame to a deterministic 1280x720 16:9 scene area.
  - Showcase scene composition now adds a procedural shoreline, raised quay,
    seawall, outer breakwater, and right-side pier so modeled harbor buildings
    sit on coastal structures instead of floating on the water.
  - Showcase water now extends the far and horizon bands well past the harbor
    mouth so the sea reads as open water toward the distance.
  - Showcase rendering now accepts `timeOfDay=day|dawn|dusk|night|cycle` and
    blends sky, water, sun/moon reflections, stars, and local light balance for
    day/night capture transitions.
  - Showcase capture mode now accepts `frameExport=1`/`frameExport: true` for
    frame-by-frame simulation export, allowing slow ultra-quality renders to be
    encoded into a smooth 60 FPS demo video.
  - The shared showcase now defaults
    `gpu-renderer.hit-driven-pathtrace.enabled` on, accepts remote
    `featureFlags`, and exposes the resolved flag through scene/text/capture
    state for all gpu-* demo consumers.
  - Showcase lighting now follows a more physically grounded response: rough
    water damps tall/rough object reflections, ship reflections are limited to
    low hull/deck geometry, local light bloom follows distance falloff, and
    ship shadows combine contact darkening with softer ray-traced occlusion.
  - Hit-driven showcase shading now interpolates authored vertex normals at
    each trace impact point and shades smoothable triangles as sub-triangle hit
    patches, reducing faceted hull, cloth, and water lighting.
  - Renderer lighting captures now separate validation cloth from harbor
    composition, constrain the moon/halo to an angular sky body, render moon
    water response as broken glints instead of a screen-space oval, and keep
    procedural piers/breakwaters at the harbor mouth rather than across the
    foreground water.
  - Showcase water now renders as contiguous renderer-owned near/mid/far/horizon
    slabs with shared depth boundaries, per-hit color interpolation, and fixed
    harbor-footprint clipping instead of overlapping nested sheets plus a
    competing screen-space sea layer.
  - Showcase water now consumes the `@plasius/gpu-fluid` large-area zone layout
    contract for stitched near/mid/far/horizon water geometry while keeping
    harbor-specific exclusions and material colors in the shared renderer.

- **Fixed**
  - The shared showcase now propagates the realistic-model feature flag into
    scene state and initializes its DOM scaffold before canvas setup, allowing
    the local realistic asset catalog to mount in browser demos.
  - Generated cylindrical showcase geometry now emits outward-facing side
    winding, so towers, posts, masts, and lanterns no longer carry inverted side
    normals.
  - Generated cylindrical showcase geometry now carries smooth radial side
    normals, reducing the faceted placeholder look on lighthouse bands, masts,
    posts, and lantern glass.
  - Generated brigantine and cutter deck planking now emits upward-facing
    triangle winding and outward hull cap checks so single-sided rendering no
    longer drops visible ship surfaces.
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
  - The showcase capture script now waits for Chrome to exit and retries
    temporary profile cleanup, avoiding macOS `Session Storage` cleanup races
    after one-frame screenshot captures.
  - The showcase capture script no longer passes target dimensions into
    Chrome's `Target.createTarget` CDP call, avoiding Chrome for Testing
    failures that require target positions to be set only for new windows.
  - The showcase capture script now fails fast on Chrome navigation errors and
    reports page, console, runtime, and network diagnostics when the demo
    capture hook does not appear.

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

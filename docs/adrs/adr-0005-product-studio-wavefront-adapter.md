# ADR-0005: Product Studio Wavefront Adapter

- Status: Accepted for mesh submission and renderer delegation.
- Date: 2026-06-02

## Context

The public site already has a Product Studio mode and local Eames GLTF asset,
but `@plasius/gpu-shared` routed all showcase mounts to the harbor canvas
runtime. The new renderer execution path belongs in `@plasius/gpu-renderer`,
while Product Studio still needs a shared browser-safe adapter that loads the
model and submits renderable data through a package API.

This package work inherits the parent site rollout control
`gpu-demo.scene-fidelity.enabled`, which remains the remotely controlled source
of truth for live exposure and rollback in `plasius-ltd-site`.

## Decision

`@plasius/gpu-shared` owns Product Studio mode routing and GLTF loading. It:

- routes `mountGpuShowcase({ demoMode: "product-studio" })` to
  `mountGpuProductStudio(...)`;
- loads the Product Studio GLTF through the existing shared GLTF loader;
- preserves Product Studio UVs, decoded glTF material textures, and
  `KHR_materials_*` factors so renderer material tables can be populated from
  the source asset instead of falling back to flat material factors;
- submits source triangle mesh data to the renderer mesh BVH wavefront path;
- disables bounded analytic scene-object proxies rather than exposing them as a
  customer-visible fallback;
- delegates GPU execution to
  `@plasius/gpu-renderer.createWavefrontPathTracingComputeRenderer(...)`;
- defaults the Product Studio Eames-quality benchmark to 8 samples per pixel and
  a rough studio floor so the current single-frame preview is not dominated by
  unresolved low-sample reflection noise;
- treats `@plasius/gpu-renderer` as an optional peer so harbor-only consumers do
  not install the renderer unless they use Product Studio mode.

## Consequences

- Positive: Product Studio uses the package-owned WebGPU wavefront renderer
  instead of the harbor canvas runtime.
- Positive: the public site can continue to call `mountGpuShowcase(...)` with a
  demo mode rather than importing a private runtime.
- Positive: release ordering stays manageable because the site installs the
  renderer directly for Product Studio.
- Negative: stale consumers of the old scene-object helper now receive an
  immediate error and must move to mesh inputs.

## Follow-On Work

- Add progressive accumulation controls once the renderer exposes a full-frame
  accumulation history suitable for interactive convergence.

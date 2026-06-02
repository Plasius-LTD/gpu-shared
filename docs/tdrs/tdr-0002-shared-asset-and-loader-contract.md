# TDR-0002: Shared Asset and Loader Contract

## Summary

The shared package publishes a tested GLTF loader and a package-owned showcase
asset catalog used by the family harbor scene.

## Contract

- `resolveShowcaseAssetUrl(...)` resolves package-owned showcase assets from the
  published package location, defaulting to the brigantine for backward
  compatibility.
- `loadGltfModel(...)` loads the GLTF mesh, embedded physics metadata,
  per-primitive material data, UVs, texture descriptors, normal-map bindings,
  metallic/roughness texture references, alpha/emissive state, generated
  tangent-space inputs, and flattened aggregate fields.
- Product-studio demo assets may live outside this package during local model
  evaluation. The runtime accepts an explicit GLTF URL and defaults to
  `/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf`
  when `mode=product-studio` is requested from the workspace demo server.
- The shared catalog currently includes:
  - `brigantine.gltf`
  - `cutter.gltf`
  - `lighthouse.gltf`
  - `harbor-dock.gltf`
- The assets are package-owned, versioned, and available in published
  artifacts.
- Workspace-local product test models are not package-owned artifacts until
  they are intentionally promoted into `assets/`.

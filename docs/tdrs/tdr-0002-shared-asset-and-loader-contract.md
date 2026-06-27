# TDR-0002: Shared Asset and Loader Contract

## Summary

The shared package publishes a tested GLTF loader and a package-owned showcase
asset catalog used by the family harbor scene.

## Contract

- `resolveShowcaseAssetUrl(...)` resolves package-owned showcase assets from the
  published package location, defaulting to the brigantine for backward
  compatibility.
- `loadGltfModel(...)` loads the GLTF mesh, embedded physics metadata,
  per-primitive material data, and flattened aggregate fields.
- The shared catalog currently includes:
  - `brigantine.gltf`
  - `cutter.gltf`
  - `lighthouse.gltf`
  - `harbor-dock.gltf`
  - `shoreline.gltf`
- The assets are package-owned, versioned, and available in published
  artifacts.

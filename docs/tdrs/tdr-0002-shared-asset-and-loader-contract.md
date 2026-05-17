# TDR-0002: Shared Asset and Loader Contract

## Summary

The shared package publishes a tested GLTF loader and a shared brigantine asset
used by the family showcase.

## Contract

- `resolveShowcaseAssetUrl(...)` resolves the shared brigantine asset from the
  package location.
- `loadGltfModel(...)` loads the GLTF mesh and embedded physics metadata, and
  only activates the inline showcase fallback when the package-owned brigantine
  asset cannot actually be loaded.
- The asset is package-owned, versioned, and available in published artifacts.

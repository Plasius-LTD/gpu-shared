# TDR-0002: Shared Asset and Loader Contract

## Summary

The shared package publishes a tested GLTF loader and a package-owned showcase
asset catalog used by the family harbor scene, plus a bounded PVOX compatibility
loader for Product Studio.

## Contract

- glTF primitives and Product Studio meshes retain optional `uvs1` for
  TEXCOORD_1 separately from `uvs`. Texture selectors (including transform
  overrides) are preserved. Missing referenced UV1 and unsupported sets reject;
  the renderer must implement the corresponding per-texture selection (ADR0013).

- `resolveShowcaseAssetUrl(...)` resolves package-owned showcase assets from the
  published package location, defaulting to the brigantine for backward
  compatibility.
- `loadGltfModel(...)` loads the GLTF mesh, embedded physics metadata,
  per-primitive material data, and flattened aggregate fields.
- Omitted glTF PBR values use white base color and metallic/roughness 1;
  explicit zero is retained. Product Studio keeps source textures and material
  factors. Representative Eames evidence must pass source fidelity admission
  (ADR-0012), independently of quality/performance qualification.
- `loadPvoxModel(...)` dynamically loads `@plasius/gpu-model-voxel`, enforces
  the released static artifact ceiling and MIME type, validates the complete
  PVOX hash closure, and derives an in-memory surface-property-grouped mesh.
- PVOX loading has no source-mesh fallback. The derived mesh is disposable,
  cannot become catalog state, and is identified as
  `pvox-derived-surface-cache` in runtime diagnostics.
- The shared catalog currently includes:
  - `brigantine.gltf`
  - `cutter.gltf`
  - `lighthouse.gltf`
  - `harbor-dock.gltf`
  - `shoreline.gltf`
- The assets are package-owned, versioned, and available in published
  artifacts.

Live PVOX catalog discoverability is controlled by the host application's
`gpu-demo.pvox-assets.enabled` feature flag. This package receives the selected
representation explicitly and does not reproduce the remote rollout decision.

# TDR-0002: Shared Asset and Loader Contract

## Summary

The shared package publishes a tested GLTF loader and a package-owned showcase
asset catalog used by the family harbor scene, plus a bounded PVOX compatibility
loader for Product Studio.

## Contract

- `resolveShowcaseAssetUrl(...)` resolves package-owned showcase assets from the
  published package location, defaulting to the brigantine for backward
  compatibility.
- `loadGltfModel(...)` loads the GLTF mesh, embedded physics metadata,
  per-primitive material data, and flattened aggregate fields.
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
  - `tug.gltf`
  - `fishing-boat.gltf`
  - `pilot-launch.gltf`
  - `coaster.gltf`
  - `harbour-berths.gltf`
- The assets are package-owned, versioned, and available in published
  artifacts.

Live PVOX catalog discoverability is controlled by the host application's
`gpu-demo.pvox-assets.enabled` feature flag. This package receives the selected
representation explicitly and does not reproduce the remote rollout decision.

## Reproducible harbour construction detail

`npm run generate:assets` authors the packaged glTF geometry and the brigantine
inline fallback from one source. Quay courses, pier boards, structural supports,
warehouse joinery and roof courses are geometry, so the existing native colour,
shadow and reflection passes agree. Straight rope/strut segments use one axial
section; sagged ropes retain subdivisions. Material factors are explicit. Dark
warehouse glazing is opaque in the current renderer. No loader semantics change.

Tests compare generated output byte-for-byte and enforce non-degenerate geometry,
consistent winding/normals, fewer than 25,000 triangles per asset and less than
6 MiB across the ten uncompressed glTF files. See
[harbour detail design](../design/shoreline-harbour-detail.md). Rollout inherits
`gpu-demo.scene-fidelity.enabled` from the host and requires approved package/site
CI/CD. This uses the published renderer 0.2.46 contract; authored texture/varnish
adoption remains a separate pending renderer release.


The five fleet/quay additions are lazy catalog entries for the native fidelity
path. Boats use +Z as their local bow; the shared Y rotation therefore points
forward at `(-sin(yaw), 0, cos(yaw))`. Pitch and roll are applied before yaw.
Published wakes use the velocity heading and a stern origin. Physics bounds
conservatively enclose every generated workboat vertex. A failed fleet asset
retains the existing explicit catalog fallback rather than silently labelling
two compatibility vessels as a busy fleet. Public asset URL overloads and package
exports include all ten files; existing names and defaults remain stable.

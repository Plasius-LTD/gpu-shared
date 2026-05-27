# Realistic Showcase Model Upgrade

## Goal

Move the shared harbor showcase materially closer to a realistic, high-end
photo-reference read by upgrading both the asset set and the browser-safe
runtime contract that consumes it.

## Review Findings

- The current shared ship asset is `assets/brigantine.gltf`, a very small GLTF
  with a single primitive, one flat material, and extremely low geometry
  density.
- The current shared GLTF loader only reads:
  - `POSITION`
  - indices
  - one base color
  - node physics extras
- The current showcase runtime uses that one ship mesh for every vessel and
  builds the harbor and lighthouse from simple box geometry in
  `showcase-runtime.js`.
- As a result, even with better lighting, the silhouette, material breakup, and
  scene set-dressing remain too primitive for a photoreal target.

## Constraints

- `@plasius/gpu-shared` must remain browser-safe and package-owned.
- Existing public helpers such as `resolveShowcaseAssetUrl()` and
  `loadGltfModel()` must remain functional.
- The current showcase renderer is still a package-local software triangle path,
  not the long-term `@plasius/gpu-renderer` scene submission API.
- The implementation should improve realism now without blocking future
  migration to a renderer-owned RT path.

## Proposed Changes

### 1. Broaden the shared GLTF contract

- Extend `loadGltfModel()` so it can load:
  - multiple nodes from the default scene
  - per-node transforms
  - multiple primitives
  - `NORMAL`
  - `COLOR_0`
  - material base color plus roughness/metalness metadata
- Keep backward compatibility by preserving the legacy aggregate fields used by
  existing consumers while adding a richer primitive list for the shared
  showcase runtime.

### 2. Ship a realistic shared asset catalog

- Keep the public brigantine URL stable, but replace the placeholder mesh with a
  much richer silhouette and multi-material breakup.
- Add additional package-owned showcase assets for:
  - a lighthouse
  - a dock / harbor structure set
  - at least one second ship profile so the scene is not two tinted clones
- Author the assets as package-local GLTF files generated from deterministic
  source scripts rather than hand-edited opaque blobs.

### 3. Upgrade the showcase scene composition

- Load the shared asset catalog in `showcase-runtime.js`.
- Replace box-built harbor geometry with the shared lighthouse and dock models.
- Give each ship a distinct model assignment and material identity rather than
  relying only on color tinting.
- Keep the existing cloth/fluid/lighting integration intact while improving the
  visual read of the environment.

### 4. Improve runtime shading for richer assets

- Update the runtime triangle builder to use loaded normals when available.
- Support per-primitive colors/material response so hulls, roofs, tower bands,
  trim, and deck elements can separate visually.
- Maintain the existing browser-safe canvas path and avoid introducing a new
  renderer dependency in this package.

## Non-Goals

- Claiming true end-to-end photorealism from the current software canvas path.
- Replacing `@plasius/gpu-renderer` with a long-term scene API in this package.
- Introducing external hosted assets or non-package-owned runtime fetches.

## Validation

- Add/update tests for the richer GLTF loader contract.
- Add regression tests proving the shared asset catalog exposes multiple
  primitives/nodes/material reads.
- Add runtime regression coverage showing the shared showcase loads the richer
  asset set instead of placeholder harbor boxes only.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

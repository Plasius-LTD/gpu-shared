# ADR-0010: PVOX Product Studio Compatibility Projection

- Status: Accepted for the ChatGPT-to-GPU-Demo demonstration.
- Date: 2026-08-25

## Context

The hosted model-resolution service promotes immutable PVOX artifacts, while
the released Product Studio path currently submits triangle meshes to the
renderer-owned BVH. The demonstration must show a confirmed uploaded model in
GPU Demo without treating its ingestion GLB or an unverified conversion as the
runtime asset.

The host controls discoverability with `gpu-demo.pvox-assets.enabled`. Native
sparse-field traversal remains separate renderer work and cannot be implied by
this adapter.

## Decision

`@plasius/gpu-shared` will accept an explicit `pvox` Product Studio
representation and dynamically load optional `@plasius/gpu-model-voxel`. The
adapter:

- fetches only the selected content-addressed PVOX URL;
- enforces the released artifact-size ceiling and PVOX MIME type;
- independently validates the artifact against the catalog SHA-256;
- derives one disposable exposed-surface cache grouped by decoded PVOX surface
  palette indices so colour, roughness, metallic, specular, and emission are
  retained;
- submits that cache to the existing display-quality mesh-BVH renderer; and
- reports `pvox` as the source representation and
  `pvox-derived-surface-cache` as the compatibility projection.

The adapter never persists or promotes the derived mesh and never falls back
to GLTF after PVOX has been selected.

## Consequences

- Positive: a confirmed ChatGPT upload can appear in Product Studio while PVOX
  remains the only promoted model artifact.
- Positive: the heavy decoder is lazy and absent from harbor-only startup.
- Positive: runtime diagnostics distinguish native source identity from the
  disposable renderer cache.
- Negative: this stage does not provide native sparse-field ray traversal,
  destruction, or environmental manipulation.
- Negative: exposed-voxel projection can be larger than the source sparse
  field and is therefore bounded by a face budget.

## Follow-On Work

- Replace the compatibility projection with renderer-owned PVOX TLAS and
  sparse-field traversal behind its independently qualified rollout flag.

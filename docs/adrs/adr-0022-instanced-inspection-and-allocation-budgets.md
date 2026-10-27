# ADR 0022: Instanced inspection and allocation budgets

Date: 2026-10-27. Status: Accepted. Task #185; Story plasius-ltd-site #2336;
Feature #1170. Host controls: `gpu-demo.scene-fidelity.enabled` and
`site.studio-coming-soon.view`.

## Context

Repeated models previously became transformed copies of every triangle. A coarse
500,000-triangle admission limit prevented useful crowd tests and did not account
for textures, image size or denoising. Source caching alone is not GPU instancing.

## Decision

Reuse gpu-renderer's shared geometry, per-mesh BLAS and scene TLAS through an
explicit `instancing: true` option. Decode each distinct URL once, verify identical
integrity manifests for repetitions, project each source once at unit scale, and
submit affine transforms for each placement. Preserve authored mesh materials and
all source primitives. Keep the expanded path by default for existing consumers,
including emissive geometry; initially reject emissive instancing explicitly.

Allow up to 128 placements from six distinct sources. This bounds authoring/load
work, not GPU capacity. Remove the triangle-count ceiling. Use renderer-owned
resource allocation accounting and device limits with a configurable positive
`memoryBudgetBytes`, default 1 GiB. Report requested bytes, never available VRAM.
Retain the independent 128 MiB decoded CPU texture guard, source integrity,
sequential acquisition, cancellation and bounded initialization/GPU waits.

Expose source, placement, mesh-instance and unique geometry counts separately.
Progress includes allocation reports; quality rebuilds retain the same source
geometry/instance inputs and enforce the same budget. Unsupported renderer versions
must fail instead of silently dropping placements. The host still owns rollout,
visibility, attribution, error/retry UI and lower-quality recovery choices.

## Consequences

A hundred copies share geometry and material textures while adding instance/TLAS
storage and traversal work. A byte budget does not guarantee performance or account
for driver overhead, other tabs or physical residency. Models remain static; this
is not animation/refit support or native voxel traversal. Shader/acceleration logic
stays in gpu-renderer rather than being duplicated in this browser-safe package.

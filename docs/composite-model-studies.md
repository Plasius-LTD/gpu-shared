# Composite model studies

Design date: 21 October 2026. Parent Feature: Plasius-LTD/plasius-ltd-site#1170;
Epic #2271. Deliver after the forty-model furniture/workshop release.

## Purpose

Compare qualified source models in a shared scene, first a furnished interior
and then a workshop. Review relative scale, placement, material response and
contact shadows with the same camera and progressive quality controls used by
individual model studies. These are inspection scenes, not approved game art.

## Existing facilities and boundary

`gpu-shared` already owns integrity-aware glTF loading, authored-material
projection, camera gestures and progressive inspection lifecycle. `gpu-renderer`
accepts multiple material-bearing meshes. `gpu-model-core` supplies the canonical
document boundary, but does not provide this inspection composition API. Reuse
the current shared helpers and renderer; do not create a second loader, renderer
or refinement loop in the viewer. Keep the other diagnostic/adaptive renderer
branch and its unresolved optical qualification separate.

Provide an additive scene inspection entry point with a bounded list of source
models and explicit placement. Each model supplies its URL, complete SHA-256
manifest, target longest dimension, ground anchor and rotation around the up
axis. Preserve source geometry/materials/texture maps; apply only the declared
uniform scale and rigid placement. Keep the existing single-model API stable.
Use unique scene mesh and material identities while retaining within-model
material reuse. Add a neutral ground plane for shared contact shadows and a
single shared lighting/camera configuration. No physical unit accuracy is implied
where source scale is unknown; display chosen dimensions for review.

## Limits and lifecycle

Admit at most six models, at most 500,000 aggregate triangles and at most 128 MiB
of decoded texture data. Load sequentially, enforce complete integrity manifests,
cancel stale work and retain the existing 60-second wait deadlines. Reject
invalid transforms and oversized scene data before allocating the renderer.
Dispose camera handlers, GPU resources and timers on scene changes or failure.
Pause refinement when hidden; quality changes preserve camera placement.

The host uses the existing remotely controlled scene-fidelity flag. Scene
composition is a child of the existing Feature, not a new entitlement. The
workshop is the first review consumer; public-site navigation is a subsequent
qualified consumer change. Keep all model sources, attribution and licence links
visible and maintain the original-model versus voxel distinction.

## Acceptance before implementation

Tests must prove placement/rotation, contact with the ground, independent
material identity, retained texture references, aggregate budgets, incomplete
integrity rejection, cancellation and cleanup, source immutability and the
unchanged single-model API. Reuse lifecycle tests for camera reset, denoising,
progressive completion, hidden-page pause and native UHD controls.

Real browser review must show at least three distinct models together in each
scene, shared shadows and lighting, credited sources, working keyboard/mouse
camera and quality controls, and clear errors. Capture actual sample counts and
dimensions. Record physical touch/screen-reader limits accurately. Require
coverage and changed-source LCOV, types, lint, package checks and approved CI/CD
before downstream release consumption. A complete image is not optical-fidelity
or adaptive-performance approval.

## Initial qualification — 21 October 2026

The local workshop rendered the furnished interior (four models, 211,146 total
triangles, 21 primitives) and workshop still life (five models, 82,635 triangles,
13 primitives) using renderer 0.2.54 and an explicit development source override
for this API. Both completed fixed 64 samples at 800 × 282, repeated after
keyboard camera movement with denoising off, and completed one native UHD sample
at 3840 × 2160. Every source retains its licence and author links. No console
warnings or errors were observed. Screenshots and DOM receipts are retained as
`composite-studies-2026-10-21/results.json` with six named captures.

All 202 package tests pass, with 91.56% overall line coverage and both changed
runtime files present at 100% lines in LCOV. Lint, types, build, package/privacy
checks and dependency audit pass. Existing CommonJS import-meta build warnings
are unchanged. This is a static inspection qualification; dark material response
and high-resolution noise remain useful subjects for renderer comparison. It is
not optical-reference, physical-touch, screen-reader speech or real-time
performance approval. Registry-consumer review follows the approved release.


## Superseding scalable scene contract (2026-10-28)

The historical six-model/500,000-triangle admission design above is superseded
by ADR 0023 and the current composite-model-inspection guide. Current admission
uses requested GPU resources and decoded texture budgets; repeated placements
use unique geometry with explicit instancing and may select authored primitives.

# ADR 0014: Reusable model inspection

Status: Accepted for local validation tooling.

## Context

The first model-library review needs the same glTF material import, renderer and camera gestures as existing Plasius studies. A viewer-owned renderer would duplicate shared runtime responsibilities. The strict gpu-model-gltf canonical importer deliberately excludes external textured bundles, material extensions and rigs, so it cannot serve this fixture set.

## Decision

Expose a lazy `@plasius/gpu-shared/model-inspection` entrypoint. It composes the existing glTF loader (with mandatory caller-supplied SHA-256 integrity), Product Studio mesh preparation, wavefront renderer and native demo camera. It allocates nothing on import, rejects disabled or unlisted fixtures, limits inspection to 500,000 triangles and 1440 pixels per dimension, and bounds initialization to sixty seconds. Abort and teardown release camera listeners, buffers and the dedicated device, including late allocation. Only one render submission is active; concurrent input requests coalesce. No continuous animation loop runs while idle.

The caller owns reviewed acquisition, per-file size budgets, model provenance, source licences, selection and visible errors. No asset-owned code is executed. The view preserves imported maps and factors, with uniform framing. It does not apply the chest-specific varnish, ageing or rope grooming to other assets. Animation data remains on disk; the existing importer supplies a static mesh projection, not skeletal playback.

## Rollout

Inherit `gpu-demo.scene-fidelity.enabled`. Hosts must pass a positive remote evaluation for product use. The local viewer documents an explicit localhost-only fixture override. This subpath adds no public route or entitlement; existing site capabilities are unchanged. Roll back by disabling the parent flag in product hosts or removing the local override.

## Validation

Tests cover disabled/invalid inputs, integrity forwarding, framing/material preservation, abort before and after allocation, resource cleanup, GPU errors and camera reuse. Browser review is required for actual appearance; unit tests are not material-fidelity certification.

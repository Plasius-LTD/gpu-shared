# ADR-0002: Shared Showcase Runtime Ownership

- Status: Accepted
- Date: 2026-03-21

## Context

The harbor/showcase runtime is reused by multiple packages and by the root demo
viewer. Keeping that runtime under the viewer package made ownership and reuse
backwards.

## Decision

Move the shared harbor/showcase runtime and GLTF loader into `@plasius/gpu-shared`.

## Consequences

- The viewer no longer defines the source of truth for the shared 3D showcase.
- Consumer demos can re-export or import from `gpu-shared` instead of from
  `gpu-demo-viewer/shared/*`.
- Shared runtime changes are now tracked and released through a dedicated package.

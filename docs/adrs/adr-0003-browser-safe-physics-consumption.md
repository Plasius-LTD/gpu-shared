# ADR-0003: Browser-Safe Physics Consumption

- Status: Accepted
- Date: 2026-03-21

## Context

The shared showcase requires physics planning, manifest, and snapshot helpers.
`@plasius/gpu-physics` currently mixes those exports with React-bound entrypoints,
which breaks browser demos that need a plain ESM import surface.

## Decision

Consume physics planning only from a browser-safe `@plasius/gpu-physics/browser`
entrypoint inside `@plasius/gpu-shared`.

## Consequences

- Shared demos no longer need local physics stubs.
- The shared package remains browser-safe and avoids React-bound imports.
- `gpu-physics` must maintain a non-React planning surface as part of its public API.

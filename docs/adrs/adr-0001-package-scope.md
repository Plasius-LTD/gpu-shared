# ADR-0001: Package Scope

- Status: Accepted
- Date: 2026-03-21

## Context

Shared browser demo/runtime logic had accumulated inside `gpu-demo-viewer`, while
multiple `gpu-*` packages were depending on those private viewer files.

## Decision

Create `@plasius/gpu-shared` as the package home for shared browser-safe demo
runtime helpers, asset loading, and shared showcase orchestration.

## Consequences

- Shared demo/runtime code now has a publishable package boundary.
- `gpu-demo-viewer` becomes a consumer rather than the owner of shared runtime code.
- Package demos can align on the same shared runtime without duplicating large files.

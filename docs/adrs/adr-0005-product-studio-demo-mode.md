# ADR-0005: Product Studio Demo Mode

- Status: Accepted
- Date: 2026-05-27

## Context

The shared harbor scene validates family integration, but it is not a focused
surface for high-detail product models with dense geometry, UV textures, normal
maps, roughness maps, and studio lighting. The workspace now has an uncommitted
`data/` folder containing the Eames lounge chair and ottoman model, and that
model needs to be renderable without introducing Three.js.

## Decision

Add a `mode=product-studio` path to `@plasius/gpu-shared`. The mode uses the
shared GLTF loader, package-local canvas rendering code, and `@plasius/gpu-*`
planning/telemetry packages. It defaults to the workspace-local Eames GLTF URL
when served by the repo-level demo server, but it does not promote `data/` into
published package assets.

The mode is governed by the `gpu_showcase_product_studio_v1` feature flag.

## Consequences

- The package can validate dense textured product assets independently of the
  harbor scene and without Three.js.
- The loader contract must preserve UVs, texture descriptors, normal maps,
  roughness textures, alpha/emissive state, and tangent-generation inputs.
- Published package artifacts remain small because local product test models
  stay outside `assets/` until they are intentionally promoted.

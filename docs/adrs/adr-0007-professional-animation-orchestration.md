# ADR-0007 Professional Animation Orchestration

## Status

Accepted

## Context

Animation Adventure has a legacy canvas fallback and a new professional WebGPU
path. The shared runtime owns browser-safe loading and mount orchestration, but
it must not become a renderer. The professional path also needs to avoid
generated 2D props and calibrated in-place movement.

## Decision

`gpu-shared` selects professional Animation Adventure when the manifest requests
`renderMode: "webgpu-pbr"`, `motionPolicy: "root-motion-required"`, or the
`gpu-demo.animation-adventure.professional.enabled` flag is enabled. In that
mode it:

- loads the character, clip GLBs, and environment GLBs
- validates movement with root-motion-only travel
- preserves cinematic camera configuration
- passes environment assets/instances to `gpu-renderer`
- calls `createProfessionalAnimatedSceneRenderer`
- skips generated 2D prop primitives

Legacy manifests continue through `createAnimatedSceneRenderer`.

## Consequences

The site can mount a professional fail-closed demo without routing through
Three.js or the legacy 2D proxy. Missing WebGPU support, bad movement profiles,
or inadequate renderer exports fail before playback instead of showing a broken
scene.

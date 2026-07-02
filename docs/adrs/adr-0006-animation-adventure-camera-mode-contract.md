# ADR 0006: Animation Adventure Camera Mode Contract

- Status: Accepted
- Date: 2026-07-02

## Context

The public GPU Demo needs animated character camera modes while keeping shared
runtime code in `@plasius/gpu-shared` and camera math in
`@plasius/gpu-camera`. The shared runtime must pass camera-mode intent to
`@plasius/gpu-renderer` without becoming the source of truth for rig math or
animation bone blending.

## Decision

Animation Adventure camera config accepts `viewMode`, `availableViewModes`,
`constraints`, and `headLook`. `mountGpuAnimationAdventure(...)` normalizes
those fields and passes them to `createAnimatedSceneRenderer(...)`.

The rollout flag `gpu-demo.camera-modes.enabled` controls whether non-spectator
camera modes are available. When disabled, the shared runtime forces
`viewMode: "spectator"` and publishes `availableViewModes: ["spectator"]`.
Legacy `camera.mode: "lagged-follow"` remains accepted.

## Consequences

- Positive: The site can expose compact camera controls through shared runtime
  APIs without duplicating renderer configuration.
- Positive: Operators can disable camera-mode experimentation without disabling
  the broader Animation Adventure scene.
- Positive: Package boundaries remain intact: camera math stays in
  `gpu-camera`, renderer animation integration stays in `gpu-renderer`.
- Tradeoff: Consumers must enable both `gpu-demo.animation-adventure.enabled`
  and `gpu-demo.camera-modes.enabled` before non-spectator modes appear.

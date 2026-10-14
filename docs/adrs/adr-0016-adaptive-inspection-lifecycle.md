# ADR 0016: Adaptive model inspection lifecycle

Accepted for experimental implementation, 2026-10-14.

Extend model inspection with `quality.samplingMode`, default `fixed`. The optional adaptive mode requires `adaptiveEnabled:true`, derived from the host decision for `renderer.sampling.adaptivePerPixel.enabled`; the existing inspection `enabled` decision still applies. The local workshop has a documented development override. No public capability or production route is introduced.

Lazy-load the renderer adaptive subpath and lightweight lighting radial-policy subpath only when selected. gpu-lighting owns the radial map; gpu-renderer owns transport, completed-count checks and resource limits. Optional peers must be released with these APIs before shipping this shared entry. The draft keeps published dependency pins unchanged until approved upstream CD; local overrides are not release evidence.

Preserve the loaded model and camera across mode/quality changes. Render one uniform sample for interaction, then start the radial render after 200ms of camera inactivity. Report completed tiles plus actual final mean/min/max rather than implying every pixel reached the ceiling. Even ceiling one executes the adaptive pass. Cancel obsolete work, drain before applying the latest view, suppress stale progress, and restart after pause. Fixed mode retains temporal progressive accumulation; adaptive mode has no temporal reuse. Errors stop rendering and are visible through `onError`. Teardown releases both GPU and camera resources.

Rollback: select fixed, stop/dispose the experimental renderer, or withdraw the positive host flag evaluation. Keep the public rollout closed until upstream merges, package CD and released-version validation pass. Task118 / Story2120 / Feature2114, composed with inspection Feature1170.

See [integration design](../adaptive-model-inspection.md).

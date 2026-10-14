# ADR 0015: Progressive inspection quality

Status: Accepted for implementation (2026-10-14). Supersedes ADR 0014's no-idle-rendering behavior.

Feature: Plasius-LTD/plasius-ltd-site#1170, Story #2303, Task #143. Inherit `gpu-demo.scene-fidelity.enabled`; the caller supplies its decision. The reviewed localhost override remains explicit; public capabilities are unchanged.

Keep accumulation in gpu-renderer and scheduling in gpu-shared. Inspection renders one sample after a change, waits for 200ms of camera stillness, then adds at most four samples per batch until the target is reached. Only one GPU batch may be active. Completion notifications follow the GPU fence. Camera changes discard stale progress and coalesce to the latest view. Hidden-tab pause stops new batches; visibility resumes remaining work. A 60-second wait deadline reports failure and releases resources.

`setQuality` validates bounded values, preserves loaded meshes and camera, and serializes renderer recreation for bounces, denoising or dimensions. Sample-target changes reset history without reloading assets. Teardown cancels scheduling, aborts waits and releases device/camera resources. This is static-mesh inspection, not skeletal animation.

The viewer owns labelled quality controls, progress accessibility, viewport measurement and document visibility. Rollback disables the inherited flag or removes the local review override. Release depends on the renderer's progressive API; publish via approved CD before released consumers update. See [TDR 0004](../tdrs/tdr-0004-inspection-quality.md).

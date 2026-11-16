# ADR 0033: Inspection motion session boundaries

Status: Accepted

## Context

The initial bounded workload in ADR 0032 applied when an inspection was created.
A later gesture could inherit full resolution and four samples from a previous
gesture, despite a changed view or an idle device. Continuous movement and
stationary refinement have different performance contracts.

## Decision

Start a new gpu-performance ladder/governor session for each transition from
stationary refinement to camera motion. Defer the session change until the
previous GPU submission completes. Use the same host-owned target, headroom and
approved work levels. Continuous pointer updates retain the active session;
only actual completed frames supply its timing measurements.

Classify idle only between completed jobs: an old input timestamp while awaiting
GPU work must not turn queued motion into a full reference. Reference batches use
the renderer's cooperative cancellation capability with tiles bounded to 128 pixels.
New input aborts obsolete reference work, awaits its submitted tile, and coalesces
to the newest camera pose. Only the exact abort reason for an obsolete generation
is recoverable; real renderer failures still fail explicitly. Require the capability
before motion-enabled inspection starts, with renderer 0.2.69 as the minimum peer
and tested development version. An uninterrupted reference still completes
the host's full sample target.

Keep the scene allocation, camera, stationary resolution, sample target, bounce
depth, materials and denoising unchanged. Do not keep the GPU busy while idle or
fabricate timing samples to force a governor decision.

## Consequences

Every gesture recovers detail from bounded work rather than inheriting an
unmeasured high workload. This can briefly reduce motion preview detail. It
does not establish a platform-independent cold-start latency guarantee: actual
idle-to-motion timing still requires physical qualification. Product policy
continues to belong to the consuming site under `gpu-demo.scene-fidelity.enabled`.

Validation belongs to Story Plasius-LTD/plasius-ltd-site#2529, Task #217 and the
design in `docs/design/motion-startup-budget.md`.

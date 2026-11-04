# ADR 0028: Consumer-owned Product Studio motion performance

Status: Accepted
Date: 2026-11-04
Tracking: site Story #2376 / Feature #1170 / Epic #2271; shared Task #206.

## Context

Product Studio's fixed two-SPP preview cannot use spare throughput or express the
host's 24 FPS motion target. Renderer 0.2.61 already supports awaited time budgets;
gpu-performance 0.1.14 already owns target negotiation and quality adaptation.
Its independent engine development must not impose a consumer performance target.

## Decision

Add optional motionPerformance.targetFrameRate and reuse the existing injected
performance module loader. Create a governor per mount with a sample-only quality
ladder. Start at the configured sample ceiling and let the renderer budget choose
actual samples, including its one-SPP cold start. Feed only successfully completed
preview timings into the governor. The frame interval includes queued scheduling
and camera-update work but excludes user idle time. Remaining-deadline arithmetic
stays in shared; policy adaptation stays in gpu-performance.

This uses generic quality ladders because only samples are adjustable; it must
not imply control of denoising, transport or resolution that this caller lacks.
Expose immutable local completion diagnostics. Do not export telemetry or claim
physical scanout FPS. Minimum coverage may overrun the target and is reported.

A normal shared dependency on gpu-performance would form a cycle. Inject its
module through the existing host loader; use the released package only as a dev
dependency for integration tests. Missing explicit policy dependencies fail visibly.
Consumers that omit policy retain the existing preview behavior. Exact reference
requests and model-inspection refinement remain separate and unchanged.

## Rollout and consequences

Site inherits gpu-demo.scene-fidelity.enabled and existing route capabilities;
shared's direct API uses caller admission as before. Removing the optional policy
restores released preview behavior. No sampling flag activation, security-control
change or dependency on experimental Feature #2367. Future renderer speedups feed
the same budget without changing this consumer target. Public contract remains
additive; package release precedes site consumption. Keep disabled professional
animation, site.studio-coming-soon.view, hold #2330 and renderer #259 unchanged.

Budgeted continuous motion hands the latest queued pose directly to the next
awaited GPU slot. Initial input still enters through requestAnimationFrame;
continuations do not add an idle rAF after completion. This preserves one job
and coalescing while avoiding an artificial frame interval floor.

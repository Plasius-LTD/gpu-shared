# ADR 0032: Conservative inspection motion startup

- Status: Accepted
- Date: 2026-11-16
- Work: gpu-shared#217, site#2529 / Feature #1170

## Context

Unknown forest workloads previously requested full resolution and four samples
before the governor could react. The first completed motion frames exceeded the
consumer's 24-FPS budget. Stationary inspection already has an independent full
reference target and must retain it.

## Decision

Initialize the existing motion quality ladder at its smallest consumer-approved
render scale and one sample. Enable gpu-performance initial-level recovery and
supply adjacent pixel-count/sample-count cost ratios. Keep execution telemetry,
queue age, sample bounds and all governor decisions in their existing owners.
The optional gpu-performance peer must support these released contracts before
this runtime is published. Do not add a second shared-runtime adaptation loop.

Stationary rendering restores full requested dimensions, SPP, bounce depth,
materials, geometry and denoise settings. Motion previews never count toward the
stationary target. Runtime/camera ownership and cleanup remain unchanged.

## Consequences and verification

Conservative estimates may hold motion quality lower than an empirically known
safe setting; a frame-rate target remains device- and workload-dependent.
Measured improvements automatically permit greater quality under the same host
budget. Tests cover bounded startup, safe recovery, expensive scenes, later
engine improvements and default fixed-inspection behavior. Exclusive real-GPU
qualification retains all startup and steady spikes and compares matched
stationary display/HDR output. Approved registry publication and public site
qualification are separate required delivery gates.

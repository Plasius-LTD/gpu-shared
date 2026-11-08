# ADR0030: Product-owned inspection motion quality

Status: Accepted — opt-in contract under site2485/shared212; release verification pending.

The forest inspector's fixed one-SPP preview cannot meet every camera budget.
Reuse gpu-performance's governor and quality ladder with a host target and
permitted motion scales, followed by optional samples. The renderer owns the
active viewport inside persistent allocations. The shared lifecycle owns one
pending job, latest-pose coalescing and explicit full-quality restoration after
200ms of quiet input. Motion progress is distinct from stationary sample progress.

The default remains fixed progressive inspection; motion is opt-in. Invalid policy
or missing renderer support fails explicitly. Tile selection is an explicit
consumer throughput/memory choice; admission stays renderer-owned. No second
governor, asset simplification or scene/device reconstruction during movement.

Feature1170/Epic2271 and gpu-demo.scene-fidelity.enabled/existing route capabilities
are inherited. Rollback omits motionPerformance and retains fixed inspection.
No rollout flag activation or change to separate adaptive-pixel/depth work.

Unchanged progress events are coalesced before reading allocation snapshots.
Completed preview metrics remain observable while pointer bursts no longer
repeat stationary-rendering notifications or force duplicate host UI updates.

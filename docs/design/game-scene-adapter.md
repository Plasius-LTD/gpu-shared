# Bounded game-snapshot presentation

Work: gpu-shared#210; site Epic #2382, Feature #2384, Story #2416.
Prerequisite: released gpu-renderer#305 native async completion. The later game
host also depends on released game-runtime; this adapter owns no game rules.

## Public boundary

Add a separate `@plasius/gpu-shared/game-scene` entrypoint. Importing it must not
load the renderer, unrelated showcase runtimes, assets or a framework. Export
`createGameSceneAdapter`, `parseGameSceneSnapshot` and explicit resource limits.
Use released @plasius/schema for strict versioned snapshot admission, existing
native surface transforms for geometry, and the released native renderer for GPU
ownership. Do not access a private device or copy a renderer/camera/input engine.

A host supplies the backend-resolved `enabled: true`, canvas, prepared local
meshes and bounded dimensions. Disabled calls return null before importing GPU
code or acquiring resources. Enabled calls without WebGPU reject explicitly.
The host owns account/capability decisions, camera controls, input, scheduling,
semantic HUD and accessibility. The adapter installs no competing gestures or
animation loop. Existing camera poses map to the native eye/target/fov contract.

Meshes have a stable id and a copied Float32Array using the existing native
12-float vertex layout. Limit mesh count, aggregate prepared vertices and dynamic
frame vertices before allocating. Validate finite bounded positions, normals and
material channels; reject shared backing storage and duplicate ids. All geometry
is caller-authored; assets remain with their existing loaders and provenance.
Reuse writeTransformedShowcaseSurfaces with a supplied orthonormal basis using
named right/up/forward vectors, translation and positive uniform scale. This
supports full spatial rotation with the existing native transform contract.

Snapshot identity is type `gameScene`, version `1.0.0`, with a nonnegative safe
integer tick, finite nonnegative time, camera, and bounded instances. Instances
carry unique ids, known mesh ids, position, a right-handed orthonormal basis, and
scale. Reject unknown fields, future identities, nonfinite values, invalid camera,
invalid references and excess geometry before changing the active/queued state.
Return detached data so caller mutation cannot change accepted presentation.

## Lifecycle and bounds

`offer(snapshot)` is synchronous: validate and detach, submit if idle, otherwise
replace one latest CPU snapshot. Older/equal ticks are ignored as stale; invalid
input preserves the prior state. Maintain one renderAsync call and at most one
pending snapshot, never a promise per offer or an unbounded FIFO. `flush()` returns
the shared current drain promise. `getSnapshot()` exposes bounded status/counters
and presented tick, not scene coordinates, identities or driver details.

Initialization and each frame use explicit bounded deadlines and cancellation.
Reject pre-aborted work before loading. Initialization failures are controlled;
late initialization success after cancellation/deadline destroys the renderer.
After a presentation failure, dispose once, drop queued state and report a finite
error code. Observe late rejection and never restart internally. Destroy is
idempotent and cancels work, clears prepared geometry and removes listeners.
The caller decides whether and when to create a replacement.

`resize(width, height)` admits only positive integer dimensions within 3840 per
axis and a 1080p pixel budget. Apply dimensions when submitting the next frame,
not while a frame is pending. Retain the latest snapshot to redraw a paused
scene on resize; CSS layout stays host-owned. The existing native
renderer retains its own target allocation cap. No per-frame network or telemetry
is added. Snapshot copies are bounded; prepared geometry and a single reusable
frame buffer have explicit aggregate limits.

## Rollout and verification

Inherit the existing stored `arcade.runtime.enabled`, disabled. Backend arcade
capabilities, game controls and the all-24 public-launch barrier remain required.
The adapter's boolean reflects that authoritative host decision and is not a new
local rollout mechanism. Rollback disposes presentation and stops new sessions
without touching saves. All current showcase exports remain compatible.

Define failing tests first: lazy disabled/unsupported paths, strict identities and
bounds, immutable admitted inputs, transform/material preservation, contention
and latest-only replacement, stale ticks, invalid-offer recovery, resizing, init
and frame cancellation/deadlines, device loss, late settlement, callback failures,
idempotent teardown and no busy-loop retry. Type the separate public entrypoint.
Run full coverage with every changed runtime source in LCOV, >=80% line coverage,
lint/type/build, package/Zero-Three and dependency audits. Add README, Unreleased,
ADR/TDR and validation evidence. Only released dependencies may be consumed.

Package tests establish ownership and scheduling behavior; each game still needs
real-device rendering, touch/accessibility, sustained-performance and ten-hour
qualification. Use protected branch quarantine CI and main/production cd.yml
publication before any site consumes this new entrypoint.

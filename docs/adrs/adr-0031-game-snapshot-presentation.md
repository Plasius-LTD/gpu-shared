# ADR-0031: Bounded game-snapshot presentation

- Status: Accepted
- Date: 2026-11-10
- Task: gpu-shared#210; site Epic #2382, Feature #2384, Story #2416
- Inherited flag: `arcade.runtime.enabled`, disabled

Games need a mutable spatial scene without coupling headless rules to a browser
renderer. The existing native surface transform helper and released renderer
0.2.66 already own geometry transformation and bounded GPU completion. Keep these
boundaries and add a separate, lazily imported `game-scene` entry.

Use released @plasius/schema to admit exact gameScene/1.0.0 JSON trees and detach
caller state. Named right/up/forward vectors use its supported object/array
contracts; validate orthonormality, unique ids, known meshes and aggregate bounds.
Prepared native meshes are copied once. Reuse the existing surface transform
helper and a single vertex buffer. Keep one GPU submission and one latest waiting
snapshot; a shared drain promise avoids per-offer waiters. Retain the latest scene
for resize while paused. Input, camera gestures, semantic UI, simulation and
account authority remain host-owned.

Initialize with a bounded deadline/cancellation and dispose late results. The
renderer owns frame deadlines, submission, queue completion and GPU resource
release. Terminal adapter paths cancel it, drop CPU state and report controlled
finite errors. Check terminal state after readiness checks and awaited setup so
cancellation cannot revive a disposed adapter. Teardown is idempotent and host
callback failure cannot interfere. No implicit retries, animation loop, asset
fetching or telemetry are introduced.

An unbounded FIFO retains stale state. Copying GPU ownership into this package
would duplicate the renderer. Installing orbit gestures would compete with game
controls. The chosen adapter instead composes existing packages, and never loads
the renderer for disabled or unsupported entry. Existing showcase exports remain
compatible; the optional peer minimum advances to the released completion API.

The host supplies its backend-resolved decision. Stored arcade runtime, game and
public-launch flags and backend capabilities remain authoritative and disabled;
no environment control or package boolean grants product access. Rollback stops
new sessions/disposes rendering without touching saves.

See [design](../design/game-scene-adapter.md), [guide](../guides/game-scene.md) and
[TDR-0016](../tdrs/tdr-0016-game-scene-qualification.md). Requirement tests, full
coverage and public entry checks precede protected quarantine CI and exact-main
production OIDC publication. Real-device/game qualification remains separate.

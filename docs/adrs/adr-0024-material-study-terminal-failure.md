# ADR-0024: Material-study terminal failure ownership

- Status: Accepted
- Date: 2026-10-28
- Task: gpu-shared#146; Story site#2272; Feature site#1170; host site#2300

## Context and decision

The material-study renderer already reports device loss, but shared orchestration
did not subscribe. Camera and resize draws could throw outside awaited mount and
update calls, leaving the host ready state and input resources alive.

Reuse the released renderer's unavailable callback and one shared terminal path.
Fence each renderer generation before intentional replacement or destruction.
Terminal failure aborts work and attempts both input/GPU cleanup before issuing
the additive optional `onUnavailable(MaterialStudyFailure)` callback exactly once.
Its frozen code/message contain no adapter diagnostics. Catch synchronous and
asynchronous host callback failures; observer/input callbacks cannot throw them.
Late allocation after abort/failure is destroyed without becoming current.

Initialization rejects without host notification. Awaited runtime updates reject
and notify an already mounted host; invalid patches retain their existing
non-terminal rejection. Destroy/abort are silent and idempotent. The host owns
translated accessible error/retry UI, observer disconnection and a new gated mount.
No automatic retry, renderer API change, dependency, telemetry or state service is
introduced. Root imports retain isolation from this lazy study entry.

## Alternatives and validation

Host-only try/catch misses idle device loss and camera callbacks. Reusing a
disposed study risks stale device ownership; retry creates a fresh runtime.
Generation fencing also handles adapters that notify synchronously on destroy.

Regressions cover idle loss, both draw entrypoints, replacement/acquisition races,
abort, throwing cleanup/callbacks, rejected callbacks and one-shot ownership.
Verify public types/ESM/CJS, full tests, changed-source LCOV, lint/types/build,
privacy/pack/Zero-Three and full audit. These deterministic adapter tests do not
claim a physical GPU reset or host browser verification.

`gpu-demo.scene-fidelity.enabled` and existing capabilities remain host admission
controls; failure containment is unconditional for admitted runtimes. Disable,
unavailable and rollback prevent new mounts and dispose existing owners at the
host. Release only through protected PR/exact-main CI and main production cd.yml;
verify registry identity. Site#2300 owns adoption and real host retry qualification,
currently subject to site#2201. Package release alone cannot satisfy that host AC.

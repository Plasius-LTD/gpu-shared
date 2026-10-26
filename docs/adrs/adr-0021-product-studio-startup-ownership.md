# ADR-0021: Product Studio startup ownership

- Status: Accepted
- Date: 2026-10-26
- Work: gpu-shared#160; parent Feature site#1170.
- Supplements ADR-0005; renderer and loader boundaries remain unchanged.

## Context

Product Studio modifies its host before awaiting model, module, lighting and
renderer acquisition. A rejected mount returns no handle, so callers cannot
release a renderer acquired before first-draw failure. Repeated destroy and late
startup callbacks can also restore obsolete host content or global snapshots.

## Decision

Keep lifecycle ownership in the existing shared runtime. One idempotent cleanup
path handles failed startup and explicit destroy. Take each resource out of owned
state before invoking its cleanup, attempt all remaining restoration even if one
step throws, and preserve the original startup exception. Explicit destroy reports
its first cleanup exception after attempting restoration; subsequent calls do not
repeat disposal. Preserve a pre-existing Product Studio host class.

A WeakMap gives each root one current mount. A new mount disposes its predecessor
before taking the host. After every asynchronous acquisition and first draw,
verify that the mount still owns that root. Superseded acquisition rejects with
`Product Studio mount was superseded.` and releases any late renderer without
submitting a frame or changing the current scene. No indefinite wait or retry is
introduced; underlying acquisition retains its existing cancellation/deadline
contract. Snapshot restoration checks identity and skips disposed predecessors
across roots so obsolete cleanup cannot replace a newer hook.

The existing `gpu-demo.scene-fidelity.enabled` stored control and GPU route
capability are evaluated by the host before admission. Disabling/rolling back
exposure prevents future host mounts; cleanup of already acquired resources is
unconditional, including unavailable-store and stale decision paths. This pure
package adds no service dependency, environment gate, capability or flag write.

## Alternatives and impact

Caller-only cleanup cannot work when await returns no handle. Swallowing the
startup failure would hide the failed scene. Independent success/failure cleanup
paths drift and double-dispose under reentrancy. Root ownership plus one cleanup
path preserves API/types while making replacement and retry deterministic.

The runtime restores its captured host markup, preserving its existing markup
contract; consumers should mount into a dedicated container. This does not promise
restoration of event listeners on reconstructed children or cancel network work
whose injected loader ignores its cancellation contract. Shared styles remain a
reusable document singleton. No renderer algorithm or material-study failure API
is changed; Task146 remains separate.

## Verification and release

Failing-first public entry tests cover acquisition stages, initial draw, cleanup
exceptions, class preservation, repeated/reentrant disposal, retry, overlapping
mounts and independent-root snapshots. The real README scene fails after renderer
allocation and checks visible failure and Blob URL release. Preserve >=80% LCOV
including changed source, lint/types/build/audit/artifact gates and packed ESM/CJS
and declaration compatibility. Synthetic renderer failures establish ownership;
physical GPU reset, rendering throughput, SEO and site adoption are out of scope.

Follow ADR-0011/0019 locked exact-branch quarantine admission, protected PR merge,
exact-main CI and main/production cd.yml OIDC release. Verify immutable public
registry identity/provenance and installed consumers before Done. No site/backend
release or ACA sensitive-environment mapping is part of this package publication.

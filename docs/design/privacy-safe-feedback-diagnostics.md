# Privacy-Safe Feedback Diagnostics Contract

## Status and ownership

- Status: implementation design
- Tracked task: `Plasius-LTD/gpu-shared#101`
- Parent story: `Plasius-LTD/plasius-ltd-site#1671`
- Parent rollout flag: `feedback.game-diagnostics.enabled`
- Required capability: `feedback.game-diagnostics.attach`

## Purpose

`@plasius/gpu-shared` owns the browser-safe interoperability contract used to
move a small, consented set of renderer health facts into a bug report. It does
not capture evidence itself and does not send data anywhere.

The contract intentionally cannot represent a screenshot, canvas, DOM content,
player identity, free text, URL, filename, exact coordinate, raw performance
measurement, adapter/device fingerprint, or warning string.

## Public contract

The package exports:

- a focused `@plasius/gpu-shared/feedback-diagnostics` entrypoint that does not
  load showcase, asset-loader or canvas-rendering modules;
- closed renderer, execution-backend, viewport, frame-rate and frame-time
  buckets;
- closed renderer feature, counter and safe error-code allowlists;
- exact registrations for `site.generator` and `site.gpu-demo`;
- a parser that rejects unknown fields, missing consent, unregistered surfaces,
  mismatched provenance, repeated identifiers and out-of-range counters;
- the shared default-off feature flag and required capability identifiers.

`site.player-system` has no registration and therefore fails closed.

## Dependency audit

The task-start audit ran on Node.js 24.18.0. The production dependency audit
reported zero known vulnerabilities, and the renderer peer is already at the
latest published compatible version. Available ESLint, globals and React patch
updates and the next c8 major are development-only and unrelated to this
contract, so they are deliberately left to their own dependency-maintenance
work rather than mixed into this release.

The browser implementation consumes the lightweight
`@plasius/schema/feedback-diagnostics-vocabulary` subpath directly for every
vocabulary, bound and discriminated TypeScript type. Its tests also validate
accepted output with the full `@plasius/schema/feedback-diagnostics` runtime
schema without putting that schema builder in the browser bundle. The schema
1.4 package is published through protected CD, `@plasius/schema ^1.4.0` is
recorded in this package and its lock, and parity, type, bundle and privacy
tests run against that published artifact.

The parser returns a new, deeply immutable structured value. It never strips
unknown fields because silently accepting a wider object could let an unsafe
field survive in another layer.

## Provenance and reconstruction

Each trusted registration binds one surface to:

- a renderer-owned provenance contract;
- an operator-controlled rollout flag and user capability;
- one stable public asset-set identifier.

Asset-set identifiers are opaque allowlist keys. They are not URLs, filenames
or client-provided asset names. They never enter the accepted diagnostics
packet. A server reconstruction service may map the registration to reviewed
public assets only after separate provenance review; the result must be labelled
as a reconstruction and never as the user's screenshot.

The presence of a registration does not enable capture. Runtime collection
requires an explicit user action, the persisted feature flag, the capability,
and renderer/viewer integrations that pass their own no-pixel validation.

## Privacy invariants

1. Diagnostics are optional and require `consentConfirmed: true`.
2. Only pre-bucketed values cross the shared contract. Exact viewport, FPS and
   frame-time values remain renderer-local and must be discarded after
   bucketing.
3. The parser accepts no arbitrary strings.
4. Features and errors are unique and limited to six entries.
5. Counters are unique by code, limited to 32 entries, and each count is an
   integer from 1 through 10,000.
6. Validation errors use one fixed message and never interpolate rejected
   input.
7. The diagnostics module performs no user-pixel capture, diagnostic network
   transport, storage, logging or analytics operation. Existing showcase and
   loader modules retain their separate public-asset loading and canvas
   rendering responsibilities.

## Rollout and rollback

Publishing the package contract does not enable production collection.
Production
remains off until `feedback.game-diagnostics.enabled` and
`feedback.game-diagnostics.attach` are both granted by their remote
source-of-truth evaluators. Rollback is the persisted feature flag; callers
must omit the diagnostics option and preserve normal structured-only bug
reporting when disabled.

`feedback.game-diagnostics.enabled` is default-off and has no production
environment-variable override.

## Verification

Unit and invariant tests cover exact contract values, registration provenance,
the `/player-system` exclusion, consent, immutable output, closed-object
rejection, accessor/proxy failures, single-read snapshots, sparse and exotic
arrays, correlated TypeScript types, allowlists, uniqueness and bounds.
Renderer and viewer repositories must separately prove that no pixel, DOM,
identity or exact device information can reach this parser or a network
request.

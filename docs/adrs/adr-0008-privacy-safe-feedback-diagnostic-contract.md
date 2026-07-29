# ADR-0008: Privacy-Safe Feedback Diagnostic Contract

## Status

Accepted

## Context

Bug reporters may optionally attach useful renderer health facts from approved
in-game surfaces. Actual screenshots, captured pixels and unrestricted runtime
objects would create an unacceptable privacy and fingerprinting boundary.
Renderer, viewer, site and reporting code also need one stable vocabulary so a
consumer cannot quietly widen the packet.

## Decision

`@plasius/gpu-shared` owns the browser-safe diagnostics interoperability
surface. Its closed vocabulary, bounds and discriminated type consume the
lightweight `@plasius/schema/feedback-diagnostics-vocabulary` subpath, while
parity tests validate accepted output with the full
`@plasius/schema/feedback-diagnostics` runtime schema. This prevents drift
without loading the schema builder into renderer bundles.

Consumers import the dedicated
`@plasius/gpu-shared/feedback-diagnostics` subpath. The root package re-exports
the same identities for compatibility, but renderer diagnostics do not need to
load showcase, public-asset or canvas modules.

- Only `site.generator` and `site.gpu-demo` are registered in v1.
- Every registration binds an exact renderer-owned provenance contract to an
  opaque curated public asset-set identifier.
- `/player-system` is deliberately absent.
- Persistable diagnostics use only closed coarse buckets, allowlisted feature
  IDs, bounded counters and fixed safe error codes.
- Explicit consent is structurally required.
- Unknown keys and provenance mismatches are rejected rather than stripped.
- The parser returns a new immutable value and never logs rejected content.
- Registration is metadata, not enablement. The remote default-off
  `feedback.game-diagnostics.enabled` flag and
  `feedback.game-diagnostics.attach` capability remain mandatory.
- Public asset-set identifiers never enter diagnostics packets. Reconstruction
  is server-side, uses reviewed public assets and is labelled as a
  reconstruction rather than a literal screenshot.

Renderer packages own raw-to-bucket conversion and must discard exact
measurements immediately. Viewer and site packages own explicit consent and
transport. The diagnostics module performs no user-pixel capture, diagnostic
network transport, logging, analytics, or storage operation. Other package
modules continue to load public assets and render canvases for their existing
showcase responsibilities.

Release is blocked until the protected schema CD workflow publishes
`@plasius/schema` 1.4.0, this package records `@plasius/schema ^1.4.0` in both
its manifest and lock, and validation is repeated against the published
artifact. The unpublished dependency is deliberately absent from the current
manifest and lock.

## Consequences

- Consumers share one small, testable contract that cannot represent narrative
  or pixels.
- Adding a surface, bucket or code requires a reviewed contract/version change.
- Diagnostics fail closed when the registration, provenance, flag, capability
  or consent is absent.
- A renderer bug report may contain less detail than conventional telemetry;
  this is the intended privacy trade-off.

## Alternatives considered

- Upload a screenshot or canvas capture: rejected because automatic redaction
  cannot guarantee that user or game identity is absent.
- Accept a generic runtime object and remove unsafe fields later: rejected
  because new properties could silently cross the trust boundary.
- Let each renderer define its own packet: rejected because contract drift
  would weaken backend validation and public reporting.

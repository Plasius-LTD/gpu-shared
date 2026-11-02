# ADR 0026: Finalise an existing immutable publication after main advances

- Status: Accepted
- Task: #199; parent site Story #2357, Feature #1170

## Context

Registry validation can outlast a publishing run. Version 1.6.0 reached npm, but
its release remained draft after the registry timeout. Main advanced before the
failed job was retried. Both normal release preparation and publication correctly
refuse to proceed, leaving no approved way to finish the existing release.

## Decision

Extend only the existing main `cd.yml` with a `finalize` phase in the production
environment. A read-only job verifies the original run/attempt, completed immutable
build and publication, exact successful main CI, source tag/ancestry, npm registry
signature/integrity/provenance, and source-bound GitHub artifact attestations for
the tarball and both release attachments. Registry bytes are the original artifact;
no rebuild is allowed when temporary workflow artifacts expire.

A separate dependency-free contents-write job, without OIDC authority, rechecks
current main, source tag and the draft release fingerprint. It clears only draft
status and does not promote latest. The normal exact-main publication paths remain
unchanged. Unverifiable evidence, unexpected failures or changed identities refuse
mutation. Re-running successful finalisation is idempotent after revalidation.

## Consequences

Recovery does not publish code or alter tags. The verified original source may be
an ancestor of current main only for this metadata-finalisation operation. New
packages still require exact current main, successful CI and approved OIDC CD.
The existing public artifact integrity governance applies; disabling this phase
is a complete rollback. No runtime exposure or product entitlement changes occur.

GitHub restricts draft visibility to callers with push access. A preliminary
production job therefore collects the fixed release metadata and two attachments
using GET requests only, without checkout, dependencies or repository scripts.
It seals that snapshot for the separate read-only verifier. Only the final job
can mutate release state, after verification and a fresh metadata comparison.
The collector has no npm/OIDC authority and never publishes or edits anything.

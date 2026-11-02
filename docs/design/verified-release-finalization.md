# Verify and finalise an already-published package

A registry-validation timeout left gpu-shared 1.6.0 public on npm with its GitHub
release still draft. Main has since advanced, so the exact-main publication guard
correctly prevents rerunning the old publication job. New preparation also refuses
to skip that incomplete release. Neither guard should be weakened.

Add a verification-only `finalize` phase to the existing main `cd.yml`, using the
production environment. It cannot build, publish, change npm tags or rewrite Git
tags. A read-only job verifies the requested original workflow run, its exact
successful main CI, source commit/tag, completed publication steps, registry copy of the original
immutable tarball, GitHub artifact attestation, npm integrity/signature and npm
provenance. The source commit must be an ancestor of current protected main.
Existing draft release identity and attachment metadata are bound into the result.

A separate dependency-free job with contents-write but no OIDC authority rechecks
current main/workflow identity, immutable source tag and draft release fingerprint,
then clears only the draft bit. It never promotes an older release as latest.
Unexpected metadata, missing evidence, a changed release/tag/main, unpublished
npm bytes, non-publication failures or an invalid signature fail closed. The
normal prepare/publish paths retain their exact-main checks unchanged.

Tests derive from those refusal cases plus valid finalisation and an already
completed idempotent outcome. Source LCOV, workflow policy, full tests, lint/types,
package integrity and CI remain gates. Recover 1.6.0 through this phase, then
prepare the camera minor release normally. Inherit the existing public artifact
integrity control; no runtime or entitlement changes are introduced.

The original one-day workflow artifact has expired. Recovery therefore verifies
registry bytes against the GitHub-signed original artifact attestation, rather
than recreating the package. Draft SBOM and boundary evidence also require their
original source-bound attestations. This preserves the immutable publication
identity after short-lived workflow storage expires.

GitHub restricts draft visibility to callers with push access. A preliminary
production job therefore collects the fixed release metadata and two attachments
using GET requests only, without checkout, dependencies or repository scripts.
It seals that snapshot for the separate read-only verifier. Only the final job
can mutate release state, after verification and a fresh metadata comparison.
The collector has no npm/OIDC authority and never publishes or edits anything.

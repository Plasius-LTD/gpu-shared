# Release operations

The quarantined runner group restricts both repositories and workflow refs.
Before admitting a review or generated release branch, inspect its exact commit
and workflow, lock the branch with admin enforcement, deny force pushes,
deletions and fork syncing, and retain empty push allowances. Verify its SHA
again, then admit only
`Plasius-LTD/gpu-shared/.github/workflows/ci.yml@refs/heads/<locked-branch>`.
Remove temporary admission before unlocking or updating a branch; a reviewed
SHA string alone may not match the workflow ref used by runner scheduling.
Keep `ci.yml@refs/heads/main` and the main-only `npm-audit-fix.yml` admission;
preserve all unrelated group restrictions. Do not add hosted CI fallbacks.
Node dependency caching is disabled before source admission.

Release preparation waits for the PR API to report `MERGED`, including when a
successful merge command only queues the request. It fails closed on closed
PRs, API errors, unexpected states or the bounded merge timeout. The generated
release branch needs the same review and locked-ref admission before its
required CI can execute. Continue through the ordinary protected merge and
`cd.yml` exact-main/production OIDC gates, and verify the published version and
provenance. Never reuse a removed version.

The inherited `platform.public-artifact-integrity.enabled` flag controls staged
public distribution; mandatory integrity checks remain enforced in either flag
state. Rollback disables `cd.yml` or the affected distribution channel and
removes temporary runner admission, without restoring the administrative path
or a token-based publication path. See
[ADR-0011](../adrs/adr-0011-trusted-ci-and-confirmed-release-merges.md).

## Finalising a registry-verified draft after main advances

If npm publication succeeded but registry verification timed out, first retry the
original failed job while its exact source is still main. If main has advanced,
use `cd.yml` on current main with `phase=finalize`, the original `published_run_id`,
`expected_commit_sha`, and `release_tag`. This phase does not publish npm packages,
move distribution tags, regenerate artifacts or rewrite source tags.

Its read-only job verifies the original main CI and completed publication steps,
the npm tarball's registry signature/integrity and provenance, and GitHub's signed
artifact attestations for that tarball and both draft attachments. Attestations
retain the original immutable artifact identity when one-day workflow artifacts
have expired. The source tag must still match and be an ancestor of current main.
A separate contents-write job rechecks current main, source tag and the complete
draft fingerprint, then clears draft status without promoting latest. Missing or
changed evidence fails closed. The normal prepare/publish paths keep their strict
exact-main checks. Finish this phase before preparing the next version.

GitHub restricts draft visibility to callers with push access. A preliminary
production job therefore collects the fixed release metadata and two attachments
using GET requests only, without checkout, dependencies or repository scripts.
It seals that snapshot for the separate read-only verifier. Only the final job
can mutate release state, after verification and a fresh metadata comparison.
The collector has no npm/OIDC authority and never publishes or edits anything.

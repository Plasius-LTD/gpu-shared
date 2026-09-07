# ADR-0011: Trusted CI and confirmed release merges

- Status: Accepted
- Date: 2026-09-07
- Work: gpu-shared#100 and its release dependency gpu-shared#113;
  plasius-ltd-site#1626 / Feature #1597.

## Context

Hosted PR validation contradicts the recovery requirement for explicit approved
self-hosted CI. A successful `gh pr merge` can mean queue acceptance while the
PR remains open. Continuing release preparation at that point can fail before
metadata reaches main. ADR-0009's exact-main OIDC publication boundary remains
in force; this decision defines CI admission and confirms the merge transition.

## Decision

CI uses only repository-owned branch pushes and literal
`[self-hosted, Linux, X64]` labels. The existing admission, build/test and public
artifact check names remain stable for branch protection. PR and
`pull_request_target` events cannot execute this CI. Dependency audit validation
uses the same runners, restricted to main. Jobs are bounded and setup-node's
automatic dependency cache is disabled before source checks.

The quarantined runner group's repository and workflow allowlists remain
mandatory. Review a branch's exact commit and workflow, lock it with enforced
admin protection and no push allowances, deny force pushes, deletion and fork
syncing, and verify the SHA before adding its fully qualified workflow branch
ref. Remove admission before any unlock/update. This applies to release
metadata branches too. Do not broaden admission to arbitrary or fork refs.
The documented renderer recovery established that the scheduler can identify a
workflow by its branch ref even when its SHA is separately allowlisted.

Release preparation treats merge commands as requests. Both immediate and
retried requests converge on one bounded polling loop. Only observed `MERGED`
allows continuation; `OPEN` continues polling, while `CLOSED`, API errors,
unexpected states and deadline expiry fail with safe diagnostics. The workflow
then retains all main-version, exact-SHA CI, protected-main, artifact sealing
and hosted production OIDC checks from ADR-0009.

The existing `platform.public-artifact-integrity.enabled` flag controls staged
distribution, not mandatory integrity enforcement. Enabled and disabled states
both preserve source/artifact gates. Rollback disables the workflow/channel and
removes temporary runner admission; it never restores the prohibited path or
long-lived npm credentials. No capability or runtime API change is needed.

## Alternatives and consequences

- Hosted CI or mutable/unrestricted workflow admission would contradict the
  approved trust boundary; unavailable capacity must remain a tracked blocker.
- Treating merge command success as completion is incorrect for merge queues.
  Reading state after every accepted request retains truthful completion.
- Polling has an explicit deadline; an operator may need a fresh preparation
  run after a delayed queue or a concurrent main change.
- Maintainers must review and admit locked release branches. Required checks
  and protected merges are preserved; no admin bypass is introduced.

## Validation and release

Workflow contracts enforce runner labels, push-only triggers, admission
dependencies, cache policy and bounded jobs. Tests execute the real release
merge shell block with a mock GitHub CLI covering immediate, queued, eventual,
closed, failed API, unexpected-state and timeout outcomes. Run full repository
coverage, lint, typecheck, build, public package/Zero-Three gates, dependency
audit and actionlint before the required pushed CI and protected merge.

Publish a fresh version only through `cd.yml` on main/production. Verify exact
release-commit CI, successful preparation/publication, registry tarball and npm
provenance. Workflow-only changes do not affect accessibility, browser APIs,
SEO, runtime performance or package dependencies.

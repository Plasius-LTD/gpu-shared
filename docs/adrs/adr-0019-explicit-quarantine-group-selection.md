# ADR-0019: Explicit quarantine-group selection

- Status: Accepted
- Date: 2026-10-23
- Work: gpu-shared#170, blocking #62; Feature site#1597 / Story #1626.

## Context

ADR-0011 already requires quarantined runner admission, but its bare fixed-label
selectors also matched unrestricted Default capacity. CI40025539216 ran all three
required jobs in group1. A group3 workflow allowlist constrains group3 only; it
cannot prevent another matching group from accepting a job.

## Decision

Select the existing approved `Public CI - Quarantined` group explicitly together
with literal `[self-hosted, Linux, X64]` labels for all three CI jobs and the
same-policy scheduled dependency job. Preserve trusted repository push triggers,
fork exclusion, required check names, job bounds and cache policy. Keep main
protection and hosted production/OIDC publication unchanged. Do not alter Default
group access or unrelated repositories. This implements the existing admission
decision rather than introducing a new group or runner trust policy.

Reviewed implementation/release branches still require exact-SHA verification,
enforced locks without push allowances and exact workflow admission before jobs
execute. Remove temporary admission before branch updates and after delivery.
Unavailable quarantined capacity leaves checks pending and delivery blocked;
there is no Default or hosted CI fallback. The inherited
`platform.public-artifact-integrity.enabled` governs staged distribution, while
integrity/admission enforcement remains mandatory in both flag states. Rollback
disables the workflow/channel and removes admission; it cannot restore an
unrestricted selector.

## Verification and release

Failing-first workflow contracts require every expected job to contain both
the fixed group and labels. Existing push/fork/cache/timeout and hosted OIDC
contracts remain. Run actionlint, full package checks and record actual job
metadata proving group3 for branch, main and release CI. Use protected PR merge,
exact-main CI and normal main/production `cd.yml` publication. No dependency,
browser API, product capability or backend deployment changes are required.

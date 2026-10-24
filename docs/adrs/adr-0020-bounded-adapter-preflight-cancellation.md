# ADR-0020: Bounded adapter preflight cancellation

- Status: Accepted
- Date: 2026-10-24
- Work: gpu-shared#55; Feature site#1150; dependent Story site#1160.

## Context

ADR-0017 and TDR-0007 require enabled adapter failures to be finite, payload-free
categories. Native `AbortSignal.throwIfAborted()` throws the caller's arbitrary
reason unchanged. Its use before the bridge's normalization let pre-aborted
loads escape that contract even though they correctly performed no fetch.

## Decision

After existing option-budget validation, inspect the native signal's `aborted`
state and construct the existing `GltfAdapterLoadError('aborted-or-timeout')`.
Do not read, coerce, serialize, attach or retain the reason. Reject before the
bridge creates a controller, timer, listener, request or projection/fallback work.
Keep mid-load cancellation and deadline handling intact. This corrects the
enabled boundary; missing/false conversion decisions retain legacy behaviour.

The existing released runtime and glTF packages still own acquisition and format
validation. No new parser, dependency, public export or telemetry is introduced.
The host's remote `gpu.model.conversion.enabled` decision remains the source of
truth. Disable that registered flag for next-load legacy rollback; no capability
applies to this package-only correction and no local environment gate is added.

## Alternatives and consequences

Wrapping arbitrary reasons as `cause`, strings or diagnostics would preserve
unbounded caller content. Moving all preflight setup into a new catch/finally
would expand the change and require partially initialized cleanup. A direct
bounded rejection preserves option-validation precedence and avoids both costs.

## Verification and release

Requirements-first tests cover default, Error, string, object and hostile reasons
through source and installed ESM/CJS public entries, normal and showcase URLs,
zero allocation/callbacks, mid-flight abort/deadline, legacy controls and valid
assets. Retain >=80% coverage and changed-source LCOV, lint/types/build, dependency
audit, privacy/pack and Zero-Three checks. Verify actual browser loading and
cancellation without claiming a new rendering/device qualification.

Use the protected PR, locked exact-branch quarantine admission and verified
group3 CI prescribed by ADR-0011/0019, then normal exact-main `cd.yml` production
OIDC publication and public registry/consumer verification. No site/backend
deployment or ACA environment mapping changes apply. See TDR-0008.

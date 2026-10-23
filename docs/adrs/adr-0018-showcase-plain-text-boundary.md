# ADR-0018: Plain text at the showcase DOM boundary

- Status: Accepted
- Date: 2026-10-23
- Work: gpu-shared#62; parent Feature plasius-ltd-site#1170 / Epic #2271.

## Context

The harbour's public header options and `describeState()` lists entered HTML
parsers. Caller translations also entered initial text and a double-quoted
`aria-label`. These APIs accept strings and promise no rich markup. A host
cannot safely pass asset, configuration or translated text without a shared
rendering boundary.

## Decision

Keep the existing static semantic template. Encode every public header value and
translation at insertion, including ampersands before angle brackets and quotes,
so entity-looking input is preserved as literal text. Dynamic diagnostic lists
construct `li` elements with `textContent` and replace the list's children. Both
native and Canvas2D callers use that helper. Existing status/details text nodes,
serialized state, controls, focus selection and host-markup restoration remain
unchanged. No sanitizer, new public API or dependency is introduced.

Replacing only the example payloads would leave alternate translations and
attribute contexts exposed. Rebuilding the entire static template would add
unnecessary layout churn. Consumers must pass original text rather than HTML
entities or markup. Safety is unconditional; the inherited remote
`gpu-demo.scene-fidelity.enabled` controls product exposure and native selection,
and existing host capabilities remain the access authority. Disabling the flag
never restores unsafe parsing. Rollback disables exposure through that flag.

## Verification and release

Failing-first mount regressions cover headers, translation attributes, all four
hook lists, fallback metrics/notes, successive updates, empty arrays and teardown.
A real browser compares the original and patched paths for injected elements,
handler execution, ordinary punctuation/entity preservation and semantic controls.
Existing native/fallback and lifecycle suites must still pass, with >=80% total
coverage and the changed runtime present in LCOV. Local text rendering adds no
I/O, credentials, logging or async work. Lists retain their existing per-frame
replacement lifetime.

Release this existing public package through protected main CI and its configured
`cd.yml`/production OIDC workflow, then verify the registry and immutable artifact
evidence. Site adoption and site/backend deployment are outside this package task.

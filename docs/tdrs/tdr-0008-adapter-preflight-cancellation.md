# TDR-0008: Adapter preflight cancellation

Date: 2026-10-24. Task gpu-shared#55; Feature site#1150; Story site#1160.
Decision: [ADR-0020](../adrs/adr-0020-bounded-adapter-preflight-cancellation.md).
This supplements [TDR-0007](tdr-0007-gltf-adapter-migration.md).

## Expected behaviour

| Request | Result |
| --- | --- |
| Enabled, valid budgets, native signal already aborted | New Error named GltfAdapterLoadError, code aborted-or-timeout, fixed message; no reason/cause retained |
| Enabled, invalid budget and aborted signal | Existing invalid-options error retains validation precedence |
| Enabled, abort during acquisition or total deadline | Existing aborted-or-timeout category and cleanup |
| Missing/false remote decision | Existing legacy API and cancellation reason behaviour |
| Enabled, valid asset | Existing bounded runtime/glTF import and source-space projection |

Preflight rejects before bridge controller/timer/listener creation, acquisition,
format parsing, renderer projection, compatibility or inline showcase fallback.
Public lazy module evaluation can still occur; this does not promise zero module
loading. No signal reason property is read, including a hostile own getter.
The error has only the existing `name` and `code` enumerable properties, its fixed
message and ordinary generated Error stack. No custom cause or reason is stored.

## Verification

Shared public-contract fixtures exercise Error/string/object/default/hostile
reasons and both ordinary and inline-showcase URLs in source, packed ESM/CJS and
published ESM/CJS. Direct bridge spies assert zero controller/timer/listener,
fetch, projection, compatibility and inline calls. Strengthened existing abort
and deadline cases require the same finite category. Legacy and valid-load
controls protect rollback and compatibility. Full package coverage must retain
the changed adapter in LCOV with >=80% total line coverage.

Security/privacy checks require fixed failure content and no reason retention;
performance/reliability checks require early rejection and no work allocation.
Maintainability/build checks reuse the current finite category and released
dependencies, frozen Node24 installation, lint/types/build/audit and artifact
admission. No UI/SEO/transactional storage changes apply. Browser probes confirm
the published lazy API works without Node globals; full device/rendering claims
remain outside this bounded correction. No local publication, dependency churn,
workflow weakening or site deployment is required. Final evidence and approved
production release links belong on Task55.

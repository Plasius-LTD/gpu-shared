# TDR 0007: glTF loader migration and compatibility contract

Date: 2026-10-21. Task gpu-shared#55; parent Feature site#1150.
Decision: [ADR0017](../adrs/adr-0017-gltf-adapter-migration.md).

## Contract mapping

| Existing behaviour | Enabled adapter path |
| --- | --- |
| JSON/GLB, embedded/data/external buffers and relative images | Released importGltfToGpuModelDocument owns admitted format/resource validation and source normalization |
| Source node matrices/TRS, hierarchy, winding and world positions | Project normalizedGlb, which retains source space; do not project the canonical reflected/floor-centred document into this legacy API |
| Names, node extras.physics and aggregate bounds | Existing shared projection retains traversal, primitive identity, physics and bounds |
| Normals, UV0, colors, indices and material identity | Existing projection reads normalized source accessors; repeated authored materials remain shared within a load |
| Five core and twelve existing extension texture slots/factors | Existing material projection and browser image decoding, including current transform baking and renderer limitations |
| WebP and other explicitly unsupported format features | Explicit legacy projection with importProfile=legacy and compatibilityReason=unsupported-gltf-feature; original entry bytes reused |
| Missing/disabled remote decision | Existing legacy loader with unchanged one-argument API |
| Approved brigantine network fallback | Same inline source only for failed entry acquisition without SRI, explicitly reported |
| Signal and SRI manifest | Original external URLs checked before each request; native fetch SRI; no fallback on missing/mismatched integrity or abort |
| Entry-only runtime cache | Not registered; all calls reacquire resources; no stale nested revisions |

## Ownership, bounds and observability

The caller supplies the remotely evaluated gpu.model.conversion.enabled boolean;
showcase/ProductStudio use their existing remote snapshot. Live registration was
read back as backend/default enabled/target enabled/100%; no setting changed.
No capability is added. Runtime/glTF imports are lazy, browser-safe registry
packages. Two targeted dependencies are added: gpu-model-gltf (none -> exact0.6.1)
and gpu-model-runtime (none -> exact0.3.1). No unrelated versions are upgraded.

Enabled loads use a total30s deadline (including compatibility/image projection),
16MiB entry and64MiB aggregate external acquisition caps, one request at a time,
one attempt per request and no retries/cache. timeoutMs/maxInputBytes only tighten
hard ceilings. The owning importer additionally enforces its resource counts,
JSON, geometry expansion, validator and decoded-image limits. Enabled projection
serializes image decoding and caps retained RGBA at64MiB and dimensions4096 before
canvas allocation. Native browser decoders allocate internally before dimensions
are available; this is not a bound on their private peak memory. Large models
should be prepared in a host worker; same-thread synchronous validation/projection
is finite but cannot be interrupted mid-call. Legacy no-decision consumers retain
their previous policy and supported profile.

Compatibility is deliberately reported rather than called a successful canonical
import. It keeps the existing static renderer semantics; animation evaluation,
full canonical editing, all material lobes/UV sets, alpha/sidedness improvements
and exact browser image-memory accounting are not added here. Existing owned
Tasks130/133/134/135/143 and their PRs remain separate. Retain source texture
limitations and current transform baking; do not silently substitute canonical
UV0 when another binding is authored.

Errors from the new bridge are bounded payload-free categories. No provider
error, credential, URI or source name is copied into diagnostics. Model names
and physics remain owned source content. Results are frozen; compatibility reason
and importProfile support host diagnostics without package-local telemetry.

## Requirements-derived verification and NFRs

- Security/privacy: malformed input, missing external SRI, actual browser SRI
  failure, budget/stream cancellation and sanitized failures; no secrets/PII or
  production configuration changed.
- Reliability/scalability: pre/mid abort, ignoring producer, total deadline,
  single-attempt sequential acquisition, no persistent/global model cache;
  changed external bytes under unchanged entry URL must change output.
- Compatibility/performance: compare all ten committed assets and ProductStudio
  meshes exactly with legacy, preserving source origin/winding/physics/materials;
  test actual mount paths and lazy public ESM/CJS packaging. Browser observations
  are smoke evidence, not a device performance claim.
- Maintainability/testability: reuse released format/runtime implementations and
  the existing source projection, no third format/renderer implementation;
  failing-first regressions, full coverage and changed-source LCOV.
- Accessibility/SEO: no markup, navigation or interactive-control changes;
  mount paths retain existing UI and teardown. A11y/SEO outcomes are unchanged.
- Dependency/build/portability: frozen Node24/npm install, strict types/lint/build,
  full audit and signatures, pack/privacy/Zero-Three, installed exports and browser
  bundle without Node globals. Physical rendering and browser matrix results must
  be reported precisely in the issue, not inferred from data equality.
- Release safety: focused PR and exact-SHA CI; existing two-phase main/cd.yml
  production npm-OIDC release; registry bytes/provenance/installed consumer checks.
  No site/backend deployment or ACA sensitive-env mapping applies to this package
  release. Site adoption/qualification stays in its tracked consumer work.

Final command, SHA, CI/CD, browser and registry evidence belongs in Task55.
Do not mark the task, coordinator or parent Feature Done from this document.

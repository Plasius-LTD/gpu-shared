# ADR 0017: Gated glTF format ownership and source projection

Status: accepted, 2026-10-21. Project gpu-shared#55; Feature site#1150.

The shared showcase and Product Studio need the released format adapter without
changing the public GltfModel's source-space geometry or existing renderer
material/physics interpretation. Canonical geometry reflects Z, reverses winding
and adds a floor-centred root; substituting it directly moves the harbour.

Use public @plasius/gpu-model-gltf 0.6.1 for bounded import and its source-normalized,
self-contained GLB artifact. Project that verified source artifact through the
existing shared renderer mapper. Reuse public @plasius/gpu-model-runtime 0.3.1 for
bounded acquisition rather than implementing another stream reader or cache.
Lazy-load both only when the host's remote gpu.model.conversion.enabled decision
is true. Missing/disabled decisions retain the established legacy loader.

Retain explicitly unsupported features, including the existing WebP interpretation,
through a compatibility projection of the admitted source bytes. Its external
acquisition shares SRI, sequential request budgets and the total deadline. Report
its reason. Validation, integrity, limits and cancellation cannot select this
path. Preserve the existing approved inline brigantine only on entry acquisition
failure without a manifest, within that same deadline and byte budget.

Do not register the broad importer in ModelRuntime's entrypoint-only cache.
Each call reacquires external revisions; normalized artifact/resource hashes are
not interchangeable with the entry hash. A future cache needs whole-resource
revision identity and invalidation ownership before adoption.

Alternatives: immediate removal breaks WebP and existing no-decision consumers;
direct canonical projection changes the existing scene contract and has narrower
renderer texture-transform/UV handling; copying the format parser duplicates
package ownership. Retaining legacy as an explicit compatibility layer avoids
those changes while moving enabled acquisition/validation to the owning packages.
The compatibility layer is not a claim that unsupported assets were canonically
validated, animated, repaired or cached.

No new capability applies to this package-only implementation choice. Rollback:
disable the registered remote flag, reload assets, or use a previously qualified
package release. No local env gate, site rollout or backend configuration change.

Tests compare all ten tracked showcase assets and actual mount paths, packed
ESM/CJS, source origin/hierarchy/physics/material/texture identity and rejection
paths. Keep >=80% coverage and every changed source file in LCOV. Ship through
the existing main/cd.yml production npm release, then verify registry bytes and
installed consumers. See TDR0007 for the complete mapping and limitations.

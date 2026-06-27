# ADR-0004: Showcase Asset Catalog and Richer GLTF Contract

- Status: Accepted
- Date: 2026-05-13

## Context

The shared harbor scene had outgrown its original placeholder assets. One tiny
brigantine mesh reused for every ship, plus box-built harbor geometry, limited
the realism of the default validation scene even when the cloth, fluid, and
lighting packages were behaving correctly.

At the same time, existing consumers already depended on the public
`resolveShowcaseAssetUrl()` and `loadGltfModel()` helpers, so the package could
not break its older flattened mesh contract just to support a richer scene.

## Decision

Keep the public brigantine helper path stable, but expand the package from a
single shared ship asset to a package-owned showcase asset catalog and broaden
the GLTF loader contract so it can surface multi-node, multi-primitive, and
material-aware models while still returning the legacy aggregate mesh fields.

## Consequences

- The shared runtime can render distinct ships plus modeled harbor structures
  and a generated shoreline/breakwater without introducing a renderer-specific
  dependency or a new consumer-only asset path.
- Existing consumers that only read `positions`, `indices`, `bounds`, `color`,
  and `physics` keep working.
- Newer consumers can use `model.primitives` and material metadata to drive
  richer shading and more believable scene composition.

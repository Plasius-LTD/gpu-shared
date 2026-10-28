# ADR 0023: Resource-budgeted scalable scene preparation

Status: Accepted. Date: 2026-10-28. Task #188; site Story #2342; Feature #1170.

## Decision

Extend ADR 0022 by removing the 128-placement, six-source and ±20 layout limits.
Keep finite renderer-compatible transforms, unsigned identity limits, integrity
manifests, sequential loading, decoded CPU texture protection and the renderer's
actual requested-resource budget. Yield every 256 placements during validation
and composition so cancellation and UI events can run. Cache canonical manifests
per supplied object and source projections per size and primitive selection.

Allow optional distinct decoded primitiveIndices. Recompute selected bounds,
retain original materials and decode each URL once. Different selections have
independent local coordinate normalization; repeated identical selections share
geometry. This permits one shrub from a multi-variant source without changing
source files or attributing seven plants as one individual shrub.

## Consequences

The renderer remains responsible for GPU allocation/layout and admission. Shared
code does not duplicate a renderer byte formula or expand instanced triangles.
No physical VRAM, animation or fixed throughput guarantee is implied. Large
preparation cancellation, 3,000/15,000/30,000 placements, source reuse, selected
bounds, invalid selections and retained lifecycle behaviour are tested.

The host inherits gpu-demo.scene-fidelity.enabled and
site.studio-coming-soon.view from Feature #1170, using its remote evaluator.
Rollback uses those controls or the prior approved deployment. Release through
main cd.yml/production, then consume the released package in viewer and site.

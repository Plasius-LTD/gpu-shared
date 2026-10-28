# TDR-0001: Shared Browser Runtime Contract

## Summary

`@plasius/gpu-shared` exports a browser-safe `mountGpuShowcase(...)` function for
the family-owned 3D harbor/showcase runtime.

## Contract

- The runtime is browser-safe and ESM-compatible.
- The runtime owns shared DOM, canvas, GLTF loading, and showcase orchestration.
- The runtime consumes family package APIs for cloth, fluid, lighting,
  performance, debug, and browser-safe physics planning.
- Callers can specialize titles, subtitles, roots, and focus mode without
  cloning runtime files.
- Harbour header/translation values and live metric/note arrays are plain text.
  HTML-looking strings and entity syntax display literally without pre-escaping;
  see [ADR-0018](../adrs/adr-0018-showcase-plain-text-boundary.md).
- Product Studio mode starts from a host-safe wavefront render budget and
  requires callers to opt into higher `width`, `height`, or `maxDepth` values
  deliberately.

## Material-study sizing correction (Task #145)

The isolated material study retains the ownership boundary in ADR-0013. Its
drawing buffer uses a common scale limited by DPR 2 and both 1440-pixel edge
budgets. Independent edge clipping distorts portrait views; changing the
renderer projection would also change every consumer. Correct sizing belongs in
this runtime, with no renderer or camera replacement on resize. Integer rounding
and the one-pixel minimum allow at most one pixel of shorter-edge error.

Regression tests cover portrait/landscape/square/extreme dimensions, fractional
and high DPR, orientation changes and hidden-canvas recovery. This is an
implementation correction with no API or package-boundary change. The host
continues to evaluate `gpu-demo.scene-fidelity.enabled` and its route capability;
stored disable/rollback prevents subsequent mounts. Sizing remains unconditional
for admitted runtimes. Release through package main/production `cd.yml`; site
Task #2300 owns published-version adoption and responsive visual qualification.

## Material-study failure ownership (Task #146)

[ADR-0024](../adrs/adr-0024-material-study-terminal-failure.md) adds an optional
typed one-shot host notification after terminal input/GPU cleanup. The current
renderer generation owns unavailable signals; old devices cannot fail a newer
replacement. Camera and resize draws use the same containment path. Initial
mount rejects, mounted update rejects and notifies, and intentional teardown
remains silent. Notification is queued after cleanup to preserve await/handle
handoff; destroy or external abort cancels pending delivery. Callback failures
are contained after all cleanup attempts.
The host owns observer disconnection, accessible retry and new gated mounts.
Deterministic lifecycle, public-entry/type and package checks qualify this
boundary; physical GPU/host release acceptance remains on site#2300.

## Product Studio startup ownership (Task #160)

[ADR-0021](../adrs/adr-0021-product-studio-startup-ownership.md) supplements the
Product Studio boundary in ADR-0005. Failed acquisition or first draw releases
owned renderers and restores the captured host markup/class ownership before
rejecting with the original failure. Destroy is idempotent, attempts every
cleanup step and then reports its first cleanup failure. Consumers own their
visible error state and Blob URLs; they do not need a nonexistent failed handle.

Each root has one mount owner. Replacement disposes the previous mount, fences
late acquisition and preserves the newer canvas/snapshot. Snapshot hooks across
roots skip disposed predecessors. Host rollout/capability evaluation stays
external; cleanup remains unconditional for admitted resources, including
rollout disable/unavailable/rollback states. Existing bounded loaders, renderer
APIs and package dependencies are reused. Regression tests exercise these
contracts through public entries and the README example. Release only through
protected PR/exact-main CI and main/production cd.yml; qualify registry bytes and
installed ESM/CJS consumers before closure. No site adoption is claimed here.

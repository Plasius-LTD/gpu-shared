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

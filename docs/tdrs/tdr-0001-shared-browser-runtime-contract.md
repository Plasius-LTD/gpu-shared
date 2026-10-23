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

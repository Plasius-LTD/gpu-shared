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

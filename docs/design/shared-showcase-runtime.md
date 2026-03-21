# Shared Showcase Runtime

`@plasius/gpu-shared` exists to hold the browser-safe pieces that multiple GPU
package demos need in common:

- shared GLTF asset loading
- the harbor/showcase scene shell
- shared 3D validation layout and controls
- family-owned integration between cloth, fluid, lighting, performance, debug,
  and physics planning packages

## Boundary

This package is intentionally demo/runtime-oriented. It does not replace
`@plasius/gpu-renderer` as the long-term scene renderer API. The current family
showcase still draws its own scene here because `gpu-renderer` does not yet
publish a reusable scene/mesh submission surface for browser demos.

## Consumers

- `gpu-demo-viewer`
- `gpu-lighting`
- `gpu-cloth`
- `gpu-debug`
- `gpu-performance`
- `gpu-physics`

## NFR Notes

- Browser-safe: no React dependency in the shared runtime path.
- Reusable: one source of truth for the shared showcase.
- Maintainable: package-local docs/tests/changelog track runtime changes.
- Secure: no secrets, no analytics transport, no external network fetches beyond
  local demo asset loading.

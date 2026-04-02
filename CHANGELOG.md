# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.6] - 2026-04-02

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - Shared asset and glTF buffer loading now resolve reliably in browser consumers
    when the initial request URL is relative, using the fetched response URL as
    the stable base for nested asset requests.

- **Security**
  - (placeholder)

## [0.1.4] - 2026-03-26

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.3] - 2026-03-26

- **Added**
  - Public-contract tests that lock the package export surface for the shared
    runtime and bundled brigantine asset.
  - Public `destroy()` teardown hook on `mountGpuShowcase()` so browser consumers can clean up the shared runtime safely on route/page unmount.

- **Changed**
  - Documented the import-map pattern for browser demos so consumers stay on the
    published `@plasius/gpu-shared` package surface instead of deep internal
    paths.
  - README usage now documents the shared teardown contract for public consumers.

- **Fixed**
  - Shared brigantine asset resolution now falls back to an inline browser-safe
    data URL when a consuming bundler does not provide a valid module base URL,
    preventing `Invalid URL` crashes in hosted GPU demo catalogs.

- **Security**
  - (placeholder)

## [0.1.2] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.1] - 2026-03-23

- **Added**
  - (placeholder)

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)

## [0.1.0] - 2026-03-21

- **Added**
  - Initial `@plasius/gpu-shared` package scaffold.
  - Shared harbor/showcase runtime migrated out of `gpu-demo-viewer`.
  - Shared GLTF loader and bundled brigantine demo asset.
  - ADRs, TDRs, design docs, and public API tests.

- **Changed**
  - (placeholder)

- **Fixed**
  - (placeholder)

- **Security**
  - (placeholder)


[0.1.0]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.0
[0.1.1]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.1
[0.1.2]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.2
[0.1.3]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.3
[0.1.4]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.4
[0.1.6]: https://github.com/Plasius-LTD/gpu-shared/releases/tag/v0.1.6

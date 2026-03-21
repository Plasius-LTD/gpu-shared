# @plasius/gpu-shared

[![npm version](https://img.shields.io/npm/v/@plasius/gpu-shared.svg)](https://www.npmjs.com/package/@plasius/gpu-shared)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Plasius-LTD/gpu-shared/ci.yml?branch=main&label=build&style=flat)](https://github.com/Plasius-LTD/gpu-shared/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/codecov/c/github/Plasius-LTD/gpu-shared)](https://codecov.io/gh/Plasius-LTD/gpu-shared)
[![License](https://img.shields.io/github/license/Plasius-LTD/gpu-shared)](./LICENSE)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-yes-blue.svg)](./CODE_OF_CONDUCT.md)
[![Security Policy](https://img.shields.io/badge/security%20policy-yes-orange.svg)](./SECURITY.md)
[![Changelog](https://img.shields.io/badge/changelog-md-blue.svg)](./CHANGELOG.md)

Shared browser-safe demo runtime and asset helpers for the Plasius `gpu-*`
package family.

Apache-2.0. ESM + CJS builds.

## Install

```bash
npm install @plasius/gpu-shared
```

## What It Solves

- Moves shared 3D showcase/demo runtime ownership out of `gpu-demo-viewer`.
- Provides one package home for GLTF loading and harbor/showcase mounting.
- Reuses `@plasius/gpu-cloth`, `@plasius/gpu-fluid`, `@plasius/gpu-lighting`,
  `@plasius/gpu-performance`, `@plasius/gpu-debug`, and browser-safe physics
  planning from `@plasius/gpu-physics/browser`.
- Keeps package demos aligned on the same family-owned scene contract instead of
  carrying duplicated runtime copies.

## Usage

```js
import { mountGpuShowcase } from "@plasius/gpu-shared";

await mountGpuShowcase({
  root: document.getElementById("app"),
  packageName: "@plasius/gpu-demo-viewer",
  title: "Flag by the Sea",
  subtitle: "Shared 3D validation scene for the gpu-* family.",
});
```

## Asset Helpers

```js
import {
  loadGltfModel,
  resolveShowcaseAssetUrl,
  showcaseFocusModes,
} from "@plasius/gpu-shared";

const shipUrl = resolveShowcaseAssetUrl();
const shipModel = await loadGltfModel(shipUrl);

console.log(showcaseFocusModes);
console.log(shipModel.physics);
```

## Demo

```bash
npm run demo
```

Then open `http://localhost:8000/gpu-shared/demo/`.

This package demo mounts the integrated harbor showcase so the shared runtime
can be validated independently of `gpu-demo-viewer`.

## Current Boundary

`@plasius/gpu-shared` owns the shared browser/demo orchestration surface. It
does not replace `@plasius/gpu-renderer` as the long-term runtime renderer API.
The current showcase still centralizes scene drawing here because
`@plasius/gpu-renderer` does not yet expose a reusable scene/mesh submission
surface for these family demos.

## API

- `mountGpuShowcase(options)`
- `loadGltfModel(url)`
- `resolveShowcaseAssetUrl(baseUrl?)`
- `showcaseFocusModes`

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

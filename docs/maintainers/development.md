# Shared runtime development

Use Node.js 24 (see `.nvmrc`) and npm from the repository root. Run source admission
before installing dependencies, then validate the installed and built package:

```sh
npm run zero-three:source
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run pack:check
npm run zero-three
```

## Renderer dependency boundary

The shared runtime composes Plasius's native WebGPU packages. Repository
validation keeps production, development, test, tooling, peer, optional and
artifact dependency graphs independent of Three.js and its related renderer
packages, including R3F and TSL. This defines the implementation scope of this
package. It does not express a judgement about those projects.

The existing checks are named `zero-three:source` and `zero-three`.
Source admission checks the repository before dependency installation. The full
check validates the installed graph, built bundle, actual npm tarball and
CycloneDX evidence, writing `release-artifacts/zero-three-evidence.json`.
CI and production CD retain and verify this evidence; all checks remain required.
See the [architecture records](../adrs/) for the existing decisions and
[release operations](./releasing.md) for runner admission and publication.

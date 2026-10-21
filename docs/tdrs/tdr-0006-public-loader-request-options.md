# TDR 0006: Public loader request options

Date: 2026-10-21. Task: gpu-shared#144. Story: site#2272.
Feature: site#1170; inherited host flag `gpu-demo.scene-fidelity.enabled`.
Related migration: gpu-shared#55. Existing ownership: TDR0002 and ADR0013.

## Problem and decision

The root `loadGltfModel` wrapper dropped the optional request policy already
declared by `GltfLoadOptions` and enforced by the internal loader. Forward the
complete options object through the existing dynamic import. Keep request
acquisition, manifest admission and fallback in that loader. Duplicating them
in the barrel would create two policy implementations. No new architecture,
dependency, public signature, parsing path, remote flag or capability is needed.
Correct cancellation and integrity admission are unconditional.

```js
import { loadGltfModel } from "@plasius/gpu-shared";

const controller = new AbortController();
const url = new URL("/models/scene.gltf", location.href);
// A build-produced manifest maps every absolute model/buffer/image URL to its
// actual SRI digest. Obtain it from your trusted asset publication process.
const manifest = await trustedAssetManifest();
const model = await loadGltfModel(url, {
  signal: controller.signal,
  integrity: manifest,
});
```

An empty manifest rejects before the first fetch. Missing nested entries reject
before that resource is requested. Each allowed fetch receives the caller's
signal and that resource's digest; the browser enforces SRI. Cancellation stops
subsequent requests. Neither an aborted load nor a supplied manifest may invoke
the inline default-model fallback. Optionless calls retain existing behavior.
This repair does not add a timeout, CPU interruption, cache or redirect policy.

`model-inspection.js` and `material-study.js` import the internal loader directly;
their existing request policy is retained. The inspection runtime owns bounded
selection, cancellation, disposal and visible failures. This patch does not
claim adoption or qualification of a website/viewer release (site#2300) or of
the separate adapter migration (#55).

## Verification and release

Requirements-derived source and freshly packed public ESM/CJS tests cover
pre-abort, missing model/buffer/image digests, exact signal/digest forwarding,
mid-load abort, integrity rejection, one-argument loading and ordinary fallback.
The packed test rebuilds the real package and exercises its export conditions
outside the checkout, reusing only installed registry dependencies. Request and
image platform stubs test the forwarding contract; they are not an independent
implementation of browser SRI, decoder or physical rendering.

Run full tests/coverage (>=80%, index.js in LCOV), lint, typecheck, build,
privacy/package admission, dependency audit and the dependency-boundary gate.
Existing material/inspection tests retain enabled/disabled/lifecycle coverage.
No UI or shader changes: accessibility, SEO and physical image quality are N/A.
No secret, personal data, external telemetry or new retry layer is introduced.

Deliver a patch release through the existing PR/main CI and `cd.yml` on main
with the production environment. Verify the exact registry artifact and its
installed public exports. No local publication or backend deployment applies.
Host rollout/rollback keeps its existing remotely evaluated controls. Consumers
requiring this request policy must use the corrected release; older public
wrappers do not satisfy integrity or cancellation requirements. A rollback must
disable that consuming path rather than claim the older wrapper is equivalent.

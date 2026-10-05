# Shoreline harbour construction detail

Parent Epic: plasius-ltd-site#2271. Feature: plasius-ltd-site#1170.
Story: plasius-ltd-site#2272. Task: gpu-shared#56.
Rollout: backend-evaluated `gpu-demo.scene-fidelity.enabled`; existing GPU demo capability remains the access authority.

## Problem and approach

The native lighting exposes the current placeholder architecture: a monolithic timber jetty, uninterrupted roof planes and unframed blue window slabs. Improve the geometry in the existing reproducible asset generator, using the already released gpu-renderer 0.2.46 surface contract. No new runtime dependency, loader fork or unpublished material API is needed.

Author a coursed stone quay with coping, separated pier boards supported by beams/piles/braces, mooring fixtures, and a harbour warehouse with overlapping roof courses, chimney, framed windows and timber doors. Use dark opaque glazing for the existing opaque renderer; do not claim transmission or interior lighting. Geometry must remain closed where structural, with consistent outward normals, no degenerate triangles and real world scale. Retain existing physics metadata and the loading, pause, reduced-motion and teardown contracts.

This is another step toward cinematic realism, not completion of the full environment or the Animation Adventure scene. The separately reviewed textured-material/varnish API remains pending renderer publication; its accepted direction is unchanged.

## Acceptance and tests defined before implementation

- Roof courses follow both roof slopes, stay within the building footprint, and include a ridge finish. Window joinery and doors have visible depth.
- Pier boards have gaps and lie on support geometry, with supporting piles reaching below the waterline; quay joints are actual geometry.
- All exported geometry is finite, non-degenerate and outward-normal consistent. Existing exact regeneration test continues to pass.
- Each complete exported asset remains below 25,000 triangles, and the sum of the five glTF documents remains below 6 MiB uncompressed. No additional network requests or textures.
- Generator/source touched by the PR must appear in LCOV; package line coverage remains >=80%.
- Review actual WebGPU output at desktop and 320px, including pause/resume and keyboard controls. Validate lint/types/build/pack and existing native enabled/disabled/unavailable tests.
- CI and approved main CD are required before release. Current organisation runners are offline; do not bypass the gate. Site package adoption and production validation remain separate obligations.

## Rollback

Disable the existing remote scene-fidelity flag through the site's control plane to stop mounting the public demo. Package rollback follows the approved site CD. No production flag changes are part of the asset edit.

## Local verification (2026-10-05)

The requirements-first geometry tests failed for the absent boards/masonry before
implementation. All 112 package tests now pass; aggregate line coverage is 89.52%,
asset generator 98.06%, generated inline asset module 100%, and the PR's runtime
source 94%. Lint, typecheck, build, package/privacy checks, Zero-Three evidence and
the runtime dependency audit pass (zero vulnerabilities). The existing CommonJS
build warning about `import.meta` in asset URL resolution is unchanged.

Actual WebGPU review uses the installed published renderer 0.2.46. At desktop and
320px, rendering and resizing worked without GPU/browser errors. Keyboard Enter
resumes and Space pauses; focus remains visible, and the narrow control layout
wraps. The diagnostics show 23,070 scene triangles. This is not a frame-rate or
complete WCAG certification. Existing automated reduced-motion, unavailable-device,
flag-off and teardown checks also pass.

The harbour asset has 11,670 triangles; all five files total 2,395,104 bytes
(about 2.28 MiB). The slate colour variation was reduced after visual review so
individual courses do not form an exaggerated checkerboard. Glazing and joinery
retain depth in the sun/shadow/reflection passes.

Release is pending: organisation runners remain offline. The prior 1.1.4 package
is visible in npm, but its CD finalization also failed to obtain a GitHub-hosted
runner (attempts 2 and 3). No production deployment or completion is claimed.

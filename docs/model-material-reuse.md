# Material reuse during model inspection

Parent Feature: site#1170; shared Task #143; catalogue Story: site#2308.
Inherited rollout: `gpu-demo.scene-fidelity.enabled` and the existing GPU route capability.

The first architecture batch exposes 263 primitives using six authored materials
in Modular Factory Facade. The loader currently creates fresh material/texture
wrappers for every primitive. The renderer atlas deduplicates by texture object
identity, so repeated material assignments become repeated atlas tiles and can
stall the browser during CPU preparation. The original input has only 175,014
triangles and remains within the unchanged inspection triangle budget.

Resolve each authored material once per model load and share its immutable result
across primitives. Cache only inside scene collection: no cross-model cache,
retained global state or mutation of glTF source. Distinct material references,
per-slot transforms, factors, geometry and default-material behavior remain
unchanged. Do not hide this by replacing the source or lowering material quality.

Requirements-first tests cover hundreds of primitives sharing one material,
separate material slots, missing/default material, identity propagation through
Product Studio mesh conversion and isolation between model loads. Existing
texture-transform and material-default tests remain mandatory. Recheck the
factory kit in real WebGPU, including completion/camera/model changes; unit
identity assertions alone do not prove browser recovery. Require changed-source
LCOV, >=80% coverage, lint/types/build/pack/privacy/Zero-Three, exact CI and approved
main/production CD before registry consumers update. Existing public APIs remain
unchanged. Factory remains held until the corrected runtime is visually qualified.

## Validation — 18 October 2026

The two material-identity regressions failed before the cache and pass afterward.
All 186 package tests pass, with 91.28% overall line coverage and 85.05% for the
changed glTF loader. Lint, type checking, build, public package/privacy checks and
Zero-Three validation pass. The local viewer uses an explicit source override for
this inspection; production consumers must wait for the registry release.

Real WebGPU review of the unchanged original factory asset completed 64/64
samples at 800 × 282 with six bounces and denoising enabled, showing all 263
primitives (175,014 triangles, six source materials). Keyboard camera movement
reset accumulation to zero and completed 64 samples again. No console errors
were recorded. The source is a modular kit, not an assembled building.

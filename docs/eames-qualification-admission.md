# Representative Eames qualification admission — 26 September 2026

Parent Feature site#2114; Story site#2125; package-owned Tasks track changes before implementation.
The user requires original Eames fidelity for realistic adaptive cost. Six-triangle
native traces remain correctness/microbenchmark evidence only.

## Mandatory input and pipeline identity

Use the site's source-tier Eames chair and ottoman: 265,468 source triangles,
nine primitives, five materials and five original textures. Hash the glTF,
binary and texture files. Reuse gpu-shared's glTF loader and Product Studio mesh
builder, including the room and emissive geometry, normals, UVs, texture
transforms and material properties. No proxy geometry, LOD/texture reduction,
silent unrelated-asset fallback or downscaled render can qualify.

Compare fixed32 and the requested 5.95-SPP radial prescription at native 1080p
and 4K with the same camera, lighting, bounce ceiling and shader source.
Report initialization/loading/BVH construction separately from steady render
jobs; retain actual configuration, rays/counts, linear HDR, timestamps and memory.
Application/GPU-tab delivery and converged image/stability qualification remain
required; a renderer-only capture must not be labelled end-to-end site success.

## Material-default defect found during admission

The shared glTF loader uses custom defaults (base color 0.56/0.33/0.22,
metallic 0.08, roughness 0.92). glTF 2.0 specifies white and factors 1/1:
https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/material.pbrMetallicRoughness.schema.json

The source Eames chrome omits metallicFactor, and textured wood/leather omit
baseColorFactor. Therefore the defect changes real model shading and transport
cost. Correct omission semantics, preserve explicit values (including zero),
and exercise loader-to-Product-Studio mesh propagation. Mirror the correction
in the existing lighting reference loader so references cannot disagree.

No BSDF/PDF/MIS/termination changes are justified by this fix. No new governor,
public fallback or material approximation. Existing generic non-glTF mesh defaults
remain out of scope. Asset mismatch/load failure rejects fidelity admission; the
separate shared Task127 still owns general showcase fallback policy.

## Tests and delivery

Requirements-first omitted material/PBR fields, explicit zero/nonzero factors,
Eames-shaped chrome and textured-material inputs, texture retention and shared
mesh material-kind integration. Reject missing/changed asset evidence and proxy
or reduced scene receipts before accepting performance. Run package coverage,
changed-source LCOV, types, lint, build/package/Zero-Three and post-push CI.
Update README, Unreleased CHANGELOG and ADR/TDR as needed. No package publishing
from a local machine, site rollout, tolerances relaxed or white-paper promotion.
The parent adaptive flag renderer.sampling.adaptivePerPixel.enabled remains off;
faithful source loading is unconditional. Three.js is prohibited without fallback.


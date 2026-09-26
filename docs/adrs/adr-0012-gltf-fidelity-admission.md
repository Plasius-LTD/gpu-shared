# ADR-0012: Standards-based glTF fidelity admission

Status: Accepted. Task gpu-shared#130; Feature site#2114; Story site#2125.

## Context

Custom omitted glTF material factors changed source Eames chrome into a mostly
nonmetal surface and tinted textured materials. Geometry counts alone therefore
cannot establish representative rendering cost.

## Decision

Use glTF 2.0 defaults for omitted PBR fields: white base color, metallic and
roughness factors of one; preserve explicit zero and other values. Keep the
shared loader and Product Studio adapter authoritative. Lighting's reference
loader must agree. No transport approximation or duplicate renderer is added.

Original Eames measurements require immutable source-file hashes, full geometry,
normals, UVs, original texture dimensions and coherent materials through renderer
admission. Missing/substitute input rejects that measurement. General showcase
fallback policy remains the separate Task #127.

## Consequences

Previously incorrect assets can render differently and cost more. Re-capture
evidence rather than reuse old timings. Loader and adapter regressions, package
gates and physical image validation remain required. This correction is not an
adaptive feature flag; the adaptive parent flag remains off. No Three.js fallback.
The source admission screen is not site/application, convergence or 60 Hz proof.

Source: [Khronos glTF material schema](https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/schema/material.pbrMetallicRoughness.schema.json).

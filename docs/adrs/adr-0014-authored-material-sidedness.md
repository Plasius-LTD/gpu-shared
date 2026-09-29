# ADR 0014: Preserve authored material sidedness

Status: accepted. Task #134, site Story #2256 / Feature #2114.

The glTF loader must preserve `material.doubleSided`, default false, and reject
non-boolean authored values. Product Studio forwards this explicit boolean
without changing assets or inferring sidedness from shading normals/material
roughness. Renderer traversal owns rejection and matching occupied-medium exits.

This corrects lost source semantics for both fixed and adaptive rendering.
Existing two-sided non-glTF mesh callers must explicitly request true when
using the paired renderer correction. No dependency or per-pixel state is added.
Tests cover defaults/true/false/invalid and loader-to-mesh forwarding. Local
commit-pinned physical room tests precede coordinated approved CD releases.

Rollout inherits `gpu-demo.scene-fidelity.enabled` and
`renderer.sampling.adaptivePerPixel.enabled`; neither flag overrides source
material semantics. Roll back the paired GPU-native release or reject unsupported
assets. Three.js is prohibited and cannot be a fallback. No local publishing.

Specification: [glTF double sided](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#double-sided).

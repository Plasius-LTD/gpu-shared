# Dual-UV material fidelity and multi-model room reference

Parent: site Epic #2113 / Feature #2114. Material fidelity is a prerequisite
for adaptive comparisons, not a new lighting model. Reuse the shared glTF loader,
Product Studio mapper, renderer wavefront material sampling and lighting room
composition. Three.js is prohibited, including fallback.

Preserve TEXCOORD_0 as `uvs`; add optional `uvs1` for TEXCOORD_1. Honor each
texture's `texCoord`, including the KHR_texture_transform override. Reject
unsupported sets, missing referenced coordinates, malformed lengths and nonfinite
coordinates rather than silently sampling another set. Preserve UV0-only inputs.
Keep the existing texture-transform baking policy; replacing that resampling
policy and implementing other material lobes is outside this fix.

Renderer: retain both coordinates through CPU-upload and GPU-built geometry,
barycentric interpolation and per-texture selection for the five core and twelve
existing extension texture slots. Normal-map tangent construction uses its chosen
UV set. Reuse unused triangle position/normal W lanes for the six UV1 components,
mesh-vertex UV ZW lanes for UV1, and textureSettings.w for an exact 17-bit UV-set
mask. Do not enlarge GPU records, ray queues, hit records or add dispatches.
Document this semantic ABI change and verify reflected sizes and CPU/GPU parity.
Existing BSDF/PDF/MIS, count resolve, exposure and denoise eligibility stay unchanged.

Requirements-first tests: distinct UV0/UV1 values, normalized/strided accessors,
transform override precedence, missing/unsupported sets, unchanged legacy UV0,
all slot masks, packing, GPU builder transfer, normal tangent selection, assembled
WGSL reflection/compilation and physical texture sampling. Physically rerender
the original room with Eames and two explicitly supplied local models, native
1080p/4K, six bounces, current radial sample distribution and raw/filtered evidence.
Use a 52-degree vertical FOV, adjustable back to 62. This is a single-camera
projection, not stereo. Check framing, source materials, bounds and cleanup.

New model assets and derived captures remain local-only. Use bounded, hash-bound
loopback snapshots and default material variants; reject unsupported geometry or
required extensions. No proxy geometry or invented material parameters. Report
all source manifests, material UV selections, placements, camera, completed SPP,
ray counts, memory and failures. No realtime, convergence or speedup claim.

Rollout inherits default-off renderer.sampling.adaptivePerPixel.enabled and
gpu-demo.scene-fidelity.enabled; local fixture controls are test overrides only.
The UV correction applies equally to fixed/adaptive transport and is not bypassed
by silently dropping UV1. Roll back the GPU-native release or exclude unsupported
assets, never use Three.js. Update README/CHANGELOG/ADR/TDR, maintain >=80%
coverage and changed-source LCOV, run lint/types/build/package/Zero-Three and
post-push CI. No local publish or main/CD operation in this task.

# Inspect several models together

Use `createSceneInspection` to arrange your own integrity-checked glTF/GLB files
under one camera and shared lighting. It uses the same progressive path tracer,
mouse/touch/keyboard camera and quality controls as single-model inspection.
Loading this entry does not create a renderer or fetch any models.

```js
const { createSceneInspection } = await import('@plasius/gpu-shared/model-inspection');
// Each manifest maps absolute URLs to real sha256-<base64> digests for the
// source file and every external buffer/image. Generate these during your build.
const inspection = await createSceneInspection({
  canvas: document.querySelector('canvas'),
  enabled: true, // Apply your host's access and rollout decision first.
  models: [
    { modelUrl: chairUrl, integrity: chairManifest, anchor: [-1, 0, 0], size: 1.2 },
    { modelUrl: tableUrl, integrity: tableManifest, anchor: [1, 0, 0], size: 1.8,
      yaw: Math.PI / 2 },
  ],
  width: 1280, height: 720,
  quality: { samplesPerPixel: 64, maxDepth: 6, denoise: true },
  camera: { eye: [3, 2.1, 4.6], target: [0, .7, 0], fov: 32 },
  onProgress: progress => { status.textContent = `${progress.samples}/${progress.target}`; },
  onError: error => { status.textContent = error.message; },
});
// Refinement pauses at the requested target and restarts when the camera moves.
await inspection.setQuality({ width: 3840, height: 2160, samplesPerPixel: 128 });
// On hiding your page, call inspection.setPaused(true); resume with false.
// On changing scenes or removing the canvas, call inspection.destroy().
```

`size` is the model's longest dimension after uniform scaling, between 0.25 and
10 scene units. `anchor` places its bottom centre; Y is height above the shared
ground, so props can sit on other models. Each axis is bounded to ±20 and Y must
be nonnegative. `yaw` rotates around the up axis in radians. Choose consistent
units for all models; unknown source units are not automatically inferred.
Geometry, normals and authored texture/material properties are retained.
The neutral ground receives shared shadows. The default camera is shown above;
it can be reset with Home or `inspection.reset()`.

Supply 1–128 placements from at most six distinct model URLs. Repeated URLs
must have identical integrity manifests and are loaded and decoded once per scene.
Install `@plasius/gpu-renderer` 0.2.57 or newer on the compatible 0.2 line.
Use `instancing: true` to retain one copy of each source mesh and its acceleration
structure on the GPU. Placements become affine instance records and a top-level
acceleration structure; different sizes and rotations still share geometry.
The default expanded path preserves existing scene and emissive-material behavior.
Instancing currently supports static, non-emissive meshes; unsupported emissive
instances fail explicitly instead of silently losing their lighting.

```js
const crowd = await createSceneInspection({
  canvas, enabled: true, instancing: true,
  models: Array.from({ length: 100 }, (_, i) => ({
    modelUrl: astronautUrl, integrity: astronautManifest,
    anchor: [(i % 10 - 4.5) * 1.75, 0, (Math.floor(i / 10) - 4.5) * 1.75],
    size: 1.8, yaw: i * 0.618,
  })),
  camera: { eye: [25, 22, 33], target: [0, 1, 0], fov: 42 },
  memoryBudgetBytes: 1024 ** 3,
});
console.log(crowd.sourceCount, crowd.instanceCount, crowd.getAllocationSnapshot());
```

GPU admission uses the renderer's device limits and requested resource allocation
bytes, with a configurable `memoryBudgetBytes` (default 1 GiB). There is no fixed
triangle-count ceiling. Shared geometry is counted once; instance records, TLAS,
material textures, accumulation, denoising, queues and readbacks consume their
own allocations. WebGPU does not expose reliable available physical VRAM. These
figures exclude driver/pipeline overhead and resources owned outside this renderer.
A fitting byte budget cannot guarantee GPU execution time or prevent device loss.

Decoded CPU texture buffers remain bounded to 128 MiB per scene, independently
of the GPU budget. Loading is sequential and abortable. The existing 60-second
inspection deadline covers scene loading; GPU waits also have deadlines. Integrity
is mandatory for every external resource. Hosts should separately bound downloads,
retain attribution, and provide retry/lower-quality controls after failure.

The returned object reports `modelCount` (placements), `sourceCount`,
`instanceCount` (mesh instances, including the ground), `geometryMode` and
`textureBytes` (decoded CPU buffers). `triangleCount` and `primitiveCount` include
the ground and describe unique geometry when instancing is enabled. Progress and
`getAllocationSnapshot()` expose the renderer's current allocation report.
These are static inspection scenes; source animation, physical scale accuracy
and adaptive per-pixel sampling are not implied.

See [single-model inspection](model-inspection.md) for the quality and lifecycle
contract, including fixed sample counts, denoising and the native UHD pixel limit.

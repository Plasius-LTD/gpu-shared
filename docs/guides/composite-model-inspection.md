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

Supply 1–6 models. Aggregate geometry, including the two ground triangles, must
fit within 500,000 triangles. Decoded texture buffers retained by the material
maps must fit within 128 MiB; this is an admission limit, not a total browser or
GPU memory guarantee. Loading is sequential and abortable. The existing
60-second inspection deadline covers the entire scene load; per-GPU waits also
have deadlines. Integrity is mandatory for each model and its external resources.
Host applications should separately bound downloads and use reviewed inputs.

The returned object also reports `modelCount` and `textureBytes`. Its triangle
and primitive counts include the ground. Keep each source's attribution and
licence visible in the host. These are static inspection scenes; source animation,
physical scale accuracy and adaptive per-pixel sampling are not implied.

See [single-model inspection](model-inspection.md) for the quality and lifecycle
contract, including fixed sample counts, denoising and the native UHD pixel limit.

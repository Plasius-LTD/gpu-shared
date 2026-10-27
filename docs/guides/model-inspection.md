# Interactive model inspection

Use this entry for an authored glTF/GLB scene with integrated camera gestures,
strict asset integrity and progressive quality controls. It renders your scene
without adding the Product Studio floor, walls or light. Install
`@plasius/gpu-shared` and its `@plasius/gpu-renderer` peer first.


`createModelInspection` requires a canvas, an absolute HTTP(S) `modelUrl`, an explicit
`enabled: true` decision, and an `integrity` map. Each map key is an absolute URL
for the model or one of its external buffers/images; each value is a
`sha256-<base64 digest>` SRI string. Generate it from the exact files you serve.
Missing or mismatched resources fail instead of substituting another model.

The following helper mounts the inspection and wires document visibility to pause
further GPU work. Pass your host's options, including an AbortSignal if initialization
must be cancellable when navigating away.

```js
import { createModelInspection } from "@plasius/gpu-shared/model-inspection";

/** @param {import("@plasius/gpu-shared/model-inspection").ModelInspectionOptions} options */
export async function mountInspection(options) {
  const inspection = await createModelInspection(options);
  const syncVisibility = () => inspection.setPaused(document.hidden);
  document.addEventListener("visibilitychange", syncVisibility);
  syncVisibility();

  return {
    inspection,
    dispose() {
      document.removeEventListener("visibilitychange", syncVisibility);
      inspection.destroy();
    },
  };
}
```

`onProgress` receives `{ phase, samples, target, width, height, maxDepth, denoise, allocations }`.
`allocations` and `getAllocationSnapshot()` report requested renderer-owned GPU
resource bytes, not physical VRAM. Set `memoryBudgetBytes` at creation to choose
a positive byte budget (default 1 GiB); device limits also apply.
Samples count GPU-completed work. `onError` reports failures after initialization;
initialization errors reject the returned promise. `onHintChange` controls a brief
camera hint; the host supplies permanent accessible instructions and error/retry UI.

| Setting | Default | Supported values |
| --- | --- | --- |
| `quality.samplesPerPixel` | 64 | Integer 1–256 |
| `quality.maxDepth` | 6 | Integer 1–12 |
| `quality.denoise` | `true` | Boolean |
| `width`, `height` | 800 × 600 | Integer 1–3840 per axis, at most 8,294,400 pixels in total |

Use `inspection.setQuality({ samplesPerPixel, maxDepth, denoise, width, height })`
to change settings; only supplied fields change. Native 1920×1080, 2560×1440 and
3840×2160 targets are supported independently of CSS display size. Device limits
and model resources can still prevent allocation; 4K availability is not a promise
of real-time performance.

The first pass uses one sample. After 200ms of camera stillness, batches of up to
four refine toward the target. Moving the camera or changing quality resets history;
identical settings preserve it. `setPaused()` retains completed history, `reset()`
restarts refinement, and `destroy()` is safe to call more than once. Resize the
render target explicitly through `setQuality`; keep the displayed aspect ratio.

Inspection requires nonempty valid geometry and uses GPU resource bytes and
device limits for admission. Initialization/GPU waits are bounded to 60 seconds. It renders static poses: source skinning/animation playback and adaptive
per-pixel sampling are not part of this entry. Mouse, touch and keyboard gestures
are described in the [camera guide](https://github.com/Plasius-LTD/gpu-shared/blob/main/docs/guides/material-study.md#camera-and-accessibility).


### Refinement work

The preview traces one sample. Idle refinement submits up to four samples at a
time, with smaller batches as resolution and bounce count increase. UHD at twelve
bounces submits one sample at a time until the requested total is complete.
Completed progress advances only after the GPU queue finishes that submission.
This limits bursts of work; it does not reduce image quality or guarantee that
every device can finish a high-resolution scene. Device loss and timeout still
reach `onError`; dispose the failed runtime and create a new one on explicit retry.

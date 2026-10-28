# Material ageing study

This is a preset demonstration for the original Poly Haven Wooden Crate 01 1K
asset by James Ray Cock (CC0), not a general material ageing API. Serve its glTF,
binary and textures together. The runtime verifies its built-in SHA-256 manifest
and topology and rejects altered or missing files. Install the renderer peer and
use a browser with WebGPU over HTTPS or localhost.

Your host must approve the view before mounting it. The Plasius site uses its GPU
route capability and `gpu-demo.scene-fidelity.enabled`; the study does not evaluate
those decisions itself.

```js
import { createMaterialStudy } from "@plasius/gpu-shared/material-study";

/** @param {import("@plasius/gpu-shared/material-study").MaterialStudyOptions} options */
export async function mountWeatheredChest(options) {
  const study = await createMaterialStudy(options);
  await study.update({ varnishWear: 0.9, ropeFray: 0.3 });
  return study;
}
```

Supply a focusable canvas, absolute model URL, optional AbortSignal for pending
initialization, and `onHintChange` for the gesture hint. Call `resize()` when its
container changes; call `destroy()` during teardown. `update()` rejects overlapping
changes, so await or debounce control updates. Aborting/destroying releases input,
timers and GPU resources, including late initialization resources.

Supply `onUnavailable(failure)` to handle terminal failures after mounting. The
frozen notification contains only `code: 'render-unavailable'` and
`message: 'Material study rendering is unavailable.'`; use the code to choose
translated, accessible error and retry text. Input and renderer cleanup have
already been attempted before notification. Raw GPU diagnostics are not passed
to the host. Resize/camera exceptions and idle device loss use this same one-shot
path. A throwing or rejected host callback cannot interrupt cleanup or escape
the event callback. Cleanup attempts both owned adapters even if one throws.

Initial acquisition errors reject `createMaterialStudy()` without notification.
Errors during an awaited `update()` still reject that promise and also notify
the mounted host. Invalid control patches and overlapping updates simply reject
without terminating a healthy study. After terminal failure, `resize()` is inert
and `update()` rejects; retry by mounting a fresh study after rechecking access.
Disconnect the host's ResizeObserver and present its accessible retry control.
Intentional abort/destroy/material replacement and obsolete renderer callbacks
are silent. Healthy material replacement keeps the current camera.

The drawing buffer uses one scale for both CSS dimensions, capped at DPR 2 and
1440 pixels on either edge. A 500 × 1000 CSS canvas at DPR 2 renders at 720 × 1440;
rounding and the minimum one-pixel buffer can change the shorter edge by up to one
pixel. Resizing retains the camera and renderer. Hidden or zero-sized canvases
skip drawing and recover when the host next calls `resize()` with visible dimensions.

The weathered preset uses 30% rope fray and 90% varnish wear. At full varnish wear,
wood is uncoated; rope and metal are never coated. These are static authoring
approximations, not gameplay or structural-damage simulation.

## Camera and accessibility

| Input | Action |
| --- | --- |
| Drag / one finger | Orbit following the grabbed surface |
| Shift/right drag | Truck across the view |
| Alt-drag | Pan in place |
| Focused wheel / pinch | Dolly closer or farther |
| Shift-wheel | Change lens |
| Two-finger move | Truck |
| Arrows / Shift-arrows | Current camera mode / truck |
| 1–5 | Select keyboard camera mode |
| +/− | Dolly, or lens in zoom mode |
| Home | Reset framing |
| ? / Escape | Replay / dismiss the hint |

Focus requests a five-second hint. Keep permanent keyboard instructions, translated
loading/errors/retry, credit information and reduced-motion-aware presentation in
the host. Root-package imports do not load this study or its model assets.

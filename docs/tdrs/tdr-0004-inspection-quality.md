# TDR 0004: Inspection quality contract

- `quality.samplesPerPixel`: total target, integer 1–256, default 64.
- `quality.maxDepth`: integer 1–12, default 6.
- `quality.denoise`: boolean, default true.
- `width` and `height`: integer 1–1440, defaults 800 and 600.
- `setQuality(partial)`: validates before changing state; preserves the camera and loaded model; resets history. Dimensions are accepted here too.
- `setPaused(boolean)`: host forwards document visibility; finishes any submitted batch, then stops scheduling. Resume retains completed history.
- `onProgress({phase,samples,target,width,height,maxDepth,denoise})`: completed sample count; rendering/refining/complete/paused. No callbacks after teardown. Errors go through `onError` and stop the runtime.
- First batch is one sample, subsequent batches at most four. Camera rest debounce 200ms; no permanent render loop after completion. Waits and allocation are bounded to 60 seconds.

Tests cover strict input bounds, exact target completion, coalescing, camera reset, changing settings while busy, pause/resume, failure, timeout, cancellation and disposal. Parent flag: `gpu-demo.scene-fidelity.enabled`; local preview override only. GPU accumulation is supplied by renderer Task #241.

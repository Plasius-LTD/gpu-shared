# Frame-local render scale with full stationary restoration

2026-11-05. Story site2485, Feature1170/Epic2271; inherit
`gpu-demo.scene-fidelity.enabled` and the existing GPU route capabilities.

## Evidence and requirement

Published0.2.62 full forest (60,001instances,265,135 unique triangles) at
800x500/1SPP/six bounces improves from~274ms to~68ms with512-pixel tiles, exactly
matching moving and stationary64-SPP HDR/display. A separate512x320/1SPP/six-bounce
motion-only screen completes96updates at30FPS, median31.8ms/p9532.7ms/max33.2ms.
This explicitly reduces motion resolution. Full stationary quality remains800x500
(or the user's requested dimensions), requested depth/denoise/sample target.

## Renderer contract

Add optional per-frame `renderScale` in(0,1], default1, to renderOnce/renderFrame.
Allocate scene, queues and textures once at the configured full dimensions. Derive
an active integer viewport bounded by those allocations, dispatch only its tiles,
and write its dimensions to frame uniforms. Preserve the camera's full aspect and
projection. Present the active texture rectangle across the existing full canvas,
clamping samples inside the valid rectangle; do not expose stale borders. Keep
full-scale presentation byte-identical. No geometry/material/transport changes.

A scale transition invalidates progressive history and sample-time calibration;
a same-scale frame preserves progressive accumulation. An omitted scale returns
to full resolution. Changing scales must not rebuild BLAS/TLAS, pipelines, device,
canvas or resources. Return effective dimensions/scale separately from allocation
capacity, and account actual completed primary rays. High-SPP awaited frames,
telemetry, denoise, output probes and resets must use the same active viewport.
Reject invalid scales before submission or state mutation. Bound concurrent-frame
behaviour explicitly so an awaited frame cannot be reconfigured mid-flight.

## Consumer contract

The shared inspector should use the existing gpu-performance governor and quality
ladder with the product's24FPS target, optional motion-scale levels and additional
SPP where affordable. Keep one pending GPU job/latest-pose coalescing. Wait for
200ms of quiet input, discard reduced-resolution history, and restore full
requested resolution/depth/denoise/complete sample target. Expose effective motion
settings/overruns through progress; never label a reduced-resolution preview as a
completed full-quality image. No competing governor or unqualified adaptive-pixel
flag activation. Future faster engine versions automatically affect measured
budget/headroom. Do not take over the separate per-frame depth-budget work.

## Requirements-first validation

- Invalid/zero/negative/NaN/infinite/above-one scale rejects before mutations.
- Active viewport bounded and stable aspect, complete tile coverage and ray counts.
- No allocation/device/geometry/pipeline rebuild across scale/full restoration.
- Progressive history resets on transitions and never contaminates stationary HDR.
- Full-size presentation remains exact; scaled borders never sample stale pixels.
- Async concurrency cannot mutate a pending frame; errors/recovery/disposal remain.
- Real forest24FPS motion after adaptation, measured cadence plus p95/max/misses.
- Full stationary64-SPP forest/model and128-SPP Studio denoise on/off exact controls
  after movement, reset, scale changes and rapid reversals. Keep failed trials.
- Tests/source LCOV>=80%, types/lint/build/audit/package/Zero-Three, README/Unreleased
  ADR/design; exact-head CI and approved main production CD/public qualification.

No local publishing, rollout/security changes, dependency refresh, UHD/touch claims
or changes to renderer259/site2330 holds. This design is not a production claim.

## Inspector-specific trend tuning

The lighter-scene physical screen showed the generic governor's0.35ms trend
threshold repeatedly reducing resolution despite12–28ms timings below the
41.67ms24FPS interval. The inspector sets `trendSensitivityMs` to its target frame
interval. Absolute latency, dropped-frame and thermal gates remain unchanged.
A real-governor regression covers sustained sub-budget fluctuations, plus overload
and headroom recovery. This policy belongs to the host integration; it does not
change gpu-performance defaults or the independent engine's performance targets.

## Execution time and input latency

Camera input can arrive during a previous GPU frame. Its queued age overlaps that
frame and must not be counted again as the next frame's execution time. Governor
feedback measures frame preparation/submission through completion. Progress keeps
`inputLatencyMs` and `queueDelayMs` separately, so cadence and responsiveness can
both be evaluated. The optional sample budget reserves10% of the execution interval by default
(`headroomRatio`, host-configurable). It does not subtract input age again: that
would force1SPP where2SPP fits the cadence budget. Latest-pose coalescing bounds
queued work, while input latency remains observable separately. Red-first coverage holds30ms execution plus15ms queued
age steady, and verifies actual over-budget execution still reduces quality.

## Early response to scene-relative camera motion

The host supplies its execution reserve to both the renderer's optional-sample
budget and the governor's `frameBudgetRatio`. Eight samples, four initial samples
and a two-frame reduction cooldown use existing governor settings. This responds
to changing views before the full cadence interval is consumed. Recovery still
requires measured higher-level headroom and the governor's stable-frame cooldown.
A 30-second broad orbit initially exposed 80 missed intervals despite an average
above 24 FPS. A 90% execution budget reduced that to six; an 85% host budget
completed 30.9 FPS with zero steady misses and exact stationary restoration. These
are local candidate measurements; repeat longer trajectories and lighter scenes
before adopting the host policy or claiming release qualification.

Motion progress notifications coalesce unchanged pointer bursts before taking GPU allocation snapshots. The moving phase remains distinct from stationary refinement; completed preview quality changes remain observable. This bounds host UI work without delaying camera submission.

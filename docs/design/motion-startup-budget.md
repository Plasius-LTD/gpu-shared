# Motion startup budget

Story: Plasius-LTD/plasius-ltd-site#2529 under Feature #1170 / Epic #2271.
Rollout remains behind `gpu-demo.scene-fidelity.enabled`; preserve `site.studio-coming-soon.view`, disabled professional animation, dependency hold #2330 and renderer #259 holds.

## Evidence and requirements

The published inspection governor starts at full resolution/four requested samples. An exclusive Apple Metal forest run retained six initial frames around 69 ms before resolution adaptation, despite later sustaining at least 35 completed FPS. Stationary full-resolution 64-SPP image and HDR output matched an unchanged baseline at the same sample/frame sequence.

The product target remains 24 FPS (41.667 ms) with its own headroom. Motion must start at a bounded product-approved ladder level and recover quality through gpu-performance. Cold-start recovery needs a distinct opt-in: the current governor recovers only levels it previously reduced. Estimates for unmeasured adjacent levels must use explicit product-supplied work ratios; paired real timings supersede estimates as they become available. No invented timing samples or duplicate budget governor in shared code.

## Design

Add opt-in initial-level recovery to gpu-performance, preserving default recovery behavior. Track one pending startup recovery per registered module, respecting existing pressure, cooldown, authority, and measured-recovery checks. Handle registration, removal and reset without accumulating duplicate opportunities. Add optional initial adjacent cost ratios to measured recovery, strictly validated and copied. These estimates only constrain upgrades; they never fabricate telemetry or reduce stationary quality.

Shared inspection initializes its governor at the smallest host-approved motion scale and supplies adjacent pixel-count/sample-count work ratios. Governor telemetry remains real completed-frame wall time, and automatic recovery uses the same 24-FPS target/headroom. Stationary rendering continues unchanged at full dimensions, requested SPP, bounce depth, geometry, materials and denoise settings.

## Validation and delivery

Red-first requirements: cold-start recovery reaches full quality when budget allows, refuses unsafe predicted upgrades, resumes after engine speedups, default behavior remains unchanged, register/remove/reset are bounded, and invalid ratios fail before execution. Shared tests cover low-cost and expensive motion sequences plus unchanged stationary completion. Real GPU tests retain startup and steady frame intervals separately, all spikes, dimensions/SPP and matched full-quality image/HDR controls. No qualification claim from portable tests alone. Required coverage, changed-file LCOV, types, lint, build, docs, approved CI/CD, published-package verification and site production verification precede completion.

## Idle-to-motion transitions

Real-site qualification on 16 November exposed a separate transition cost: the first
GPU completion after idle exceeded 41.667 ms, while an immediate handoff from a
completed stationary reference took about 22 ms. A separate published-package
control reproduced an 87.1 ms first frame after 15 seconds idle. The artifact and
bundled controller are current; the exact browser/device wake-up cause is not yet
proven. Retain these failures and include idle transitions in physical qualification.

Each new camera gesture after stationary refinement must start at the smallest
host-approved motion level, even if the previous gesture recovered higher SPP.
Start a fresh gpu-performance measurement session only before the next motion
submission, after any pending GPU work completes. Continuous pointer updates must
retain their session and quality recovery. This adds no parallel governor, fabricated
measurements, background GPU work, or stationary quality reduction.

Tests must recover a previous gesture to full resolution/four samples, complete
stationary refinement, and prove the next gesture submits one sample at the host
minimum before recovering again. Pending-frame coalescing and exact stationary
completion remain required. The host's minimum scale and browser frame scheduling
are experimental until cold and warm physical tests pass; shrinking startup work
alone has not yet met the target (57 ms first completion at scale 0.16).

## Reference interruption

The same real-site trace exposed a second defect: a pending full-resolution batch
could age the last input beyond the idle threshold, causing queued camera input to
submit another full reference. Classify idle only from the scheduler between jobs.
Use cooperative renderer cancellation and a 128-pixel tile bound for stationary
batches; abort obsolete work and drain its current tile before the newest motion
preview. Preserve generation checks, error propagation, and every sample of an
uninterrupted stationary reference. Require the released renderer capability rather
than silently falling back to an uncancellable batch.

Local candidate evidence shows pending-work takeover waits below 28 ms on the
original forest. A separate idle first frame remains 70 ms and is not qualified.
No production or universal frame-time guarantee follows from these observations.

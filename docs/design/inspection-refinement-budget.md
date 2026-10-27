# Bound inspection refinement work

Task #182 under site Story #2332, Feature #1170, Epic #2271.
The existing `gpu-demo.scene-fidelity.enabled` rollout flag and site capability
continue to control exposure. No additional entitlement or public API is needed.

After a one-sample preview, the inspection runtime currently queues four samples
at any resolution and depth. The furnished scene at 3840 × 2160 and twelve
bounces therefore jumps from one to four times the pixel/bounce work in its next
submission. A reported failure occurs before that second submission completes.
A browser instance-loss error has been observed, but a cold reproduction also
completed the exact quality; this is a pressure mitigation, not proof of a driver
fault or a guarantee against device loss.

Use a conservative 16 × 1024 × 1024 pixel-bounce budget to choose each idle batch,
floored to whole samples, clamped to one through four, and capped by samples
remaining. A single sample is indivisible at this boundary; UHD can exceed the
budget even at one sample. The first preview remains one sample. No requested
resolution, bounce count, denoising option or total sample target is reduced.
Wait for queue completion before progress advances and before the next batch.
Retain cancellation, generation checks, camera ownership, timeout and explicit
error reporting. The same scheduling applies to individual and composite scenes.

Test default batching, budget boundaries, UHD/maximum-depth completion at exactly
256 samples, stale progress and cancellation before implementation. All changed
sources must appear in LCOV. Run package checks and qualify real furnished-scene
refinement, recovery and all four composites. Release via approved main/production
CD before site consumption; rollback uses the existing rollout flag and pinned
package version.

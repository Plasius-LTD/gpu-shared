# TDR0015: Inspection motion and stationary controls

Story site2485/shared212, Feature1170/Epic2271. See
../design/inspection-motion-throughput.md and ADR0030.

Qualify actual completed camera cadence against24FPS after adaptation, with
p95/max/overruns and effective scale/SPP recorded. Exercise extra SPP on a workload
with headroom. Restore the exact full stationary64-SPP forest/model image after
movement, reversal, reset, pause and settings changes. Product Studio128-SPP
reference/denoise controls remain independent. Compare full HDR and display output
with the released renderer using the same scene, camera and sample sequence.

Assert one pending job, bounded cancellation, no rebuild/allocation during motion,
no stale-progress completion and explicit failure/recovery. Retain rejected trials.
A laboratory pass is not public delivery; all source coverage, package, CI/CD and
public consumer gates remain required. No new UHD or physical-touch qualification.

## Session transitions and reference interruption

Story site2529/shared217 also measures startup and long-idle transitions against
the same 24-FPS target; exclude no first-frame failures from the retained record.
Use released renderer 0.2.69 cooperative cancellation. Verify new camera input
aborts an obsolete reference, drains its submitted 128-pixel tile, and submits
only the latest pose. Preserve distinct device errors and require the explicit
renderer capability. After input ends, compare all 64 stationary samples against
a matched frame/sample sequence, including both HDR and display bytes.

Regressions cover a second gesture after a high-SPP session, queued input behind
a long GPU wait, abort-reason identity, missing capability, pause and disposal.
Record one-million actual mesh instances separately from model placements, and
report startup maxima, steady percentiles, every frame-budget miss and minimum
rolling completed FPS. The currently observed long-idle first-frame spike remains
unqualified even when continuous motion passes.

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

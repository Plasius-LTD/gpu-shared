# ADR 0029: Joint Product Studio motion quality

Status: Accepted

Tracking: gpu-shared #209 / site #2380; extends ADR 0028.

The sample-only motion policy cannot shed any more transport work at one
sample per pixel. A caller can opt into a depth floor on a compatible renderer.
The existing gpu-performance ladder starts at the configured ceiling and
uses its usual pressure, recovery and hysteresis rules. Lower rungs remove
extra samples before reducing depth; recovery climbs in reverse order. The
renderer starts admitting samples conservatively for each unseen depth and
uses that depth's completion history to spend the remaining budget.

Keep the current one-job motion scheduler. After 150 ms without camera
updates, schedule one ordinary full-depth preview behind any in-flight job.
The initial and settled preview, cancelled work, and exact references do not
train the joint motion governor. Suspension clears queued motion and settle
work before an exclusive render. Omit the depth floor to retain sample-only
behaviour. This policy can trade indirect-light fidelity for motion response;
the minimum work can still miss a target.

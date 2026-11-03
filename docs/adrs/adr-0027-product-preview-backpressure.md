# ADR 0027: Awaited Product Studio preview ownership

Status: accepted. Task #202; site Story #2360 / Feature #1170 / Epic #2271.

Product Studio previously submitted the full configured SPP target during mount
and each camera redraw without GPU backpressure. A real 128-SPP camera replay
queued four full frames and delayed an exact reference by about 20 seconds.
Stationary references completed in the fresh session; the earlier invalid
external Instance failure is intermittent and its driver-level cause is unproven.

Use the existing renderer `renderFrame` API with a two-sample preview budget,
explicit GPU completion and no diagnostic readbacks. Await mount completion before
reporting readiness. Coalesce input to one pending pose while one preview is in
flight, and cancel pending poses on suspension/disposal. Keep the renderer's
configured sample target unchanged for fixed references.

Expose optional `whenIdle()` on scene camera controls for Product Studio. Hosts
suspend input, await this boundary, then start exclusive renderer work. This also
prevents preview completion from interfering with reference telemetry ownership.
Errors propagate and disable input; disposal suppresses late callbacks. The host
owns recovery, and no automatic retries or quality downgrades are introduced.

The existing scene-fidelity flag and studio capability remain the rollout and
access controls. Other shared scene runtimes retain their established behavior.

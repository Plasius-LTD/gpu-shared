# TDR 0012: Product Studio reference qualification

Task #202 / site Story #2360. Keep gpu-demo.scene-fidelity.enabled and
site.studio-coming-soon.view unchanged; preserve dependency hold #2330.

Regression tests verify readiness waits for GPU completion, the renderer retains
128 SPP while previews use two, camera redraws coalesce with one job in flight,
input suspension drains existing work and suppresses deferred poses, and disposal
prevents late work. Test preview rejection and lifecycle replacement as well.

Use real Eames geometry at 640×360, 128 SPP and two bounces. Compare the old camera
backlog with the bounded implementation. Repeat exact references with denoise
off/on and inspect images plus GPU readback of 29,491,200 primary rays. Verify
subsequent baseline, reset, camera movement, cancellation and recovery. Run the
same qualification again with published packages and on the deployed site.
Do not equate a submitted frame, local source bundle, or merged code with delivery.

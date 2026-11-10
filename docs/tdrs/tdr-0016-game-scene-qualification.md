# TDR-0016: Game-scene contract verification

Date: 2026-11-10. Work: gpu-shared#210, site Feature #2384 / Story #2416.
See [ADR-0031](../adrs/adr-0031-game-snapshot-presentation.md).

Define tests before implementation. Inject the native renderer module and defer
its completion promises to inspect submission counts, immutable input admission,
spatial transforms and material preservation. A burst of 1,000 snapshots must
submit the current and newest waiting snapshots only. Assert bounded frame and
mesh counts, stale tick behavior, invalid-offer recovery and shared flush identity.

Use virtual timers for initialization expiry, then settle/reject loaders late.
Exercise pre-abort, active abort, readiness cancellation, partial canvas setup,
renderer incompatibility, device loss and sync/async presentation failures.
Explicit teardown must settle waiting callers, remove listeners, release once
and ignore late results. Host callback/cleanup exceptions must not expose private
messages or prevent terminal state. Frame deadlines are delegated to released
renderer 0.2.66, whose owning tests cover deadlines and queue completion.

Resize during active work must defer the backing-size change; resize at rest must
redraw the retained snapshot without advancing its tick or reinitializing GPU
resources. Verify empty scenes and idle disposal. Schema tests retain exact
identity/unknown-field and geometry/transform constraints.

Build and import the public ESM/CommonJS game-scene entry with no browser/GPU.
Check its bundle graph for dynamic renderer loading and absence of showcase
runtime imports. Typecheck the public contract and executable guide example.
Include all changed runtime/tooling source in LCOV, enforce >=80% lines, then run
lint, build, public-package/privacy/Zero-Three and dependency audits. Use the
approved frozen-ref quarantine and exact-main OIDC publication before consumption.

Manual WebGPU smoke evidence supplements deterministic lifecycle tests; it is
not proof of touch accessibility, sustained 30/60FPS, ten-hour content or gameplay
quality. Those remain the individual game and launch qualification gates.

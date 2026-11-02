# TDR 0011: Scene camera input and workspace ownership

See ADR 0025 and Task #197, parent site Story #2357.

Qualify single-pointer orbit, right/modified truck, pan, wheel dolly and optical
zoom, two-finger truck/pinch and focused keyboard equivalents. Keep the existing
vertical grab direction. Test pointer cancellation, focus hint expiry, reset,
new scene bounds, input suspension, DOM ownership and cleanup after errors.

For each runtime assert that the renderer receives changed camera data. Harbour
must redraw while paused without advancing vessel time; Product Studio must
coalesce draws and cancel them before exclusive work. Canvas animation requires
the renderer's inspection-pose API; never claim interaction from metadata alone.
Model inspection already invalidates accumulation safely on camera changes.

Run all package tests, source LCOV, types, lint, build, public artifact and
dependency security gates. Consume the published compatible renderer before the
approved main CD release. Finally verify real scenes through the consuming site's
mouse and touch-capable controls and its guarded production deployment.

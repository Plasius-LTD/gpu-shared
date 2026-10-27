# TDR 0009: Instanced inspection qualification

Date: 2026-10-27. Task #185; Story plasius-ltd-site #2336; Feature #1170.
Controls: `gpu-demo.scene-fidelity.enabled`, `site.studio-coming-soon.view`.

- Verify one, fifty and one hundred placements load each source once and preserve
  one set of mesh geometry. Scale/yaw/translation must alter instance transforms,
  including bottom-centre placement, without projecting per copy.
- Validate source identity, manifests, placement bounds and options before I/O.
  Retain CPU texture admission and cancellation. Invalid or unsupported scenes fail
  explicitly and release the runtime/device; missing instancing support cannot
  silently render a single copy.
- Pass the same GPU byte budget to initial and rebuilt renderers. Accept geometry
  above the former 500K ceiling when valid; renderer allocation failures remain
  visible and preserve existing recovery semantics. Count resources once per unique
  source and report allocation snapshots without claiming physical VRAM residency.
- Retain all four existing expanded composites and progressive quality behavior.
  Use the published renderer release in package, packed-consumer and GPU checks.
- Run full tests, types, build, lint, package/security checks and changed-source
  LCOV with >=80% line coverage before approved package release.
- Qualify 50/100 astronauts with tree/shrub placements through the actual consumer,
  then public production controls, before closing the cross-repository story.

Renderer-level local evidence is recorded in gpu-renderer TDR 0006. Consumer and
immutable release evidence belongs on the tracked issues. Do not mark downstream
production work complete on the strength of a local source-injected harness.

# One-visit harbour traffic

Epic plasius-ltd-site#2271; Feature #1170; Story #2272; Task gpu-shared#56.
Rollout inherits backend-evaluated `gpu-demo.scene-fidelity.enabled` and the existing GPU demo access capability.

## User requirement and defect

Each vessel makes one visit and leaves. New arrivals keep the harbour busy; departed identities must never reappear during a session. The current steering convention uses +sin(yaw) while the model transform points the +Z bow toward -sin(yaw), causing sideways/backwards motion. The route also reverses at artificial boundaries and accumulates yaw velocity, causing circles.

## Package reuse and architecture

Keep showcase-specific scheduling and pilotage in gpu-shared, the existing owner of scene motion. Existing gpu-physics supplies simulation plans and world snapshots but no vessel pilotage/traffic API. Reuse those snapshot facilities, the glTF loader, asset generator, existing cloth/water, and the published gpu-renderer 0.2.46 contract. No unpublished renderer API or new dependency.

A bounded traffic controller owns monotonic vessel IDs, gradual acceleration/braking, curvature-limited smooth headings, forward hull motion, predictive separation along authored lanes, separation/yielding, berth dwell, departure, and retirement beyond the visible harbour. At most eight active vessels, including at most four underway, fit the published four-wake contract. Departures have priority over new arrivals so berthed ships cannot starve. No teleport-to-start or boundary bounce. Initial vessels establish a busy scene immediately; subsequent arrivals enter outside the harbour view. Retired boats are removed, retaining counts rather than unbounded history.

Add a separately gated continuous quay with four furnished berths so waiting boats lie alongside shore infrastructure. Cache fixed quay data and per-mesh rotation coefficients to keep the larger fleet within the interactive frame budget.

Add distinct tug, fishing boat, pilot launch and cargo coaster geometry to the existing brigantine/cutter families using the deterministic generator. Reuse the loader and add these assets only to the scene-fidelity path. Distinct IDs, hull colour and scale variations identify new arrivals; model families may recur. This is authored demonstration traffic, not a maritime-navigation or fluid-dynamics simulator.

Sample bow, stern and beam water heights to produce small damped heave, pitch and roll; use the same rigid transform for hulls, normals, attachments, shadows and reflections. Native wakes follow actual travel direction and originate at the stern; moored/stopped boats have no travelling wake. Retain the existing native water API.

## Requirements-first verification

- Bow direction agrees with forward displacement at cardinal and oblique headings; angular velocity, yaw acceleration and speed changes are bounded, with no full-speed pivot in place.
- A long deterministic simulation exercises arrivals, slowing, berth dwell, departures and retirement. Every ID has a single continuous lifetime; counts and arrays remain bounded, and boats remain in navigable water.
- Maintain safe clearances along normal traffic routes; follower/crossing fixtures brake and preserve forward motion rather than overlap or jump.
- At least six vessels in the established harbour scene, with vessel families represented; no more than four moving wakes and no stationary wakes.
- New boats have valid finite geometry, consistent normals, physics bounds and distinct silhouettes. All ten glTF files together remain below 6 MiB and each asset below 25,000 triangles.
- Gate-off keeps the existing compatibility scene; gate-on uses the traffic controller. Pause/reduced-motion/hidden-tab states advance no traffic. Renderer failure/teardown contracts remain covered.
- Actual browser review of several successive positions verifies bow-first motion, turning, pitch/roll, wakes, and local controls. All changed source must appear in LCOV; package lines >=80%.
- Update README, Unreleased changelog and ADR/TDR. Verify local tests/types/lint/build/package policies, then exact-head CI and approved main CD before release. No production deployment workaround.


## Local qualification, 6 October 2026

- Requirements-first tests failed before controller, new models/quay, transform
  integration and packed geometry support were implemented. Dedicated follower
  and crossing fixtures preserve hull clearance.
- A 20-minute simulation retains six to eight vessels, completes 34 departures
  and admits 33 new vessels. No departed ID returns. Hull clearance remains
  positive; heading-rate, yaw-acceleration, speed and attitude bounds pass.
- Ten generated glTF files total 3,931,331 bytes (3.75 MiB); the largest asset is
  11,670 triangles. Exact regeneration, finite vertices, bounds and winding pass.
- Native lifecycle tests cover paused, reduced-motion, hidden-tab and device-loss
  states, missing fleet assets and absent WebGPU. Paused states advance no traffic.
- Live local WebGPU review on this Mac shows forward motion and stern wakes in
  several successive positions, then departures and changing vessels. Later frame
  intervals corresponded to about 59 FPS; this is not a cross-device benchmark.
- Keyboard Enter pauses/resumes; the 320px viewport fits with no horizontal
  overflow, readable controls and visible focus. Temporary viewport overrides were
  reset. This is a targeted interaction check, not a full screen-reader audit.
- 129 tests pass with 90.75% line coverage (traffic controller 100%). Every changed
  executable source file appears in LCOV; declarations pass the package type checks.
  Lint, build, package-content/privacy checks, Zero-Three admission and runtime
  dependency audit pass.
- Release remains gated on exact-head CI, the approved package CD, released-package
  site adoption and site production CD. Local preview does not change production.

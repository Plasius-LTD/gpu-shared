# Game-scene adapter validation

Date: 2026-11-10. Work: gpu-shared#210, site Feature #2384 / Story #2416.
Implementation base: c172c8f2f29c7ee011388d284bb46c28f7adcf05.
See [design](game-scene-adapter.md), [ADR-0031](../adrs/adr-0031-game-snapshot-presentation.md)
and [TDR-0016](../tdrs/tdr-0016-game-scene-qualification.md).

## Requirements and regressions

The first requirement suite failed before the adapter module existed. Added
regressions also failed before fixes for partial canvas setup errors and abort
during renderer-readiness inspection. Those failures now return controlled
terminal errors without reviving initialization or retaining queued work.

Tests cover exact schema identity and bounds, detached data, copied meshes,
spatial/material transforms, invalid-input recovery, stale ticks, one active plus
one latest pending frame, shared flush promises, paused and active resize,
cancellation, initialization expiry, device loss, late settlement and idempotent
disposal. ESM/CommonJS imports, the separate build entry, dynamic renderer import,
TypeScript consumers and the executable guide example are included.

## Local checks

Node 24.18.0 and npm 11.19.0:

| Check | Result |
| --- | --- |
| Full `test:coverage` | 389 passed; zero failed or skipped |
| Combined LCOV lines | 12,412 / 13,426 (92.45%) |
| `src/game-scene.js` | 433 / 438 lines; 206 / 210 branches |
| `src/native-showcase.js` | 121 / 121 lines; 30 / 37 branches |
| `tsup.config.ts` | 17 / 17 lines; 1 / 1 branch |
| Build, typecheck, lint | Passed |
| `pack:check` and public artifact policy | Passed |
| `zero-three`, including tarball and SBOM | Passed |
| Full dependency audit, including development | Zero vulnerabilities |
| Whitespace diff check | Passed |

Every changed executable source/configuration file appears in combined LCOV.
Declaration files are verified through consumer type fixtures. Tests that pack a
fresh checkout required access to the existing npm cache. A temporary browser
bundle was moved outside the checkout before linting; no lint rule was weakened.
The first SBOM invocation resolved an unsuitable npm command; selecting the
verified Node/npm directories explicitly passed the unchanged dependency gate.

Dependency review selected released gpu-renderer 0.2.66 for its bounded native
completion API and schema ^1.4.9 for strict identity/admission. The lock resolves
schema 1.4.10, its compatible published patch. Only those two installed package
versions changed. Renderer registry integrity matches the verified main release
from b3a0d91eac1fd9f381809dd70d0aa7f87a7e05b2 / CD 42532873174. Existing camera,
model, input and performance packages remain on their established contracts.

## Browser smoke

A local original scene rendered four blue solids above a platform using the
released native renderer in a WebGPU-capable Chromium browser. A 1,000-offer burst
after the initial frame produced 1,001 total offers, 998 replaced snapshots,
three completed frames and tick 1,001, with no waiting frame remaining. Resizing
the canvas to 320 × 426 redrew the retained scene at the same tick and increased
completed frames to four. Explicit disposal then reported destroyed state with
zero pending/in-flight work. The only console error was an absent test favicon.
Desktop and narrow-canvas captures were visually inspected.

This was a desktop browser with a narrower canvas, not a physical phone or touch
qualification. It establishes native presentation, bounded queue behavior and
resize/disposal only. Sustained frame rate, device coverage, accessibility,
gameplay, content depth and ten-hour play evidence remain game/launch gates.

## Release and rollout

The live stored `arcade.runtime.enabled` flag was rechecked disabled for default
and targeted values, at zero rollout. Host admission still requires backend
capabilities and the separate public-launch controls. Rollback disposes adapters
and prevents new sessions without altering saved progress.

This report records local evidence. The linked task must retain exact branch/main
CI, required quarantine group 3 job metadata, protected merge, main/production
`cd.yml` publication and registry provenance before completion. No backend or
infrastructure changes are part of this package release.

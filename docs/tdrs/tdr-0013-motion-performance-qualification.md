# TDR 0013: Motion performance qualification

Story site #2376; Task shared #206; design decision ADR 0028.

Requirements-first tests use published gpu-performance 0.1.14: exact caller target,
scheduling subtraction, pressure downgrade/recovery, unknown actual counts, zero
clock resolution, non-power-of-two ceiling, invalid/missing dependencies, queue
coalescing, reference drain and no late disposed telemetry. Existing default
preview, failure and ownership regressions remain required.

Real GPU checks must retain device, versions/source hashes, unchanged source asset,
resolution/depth/denoise, actual completed counts, job durations and completion
intervals including slow frames. Separate diagnostic readbacks from timing. A
configured count or inverse job duration is insufficient evidence of cadence.
Verify exact 128-SPP reference after motion and owned disposal. Compare the same
640x360 Eames scene with the recorded published baseline. A separately selected
smaller viewport may demonstrate affordable extra samples but cannot qualify the
640x360 target or imply automatic resolution reduction. No physical touch/UHD
qualification is added.

All package tests/coverage, changed-source LCOV, lint/types/build/public-artifact
and source-boundary checks remain release gates. Shared approved CD and public
registry verification precede site adoption, followed by site CI/CD and public
functional/performance checks. Local evidence alone is not production delivery.

Budgeted continuous motion hands the latest queued pose directly to the next
awaited GPU slot. Initial input still enters through requestAnimationFrame;
continuations do not add an idle rAF after completion. This preserves one job
and coalescing while avoiding an artificial frame interval floor.

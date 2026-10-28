# TDR 0010: Scalable scene qualification

Date: 2026-10-28. Task #188; site Story #2342; Feature #1170.
Controls: gpu-demo.scene-fidelity.enabled and site.studio-coming-soon.view.

Acceptance covers 1,000/5,000/10,000 each of astronauts, trees and individual
shrubs, with exact model and mesh-instance counts. Verify one source decode,
shared material/projection identity, selection-specific normalization, cancellation
and safe failures. Mock runtime tests establish these contracts; actual renderer
qualification must separately record device, requested bytes, first-sample and
refinement times, camera reset and teardown. Publish only qualified scene tiers.


Local real-GPU results on 2026-10-28: all three tiers completed 800×500 / 16 SPP /
six bounces / denoising, using 265,135 unique triangles and 6,001 / 30,001 / 60,001
mesh instances. Requested storage was 304,475,680 / 310,186,720 / 317,391,040 bytes.
The largest tier also completed 64 SPP; camera reset restarted accumulation and
completed again at unchanged allocation, and disposal reported zero tracked bytes.
Evidence: task workspace output/scalable-scenes-2026-10-28. This is local source
qualification; registry-package and public-host acceptance remain release gates.

# Authored WebP texture sources

Feature site#1170, Story site#2308, shared Task #143. Inherits
`gpu-demo.scene-fidelity.enabled` and existing GPU route capability.

The next source batch includes Sheen Wood Leather Sofa. Its textures reference
images through `EXT_texture_webp.source`, with no core `texture.source` fallback.
The browser decoder already handles WebP, but material lookup reads only the core
source, leaving the decoded authored maps unused. Follow the ratified Khronos
extension: prefer the WebP source when present; retain the core source when the
extension is absent. Reject malformed/out-of-range declared WebP sources rather
than silently using a fallback or dropping the texture.

Reuse existing bounded integrity-aware image acquisition, browser decode,
per-slot texture transforms and per-load material reuse. No transcoding, texture
replacement, new codec dependency or public API is needed. Tests must first
reproduce missing required-WebP maps, optional-extension precedence and invalid
source rejection; retain core PNG/JPEG and transform regression coverage. Verify
the real unchanged sofa with original WebP images in the Plasius renderer.
Require package coverage and changed-source LCOV, lint/types/build/pack/privacy,
CI, approved main/production CD and registry verification before site consumption.

Reference: https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_texture_webp

## Qualification

Eight targeted tests include seven reproductions that failed before the fix.
All 194 package tests pass: 91.28% line coverage, changed loader 85.11% and present
in LCOV. Lint, types, build, package/privacy and Zero Three checks pass.
The unchanged sofa completed fixed64 with its authored colours and maps restored;
the released loader comparison produced an untextured grey result. Browser
source overrides remain local; publication and registry consumption are required.

Screenshot evidence (18 October 2026):
- `Sofa-before-WebP.png`: `54881ef1c0c95039657f51387bda0988f6312552c3ffa1591dc03ac91b582bb5`
- `Sofa-after-WebP.png`: `6f68936627ee93b7d7dc1eb3c9bf17af14ac5e651c7eb90cea2be56ebc3b602b`

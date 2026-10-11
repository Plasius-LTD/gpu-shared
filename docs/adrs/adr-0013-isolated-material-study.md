# ADR-0013: Isolated production material study

- Status: Accepted
- Date: 2026-10-11
- Task: #140; Feature plasius-ltd-site#1170 / Story #2272; site Task #2300
- Rollout: `gpu-demo.scene-fidelity.enabled` and existing GPU-demo capability

The reviewed crate, varnish, rope and camera demonstration was authored in renderer
source demos. Shared-runtime governance assigns common validation scenes here. Move
all six helpers and all four test suites intact into this package, and expose only
`createMaterialStudy` through the isolated `@plasius/gpu-shared/material-study` entry.
Keep the root barrel free of this entry. Renderer owns GPU/material validation; the
shared runtime reuses its additive validator, and gpu-camera / gpu-camera-controls
own camera transforms and gesture recognition. The site owns translated presentation,
capability/flag admission and the self-hosted CC0 asset files.

The runtime checks the reviewed asset filename/topology and supplies a SHA-256 SRI
manifest for every glTF, binary and image fetch. Extend the existing loader with
optional signal/integrity options; a supplied manifest rejects unlisted resources
and disables fallback. Defaults for omitted glTF PBR factors are white, metallic 1,
roughness 1. Other Eames/dual-UV qualification remains separate.

Initial appearance remains 30% rope fray and 90% varnish wear. Full wear removes the
coating; rope and hardware are uncoated. The five-second focus guide is delivered
via callback; host supplies permanent accessible descriptions. No animation loop,
telemetry, user data or persistence is introduced. Drawing happens on view/material
changes, bounded to 1440 pixels per dimension. Material rebuilds preserve the camera;
overlapping updates reject and aborted initialization/rebuilds dispose GPU resources.

Release renderer first, then this package through main cd.yml in production, then
site registry adoption. Validate transferred tests, lifecycle/cancellation/error,
public types, packed imports, root isolation, >=80% LCOV and real WebGPU appearance.
The general-purpose ageing package stays deferred until a second asset proves its
boundary. This is a visual material study, not a structural-damage or full fur model.

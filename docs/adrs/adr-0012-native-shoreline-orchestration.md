# ADR-0012: Delegate native Shoreline drawing to gpu-renderer

Status: Accepted for implementation; release and visual qualification pending.

Parent Feature: plasius-ltd-site#1170. Story: plasius-ltd-site#2272. Task: gpu-shared#56.

## Decision

Keep asset loading, scene state, cloth, physics, camera and controls in gpu-shared.
Delegate GPU passes to the optional, lazily imported gpu-renderer surface API.
Shared code supplies interleaved world-space geometry with per-vertex normals,
linear material colours, roughness and metalness. Unculled scene geometry supports
off-camera shadow casters and reflected objects. Cache the static harbour geometry;
only moving boats and cloth require transforms each frame.

The caller must pass its backend-evaluated `gpu-demo.scene-fidelity.enabled`
decision. At the library boundary, missing/disabled decisions use Canvas2D, as does
absent WebGPU. The public site retains its existing managed-disabled panel when
the backend disables the demo, without mounting this runtime. Renderer
initialization errors must remain visible; a failed shader cannot masquerade as a
native renderer. Device loss pauses drawing, disables resume and explains reload.
Retain the existing GPU demo capability as the access authority.

The procedural asset generator owns sail billow, rigging, railings and coastline.
Generated assets remain reproducible and preserve material families and physics
metadata. This does not assert source-photo equivalence or introduce new game lore.

## Verification and release

Tests cover world normals/materials, finite cloth geometry, gate-off/unavailable
paths, native draw submission, pause and teardown. Renderer tests cover actual
command encoding, shader/pipeline rejection, bounded allocation, resize and loss.
Retain real browser render captures alongside test/coverage results. Run WCAG
controls and narrow-viewport checks; reduced motion starts paused.

Publish gpu-renderer through its approved CD first, then update the compatible
peer range and publish gpu-shared. The site consumes released packages and uses
its approved main production CD. Disable scene-fidelity to stop mounting the
public demo; restoring an earlier package version requires the normal site release
path. No production flag changes are implied by a local preview.

# ADR 0025: Reuse native camera input across scene runtimes

Status: Accepted. Task #197; site Story #2357 / Feature #1170 / Epic #2271.

Use the existing native demo camera adapter, backed by `gpu-camera` and
`gpu-camera-controls`, for harbour, Product Studio and canvas animation mounts.
Input is opt-in (`cameraControls.enabled`), preserving existing integrations.
The adapter owns scoped pointer capture, one/two-finger gestures, focused keyboard
commands and five-second hints. Hosts own translated help and the option panels.

Add camera reset, rebase and input suspension to the mounted result. Suspension
cancels active capture and queued camera draws before exclusive renderer work.
Product draws coalesce per animation frame. Harbour camera revisions invalidate
paused rendering without advancing vessel time. Animation delegates actual
projection to the renderer inspection API; an incompatible renderer fails visibly
and releases its resources instead of accepting ineffective controls.

Allow harbour toolbar and diagnostics nodes in optional host-owned containers;
cleanup removes only runtime-owned nodes. The scene/canvas is not moved when
switching option panels. Material study exposes camera reset without rebuilding.

Consumer access composes `site.studio-coming-soon.view` with the backend-evaluated
`gpu-demo.scene-fidelity.enabled` flag. The separate professional animation rollout
is unchanged. Rollback uses the existing remote flag or an approved package-pin
revert. No local environment gate or additional telemetry is introduced.

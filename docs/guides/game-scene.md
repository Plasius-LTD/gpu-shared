# Presenting game snapshots

Use the separate `@plasius/gpu-shared/game-scene` entry for native raster game
presentation. The host owns simulation, access decisions, input, camera gestures,
semantic HUD and accessible controls. Import this entry when its view is needed;
it loads the optional renderer only after `enabled: true` and WebGPU admission.
A disabled adapter returns null without GPU access. An enabled unsupported device
rejects explicitly. Install a compatible released gpu-renderer (at least 0.2.66).

Add a canvas with a meaningful accessible label and instructions outside it:

```html
<canvas aria-label="Spatial scene preview" width="960" height="540"></canvas>
```

This complete browser module draws one original triangle with a spatial pose:

```js
import { createGameSceneAdapter } from "@plasius/gpu-shared/game-scene";

const canvas = document.querySelector("canvas");
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("A canvas is required.");
const controller = new AbortController();
const adapter = await createGameSceneAdapter({
  enabled: true, // Supply your host's resolved access and rollout decision.
  canvas, signal: controller.signal, width: 960, height: 540,
  meshes: [{ id: "triangle", vertices: new Float32Array([
    -1, 0, 0, 0, 0, 1, 0.2, 0.6, 0.9, 0.7, 0, 0,
     1, 0, 0, 0, 0, 1, 0.2, 0.6, 0.9, 0.7, 0, 0,
     0, 2, 0, 0, 0, 1, 0.2, 0.6, 0.9, 0.7, 0, 0,
  ]) }],
});
if (!adapter) throw new Error("Scene access was not granted.");
try {
  const yaw = Math.PI / 6;
  adapter.offer({
    type: "gameScene", version: "1.0.0", tick: 0, time: 0,
    camera: { eye: [0, 3, 8], target: [0, 1, 0], fov: 54 },
    instances: [{
      id: "object-1", meshId: "triangle", position: [0, 0, 0], scale: 1,
      basis: { right: [Math.cos(yaw), 0, -Math.sin(yaw)], up: [0, 1, 0],
        forward: [Math.sin(yaw), 0, Math.cos(yaw)] },
    }],
  });
  await adapter.flush();
} catch (error) {
  adapter.destroy();
  throw error; // The host presents its translated recovery UI.
}
window.addEventListener("pagehide", () => {
  controller.abort();
  adapter.destroy();
}, { once: true });
```

## Snapshot and geometry contracts

`parseGameSceneSnapshot(unknown)` validates the exact `gameScene` / `1.0.0`
identity and returns detached data. It rejects missing/future identities, unknown
fields, accessors, cyclic or shared object references and invalid spatial values.
Use independently owned JSON trees, as received from ordinary JSON parsing;
construct fresh vector arrays when authoring snapshots directly.

Each snapshot has a nonnegative safe-integer tick, seconds from 0 to 1e9, a camera
with distinct eye/target positions and a 10–120 degree vertical fov, and at most
2,048 instances. Instance ids are unique, use 1–64 ASCII letters/digits/_/-, and
refer to prepared mesh ids. Position components are within ±10,000. Basis axes
are named `right`, `up`, `forward`, unit length, perpendicular and right-handed
(with 0.0001 tolerance). Scale is positive, from 0.0001 to 100.

Prepare 1–128 meshes, totalling at most 120,000 vertices. Each mesh owns an id and
a Float32Array of whole triangles. Its twelve floats per vertex match native
raster rendering: position XYZ, unit normal XYZ, linear colour RGB, roughness,
metalness, procedural detail (0 plain, 1 wood, 2 mineral/cloth, 3 terrain).
Positions are bounded to ±10,000; colour/roughness/metalness use 0–1. Mesh arrays
are copied once and shared backing storage is refused. The adapter also caps
expanded geometry at 120,000 vertices per frame. It applies existing native
surface transforms into one reusable buffer and draws without animated water.
No assets, textures or game content are fetched by this API.

## Scheduling, resizing and recovery

`offer(snapshot)` returns `submitted`, `queued` or `stale`. It admits one GPU frame
and replaces at most one waiting snapshot. Older/equal ticks are stale. Invalid
input or excess geometry throws without replacing valid waiting work. A snapshot
is presentation data; accepting it grants no score, simulation or account authority.

`flush()` returns the current shared drain promise and resolves after queued work
finishes. Offers do not create waiter promises. Keep simulation running separately
from presentation. `getSnapshot()` returns state, requested dimensions, aggregate
counters and the last completed tick; it sends nothing to analytics. Counters
saturate at 2^32−1. Do not treat completion as a display-latency measurement.

`resize(width, height)` requires positive integer backing dimensions: at most
3,840 per axis and 2,073,600 pixels in total. The host fits CSS size/DPR into that
budget. New dimensions are applied between GPU frames, and the retained snapshot
is redrawn even while simulation is paused. CSS layout and controls stay host-owned.

Initialization and frame deadlines default to 5,000ms and accept integers from
1 to 60,000ms. Initialization owns a deadline and disposes late renderer results;
frame completion/deadlines remain owned by gpu-renderer. Browser scheduling can
delay timer delivery. Abort, device loss, timeout or rendering failure terminates
the adapter, drops pending state and releases owned resources. Late completion
cannot advance its presented tick. `destroy()` is idempotent. Recovery creates a
fresh adapter; there are no internal retries.

`GameSceneError.code` and `onUnavailable(code)` use a finite vocabulary in the
[public declaration](../../src/game-scene.d.ts). Driver, loader and caller abort
messages are not exposed. Catch `flush()` when awaiting it; fire-and-forget offers
still report terminal state through `getSnapshot()` and the optional callback.
Invalid input/options preserve an already usable adapter.

Plasius consumers inherit `arcade.runtime.enabled` plus backend capabilities,
per-game controls and the all-24 public-launch barrier. They are still disabled.
Rollback disposes presentation without deleting progress. This package does not
implement games, ten-hour content, touch UI, authority or device qualification.

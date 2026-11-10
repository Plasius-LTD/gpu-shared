import {
  createGameSceneAdapter,
  parseGameSceneSnapshot,
  type GameSceneSnapshot,
  type GameSceneErrorCode,
} from "@plasius/gpu-shared/game-scene";
declare const canvas: HTMLCanvasElement;
const snapshot: GameSceneSnapshot = {
  type: "gameScene",
  version: "1.0.0",
  tick: 1,
  time: 1 / 60,
  camera: { eye: [0, 2, 8], target: [0, 0, 0], fov: 54 },
  instances: [
    {
      id: "one",
      meshId: "triangle",
      position: [0, 0, 0],
      scale: 1,
      basis: { right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1] },
    },
  ],
};
const adapter = await createGameSceneAdapter({
  enabled: true,
  canvas,
  meshes: [{ id: "triangle", vertices: new Float32Array(36) }],
  signal: new AbortController().signal,
  onUnavailable(code: GameSceneErrorCode) {
    void code;
  },
});
adapter?.offer(parseGameSceneSnapshot(snapshot));
await adapter?.flush();
const tick: number | null | undefined = adapter?.getSnapshot().presentedTick;
void tick;
adapter?.resize(320, 240);
adapter?.destroy();
await createGameSceneAdapter({ enabled: false });
// @ts-expect-error backing dimensions are numeric pixel counts.
adapter?.resize("320", 240);
// @ts-expect-error snapshots declare an exact supported version.
const future: GameSceneSnapshot = { ...snapshot, version: "2.0.0" };
void future;

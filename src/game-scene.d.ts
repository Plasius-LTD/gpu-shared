type RendererModule = Pick<
  typeof import("@plasius/gpu-renderer"),
  "createNativeSceneRenderer"
>;
export type GameSceneVector = readonly [number, number, number];
export interface GameSceneInstance {
  readonly id: string;
  readonly meshId: string;
  readonly position: GameSceneVector;
  /** Right-handed orthonormal axes; each vector must be separately owned JSON data. */
  readonly basis: {
    readonly right: GameSceneVector;
    readonly up: GameSceneVector;
    readonly forward: GameSceneVector;
  };
  readonly scale: number;
}
export interface GameSceneSnapshot {
  readonly type: "gameScene";
  readonly version: "1.0.0";
  readonly tick: number;
  readonly time: number;
  readonly camera: {
    readonly eye: GameSceneVector;
    readonly target: GameSceneVector;
    readonly fov: number;
  };
  readonly instances: readonly GameSceneInstance[];
}
export interface GameSceneMesh {
  readonly id: string;
  /** Copied native 12-float vertices; positions, unit normals and linear material channels. */
  readonly vertices: Float32Array;
}
export type GameSceneErrorCode =
  | "invalid-snapshot"
  | "invalid-options"
  | "invalid-meshes"
  | "aborted"
  | "webgpu-unavailable"
  | "initialization-timeout"
  | "initialization-failed"
  | "renderer-incompatible"
  | "device-lost"
  | "presentation-failed"
  | "destroyed"
  | "unknown-mesh"
  | "frame-capacity";
export class GameSceneError extends Error {
  readonly code: GameSceneErrorCode;
  constructor(code: GameSceneErrorCode);
}
export const GAME_SCENE_LIMITS: Readonly<{
  maxMeshes: 128;
  maxVertices: 120000;
  maxInstances: 2048;
  maxDimension: 3840;
  maxPixels: number;
  maxCoordinate: 10000;
  maxScale: 100;
  defaultTimeoutMs: 5000;
  maxTimeoutMs: 60000;
}>;
export interface GameScenePresentationState {
  readonly status: "ready" | "rendering" | "failed" | "destroyed";
  readonly errorCode: GameSceneErrorCode | null;
  readonly offeredSnapshots: number;
  readonly replacedSnapshots: number;
  readonly presentedFrames: number;
  readonly presentedTick: number | null;
  readonly pendingSnapshots: 0 | 1;
  readonly inFlightFrames: 0 | 1;
  /** Requested backing dimensions; applied at the next submission. */
  readonly width: number;
  readonly height: number;
}
export interface GameSceneAdapter {
  offer(snapshot: unknown): "submitted" | "queued" | "stale";
  /** Redraws the retained scene, including while the host simulation is paused. */
  resize(width: number, height: number): void;
  /** Shared drain promise; rejects on terminal failure or teardown. */
  flush(): Promise<void>;
  getSnapshot(): GameScenePresentationState;
  destroy(): void;
}
export interface GameSceneAdapterOptions {
  /** The host's backend-resolved capability/rollout decision. */
  enabled: boolean;
  canvas: HTMLCanvasElement;
  meshes: readonly GameSceneMesh[];
  width?: number;
  height?: number;
  timeoutMs?: number;
  initializationTimeoutMs?: number;
  signal?: AbortSignal;
  navigator?: Parameters<
    RendererModule["createNativeSceneRenderer"]
  >[0]["navigator"];
  /** Advanced injection; defaults to the installed released renderer. */
  rendererLoader?: () => Promise<RendererModule>;
  onUnavailable?: (code: GameSceneErrorCode) => void | Promise<void>;
}
export function parseGameSceneSnapshot(input: unknown): GameSceneSnapshot;
export function createGameSceneAdapter(
  options?: GameSceneAdapterOptions | { enabled: false },
): Promise<GameSceneAdapter | null>;

import type { WavefrontGpuAllocationSnapshot } from "@plasius/gpu-renderer";

export interface ModelInspectionQuality {
  samplesPerPixel: number;
  maxDepth: number;
  width: number;
  height: number;
  denoise: boolean;
}
export interface ModelInspectionProgress {
  phase: 'rendering' | 'refining' | 'complete' | 'paused';
  samples: number;
  target: number;
  width: number;
  height: number;
  maxDepth: number;
  denoise: boolean;
  /** Renderer-owned requested GPU allocations; not physical VRAM residency. */
  allocations?: WavefrontGpuAllocationSnapshot;
}
export interface ModelInspectionOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string | URL;
  integrity: Record<string, string>;
  enabled: boolean;
  signal?: AbortSignal;
  width?: number;
  height?: number;
  /** Positive byte budget for renderer-owned GPU resources. Defaults to 1 GiB. */
  memoryBudgetBytes?: number;
  quality?: Partial<Omit<ModelInspectionQuality, "width" | "height">>;
  onProgress?: (progress: ModelInspectionProgress) => void;
  onHintChange?: (visible: boolean) => void;
  onError?: (error: unknown) => void;
}
export interface ModelInspection {
  readonly triangleCount: number;
  readonly primitiveCount: number;
  getAllocationSnapshot(): WavefrontGpuAllocationSnapshot | null;
  draw(): Promise<void>;
  setQuality(quality: Partial<ModelInspectionQuality>): Promise<void>;
  setPaused(paused: boolean): void;
  reset(): void;
  destroy(): void;
}
export function createModelInspection(options: ModelInspectionOptions): Promise<ModelInspection>;

export interface SceneInspectionModel {
  modelUrl: string | URL;
  integrity: Record<string, string>;
  /** Bottom-centre placement; Y is height above the shared ground. Finite values up to ±1e12; GPU float precision still applies. */
  anchor: [number, number, number];
  /** Positive longest model dimension in chosen scene units, at most 1e12. */
  size: number;
  /** Rotation around the up axis in radians. Defaults to zero. */
  yaw?: number;
  /** Optional distinct decoded primitive indices, e.g. one authored variant. Bounds are recomputed. */
  primitiveIndices?: number[];
}
export interface SceneInspectionOptions extends Omit<ModelInspectionOptions, 'modelUrl' | 'integrity'> {
  /** Nonempty placements admitted against GPU resource budgets; repeated URLs must have identical manifests. */
  models: SceneInspectionModel[];
  /** Share source mesh geometry/BLAS with affine instances/TLAS. Static, non-emissive meshes only. */
  instancing?: boolean;
  camera?: { eye: [number, number, number]; target: [number, number, number]; fov: number };
}
export interface SceneInspection extends ModelInspection {
  /** Number of placed model copies, excluding the ground. */
  readonly modelCount: number;
  /** Number of distinct sources loaded and decoded for this scene. */
  readonly sourceCount: number;
  /** Mesh instances including the ground; zero for the expanded geometry path. */
  readonly instanceCount: number;
  readonly geometryMode: 'instanced' | 'expanded';
  readonly textureBytes: number;
}
export function createSceneInspection(options: SceneInspectionOptions): Promise<SceneInspection>;

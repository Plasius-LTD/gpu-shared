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
}
export interface ModelInspectionOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string | URL;
  integrity: Record<string, string>;
  enabled: boolean;
  signal?: AbortSignal;
  width?: number;
  height?: number;
  quality?: Partial<Omit<ModelInspectionQuality, "width" | "height">>;
  onProgress?: (progress: ModelInspectionProgress) => void;
  onHintChange?: (visible: boolean) => void;
  onError?: (error: unknown) => void;
}
export interface ModelInspection {
  readonly triangleCount: number;
  readonly primitiveCount: number;
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
  /** Bottom-centre placement; Y is height above the shared ground. Each axis is bounded to ±20. */
  anchor: [number, number, number];
  /** Longest model dimension, in chosen scene units, between 0.25 and 10. */
  size: number;
  /** Rotation around the up axis in radians. Defaults to zero. */
  yaw?: number;
}
export interface SceneInspectionOptions extends Omit<ModelInspectionOptions, 'modelUrl' | 'integrity'> {
  models: SceneInspectionModel[];
  camera?: { eye: [number, number, number]; target: [number, number, number]; fov: number };
}
export interface SceneInspection extends ModelInspection {
  readonly modelCount: number;
  readonly textureBytes: number;
}
export function createSceneInspection(options: SceneInspectionOptions): Promise<SceneInspection>;

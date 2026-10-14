export interface ModelInspectionQuality {
  samplingMode: 'fixed' | 'adaptive';
  samplesPerPixel: number;
  maxDepth: number;
  width: number;
  height: number;
  denoise: boolean;
}
export interface ModelInspectionProgress {
  samplingMode: 'fixed' | 'adaptive';
  meanSpp?: number;
  minimumSpp?: number;
  maximumSpp?: number;
  completedTiles?: number;
  totalTiles?: number;
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
  adaptiveEnabled?: boolean;
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

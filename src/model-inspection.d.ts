export interface ModelInspectionOptions {
  canvas: HTMLCanvasElement;
  modelUrl: string | URL;
  integrity: Record<string, string>;
  enabled: boolean;
  signal?: AbortSignal;
  width?: number;
  height?: number;
  onHintChange?: (visible: boolean) => void;
  onError?: (error: unknown) => void;
}
export interface ModelInspection {
  readonly triangleCount: number;
  readonly primitiveCount: number;
  draw(): Promise<void>;
  reset(): void;
  destroy(): void;
}
export function createModelInspection(options: ModelInspectionOptions): Promise<ModelInspection>;

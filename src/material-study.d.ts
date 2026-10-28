export interface MaterialStudyState {
  readonly version: 1;
  readonly seed: number;
  readonly ropeFray: number;
  readonly varnishWear: number;
  readonly coated: boolean;
  readonly fibres: boolean;
  readonly materials: boolean;
  readonly looseEndCount: number;
}
export type MaterialStudyUpdate = Partial<Pick<MaterialStudyState, 'ropeFray' | 'varnishWear' | 'coated' | 'fibres' | 'materials'>>;
export interface MaterialStudy {
  read(): MaterialStudyState;
  update(patch: MaterialStudyUpdate): Promise<void>;
  resize(): void;
  destroy(): void;
}
export interface MaterialStudyOptions {
  canvas: HTMLCanvasElement;
  /** Absolute URL of the reviewed Wooden Crate 01 glTF and adjacent resource directory. */
  modelUrl: string | URL;
  signal?: AbortSignal;
  onHintChange?: (visible: boolean) => void;
  /** One terminal post-mount notification, after cleanup. Intentional abort/destroy is silent. */
  onUnavailable?: (failure: MaterialStudyFailure) => void;
}
export interface MaterialStudyFailure {
  readonly code: 'render-unavailable';
  readonly message: 'Material study rendering is unavailable.';
}
/** Caller must confirm its rollout/capability before mounting. Rejects on unavailable WebGPU/assets. */
export function createMaterialStudy(options: MaterialStudyOptions): Promise<MaterialStudy>;

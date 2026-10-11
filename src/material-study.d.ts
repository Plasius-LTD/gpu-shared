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
}
/** Caller must confirm its rollout/capability before mounting. Rejects on unavailable WebGPU/assets. */
export function createMaterialStudy(options: MaterialStudyOptions): Promise<MaterialStudy>;

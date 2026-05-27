export interface GltfModelColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface GltfModelBounds {
  readonly min: readonly [number, number, number];
  readonly max: readonly [number, number, number];
}

export interface GltfModelMaterial {
  readonly name: string;
  readonly color: GltfModelColor;
  readonly roughness: number;
  readonly metallic: number;
  readonly emissive: Readonly<{
    r: number;
    g: number;
    b: number;
  }>;
}

export interface GltfModelPrimitive {
  readonly name: string;
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly normals: readonly number[] | null;
  readonly colors: readonly number[] | null;
  readonly material: GltfModelMaterial;
  readonly bounds: GltfModelBounds;
}

export interface GltfModel {
  readonly name: string;
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly bounds: GltfModelBounds;
  readonly color: GltfModelColor;
  readonly physics: Readonly<Record<string, unknown>>;
  readonly primitives: readonly GltfModelPrimitive[];
}

export type ShowcaseAssetName =
  | "brigantine"
  | "cutter"
  | "lighthouse"
  | "harbor-dock";

export type ShowcaseFocusMode =
  | "integrated"
  | "lighting"
  | "cloth"
  | "fluid"
  | "physics"
  | "performance"
  | "debug";

export interface MountGpuShowcaseOptions {
  root?: HTMLElement;
  focus?: ShowcaseFocusMode | string;
  packageName?: string;
  title?: string;
  subtitle?: string;
  captureMode?: boolean;
  renderScale?: number;
  createState?: () => unknown;
  updateState?: (state: unknown, scene: Record<string, unknown>, dt: number) => unknown;
  describeState?: (state: unknown, scene: Record<string, unknown>) => Record<string, unknown> | null;
  destroyState?: (state: unknown) => void;
}

export interface MountGpuShowcaseResult {
  readonly state: Record<string, unknown>;
  readonly shipModel: GltfModel;
  readonly canvas: HTMLCanvasElement;
  destroy(): void;
}

export const showcaseFocusModes: readonly ShowcaseFocusMode[];

export function resolveShowcaseAssetUrl(
  baseUrlOrAssetName?: string | URL | ShowcaseAssetName,
  assetName?: ShowcaseAssetName
): URL;

export function loadGltfModel(url: string | URL): Promise<GltfModel>;

export function mountGpuShowcase(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuShowcaseResult>;

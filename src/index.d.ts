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
  readonly index: number | null;
  readonly name: string;
  readonly color: GltfModelColor;
  readonly roughness: number;
  readonly metallic: number;
  readonly baseColorFactor: readonly number[];
  readonly emissive: Readonly<{
    r: number;
    g: number;
    b: number;
  }>;
  readonly emissiveFactor: readonly number[];
  readonly alphaMode: "OPAQUE" | "MASK" | "BLEND" | string;
  readonly alphaCutoff: number;
  readonly doubleSided: boolean;
  readonly baseColorTexture: GltfModelTextureInfo | null;
  readonly metallicRoughnessTexture: GltfModelTextureInfo | null;
  readonly normalTexture: GltfModelTextureInfo | null;
  readonly occlusionTexture: GltfModelTextureInfo | null;
  readonly emissiveTexture: GltfModelTextureInfo | null;
  readonly specular: Readonly<{
    readonly factor: number;
    readonly colorFactor: readonly number[];
    readonly texture: GltfModelTextureInfo | null;
    readonly colorTexture: GltfModelTextureInfo | null;
  }>;
  readonly transmission: Readonly<{
    readonly factor: number;
    readonly texture: GltfModelTextureInfo | null;
  }>;
  readonly ior: number;
}

export interface GltfModelTextureTransform {
  readonly offset: readonly number[];
  readonly scale: readonly number[];
  readonly rotation: number;
  readonly texCoord: number;
}

export interface GltfModelTextureInfo {
  readonly index: number;
  readonly name: string;
  readonly texCoord: number;
  readonly sampler: number | null;
  readonly source: number | null;
  readonly uri: string | null;
  readonly mimeType: string | null;
  readonly bufferView: number | null;
  readonly transform: GltfModelTextureTransform;
  readonly scale: number;
  readonly strength: number;
}

export interface GltfModelPrimitive {
  readonly name: string;
  readonly nodeName: string | null;
  readonly meshName: string | null;
  readonly primitiveIndex: number;
  readonly materialIndex: number | null;
  readonly mode: number;
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly normals: readonly number[] | null;
  readonly colors: readonly number[] | null;
  readonly uvs: readonly number[] | null;
  readonly tangents: readonly number[] | null;
  readonly tangentSpace: Readonly<{
    readonly source: "asset" | "generated-from-uv-normal-position" | string;
    readonly texCoord: number;
  }> | null;
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
  readonly materials: readonly GltfModelMaterial[];
  readonly primitives: readonly GltfModelPrimitive[];
}

export type ShowcaseDemoMode = "harbor" | "product-studio";

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

export type ShowcasePerformanceMode = "adaptive" | "max";
export type ShowcaseCaptureResolution =
  | "720p"
  | "1080p"
  | "1280x720"
  | "1920x1080";
export type ShowcaseTimeOfDay =
  | "day"
  | "night"
  | "dawn"
  | "dusk"
  | "cycle"
  | "morning"
  | "sunrise"
  | "evening"
  | "sunset";

export const GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE:
  "gpu-renderer.hit-driven-pathtrace.enabled";
export const GPU_SHOWCASE_REALISTIC_MODELS_FEATURE: "gpu_showcase_realistic_models_v1";
export const GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE: "gpu_showcase_product_studio_v1";

export type ShowcaseFeatureFlags =
  | Readonly<Record<string, boolean>>
  | Readonly<{
      flags?: Readonly<Record<string, boolean>>;
      enabled?: Readonly<Record<string, boolean>>;
    }>;

export interface MountGpuShowcaseOptions {
  root?: HTMLElement;
  mode?: ShowcaseDemoMode | "product" | "studio" | "eames" | string;
  demoMode?: ShowcaseDemoMode | "product" | "studio" | "eames" | string;
  focus?: ShowcaseFocusMode | string;
  packageName?: string;
  title?: string;
  subtitle?: string;
  productAssetUrl?: string | URL;
  modelUrl?: string | URL;
  assetUrl?: string | URL;
  productAngle?: "hero" | "leather" | "wood" | "turntable" | string;
  captureMode?: boolean;
  performanceMode?: ShowcasePerformanceMode | "preview";
  adaptivePerformance?: boolean;
  maxQuality?: boolean;
  frameExport?: boolean;
  videoCapture?: boolean;
  captureResolution?:
    | ShowcaseCaptureResolution
    | Readonly<{ width: number; height: number }>;
  timeOfDay?: ShowcaseTimeOfDay;
  renderScale?: number;
  featureFlags?: ShowcaseFeatureFlags;
  __featureFlags?: ShowcaseFeatureFlags;
  createState?: () => unknown;
  updateState?: (state: unknown, scene: Record<string, unknown>, dt: number) => unknown;
  describeState?: (state: unknown, scene: Record<string, unknown>) => Record<string, unknown> | null;
  destroyState?: (state: unknown) => void;
}

export interface MountGpuShowcaseResult {
  readonly state: Record<string, unknown>;
  readonly shipModel?: GltfModel;
  readonly productModel?: GltfModel | null;
  readonly canvas: HTMLCanvasElement;
  destroy(): void;
}

export const showcaseFocusModes: readonly ShowcaseFocusMode[];
export const showcaseDemoModes: readonly ShowcaseDemoMode[];

export function resolveShowcaseAssetUrl(
  baseUrlOrAssetName?: string | URL | ShowcaseAssetName,
  assetName?: ShowcaseAssetName
): URL;

export function loadGltfModel(url: string | URL): Promise<GltfModel>;

export function mountGpuShowcase(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuShowcaseResult>;

export function mountGpuProductStudio(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuShowcaseResult>;

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
  readonly opacity?: number;
  readonly emissive: Readonly<{
    r: number;
    g: number;
    b: number;
    a?: number;
  }>;
  readonly baseColorTexture?: GltfModelTextureInfo | null;
  readonly metallicRoughnessTexture?: GltfModelTextureInfo | null;
  readonly normalTexture?: GltfModelTextureInfo | null;
  readonly occlusionTexture?: GltfModelTextureInfo | null;
  readonly emissiveTexture?: GltfModelTextureInfo | null;
  readonly specular?: number;
  readonly specularColor?: readonly number[];
  readonly specularTexture?: GltfModelTextureInfo | null;
  readonly specularColorTexture?: GltfModelTextureInfo | null;
  readonly transmission?: number;
  readonly transmissionTexture?: GltfModelTextureInfo | null;
  readonly ior?: number;
  readonly attenuationDistance?: number | null;
  readonly attenuationColor?: readonly number[];
  readonly thickness?: number;
  readonly thicknessTexture?: GltfModelTextureInfo | null;
  readonly clearcoat?: number;
  readonly clearcoatTexture?: GltfModelTextureInfo | null;
  readonly clearcoatRoughness?: number;
  readonly clearcoatRoughnessTexture?: GltfModelTextureInfo | null;
  readonly clearcoatNormalTexture?: GltfModelTextureInfo | null;
  readonly sheenColor?: readonly number[];
  readonly sheenColorTexture?: GltfModelTextureInfo | null;
  readonly sheenRoughness?: number;
  readonly sheenRoughnessTexture?: GltfModelTextureInfo | null;
  readonly iridescence?: number;
  readonly iridescenceTexture?: GltfModelTextureInfo | null;
  readonly iridescenceIor?: number;
  readonly iridescenceThicknessMinimum?: number;
  readonly iridescenceThicknessMaximum?: number;
  readonly iridescenceThicknessTexture?: GltfModelTextureInfo | null;
  readonly anisotropy?: number;
  readonly anisotropyRotation?: number;
  readonly anisotropyTexture?: GltfModelTextureInfo | null;
  readonly dispersion?: number;
}

export interface GltfModelTextureInfo {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  readonly texCoord?: number;
  readonly scale?: number;
  readonly strength?: number;
}

export interface GltfModelPrimitive {
  readonly name: string;
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly normals: readonly number[] | null;
  readonly uvs?: readonly number[] | null;
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
  | "harbor-dock"
  | "shoreline";

export type ShowcaseFocusMode =
  | "integrated"
  | "lighting"
  | "cloth"
  | "fluid"
  | "physics"
  | "performance"
  | "debug";

export type ShowcaseDemoMode =
  | "harbor"
  | "product-studio"
  | "product"
  | "studio"
  | "eames"
  | "animation-adventure"
  | "adventure"
  | "animation";

export type AnimationAdventureVector3 = readonly [number, number, number] | readonly number[];

export interface AnimationAdventureClipRef {
  readonly id: string;
  readonly url?: string;
  readonly clipUrl?: string;
  readonly category?: string;
  readonly rootTranslation?: boolean;
}

export interface AnimationAdventureRoutePoint {
  readonly id: string;
  readonly position: AnimationAdventureVector3;
  readonly arriveMs: number;
}

export interface AnimationAdventureBeat {
  readonly id: string;
  readonly order: number;
  readonly kind?: string;
  readonly clipId: string;
  readonly durationMs: number;
  readonly pathPointId?: string;
  readonly rootMotion?: string;
  readonly blend?: {
    readonly inMs?: number;
    readonly outMs?: number;
  };
}

export interface AnimationAdventureCamera {
  readonly mode?: "lagged-follow";
  readonly cubicBezier?: readonly [number, number, number, number] | readonly number[];
  readonly lagMs?: number;
  readonly lookAheadMs?: number;
  readonly offset?: AnimationAdventureVector3;
}

export interface AnimationAdventurePropLayout {
  readonly seed?: number;
  readonly bounds?: {
    readonly min: AnimationAdventureVector3;
    readonly max: AnimationAdventureVector3;
  };
  readonly kinds?: readonly string[];
}

export interface AnimationAdventureConfig {
  readonly modelUrl?: string | URL;
  readonly clips?: readonly AnimationAdventureClipRef[];
  readonly clipRefs?: readonly AnimationAdventureClipRef[];
  readonly route?: readonly AnimationAdventureRoutePoint[];
  readonly beats?: readonly AnimationAdventureBeat[];
  readonly camera?: AnimationAdventureCamera;
  readonly props?: AnimationAdventurePropLayout;
  readonly generatedProps?: readonly {
    readonly id?: string;
    readonly kind: string;
    readonly position: AnimationAdventureVector3;
  }[];
}

export interface ProductStudioMesh {
  readonly id: number;
  readonly positions: readonly number[];
  readonly indices: readonly number[];
  readonly normals?: readonly number[] | null;
  readonly uvs?: readonly number[] | null;
  readonly material?: GltfModelMaterial;
  readonly color: readonly number[];
  readonly emission?: readonly number[];
  readonly materialKind: string | number;
  readonly materialRefId?: number;
  readonly roughness?: number;
  readonly metallic?: number;
  readonly opacity?: number;
  readonly baseColorTexture?: GltfModelTextureInfo | null;
  readonly metallicRoughnessTexture?: GltfModelTextureInfo | null;
  readonly normalTexture?: GltfModelTextureInfo | null;
  readonly occlusionTexture?: GltfModelTextureInfo | null;
  readonly emissiveTexture?: GltfModelTextureInfo | null;
  readonly specular?: number;
  readonly specularColor?: readonly number[];
  readonly specularTexture?: GltfModelTextureInfo | null;
  readonly specularColorTexture?: GltfModelTextureInfo | null;
  readonly transmission?: number;
  readonly transmissionTexture?: GltfModelTextureInfo | null;
  readonly ior?: number;
  readonly attenuationDistance?: number | null;
  readonly attenuationColor?: readonly number[];
  readonly thickness?: number;
  readonly thicknessTexture?: GltfModelTextureInfo | null;
  readonly clearcoat?: number;
  readonly clearcoatTexture?: GltfModelTextureInfo | null;
  readonly clearcoatRoughness?: number;
  readonly clearcoatRoughnessTexture?: GltfModelTextureInfo | null;
  readonly clearcoatNormalTexture?: GltfModelTextureInfo | null;
  readonly sheenColor?: readonly number[];
  readonly sheenColorTexture?: GltfModelTextureInfo | null;
  readonly sheenRoughness?: number;
  readonly sheenRoughnessTexture?: GltfModelTextureInfo | null;
  readonly iridescence?: number;
  readonly iridescenceTexture?: GltfModelTextureInfo | null;
  readonly iridescenceIor?: number;
  readonly iridescenceThicknessMinimum?: number;
  readonly iridescenceThicknessMaximum?: number;
  readonly iridescenceThicknessTexture?: GltfModelTextureInfo | null;
  readonly anisotropy?: number;
  readonly anisotropyRotation?: number;
  readonly anisotropyTexture?: GltfModelTextureInfo | null;
  readonly dispersion?: number;
}

export type GpuSharedTranslationValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type GpuSharedTranslationArgs = Readonly<
  Record<string, GpuSharedTranslationValue>
>;

export interface GpuSharedTranslate {
  (
    key: GpuSharedTranslationKey,
    args?: GpuSharedTranslationArgs
  ): string | undefined;
}

export const gpuSharedTranslationKeys: Readonly<{
  showcaseTitle: "gpuShared.showcase.title";
  showcaseSubtitle: "gpuShared.showcase.subtitle";
  statusBooting: "gpuShared.showcase.status.booting";
  statusLive: "gpuShared.showcase.status.live";
  detailsBooting: "gpuShared.showcase.details.booting";
  detailsPhysics: "gpuShared.showcase.details.physics";
  detailsRealistic: "gpuShared.showcase.details.realistic";
  detailsLegacy: "gpuShared.showcase.details.legacy";
  pause: "gpuShared.showcase.action.pause";
  resume: "gpuShared.showcase.action.resume";
  stressMode: "gpuShared.showcase.control.stressMode";
  focus: "gpuShared.showcase.control.focus";
  focusIntegrated: "gpuShared.showcase.focus.integrated";
  focusLighting: "gpuShared.showcase.focus.lighting";
  focusCloth: "gpuShared.showcase.focus.cloth";
  focusFluid: "gpuShared.showcase.focus.fluid";
  focusPhysics: "gpuShared.showcase.focus.physics";
  focusPerformance: "gpuShared.showcase.focus.performance";
  focusDebug: "gpuShared.showcase.focus.debug";
  legendTitle: "gpuShared.showcase.legend.title";
  legendShipMetadata: "gpuShared.showcase.legend.shipMetadata";
  legendLighting: "gpuShared.showcase.legend.lighting";
  legendCollisions: "gpuShared.showcase.legend.collisions";
  sceneState: "gpuShared.showcase.section.sceneState";
  qualityBudgets: "gpuShared.showcase.section.qualityBudgets";
  debugTelemetry: "gpuShared.showcase.section.debugTelemetry";
  notes: "gpuShared.showcase.section.notes";
  noteAssetLoading: "gpuShared.showcase.note.assetLoading";
  noteMoonlight: "gpuShared.showcase.note.moonlight";
  noteContinuity: "gpuShared.showcase.note.continuity";
  notePerformance: "gpuShared.showcase.note.performance";
  notePhysicsSnapshots: "gpuShared.showcase.note.physicsSnapshots";
  notePhysicsCollisions: "gpuShared.showcase.note.physicsCollisions";
  notePhysicsLighting: "gpuShared.showcase.note.physicsLighting";
  debugAdapterShowcase: "gpuShared.debug.adapter.showcase";
  debugMainColorBuffer: "gpuShared.debug.allocation.mainColorBuffer";
  debugShadowImpressionAtlas: "gpuShared.debug.allocation.shadowImpressionAtlas";
}>;

export type GpuSharedTranslationKey =
  (typeof gpuSharedTranslationKeys)[keyof typeof gpuSharedTranslationKeys];

export const gpuSharedEnGbTranslations: Readonly<
  Record<GpuSharedTranslationKey, string>
>;

export const gpuSharedTranslations: Readonly<{
  "en-GB": typeof gpuSharedEnGbTranslations;
}>;

export function translateGpuSharedText(
  key: GpuSharedTranslationKey,
  args?: GpuSharedTranslationArgs,
  translate?: GpuSharedTranslate
): string;

export function createGpuSharedTranslator(
  translate?: GpuSharedTranslate
): (key: GpuSharedTranslationKey, args?: GpuSharedTranslationArgs) => string;

export interface MountGpuShowcaseOptions {
  __showcaseFeatureLoaders?: {
    cloth?: () => Promise<unknown>;
    fluid?: () => Promise<unknown>;
    lighting?: () => Promise<unknown>;
    performance?: () => Promise<unknown>;
    debug?: () => Promise<unknown>;
    physics?: () => Promise<unknown>;
  };
  root?: HTMLElement;
  demoMode?: ShowcaseDemoMode;
  mode?: ShowcaseDemoMode;
  focus?: ShowcaseFocusMode | string;
  packageName?: string;
  title?: string;
  subtitle?: string;
  translate?: GpuSharedTranslate;
  captureMode?: boolean;
  renderScale?: number;
  productAssetUrl?: string | URL;
  assetUrl?: string | URL;
  animationAdventure?: AnimationAdventureConfig;
  width?: number;
  height?: number;
  maxDepth?: number;
  tileSize?: number;
  samplesPerPixel?: number;
  denoise?: boolean;
  lightingPreset?: string;
  lightingIntensity?: number;
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

export interface MountGpuProductStudioResult {
  readonly state: Readonly<{
    featureFlags: unknown;
    modelName: string;
    sourceTriangleCount: number;
    meshCount: number;
    geometryMode: string;
    requiresTriangleMeshRenderer: boolean;
    displayQuality: boolean;
    requiresMeshBvhForDisplayQuality: boolean;
    rendererStats: Record<string, unknown>;
  }>;
  readonly model: GltfModel;
  readonly productModel: GltfModel;
  readonly canvas: HTMLCanvasElement;
  readonly renderer: unknown;
  readonly meshes: readonly ProductStudioMesh[];
  destroy(): void;
}

export const showcaseFocusModes: readonly ShowcaseFocusMode[];
export const showcaseDemoModes: readonly ShowcaseDemoMode[];
export const GPU_SHOWCASE_REALISTIC_MODELS_FEATURE: "gpu_showcase_realistic_models_v1";
export const GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE: "gpu_showcase_product_studio_wavefront_v1";
export const GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE: "gpu-demo.animation-adventure.enabled";

export function resolveShowcaseAssetUrl(
  baseUrlOrAssetName?: string | URL | ShowcaseAssetName,
  assetName?: ShowcaseAssetName
): URL;

export function loadGltfModel(url: string | URL): Promise<GltfModel>;

export function createProductStudioMeshes(
  model: GltfModel,
  options?: {
    targetCenter?: readonly number[];
    targetSize?: number;
  }
): readonly ProductStudioMesh[];

export function buildProductStudioSceneObjects(
  model: GltfModel,
  options?: {
    targetCenter?: readonly number[];
    targetSize?: number;
  }
): readonly ProductStudioMesh[];

export function mountGpuProductStudio(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuProductStudioResult>;

export function createAnimationAdventureProps(
  layout?: AnimationAdventurePropLayout & {
    readonly route?: readonly AnimationAdventureRoutePoint[];
  }
): readonly {
  readonly id?: string;
  readonly kind: string;
  readonly position: readonly number[];
}[];

export function mountGpuAnimationAdventure(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuShowcaseResult>;

export function mountGpuShowcase(
  options?: MountGpuShowcaseOptions
): Promise<MountGpuShowcaseResult | MountGpuProductStudioResult>;

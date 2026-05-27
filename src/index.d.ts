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
  root?: HTMLElement;
  focus?: ShowcaseFocusMode | string;
  packageName?: string;
  title?: string;
  subtitle?: string;
  translate?: GpuSharedTranslate;
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

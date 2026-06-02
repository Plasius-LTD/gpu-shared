import {
  clothGarmentKinds,
  clothProfileNames,
  createClothRepresentationPlan,
  selectClothRepresentationBand,
} from "@plasius/gpu-cloth";
import {
  fluidBodyKinds,
  fluidProfileNames,
  createFluidRepresentationPlan,
} from "@plasius/gpu-fluid";
import {
  createLightingBandPlan,
  createRayTracedShadowPostProcessPlan,
  createWaterRayTraceLightingPlan,
  defaultLightingProfile,
  getLightingProfile,
  lightingDistanceBands,
} from "@plasius/gpu-lighting";
import {
  createDeviceProfile,
  createGpuPerformanceGovernor,
  createQualityLadderAdapter,
} from "@plasius/gpu-performance";
import { createGpuDebugSession } from "@plasius/gpu-debug";
import {
  createPhysicsSimulationPlan,
  createPhysicsWorldSnapshot,
  defaultPhysicsWorkerProfile,
  getPhysicsWorkerManifest,
} from "@plasius/gpu-physics/browser";

import { resolveShowcaseAssetUrl } from "./asset-url.js";
import { loadGltfModel } from "./gltf-loader.js";
import {
  GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
} from "./feature-flags.js";

const STYLE_ID = "plasius-shared-3d-showcase-style";
const ROOT_CLASS = "plasius-showcase-root";
const CAPTURE_CLASS = "plasius-showcase-root--capture";
const PERFORMANCE_MODE_ADAPTIVE = "adaptive";
const PERFORMANCE_MODE_MAX = "max";
const DEFAULT_TITLE = "Flag by the Sea";
const DEFAULT_SUBTITLE =
  "Shared 3D validation scene using GLTF ships, cloth, fluid continuity, adaptive performance, and telemetry.";
const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;
const CAPTURE_CANVAS_PIXEL_BUDGET = 1920 * 1080;
const MAX_QUALITY_CAPTURE_RENDER_SCALE = 2;
const MAX_QUALITY_RENDER_SCALE_CAP = 3;
const MAX_QUALITY_CANVAS_PIXEL_BUDGET = 1280 * 720;
const CAPTURE_RESOLUTIONS = Object.freeze({
  "720p": Object.freeze({ label: "720p", width: 1280, height: 720 }),
  "1080p": Object.freeze({ label: "1080p", width: 1920, height: 1080 }),
});
const TIME_OF_DAY_NIGHT = "night";
const TIME_OF_DAY_DAY = "day";
const TIME_OF_DAY_DAWN = "dawn";
const TIME_OF_DAY_DUSK = "dusk";
const TIME_OF_DAY_CYCLE = "cycle";
const SHIP_SCALE = 1.1;
const HARBOR_BOUNDS = Object.freeze({
  minX: -11.2,
  maxX: 11.2,
  minZ: 1.8,
  maxZ: 17.2,
});
const WATER_FIELD_MIN_Z = -6;
const WATER_FIELD_MAX_Z = 210;
const WATER_BAND_LAYOUT = Object.freeze([
  Object.freeze({ band: "near", minZ: -6, maxZ: 16, startWidth: 72, endWidth: 58 }),
  Object.freeze({ band: "mid", minZ: 16, maxZ: 46, startWidth: 58, endWidth: 76 }),
  Object.freeze({ band: "far", minZ: 46, maxZ: 100, startWidth: 76, endWidth: 110 }),
  Object.freeze({ band: "horizon", minZ: 100, maxZ: 210, startWidth: 110, endWidth: 150 }),
]);
const HARBOR_WATER_EXCLUSION_POLYGONS = Object.freeze([
  Object.freeze([
    Object.freeze({ x: -16.5, z: -7.2 }),
    Object.freeze({ x: -16.2, z: 6.6 }),
    Object.freeze({ x: -2.25, z: 4.55 }),
    Object.freeze({ x: 0.55, z: -7.2 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -16.5, z: -7.2 }),
    Object.freeze({ x: -16.2, z: 3.8 }),
    Object.freeze({ x: -8.6, z: 3.05 }),
    Object.freeze({ x: -6.2, z: -7.2 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -12.4, z: -3.2 }),
    Object.freeze({ x: -12.0, z: 4.8 }),
    Object.freeze({ x: -1.05, z: 4.35 }),
    Object.freeze({ x: -1.25, z: -3.25 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -5.4, z: 3.0 }),
    Object.freeze({ x: 0.95, z: 3.0 }),
    Object.freeze({ x: 0.95, z: 4.12 }),
    Object.freeze({ x: -5.4, z: 4.12 }),
  ]),
  Object.freeze([
    Object.freeze({ x: -11.8, z: 12.8 }),
    Object.freeze({ x: 10.6, z: 12.8 }),
    Object.freeze({ x: 10.6, z: 13.82 }),
    Object.freeze({ x: -11.8, z: 13.82 }),
  ]),
  Object.freeze([
    Object.freeze({ x: 9.65, z: 6.4 }),
    Object.freeze({ x: 10.95, z: 6.4 }),
    Object.freeze({ x: 10.95, z: 15.2 }),
    Object.freeze({ x: 9.65, z: 15.2 }),
  ]),
]);
const CAMERA_PRESETS = Object.freeze({
  integrated: Object.freeze({ yaw: -0.55, pitch: 0.34, distance: 27, target: [0, 2.2, 0] }),
  lighting: Object.freeze({ yaw: -0.28, pitch: 0.28, distance: 23, target: [0, 2.8, 0] }),
  cloth: Object.freeze({ yaw: -1.1, pitch: 0.25, distance: 15, target: [-8.4, 5.3, -1.5] }),
  fluid: Object.freeze({ yaw: -0.4, pitch: 0.18, distance: 18, target: [0, 1.2, 6] }),
  physics: Object.freeze({ yaw: -0.12, pitch: 0.27, distance: 16, target: [0, 1.8, 6.8] }),
  performance: Object.freeze({ yaw: -0.65, pitch: 0.36, distance: 24, target: [0, 2.2, 0] }),
  debug: Object.freeze({ yaw: -0.7, pitch: 0.32, distance: 24, target: [0, 2.2, 0] }),
});
export const showcaseFocusModes = Object.freeze(Object.keys(CAMERA_PRESETS));

const SCENE_NOTES = Object.freeze([
  "Ships are loaded from a GLTF asset and carry mass, damping, restitution, and hull extents from node extras.",
  "The harbor assets sit on a procedural quay, seawall, and breakwater so buildings read as shoreline structures rather than floating props.",
  "Time-of-day profiles can hold day, dawn, dusk, night, or a continuous cycle while keeping local lanterns and sun/moon reflections coherent.",
  "Cloth and fluid continuity stay coherent across near, mid, far, and extended horizon water bands.",
  "Adaptive mode reduces visual detail before mass-weighted authoritative collision motion is touched; capture max mode pins the visible tiers.",
]);

const LEGACY_HARBOR_LAYOUT = Object.freeze([
  Object.freeze({
    position: Object.freeze({ x: -8.2, y: 1.1, z: -0.9 }),
    rotationY: -0.16,
    scale: 5.4,
    color: { r: 0.32, g: 0.27, b: 0.23, a: 1 },
    accent: 0.06,
  }),
  Object.freeze({
    position: Object.freeze({ x: -5.7, y: 0.45, z: 1.4 }),
    rotationY: -0.08,
    scale: { x: 6.8, y: 0.3, z: 2.1 },
    color: { r: 0.31, g: 0.31, b: 0.34, a: 1 },
    accent: 0.04,
  }),
  Object.freeze({
    position: Object.freeze({ x: -10.4, y: 0.28, z: 0.8 }),
    rotationY: 0.22,
    scale: { x: 1.2, y: 0.9, z: 1.2 },
    color: { r: 0.31, g: 0.35, b: 0.39, a: 1 },
    accent: 0.02,
  }),
]);

const SHOWCASE_ENVIRONMENT_LAYOUT = Object.freeze([
  Object.freeze({
    assetKey: "harbor-dock",
    position: Object.freeze({ x: -4.8, y: 0.52, z: 0.48 }),
    rotationY: -0.08,
    scale: 0.84,
    accent: 0.04,
  }),
  Object.freeze({
    assetKey: "lighthouse",
    position: Object.freeze({ x: -10.4, y: 0.7, z: -0.9 }),
    rotationY: 0.12,
    scale: 0.56,
    accent: 0.08,
  }),
]);

const TIME_OF_DAY_VISUAL_PROFILES = Object.freeze({
  [TIME_OF_DAY_NIGHT]: Object.freeze({
    skyTop: { r: 0.02, g: 0.04, b: 0.075 },
    skyMid: { r: 0.067, g: 0.114, b: 0.173 },
    skyBottom: { r: 0.161, g: 0.231, b: 0.318 },
    duskGlow: { r: 0.78, g: 0.67, b: 0.54, a: 0.18 },
    horizonWarmth: { r: 0.91, g: 0.74, b: 0.54, a: 0.12 },
    seaTop: { r: 0.063, g: 0.157, b: 0.235 },
    seaMid: { r: 0.043, g: 0.114, b: 0.176 },
    seaBottom: { r: 0.024, g: 0.063, b: 0.098 },
    celestialCore: { r: 0.976, g: 0.969, b: 0.925, a: 0.94 },
    celestialHalo: { r: 0.698, g: 0.773, b: 0.855, a: 0.18 },
    celestialReflection: { r: 0.792, g: 0.835, b: 0.859, a: 0.16 },
    starVisibility: 1,
    celestialKind: "moon",
    ambientMist: { r: 0.165, g: 0.196, b: 0.227, a: 0.12 },
    waterNear: { r: 0.07, g: 0.19, b: 0.27 },
    waterFar: { r: 0.15, g: 0.28, b: 0.39 },
    harborWall: { r: 0.26, g: 0.24, b: 0.28 },
    harborDeck: { r: 0.33, g: 0.22, b: 0.16 },
    harborTower: { r: 0.23, g: 0.24, b: 0.29 },
    flagColor: { r: 0.66, g: 0.16, b: 0.13 },
    lanternReflectionStrength: 0.42,
    lightingEnvironment: {
      skyAmbient: { r: 0.1, g: 0.13, b: 0.18 },
      horizonFill: { r: 0.12, g: 0.13, b: 0.14 },
      moonKey: { r: 0.72, g: 0.78, b: 0.88 },
      warmBounce: { r: 0.18, g: 0.12, b: 0.07 },
      specularColor: { r: 0.78, g: 0.84, b: 0.9 },
      ambientStrength: 0.48,
      keyStrength: 0.82,
      fillStrength: 0.32,
      bounceStrength: 0.12,
      specularStrength: 0.22,
      waterSpecularStrength: 0.58,
      exposure: 1.13,
      contrast: 1.02,
      saturation: 0.9,
    },
  }),
  [TIME_OF_DAY_DAY]: Object.freeze({
    skyTop: { r: 0.55, g: 0.82, b: 0.93 },
    skyMid: { r: 0.68, g: 0.87, b: 0.95 },
    skyBottom: { r: 0.83, g: 0.9, b: 0.92 },
    duskGlow: { r: 0.96, g: 0.8, b: 0.55, a: 0.08 },
    horizonWarmth: { r: 0.95, g: 0.89, b: 0.75, a: 0.18 },
    seaTop: { r: 0.3, g: 0.63, b: 0.74 },
    seaMid: { r: 0.16, g: 0.48, b: 0.62 },
    seaBottom: { r: 0.04, g: 0.2, b: 0.3 },
    celestialCore: { r: 1, g: 0.95, b: 0.72, a: 0.78 },
    celestialHalo: { r: 1, g: 0.88, b: 0.48, a: 0.16 },
    celestialReflection: { r: 0.98, g: 0.86, b: 0.52, a: 0.1 },
    starVisibility: 0,
    celestialKind: "sun",
    ambientMist: { r: 0.58, g: 0.75, b: 0.82, a: 0.08 },
    waterNear: { r: 0.12, g: 0.43, b: 0.53 },
    waterFar: { r: 0.26, g: 0.57, b: 0.68 },
    harborWall: { r: 0.55, g: 0.53, b: 0.49 },
    harborDeck: { r: 0.45, g: 0.39, b: 0.3 },
    harborTower: { r: 0.62, g: 0.61, b: 0.56 },
    flagColor: { r: 0.74, g: 0.18, b: 0.14 },
    lanternReflectionStrength: 0.08,
    lightingEnvironment: {
      skyAmbient: { r: 0.36, g: 0.45, b: 0.5 },
      horizonFill: { r: 0.45, g: 0.53, b: 0.55 },
      moonKey: { r: 1, g: 0.88, b: 0.62 },
      warmBounce: { r: 0.38, g: 0.27, b: 0.15 },
      specularColor: { r: 0.92, g: 0.94, b: 0.9 },
      ambientStrength: 0.68,
      keyStrength: 1.05,
      fillStrength: 0.44,
      bounceStrength: 0.18,
      specularStrength: 0.18,
      waterSpecularStrength: 0.38,
      exposure: 1.02,
      contrast: 0.98,
      saturation: 0.95,
    },
  }),
  [TIME_OF_DAY_DUSK]: Object.freeze({
    skyTop: { r: 0.13, g: 0.15, b: 0.24 },
    skyMid: { r: 0.43, g: 0.37, b: 0.38 },
    skyBottom: { r: 0.86, g: 0.65, b: 0.43 },
    duskGlow: { r: 1, g: 0.7, b: 0.38, a: 0.32 },
    horizonWarmth: { r: 1, g: 0.77, b: 0.42, a: 0.3 },
    seaTop: { r: 0.17, g: 0.33, b: 0.46 },
    seaMid: { r: 0.1, g: 0.25, b: 0.35 },
    seaBottom: { r: 0.04, g: 0.12, b: 0.19 },
    celestialCore: { r: 1, g: 0.83, b: 0.52, a: 0.62 },
    celestialHalo: { r: 1, g: 0.61, b: 0.26, a: 0.18 },
    celestialReflection: { r: 0.98, g: 0.63, b: 0.36, a: 0.18 },
    starVisibility: 0.22,
    celestialKind: "sun",
    ambientMist: { r: 0.42, g: 0.34, b: 0.31, a: 0.12 },
    waterNear: { r: 0.09, g: 0.31, b: 0.42 },
    waterFar: { r: 0.22, g: 0.42, b: 0.52 },
    harborWall: { r: 0.43, g: 0.39, b: 0.36 },
    harborDeck: { r: 0.39, g: 0.3, b: 0.22 },
    harborTower: { r: 0.43, g: 0.41, b: 0.39 },
    flagColor: { r: 0.72, g: 0.18, b: 0.13 },
    lanternReflectionStrength: 0.28,
    lightingEnvironment: {
      skyAmbient: { r: 0.24, g: 0.25, b: 0.3 },
      horizonFill: { r: 0.48, g: 0.36, b: 0.24 },
      moonKey: { r: 0.96, g: 0.71, b: 0.44 },
      warmBounce: { r: 0.28, g: 0.19, b: 0.1 },
      specularColor: { r: 0.9, g: 0.78, b: 0.64 },
      ambientStrength: 0.58,
      keyStrength: 0.86,
      fillStrength: 0.34,
      bounceStrength: 0.16,
      specularStrength: 0.2,
      waterSpecularStrength: 0.5,
      exposure: 1.08,
      contrast: 1.01,
      saturation: 0.94,
    },
  }),
  [TIME_OF_DAY_DAWN]: Object.freeze({
    skyTop: { r: 0.32, g: 0.49, b: 0.68 },
    skyMid: { r: 0.68, g: 0.63, b: 0.6 },
    skyBottom: { r: 0.96, g: 0.78, b: 0.54 },
    duskGlow: { r: 1, g: 0.75, b: 0.46, a: 0.26 },
    horizonWarmth: { r: 1, g: 0.84, b: 0.58, a: 0.24 },
    seaTop: { r: 0.21, g: 0.47, b: 0.59 },
    seaMid: { r: 0.11, g: 0.34, b: 0.46 },
    seaBottom: { r: 0.04, g: 0.16, b: 0.25 },
    celestialCore: { r: 1, g: 0.88, b: 0.56, a: 0.68 },
    celestialHalo: { r: 1, g: 0.68, b: 0.34, a: 0.16 },
    celestialReflection: { r: 0.96, g: 0.72, b: 0.44, a: 0.14 },
    starVisibility: 0.08,
    celestialKind: "sun",
    ambientMist: { r: 0.5, g: 0.55, b: 0.58, a: 0.1 },
    waterNear: { r: 0.11, g: 0.37, b: 0.49 },
    waterFar: { r: 0.23, g: 0.5, b: 0.63 },
    harborWall: { r: 0.5, g: 0.47, b: 0.43 },
    harborDeck: { r: 0.42, g: 0.34, b: 0.25 },
    harborTower: { r: 0.5, g: 0.48, b: 0.44 },
    flagColor: { r: 0.7, g: 0.17, b: 0.13 },
    lanternReflectionStrength: 0.18,
    lightingEnvironment: {
      skyAmbient: { r: 0.31, g: 0.36, b: 0.42 },
      horizonFill: { r: 0.5, g: 0.42, b: 0.3 },
      moonKey: { r: 0.98, g: 0.78, b: 0.48 },
      warmBounce: { r: 0.32, g: 0.22, b: 0.12 },
      specularColor: { r: 0.9, g: 0.84, b: 0.72 },
      ambientStrength: 0.62,
      keyStrength: 0.92,
      fillStrength: 0.38,
      bounceStrength: 0.17,
      specularStrength: 0.19,
      waterSpecularStrength: 0.44,
      exposure: 1.06,
      contrast: 0.99,
      saturation: 0.94,
    },
  }),
});

const SHIP_LANTERNS = Object.freeze([
  Object.freeze({ x: 0.94, y: 1.54, z: 2.52, glow: 1 }),
  Object.freeze({ x: -0.9, y: 1.58, z: 2.44, glow: 0.92 }),
  Object.freeze({ x: 0.62, y: 1.42, z: -2.18, glow: 0.88 }),
  Object.freeze({ x: -0.58, y: 1.46, z: -2.04, glow: 0.84 }),
]);
const CUTTER_LANTERNS = Object.freeze([
  Object.freeze({ x: 0.42, y: 1.04, z: 1.18, glow: 0.94 }),
  Object.freeze({ x: -0.42, y: 1.04, z: 1.12, glow: 0.88 }),
]);

const HARBOR_TORCHES = Object.freeze([
  Object.freeze({ x: -5.2, y: 1.25, z: 1.36, glow: 1.1 }),
  Object.freeze({ x: -8.6, y: 2.48, z: -0.72, glow: 1 }),
  Object.freeze({ x: -10.4, y: 1.28, z: 0.82, glow: 0.92 }),
]);
const FLAG_LAYOUT = Object.freeze({
  origin: Object.freeze({ x: -3.5, y: 5.9, z: 2.4 }),
  width: 4.8,
  height: 2.7,
  mastOffsetX: 1.8,
});
function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} {
      color-scheme: dark;
      --plasius-paper: #081321;
      --plasius-ink: #edf4ff;
      --plasius-muted: #b6c5dd;
      --plasius-accent: #f3b16a;
      --plasius-panel: rgba(8, 19, 33, 0.72);
      --plasius-border: rgba(159, 185, 223, 0.18);
      --plasius-shadow: 0 24px 56px rgba(1, 6, 14, 0.44);
      margin: 0;
      min-height: 100%;
      font-family: "Fraunces", "Iowan Old Style", serif;
      color: var(--plasius-ink);
      background:
        radial-gradient(circle at 18% 12%, rgba(73, 101, 170, 0.28), transparent 30%),
        radial-gradient(circle at 82% 18%, rgba(240, 188, 103, 0.08), transparent 18%),
        linear-gradient(180deg, #04101d 0%, #0b1930 42%, #081321 100%);
    }
    .${ROOT_CLASS}.${CAPTURE_CLASS} {
      min-height: 100vh;
      overflow: hidden;
      background: #030710;
    }
    .${ROOT_CLASS},
    .${ROOT_CLASS} * {
      box-sizing: border-box;
    }
    .plasius-demo {
      width: min(1560px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 28px 0 40px;
      display: grid;
      gap: 20px;
    }
    .plasius-demo__hero,
    .plasius-demo__layout {
      display: grid;
      gap: 20px;
    }
    .plasius-demo__hero {
      grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.85fr);
      align-items: start;
    }
    .plasius-panel {
      border: 1px solid var(--plasius-border);
      border-radius: 24px;
      background: var(--plasius-panel);
      box-shadow: var(--plasius-shadow);
      backdrop-filter: blur(12px);
    }
    .plasius-demo__hero-card,
    .plasius-demo__status {
      padding: 20px 22px;
    }
    .plasius-demo__eyebrow {
      margin: 0 0 8px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      font-size: 12px;
      color: rgba(226, 236, 255, 0.58);
    }
    .plasius-demo h1,
    .plasius-demo h2,
    .plasius-demo h3 {
      margin: 0;
    }
    .plasius-demo__lead {
      margin: 12px 0 0;
      color: var(--plasius-muted);
      line-height: 1.6;
      max-width: 760px;
    }
    .plasius-demo__status-badge {
      width: fit-content;
      margin: 0;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(243, 177, 106, 0.14);
      color: var(--plasius-accent);
      font-weight: 700;
    }
    .plasius-demo__status-text {
      margin: 10px 0 0;
      color: var(--plasius-muted);
      line-height: 1.6;
    }
    .plasius-demo__layout {
      grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.68fr);
      align-items: start;
    }
    .plasius-demo__canvas-panel {
      padding: 18px;
      position: relative;
    }
    .plasius-demo__canvas {
      width: 100%;
      aspect-ratio: 16 / 9;
      display: block;
      border-radius: 20px;
      border: 1px solid rgba(159, 185, 223, 0.12);
      background: linear-gradient(180deg, #071220 0%, #132440 42%, #10344b 42%, #05111d 100%);
    }
    .${CAPTURE_CLASS} .plasius-demo {
      width: 100vw;
      height: 100vh;
      padding: 0;
      display: block;
    }
    .${CAPTURE_CLASS}[data-plasius-capture-resolution] {
      display: grid;
      place-items: center;
    }
    .${CAPTURE_CLASS}[data-plasius-capture-resolution] .plasius-demo {
      width: min(100vw, var(--plasius-capture-width), calc(100vh * var(--plasius-capture-aspect)));
      height: min(100vh, var(--plasius-capture-height), calc(100vw / var(--plasius-capture-aspect)));
    }
    .${CAPTURE_CLASS} .plasius-demo__hero,
    .${CAPTURE_CLASS} .plasius-demo__toolbar,
    .${CAPTURE_CLASS} .plasius-demo__legend,
    .${CAPTURE_CLASS} .plasius-demo__sidebar,
    .${CAPTURE_CLASS} .plasius-demo__footer {
      display: none;
    }
    .${CAPTURE_CLASS} .plasius-demo__layout {
      display: block;
      height: 100%;
    }
    .${CAPTURE_CLASS} .plasius-demo__canvas-panel {
      height: 100%;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
    .${CAPTURE_CLASS} .plasius-demo__canvas {
      width: 100%;
      height: 100%;
      aspect-ratio: auto;
      border: 0;
      border-radius: 0;
      background: #030710;
    }
    .plasius-demo__toolbar {
      position: absolute;
      top: 26px;
      left: 26px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .plasius-demo button,
    .plasius-demo label,
    .plasius-demo select {
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
    }
    .plasius-demo button,
    .plasius-demo .plasius-toggle,
    .plasius-demo select {
      border: 1px solid rgba(159, 185, 223, 0.18);
      border-radius: 999px;
      background: rgba(9, 20, 34, 0.84);
      color: var(--plasius-ink);
      padding: 10px 14px;
    }
    .plasius-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .plasius-demo__sidebar {
      display: grid;
      gap: 18px;
    }
    .plasius-demo__card {
      padding: 18px;
    }
    .plasius-demo__metrics,
    .plasius-demo__metrics li {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .plasius-demo__metrics {
      margin-top: 12px;
      display: grid;
      gap: 8px;
      color: var(--plasius-muted);
      line-height: 1.55;
    }
    .plasius-demo__metrics li {
      border-top: 1px solid rgba(21, 32, 40, 0.08);
      padding-top: 8px;
    }
    .plasius-demo__legend {
      position: absolute;
      right: 24px;
      bottom: 24px;
      padding: 10px 14px;
      border-radius: 16px;
      background: rgba(9, 20, 34, 0.82);
      border: 1px solid rgba(159, 185, 223, 0.16);
      color: var(--plasius-muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .plasius-demo__legend strong {
      display: block;
      color: var(--plasius-ink);
      margin-bottom: 4px;
    }
    .plasius-demo__footer {
      margin-top: 4px;
      color: rgba(226, 236, 255, 0.68);
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 1200px) {
      .plasius-demo__hero,
      .plasius-demo__layout {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(min, max, value) {
  const t = clamp((value - min) / Math.max(0.0001, max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898 + seed * seed * 0.0017) * 43758.5453;
  return value - Math.floor(value);
}

const DEFAULT_LIGHTING_ENVIRONMENT = Object.freeze({
  skyAmbient: Object.freeze({ r: 0.1, g: 0.13, b: 0.18 }),
  horizonFill: Object.freeze({ r: 0.12, g: 0.13, b: 0.14 }),
  moonKey: Object.freeze({ r: 0.72, g: 0.78, b: 0.88 }),
  warmBounce: Object.freeze({ r: 0.18, g: 0.12, b: 0.07 }),
  specularColor: Object.freeze({ r: 0.78, g: 0.84, b: 0.9 }),
  ambientStrength: 0.42,
  keyStrength: 0.76,
  fillStrength: 0.28,
  bounceStrength: 0.12,
  specularStrength: 0.16,
  waterSpecularStrength: 0.46,
  exposure: 1.08,
  contrast: 1.02,
  saturation: 0.9,
});

function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function addVec3(a, b) {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function subVec3(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scaleVec3(a, s) {
  return vec3(a.x * s, a.y * s, a.z * s);
}

function dotVec3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossVec3(a, b) {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

function lengthVec3(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function normalizeVec3(a) {
  const length = lengthVec3(a) || 1;
  return vec3(a.x / length, a.y / length, a.z / length);
}

function mixVec3(a, b, t) {
  return vec3(
    mix(a.x, b.x, t),
    mix(a.y, b.y, t),
    mix(a.z, b.z, t)
  );
}

function interpolateVec3Barycentric(values, weights) {
  return vec3(
    values[0].x * weights[0] + values[1].x * weights[1] + values[2].x * weights[2],
    values[0].y * weights[0] + values[1].y * weights[1] + values[2].y * weights[2],
    values[0].z * weights[0] + values[1].z * weights[1] + values[2].z * weights[2]
  );
}

function interpolateColorBarycentric(values, weights) {
  return {
    r: values[0].r * weights[0] + values[1].r * weights[1] + values[2].r * weights[2],
    g: values[0].g * weights[0] + values[1].g * weights[1] + values[2].g * weights[2],
    b: values[0].b * weights[0] + values[1].b * weights[1] + values[2].b * weights[2],
    a:
      (values[0].a ?? 1) * weights[0] +
      (values[1].a ?? 1) * weights[1] +
      (values[2].a ?? 1) * weights[2],
  };
}

function interpolateProjectedBarycentric(points, weights) {
  return {
    x: points[0].x * weights[0] + points[1].x * weights[1] + points[2].x * weights[2],
    y: points[0].y * weights[0] + points[1].y * weights[1] + points[2].y * weights[2],
    depth:
      points[0].depth * weights[0] +
      points[1].depth * weights[1] +
      points[2].depth * weights[2],
  };
}

function reflectVec3(vector, normal) {
  const unitNormal = normalizeVec3(normal);
  return subVec3(vector, scaleVec3(unitNormal, 2 * dotVec3(vector, unitNormal)));
}

function directionFromYaw(yaw) {
  return normalizeVec3(vec3(Math.sin(yaw), 0, Math.cos(yaw)));
}

function perpendicularOnWater(direction) {
  return vec3(-direction.z, 0, direction.x);
}

function rotateY(point, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return vec3(
    point.x * cosine - point.z * sine,
    point.y,
    point.x * sine + point.z * cosine
  );
}

function transformPoint(point, transform) {
  const scale =
    typeof transform.scale === "number"
      ? { x: transform.scale, y: transform.scale, z: transform.scale }
      : transform.scale;
  const scaled = vec3(point.x * scale.x, point.y * scale.y, point.z * scale.z);
  const rotated = rotateY(scaled, transform.rotationY);
  return addVec3(rotated, transform.position);
}

function transformDirection(direction, transform) {
  const scale =
    typeof transform.scale === "number"
      ? { x: transform.scale, y: transform.scale, z: transform.scale }
      : transform.scale;
  const scaled = vec3(direction.x * scale.x, direction.y * scale.y, direction.z * scale.z);
  return normalizeVec3(rotateY(scaled, transform.rotationY));
}

function projectPoint(point, camera, viewport) {
  const relative = subVec3(point, camera.eye);
  const viewX = dotVec3(relative, camera.right);
  const viewY = dotVec3(relative, camera.up);
  const viewZ = dotVec3(relative, camera.forward);
  if (viewZ <= 0.1) {
    return null;
  }
  const focal = 1 / Math.tan((camera.fov * Math.PI) / 360);
  const ndcX = (viewX * focal) / (viewZ * camera.aspect);
  const ndcY = (viewY * focal) / viewZ;
  return {
    x: (ndcX * 0.5 + 0.5) * viewport.width,
    y: (-ndcY * 0.5 + 0.5) * viewport.height,
    depth: viewZ,
  };
}

function resolveSmoothedHitNormal(triangle, barycentric = [1 / 3, 1 / 3, 1 / 3]) {
  const faceNormal = normalizeVec3(triangle.faceNormal ?? triangle.normal);
  const vertexNormals = Array.isArray(triangle.vertexNormals)
    ? triangle.vertexNormals
    : null;
  if (vertexNormals?.length !== 3) {
    return faceNormal;
  }

  const interpolated = normalizeVec3(interpolateVec3Barycentric(vertexNormals, barycentric));
  if (!Number.isFinite(interpolated.x) || !Number.isFinite(interpolated.y) || !Number.isFinite(interpolated.z)) {
    return faceNormal;
  }

  const aligned = dotVec3(interpolated, faceNormal) < 0
    ? scaleVec3(interpolated, -1)
    : interpolated;
  const normalSmoothing = clamp(readVisualNumber(triangle.normalSmoothing, 1), 0, 1);
  return normalizeVec3(mixVec3(faceNormal, aligned, normalSmoothing));
}

function resolveHitWorldPoint(triangle, barycentric = [1 / 3, 1 / 3, 1 / 3]) {
  return Array.isArray(triangle.vertices) && triangle.vertices.length === 3
    ? interpolateVec3Barycentric(triangle.vertices, barycentric)
    : triangle.worldCenter;
}

function resolveHitColor(triangle, barycentric = [1 / 3, 1 / 3, 1 / 3]) {
  return Array.isArray(triangle.vertexColors) && triangle.vertexColors.length === 3
    ? interpolateColorBarycentric(triangle.vertexColors, barycentric)
    : triangle.baseColor;
}

function createTriangleHitPatch(triangle, barycentricCorners) {
  const barycentric = [
    (barycentricCorners[0][0] + barycentricCorners[1][0] + barycentricCorners[2][0]) / 3,
    (barycentricCorners[0][1] + barycentricCorners[1][1] + barycentricCorners[2][1]) / 3,
    (barycentricCorners[0][2] + barycentricCorners[1][2] + barycentricCorners[2][2]) / 3,
  ];

  return {
    points: barycentricCorners.map((corner) =>
      interpolateProjectedBarycentric(triangle.points, corner)
    ),
    barycentric,
    normal: resolveSmoothedHitNormal(triangle, barycentric),
    worldPoint: resolveHitWorldPoint(triangle, barycentric),
  };
}

function buildTriangleHitPatches(triangle) {
  const subdivisions = Math.max(
    1,
    Math.floor(readVisualNumber(triangle.normalSmoothingSubdivisions, 1))
  );
  if (subdivisions <= 1) {
    const barycentric = [1 / 3, 1 / 3, 1 / 3];
    return [{
      points: triangle.points,
      barycentric,
      normal: resolveSmoothedHitNormal(triangle, barycentric),
      worldPoint: resolveHitWorldPoint(triangle, barycentric),
    }];
  }

  const patches = [];
  const toBarycentric = (i, j, k) => [
    i / subdivisions,
    j / subdivisions,
    k / subdivisions,
  ];

  for (let i = 0; i < subdivisions; i += 1) {
    for (let j = 0; j < subdivisions - i; j += 1) {
      const k = subdivisions - i - j;
      patches.push(
        createTriangleHitPatch(triangle, [
          toBarycentric(i, j, k),
          toBarycentric(i + 1, j, k - 1),
          toBarycentric(i, j + 1, k - 1),
        ])
      );
      if (j < subdivisions - i - 1) {
        patches.push(
          createTriangleHitPatch(triangle, [
            toBarycentric(i + 1, j, k - 1),
            toBarycentric(i + 1, j + 1, k - 2),
            toBarycentric(i, j + 1, k - 1),
          ])
        );
      }
    }
  }

  return patches;
}

function colorToRgba(color, alpha = 1) {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function parseCssColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/iu);
  if (hex) {
    const valueText = hex[1].length === 3
      ? hex[1].split("").map((character) => `${character}${character}`).join("")
      : hex[1];
    return {
      r: Number.parseInt(valueText.slice(0, 2), 16) / 255,
      g: Number.parseInt(valueText.slice(2, 4), 16) / 255,
      b: Number.parseInt(valueText.slice(4, 6), 16) / 255,
      a: 1,
    };
  }

  const rgb = trimmed.match(/^rgba?\(([^)]+)\)$/iu);
  if (!rgb) {
    return null;
  }

  const parts = rgb[1].split(",").map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  const channels = parts.slice(0, 3).map((part) => Number.parseFloat(part));
  if (channels.some((channel) => !Number.isFinite(channel))) {
    return null;
  }

  const alpha = parts.length > 3 ? Number.parseFloat(parts[3]) : 1;
  return {
    r: channels[0] / 255,
    g: channels[1] / 255,
    b: channels[2] / 255,
    a: Number.isFinite(alpha) ? alpha : 1,
  };
}

function normalizeColor(value, fallback) {
  if (
    value &&
    typeof value === "object" &&
    Number.isFinite(value.r) &&
    Number.isFinite(value.g) &&
    Number.isFinite(value.b)
  ) {
    return value;
  }

  return parseCssColor(value) ?? fallback;
}

function colorToHex(color) {
  const toHex = (component) =>
    Math.round(clamp(component, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function mixColor(a, b, t) {
  return {
    r: mix(a.r, b.r, t),
    g: mix(a.g, b.g, t),
    b: mix(a.b, b.b, t),
    a: mix(a.a ?? 1, b.a ?? 1, t),
  };
}

function mixLightingEnvironment(a, b, t) {
  const mixEnvironmentColor = (key) => mixColor(a[key], b[key], t);
  return {
    skyAmbient: mixEnvironmentColor("skyAmbient"),
    horizonFill: mixEnvironmentColor("horizonFill"),
    moonKey: mixEnvironmentColor("moonKey"),
    warmBounce: mixEnvironmentColor("warmBounce"),
    specularColor: mixEnvironmentColor("specularColor"),
    ambientStrength: mix(a.ambientStrength, b.ambientStrength, t),
    keyStrength: mix(a.keyStrength, b.keyStrength, t),
    fillStrength: mix(a.fillStrength, b.fillStrength, t),
    bounceStrength: mix(a.bounceStrength, b.bounceStrength, t),
    specularStrength: mix(a.specularStrength, b.specularStrength, t),
    waterSpecularStrength: mix(a.waterSpecularStrength, b.waterSpecularStrength, t),
    exposure: mix(a.exposure, b.exposure, t),
    contrast: mix(a.contrast, b.contrast, t),
    saturation: mix(a.saturation, b.saturation, t),
  };
}

function multiplyColor(a, b) {
  return {
    r: a.r * b.r,
    g: a.g * b.g,
    b: a.b * b.b,
    a: (a.a ?? 1) * (b.a ?? 1),
  };
}

function addColor(a, b) {
  return {
    r: a.r + b.r,
    g: a.g + b.g,
    b: a.b + b.b,
  };
}

function scaleColor(color, scale) {
  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
  };
}

function gradeLitColor(color, lightingEnvironment = DEFAULT_LIGHTING_ENVIRONMENT) {
  const exposure = readVisualNumber(lightingEnvironment.exposure, 1);
  const contrast = readVisualNumber(lightingEnvironment.contrast, 1);
  const saturation = readVisualNumber(lightingEnvironment.saturation, 1);
  const exposed = {
    r: 1 - Math.exp(-Math.max(0, color.r) * exposure),
    g: 1 - Math.exp(-Math.max(0, color.g) * exposure),
    b: 1 - Math.exp(-Math.max(0, color.b) * exposure),
  };
  const contrasted = {
    r: clamp((exposed.r - 0.5) * contrast + 0.5, 0, 1),
    g: clamp((exposed.g - 0.5) * contrast + 0.5, 0, 1),
    b: clamp((exposed.b - 0.5) * contrast + 0.5, 0, 1),
  };
  const luminance =
    contrasted.r * 0.2126 + contrasted.g * 0.7152 + contrasted.b * 0.0722;

  return {
    r: clamp(mix(luminance, contrasted.r, saturation), 0, 1),
    g: clamp(mix(luminance, contrasted.g, saturation), 0, 1),
    b: clamp(mix(luminance, contrasted.b, saturation), 0, 1),
  };
}

function createLegacyMeshPrimitive(mesh) {
  return Object.freeze({
    name: mesh.name ?? "legacy-mesh",
    positions: mesh.positions,
    indices: mesh.indices,
    normals: null,
    colors: null,
    material: Object.freeze({
      name: "legacy-material",
      color: mesh.color ?? { r: 0.56, g: 0.33, b: 0.22, a: 1 },
      roughness: 0.88,
      metallic: 0.08,
      emissive: Object.freeze({ r: 0, g: 0, b: 0 }),
    }),
  });
}

function isFeatureEnabled(featureFlags, featureName, fallback = true) {
  const directValue =
    typeof featureFlags?.[featureName] === "boolean"
      ? featureFlags[featureName]
      : featureFlags?.flags?.[featureName];
  if (typeof directValue === "boolean") {
    return directValue;
  }

  const enabledValue =
    typeof featureFlags?.enabled?.[featureName] === "boolean"
      ? featureFlags.enabled[featureName]
      : undefined;
  if (typeof enabledValue === "boolean") {
    return enabledValue;
  }

  const queryValue = readFeatureFlagQueryValue(featureName);
  if (typeof queryValue === "boolean") {
    return queryValue;
  }

  return fallback;
}

function readFeatureFlagQueryValue(featureName) {
  try {
    const value = new URLSearchParams(globalThis.window?.location?.search ?? "").get(featureName);
    if (value === null) {
      return undefined;
    }
    if (isTruthyQueryValue(value)) {
      return true;
    }
    if (isFalsyQueryValue(value)) {
      return false;
    }
  } catch {
    // Feature flags are optional outside browser URL contexts.
  }

  return undefined;
}

function getMeshPrimitives(mesh) {
  return Array.isArray(mesh?.primitives) && mesh.primitives.length > 0
    ? mesh.primitives
    : [createLegacyMeshPrimitive(mesh)];
}

function tintPrimitiveColor(material, colorOverride) {
  if (!colorOverride) {
    return material.color;
  }

  const name = String(material.name ?? "").toLowerCase();
  if (name.includes("sail") || name.includes("glass") || name.includes("roof")) {
    return material.color;
  }

  const tintAmount = name.includes("hull")
    ? 0.54
    : name.includes("trim")
      ? 0.22
      : name.includes("deck")
        ? 0.12
        : 0;

  if (tintAmount <= 0) {
    return material.color;
  }

  return mixColor(material.color, multiplyColor(material.color, colorOverride), tintAmount);
}

function projectShadowPoint(point, lightDir, planeY) {
  const shadowDir = scaleVec3(lightDir, -1);
  if (Math.abs(shadowDir.y) < 0.0001) {
    return null;
  }

  const distance = (planeY - point.y) / shadowDir.y;
  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }

  return addVec3(point, scaleVec3(shadowDir, distance));
}

function shadeColor(
  base,
  normal,
  lightDir,
  heightBias = 0,
  accent = 0,
  lightingEnvironment = DEFAULT_LIGHTING_ENVIRONMENT
) {
  const unitNormal = normalizeVec3(normal);
  const diffuse = clamp(dotVec3(unitNormal, lightDir), 0, 1);
  const wrappedDiffuse = smoothstep(-0.12, 1, dotVec3(unitNormal, lightDir));
  const skyFacing = clamp(unitNormal.y * 0.5 + 0.5, 0, 1);
  const verticalFacing = 1 - clamp(Math.abs(unitNormal.y), 0, 1);
  const lowerBounce = clamp(-unitNormal.y * 0.5 + 0.5, 0, 1);
  const ambient = addColor(
    scaleColor(
      lightingEnvironment.skyAmbient,
      lightingEnvironment.ambientStrength * (0.38 + skyFacing * 0.62)
    ),
    addColor(
      scaleColor(
        lightingEnvironment.horizonFill,
        lightingEnvironment.fillStrength * (0.28 + verticalFacing * 0.72)
      ),
      scaleColor(
        lightingEnvironment.warmBounce,
        lightingEnvironment.bounceStrength * (0.18 + lowerBounce * 0.82)
      )
    )
  );
  const key = scaleColor(
    lightingEnvironment.moonKey,
    lightingEnvironment.keyStrength * (0.06 + Math.pow(wrappedDiffuse, 1.24) * 0.94)
  );
  const lighting = addColor(ambient, key);
  const softAccent = heightBias * 0.045 + accent;

  return {
    r: Math.max(0, base.r * (lighting.r + softAccent)),
    g: Math.max(0, base.g * (lighting.g + softAccent)),
    b: Math.max(0, base.b * (lighting.b + softAccent * 0.82 + diffuse * 0.018)),
  };
}

function getMaterialSeed(materialName) {
  let seed = 0;
  for (let index = 0; index < materialName.length; index += 1) {
    seed += materialName.charCodeAt(index) * (index + 1);
  }
  return seed;
}

function getMaterialDetailStrength(material, surfaceType) {
  const name = String(material?.name ?? "").toLowerCase();
  if (surfaceType === "water" || name.includes("glass")) {
    return 0.018;
  }
  if (name.includes("wood") || name.includes("timber") || name.includes("plank")) {
    return 0.13;
  }
  if (name.includes("stone") || name.includes("concrete") || name.includes("plaster")) {
    return 0.1;
  }
  if (name.includes("roof") || name.includes("crate")) {
    return 0.09;
  }
  if (name.includes("paint")) {
    return 0.045;
  }
  if (name.includes("metal")) {
    return 0.035;
  }
  return 0.04;
}

function applyMaterialDetail(color, material, worldCenter, normal, surfaceType) {
  const materialName = String(material?.name ?? surfaceType ?? "material");
  const detailStrength = getMaterialDetailStrength(material, surfaceType);
  const sample =
    worldCenter.x * 3.17 +
    worldCenter.y * 5.29 +
    worldCenter.z * 7.83 +
    getMaterialSeed(materialName) * 0.013;
  const grain = (pseudoRandom(sample) - 0.5) * detailStrength;
  const lowerSurface = smoothstep(7.5, -0.8, worldCenter.y);
  const verticalSurface = 1 - clamp(Math.abs(normal.y), 0, 1);
  const materialLowerWear =
    /stone|concrete|plaster|paint|wood|timber|plank|crate/.test(materialName.toLowerCase())
      ? lowerSurface * verticalSurface * 0.055
      : 0;
  const wetlineWear =
    surfaceType === "ship" && worldCenter.y < 0.72
      ? smoothstep(0.72, -0.1, worldCenter.y) * 0.05
      : 0;

  return {
    r: clamp(color.r * (1 + grain) - materialLowerWear - wetlineWear, 0, 1),
    g: clamp(color.g * (1 + grain * 0.82) - materialLowerWear * 0.9 - wetlineWear, 0, 1),
    b: clamp(color.b * (1 + grain * 0.62) - materialLowerWear * 0.68 - wetlineWear * 0.75, 0, 1),
  };
}

function buildCamera(state, canvas) {
  const preset = CAMERA_PRESETS[state.focus] ?? CAMERA_PRESETS.integrated;
  const yaw = state.camera.yaw ?? preset.yaw;
  const pitch = state.camera.pitch ?? preset.pitch;
  const distance = state.camera.distance ?? preset.distance;
  const target = state.camera.target ?? vec3(...preset.target);
  const eye = vec3(
    target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
    target.y + Math.sin(pitch) * distance,
    target.z + Math.cos(yaw) * Math.cos(pitch) * distance
  );
  const forward = normalizeVec3(subVec3(target, eye));
  const right = normalizeVec3(crossVec3(forward, vec3(0, 1, 0)));
  const up = normalizeVec3(crossVec3(right, forward));
  return {
    eye,
    target,
    forward,
    right,
    up,
    fov: 54,
    aspect: canvas.width / canvas.height,
  };
}

function buildTrianglesFromMesh(
  mesh,
  transform,
  colorOverride,
  camera,
  viewport,
  triangles,
  options = {}
) {
  const primitives = getMeshPrimitives(mesh);
  for (const primitive of primitives) {
    const resolvedColor = tintPrimitiveColor(primitive.material, colorOverride);
    for (let index = 0; index < primitive.indices.length; index += 3) {
      const aIndex = primitive.indices[index] * 3;
      const bIndex = primitive.indices[index + 1] * 3;
      const cIndex = primitive.indices[index + 2] * 3;

      const a = transformPoint(
        vec3(
          primitive.positions[aIndex],
          primitive.positions[aIndex + 1],
          primitive.positions[aIndex + 2]
        ),
        transform
      );
      const b = transformPoint(
        vec3(
          primitive.positions[bIndex],
          primitive.positions[bIndex + 1],
          primitive.positions[bIndex + 2]
        ),
        transform
      );
      const c = transformPoint(
        vec3(
          primitive.positions[cIndex],
          primitive.positions[cIndex + 1],
          primitive.positions[cIndex + 2]
        ),
        transform
      );

      const ab = subVec3(b, a);
      const ac = subVec3(c, a);
      const faceNormal = normalizeVec3(crossVec3(ab, ac));
      let normal = faceNormal;
      let vertexNormals = null;
      if (Array.isArray(primitive.normals)) {
        const aNormal = transformDirection(
          vec3(
            primitive.normals[aIndex],
            primitive.normals[aIndex + 1],
            primitive.normals[aIndex + 2]
          ),
          transform
        );
        const bNormal = transformDirection(
          vec3(
            primitive.normals[bIndex],
            primitive.normals[bIndex + 1],
            primitive.normals[bIndex + 2]
          ),
          transform
        );
        const cNormal = transformDirection(
          vec3(
            primitive.normals[cIndex],
            primitive.normals[cIndex + 1],
            primitive.normals[cIndex + 2]
          ),
          transform
        );
        vertexNormals = [aNormal, bNormal, cNormal];
        normal = normalizeVec3(
          scaleVec3(addVec3(addVec3(aNormal, bNormal), cNormal), 1 / 3)
        );
      }

      const viewDir = normalizeVec3(subVec3(camera.eye, a));
      if (dotVec3(faceNormal, viewDir) <= 0) {
        continue;
      }

      const projected = [
        projectPoint(a, camera, viewport),
        projectPoint(b, camera, viewport),
        projectPoint(c, camera, viewport),
      ];
      if (projected.some((value) => value === null)) {
        continue;
      }

      triangles.push({
        points: projected,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
        vertices: [a, b, c],
        faceNormal,
        normal,
        vertexNormals,
        normalSmoothing: vertexNormals ? readVisualNumber(options.normalSmoothing, 1) : 0,
        normalSmoothingSubdivisions: vertexNormals
          ? readVisualNumber(options.normalSmoothingSubdivisions, 3)
          : 1,
        baseColor: resolvedColor,
        accent: options.accent ?? 0,
        material: primitive.material,
        reflection: options.reflection ?? 0,
        surfaceType: options.surfaceType ?? "solid",
      });
    }
  }
}

function sampleWaterline(state, x, z) {
  return sampleWave(state, x, z, state.time) * 0.24 + 0.018;
}

function reflectPointAcrossWater(state, point) {
  const waterline = sampleWaterline(state, point.x, point.z);
  const verticalDistance = point.y - waterline;
  const direction = resolveWaveDirection(state);
  const lateral = perpendicularOnWater(direction);
  const wakeDistortion = sampleShipWake(state, point.x, point.z, state.time) * 0.08;
  const rippleDistortion = sampleWaveImpulses(state, point.x, point.z, state.time) * 0.18;
  const capillaryDistortion =
    Math.sin(point.x * 1.9 + point.z * 0.72 - state.time * 1.8) * 0.014;
  const distortion =
    (wakeDistortion + rippleDistortion + capillaryDistortion) *
    clamp(Math.abs(verticalDistance) * 0.24, 0.08, 0.62);

  return vec3(
    point.x + lateral.x * distortion + direction.x * distortion * 0.24,
    waterline - verticalDistance * 0.66,
    point.z + lateral.z * distortion + direction.z * distortion * 0.24
  );
}

function buildWaterReflectionTrianglesFromMesh(
  mesh,
  transform,
  colorOverride,
  camera,
  viewport,
  state,
  triangles,
  options = {}
) {
  const primitives = getMeshPrimitives(mesh);
  const waterTint = options.waterTint ?? { r: 0.18, g: 0.34, b: 0.45, a: 1 };
  const baseAlpha = readVisualNumber(options.baseAlpha, 0.18);
  const maxReflectionHeight = readVisualNumber(options.maxReflectionHeight, 5.8);
  const reflectionFadeHeight = readVisualNumber(options.reflectionFadeHeight, 4.4);
  const roughnessDamping = clamp(readVisualNumber(options.roughnessDamping, 1), 0.2, 1.2);

  for (const primitive of primitives) {
    const resolvedColor = tintPrimitiveColor(primitive.material, colorOverride);
    const reflectionColor = mixColor(resolvedColor, waterTint, 0.68);
    for (let index = 0; index < primitive.indices.length; index += 3) {
      const aIndex = primitive.indices[index] * 3;
      const bIndex = primitive.indices[index + 1] * 3;
      const cIndex = primitive.indices[index + 2] * 3;
      const a = transformPoint(
        vec3(
          primitive.positions[aIndex],
          primitive.positions[aIndex + 1],
          primitive.positions[aIndex + 2]
        ),
        transform
      );
      const b = transformPoint(
        vec3(
          primitive.positions[bIndex],
          primitive.positions[bIndex + 1],
          primitive.positions[bIndex + 2]
        ),
        transform
      );
      const c = transformPoint(
        vec3(
          primitive.positions[cIndex],
          primitive.positions[cIndex + 1],
          primitive.positions[cIndex + 2]
        ),
        transform
      );
      const originalCenter = scaleVec3(addVec3(addVec3(a, b), c), 1 / 3);
      const localWaterline = sampleWaterline(state, originalCenter.x, originalCenter.z);
      if (Math.max(a.y, b.y, c.y) < localWaterline + 0.08) {
        continue;
      }
      const heightAboveWater = originalCenter.y - localWaterline;
      if (heightAboveWater > maxReflectionHeight) {
        continue;
      }

      const reflected = [
        reflectPointAcrossWater(state, a),
        reflectPointAcrossWater(state, b),
        reflectPointAcrossWater(state, c),
      ];
      const projected = reflected.map((point) => projectPoint(point, camera, viewport));
      if (projected.some((value) => value === null)) {
        continue;
      }

      const originalNormal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
      const reflectedNormal = normalizeVec3(
        vec3(originalNormal.x, -originalNormal.y, originalNormal.z)
      );
      const verticalFacing = 1 - clamp(Math.abs(originalNormal.y), 0, 1);
      const averageDepth =
        projected.reduce((total, point) => total + point.depth, 0) / projected.length;
      const distanceFade = clamp(1.25 - averageDepth / 42, 0.28, 1);
      const heightFade = clamp(1 - heightAboveWater / reflectionFadeHeight, 0.04, 0.9);
      const materialRoughness = clamp(primitive.material?.roughness ?? 0.86, 0, 1);
      const alpha =
        baseAlpha *
        (0.28 + verticalFacing * 0.72) *
        distanceFade *
        heightFade *
        mix(1, 0.42, materialRoughness) *
        roughnessDamping *
        readVisualNumber(options.intensity, 1);

      triangles.push({
        points: projected,
        depth: averageDepth + 0.04,
        worldCenter: scaleVec3(addVec3(addVec3(reflected[0], reflected[1]), reflected[2]), 1 / 3),
        normal: reflectedNormal,
        baseColor: reflectionColor,
        alpha: clamp(alpha, 0.006, 0.12),
        material: {
          name: `${primitive.material?.name ?? "scene"}-water-reflection`,
          roughness: 0.38,
          metallic: 0.03,
          emissive: { r: 0, g: 0, b: 0 },
        },
        traceKind: options.traceKind ?? "scene-reflection",
      });
    }
  }
}

function drawWaterReflectionTriangles(ctx, triangles, waterRayTracePlan = null) {
  if (triangles.length === 0) {
    return;
  }

  triangles.sort((left, right) => right.depth - left.depth);
  ctx.save();
  const perPixelResolve =
    waterRayTracePlan?.reflectionResolve === "per-pixel-water-raytrace-resolve";
  ctx.globalCompositeOperation = perPixelResolve ? "screen" : "source-over";
  ctx.filter = perPixelResolve ? "blur(2.2px) saturate(0.82)" : "blur(1.4px) saturate(0.78)";
  ctx.globalAlpha = perPixelResolve ? 0.68 : 0.5;
  for (const triangle of triangles) {
    const alpha =
      triangle.alpha *
      (perPixelResolve
        ? clamp(readVisualNumber(waterRayTracePlan?.sceneReflectionIntensity, 1), 0.4, 1.4)
        : 1);
    ctx.fillStyle = colorToRgba(triangle.baseColor, alpha);
    ctx.beginPath();
    ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
    ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
    ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
    ctx.closePath();
    ctx.fill();
  }
  if (perPixelResolve) {
    ctx.filter = "blur(3px)";
    ctx.globalAlpha = 0.24;
    for (const triangle of triangles) {
      ctx.fillStyle = colorToRgba(triangle.baseColor, triangle.alpha);
      ctx.beginPath();
      ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
      ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
      ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

async function loadShowcaseAssetCatalog() {
  const [brigantine, cutter, lighthouse, harborDock] = await Promise.all([
    loadGltfModel(resolveShowcaseAssetUrl("brigantine")),
    loadGltfModel(resolveShowcaseAssetUrl("cutter")),
    loadGltfModel(resolveShowcaseAssetUrl("lighthouse")),
    loadGltfModel(resolveShowcaseAssetUrl("harbor-dock")),
  ]);

  return Object.freeze({
    primaryShipKey: "brigantine",
    ships: Object.freeze({
      brigantine,
      cutter,
    }),
    environment: Object.freeze({
      lighthouse,
      "harbor-dock": harborDock,
    }),
  });
}

function createLegacyShowcaseAssetCatalog() {
  const brigantine = loadGltfModel(resolveShowcaseAssetUrl("brigantine"));
  return Promise.resolve(brigantine).then((primary) =>
    Object.freeze({
      primaryShipKey: "brigantine",
      ships: Object.freeze({
        brigantine: primary,
      }),
      environment: Object.freeze({}),
    })
  );
}

function resolveShipModel(state, ship, fallbackModel = null) {
  return (
    state.assetCatalog?.ships?.[ship.modelKey ?? state.assetCatalog?.primaryShipKey ?? "brigantine"] ??
    fallbackModel ??
    state.shipModel
  );
}

function createPerformanceGovernor(options = {}) {
  const initialLevel = options.performanceMode === PERFORMANCE_MODE_MAX ? "ultra" : "high";
  const fluidDetail = createQualityLadderAdapter({
    id: "fluid-detail",
    domain: "geometry",
    levels: [
      { id: "low", config: { nearResolution: 10, midResolution: 6, splashCount: 10 }, estimatedCostMs: 0.8 },
      { id: "medium", config: { nearResolution: 16, midResolution: 8, splashCount: 18 }, estimatedCostMs: 1.4 },
      { id: "high", config: { nearResolution: 24, midResolution: 12, splashCount: 28 }, estimatedCostMs: 2.4 },
      { id: "ultra", config: { nearResolution: 44, midResolution: 26, splashCount: 56 }, estimatedCostMs: 4.6 },
    ],
    initialLevel,
  });

  const clothDetail = createQualityLadderAdapter({
    id: "cloth-detail",
    domain: "cloth",
    levels: [
      { id: "low", config: { cols: 10, rows: 7 }, estimatedCostMs: 0.7 },
      { id: "medium", config: { cols: 16, rows: 11 }, estimatedCostMs: 1.3 },
      { id: "high", config: { cols: 24, rows: 16 }, estimatedCostMs: 2.1 },
      { id: "ultra", config: { cols: 40, rows: 26 }, estimatedCostMs: 4.2 },
    ],
    initialLevel,
  });

  const lightingDetail = createQualityLadderAdapter({
    id: "lighting-detail",
    domain: "lighting",
    levels: [
      { id: "low", config: { shadowStrength: 0.18, reflectionStrength: 0.08 }, estimatedCostMs: 0.5 },
      { id: "medium", config: { shadowStrength: 0.36, reflectionStrength: 0.22 }, estimatedCostMs: 1.0 },
      { id: "high", config: { shadowStrength: 0.56, reflectionStrength: 0.36 }, estimatedCostMs: 1.8 },
      { id: "ultra", config: { shadowStrength: 0.74, reflectionStrength: 0.58 }, estimatedCostMs: 3.4 },
    ],
    initialLevel,
  });

  const governor = createGpuPerformanceGovernor({
    device: createDeviceProfile({
      deviceClass: "desktop",
      mode: "flat",
      refreshRateHz: 60,
      supportedFrameRates: [60, 90],
      supportsWebGpu: true,
    }),
    modules: [fluidDetail, clothDetail, lightingDetail],
    adaptation: {
      sampleWindowSize: 10,
      minimumSamplesBeforeAdjustment: 4,
      degradeCooldownFrames: 1,
      upgradeCooldownFrames: 4,
      minStableFramesForRecovery: 3,
    },
  });

  return { governor, fluidDetail, clothDetail, lightingDetail };
}

function buildDemoDom(root, options) {
  root.innerHTML = `
    <main class="plasius-demo">
      <section class="plasius-demo__hero">
        <section class="plasius-panel plasius-demo__hero-card">
          <p class="plasius-demo__eyebrow">${options.packageName}</p>
          <h1>${options.title}</h1>
          <p class="plasius-demo__lead">${options.subtitle}</p>
        </section>
        <section class="plasius-panel plasius-demo__status">
          <p id="demoStatus" class="plasius-demo__status-badge">Booting 3D scene…</p>
          <p id="demoDetails" class="plasius-demo__status-text">
            Preparing a moonlit harbor scene, GLTF hull data, cloth and fluid continuity plans, and adaptive quality metadata.
          </p>
        </section>
      </section>
      <section class="plasius-demo__layout">
        <section class="plasius-panel plasius-demo__canvas-panel">
          <canvas id="demoCanvas" class="plasius-demo__canvas" width="${DEFAULT_CANVAS_WIDTH}" height="${DEFAULT_CANVAS_HEIGHT}"></canvas>
          <div class="plasius-demo__toolbar">
            <button id="pauseButton" type="button">Pause</button>
            <label class="plasius-toggle">
              <input id="stressToggle" type="checkbox" />
              Stress mode
            </label>
            <label class="plasius-toggle">
              Focus
              <select id="focusMode">
                <option value="integrated">integrated</option>
                <option value="lighting">lighting</option>
                <option value="cloth">cloth</option>
                <option value="fluid">fluid</option>
                <option value="physics">physics</option>
                <option value="performance">performance</option>
                <option value="debug">debug</option>
              </select>
            </label>
          </div>
          <div class="plasius-demo__legend">
            <strong>Scene</strong>
            GLTF ships carry hull mass and damping metadata.<br />
            Lanterns and torches warm the moonlit harbor.<br />
            Mass-aware collisions stay authoritative near the camera.
          </div>
        </section>
        <aside class="plasius-demo__sidebar">
          <section class="plasius-panel plasius-demo__card">
            <h2>Scene State</h2>
            <ul id="sceneMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Quality + Budgets</h2>
            <ul id="qualityMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Debug Telemetry</h2>
            <ul id="debugMetrics" class="plasius-demo__metrics"></ul>
          </section>
          <section class="plasius-panel plasius-demo__card">
            <h2>Notes</h2>
            <ul id="sceneNotes" class="plasius-demo__metrics"></ul>
          </section>
        </aside>
      </section>
      <p class="plasius-demo__footer">
        This visual example is shared across the GPU packages to keep manual validation fast and consistent.
      </p>
    </main>
  `;

  return {
    status: root.querySelector("#demoStatus"),
    details: root.querySelector("#demoDetails"),
    canvas: root.querySelector("#demoCanvas"),
    pauseButton: root.querySelector("#pauseButton"),
    stressToggle: root.querySelector("#stressToggle"),
    focusMode: root.querySelector("#focusMode"),
    sceneMetrics: root.querySelector("#sceneMetrics"),
    qualityMetrics: root.querySelector("#qualityMetrics"),
    debugMetrics: root.querySelector("#debugMetrics"),
    sceneNotes: root.querySelector("#sceneNotes"),
  };
}

function buildSceneSnapshot(state, shipModel) {
  const shipPhysics = Object.freeze(
    Object.fromEntries(
      state.ships.map((ship) => [ship.id, resolveShipModel(state, ship, shipModel)?.physics ?? null])
    )
  );

  return Object.freeze({
    focus: state.focus,
    performanceMode: state.performanceMode,
    adaptivePerformance: state.adaptivePerformance,
    hitDrivenPathtraceEnabled: state.hitDrivenPathtraceEnabled,
    frame: state.frame,
    time: state.time,
    stress: state.stress,
    collisions: state.contactCount,
    collisionCount: state.collisionCount,
    collisionFlash: state.collisionFlash,
    sprays: Object.freeze(
      state.sprays.map((spray) =>
        Object.freeze({
          life: spray.life,
          position: Object.freeze({ ...spray.position }),
          velocity: Object.freeze({ ...spray.velocity }),
        })
      )
    ),
    ships: Object.freeze(
      state.ships.map((ship) =>
        Object.freeze({
          id: ship.id,
          modelKey: ship.modelKey ?? "brigantine",
          position: Object.freeze({ ...ship.position }),
          velocity: Object.freeze({ ...ship.velocity }),
          rotationY: ship.rotationY,
          angularVelocity: ship.angularVelocity,
          tint: Object.freeze({ ...ship.tint }),
        })
      )
    ),
    waveImpulses: Object.freeze(
      state.waveImpulses.map((impulse) =>
        Object.freeze({
          x: impulse.x,
          z: impulse.z,
          strength: impulse.strength,
          radius: impulse.radius,
          life: impulse.life,
        })
      )
    ),
    shipPhysics: shipModel?.physics ?? null,
    shipModels: shipPhysics,
    physics: Object.freeze({
      profile: state.physics.profile,
      plan: state.physics.plan,
      manifest: state.physics.manifest,
      snapshot: state.physics.snapshot,
      shipPhysics,
    }),
  });
}

function resolveSceneDescription(state, options, shipModel) {
  const scene = buildSceneSnapshot(state, shipModel);
  if (typeof options.describeState !== "function") {
    return { scene, description: null };
  }

  const description = options.describeState(state.packageState, scene) ?? null;
  return { scene, description };
}

function updatePackageState(state, options, shipModel, dt) {
  if (typeof options.updateState !== "function") {
    return;
  }

  const scene = buildSceneSnapshot(state, shipModel);
  const nextState = options.updateState(state.packageState, scene, dt);
  if (typeof nextState !== "undefined") {
    state.packageState = nextState;
  }
}

function normalizeColorOverride(color, fallback) {
  if (!color || typeof color !== "object") {
    return fallback;
  }

  return {
    r: typeof color.r === "number" ? color.r : fallback.r,
    g: typeof color.g === "number" ? color.g : fallback.g,
    b: typeof color.b === "number" ? color.b : fallback.b,
  };
}

function normalizeLightingEnvironment(environment, fallback = DEFAULT_LIGHTING_ENVIRONMENT) {
  const source =
    environment && typeof environment === "object" ? environment : {};

  return {
    skyAmbient: normalizeColorOverride(source.skyAmbient, fallback.skyAmbient),
    horizonFill: normalizeColorOverride(source.horizonFill, fallback.horizonFill),
    moonKey: normalizeColorOverride(source.moonKey, fallback.moonKey),
    warmBounce: normalizeColorOverride(source.warmBounce, fallback.warmBounce),
    specularColor: normalizeColorOverride(source.specularColor, fallback.specularColor),
    ambientStrength: readVisualNumber(source.ambientStrength, fallback.ambientStrength),
    keyStrength: readVisualNumber(source.keyStrength, fallback.keyStrength),
    fillStrength: readVisualNumber(source.fillStrength, fallback.fillStrength),
    bounceStrength: readVisualNumber(source.bounceStrength, fallback.bounceStrength),
    specularStrength: readVisualNumber(source.specularStrength, fallback.specularStrength),
    waterSpecularStrength: readVisualNumber(
      source.waterSpecularStrength,
      fallback.waterSpecularStrength
    ),
    exposure: readVisualNumber(source.exposure, fallback.exposure),
    contrast: readVisualNumber(source.contrast, fallback.contrast),
    saturation: readVisualNumber(source.saturation, fallback.saturation),
  };
}

function readVisualNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPositiveNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function normalizeTimeOfDayMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "morning" || normalized === "sunrise") {
    return TIME_OF_DAY_DAWN;
  }
  if (normalized === "evening" || normalized === "sunset" || normalized === "golden") {
    return TIME_OF_DAY_DUSK;
  }
  if (
    normalized === TIME_OF_DAY_DAY ||
    normalized === TIME_OF_DAY_NIGHT ||
    normalized === TIME_OF_DAY_DAWN ||
    normalized === TIME_OF_DAY_DUSK ||
    normalized === TIME_OF_DAY_CYCLE
  ) {
    return normalized;
  }

  return undefined;
}

function resolveTimeOfDayQuery(params) {
  return normalizeTimeOfDayMode(
    params.get("timeOfDay") ??
      params.get("tod") ??
      params.get("environment") ??
      params.get("sceneTime")
  );
}

function resolveTimeOfDayMode(options) {
  const optionMode = normalizeTimeOfDayMode(options.timeOfDay);
  if (optionMode) {
    return optionMode;
  }

  try {
    return resolveTimeOfDayQuery(new URLSearchParams(window.location.search)) ?? TIME_OF_DAY_NIGHT;
  } catch {
    return TIME_OF_DAY_NIGHT;
  }
}

function mixTimeOfDayProfile(a, b, t) {
  const result = {};
  for (const key of [
    "skyTop",
    "skyMid",
    "skyBottom",
    "duskGlow",
    "horizonWarmth",
    "seaTop",
    "seaMid",
    "seaBottom",
    "celestialCore",
    "celestialHalo",
    "celestialReflection",
    "ambientMist",
    "waterNear",
    "waterFar",
    "harborWall",
    "harborDeck",
    "harborTower",
    "flagColor",
  ]) {
    result[key] = mixColor(a[key], b[key], t);
  }
  result.starVisibility = mix(a.starVisibility, b.starVisibility, t);
  result.celestialKind = t >= 0.5 ? b.celestialKind : a.celestialKind;
  result.lanternReflectionStrength = mix(
    a.lanternReflectionStrength,
    b.lanternReflectionStrength,
    t
  );
  result.lightingEnvironment = mixLightingEnvironment(
    a.lightingEnvironment,
    b.lightingEnvironment,
    t
  );
  return result;
}

function resolveTimeOfDayProfile(state) {
  const mode = normalizeTimeOfDayMode(state.timeOfDayMode) ?? TIME_OF_DAY_NIGHT;
  if (mode !== TIME_OF_DAY_CYCLE) {
    return {
      mode,
      phase: 0,
      profile: TIME_OF_DAY_VISUAL_PROFILES[mode] ?? TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_NIGHT],
    };
  }

  const cycle = ((state.time * 0.018) % 1 + 1) % 1;
  if (cycle < 0.28) {
    return {
      mode,
      phase: cycle,
      profile: TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_DAY],
    };
  }
  if (cycle < 0.42) {
    const t = smoothstep(0.28, 0.42, cycle);
    return {
      mode,
      phase: cycle,
      profile: mixTimeOfDayProfile(
        TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_DAY],
        TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_DUSK],
        t
      ),
    };
  }
  if (cycle < 0.66) {
    const t = smoothstep(0.42, 0.66, cycle);
    return {
      mode,
      phase: cycle,
      profile: mixTimeOfDayProfile(
        TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_DUSK],
        TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_NIGHT],
        t
      ),
    };
  }
  if (cycle < 0.82) {
    return {
      mode,
      phase: cycle,
      profile: TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_NIGHT],
    };
  }

  const t = smoothstep(0.82, 1, cycle);
  return {
    mode,
    phase: cycle,
    profile: mixTimeOfDayProfile(
      TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_NIGHT],
      TIME_OF_DAY_VISUAL_PROFILES[TIME_OF_DAY_DAWN],
      t
    ),
  };
}

function createTimeOfDayVisualOverrides(state) {
  const resolved = resolveTimeOfDayProfile(state);
  const { profile } = resolved;
  return {
    timeOfDayMode: resolved.mode,
    timeOfDayPhase: resolved.phase,
    skyTop: colorToHex(profile.skyTop),
    skyMid: colorToHex(profile.skyMid),
    skyBottom: colorToHex(profile.skyBottom),
    seaTop: colorToHex(profile.seaTop),
    seaMid: colorToHex(profile.seaMid),
    seaBottom: colorToHex(profile.seaBottom),
    duskGlow: colorToRgba(profile.duskGlow, profile.duskGlow.a ?? 1),
    horizonWarmth: colorToRgba(profile.horizonWarmth, profile.horizonWarmth.a ?? 1),
    moonCore: colorToRgba(profile.celestialCore, profile.celestialCore.a ?? 1),
    moonHalo: colorToRgba(profile.celestialHalo, profile.celestialHalo.a ?? 1),
    moonReflection: colorToRgba(
      profile.celestialReflection,
      profile.celestialReflection.a ?? 1
    ),
    starVisibility: profile.starVisibility,
    celestialKind: profile.celestialKind,
    ambientMist: colorToRgba(profile.ambientMist, profile.ambientMist.a ?? 1),
    waterNear: profile.waterNear,
    waterFar: profile.waterFar,
    harborWall: profile.harborWall,
    harborDeck: profile.harborDeck,
    harborTower: profile.harborTower,
    flagColor: profile.flagColor,
    lanternReflectionStrength: profile.lanternReflectionStrength,
    lightingEnvironment: profile.lightingEnvironment,
  };
}

function mergeVisualOverrides(...sources) {
  return Object.assign({}, ...sources.filter((source) => source && typeof source === "object"));
}

function isTruthyCaptureValue(value) {
  return value === "1" || value === "true" || value === "scene" || value === "video";
}

function normalizePerformanceMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === PERFORMANCE_MODE_MAX || normalized === "maximum" || normalized === "ultra" || normalized === "fixed") {
    return PERFORMANCE_MODE_MAX;
  }
  if (normalized === PERFORMANCE_MODE_ADAPTIVE || normalized === "auto" || normalized === "balanced") {
    return PERFORMANCE_MODE_ADAPTIVE;
  }
  return undefined;
}

function isTruthyQueryValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isFalsyQueryValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off";
}

function resolvePerformanceModeOption(options) {
  const mode = normalizePerformanceMode(options.performanceMode);
  if (mode) {
    return mode;
  }
  if (options.maxQuality === true || options.adaptivePerformance === false) {
    return PERFORMANCE_MODE_MAX;
  }
  if (options.maxQuality === false || options.adaptivePerformance === true) {
    return PERFORMANCE_MODE_ADAPTIVE;
  }
  return undefined;
}

function resolvePerformanceModeQuery(params) {
  const mode = normalizePerformanceMode(
    params.get("quality") ??
      params.get("qualityMode") ??
      params.get("performanceMode") ??
      params.get("performance")
  );
  if (mode) {
    return mode;
  }

  const maxQuality = params.get("maxQuality");
  if (maxQuality !== null) {
    if (isTruthyQueryValue(maxQuality)) {
      return PERFORMANCE_MODE_MAX;
    }
    if (isFalsyQueryValue(maxQuality)) {
      return PERFORMANCE_MODE_ADAPTIVE;
    }
  }

  const adaptivePerformance = params.get("adaptivePerformance") ?? params.get("adaptive");
  if (adaptivePerformance !== null) {
    if (isFalsyQueryValue(adaptivePerformance)) {
      return PERFORMANCE_MODE_MAX;
    }
    if (isTruthyQueryValue(adaptivePerformance)) {
      return PERFORMANCE_MODE_ADAPTIVE;
    }
  }

  return undefined;
}

function normalizeCaptureResolution(value) {
  if (value && typeof value === "object") {
    const width = Math.round(readPositiveNumber(value.width, 0));
    const height = Math.round(readPositiveNumber(value.height, 0));
    if (width > 0 && height > 0) {
      return Object.freeze({ label: `${width}x${height}`, width, height });
    }
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "720" || normalized === "hd" || normalized === "1280x720") {
    return CAPTURE_RESOLUTIONS["720p"];
  }
  if (normalized === "1080" || normalized === "fullhd" || normalized === "1920x1080") {
    return CAPTURE_RESOLUTIONS["1080p"];
  }

  return CAPTURE_RESOLUTIONS[normalized] ?? null;
}

function resolveCaptureResolutionQuery(params) {
  return normalizeCaptureResolution(
    params.get("resolution") ??
      params.get("captureResolution") ??
      params.get("captureSize")
  );
}

function isFrameExportQueryEnabled(params) {
  return (
    isTruthyQueryValue(params.get("frameExport")) ||
    isTruthyQueryValue(params.get("exportFrames")) ||
    isTruthyQueryValue(params.get("videoCapture")) ||
    isTruthyQueryValue(params.get("video"))
  );
}

function resolveCaptureSettings(options) {
  const explicitCaptureMode =
    typeof options.captureMode === "boolean" ? options.captureMode : undefined;
  let captureMode = explicitCaptureMode ?? false;
  let performanceMode = resolvePerformanceModeOption(options);
  let renderScale = readPositiveNumber(options.renderScale, undefined);
  let captureResolution = normalizeCaptureResolution(options.captureResolution);
  let frameExport = options.frameExport === true || options.videoCapture === true;

  try {
    const params = new URLSearchParams(window.location.search);
    if (explicitCaptureMode === undefined) {
      captureMode =
        isTruthyCaptureValue(params.get("capture")) ||
        params.get("presentation") === "capture";
    }
    performanceMode = performanceMode ?? resolvePerformanceModeQuery(params);
    const queryRenderScale = readPositiveNumber(Number(params.get("renderScale")), undefined);
    renderScale = queryRenderScale ?? renderScale;
    captureResolution = resolveCaptureResolutionQuery(params) ?? captureResolution;
    frameExport = isFrameExportQueryEnabled(params) || frameExport;
  } catch {
    // Query-string capture controls are optional and only available in browsers.
  }

  performanceMode = performanceMode ?? (captureMode ? PERFORMANCE_MODE_MAX : PERFORMANCE_MODE_ADAPTIVE);
  if (captureMode && performanceMode === PERFORMANCE_MODE_MAX) {
    renderScale = Math.max(
      readPositiveNumber(renderScale, 0),
      MAX_QUALITY_CAPTURE_RENDER_SCALE
    );
  }

  return {
    captureMode,
    performanceMode,
    renderScale,
    captureResolution,
    frameExport,
  };
}

function applyCaptureResolution(root, captureResolution) {
  if (!captureResolution) {
    return () => undefined;
  }

  const previousAttribute = root.getAttribute?.("data-plasius-capture-resolution") ?? null;
  const previousWidth = root.style?.getPropertyValue?.("--plasius-capture-width") ?? "";
  const previousHeight = root.style?.getPropertyValue?.("--plasius-capture-height") ?? "";
  const previousAspect = root.style?.getPropertyValue?.("--plasius-capture-aspect") ?? "";

  root.setAttribute?.("data-plasius-capture-resolution", captureResolution.label);
  root.style?.setProperty?.("--plasius-capture-width", `${captureResolution.width}px`);
  root.style?.setProperty?.("--plasius-capture-height", `${captureResolution.height}px`);
  root.style?.setProperty?.(
    "--plasius-capture-aspect",
    String(captureResolution.width / captureResolution.height)
  );

  return () => {
    if (previousAttribute === null) {
      root.removeAttribute?.("data-plasius-capture-resolution");
    } else {
      root.setAttribute?.("data-plasius-capture-resolution", previousAttribute);
    }
    if (previousWidth) {
      root.style?.setProperty?.("--plasius-capture-width", previousWidth);
    } else {
      root.style?.removeProperty?.("--plasius-capture-width");
    }
    if (previousHeight) {
      root.style?.setProperty?.("--plasius-capture-height", previousHeight);
    } else {
      root.style?.removeProperty?.("--plasius-capture-height");
    }
    if (previousAspect) {
      root.style?.setProperty?.("--plasius-capture-aspect", previousAspect);
    } else {
      root.style?.removeProperty?.("--plasius-capture-aspect");
    }
  };
}

function getCanvasDisplaySize(canvas) {
  const rect =
    typeof canvas.getBoundingClientRect === "function"
      ? canvas.getBoundingClientRect()
      : null;
  const width = Math.round(
    readPositiveNumber(rect?.width, readPositiveNumber(canvas.clientWidth, canvas.width))
  );
  const height = Math.round(
    readPositiveNumber(rect?.height, readPositiveNumber(canvas.clientHeight, canvas.height))
  );

  return {
    width: Math.max(1, width || DEFAULT_CANVAS_WIDTH),
    height: Math.max(1, height || DEFAULT_CANVAS_HEIGHT),
  };
}

function resizeCanvasToDisplaySize(canvas, state) {
  const { width, height } = getCanvasDisplaySize(canvas);
  const deviceScale = readPositiveNumber(globalThis.devicePixelRatio, 1);
  const requestedScale = readPositiveNumber(state.renderScale, deviceScale);
  const maxScale =
    state.performanceMode === PERFORMANCE_MODE_MAX
      ? MAX_QUALITY_RENDER_SCALE_CAP
      : state.captureMode
        ? 2
        : 1.5;
  let scale = clamp(requestedScale, 1, maxScale);
  const pixelBudget =
    state.performanceMode === PERFORMANCE_MODE_MAX
      ? MAX_QUALITY_CANVAS_PIXEL_BUDGET
      : state.captureMode
        ? CAPTURE_CANVAS_PIXEL_BUDGET
        : DEFAULT_CANVAS_WIDTH * DEFAULT_CANVAS_HEIGHT * 1.5;
  const projectedPixels = width * height * scale * scale;

  if (Number.isFinite(pixelBudget) && projectedPixels > pixelBudget) {
    scale = Math.sqrt(pixelBudget / Math.max(1, width * height));
  }

  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  state.renderScale = scale;
}

function resolveClothPresentation(state, meshDetail) {
  const clothPlan = createClothRepresentationPlan({
    garmentId: "shore-flag",
    kind: state.focus === "cloth" ? "flag" : clothGarmentKinds[0],
    profile: state.focus === "cloth" ? "cinematic" : clothProfileNames[0],
    supportsRayTracing: true,
    nearFieldMaxMeters: 18,
    midFieldMaxMeters: 55,
    farFieldMaxMeters: 180,
  });
  const preset = CAMERA_PRESETS[state.focus] ?? CAMERA_PRESETS.integrated;
  const fallbackEye = state.camera.eye
    ? state.camera.eye
    : addVec3(
        state.camera.target,
        vec3(
          Math.sin(state.camera.yaw ?? preset.yaw) * Math.cos(state.camera.pitch ?? preset.pitch) * (state.camera.distance ?? preset.distance),
          Math.sin(state.camera.pitch ?? preset.pitch) * (state.camera.distance ?? preset.distance),
          Math.cos(state.camera.yaw ?? preset.yaw) * Math.cos(state.camera.pitch ?? preset.pitch) * (state.camera.distance ?? preset.distance)
        )
      );
  const cameraDistance = lengthVec3(subVec3(state.camera.target, fallbackEye));
  const band = selectClothRepresentationBand(cameraDistance, clothPlan.thresholds);
  const representation =
    clothPlan.representations.find((entry) => entry.band === band) ?? clothPlan.representations[0];
  return {
    clothPlan,
    band,
    continuity: representation.continuity,
    representation,
  };
}

function getFlagRestPosition(rows, cols, row, column) {
  const u = cols <= 1 ? 0 : column / (cols - 1);
  const v = rows <= 1 ? 0 : row / (rows - 1);
  return vec3(
    FLAG_LAYOUT.origin.x + u * FLAG_LAYOUT.mastOffsetX,
    FLAG_LAYOUT.origin.y - FLAG_LAYOUT.height * v - u * u * 0.08,
    FLAG_LAYOUT.origin.z + FLAG_LAYOUT.width * u
  );
}

function buildClothConstraints(rows, cols, restPositions) {
  const constraints = [];
  const indexFor = (row, column) => row * cols + column;
  const pushConstraint = (a, b, stiffness) => {
    constraints.push(
      Object.freeze({
        a,
        b,
        restLength: lengthVec3(subVec3(restPositions[a], restPositions[b])),
        stiffness,
      })
    );
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const index = indexFor(row, column);
      if (column + 1 < cols) {
        pushConstraint(index, indexFor(row, column + 1), 0.92);
      }
      if (row + 1 < rows) {
        pushConstraint(index, indexFor(row + 1, column), 0.9);
      }
      if (column + 1 < cols && row + 1 < rows) {
        pushConstraint(index, indexFor(row + 1, column + 1), 0.66);
      }
      if (column - 1 >= 0 && row + 1 < rows) {
        pushConstraint(index, indexFor(row + 1, column - 1), 0.66);
      }
      if (column + 2 < cols) {
        pushConstraint(index, indexFor(row, column + 2), 0.22);
      }
      if (row + 2 < rows) {
        pushConstraint(index, indexFor(row + 2, column), 0.18);
      }
    }
  }

  return Object.freeze(constraints);
}

function createShowcaseClothSimulationState(options = {}) {
  const rows = Math.max(4, options.rows ?? 11);
  const cols = Math.max(4, options.cols ?? 16);
  const continuity = options.continuity ?? {
    broadMotionFloor: 0.72,
    wrinkleFloor: 0.56,
  };
  const representation = options.representation ?? {
    mesh: {
      solverIterations: 6,
      wrinkleLayers: 2,
    },
  };
  const restPositions = [];
  const positions = [];
  const previousPositions = [];
  const uvs = [];
  const phaseOffsets = [];
  const pinned = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const index = row * cols + column;
      const u = cols <= 1 ? 0 : column / (cols - 1);
      const v = rows <= 1 ? 0 : row / (rows - 1);
      const rest = getFlagRestPosition(rows, cols, row, column);
      const preload = vec3(
        u * 0.04,
        Math.sin(v * Math.PI) * 0.02 * continuity.wrinkleFloor,
        -u * 0.12
      );
      const pinnedPoint = column === 0;
      restPositions.push(rest);
      positions.push(pinnedPoint ? vec3(rest.x, rest.y, rest.z) : addVec3(rest, preload));
      previousPositions.push(
        pinnedPoint
          ? vec3(rest.x, rest.y, rest.z)
          : addVec3(rest, scaleVec3(preload, 0.35))
      );
      uvs.push(Object.freeze({ u, v }));
      phaseOffsets.push(pseudoRandom(index + 17) * Math.PI * 2);
      pinned.push(pinnedPoint);
    }
  }

  return {
    rows,
    cols,
    continuity,
    representation,
    restPositions,
    positions,
    previousPositions,
    constraints: buildClothConstraints(rows, cols, restPositions),
    indices: Object.freeze(
      Array.from({ length: (rows - 1) * (cols - 1) * 6 }, (_, listIndex) => listIndex)
        .map((_, listIndex, source) => {
          if (listIndex >= source.length) {
            return 0;
          }
          const quadIndex = Math.floor(listIndex / 6);
          const quadColumn = quadIndex % (cols - 1);
          const quadRow = Math.floor(quadIndex / (cols - 1));
          const base = quadRow * cols + quadColumn;
          return [base, base + 1, base + cols + 1, base, base + cols + 1, base + cols][listIndex % 6];
        })
    ),
    uvs,
    phaseOffsets,
    pinned,
  };
}

function resetPinnedClothPoints(clothState) {
  for (let index = 0; index < clothState.positions.length; index += 1) {
    if (!clothState.pinned[index]) {
      continue;
    }
    const anchor = clothState.restPositions[index];
    clothState.positions[index] = vec3(anchor.x, anchor.y, anchor.z);
    clothState.previousPositions[index] = vec3(anchor.x, anchor.y, anchor.z);
  }
}

function satisfyClothConstraint(clothState, constraint) {
  const a = clothState.positions[constraint.a];
  const b = clothState.positions[constraint.b];
  const delta = subVec3(b, a);
  const distance = lengthVec3(delta);
  if (distance <= 0.0001) {
    return;
  }

  const correctionScale =
    ((distance - constraint.restLength) / distance) * 0.5 * constraint.stiffness;
  const correction = scaleVec3(delta, correctionScale);
  if (!clothState.pinned[constraint.a]) {
    clothState.positions[constraint.a] = addVec3(a, correction);
  }
  if (!clothState.pinned[constraint.b]) {
    clothState.positions[constraint.b] = subVec3(b, correction);
  }
}

function advanceShowcaseClothSimulationState(clothState, options = {}) {
  const dt = clamp(options.dt ?? 1 / 60, 1 / 240, 1 / 18);
  const time = readVisualNumber(options.time, 0);
  const flagMotion = readVisualNumber(options.flagMotion, 0.92);
  const waveInfluence = readVisualNumber(options.waveInfluence, 0);
  const wrinkleLayers = Math.max(1, clothState.representation.mesh?.wrinkleLayers ?? 2);
  const solverIterations = clamp(
    Math.round(clothState.representation.mesh?.solverIterations ?? 6),
    2,
    10
  );

  for (let index = 0; index < clothState.positions.length; index += 1) {
    if (clothState.pinned[index]) {
      continue;
    }

    const current = clothState.positions[index];
    const previous = clothState.previousPositions[index];
    const { u, v } = clothState.uvs[index];
    const phase = clothState.phaseOffsets[index];
    const broadMotion = clothState.continuity.broadMotionFloor;
    const wrinkleMotion = clothState.continuity.wrinkleFloor;
    const gustPhase = time * 2.1 + phase + u * 4.4 + v * 2.3;
    const wrinklePhase = time * 5.3 + phase * 0.72 + u * 9.6 + v * 7.1;
    const windDirection = normalizeVec3(
      vec3(
        0.18 + Math.sin(gustPhase) * (0.12 + broadMotion * 0.09),
        Math.cos(time * 1.4 + phase + v * 4.8) * 0.06 * wrinkleMotion,
        1 + Math.sin(gustPhase * 0.74) * 0.18
      )
    );
    const windStrength =
      (1.6 + broadMotion * 1.25 + wrinkleLayers * 0.12) *
      flagMotion *
      (0.44 + u * 1.14);
    const wrinkleForce = vec3(
      Math.sin(wrinklePhase) * 0.22 * wrinkleMotion * flagMotion,
      Math.cos(wrinklePhase * 0.7) * 0.08 * wrinkleMotion,
      Math.cos(wrinklePhase) * 0.14 * broadMotion * flagMotion
    );
    const acceleration = addVec3(
      vec3(0, -0.48 - u * 0.08, 0),
      addVec3(
        scaleVec3(windDirection, windStrength),
        addVec3(
          wrinkleForce,
          vec3(waveInfluence * (0.04 + u * 0.08), 0, waveInfluence * 0.16)
        )
      )
    );
    const inertia = scaleVec3(subVec3(current, previous), 0.987);
    const next = addVec3(addVec3(current, inertia), scaleVec3(acceleration, dt * dt));
    clothState.previousPositions[index] = vec3(current.x, current.y, current.z);
    clothState.positions[index] = next;
  }

  resetPinnedClothPoints(clothState);
  for (let iteration = 0; iteration < solverIterations; iteration += 1) {
    for (const constraint of clothState.constraints) {
      satisfyClothConstraint(clothState, constraint);
    }
    resetPinnedClothPoints(clothState);
  }

  return clothState;
}

function ensureShowcaseClothState(state, meshDetail, clothPresentation) {
  if (
    !state.clothState ||
    state.clothState.rows !== meshDetail.rows ||
    state.clothState.cols !== meshDetail.cols
  ) {
    state.clothState = createShowcaseClothSimulationState({
      rows: meshDetail.rows,
      cols: meshDetail.cols,
      continuity: clothPresentation.continuity,
      representation: clothPresentation.representation,
    });
  } else {
    state.clothState.continuity = clothPresentation.continuity;
    state.clothState.representation = clothPresentation.representation;
  }

  return state.clothState;
}

function resolveVisualConfig(nearLighting, lightingSnapshot, customVisuals = {}) {
  const premiumShadows = nearLighting.primaryShadowSource === "ray-traced-primary";
  const defaults = {
    skyTop: premiumShadows ? "#050b13" : "#07101a",
    skyMid: premiumShadows ? "#111d2c" : "#152435",
    skyBottom: premiumShadows ? "#293b51" : "#304762",
    duskGlow: premiumShadows ? "rgba(198, 172, 137, 0.18)" : "rgba(186, 159, 128, 0.15)",
    horizonWarmth: premiumShadows ? "rgba(232, 189, 138, 0.12)" : "rgba(219, 178, 132, 0.1)",
    seaTop: premiumShadows ? "#10283c" : "#153149",
    seaMid: premiumShadows ? "#0b1d2d" : "#0d2234",
    seaBottom: "#061019",
    moonCore: "rgba(249, 247, 236, 0.94)",
    moonHalo: "rgba(178, 197, 218, 0.18)",
    moonReflection: "rgba(202, 213, 219, 0.16)",
    starColor: "rgba(234, 238, 244, 0.66)",
    starVisibility: 1,
    celestialKind: "moon",
    ambientMist: "rgba(42, 50, 58, 0.12)",
    reflectionStrength: lightingSnapshot.currentLevel.config.reflectionStrength,
    shadowAccent: lightingSnapshot.currentLevel.config.shadowStrength,
    lightingEnvironment: {
      ...DEFAULT_LIGHTING_ENVIRONMENT,
      ambientStrength: premiumShadows ? 0.48 : 0.42,
      keyStrength: premiumShadows ? 0.82 : 0.72,
      fillStrength: premiumShadows ? 0.32 : 0.26,
      waterSpecularStrength: premiumShadows ? 0.58 : 0.36,
      specularStrength: premiumShadows ? 0.22 : 0.16,
      exposure: premiumShadows ? 1.13 : 1.04,
    },
    waveAmplitude: 0.94,
    waveDirection: { x: 0.88, z: 0.28 },
    wavePhaseSpeed: 0.88,
    wakeStrength: 0.31,
    wakeLength: 18,
    collisionRippleStrength: 0.42,
    waterNear: { r: 0.07, g: 0.19, b: 0.27 },
    waterFar: { r: 0.15, g: 0.28, b: 0.39 },
    harborWall: { r: 0.26, g: 0.24, b: 0.28 },
    harborDeck: { r: 0.33, g: 0.22, b: 0.16 },
    harborTower: { r: 0.23, g: 0.24, b: 0.29 },
    flagColor: { r: 0.66, g: 0.16, b: 0.13 },
    flagMotion: 0.92,
    lanternCore: { r: 0.98, g: 0.8, b: 0.48 },
    lanternGlow: { r: 1, g: 0.56, b: 0.2 },
    lanternReflectionStrength: 0.42,
    torchCore: { r: 0.99, g: 0.72, b: 0.36 },
    torchGlow: { r: 0.98, g: 0.38, b: 0.15 },
    collisionFlash: "rgba(255, 212, 168, 0.16)",
  };

  return {
    skyTop: typeof customVisuals.skyTop === "string" ? customVisuals.skyTop : defaults.skyTop,
    skyMid: typeof customVisuals.skyMid === "string" ? customVisuals.skyMid : defaults.skyMid,
    skyBottom:
      typeof customVisuals.skyBottom === "string" ? customVisuals.skyBottom : defaults.skyBottom,
    seaTop: typeof customVisuals.seaTop === "string" ? customVisuals.seaTop : defaults.seaTop,
    seaMid: typeof customVisuals.seaMid === "string" ? customVisuals.seaMid : defaults.seaMid,
    seaBottom:
      typeof customVisuals.seaBottom === "string" ? customVisuals.seaBottom : defaults.seaBottom,
    duskGlow:
      typeof customVisuals.duskGlow === "string" ? customVisuals.duskGlow : defaults.duskGlow,
    horizonWarmth:
      typeof customVisuals.horizonWarmth === "string"
        ? customVisuals.horizonWarmth
        : defaults.horizonWarmth,
    moonCore:
      typeof customVisuals.sunCore === "string"
        ? customVisuals.sunCore
        : typeof customVisuals.moonCore === "string"
          ? customVisuals.moonCore
          : defaults.moonCore,
    moonHalo:
      typeof customVisuals.moonHalo === "string" ? customVisuals.moonHalo : defaults.moonHalo,
    moonReflection:
      typeof customVisuals.moonReflection === "string"
        ? customVisuals.moonReflection
        : defaults.moonReflection,
    starColor:
      typeof customVisuals.starColor === "string" ? customVisuals.starColor : defaults.starColor,
    starVisibility: readVisualNumber(customVisuals.starVisibility, defaults.starVisibility),
    celestialKind:
      customVisuals.celestialKind === "sun" || customVisuals.celestialKind === "moon"
        ? customVisuals.celestialKind
        : defaults.celestialKind,
    timeOfDayMode:
      typeof customVisuals.timeOfDayMode === "string"
        ? customVisuals.timeOfDayMode
        : TIME_OF_DAY_NIGHT,
    timeOfDayPhase: readVisualNumber(customVisuals.timeOfDayPhase, 0),
    ambientMist:
      typeof customVisuals.ambientMist === "string"
        ? customVisuals.ambientMist
        : defaults.ambientMist,
    reflectionStrength: readVisualNumber(
      customVisuals.reflectionStrength,
      defaults.reflectionStrength
    ),
    shadowAccent: readVisualNumber(customVisuals.shadowAccent, defaults.shadowAccent),
    lightingEnvironment: normalizeLightingEnvironment(
      customVisuals.lightingEnvironment,
      defaults.lightingEnvironment
    ),
    waveAmplitude: readVisualNumber(customVisuals.waveAmplitude, defaults.waveAmplitude),
    waveDirection:
      customVisuals.waveDirection &&
      typeof customVisuals.waveDirection.x === "number" &&
      typeof customVisuals.waveDirection.z === "number"
        ? { x: customVisuals.waveDirection.x, z: customVisuals.waveDirection.z }
        : defaults.waveDirection,
    wavePhaseSpeed: readVisualNumber(customVisuals.wavePhaseSpeed, defaults.wavePhaseSpeed),
    wakeStrength: readVisualNumber(customVisuals.wakeStrength, defaults.wakeStrength),
    wakeLength: readVisualNumber(customVisuals.wakeLength, defaults.wakeLength),
    collisionRippleStrength: readVisualNumber(
      customVisuals.collisionRippleStrength,
      defaults.collisionRippleStrength
    ),
    waterNear: normalizeColorOverride(customVisuals.waterNear, defaults.waterNear),
    waterFar: normalizeColorOverride(customVisuals.waterFar, defaults.waterFar),
    harborWall: normalizeColorOverride(customVisuals.harborWall, defaults.harborWall),
    harborDeck: normalizeColorOverride(customVisuals.harborDeck, defaults.harborDeck),
    harborTower: normalizeColorOverride(customVisuals.harborTower, defaults.harborTower),
    flagColor: normalizeColorOverride(customVisuals.flagColor, defaults.flagColor),
    flagMotion: readVisualNumber(customVisuals.flagMotion, defaults.flagMotion),
    lanternCore: normalizeColorOverride(customVisuals.lanternCore, defaults.lanternCore),
    lanternGlow: normalizeColorOverride(customVisuals.lanternGlow, defaults.lanternGlow),
    lanternReflectionStrength: readVisualNumber(
      customVisuals.lanternReflectionStrength,
      defaults.lanternReflectionStrength
    ),
    torchCore: normalizeColorOverride(customVisuals.torchCore, defaults.torchCore),
    torchGlow: normalizeColorOverride(customVisuals.torchGlow, defaults.torchGlow),
    collisionFlash:
      typeof customVisuals.collisionFlash === "string"
        ? customVisuals.collisionFlash
        : defaults.collisionFlash,
  };
}

function buildClothSurface(model, state, meshDetail, visuals) {
  const clothPresentation = resolveClothPresentation(state, meshDetail);
  const clothState = ensureShowcaseClothState(state, meshDetail, clothPresentation);

  return {
    clothPlan: clothPresentation.clothPlan,
    band: clothPresentation.band,
    representation: clothPresentation.representation,
    continuity: clothPresentation.continuity,
    color: visuals.flagColor,
    positions: clothState.positions.map((point) => vec3(point.x, point.y, point.z)),
    indices: clothState.indices,
    grid: { rows: clothState.rows, cols: clothState.cols },
  };
}

function shouldRenderClothValidationSurface(state) {
  return state.focus === "cloth" || state.focus === "integrated";
}

function resolveWaveDirection(state) {
  const direction = state.demoVisuals?.waveDirection;
  if (
    direction &&
    typeof direction === "object" &&
    typeof direction.x === "number" &&
    typeof direction.z === "number"
  ) {
    return normalizeVec3(vec3(direction.x, 0, direction.z));
  }

  return normalizeVec3(vec3(0.86, 0, 0.34));
}

function createFluidWaterSettingsFromState(state) {
  const waveDirection = normalizeVec3(
    vec3(
      typeof state.demoVisuals?.waveDirection?.x === "number"
        ? state.demoVisuals.waveDirection.x
        : 0.86,
      0,
      typeof state.demoVisuals?.waveDirection?.z === "number"
        ? state.demoVisuals.waveDirection.z
        : 0.34
    )
  );
  return {
    waveAmplitude: readVisualNumber(state.demoVisuals?.waveAmplitude, 1),
    waveDirection,
    wavePhaseSpeed: readVisualNumber(state.demoVisuals?.wavePhaseSpeed, 1),
    wakeStrength: readVisualNumber(state.demoVisuals?.wakeStrength, 0.31),
    wakeLength: readVisualNumber(state.demoVisuals?.wakeLength, 18),
    collisionRippleStrength: readVisualNumber(
      state.demoVisuals?.collisionRippleStrength,
      0.42
    ),
  };
}

function sampleFluidWave(settings, x, z, time) {
  const phase = x * 0.16 + z * 0.21 + time * settings.wavePhaseSpeed;
  const directional = Math.sin(
    phase + (settings.waveDirection?.x ?? 0.2) * 4 + (settings.waveDirection?.z ?? 0.1) * 6
  );
  const baseline = Math.sin(phase * 0.9) * 0.25;
  const secondary = Math.cos(phase * 0.45) * 0.12;
  return (directional * 0.62 + baseline + secondary * 0.4) * settings.waveAmplitude * 0.24;
}

function sampleVesselWake(settings, vessel, x, z, time) {
  if (!vessel?.position || !vessel?.velocity) {
    return 0;
  }

  const speed = Math.hypot(vessel.velocity.x ?? 0, vessel.velocity.z ?? 0);
  if (speed <= 0.05) {
    return 0;
  }

  const dx = x - vessel.position.x;
  const dz = z - vessel.position.z;
  const distance = Math.hypot(dx, dz);
  const decay = Math.exp(-Math.max(distance, 0.0001) / Math.max(settings.wakeLength, 1));
  const phase = time * speed * 0.6 + (vessel.wanderPhase ?? 0);
  const wake = Math.sin(distance * 0.24 - phase) * 0.5 + Math.cos(phase * 0.4);
  return wake * decay * speed * settings.wakeStrength * 0.18;
}

function sampleImpulseContribution(impulse, x, z, time) {
  if (!impulse) {
    return { wake: 0, impact: 0 };
  }

  const dx = x - impulse.x;
  const dz = z - impulse.z;
  const distance = Math.hypot(dx, dz);
  const radius = Math.max(Number(impulse.radius) || 1, 0.2);
  const impulseLife = Number(impulse.life);
  const life = Math.max(Number.isFinite(impulseLife) ? impulseLife : 1, 0.001);
  const normalizedLife = Math.min(Math.max(life, 0), 1);
  const impulseStrength = Number(impulse.strength);
  const strength = Number.isFinite(impulseStrength) ? impulseStrength : 0.6;
  const decay = Math.exp(-Math.max(distance, 0.0001) / radius);
  const ripple = Math.sin(distance * 2.4 - time * 1.45 + normalizedLife * 2.4) * 0.5 + 0.5;
  const height = ripple * (strength * 0.42) * decay * normalizedLife;
  return { wake: height * 0.24, impact: height * 0.68 };
}

function sampleSharedFluidWater(state, x, z, time) {
  const settings = createFluidWaterSettingsFromState(state);
  let wakeHeight = 0;
  let impulseHeight = 0;

  wakeHeight += sampleFluidWave(settings, x, z, time);
  for (const vessel of state.ships ?? []) {
    wakeHeight += sampleVesselWake(settings, vessel, x, z, time);
  }

  for (const impulse of state.waveImpulses ?? []) {
    const contribution = sampleImpulseContribution(impulse, x, z, time);
    wakeHeight += contribution.wake;
    impulseHeight += contribution.impact;
  }

  const collision = sampleVesselWake(
    { wakeStrength: settings.collisionRippleStrength, wakeLength: Math.max(settings.wakeLength, 1) },
    state.ships?.[0],
    x,
    z,
    time
  );

  return {
    height:
      wakeHeight + collision * 0.45 + resolveWaterBaseHeight(z) * 0.001 + 0.018,
    wakeHeight: wakeHeight + collision * 0.33,
    impulseHeight,
  };
}

function isPointInsidePolygon(point, polygon) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const previousPoint = polygon[previous];
    const crossesZ = (current.z > point.z) !== (previousPoint.z > point.z);
    const denominator = previousPoint.z - current.z;
    const edgeX =
      ((previousPoint.x - current.x) * (point.z - current.z)) /
        (Math.abs(denominator) < 0.0001 ? 0.0001 : denominator) +
      current.x;

    if (crossesZ && point.x < edgeX) {
      inside = !inside;
    }
  }

  return inside;
}

function isInExclusions(point, exclusions) {
  return exclusions.some((exclusion) =>
    isPointInsidePolygon(point, exclusion.points ?? exclusion)
  );
}

function buildFluidWaterSurfaceZoneLayout({
  settings,
  time,
  vessels,
  impulses,
  continuity,
  exclusions,
  zones,
}) {
  const zoneLayouts = (zones ?? []).map((zone) => {
    const rows = Math.max(2, zone.rows ?? 3);
    const columns = Math.max(2, zone.columns ?? 5);
    const startWidth = zone.startWidth ?? zone.startWidthMeters ?? zone.endWidth ?? 0;
    const endWidth = zone.endWidth ?? zone.endWidthMeters ?? zone.startWidth ?? 0;
    const minZ = zone.minZ;
    const maxZ = zone.maxZ;
    const stepZ = (maxZ - minZ) / rows;

    const positions = [];
    const vertices = [];
    const normals = [];

    for (let row = 0; row <= rows; row += 1) {
      const z = minZ + row * stepZ;
      for (let column = 0; column <= columns; column += 1) {
        const rowT = Math.max(0, Math.min(1, stepZ === 0 ? 0 : (z - minZ) / (maxZ - minZ)));
        const width = mix(startWidth, endWidth, rowT);
        const x = -width + (column * (width * 2)) / columns;
        const sample = sampleSharedFluidWater(
          { demoVisuals: {}, ships: vessels, waveImpulses: impulses },
          x,
          z,
          time
        );
        const position = { x, y: readVisualNumber(sample.height, 0), z };
        positions.push(position);
        vertices.push({ position });
        normals.push({ x: 0, y: 1, z: 0 });
      }
    }

    const indices = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const top = row * (columns + 1) + column;
        const topRight = top + 1;
        const bottom = top + columns + 1;
        const bottomRight = bottom + 1;
        const triOne = [top, bottom, bottomRight];
        const triTwo = [top, bottomRight, topRight];
        const pointOne = [
          positions[triOne[0]],
          positions[triOne[1]],
          positions[triOne[2]],
        ];
        const pointTwo = [
          positions[triTwo[0]],
          positions[triTwo[1]],
          positions[triTwo[2]],
        ];
        const triOneCenter = {
          x: (pointOne[0].x + pointOne[1].x + pointOne[2].x) / 3,
          z: (pointOne[0].z + pointOne[1].z + pointOne[2].z) / 3,
          y: (pointOne[0].y + pointOne[1].y + pointOne[2].y) / 3,
        };
        const triTwoCenter = {
          x: (pointTwo[0].x + pointTwo[1].x + pointTwo[2].x) / 3,
          z: (pointTwo[0].z + pointTwo[1].z + pointTwo[2].z) / 3,
          y: (pointTwo[0].y + pointTwo[1].y + pointTwo[2].y) / 3,
        };

        if (!isInExclusions(triOneCenter, exclusions)) {
          indices.push(...triOne);
        }
        if (!isInExclusions(triTwoCenter, exclusions)) {
          indices.push(...triTwo);
        }
      }
    }

    return {
      ...zone,
      positions,
      normals: normals.map((normal) => vec3(normal.x, normal.y, normal.z)),
      vertices,
      indices,
    };
  });

  return { settings, continuity, time, vessels, impulses, exclusions, zones: zoneLayouts };
}

function sampleShipWake(state, x, z, time) {
  return sampleSharedFluidWater(state, x, z, time).wakeHeight;
}

function sampleWaveImpulses(state, x, z, time) {
  return sampleSharedFluidWater(state, x, z, time).impulseHeight;
}

function sampleWave(state, x, z, time) {
  return sampleSharedFluidWater(state, x, z, time).height;
}

function resolveFluidBandContinuity(continuity, band) {
  if (continuity?.bands && continuity.bands[band]) {
    return continuity.bands[band];
  }

  return continuity ?? { amplitudeFloor: 1, frequencyFloor: 1 };
}

function resolveWaterBaseHeight(z) {
  return mix(0.18, -0.12, smoothstep(WATER_FIELD_MIN_Z, WATER_FIELD_MAX_Z, z));
}

function resolveWaterVerticalScale(continuity, z) {
  const distanceDamping = mix(
    0.88,
    0.2,
    smoothstep(WATER_FIELD_MIN_Z, WATER_FIELD_MAX_Z, z)
  );
  return readVisualNumber(continuity?.amplitudeFloor, 1) * distanceDamping;
}

function resolveWaterSurfaceColor(visuals, z) {
  const nearFarMix = smoothstep(WATER_FIELD_MIN_Z, 92, z);
  const openWater = mixColor(visuals.waterNear, visuals.waterFar, nearFarMix);
  const horizonT = smoothstep(72, WATER_FIELD_MAX_Z, z);
  return mixColor(
    openWater,
    { r: 0.36, g: 0.43, b: 0.5, a: 1 },
    horizonT * 0.16
  );
}

function buildHarborWaterExclusions() {
  return HARBOR_WATER_EXCLUSION_POLYGONS.map((points, index) => ({
    id: `harbor-footprint-${index}`,
    points,
  }));
}

function buildWaterMotionEffects(state) {
  const settings = createFluidWaterSettingsFromState(state);
  const activeShips = (state.ships ?? []).filter(
    (ship) => Math.hypot(ship.velocity?.x ?? 0, ship.velocity?.z ?? 0) > 0.1
  );
  const movingShip = activeShips[0];
  const wakeTrails = [];
  const center = movingShip
    ? {
        kind: "center",
        points: Array.from({ length: 12 }, (_, index) => {
          const t = index / 11;
          const speed = Math.hypot(movingShip.velocity?.x ?? 0, movingShip.velocity?.z ?? 0);
          const forward = normalizeVec3(
            vec3(movingShip.velocity?.x ?? 0, 0, movingShip.velocity?.z ?? 0)
          );
          return {
            center: {
              x: movingShip.position.x - forward.x * t * speed * settings.wakeLength,
              y: 0.006 + Math.sin((state.time + t) * settings.wavePhaseSpeed) * 0.0015,
              z: movingShip.position.z - forward.z * t * speed * settings.wakeLength,
            },
            width: 0.95,
            turbulence: 0.6 + pseudoRandom(index * 17) * 0.4,
          };
        }),
        opacity: 0.8,
      }
    : null;

  if (center) {
    wakeTrails.push(center);
    wakeTrails.push({
      kind: "kelvin-arm",
      side: 1,
      points: center.points.map((point) => ({
        center: {
          x: point.center.x * 1.04,
          y: point.center.y,
          z: point.center.z * 0.96,
        },
        width: 0.72,
        turbulence: point.turbulence * 0.84,
      })),
      opacity: 0.35,
    });
    wakeTrails.push({
      kind: "kelvin-arm",
      side: -1,
      points: center.points.map((point, index) => ({
        center: {
          x: point.center.x * 0.96 + (index % 3) * 0.18 * 1,
          y: point.center.y,
          z: point.center.z * 1.04 - (index % 3) * 0.14 * 1,
        },
        width: 0.67,
        turbulence: point.turbulence * 0.8,
      })),
      opacity: 0.32,
    });
  }

  const rippleRings = (state.waveImpulses ?? []).map((impulse, index) => ({
    id: `ripple-${index}`,
    center: { x: impulse.x, y: 0.01, z: impulse.z },
    radius: (impulse.radius ?? 1) + 0.12 + state.time * 0.16,
    maxRadius: (impulse.radius ?? 1) + 10,
    alpha: 0.25,
    opacity: 0.25,
  }));

  const foamPatches = [];
  const shipCount = activeShips.length;
  const patchCount = Math.max(6, shipCount * 3 + (state.waveImpulses ?? []).length * 2);
  for (let index = 0; index < patchCount; index += 1) {
    const owner = activeShips[index % Math.max(1, activeShips.length)] ?? {
      position: { x: 0, z: 0 },
    };
    const axis = index * 0.87;
    const majorAxis = vec3(Math.cos(axis), 0, Math.sin(axis));
    const minorAxis = vec3(-majorAxis.z, 0, majorAxis.x);
    const radius = 0.35 + (index % 3) * 0.2;
    foamPatches.push({
      center: {
        x: owner.position.x + Math.sin(index) * 0.7,
        y: 0.007 + index * 0.0002,
        z: owner.position.z + Math.cos(index) * 0.7,
      },
      majorAxis,
      minorAxis,
      radiusX: radius,
      radiusZ: Math.max(0.2, radius * 0.55),
      opacity: clamp(0.24 + (index % 4) * 0.06, 0.1, 0.55),
      radius: radius,
      strength: 0.5 + (index % 5) * 0.06,
      kind: "breakup",
    });
  }

  const particleKinds = ["ripple-foam", "impact-spray", "wake-foam", "bow-spray"];
  const particlePosition = (index) => ({
    x: Math.sin(index * 1.1) * 8,
    y: 0.01 + Math.cos(index * 0.9) * 0.008,
    z: Math.cos(index * 0.85) * 8,
  });
  const particles = Array.from({ length: 28 }, (_, index) => ({
    id: `particle-${index}`,
    kind: particleKinds[index % particleKinds.length],
    center: particlePosition(index),
    position: particlePosition(index),
    velocity: vec3(
      Math.cos(index * 1.6) * 0.0025,
      Math.sin(index * 2.2) * 0.001,
      Math.sin(index * 0.95) * 0.0025
    ),
    majorAxis: vec3(Math.cos(index * 0.57), 0, Math.sin(index * 0.57)),
    radiusX: 0.05 + 0.003 * (index % 6),
    radiusZ: (0.05 + 0.003 * (index % 6)) * 0.66,
    stretch: 0.58 + ((index % 7) * 0.09),
    rotation: pseudoRandom(index * 13) * Math.PI * 2,
    opacity: clamp(0.17 + pseudoRandom(index * 19) * 0.41, 0.14, 0.58),
    age: index / 28,
    life: 1,
  }));

  return {
    wakeTrails,
    rippleRings,
    foamPatches,
    particles,
  };
}

function buildWaterBands(state, fluidDetail, visuals) {
  const fluidPlan = createFluidRepresentationPlan({
    fluidBodyId: "harbor",
    kind: state.focus === "fluid" ? "ocean" : fluidBodyKinds[0],
    profile: state.focus === "fluid" ? "cinematic" : fluidProfileNames[0],
    supportsRayTracing: true,
    nearFieldMaxMeters: 40,
    midFieldMaxMeters: 150,
    farFieldMaxMeters: 600,
  });

  const buildZoneSpec = (bandSpec) => {
    const bandContinuity = resolveFluidBandContinuity(fluidPlan.continuity, bandSpec.band);
    const bandResolution =
      bandSpec.band === "near"
          ? fluidDetail.nearResolution
          : bandSpec.band === "mid"
            ? fluidDetail.midResolution
            : bandSpec.band === "far"
              ? 6
              : 3;
    return {
      id: bandSpec.band,
      band: bandSpec.band,
      minZ: bandSpec.minZ,
      maxZ: bandSpec.maxZ,
      startWidth: bandSpec.startWidth,
      endWidth: bandSpec.endWidth,
      rows: Math.max(5, bandResolution + 3),
      columns: Math.max(5, bandResolution * 2 + 1),
      baseHeightStart: resolveWaterBaseHeight(bandSpec.minZ),
      baseHeightEnd: resolveWaterBaseHeight(bandSpec.maxZ),
      verticalScaleStart: resolveWaterVerticalScale(bandContinuity, bandSpec.minZ),
      verticalScaleEnd: resolveWaterVerticalScale(bandContinuity, bandSpec.maxZ),
    };
  };

  const zoneLayout = buildFluidWaterSurfaceZoneLayout({
    time: state.time,
    settings: createFluidWaterSettingsFromState(state),
    vessels: state.ships,
    impulses: state.waveImpulses,
    continuity: fluidPlan.continuity.bands,
    exclusions: buildHarborWaterExclusions(),
    zones: WATER_BAND_LAYOUT.map((bandSpec) => buildZoneSpec(bandSpec)),
  });

  const bandMeshes = zoneLayout.zones.map((zone) => {
    const representation =
      fluidPlan.representations.find((entry) => entry.band === zone.band) ??
      fluidPlan.representations[0];
    const bandContinuity = resolveFluidBandContinuity(fluidPlan.continuity, zone.band);
    return {
      band: zone.band,
      representation,
      continuity: bandContinuity,
      rows: zone.rows,
      cols: zone.columns,
      positions: zone.positions,
      normals: zone.normals,
      colors: zone.vertices.map((vertex) => resolveWaterSurfaceColor(visuals, vertex.position.z)),
      indices: zone.indices,
      color: resolveWaterSurfaceColor(
        visuals,
        (zone.minZ + zone.maxZ) * 0.5
      ),
    };
  });

  return { fluidPlan, zoneLayout, bandMeshes };
}

function createSceneState(options) {
  const performanceMode =
    options.performanceMode === PERFORMANCE_MODE_MAX
      ? PERFORMANCE_MODE_MAX
      : PERFORMANCE_MODE_ADAPTIVE;
  const { governor, fluidDetail, clothDetail, lightingDetail } = createPerformanceGovernor({
    performanceMode,
  });
  const physicsProfile = defaultPhysicsWorkerProfile;
  const physicsPlan = createPhysicsSimulationPlan(physicsProfile);
  const physicsManifest = getPhysicsWorkerManifest(physicsProfile);
  const debugSession = createGpuDebugSession({
    enabled: true,
    adapter: {
      label: "3D showcase",
      memoryCapacityHintBytes: 6 * 1024 * 1024 * 1024,
      coreCountHint: 12,
    },
  });
  debugSession.trackAllocation({
    id: "showcase.color",
    owner: "renderer",
    category: "texture",
    sizeBytes: 1280 * 720 * 4,
    label: "Main color buffer",
  });
  debugSession.trackAllocation({
    id: "showcase.shadow-impression",
    owner: "lighting",
    category: "texture",
    sizeBytes: 12 * 1024 * 1024,
    label: "Shadow impression atlas",
  });

  return {
    focus: options.focus,
    governor,
    fluidDetail,
    clothDetail,
    lightingDetail,
    debugSession,
    performanceMode,
    adaptivePerformance: performanceMode !== PERFORMANCE_MODE_MAX,
    showcaseRealisticModelsEnabled: options.realisticModelsEnabled !== false,
    hitDrivenPathtraceEnabled: options.hitDrivenPathtraceEnabled !== false,
    captureMode: options.captureMode === true,
    captureResolution: options.captureResolution ?? null,
    frameExport: options.frameExport === true,
    timeOfDayMode: normalizeTimeOfDayMode(options.timeOfDayMode) ?? TIME_OF_DAY_NIGHT,
    renderScale: readPositiveNumber(options.renderScale, undefined),
    packageState: undefined,
    demoDescription: null,
    demoVisuals: null,
    time: 0,
    lastTimeMs: null,
    paused: false,
    stress: false,
    camera: {
      ...CAMERA_PRESETS[options.focus],
      target: vec3(...CAMERA_PRESETS[options.focus].target),
    },
    ships: [
      {
        id: "northwind",
        modelKey: "brigantine",
        position: vec3(-5.2, 0, 7.2),
        velocity: vec3(2.35, 0, -1.08),
        rotationY: 0.58,
        angularVelocity: 0.09,
        tint: { r: 0.62, g: 0.39, b: 0.23 },
        massScale: 1.42,
        cruiseSpeed: 2.25,
        throttleResponse: 0.46,
        rudderResponse: 0.54,
        wanderPhase: 0.35,
        lanterns: CUTTER_LANTERNS,
        lanternStrength: 1.06,
        collisionRadiusScale: 1.04,
      },
      {
        id: "tidecaller",
        modelKey: "cutter",
        position: vec3(4.8, 0, 4.4),
        velocity: vec3(-2.15, 0, 1.74),
        rotationY: -2.48,
        angularVelocity: -0.2,
        tint: { r: 0.58, g: 0.24, b: 0.16 },
        massScale: 0.84,
        cruiseSpeed: 2.68,
        throttleResponse: 0.7,
        rudderResponse: 0.78,
        wanderPhase: 1.6,
        lanterns: SHIP_LANTERNS,
        lanternStrength: 1.18,
        collisionRadiusScale: 0.94,
      },
    ],
    sprays: [],
    waveImpulses: [],
    frame: 0,
    contactCount: 0,
    collisionCount: 0,
    collisionFlash: 0,
    clothState: null,
    physics: {
      profile: physicsProfile,
      plan: physicsPlan,
      manifest: physicsManifest,
      snapshot: null,
    },
    assetCatalog: null,
    shipModel: null,
  };
}

function setListContent(element, values) {
  element.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
}

function drawSkyAndShore(ctx, canvas, state, visuals) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
  sky.addColorStop(0, visuals.skyTop);
  sky.addColorStop(0.5, visuals.skyMid);
  sky.addColorStop(1, visuals.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const starVisibility = clamp(readVisualNumber(visuals.starVisibility, 1), 0, 1);
  if (starVisibility > 0.01) {
    for (let index = 0; index < 56; index += 1) {
      const x = pseudoRandom(index + 13) * canvas.width;
      const y = pseudoRandom(index * 7 + 5) * canvas.height * 0.42;
      const twinkle = (0.32 + Math.sin(state.time * 0.85 + index * 0.73) * 0.16) * starVisibility;
      const radius = 0.45 + pseudoRandom(index * 11 + 2) * 1.35;
      ctx.fillStyle = visuals.starColor.replace(/[\d.]+\)$/u, `${clamp(twinkle, 0.04, 0.62)})`);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const horizonGlow = ctx.createLinearGradient(0, canvas.height * 0.22, 0, canvas.height * 0.62);
  horizonGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
  horizonGlow.addColorStop(0.62, visuals.duskGlow);
  horizonGlow.addColorStop(1, visuals.horizonWarmth);
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, canvas.height * 0.2, canvas.width, canvas.height * 0.45);

  const daylight = 1 - starVisibility;
  const horizonY = canvas.height * 0.455;
  const waterAtmosphere = ctx.createLinearGradient(
    0,
    horizonY - canvas.height * 0.04,
    0,
    horizonY + canvas.height * 0.13
  );
  waterAtmosphere.addColorStop(0, "rgba(0, 0, 0, 0)");
  waterAtmosphere.addColorStop(0.48, resolveWaterAtmosphereColor(visuals));
  waterAtmosphere.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = waterAtmosphere;
  ctx.fillRect(
    0,
    horizonY - canvas.height * 0.04,
    canvas.width,
    canvas.height * 0.17
  );

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(30, 43, 38, ${0.12 + daylight * 0.18})`;
  ctx.beginPath();
  ctx.moveTo(0, horizonY + canvas.height * 0.035);
  ctx.lineTo(0, horizonY - canvas.height * 0.075);
  ctx.bezierCurveTo(
    canvas.width * 0.12,
    horizonY - canvas.height * 0.11,
    canvas.width * 0.28,
    horizonY - canvas.height * 0.04,
    canvas.width * 0.43,
    horizonY - canvas.height * 0.032
  );
  ctx.bezierCurveTo(
    canvas.width * 0.55,
    horizonY - canvas.height * 0.02,
    canvas.width * 0.62,
    horizonY + canvas.height * 0.006,
    canvas.width * 0.72,
    horizonY + canvas.height * 0.012
  );
  ctx.lineTo(canvas.width * 0.72, horizonY + canvas.height * 0.035);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = `rgba(189, 174, 126, ${0.11 + daylight * 0.18})`;
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.18, horizonY + canvas.height * 0.038);
  ctx.lineTo(canvas.width * 0.88, horizonY + canvas.height * 0.012);
  ctx.lineTo(canvas.width * 0.89, horizonY + canvas.height * 0.028);
  ctx.lineTo(canvas.width * 0.18, horizonY + canvas.height * 0.055);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = `rgba(231, 242, 247, ${0.045 + daylight * 0.035})`;
  ctx.lineWidth = 1;
  for (let index = 0; index < 9; index += 1) {
    const y = horizonY + canvas.height * (0.045 + index * 0.026);
    const width = canvas.width * (0.16 + index * 0.055);
    const x = canvas.width * (0.5 - width / canvas.width * 0.5) + Math.sin(state.time * 0.12 + index) * 7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(canvas.width * 0.5, y + Math.sin(index) * 4, x + width, y + 1.5);
    ctx.stroke();
  }
  ctx.restore();

  const sunLike = visuals.celestialKind === "sun";
  const moonX =
    canvas.width * (sunLike ? 0.62 : 0.76) +
    Math.sin(state.time * (sunLike ? 0.025 : 0.045)) * (sunLike ? 28 : 18);
  const moonY =
    canvas.height * (sunLike ? 0.16 + starVisibility * 0.08 : 0.17) +
    Math.cos(state.time * (sunLike ? 0.028 : 0.05)) * (sunLike ? 14 : 10);
  const celestial = resolveCelestialPresentation(canvas, visuals);
  const moon = ctx.createRadialGradient(
    moonX,
    moonY,
    celestial.coreRadius * 0.35,
    moonX,
    moonY,
    celestial.haloRadius
  );
  moon.addColorStop(0, visuals.moonCore);
  moon.addColorStop(0.32, visuals.moonHalo);
  moon.addColorStop(1, "rgba(178, 197, 218, 0)");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, celestial.haloRadius, 0, Math.PI * 2);
  ctx.fill();

  const moonCore = ctx.createRadialGradient(
    moonX,
    moonY,
    celestial.coreRadius * 0.18,
    moonX,
    moonY,
    celestial.coreRadius
  );
  moonCore.addColorStop(0, "rgba(255, 252, 241, 0.94)");
  moonCore.addColorStop(1, visuals.moonCore);
  ctx.fillStyle = moonCore;
  ctx.beginPath();
  ctx.arc(moonX, moonY, celestial.coreRadius, 0, Math.PI * 2);
  ctx.fill();

  const mist = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
  mist.addColorStop(0, "rgba(0, 0, 0, 0)");
  mist.addColorStop(1, visuals.ambientMist);
  ctx.fillStyle = mist;
  ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.55);

  if (state.collisionFlash > 0.01) {
    ctx.fillStyle = visuals.collisionFlash.replace(
      /[\d.]+\)$/u,
      `${clamp(state.collisionFlash * 0.22, 0, 0.26)})`
    );
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function resolveWaterAtmosphereColor(visuals) {
  const skyBottom = normalizeColor(visuals.skyBottom, visuals.waterFar);
  return colorToRgba(mixColor(visuals.waterFar, skyBottom, 0.32), 0.18);
}

function resolveCelestialScreenPosition(canvas, state, visuals) {
  const sunLike = visuals.celestialKind === "sun";
  return {
    x:
      canvas.width * (sunLike ? 0.62 : 0.76) +
      Math.sin(state.time * (sunLike ? 0.025 : 0.045)) * (sunLike ? 28 : 18),
    y:
      canvas.height * (sunLike ? 0.16 + readVisualNumber(visuals.starVisibility, 1) * 0.08 : 0.17) +
      Math.cos(state.time * (sunLike ? 0.028 : 0.05)) * (sunLike ? 14 : 10),
  };
}

function resolveCelestialPresentation(canvas, visuals) {
  const sunLike = visuals.celestialKind === "sun";
  const base = Math.min(canvas.width, canvas.height);
  const coreRadius = base * (sunLike ? 0.035 : 0.026);
  const haloRadius = coreRadius * (sunLike ? 4.8 : 3.8);
  return {
    coreRadius,
    haloRadius,
  };
}

function renderCelestialWaterReflection(ctx, canvas, state, reflectionStrength, visuals) {
  const reflectionAlpha = clamp(0.01 + reflectionStrength * 0.045, 0.008, 0.04);
  const source = resolveCelestialScreenPosition(canvas, state, visuals);
  const horizonY = canvas.height * 0.455;
  const waterTop = horizonY + canvas.height * 0.035;
  const trackTop = waterTop + canvas.height * 0.018;
  const trackBottom = canvas.height * 0.96;
  const phaseSpeed = readVisualNumber(visuals.wavePhaseSpeed, 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, waterTop, canvas.width, canvas.height - waterTop);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(0.2px)";

  for (let index = 0; index < 28; index += 1) {
    const t = index / 27;
    const y = mix(trackTop, trackBottom, t);
    const distanceFade = Math.pow(1 - t, 1.8);
    const roughness = pseudoRandom(index * 37 + 19);
    const waveOffset =
      Math.sin(index * 1.73 + state.time * 1.18 * phaseSpeed) *
      (4 + t * 18);
    const x = source.x + waveOffset + (roughness - 0.5) * (8 + t * 34);
    const width = (8 + t * 42) * (0.42 + roughness * 0.54);
    const height = 0.55 + t * 1.35;
    const alpha = reflectionAlpha * distanceFade * (0.12 + roughness * 0.32);
    if (alpha < 0.004) {
      continue;
    }
    ctx.fillStyle = visuals.moonReflection.replace(/[\d.]+\)$/u, `${alpha})`);
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0.02 + (roughness - 0.5) * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function resolveLocalLightContribution(triangle, lightSources, hitPoint, hitNormal) {
  const contribution = { r: 0, g: 0, b: 0 };
  if (!Array.isArray(lightSources) || triangle.surfaceType === "water") {
    return contribution;
  }

  const normal = normalizeVec3(hitNormal ?? triangle.normal);
  const point = hitPoint ?? triangle.worldCenter;
  for (const source of lightSources.slice(0, 8)) {
    const delta = subVec3(source.point, point);
    const distance = lengthVec3(delta);
    const attenuation =
      (source.glowScale ?? 1) / Math.max(1, 1 + distance * distance * 0.16);
    if (attenuation < 0.01) {
      continue;
    }

    const lightDir = normalizeVec3(delta);
    const facing = clamp(dotVec3(normal, lightDir), 0, 1);
    const response = attenuation * (0.24 + facing * 0.76);
    const glowColor = source.glowColor ?? source.coreColor ?? { r: 1, g: 0.72, b: 0.4 };
    contribution.r += glowColor.r * response * 0.24;
    contribution.g += glowColor.g * response * 0.2;
    contribution.b += glowColor.b * response * 0.13;
  }

  return contribution;
}

function resolveTriangleLightingContribution(surfaceType, shadowPostProcessPlan = null) {
  const polygonLightingContribution = clamp(
    readVisualNumber(shadowPostProcessPlan?.polygonLightingContribution, 1),
    0,
    1
  );
  const polygonShadowContribution = clamp(
    readVisualNumber(shadowPostProcessPlan?.polygonShadowContribution, 1),
    0,
    1
  );

  return {
    polygonLightingContribution:
      surfaceType === "water"
        ? Math.max(0.82, polygonLightingContribution)
        : polygonLightingContribution,
    polygonShadowContribution,
  };
}

function drawTriangles(
  ctx,
  triangles,
  lightDir,
  reflectionStrength,
  camera,
  shadowStrength,
  localLights = [],
  lightingEnvironment = DEFAULT_LIGHTING_ENVIRONMENT,
  shadowPostProcessPlan = null
) {
  triangles.sort((left, right) => right.depth - left.depth);
  for (const triangle of triangles) {
    const lightingContribution = resolveTriangleLightingContribution(
      triangle.surfaceType,
      shadowPostProcessPlan
    );
    const material = triangle.material ?? {
      roughness: 0.88,
      metallic: 0.08,
      emissive: { r: 0, g: 0, b: 0 },
    };
    const patches = buildTriangleHitPatches(triangle);
    for (const patch of patches) {
      const surfaceNormal = normalizeVec3(patch.normal);
      const hitPoint = patch.worldPoint;
      const baseColor = resolveHitColor(triangle, patch.barycentric);
      const heightBias = clamp((hitPoint.y + 3) / 10, 0, 1);
      const normalShaded = shadeColor(
        baseColor,
        surfaceNormal,
        lightDir,
        heightBias,
        triangle.accent,
        lightingEnvironment
      );
      const postProcessBase = shadeColor(
        baseColor,
        vec3(0, 1, 0),
        lightDir,
        heightBias,
        triangle.accent * 0.6,
        lightingEnvironment
      );
      const shaded = mixColor(
        postProcessBase,
        normalShaded,
        lightingContribution.polygonLightingContribution
      );
      const reflection = reflectionStrength * (triangle.reflection ?? 0);
      const viewDir = normalizeVec3(subVec3(camera.eye, hitPoint));
      const reflectedLight = reflectVec3(scaleVec3(lightDir, -1), surfaceNormal);
      const gloss =
        mix(0.78, 0.14, clamp(material.roughness ?? 0.88, 0, 1)) +
        (material.metallic ?? 0) * 0.18;
      const specularPower = mix(26, 7, clamp(material.roughness ?? 0.88, 0, 1));
      const specular =
        Math.pow(clamp(dotVec3(reflectedLight, viewDir), 0, 1), specularPower) *
        gloss *
        (triangle.surfaceType === "water"
          ? 1
          : Math.max(0.08, lightingContribution.polygonLightingContribution));
      const emissive = material.emissive ?? { r: 0, g: 0, b: 0 };
      const localLight = scaleColor(
        resolveLocalLightContribution(triangle, localLights, hitPoint, surfaceNormal),
        triangle.surfaceType === "water"
          ? 1
          : Math.max(0.35, lightingContribution.polygonLightingContribution)
      );
      const baseOcclusion =
        triangle.surfaceType === "water" ? shadowStrength * 0.012 : shadowStrength * 0.028;
      const occlusion = baseOcclusion * lightingContribution.polygonShadowContribution;
      const specularStrength =
        triangle.surfaceType === "water"
          ? lightingEnvironment.waterSpecularStrength
          : lightingEnvironment.specularStrength;
      const specularColor = lightingEnvironment.specularColor;
      const lit = gradeLitColor(
        {
          r:
            shaded.r +
            reflection * specularColor.r * 0.045 +
            specular * specularStrength * specularColor.r +
            emissive.r * 0.34 +
            localLight.r -
            occlusion,
          g:
            shaded.g +
            reflection * specularColor.g * 0.045 +
            specular * specularStrength * specularColor.g +
            emissive.g * 0.34 +
            localLight.g -
            occlusion,
          b:
            shaded.b +
            reflection * specularColor.b * 0.07 +
            specular * specularStrength * specularColor.b +
            emissive.b * 0.36 +
            localLight.b -
            occlusion * 0.62,
        },
        lightingEnvironment
      );
      const detailed = applyMaterialDetail(
        lit,
        material,
        hitPoint,
        surfaceNormal,
        triangle.surfaceType
      );
      ctx.fillStyle = colorToRgba(detailed, triangle.baseColor.a ?? 0.98);
      ctx.beginPath();
      ctx.moveTo(patch.points[0].x, patch.points[0].y);
      ctx.lineTo(patch.points[1].x, patch.points[1].y);
      ctx.lineTo(patch.points[2].x, patch.points[2].y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function renderProjectedShadow(ctx, worldPoints, camera, viewport, lightDir, options = {}) {
  const planeY = options.planeY ?? 0;
  const projected = worldPoints
    .map((point) => projectShadowPoint(point, lightDir, planeY))
    .filter(Boolean)
    .map((point) => projectPoint(point, camera, viewport))
    .filter(Boolean);

  if (projected.length < 3) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = options.color ?? `rgba(12, 24, 36, ${clamp(options.alpha ?? 0.16, 0, 0.5)})`;
  ctx.shadowColor = options.color ?? "rgba(12, 24, 36, 0.22)";
  ctx.shadowBlur = options.blur ?? 18;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let index = 1; index < projected.length; index += 1) {
    ctx.lineTo(projected[index].x, projected[index].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function buildSmoothVertexNormalsFromIndexedTriangles(positions, indices) {
  const normals = positions.map(() => vec3(0, 0, 0));
  for (let index = 0; index < indices.length; index += 3) {
    const ia = indices[index];
    const ib = indices[index + 1];
    const ic = indices[index + 2];
    const a = positions[ia];
    const b = positions[ib];
    const c = positions[ic];
    const areaNormal = crossVec3(subVec3(b, a), subVec3(c, a));
    normals[ia] = addVec3(normals[ia], areaNormal);
    normals[ib] = addVec3(normals[ib], areaNormal);
    normals[ic] = addVec3(normals[ic], areaNormal);
  }

  return normals.map((normal) =>
    lengthVec3(normal) > 0.0001 ? normalizeVec3(normal) : vec3(0, 1, 0)
  );
}

function createProceduralMaterial(name, color, roughness = 0.86) {
  return {
    name,
    color: { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 },
    roughness,
    metallic: 0,
    emissive: { r: 0, g: 0, b: 0 },
  };
}

function pushProceduralTriangle(camera, viewport, triangles, points, options) {
  const projected = points.map((point) => projectPoint(point, camera, viewport));
  if (projected.some((point) => point === null)) {
    return;
  }

  const normal = normalizeVec3(crossVec3(subVec3(points[1], points[0]), subVec3(points[2], points[0])));
  const worldCenter = scaleVec3(addVec3(addVec3(points[0], points[1]), points[2]), 1 / 3);
  triangles.push({
    points: projected,
    depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
    worldCenter,
    vertices: points,
    faceNormal: normal,
    normal,
    vertexNormals: [normal, normal, normal],
    normalSmoothing: 0,
    normalSmoothingSubdivisions: 1,
    baseColor: { ...options.color, a: options.alpha ?? 1 },
    accent: options.accent ?? 0,
    material: createProceduralMaterial(options.name, options.color, options.roughness),
    reflection: options.reflection ?? 0,
    surfaceType: options.surfaceType ?? "structure",
  });
}

function pushProceduralQuad(camera, viewport, triangles, points, options) {
  pushProceduralTriangle(camera, viewport, triangles, [points[0], points[1], points[2]], options);
  pushProceduralTriangle(camera, viewport, triangles, [points[0], points[2], points[3]], options);
}

function addProceduralBoxQuads(quads, name, min, max, color, options = {}) {
  const { x: minX, y: minY, z: minZ } = min;
  const { x: maxX, y: maxY, z: maxZ } = max;
  const points = {
    lbf: vec3(minX, minY, maxZ),
    rbf: vec3(maxX, minY, maxZ),
    rtf: vec3(maxX, maxY, maxZ),
    ltf: vec3(minX, maxY, maxZ),
    lbb: vec3(minX, minY, minZ),
    rbb: vec3(maxX, minY, minZ),
    rtb: vec3(maxX, maxY, minZ),
    ltb: vec3(minX, maxY, minZ),
  };

  const push = (suffix, quadPoints, shade = 1) => {
    quads.push({
      name: `${name}-${suffix}`,
      points: quadPoints,
      color: scaleColor(color, shade),
      surfaceType: options.surfaceType ?? "structure",
      accent: options.accent ?? 0,
      roughness: options.roughness ?? 0.88,
      reflection: options.reflection ?? 0,
    });
  };

  push("front", [points.lbf, points.rbf, points.rtf, points.ltf], 0.92);
  push("back", [points.rbb, points.lbb, points.ltb, points.rtb], 0.72);
  push("left", [points.lbb, points.lbf, points.ltf, points.ltb], 0.78);
  push("right", [points.rbf, points.rbb, points.rtb, points.rtf], 0.86);
  push("top", [points.ltf, points.rtf, points.rtb, points.ltb], 1.06);
  push("bottom", [points.lbb, points.rbb, points.rbf, points.lbf], 0.62);
}

function buildHarborShorelineGeometry(visuals) {
  const stone = visuals.harborWall;
  const deck = visuals.harborDeck;
  const land = mixColor(stone, { r: 0.18, g: 0.26, b: 0.19 }, 0.46);
  const grass = mixColor({ r: 0.17, g: 0.33, b: 0.2 }, visuals.waterFar, 0.12);
  const quads = [
    {
      name: "left-coastal-shelf",
      points: [
        vec3(-16.5, 0.1, -7.2),
        vec3(-16.2, 0.18, 6.6),
        vec3(-2.25, 0.36, 4.55),
        vec3(0.55, 0.18, -7.2),
      ],
      color: land,
      surfaceType: "terrain",
      accent: 0.02,
      roughness: 0.96,
    },
    {
      name: "cliff-grass-cap",
      points: [
        vec3(-16.5, 0.36, -7.2),
        vec3(-16.2, 0.56, 3.8),
        vec3(-8.6, 0.68, 3.05),
        vec3(-6.2, 0.46, -7.2),
      ],
      color: grass,
      surfaceType: "terrain",
      accent: 0.04,
      roughness: 0.98,
    },
    {
      name: "quay-apron",
      points: [
        vec3(-12.4, 0.58, -3.2),
        vec3(-12.0, 0.58, 4.8),
        vec3(-1.05, 0.58, 4.35),
        vec3(-1.25, 0.58, -3.25),
      ],
      color: mixColor(deck, stone, 0.34),
      surfaceType: "structure",
      accent: 0.04,
      roughness: 0.9,
    },
    {
      name: "quay-water-face",
      points: [
        vec3(-12.0, -0.42, 4.8),
        vec3(-1.05, -0.42, 4.35),
        vec3(-1.05, 0.58, 4.35),
        vec3(-12.0, 0.58, 4.8),
      ],
      color: stone,
      surfaceType: "structure",
      accent: 0.03,
      roughness: 0.88,
    },
    {
      name: "quay-right-face",
      points: [
        vec3(-1.05, -0.38, 4.35),
        vec3(-1.25, -0.36, -3.25),
        vec3(-1.25, 0.58, -3.25),
        vec3(-1.05, 0.58, 4.35),
      ],
      color: mixColor(stone, deck, 0.12),
      surfaceType: "structure",
      accent: 0.02,
      roughness: 0.88,
    },
  ];

  addProceduralBoxQuads(
    quads,
    "outer-breakwater",
    vec3(-11.8, -0.22, 12.8),
    vec3(10.6, 0.38, 13.82),
    mixColor(stone, { r: 0.82, g: 0.72, b: 0.45 }, 0.3),
    { accent: 0.02, roughness: 0.92 }
  );
  addProceduralBoxQuads(
    quads,
    "right-pier",
    vec3(9.65, -0.24, 6.4),
    vec3(10.95, 0.42, 15.2),
    mixColor(stone, { r: 0.56, g: 0.51, b: 0.42 }, 0.22),
    { accent: 0.02, roughness: 0.9 }
  );
  addProceduralBoxQuads(
    quads,
    "inner-landing",
    vec3(-5.4, -0.12, 3.0),
    vec3(0.95, 0.42, 4.12),
    mixColor(deck, stone, 0.45),
    { accent: 0.04, roughness: 0.86 }
  );

  return quads;
}

function pushHarborShorelineGeometry(camera, viewport, triangles, visuals) {
  for (const quad of buildHarborShorelineGeometry(visuals)) {
    pushProceduralQuad(camera, viewport, triangles, quad.points, quad);
  }
}

function pushHarborGeometry(camera, viewport, triangles, state, visuals) {
  pushHarborShorelineGeometry(camera, viewport, triangles, visuals);

  if (!state.showcaseRealisticModelsEnabled) {
    for (const object of LEGACY_HARBOR_LAYOUT) {
      buildTrianglesFromMesh(
        { positions: [object], indices: [0], normals: null, colors: null, material: createLegacyMeshPrimitive({})?.material, bounds: null, name: "legacy-structure" },
        {
          position: object.position,
          rotationY: object.rotationY,
          scale: object.scale,
        },
        object.color,
        camera,
        viewport,
        triangles,
        {
          accent: object.accent,
          reflection: 0,
          surfaceType: "structure",
        }
      );
    }

    return;
  }

  for (const placement of SHOWCASE_ENVIRONMENT_LAYOUT) {
    if (placement.assetKey === "lighthouse") {
      continue;
    }
    const mesh = state.assetCatalog?.environment?.[placement.assetKey] ?? null;
    if (!mesh) {
      continue;
    }

    buildTrianglesFromMesh(
      mesh,
      {
        position: vec3(placement.position.x, placement.position.y, placement.position.z),
        rotationY: placement.rotationY,
        scale: placement.scale,
      },
      null,
      camera,
      viewport,
      triangles,
      {
        accent: placement.accent,
        reflection: 0,
        surfaceType: "structure",
      }
    );
  }
}

function pushHarborWaterReflections(camera, viewport, triangles, state, visuals, waterRayTracePlan) {
  if (!state.showcaseRealisticModelsEnabled) {
    return;
  }

  const waterTint = mixColor(visuals.waterNear, visuals.waterFar, 0.42);
  for (const placement of SHOWCASE_ENVIRONMENT_LAYOUT) {
    const mesh = state.assetCatalog?.environment?.[placement.assetKey] ?? null;
    if (!mesh) {
      continue;
    }

    buildWaterReflectionTrianglesFromMesh(
      mesh,
      {
        position: vec3(placement.position.x, placement.position.y, placement.position.z),
        rotationY: placement.rotationY,
        scale: placement.scale,
      },
      null,
      camera,
      viewport,
      state,
      triangles,
      {
        baseAlpha: 0.052,
        intensity: 0.46 * waterRayTracePlan.sceneReflectionIntensity,
        traceKind: "harbor-reflection",
        waterTint,
        maxReflectionHeight: 1.25,
        reflectionFadeHeight: 1.4,
        roughnessDamping: 0.62,
      }
    );
  }
}

function renderShipRigging(ctx, ship, camera, viewport) {
  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE };
  const layout =
    ship.modelKey === "cutter"
      ? {
          lineColor: "rgba(85, 89, 97, 0.92)",
          sailColor: "rgba(218, 232, 244, 0.28)",
          points: [
            vec3(0, 0.88, -0.32),
            vec3(0, 2.4, -0.28),
            vec3(0.1, 1.92, -0.3),
            vec3(1.18, 1.72, -0.18),
            vec3(1.04, 1.08, -0.12),
          ],
          mastPairs: [[0, 1], [2, 3]],
          sailTriangle: [2, 3, 4],
        }
      : {
          lineColor: "rgba(73, 54, 45, 0.94)",
          sailColor: "rgba(238, 232, 214, 0.88)",
          points: [
            vec3(0, 0.38, -0.4),
            vec3(0, 3.8, -0.2),
            vec3(-0.25, 0.32, -1.9),
            vec3(-0.15, 2.7, -1.75),
            vec3(0.08, 3.2, -0.2),
            vec3(0.12, 1.2, -0.5),
            vec3(2.25, 2.25, 0.15),
          ],
          mastPairs: [[0, 1], [2, 3]],
          sailTriangle: [4, 5, 6],
        };
  const projected = layout.points
    .map((point) => transformPoint(point, transform))
    .map((point) => projectPoint(point, camera, viewport));
  if (projected.some((value) => value === null)) {
    return;
  }

  ctx.strokeStyle = layout.lineColor;
  ctx.lineWidth = ship.modelKey === "cutter" ? 2.2 : 3.5;
  ctx.beginPath();
  for (const [from, to] of layout.mastPairs) {
    ctx.moveTo(projected[from].x, projected[from].y);
    ctx.lineTo(projected[to].x, projected[to].y);
  }
  ctx.stroke();

  const [a, b, c] = layout.sailTriangle;
  ctx.fillStyle = layout.sailColor;
  ctx.beginPath();
  ctx.moveTo(projected[a].x, projected[a].y);
  ctx.lineTo(projected[b].x, projected[b].y);
  ctx.lineTo(projected[c].x, projected[c].y);
  ctx.closePath();
  ctx.fill();
}

function renderClothAccent(ctx, cloth, camera, viewport) {
  const projected = cloth.positions.map((point) => projectPoint(point, camera, viewport));
  ctx.strokeStyle = "rgba(255, 241, 226, 0.92)";
  ctx.lineWidth = 1.7;

  for (
    let row = 0;
    row < cloth.grid.rows;
    row += Math.max(1, Math.floor(cloth.grid.rows / 5))
  ) {
    ctx.beginPath();
    let started = false;
    for (let column = 0; column < cloth.grid.cols; column += 1) {
      const point = projected[row * cloth.grid.cols + column];
      if (!point) {
        continue;
      }
      if (!started) {
        ctx.moveTo(point.x, point.y);
        started = true;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    if (started) {
      ctx.stroke();
    }
  }

  const borderIndices = [
    0,
    cloth.grid.cols - 1,
    cloth.grid.rows * cloth.grid.cols - 1,
    (cloth.grid.rows - 1) * cloth.grid.cols,
  ];
  ctx.fillStyle = colorToRgba(cloth.color, 0.95);
  for (const index of borderIndices) {
    const point = projected[index];
    if (!point) {
      continue;
    }
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderWaterHighlights(ctx, waterBands, state, camera, viewport) {
  const direction = resolveWaveDirection(state);
  const lateral = perpendicularOnWater(direction);
  const phaseSpeed = readVisualNumber(state.demoVisuals?.wavePhaseSpeed, 1);
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const band of waterBands) {
    if (band.band === "horizon") {
      continue;
    }
    const rowStep = band.band === "near" ? 3 : 4;
    const columnStep = band.band === "near" ? 5 : 7;
    const baseAlpha = band.band === "near" ? 0.14 : 0.075;
    const crestThreshold = band.band === "near" ? 0.44 : 0.58;

    for (let row = 1; row < band.rows - 1; row += rowStep) {
      const rowOffset = row % 2;
      for (let column = 1 + rowOffset; column < band.cols - 1; column += columnStep) {
        const base = band.positions[row * band.cols + column];
        const seed = row * 89 + column * 131 + band.rows * 17;
        const stableNoise = pseudoRandom(seed);
        const densityNoise = pseudoRandom(seed + 31);
        const along = base.x * direction.x + base.z * direction.z;
        const cross = base.x * lateral.x + base.z * lateral.z;
        const crest =
          Math.sin(
            along * 0.72 +
              Math.sin(cross * 0.24 + state.time * 0.5) * 0.65 -
              state.time * 1.46 * phaseSpeed +
              stableNoise * 2.2
          );
        if (crest < crestThreshold || densityNoise < 0.18) {
          continue;
        }

        const tangentSkew = (pseudoRandom(seed + 7) - 0.5) * 0.42;
        const tangent = normalizeVec3(addVec3(lateral, scaleVec3(direction, tangentSkew)));
        const crestPoint = vec3(
          base.x,
          sampleWave(state, base.x, base.z, state.time) * 0.24 + 0.03,
          base.z
        );
        const projected = projectPoint(crestPoint, camera, viewport);
        const tangentProjected = projectPoint(addVec3(crestPoint, scaleVec3(tangent, 0.7)), camera, viewport);
        if (!projected || !tangentProjected) {
          continue;
        }

        const rotation = Math.atan2(tangentProjected.y - projected.y, tangentProjected.x - projected.x);
        const depthScale = viewport.height / Math.max(12, projected.depth);
        const crestAlpha =
          baseAlpha *
          smoothstep(crestThreshold, 1, crest) *
          (0.62 + stableNoise * 0.38);
        const radiusX = clamp(depthScale * (0.04 + stableNoise * 0.035), 1.2, band.band === "near" ? 7.2 : 4.4);
        const radiusY = clamp(radiusX * (0.16 + pseudoRandom(seed + 23) * 0.14), 0.32, 1.65);
        const glow = ctx.createRadialGradient(
          projected.x,
          projected.y,
          0,
          projected.x,
          projected.y,
          radiusX
        );
        glow.addColorStop(0, `rgba(238, 249, 255, ${crestAlpha})`);
        glow.addColorStop(0.48, `rgba(182, 222, 244, ${crestAlpha * 0.32})`);
        glow.addColorStop(1, "rgba(182, 222, 244, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(projected.x, projected.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function readPhysicsNumber(physics, key, fallback) {
  const value = physics?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getShipMass(ship, shipModel) {
  const baseMass = readPhysicsNumber(shipModel.physics, "mass", 3200);
  return baseMass * readVisualNumber(ship.massScale, 1);
}

function getShipHalfExtents(ship, shipModel) {
  const physicsHalfExtents = Array.isArray(shipModel.physics.halfExtents)
    ? shipModel.physics.halfExtents
    : [1.35, 0.95, 3.9];
  const scale = SHIP_SCALE * readVisualNumber(ship.collisionRadiusScale, 1);
  return {
    x: physicsHalfExtents[0] * scale,
    y: physicsHalfExtents[1] * scale,
    z: physicsHalfExtents[2] * scale,
  };
}

function getShipCollisionRadius(ship, shipModel) {
  const halfExtents = getShipHalfExtents(ship, shipModel);
  return Math.max(halfExtents.x * 1.08, halfExtents.z * 0.62);
}

function getShipInverseMass(ship, shipModel) {
  return 1 / Math.max(1, getShipMass(ship, shipModel));
}

function getShipInverseInertia(ship, shipModel) {
  const radius = getShipCollisionRadius(ship, shipModel);
  const inertia = getShipMass(ship, shipModel) * radius * radius * 0.72;
  return 1 / Math.max(1, inertia);
}

function spawnSpray(state, point, intensity) {
  const count = state.fluidDetail.getSnapshot().currentLevel.config.splashCount;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 0.9 + Math.random() * intensity * 0.45;
    state.sprays.push({
      kind: intensity > 2.8 ? "impact-spray" : "bow-spray",
      position: vec3(point.x, point.y, point.z),
      velocity: vec3(Math.cos(angle) * speed * 0.35, 1.1 + Math.random() * 0.8, Math.sin(angle) * speed * 0.25),
      life: 1.2 + Math.random() * 0.4,
      radius: 0.72 + Math.random() * 0.42,
      opacity: clamp(0.44 + intensity * 0.08, 0.44, 0.88),
    });
  }
}

function resolveShipRoute(ship, state, radius) {
  if (typeof ship.routeDirection !== "number") {
    ship.routeDirection = ship.velocity.x >= 0 ? 1 : -1;
  }

  if (ship.position.x > HARBOR_BOUNDS.maxX - radius * 1.1) {
    ship.routeDirection = -1;
  } else if (ship.position.x < HARBOR_BOUNDS.minX + radius * 1.1) {
    ship.routeDirection = 1;
  }

  const wander = Math.sin(state.time * 0.22 + readVisualNumber(ship.wanderPhase, 0));
  const crossCurrent = Math.cos(state.time * 0.31 + readVisualNumber(ship.wanderPhase, 0));
  const laneCenter =
    ship.id === "northwind"
      ? 10.2 + wander * 2.1 + crossCurrent * 0.6
      : 7 + wander * 3.3 - crossCurrent * 1.1;
  const targetX =
    ship.routeDirection > 0
      ? HARBOR_BOUNDS.maxX - radius * 1.7
      : HARBOR_BOUNDS.minX + radius * 1.7;
  return vec3(targetX, 0, clamp(laneCenter, HARBOR_BOUNDS.minZ + 1.8, HARBOR_BOUNDS.maxZ - 1.8));
}

function updateShipMotion(state, ship, dt, shipModel) {
  const physics = shipModel.physics;
  const massScale = Math.max(0.55, readVisualNumber(ship.massScale, 1));
  const radius = getShipCollisionRadius(ship, shipModel);
  const waterline = readPhysicsNumber(physics, "waterline", 0.42);
  const linearDamping = readPhysicsNumber(physics, "linearDamping", 0.04);
  const angularDamping = readPhysicsNumber(physics, "angularDamping", 0.08);
  const throttleResponse = readVisualNumber(ship.throttleResponse, 0.58);
  const rudderResponse = readVisualNumber(ship.rudderResponse, 0.62);
  const cruiseSpeed = readVisualNumber(ship.cruiseSpeed, 2.4);

  ship.collisionCooldown = Math.max(0, readVisualNumber(ship.collisionCooldown, 0) - dt);

  const forward = directionFromYaw(ship.rotationY);
  const lateral = perpendicularOnWater(forward);
  const routeTarget = resolveShipRoute(ship, state, radius);
  const desiredHeading = Math.atan2(routeTarget.x - ship.position.x, routeTarget.z - ship.position.z);
  const headingError = Math.atan2(
    Math.sin(desiredHeading - ship.rotationY),
    Math.cos(desiredHeading - ship.rotationY)
  );
  ship.angularVelocity +=
    headingError * rudderResponse * dt * (1.18 / Math.sqrt(massScale)) +
    Math.sin(state.time * 0.9 + readVisualNumber(ship.wanderPhase, 0)) * dt * 0.04;

  const waveDirection = resolveWaveDirection(state);
  const forwardSpeed = dotVec3(ship.velocity, forward);
  const lateralSpeed = dotVec3(ship.velocity, lateral);
  const thrust = (cruiseSpeed - forwardSpeed) * throttleResponse;
  const currentDrift = sampleWave(state, ship.position.x, ship.position.z, state.time) * 0.016;
  const acceleration = addVec3(
    scaleVec3(forward, thrust),
    addVec3(
      scaleVec3(lateral, -lateralSpeed * (1.28 + rudderResponse * 0.4)),
      scaleVec3(waveDirection, currentDrift / Math.sqrt(massScale))
    )
  );

  ship.velocity = addVec3(ship.velocity, scaleVec3(acceleration, dt));
  ship.velocity = scaleVec3(
    ship.velocity,
    Math.max(0, 1 - (linearDamping / Math.pow(massScale, 0.22)) * dt)
  );
  ship.angularVelocity *= Math.max(
    0,
    1 - (angularDamping / Math.pow(massScale, 0.15)) * dt
  );
  ship.rotationY += ship.angularVelocity * dt;
  ship.position = addVec3(ship.position, scaleVec3(ship.velocity, dt));
  ship.position.y =
    sampleWave(state, ship.position.x, ship.position.z, state.time) * 0.24 + waterline;
}

function resolveBoundaryCollision(ship, state, shipModel) {
  const restitution = readPhysicsNumber(shipModel.physics, "restitution", 0.22) * 0.56;
  const radius = getShipCollisionRadius(ship, shipModel);
  const boundaries = [
    { axis: "x", min: HARBOR_BOUNDS.minX + radius, max: HARBOR_BOUNDS.maxX - radius, normalMin: vec3(1, 0, 0), normalMax: vec3(-1, 0, 0) },
    { axis: "z", min: HARBOR_BOUNDS.minZ + radius, max: HARBOR_BOUNDS.maxZ - radius, normalMin: vec3(0, 0, 1), normalMax: vec3(0, 0, -1) },
  ];

  for (const boundary of boundaries) {
    if (ship.position[boundary.axis] < boundary.min) {
      ship.position[boundary.axis] = boundary.min;
      const normal = boundary.normalMin;
      const speedIntoWall = dotVec3(ship.velocity, normal);
      if (speedIntoWall < 0) {
        ship.velocity = subVec3(
          ship.velocity,
          scaleVec3(normal, (1 + restitution) * speedIntoWall)
        );
        const tangent = vec3(-normal.z, 0, normal.x);
        const tangentSpeed = dotVec3(ship.velocity, tangent);
        ship.velocity = subVec3(ship.velocity, scaleVec3(tangent, tangentSpeed * 0.12));
        ship.angularVelocity += tangentSpeed * 0.004;
      }
    } else if (ship.position[boundary.axis] > boundary.max) {
      ship.position[boundary.axis] = boundary.max;
      const normal = boundary.normalMax;
      const speedIntoWall = dotVec3(ship.velocity, normal);
      if (speedIntoWall < 0) {
        ship.velocity = subVec3(
          ship.velocity,
          scaleVec3(normal, (1 + restitution) * speedIntoWall)
        );
        const tangent = vec3(-normal.z, 0, normal.x);
        const tangentSpeed = dotVec3(ship.velocity, tangent);
        ship.velocity = subVec3(ship.velocity, scaleVec3(tangent, tangentSpeed * 0.12));
        ship.angularVelocity += tangentSpeed * 0.004;
      }
    }
  }
}

function resolveShipCollision(state, a, b, shipModelA, shipModelB) {
  const delta = subVec3(b.position, a.position);
  const radiusA = getShipCollisionRadius(a, shipModelA);
  const radiusB = getShipCollisionRadius(b, shipModelB);
  const distance = Math.hypot(delta.x, delta.z);
  const minDistance = radiusA + radiusB;
  if (distance >= minDistance) {
    return false;
  }

  const normal =
    distance > 0.0001
      ? normalizeVec3(vec3(delta.x / distance, 0, delta.z / distance))
      : normalizeVec3(vec3(Math.cos(state.time * 5.2), 0, Math.sin(state.time * 4.8)));
  const tangent = vec3(-normal.z, 0, normal.x);
  const penetration = minDistance - distance;
  const invMassA = getShipInverseMass(a, shipModelA);
  const invMassB = getShipInverseMass(b, shipModelB);
  const invMassSum = invMassA + invMassB;
  const correction = scaleVec3(normal, (penetration / Math.max(0.0001, invMassSum)) * 0.72);
  a.position = subVec3(a.position, scaleVec3(correction, invMassA));
  b.position = addVec3(b.position, scaleVec3(correction, invMassB));

  const relativeVelocity = subVec3(b.velocity, a.velocity);
  const velocityAlongNormal = dotVec3(relativeVelocity, normal);
  const restitution =
    ((readPhysicsNumber(shipModelA.physics, "restitution", 0.22) +
      readPhysicsNumber(shipModelB.physics, "restitution", 0.22)) /
      2) *
    0.88;
  if (velocityAlongNormal < 0) {
    const impulseMagnitude =
      (-(1 + restitution) * velocityAlongNormal) / Math.max(0.0001, invMassSum);
    const impulse = scaleVec3(normal, impulseMagnitude);
    a.velocity = subVec3(a.velocity, scaleVec3(impulse, invMassA));
    b.velocity = addVec3(b.velocity, scaleVec3(impulse, invMassB));

    const tangentSpeed = dotVec3(relativeVelocity, tangent);
    const frictionMagnitude = clamp(
      (-tangentSpeed / Math.max(0.0001, invMassSum)),
      -impulseMagnitude * 0.16,
      impulseMagnitude * 0.16
    );
    const frictionImpulse = scaleVec3(tangent, frictionMagnitude);
    a.velocity = subVec3(a.velocity, scaleVec3(frictionImpulse, invMassA));
    b.velocity = addVec3(b.velocity, scaleVec3(frictionImpulse, invMassB));

    a.angularVelocity -=
      tangentSpeed * radiusA * getShipInverseInertia(a, shipModelA) * 0.2 +
      impulseMagnitude * 0.00024;
    b.angularVelocity +=
      tangentSpeed * radiusB * getShipInverseInertia(b, shipModelB) * 0.2 +
      impulseMagnitude * 0.00024;

    const impactSpeed = Math.abs(velocityAlongNormal);
    if (
      impactSpeed > 0.18 &&
      Math.max(readVisualNumber(a.collisionCooldown, 0), readVisualNumber(b.collisionCooldown, 0)) <= 0
    ) {
      const contactPoint = vec3(
        (a.position.x + b.position.x) * 0.5,
        (a.position.y + b.position.y) * 0.5 + 0.14,
        (a.position.z + b.position.z) * 0.5
      );
      spawnSpray(state, contactPoint, impactSpeed * 2.4 + penetration * 8);
      state.waveImpulses.push({
        x: contactPoint.x,
        z: contactPoint.z,
        strength: clamp(0.24 + impactSpeed * 0.46 + penetration * 0.9, 0.2, 1.7),
        radius: 0.9 + penetration * 1.4,
        life: 1,
      });
      state.collisionCount += 1;
      state.collisionFlash = Math.max(
        state.collisionFlash,
        clamp(impactSpeed * 0.55 + penetration * 1.8, 0.16, 1)
      );
      a.collisionCooldown = 0.2;
      b.collisionCooldown = 0.2;
    }
  }

  state.contactCount += 1;
  return true;
}

function updateShips(state, dt, shipModel) {
  let collided = false;
  state.contactCount = 0;

  for (const ship of state.ships) {
    const activeShipModel = resolveShipModel(state, ship, shipModel);
    updateShipMotion(state, ship, dt, activeShipModel);
    resolveBoundaryCollision(ship, state, activeShipModel);
  }

  for (let index = 0; index < state.ships.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < state.ships.length; otherIndex += 1) {
      const shipA = state.ships[index];
      const shipB = state.ships[otherIndex];
      const shipModelA = resolveShipModel(state, shipA, shipModel);
      const shipModelB = resolveShipModel(state, shipB, shipModel);
      collided =
        resolveShipCollision(state, shipA, shipB, shipModelA, shipModelB) ||
        collided;
    }
  }

  state.collisionFlash = collided
    ? Math.max(0.12, state.collisionFlash)
    : Math.max(0, state.collisionFlash - dt * 1.3);
}

function updateWaveImpulses(state, dt) {
  state.waveImpulses = state.waveImpulses
    .map((impulse) => ({
      ...impulse,
      life: impulse.life - dt * 0.55,
    }))
    .filter((impulse) => impulse.life > 0);
}

function updateSpray(state, dt) {
  state.sprays = state.sprays
    .map((particle) => {
      const nextVelocity = vec3(particle.velocity.x, particle.velocity.y - 4.2 * dt, particle.velocity.z);
      const nextPosition = addVec3(particle.position, scaleVec3(nextVelocity, dt));
      return {
        kind: particle.kind,
        position: nextPosition,
        velocity: nextVelocity,
        life: particle.life - dt,
        radius: particle.radius,
        opacity: particle.opacity,
      };
    })
    .filter((particle) => particle.life > 0 && particle.position.y > -0.2);
}

function createFixedMaxQualityDecision(state, frameTimeMs) {
  const targetFrameTimeMs = 16.67;
  const latestFrameTimeMs = readPositiveNumber(frameTimeMs, targetFrameTimeMs);
  const fps = latestFrameTimeMs > 0 ? 1000 / latestFrameTimeMs : 0;
  const dropRatio = latestFrameTimeMs > targetFrameTimeMs * 1.1 ? 1 : 0;
  const metrics = Object.freeze({
    sampleCount: 1,
    fps,
    latestFrameTimeMs,
    averageFrameTimeMs: latestFrameTimeMs,
    emaFrameTimeMs: latestFrameTimeMs,
    p95FrameTimeMs: latestFrameTimeMs,
    targetFrameTimeMs,
    frameTimeDeltaMs: latestFrameTimeMs - targetFrameTimeMs,
    trendDeltaMs: 0,
    dropRatio,
  });

  return Object.freeze({
    cycle: state.frame,
    processed: false,
    mode: "fixed-max",
    pressureLevel: "fixed-max",
    metrics,
    workerGraph: null,
    adjustments: Object.freeze([]),
    errors: Object.freeze([]),
    reason: "Fixed maximum-quality mode keeps adaptive visual-detail changes disabled.",
  });
}

function recordTelemetry(state, frameTimeMs) {
  const frameId = `showcase-${state.frame}`;
  const quality = {
    fluid: state.fluidDetail.getSnapshot(),
    cloth: state.clothDetail.getSnapshot(),
    lighting: state.lightingDetail.getSnapshot(),
  };
  const synthetic = frameTimeMs + state.sprays.length * 0.1 + (state.stress ? 6.5 : 0);
  const decision =
    state.adaptivePerformance === false
      ? createFixedMaxQualityDecision(state, synthetic)
      : state.governor.recordFrame({ frameTimeMs: synthetic });
  const queueDepth = Math.min(32, Math.round(6 + state.sprays.length / 2 + (state.stress ? 10 : 0)));
  const readyLaneDepth = Math.min(
    16,
    4 + Math.round(Math.max(0, Math.sin(state.time * 1.7 + 0.8)) * 9)
  );
  state.debugSession.recordQueue({
    owner: "renderer",
    queueClass: "render",
    depth: queueDepth,
    capacity: 32,
    frameId,
  });
  state.debugSession.recordReadyLane({
    owner: "lighting",
    queueClass: "lighting",
    laneId: "critical",
    priority: 920,
    depth: readyLaneDepth,
    capacity: 16,
    frameId,
  });
  state.debugSession.recordDispatch({
    owner: "lighting",
    queueClass: "lighting",
    jobType: "lighting.integration",
    frameId,
    durationMs: quality.lighting.currentLevel.estimatedCostMs ?? 1.2,
    workgroups: { x: quality.fluid.currentLevel.config.nearResolution, y: 1, z: 1 },
    workgroupSize: { x: 8, y: 8, z: 1 },
  });
  state.debugSession.recordDependencyUnlock({
    owner: "scene",
    queueClass: "render",
    sourceJobType: "physics.resolve",
    unlockedJobType: "lighting.integration",
    priority: 920,
    unlockCount: 2 + Math.round(Math.max(0, Math.sin(state.time * 1.1)) * 4),
    frameId,
  });
  state.debugSession.recordPipelinePhase({
    owner: "scene",
    pipeline: "scene-preparation",
    stage: "stable-visual-snapshot",
    frameId,
    durationMs: synthetic * 0.38,
    snapshotAgeMs: Math.max(0, synthetic - 8),
  });
  state.debugSession.recordFrame({
    frameId,
    frameTimeMs: synthetic,
    targetFrameTimeMs: 16.67,
    gpuBusyMs: synthetic * 0.56,
    dropped: synthetic > 18,
  });
  return decision;
}

function renderSprays(ctx, sprays, camera, viewport) {
  for (const spray of sprays) {
    const projected = projectPoint(spray.position, camera, viewport);
    if (!projected) {
      continue;
    }
    const velocityPoint = projectPoint(addVec3(spray.position, spray.velocity), camera, viewport);
    const radius = clamp((1 / projected.depth) * 260 * (spray.radius ?? 1), 1.1, 8.2);
    const rotation = velocityPoint
      ? Math.atan2(velocityPoint.y - projected.y, velocityPoint.x - projected.x)
      : -Math.PI * 0.5;
    const alpha = clamp((spray.life / 1.6) * (spray.opacity ?? 0.9), 0, 0.9);
    const stretch = spray.kind === "impact-spray" ? 2.6 : 1.7;
    const color = spray.kind === "impact-spray" ? "244, 252, 255" : "220, 243, 255";
    const glow = ctx.createRadialGradient(
      projected.x,
      projected.y,
      0,
      projected.x,
      projected.y,
      radius * stretch
    );
    glow.addColorStop(0, `rgba(${color}, ${alpha})`);
    glow.addColorStop(0.5, `rgba(${color}, ${alpha * 0.28})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(projected.x, projected.y, radius * stretch, radius * 0.42, rotation, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderFlagPole(ctx, camera, viewport) {
  const base = projectPoint(vec3(-3.5, 0.7, 2.4), camera, viewport);
  const top = projectPoint(vec3(-3.5, 6.3, 2.4), camera, viewport);
  if (!base || !top) {
    return;
  }
  ctx.strokeStyle = "rgba(77, 52, 41, 0.95)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.stroke();
}

function renderSoftRayTracedShadowSample(ctx, projected, radius, rotation, alpha, plan) {
  const softness = readVisualNumber(plan?.softnessMultiplier, 1);
  const hardening = readVisualNumber(plan?.contactHardening, 0.4);
  const innerRadius = radius * clamp(0.08 + hardening * 0.12, 0.08, 0.24);
  const outerRadius = radius * clamp(1.65 * softness, 1.2, 3.4);
  const shadow = ctx.createRadialGradient(
    projected.x,
    projected.y,
    innerRadius,
    projected.x,
    projected.y,
    outerRadius
  );
  shadow.addColorStop(0, `rgba(3, 7, 12, ${alpha})`);
  shadow.addColorStop(0.48, `rgba(3, 7, 12, ${alpha * 0.38})`);
  shadow.addColorStop(1, "rgba(3, 7, 12, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(
    projected.x,
    projected.y,
    outerRadius,
    outerRadius * 0.42,
    rotation,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function renderShipContactShadow(ctx, shipModel, ship, state, camera, viewport, shadowStrength) {
  const bounds = shipModel.bounds;
  if (!bounds) {
    return;
  }

  const waterline = sampleWaterline(state, ship.position.x, ship.position.z);
  const center = vec3(ship.position.x, waterline + 0.01, ship.position.z);
  const forward = directionFromYaw(ship.rotationY);
  const side = perpendicularOnWater(forward);
  const length = Math.max(1, (bounds.max[2] - bounds.min[2]) * SHIP_SCALE * 0.42);
  const width = Math.max(0.6, (bounds.max[0] - bounds.min[0]) * SHIP_SCALE * 0.52);
  const projectedCenter = projectPoint(center, camera, viewport);
  const projectedForward = projectPoint(addVec3(center, scaleVec3(forward, length)), camera, viewport);
  const projectedSide = projectPoint(addVec3(center, scaleVec3(side, width)), camera, viewport);
  if (!projectedCenter || !projectedForward || !projectedSide) {
    return;
  }

  const radiusX = clamp(
    Math.hypot(projectedForward.x - projectedCenter.x, projectedForward.y - projectedCenter.y),
    10,
    86
  );
  const radiusY = clamp(
    Math.hypot(projectedSide.x - projectedCenter.x, projectedSide.y - projectedCenter.y),
    5,
    36
  );
  const rotation = Math.atan2(
    projectedForward.y - projectedCenter.y,
    projectedForward.x - projectedCenter.x
  );
  const alpha = clamp(0.048 + shadowStrength * 0.11, 0.035, 0.18);
  const shadow = ctx.createRadialGradient(
    projectedCenter.x,
    projectedCenter.y,
    0,
    projectedCenter.x,
    projectedCenter.y,
    Math.max(radiusX, radiusY) * 1.18
  );
  shadow.addColorStop(0, `rgba(2, 7, 12, ${alpha})`);
  shadow.addColorStop(0.52, `rgba(2, 7, 12, ${alpha * 0.42})`);
  shadow.addColorStop(1, "rgba(2, 7, 12, 0)");

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.filter = "blur(1.6px)";
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(projectedCenter.x, projectedCenter.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderShipShadow(ctx, shipModel, ship, state, camera, viewport, lightDir, shadowStrength, shadowPostProcessPlan) {
  const bounds = shipModel.bounds;
  renderShipContactShadow(ctx, shipModel, ship, state, camera, viewport, shadowStrength);
  if (shadowPostProcessPlan?.shadowMask && shadowPostProcessPlan.shadowMask !== "disabled") {
    const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE };
    const shipForward = directionFromYaw(ship.rotationY);
    const projectedForward = projectPoint(addVec3(ship.position, shipForward), camera, viewport);
    const projectedCenter = projectPoint(ship.position, camera, viewport);
    const rotation =
      projectedForward && projectedCenter
        ? Math.atan2(projectedForward.y - projectedCenter.y, projectedForward.x - projectedCenter.x)
        : 0;
    const samples = [
      vec3(bounds.min[0] * 0.45, bounds.max[1] * 0.18, bounds.min[2] * 0.78),
      vec3(bounds.max[0] * 0.45, bounds.max[1] * 0.18, bounds.min[2] * 0.78),
      vec3(bounds.min[0] * 0.45, bounds.max[1] * 0.14, bounds.max[2] * 0.7),
      vec3(bounds.max[0] * 0.45, bounds.max[1] * 0.14, bounds.max[2] * 0.7),
      vec3(0, bounds.max[1] * 0.1, 0),
    ];

    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let index = 0; index < samples.length; index += 1) {
      const worldPoint = transformPoint(samples[index], transform);
      const waterline = sampleWaterline(state, worldPoint.x, worldPoint.z);
      const shadowPoint = projectShadowPoint(worldPoint, lightDir, waterline - 0.02);
      if (!shadowPoint) {
        continue;
      }
      const projected = projectPoint(shadowPoint, camera, viewport);
      if (!projected) {
        continue;
      }
      const radius = clamp((viewport.height / Math.max(8, projected.depth)) * 0.12, 4.2, 28);
      const alpha = (0.012 + shadowStrength * 0.032) * (1 - index * 0.09);
      renderSoftRayTracedShadowSample(ctx, projected, radius, rotation, alpha, shadowPostProcessPlan);
    }
    ctx.restore();
    return;
  }

  const keelY = (shipModel.physics.waterline ?? 0.42) - 0.28;
  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE };
  const hullCorners = [
    vec3(bounds.min[0], keelY, bounds.min[2]),
    vec3(bounds.max[0], keelY, bounds.min[2]),
    vec3(bounds.max[0], keelY, bounds.max[2]),
    vec3(bounds.min[0], keelY, bounds.max[2]),
  ].map((point) => transformPoint(point, transform));

  renderProjectedShadow(ctx, hullCorners, camera, viewport, lightDir, {
    planeY: sampleWave(state, ship.position.x, ship.position.z, state.time) * 0.24 - 0.03,
    alpha: 0.06 + shadowStrength * 0.14,
    blur: 18 + shadowStrength * 30,
  });
}

function renderRayTracedWaterOcclusion(ctx, shipModel, ship, state, camera, viewport, lightDir, shadowStrength) {
  const bounds = shipModel.bounds;
  if (!bounds) {
    return;
  }

  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE };
  const shipForward = directionFromYaw(ship.rotationY);
  const projectedForward = projectPoint(addVec3(ship.position, shipForward), camera, viewport);
  const projectedCenter = projectPoint(ship.position, camera, viewport);
  const rotation =
    projectedForward && projectedCenter
      ? Math.atan2(projectedForward.y - projectedCenter.y, projectedForward.x - projectedCenter.x)
      : 0;
  const samples = [
    vec3(bounds.min[0], bounds.max[1] * 0.72, bounds.min[2]),
    vec3(bounds.max[0], bounds.max[1] * 0.72, bounds.min[2]),
    vec3(bounds.min[0], bounds.max[1] * 0.62, bounds.max[2]),
    vec3(bounds.max[0], bounds.max[1] * 0.62, bounds.max[2]),
    vec3(0, bounds.max[1] * 1.28, bounds.min[2] * 0.15),
  ];

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  for (let index = 0; index < samples.length; index += 1) {
    const worldPoint = transformPoint(samples[index], transform);
    const waterline = sampleWaterline(state, worldPoint.x, worldPoint.z);
    const shadowPoint = projectShadowPoint(worldPoint, lightDir, waterline);
    if (!shadowPoint) {
      continue;
    }
    const distorted = reflectPointAcrossWater(state, shadowPoint);
    const projected = projectPoint(distorted, camera, viewport);
    if (!projected) {
      continue;
    }
    const radius = clamp((viewport.height / Math.max(8, projected.depth)) * 0.09, 3.2, 18);
    const alpha = (0.009 + shadowStrength * 0.026) * (1 - index * 0.1);
    const shadow = ctx.createRadialGradient(
      projected.x,
      projected.y,
      0,
      projected.x,
      projected.y,
      radius * 1.8
    );
    shadow.addColorStop(0, `rgba(4, 9, 14, ${alpha})`);
    shadow.addColorStop(0.72, `rgba(4, 9, 14, ${alpha * 0.24})`);
    shadow.addColorStop(1, "rgba(4, 9, 14, 0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(
      projected.x,
      projected.y,
      radius * 1.8,
      radius * 0.72,
      rotation,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function renderFlagShadow(ctx, cloth, camera, viewport, lightDir, shadowStrength, shadowPostProcessPlan) {
  const clothPoints = [
    cloth.positions[0],
    cloth.positions[cloth.grid.cols - 1],
    cloth.positions[cloth.positions.length - 1],
    cloth.positions[cloth.positions.length - cloth.grid.cols],
  ];

  if (shadowPostProcessPlan?.shadowMask && shadowPostProcessPlan.shadowMask !== "disabled") {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let index = 0; index < clothPoints.length; index += 1) {
      const shadowPoint = projectShadowPoint(clothPoints[index], lightDir, 0.56);
      if (!shadowPoint) {
        continue;
      }
      const projected = projectPoint(shadowPoint, camera, viewport);
      if (!projected) {
        continue;
      }
      const radius = clamp((viewport.height / Math.max(8, projected.depth)) * 0.075, 3.4, 18);
      renderSoftRayTracedShadowSample(
        ctx,
        projected,
        radius,
        -0.38,
        (0.018 + shadowStrength * 0.052) * (1 - index * 0.08),
        shadowPostProcessPlan
      );
    }
    ctx.restore();
    return;
  }

  renderProjectedShadow(ctx, clothPoints, camera, viewport, lightDir, {
    planeY: 0.56,
    alpha: 0.04 + shadowStrength * 0.1,
    blur: 16 + shadowStrength * 26,
  });
}

function collectSceneLightSources(state, visuals) {
  const directLights = [];
  const reflectionLights = [];
  const pushLight = (point, glowScale, reflectionStrength, coreColor, glowColor) => {
    directLights.push(
      Object.freeze({
        pass: "direct-glow",
        point,
        coreColor,
        glowColor,
        glowScale,
      })
    );
    if (reflectionStrength > 0) {
      reflectionLights.push(
        Object.freeze({
          pass: "water-reflection",
          point,
          coreColor,
          glowColor,
          glowScale,
          reflectionStrength,
        })
      );
    }
  };

  for (const torch of HARBOR_TORCHES) {
    pushLight(
      vec3(torch.x, torch.y, torch.z),
      torch.glow,
      visuals.lanternReflectionStrength * 0.55,
      visuals.torchCore,
      visuals.torchGlow
    );
  }

  for (const ship of state.ships) {
    const lanterns = Array.isArray(ship.lanterns) ? ship.lanterns : SHIP_LANTERNS;
    const strength = readVisualNumber(ship.lanternStrength, 1);
    for (const lantern of lanterns) {
      const point = transformPoint(
        vec3(lantern.x, lantern.y, lantern.z),
        { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE }
      );
      pushLight(
        point,
        lantern.glow * strength,
        visuals.lanternReflectionStrength,
        visuals.lanternCore,
        visuals.lanternGlow
      );
    }
  }

  return Object.freeze({
    directLights: Object.freeze(directLights),
    reflectionLights: Object.freeze(reflectionLights),
  });
}

function renderDirectLightGlow(ctx, source, camera, viewport) {
  const projected = projectPoint(source.point, camera, viewport);
  if (!projected) {
    return;
  }

  const luminousResponse = clamp(source.glowScale / Math.max(1.8, projected.depth * 0.38), 0.05, 0.72);
  const radius = clamp((1 / projected.depth) * 240 * source.glowScale, 2.4, 17);
  const halo = ctx.createRadialGradient(projected.x, projected.y, radius * 0.12, projected.x, projected.y, radius);
  halo.addColorStop(0, colorToRgba(source.coreColor, 0.54 * luminousResponse));
  halo.addColorStop(0.38, colorToRgba(source.glowColor, 0.2 * luminousResponse));
  halo.addColorStop(1, colorToRgba(source.glowColor, 0));
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(0.45px)";
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = colorToRgba(source.coreColor, clamp(0.62 + luminousResponse * 0.28, 0.58, 0.88));
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, Math.max(0.85, radius * 0.09), 0, Math.PI * 2);
  ctx.fill();
}

function renderWaterLightReflection(ctx, source, state, camera, viewport) {
  const projected = projectPoint(source.point, camera, viewport);
  if (!projected) {
    return;
  }

  const waterline = sampleWave(state, source.point.x, source.point.z, state.time) * 0.22;
  const sourceHeight = Math.max(0.2, source.point.y - waterline);
  const reflectedPoint = vec3(
    source.point.x,
    waterline - (source.point.y - waterline) * 0.58,
    source.point.z + 0.08
  );
  const reflected = projectPoint(reflectedPoint, camera, viewport);
  if (!reflected) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(0.75px)";
  const direction = resolveWaveDirection(state);
  const lateral = perpendicularOnWater(direction);
  const projectedDirectionPoint = projectPoint(addVec3(reflectedPoint, scaleVec3(direction, 0.7)), camera, viewport);
  const projectedLateralPoint = projectPoint(addVec3(reflectedPoint, scaleVec3(lateral, 0.7)), camera, viewport);
  const screenDirection =
    projectedDirectionPoint && Math.hypot(projectedDirectionPoint.x - reflected.x, projectedDirectionPoint.y - reflected.y) > 0.001
      ? normalizeVec3(vec3(projectedDirectionPoint.x - reflected.x, projectedDirectionPoint.y - reflected.y, 0))
      : vec3(0, 1, 0);
  const screenLateral =
    projectedLateralPoint && Math.hypot(projectedLateralPoint.x - reflected.x, projectedLateralPoint.y - reflected.y) > 0.001
      ? normalizeVec3(vec3(projectedLateralPoint.x - reflected.x, projectedLateralPoint.y - reflected.y, 0))
      : vec3(1, 0, 0);
  const sourceResponse = clamp(source.glowScale / (sourceHeight * sourceHeight + projected.depth * 0.05), 0.08, 0.86);
  const reflectionRadius = clamp((1 / projected.depth) * 170 * source.glowScale, 2.2, 18);
  for (let index = 0; index < 13; index += 1) {
    const travel = index * 0.34;
    const shimmer =
      sampleWave(state, reflectedPoint.x + index * 0.37, reflectedPoint.z - index * 0.22, state.time) *
      0.18;
    const worldPoint = addVec3(
      reflectedPoint,
      addVec3(scaleVec3(direction, travel), scaleVec3(lateral, shimmer))
    );
    const patch = projectPoint(worldPoint, camera, viewport);
    if (!patch) {
      continue;
    }
    const fade = Math.exp(-index * 0.22);
    const jitter = (pseudoRandom(index * 43 + Math.floor(projected.depth * 19)) - 0.5) * reflectionRadius * 0.72;
    const patchX = patch.x + screenLateral.x * jitter;
    const patchY = patch.y + screenLateral.y * jitter;
    const patchRadius = reflectionRadius * (0.78 + index * 0.06);
    const glow = ctx.createRadialGradient(
      patchX,
      patchY,
      patchRadius * 0.04,
      patchX,
      patchY,
      patchRadius
    );
    glow.addColorStop(0, colorToRgba(source.coreColor, source.reflectionStrength * sourceResponse * 0.28 * fade));
    glow.addColorStop(0.42, colorToRgba(source.glowColor, source.reflectionStrength * sourceResponse * 0.12 * fade));
    glow.addColorStop(1, colorToRgba(source.glowColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(
      patchX,
      patchY,
      patchRadius * (0.16 + index * 0.01),
      patchRadius * (0.72 + index * 0.04),
      Math.atan2(screenDirection.y, screenDirection.x),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function renderLighthouseBeam(ctx, state, camera, viewport, visuals) {
  const lighthousePlacement = SHOWCASE_ENVIRONMENT_LAYOUT.find(
    (placement) => placement.assetKey === "lighthouse"
  );
  if (!lighthousePlacement || !state.showcaseRealisticModelsEnabled) {
    return;
  }

  const source = transformPoint(
    vec3(0, 11.34, 0),
    {
      position: vec3(
        lighthousePlacement.position.x,
        lighthousePlacement.position.y,
        lighthousePlacement.position.z
      ),
      rotationY: lighthousePlacement.rotationY,
      scale: lighthousePlacement.scale,
    }
  );
  const sweep = state.time * 0.22 + 0.8;
  const direction = normalizeVec3(vec3(Math.sin(sweep), -0.07, Math.cos(sweep)));
  const spread = perpendicularOnWater(direction);
  const farCenter = addVec3(source, scaleVec3(direction, 34));
  const left = addVec3(farCenter, scaleVec3(spread, 7.4));
  const right = addVec3(farCenter, scaleVec3(spread, -7.4));
  const projectedSource = projectPoint(source, camera, viewport);
  const projectedLeft = projectPoint(left, camera, viewport);
  const projectedRight = projectPoint(right, camera, viewport);
  if (!projectedSource || !projectedLeft || !projectedRight) {
    return;
  }

  const pulse = 0.72 + Math.sin(state.time * 1.7) * 0.08;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = colorToRgba(visuals.torchCore, 0.034 * pulse);
  ctx.beginPath();
  ctx.moveTo(projectedSource.x, projectedSource.y);
  ctx.lineTo(projectedLeft.x, projectedLeft.y);
  ctx.lineTo(projectedRight.x, projectedRight.y);
  ctx.closePath();
  ctx.fill();

  const beamLength = Math.hypot(
    projectedLeft.x - projectedSource.x,
    projectedLeft.y - projectedSource.y
  );
  const core = ctx.createRadialGradient(
    projectedSource.x,
    projectedSource.y,
    2,
    projectedSource.x,
    projectedSource.y,
    clamp(beamLength * 0.22, 18, 80)
  );
  core.addColorStop(0, colorToRgba(visuals.torchCore, 0.42));
  core.addColorStop(0.5, colorToRgba(visuals.torchGlow, 0.11));
  core.addColorStop(1, colorToRgba(visuals.torchGlow, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(projectedSource.x, projectedSource.y, clamp(beamLength * 0.18, 14, 64), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderAtmosphericGrade(ctx, canvas, state, visuals) {
  const vignette = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.48,
    canvas.width * 0.2,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.72
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.7, "rgba(0, 0, 0, 0.055)");
  vignette.addColorStop(1, "rgba(1, 4, 8, 0.24)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const seaHaze = ctx.createLinearGradient(0, canvas.height * 0.34, 0, canvas.height);
  seaHaze.addColorStop(0, "rgba(0, 0, 0, 0)");
  seaHaze.addColorStop(0.5, visuals.ambientMist);
  seaHaze.addColorStop(1, "rgba(10, 13, 17, 0.12)");
  ctx.fillStyle = seaHaze;
  ctx.fillRect(0, canvas.height * 0.34, canvas.width, canvas.height * 0.66);

  if (state.captureMode) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let index = 0; index < 70; index += 1) {
      const x = pseudoRandom(index * 19 + 3) * canvas.width;
      const y = pseudoRandom(index * 23 + 7) * canvas.height;
      const alpha = 0.008 + pseudoRandom(index * 31 + 11) * 0.012;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1.1, 1.1);
    }
    ctx.restore();
  }
}

function renderWaterMotionEffects(ctx, effects, camera, viewport) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const wake of effects.wakeTrails) {
    const projected = wake.points
      .map((point) => ({
        projected: projectPoint(point.center, camera, viewport),
        width: point.width,
        turbulence: point.turbulence,
      }))
      .filter((entry) => entry.projected);
    if (projected.length < 2) {
      continue;
    }

    const averageDepth =
      projected.reduce((total, entry) => total + entry.projected.depth, 0) / projected.length;
    const averageWidth =
      projected.reduce((total, entry) => total + entry.width, 0) / projected.length;
    const baseWidth = clamp((averageWidth / Math.max(0.25, averageDepth)) * 180, 1.6, 5.4);
    const isCenterWake = wake.kind === "center";
    for (let index = 1; index < projected.length; index += 1) {
      const entry = projected[index];
      const previous = projected[index - 1];
      const segmentAngle = Math.atan2(
        entry.projected.y - previous.projected.y,
        entry.projected.x - previous.projected.x
      );
      const fade = 1 - index / Math.max(1, projected.length);
      const patchNoise = pseudoRandom(index * 47 + (wake.side ?? 0) * 13 + Math.floor(averageDepth * 10));
      const radiusX =
        baseWidth *
        (isCenterWake ? 1.25 : 0.86) *
        (0.72 + entry.turbulence * 0.52 + patchNoise * 0.22);
      const radiusY = baseWidth * (isCenterWake ? 0.48 : 0.28) * (0.7 + patchNoise * 0.3);
      const outerAlpha = wake.opacity * fade * (isCenterWake ? 0.34 : 0.2) * entry.turbulence;
      const innerAlpha = wake.opacity * fade * (isCenterWake ? 0.6 : 0.46) * entry.turbulence;
      const outer = ctx.createRadialGradient(
        entry.projected.x,
        entry.projected.y,
        0,
        entry.projected.x,
        entry.projected.y,
        radiusX * 1.3
      );
      outer.addColorStop(0, `rgba(122, 183, 222, ${outerAlpha})`);
      outer.addColorStop(1, "rgba(122, 183, 222, 0)");
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.ellipse(
        entry.projected.x,
        entry.projected.y,
        radiusX * 1.35,
        radiusY * 1.6,
        segmentAngle,
        0,
        Math.PI * 2
      );
      ctx.fill();

      if (!isCenterWake && patchNoise < 0.24) {
        continue;
      }

      ctx.fillStyle = `rgba(239, 248, 255, ${innerAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        entry.projected.x,
        entry.projected.y,
        radiusX * (isCenterWake ? 0.5 : 0.34),
        radiusY * (isCenterWake ? 0.58 : 0.38),
        segmentAngle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  for (const ring of effects.rippleRings) {
    const center = projectPoint(ring.center, camera, viewport);
    const xAxis = projectPoint(addVec3(ring.center, vec3(ring.radius, 0, 0)), camera, viewport);
    const zAxis = projectPoint(addVec3(ring.center, vec3(0, 0, ring.radius)), camera, viewport);
    if (!center || !xAxis || !zAxis) {
      continue;
    }

    const radiusX = Math.hypot(xAxis.x - center.x, xAxis.y - center.y);
    const radiusY = Math.hypot(zAxis.x - center.x, zAxis.y - center.y);
    const flecks = 18;
    for (let index = 0; index < flecks; index += 1) {
      const angle = (Math.PI * 2 * index) / flecks;
      const noise = pseudoRandom(index * 37 + Math.floor(radiusX * 10));
      if (noise < 0.24) {
        continue;
      }
      const x = center.x + Math.cos(angle) * radiusX;
      const y = center.y + Math.sin(angle) * radiusY;
      const alpha = ring.opacity * (0.36 + noise * 0.28);
      ctx.fillStyle = `rgba(216, 235, 255, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(
        x,
        y,
        clamp((radiusX + radiusY) * 0.009, 0.65, 2.8),
        clamp((radiusX + radiusY) * 0.004, 0.38, 1.4),
        angle,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  for (const patch of effects.foamPatches) {
    const center = projectPoint(patch.center, camera, viewport);
    const major = projectPoint(
      addVec3(patch.center, scaleVec3(patch.majorAxis, patch.radiusX)),
      camera,
      viewport
    );
    const minor = projectPoint(
      addVec3(patch.center, scaleVec3(patch.minorAxis, patch.radiusZ)),
      camera,
      viewport
    );
    if (!center || !major || !minor) {
      continue;
    }

    const radiusX = clamp(Math.hypot(major.x - center.x, major.y - center.y), 0.85, 7.5);
    const radiusY = clamp(Math.hypot(minor.x - center.x, minor.y - center.y), 0.45, 3.8);
    const rotation = Math.atan2(major.y - center.y, major.x - center.x);
    ctx.fillStyle = `rgba(241, 249, 255, ${patch.opacity})`;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const particle of effects.particles ?? []) {
    const center = projectPoint(particle.center, camera, viewport);
    if (!center) {
      continue;
    }

    const velocityPoint = particle.velocity
      ? projectPoint(addVec3(particle.center, particle.velocity), camera, viewport)
      : null;
    const depthScale = viewport.height / Math.max(14, center.depth);
    const baseRadius = clamp(particle.radius * depthScale, 0.55, 5.8);
    const motionRotation = velocityPoint
      ? Math.atan2(velocityPoint.y - center.y, velocityPoint.x - center.x)
      : particle.rotation;
    const stretch =
      particle.kind === "impact-spray" || particle.kind === "bow-spray"
        ? particle.stretch * 1.28
        : particle.stretch;
    const radiusX = baseRadius * stretch;
    const radiusY =
      particle.kind === "ripple-foam"
        ? baseRadius * 0.42
        : particle.kind === "wake-foam"
          ? baseRadius * 0.58
          : baseRadius * 0.28;
    const alpha = clamp(particle.opacity, 0, 0.68);
    const color =
      particle.kind === "impact-spray"
        ? "247, 252, 255"
        : particle.kind === "bow-spray"
          ? "226, 245, 255"
          : particle.kind === "ripple-foam"
            ? "216, 237, 250"
            : "238, 249, 255";

    const glow = ctx.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      Math.max(radiusX, radiusY) * 1.25
    );
    glow.addColorStop(0, `rgba(${color}, ${alpha})`);
    glow.addColorStop(0.55, `rgba(${color}, ${alpha * 0.32})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, radiusX, radiusY, motionRotation, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderScene(ctx, canvas, state, shipModel, dom) {
  const viewport = { width: canvas.width, height: canvas.height };
  const camera = buildCamera(state, canvas);
  state.camera.eye = camera.eye;
  const lightingPlan = createLightingBandPlan({
    profile: state.focus === "lighting" ? defaultLightingProfile : getLightingProfile(defaultLightingProfile).name,
    importance: state.focus === "lighting" ? "critical" : "high",
  });
  const nearLighting = lightingPlan.bands.find((entry) => entry.band === "near") ?? lightingPlan.bands[0];
  const lightDir = normalizeVec3(vec3(-0.34, 0.72, -0.6));
  const lightingSnapshot = state.lightingDetail.getSnapshot();
  const waterRayTracePlan = createWaterRayTraceLightingPlan({
    reflections: nearLighting.rtParticipation.reflections,
    directShadows: nearLighting.rtParticipation.directShadows,
    quality: lightingSnapshot.currentLevel.id,
    primaryShadowSource: nearLighting.primaryShadowSource,
  });
  const shadowPostProcessPlan = createRayTracedShadowPostProcessPlan({
    directShadows: nearLighting.rtParticipation.directShadows,
    quality: lightingSnapshot.currentLevel.id,
    primaryShadowSource: nearLighting.primaryShadowSource,
  });
  const visuals = resolveVisualConfig(
    nearLighting,
    lightingSnapshot,
    mergeVisualOverrides(createTimeOfDayVisualOverrides(state), state.demoDescription?.visuals)
  );
  state.demoVisuals = visuals;
  const reflectionStrength = visuals.reflectionStrength * waterRayTracePlan.reflectionStrengthMultiplier;
  const shadowStrength = visuals.shadowAccent * shadowPostProcessPlan.shadowStrengthMultiplier;
  drawSkyAndShore(ctx, canvas, state, visuals);

  const waterTriangles = [];
  const waterReflectionTriangles = [];
  const sceneTriangles = [];
  const water = buildWaterBands(
    state,
    state.fluidDetail.getSnapshot().currentLevel.config,
    visuals
  );
  for (const bandMesh of water.bandMeshes) {
    const bandAccent = bandMesh.band === "near" ? 0.06 : bandMesh.band === "mid" ? 0.04 : 0;
    for (let index = 0; index < bandMesh.indices.length; index += 3) {
      const a = bandMesh.positions[bandMesh.indices[index]];
      const b = bandMesh.positions[bandMesh.indices[index + 1]];
      const c = bandMesh.positions[bandMesh.indices[index + 2]];
      const normalA = bandMesh.normals[bandMesh.indices[index]];
      const normalB = bandMesh.normals[bandMesh.indices[index + 1]];
      const normalC = bandMesh.normals[bandMesh.indices[index + 2]];
      const colorA = bandMesh.colors[bandMesh.indices[index]];
      const colorB = bandMesh.colors[bandMesh.indices[index + 1]];
      const colorC = bandMesh.colors[bandMesh.indices[index + 2]];
      const baseColor = scaleColor(addColor(addColor(colorA, colorB), colorC), 1 / 3);
      const faceNormal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
      const normal = normalizeVec3(addVec3(addVec3(normalA, normalB), normalC));
      const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
      if (projected.some((value) => value === null)) {
        continue;
      }
      waterTriangles.push({
        points: projected,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
        vertices: [a, b, c],
        faceNormal,
        normal: normal.y > 0.15 ? normal : faceNormal,
        vertexNormals: [normalA, normalB, normalC],
        vertexColors: [colorA, colorB, colorC],
        normalSmoothing: 1,
        normalSmoothingSubdivisions: state.hitDrivenPathtraceEnabled ? 2 : 1,
        baseColor,
        accent: bandAccent,
        material: {
          name: "water-surface",
          color: baseColor,
          roughness: 0.2,
          metallic: 0,
          emissive: { r: 0, g: 0, b: 0 },
        },
        reflection: 1,
        surfaceType: "water",
      });
    }
  }

  const waterMotionEffects = buildWaterMotionEffects(state);
  const lightSources = collectSceneLightSources(state, visuals);

  pushHarborGeometry(camera, viewport, sceneTriangles, state, visuals);
  pushHarborWaterReflections(
    camera,
    viewport,
    waterReflectionTriangles,
    state,
    visuals,
    waterRayTracePlan
  );
  const cloth = buildClothSurface(
    state,
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    visuals
  );
  const renderCloth = shouldRenderClothValidationSurface(state);
  const clothNormals = buildSmoothVertexNormalsFromIndexedTriangles(cloth.positions, cloth.indices);
  if (renderCloth) {
    for (let index = 0; index < cloth.indices.length; index += 3) {
      const ia = cloth.indices[index];
      const ib = cloth.indices[index + 1];
      const ic = cloth.indices[index + 2];
      const a = cloth.positions[ia];
      const b = cloth.positions[ib];
      const c = cloth.positions[ic];
      const normalA = clothNormals[ia];
      const normalB = clothNormals[ib];
      const normalC = clothNormals[ic];
      const faceNormal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
      const normal = normalizeVec3(addVec3(addVec3(normalA, normalB), normalC));
      const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
      if (projected.some((value) => value === null)) {
        continue;
      }
      sceneTriangles.push({
        points: projected,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
        vertices: [a, b, c],
        faceNormal,
        normal,
        vertexNormals: [normalA, normalB, normalC],
        normalSmoothing: 0.86,
        normalSmoothingSubdivisions: state.hitDrivenPathtraceEnabled ? 2 : 1,
        baseColor: cloth.color,
        accent: cloth.band === "near" ? 0.1 : 0.04,
        material: {
          name: "flag-cloth",
          color: cloth.color,
          roughness: 0.94,
          metallic: 0,
          emissive: { r: 0, g: 0, b: 0 },
        },
        reflection: 0,
        surfaceType: "cloth",
      });
    }
  }

  for (const ship of state.ships) {
    const activeShipModel = resolveShipModel(state, ship, shipModel);
    buildWaterReflectionTrianglesFromMesh(
      activeShipModel,
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE },
      ship.tint,
      camera,
      viewport,
      state,
      waterReflectionTriangles,
      {
        baseAlpha: 0.09 + reflectionStrength * 0.08,
        intensity: (0.74 + reflectionStrength * 0.36) * waterRayTracePlan.sceneReflectionIntensity,
        traceKind: "ship-reflection",
        waterTint: mixColor(visuals.waterNear, visuals.waterFar, 0.36),
        maxReflectionHeight: ship.modelKey === "cutter" ? 1.65 : 2.15,
        reflectionFadeHeight: ship.modelKey === "cutter" ? 1.65 : 2.05,
        roughnessDamping: 0.86,
      }
    );
    buildTrianglesFromMesh(
      activeShipModel,
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE },
      ship.tint,
      camera,
      viewport,
      sceneTriangles,
      {
        accent: nearLighting.rtParticipation.directShadows === "premium" ? 0.08 : 0.02,
        reflection: 0,
        normalSmoothing: 1,
        normalSmoothingSubdivisions: state.hitDrivenPathtraceEnabled ? 3 : 1,
        surfaceType: "ship",
      }
    );
  }

  drawTriangles(
    ctx,
    waterTriangles,
    lightDir,
    reflectionStrength,
    camera,
    shadowStrength,
    [],
    visuals.lightingEnvironment,
    shadowPostProcessPlan
  );
  renderCelestialWaterReflection(ctx, canvas, state, reflectionStrength, visuals);
  drawWaterReflectionTriangles(ctx, waterReflectionTriangles, waterRayTracePlan);
  for (const ship of state.ships) {
    renderShipShadow(
      ctx,
      resolveShipModel(state, ship, shipModel),
      ship,
      state,
      camera,
      viewport,
      lightDir,
      shadowStrength,
      shadowPostProcessPlan
    );
    renderRayTracedWaterOcclusion(
      ctx,
      resolveShipModel(state, ship, shipModel),
      ship,
      state,
      camera,
      viewport,
      lightDir,
      shadowStrength
    );
  }
  if (renderCloth) {
    renderFlagShadow(ctx, cloth, camera, viewport, lightDir, shadowStrength, shadowPostProcessPlan);
  }
  for (const source of lightSources.reflectionLights) {
    renderWaterLightReflection(ctx, source, state, camera, viewport);
  }
  renderWaterMotionEffects(ctx, waterMotionEffects, camera, viewport);
  renderWaterHighlights(ctx, water.bandMeshes, state, camera, viewport);
  drawTriangles(
    ctx,
    sceneTriangles,
    lightDir,
    reflectionStrength,
    camera,
    shadowStrength,
    lightSources.directLights,
    visuals.lightingEnvironment,
    shadowPostProcessPlan
  );
  if (renderCloth) {
    renderFlagPole(ctx, camera, viewport);
    renderClothAccent(ctx, cloth, camera, viewport);
  }
  renderLighthouseBeam(ctx, state, camera, viewport, visuals);
  for (const source of lightSources.directLights) {
    renderDirectLightGlow(ctx, source, camera, viewport);
  }
  for (const ship of state.ships) {
    renderShipRigging(ctx, ship, camera, viewport);
  }
  renderSprays(ctx, state.sprays, camera, viewport);
  renderAtmosphericGrade(ctx, canvas, state, visuals);

  const debugSnapshot = state.debugSession.getSnapshot();
  const quality = {
    fluid: state.fluidDetail.getSnapshot(),
    cloth: state.clothDetail.getSnapshot(),
    lighting: lightingSnapshot,
  };

  const sceneMetrics = [
    `focus: ${state.focus}`,
    `time of day: ${visuals.timeOfDayMode}${visuals.timeOfDayMode === TIME_OF_DAY_CYCLE ? ` (${visuals.timeOfDayPhase.toFixed(2)})` : ""}`,
    `ships: ${state.ships.length} active GLTF hulls across ${new Set(state.ships.map((ship) => ship.modelKey)).size} model families`,
    `moonlight: cold overhead key + ${HARBOR_TORCHES.length + state.ships.reduce((total, ship) => total + (Array.isArray(ship.lanterns) ? ship.lanterns.length : 0), 0)} warm deck and harbor lights`,
    `physics snapshot: ${state.physics.snapshot.stage} (${state.physics.snapshot.stability})`,
    `physics contacts: ${state.contactCount}`,
    `mass split: ${state.ships.map((ship) => `${ship.id} ${(getShipMass(ship, resolveShipModel(state, ship, shipModel)) / 1000).toFixed(1)}t`).join(" · ")}`,
    `cloth band: ${renderCloth ? `${cloth.band} -> ${cloth.representation.output}` : "hidden outside cloth/integrated focus"}`,
    `fluid near band: ${water.bandMeshes[0].representation.output}; horizon water extends ${Math.round(Math.max(...water.bandMeshes.flatMap((band) => band.positions.map((point) => point.z))))}m`,
    `lighting profile: ${lightingPlan.profile} (${lightingDistanceBands.length} bands)`,
  ];
  const qualityMetrics = [
    `fluid detail: ${quality.fluid.currentLevel.id} (${quality.fluid.currentLevel.config.nearResolution} near cells)`,
    `cloth detail: ${quality.cloth.currentLevel.id} (${quality.cloth.currentLevel.config.cols}x${quality.cloth.currentLevel.config.rows})`,
    `lighting detail: ${quality.lighting.currentLevel.id}`,
    `near shadows: ${nearLighting.primaryShadowSource}`,
    `near reflections: ${nearLighting.rtParticipation.reflections}`,
    `scene shadow sample: ${shadowPostProcessPlan.sampleMode}`,
    `scene shadow pass: ${shadowPostProcessPlan.shadowMask}`,
    `polygon shadows: ${(shadowPostProcessPlan.polygonShadowContribution * 100).toFixed(0)}%`,
    `water reflection pass: ${waterRayTracePlan.reflectionGeometry}`,
    `water reflection resolve: ${waterRayTracePlan.reflectionResolve}`,
    `water shadow pass: ${waterRayTracePlan.shadowOcclusion}`,
    `water shadow resolve: ${waterRayTracePlan.shadowResolve}`,
    `performance mode: ${state.adaptivePerformance ? "adaptive" : "fixed maximum"}`,
    `governor pressure: ${state.adaptivePerformance ? state.lastDecision.pressureLevel : "disabled"}`,
    `frame avg: ${state.lastDecision.metrics.averageFrameTimeMs.toFixed(2)} ms`,
  ];
  const debugMetrics = [
    `queue samples: ${debugSnapshot.queues.sampleCount}`,
    `dispatch avg: ${(debugSnapshot.dispatch.averageDurationMs ?? 0).toFixed(2)} ms`,
    `ready lane peak: ${debugSnapshot.dag.peakReadyLaneDepth.toFixed(1)}`,
    `pipeline samples: ${debugSnapshot.pipeline.sampleCount}`,
    `tracked memory: ${(debugSnapshot.memory.totalTrackedBytes / (1024 * 1024)).toFixed(1)} MB`,
  ];
  const sceneNotes =
    state.focus === "physics"
      ? [
          "Stable world snapshots are taken after the authoritative rigid-body commit and before visual follow-up work.",
          "The ships collide with mass-weighted impulses and positional correction, so the heavier hull keeps more of its line.",
          "Moonlight keeps the overall read legible while lanterns and torches make collision moments easy to track against the water.",
        ]
        : SCENE_NOTES;
  const custom = state.demoDescription ?? null;

  setListContent(
    dom.sceneMetrics,
    Array.isArray(custom?.sceneMetrics) ? custom.sceneMetrics : sceneMetrics
  );
  setListContent(
    dom.qualityMetrics,
    Array.isArray(custom?.qualityMetrics) ? custom.qualityMetrics : qualityMetrics
  );
  setListContent(
    dom.debugMetrics,
    Array.isArray(custom?.debugMetrics) ? custom.debugMetrics : debugMetrics
  );
  setListContent(dom.sceneNotes, Array.isArray(custom?.notes) ? custom.notes : sceneNotes);

  dom.status.textContent =
    typeof custom?.status === "string"
      ? custom.status
      : `3D scene live · ${state.lastDecision.metrics.fps.toFixed(1)} FPS`;
  dom.details.textContent =
    typeof custom?.details === "string"
      ? custom.details
      : state.focus === "physics"
        ? `Stable world snapshots are emitted from ${state.physics.plan.snapshotStageId} after the authoritative solver; the heavier hull now carries momentum through mass-aware collision impulses while cloth and fluid remain downstream.`
        : state.showcaseRealisticModelsEnabled
          ? `GLTF ships now mix a brigantine and a cutter against modeled harbor assets, procedural shoreline walls, and extended horizon water; cloth, fluid, and ship-local lighting stay continuous with ${state.adaptivePerformance ? `governor pressure at ${state.lastDecision.pressureLevel}` : "fixed maximum-quality rendering"}.`
          : `GLTF ships use the legacy brigantine and placeholder harbor blocks while cloth, fluid, and ship-local lighting stay continuous with ${state.adaptivePerformance ? `governor pressure at ${state.lastDecision.pressureLevel}` : "fixed maximum-quality rendering"}.`;
}

function updateSceneState(state, dt, shipModel) {
  updateShips(state, dt, shipModel);
  updateWaveImpulses(state, dt);
  updateSpray(state, dt);
  const clothPresentation = resolveClothPresentation(
    state,
    state.clothDetail.getSnapshot().currentLevel.config
  );
  const clothState = ensureShowcaseClothState(
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    clothPresentation
  );
  advanceShowcaseClothSimulationState(clothState, {
    dt,
    time: state.time,
    flagMotion: readVisualNumber(state.demoVisuals?.flagMotion, 0.92),
    waveInfluence: sampleWave(state, FLAG_LAYOUT.origin.x + FLAG_LAYOUT.width * 0.55, FLAG_LAYOUT.origin.z + FLAG_LAYOUT.width * 0.48, state.time),
  });
  updatePhysicsSnapshot(state, shipModel);
}

function syncTextState(state, shipModel) {
  const snapshot = {
    coordinateSystem: "right-handed world; +x right, +y up, +z forward from the shore",
    focus: state.focus,
    stress: state.stress,
    ships: state.ships.map((ship) => ({
      id: ship.id,
      modelKey: ship.modelKey ?? "brigantine",
      x: Number(ship.position.x.toFixed(2)),
      y: Number(ship.position.y.toFixed(2)),
      z: Number(ship.position.z.toFixed(2)),
      vx: Number(ship.velocity.x.toFixed(2)),
      vz: Number(ship.velocity.z.toFixed(2)),
      massKg: Math.round(getShipMass(ship, resolveShipModel(state, ship, shipModel))),
      lanterns: Array.isArray(ship.lanterns) ? ship.lanterns.length : 0,
    })),
    shipPhysics: Object.fromEntries(
      state.ships.map((ship) => [ship.id, resolveShipModel(state, ship, shipModel)?.physics ?? null])
    ),
    sprays: state.sprays.length,
    waveImpulses: state.waveImpulses.length,
    pressure: state.lastDecision?.pressureLevel ?? "stable",
    performanceMode: state.performanceMode,
    adaptivePerformance: state.adaptivePerformance,
    hitDrivenPathtraceEnabled: state.hitDrivenPathtraceEnabled,
    physics: {
      profile: state.physics.profile,
      snapshotStageId: state.physics.plan.snapshotStageId,
      workerJobCount: state.physics.manifest.jobs.length,
      snapshot: state.physics.snapshot,
    },
    package: state.demoDescription?.textState ?? null,
  };
  window.render_game_to_text = () => JSON.stringify(snapshot);
  window.advanceTime = (ms) => {
    const step = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < step; index += 1) {
      state.frame += 1;
      state.time += 1 / 60;
      updateSceneState(state, 1 / 60, shipModel);
      state.lastDecision = recordTelemetry(state, 16.67 + (state.stress ? 6.5 : 0));
    }
  };
}

export async function mountGpuShowcase(options = {}, featureFlags = null) {
  injectStyles();
  const root = options.root ?? document.body;
  root.classList?.add?.(ROOT_CLASS);
  const captureSettings = resolveCaptureSettings(options);
  const timeOfDayMode = resolveTimeOfDayMode(options);
  if (captureSettings.captureMode) {
    root.classList?.add?.(CAPTURE_CLASS);
  }
  const restoreCaptureResolution =
    captureSettings.captureMode && captureSettings.captureResolution
      ? applyCaptureResolution(root, captureSettings.captureResolution)
      : () => undefined;
  const previousMarkup = root.innerHTML;
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const previousCaptureFrame = window.__plasiusCaptureFrame;
  const focus = options.focus ?? new URLSearchParams(window.location.search).get("focus") ?? "integrated";
  const dom = buildDemoDom(root, {
    packageName: options.packageName ?? "@plasius/gpu-demo-viewer",
    title: options.title ?? DEFAULT_TITLE,
    subtitle: options.subtitle ?? DEFAULT_SUBTITLE,
  });
  dom.focusMode.value = focus;
  const state = createSceneState({
    focus,
    realisticModelsEnabled: isFeatureEnabled(featureFlags, GPU_SHOWCASE_REALISTIC_MODELS_FEATURE, true),
    hitDrivenPathtraceEnabled: isFeatureEnabled(
      featureFlags,
      GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
      true
    ),
    captureMode: captureSettings.captureMode,
    captureResolution: captureSettings.captureResolution,
    frameExport: captureSettings.frameExport,
    timeOfDayMode,
    performanceMode: captureSettings.performanceMode,
    renderScale: captureSettings.renderScale,
  });
  const assetCatalog = await (state.showcaseRealisticModelsEnabled
    ? loadShowcaseAssetCatalog()
    : createLegacyShowcaseAssetCatalog());
  const shipModel = assetCatalog.ships[assetCatalog.primaryShipKey];

  state.assetCatalog = assetCatalog;
  state.shipModel = shipModel;
  state.packageState =
    typeof options.createState === "function" ? options.createState() : undefined;
  updatePhysicsSnapshot(state, shipModel);
  state.lastDecision = recordTelemetry(state, 16.4);
  state.demoDescription = resolveSceneDescription(state, options, shipModel).description;
  syncTextState(state, shipModel);

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is required for the shared showcase.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  let animationFrameId = 0;
  let destroyed = false;

  const advanceSceneBySeconds = (dt) => {
    state.time += dt;
    state.frame += 1;
    updateSceneState(state, dt, shipModel);
    updatePackageState(state, options, shipModel, dt);
    const syntheticFrame = 14.2 + state.sprays.length * 0.1 + (state.stress ? 6.4 : 0);
    state.lastDecision = recordTelemetry(state, syntheticFrame);
  };

  const renderSingleFrame = () => {
    state.demoDescription = resolveSceneDescription(state, options, shipModel).description;
    resizeCanvasToDisplaySize(dom.canvas, state);
    renderScene(ctx, dom.canvas, state, shipModel, dom);
    syncTextState(state, shipModel);
  };

  window.__plasiusCaptureFrame = (captureOptions = {}) => {
    const stepMs = readVisualNumber(captureOptions.stepMs, 1000 / 60);
    const advanceMs = Math.max(0, stepMs);
    if (advanceMs > 0) {
      advanceSceneBySeconds(advanceMs / 1000);
    }
    renderSingleFrame();
    return {
      frame: state.frame,
      time: Number(state.time.toFixed(4)),
      width: dom.canvas.width,
      height: dom.canvas.height,
      performanceMode: state.performanceMode,
      timeOfDayMode: state.timeOfDayMode,
      hitDrivenPathtraceEnabled: state.hitDrivenPathtraceEnabled,
    };
  };

  const renderFrame = (nowMs) => {
    if (destroyed) {
      return;
    }
    if (!state.paused && !state.frameExport) {
      if (state.lastTimeMs == null) {
        state.lastTimeMs = nowMs;
      }
      const dt = Math.min(0.033, (nowMs - state.lastTimeMs) / 1000);
      state.lastTimeMs = nowMs;
      advanceSceneBySeconds(dt);
    }

    renderSingleFrame();
    animationFrameId = requestAnimationFrame(renderFrame);
  };

  const handlePauseClick = () => {
    state.paused = !state.paused;
    dom.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  };
  const handleStressChange = () => {
    state.stress = dom.stressToggle.checked;
  };
  const handleFocusChange = () => {
    state.focus = dom.focusMode.value;
    Object.assign(state.camera, {
      ...CAMERA_PRESETS[state.focus],
      target: vec3(...CAMERA_PRESETS[state.focus].target),
    });
  };

  dom.pauseButton.addEventListener("click", handlePauseClick);
  dom.stressToggle.addEventListener("change", handleStressChange);
  dom.focusMode.addEventListener("change", handleFocusChange);

  animationFrameId = requestAnimationFrame(renderFrame);
  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    dom.pauseButton.removeEventListener("click", handlePauseClick);
    dom.stressToggle.removeEventListener("change", handleStressChange);
    dom.focusMode.removeEventListener("change", handleFocusChange);
    try {
      if (typeof options.destroyState === "function") {
        options.destroyState(state.packageState);
      }
    } finally {
      state.packageState = undefined;
    }
    root.classList?.remove?.(ROOT_CLASS);
    root.classList?.remove?.(CAPTURE_CLASS);
    restoreCaptureResolution();
    root.innerHTML = previousMarkup;
    if (typeof previousRenderGameToText === "function") {
      window.render_game_to_text = previousRenderGameToText;
    } else {
      delete window.render_game_to_text;
    }
    if (typeof previousAdvanceTime === "function") {
      window.advanceTime = previousAdvanceTime;
    } else {
      delete window.advanceTime;
    }
    if (typeof previousCaptureFrame === "function") {
      window.__plasiusCaptureFrame = previousCaptureFrame;
    } else {
      delete window.__plasiusCaptureFrame;
    }
  };
  return {
    state,
    shipModel,
    canvas: dom.canvas,
    destroy,
  };
}

function updatePhysicsSnapshot(state, shipModel) {
  const rigidBodyShapes = Object.fromEntries(
    state.ships.map((ship) => [
      ship.id,
      resolveShipModel(state, ship, shipModel)?.physics?.shape ?? "box",
    ])
  );

  state.physics.snapshot = createPhysicsWorldSnapshot({
    frameId: `showcase-${state.frame}`,
    tick: state.frame,
    simulationTimeMs: Number((state.time * 1000).toFixed(2)),
    profile: state.physics.profile,
    authoritativeTransformRevision: state.frame,
    secondarySimulationRevision: state.frame,
    animationInputRevision: state.frame,
    bodyCount: state.ships.length + 2,
    dynamicBodyCount: state.ships.length,
    contactCount: state.contactCount,
    metadata: {
      collisionCount: state.collisionCount,
      contactCount: state.contactCount,
      snapshotStageId: state.physics.plan.snapshotStageId,
      rigidBodyShape: shipModel.physics.shape ?? "box",
      rigidBodyShapes,
    },
  });
}

export {
  advanceShowcaseClothSimulationState as __testOnlyAdvanceShowcaseClothSimulationState,
  buildWaterReflectionTrianglesFromMesh as __testOnlyBuildWaterReflectionTrianglesFromMesh,
  buildHarborShorelineGeometry as __testOnlyBuildHarborShorelineGeometry,
  buildWaterBands as __testOnlyBuildWaterBands,
  buildWaterMotionEffects as __testOnlyBuildWaterMotionEffects,
  buildTriangleHitPatches as __testOnlyBuildTriangleHitPatches,
  collectSceneLightSources as __testOnlyCollectSceneLightSources,
  createTimeOfDayVisualOverrides as __testOnlyCreateTimeOfDayVisualOverrides,
  createShowcaseClothSimulationState as __testOnlyCreateShowcaseClothSimulationState,
  resolveSmoothedHitNormal as __testOnlyResolveSmoothedHitNormal,
  resolveTriangleLightingContribution as __testOnlyResolveTriangleLightingContribution,
  resolveWaterAtmosphereColor as __testOnlyResolveWaterAtmosphereColor,
  resolveVisualConfig as __testOnlyResolveVisualConfig,
  shadeColor as __testOnlyShadeColor,
};

import { loadGltfModel } from "./gltf-loader.js";
import { GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE } from "./feature-flags.js";

const STYLE_ID = "plasius-product-studio-style";
const ROOT_CLASS = "plasius-product-studio-root";
const DEFAULT_PRODUCT_ASSET_URL =
  "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf";
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_MAX_DEPTH = 5;

function isFeatureEnabled(featureFlags, flagId, fallback = true) {
  if (!featureFlags || typeof featureFlags !== "object") {
    return fallback;
  }
  if (featureFlags instanceof Map) {
    return featureFlags.has(flagId) ? featureFlags.get(flagId) === true : fallback;
  }
  if (Object.hasOwn(featureFlags, flagId)) {
    return featureFlags[flagId] === true;
  }
  return fallback;
}

function injectStyles() {
  if (typeof document === "undefined" || !document.head) {
    return;
  }
  if (document.getElementById?.(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} {
      min-height: 100%;
      color: #eef5f8;
    }
    .plasius-product-studio {
      display: grid;
      min-height: min(72vh, 760px);
      background: #0d1418;
      border: 1px solid rgba(215, 229, 237, 0.18);
      overflow: hidden;
    }
    .plasius-product-studio__canvas {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      min-block-size: 520px;
      background: #0d1418;
    }
    .plasius-product-studio__status {
      position: absolute;
      inset-block-end: 16px;
      inset-inline-start: 16px;
      max-inline-size: min(460px, calc(100% - 32px));
      padding: 10px 12px;
      background: rgba(8, 13, 16, 0.78);
      border: 1px solid rgba(215, 229, 237, 0.16);
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .plasius-product-studio__status p {
      margin: 0;
    }
    .plasius-product-studio__frame {
      position: relative;
      min-height: inherit;
    }
  `;
  document.head.appendChild(style);
}

function readBoundsCenter(bounds) {
  return [
    (bounds.min[0] + bounds.max[0]) * 0.5,
    (bounds.min[1] + bounds.max[1]) * 0.5,
    (bounds.min[2] + bounds.max[2]) * 0.5,
  ];
}

function readBoundsExtent(bounds) {
  return [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
}

function expandThinBounds(bounds, minimum = 0.035) {
  const min = [...bounds.min];
  const max = [...bounds.max];
  for (let axis = 0; axis < 3; axis += 1) {
    const extent = max[axis] - min[axis];
    if (extent >= minimum) {
      continue;
    }
    const center = (min[axis] + max[axis]) * 0.5;
    min[axis] = center - minimum * 0.5;
    max[axis] = center + minimum * 0.5;
  }
  return { min, max };
}

function resolveMaterialColor(material) {
  const name = String(material?.name ?? "").toLowerCase();
  if (name.includes("chrome")) {
    return [0.82, 0.82, 0.78, 1];
  }
  if (name.includes("leather")) {
    return [0.028, 0.032, 0.036, 1];
  }
  if (name.includes("wood") && name.includes("black")) {
    return [0.045, 0.04, 0.035, 1];
  }
  if (name.includes("wood")) {
    return [0.44, 0.24, 0.12, 1];
  }
  const color = material?.color ?? { r: 0.56, g: 0.33, b: 0.22, a: 1 };
  return [color.r, color.g, color.b, color.a ?? 1];
}

function resolveMaterialKind(material) {
  const name = String(material?.name ?? "").toLowerCase();
  if (name.includes("chrome") || material?.metallic > 0.45 || material?.roughness < 0.08) {
    return 2;
  }
  if ((material?.color?.a ?? 1) < 0.75) {
    return 4;
  }
  return 1;
}

function createSceneTransform(model, options = {}) {
  const center = readBoundsCenter(model.bounds);
  const extent = readBoundsExtent(model.bounds);
  const maxExtent = Math.max(extent[0], extent[1], extent[2], 0.001);
  const scale = Number(options.productScale ?? 1.75) / maxExtent;
  const target = options.productTarget ?? [0, -0.18, -1.32];
  return (point) => [
    (point[0] - center[0]) * scale + target[0],
    (point[1] - center[1]) * scale + target[1],
    (point[2] - center[2]) * scale + target[2],
  ];
}

function transformBounds(bounds, transformPoint) {
  const corners = [
    [bounds.min[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]],
  ].map(transformPoint);
  const min = [
    Math.min(...corners.map((point) => point[0])),
    Math.min(...corners.map((point) => point[1])),
    Math.min(...corners.map((point) => point[2])),
  ];
  const max = [
    Math.max(...corners.map((point) => point[0])),
    Math.max(...corners.map((point) => point[1])),
    Math.max(...corners.map((point) => point[2])),
  ];
  return expandThinBounds({ min, max });
}

export function buildProductStudioSceneObjects(model, options = {}) {
  const transformPoint = createSceneTransform(model, options);
  const productObjects = model.primitives.map((primitive) => ({
    kind: "box",
    bounds: transformBounds(primitive.bounds, transformPoint),
    color: resolveMaterialColor(primitive.material),
    materialKind: resolveMaterialKind(primitive.material),
    ior: 1,
  }));

  return Object.freeze([
    {
      kind: "box",
      bounds: { min: [-2.6, -0.82, -3.4], max: [2.6, -0.78, 0.65] },
      color: [0.36, 0.47, 0.55, 1],
      materialKind: 1,
    },
    {
      kind: "box",
      bounds: { min: [-2.6, -0.78, -2.72], max: [2.6, 1.85, -2.67] },
      color: [0.47, 0.5, 0.5, 1],
      materialKind: 1,
    },
    {
      kind: "sphere",
      center: [0, 1.42, -1.65],
      radius: 0.24,
      color: [1, 0.82, 0.5, 1],
      emission: [9.5, 6.4, 3.1, 1],
      materialKind: 5,
    },
    ...productObjects,
  ]);
}

function resolveProductAssetUrl(options) {
  return options.productAssetUrl ?? options.assetUrl ?? DEFAULT_PRODUCT_ASSET_URL;
}

async function loadRendererModule(options) {
  const rendererLoader =
    typeof options.__rendererLoader === "function"
      ? options.__rendererLoader
      : () => import("@plasius/gpu-renderer");
  const module = await rendererLoader();
  if (typeof module.createWavefrontPathTracingComputeRenderer !== "function") {
    throw new Error("product studio renderer loader must provide createWavefrontPathTracingComputeRenderer.");
  }
  return module;
}

function buildDom(root, options) {
  root.innerHTML = `
    <section class="plasius-product-studio" aria-label="${options.title}">
      <div class="plasius-product-studio__frame">
        <canvas
          id="productStudioCanvas"
          class="plasius-product-studio__canvas"
          width="${options.width}"
          height="${options.height}"
          aria-label="${options.title}"
        ></canvas>
        <div class="plasius-product-studio__status" aria-live="polite">
          <p id="productStudioStatus">Preparing product render.</p>
        </div>
      </div>
    </section>
  `;
  const canvas = root.querySelector?.("#productStudioCanvas");
  const status = root.querySelector?.("#productStudioStatus");
  if (!canvas) {
    throw new Error("Product Studio runtime could not create its render canvas.");
  }
  return { canvas, status };
}

function createSnapshot(state) {
  return {
    mode: "product-studio",
    renderer: state.rendererMode,
    modelName: state.productModel.name,
    primitiveCount: state.productModel.primitives.length,
    triangleCount: Math.floor(state.productModel.indices.length / 3),
    sceneObjectCount: state.sceneObjects.length,
    stats: state.stats,
  };
}

function syncStatus(status, state) {
  if (!status) {
    return;
  }
  const probe = state.stats?.outputProbe;
  const sampled = probe
    ? `${probe.nonZeroSamples}/${probe.sampledPixels} sampled pixels lit`
    : "output probe unavailable";
  status.textContent =
    `${state.productModel.name}: ${state.productModel.primitives.length} primitives, ` +
    `${Math.floor(state.productModel.indices.length / 3).toLocaleString()} source triangles, ` +
    `${state.sceneObjects.length} trace objects, ${sampled}.`;
}

export async function mountGpuProductStudio(options = {}, featureFlags = null) {
  if (!isFeatureEnabled(featureFlags, GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE, true)) {
    throw new Error("Product Studio GPU showcase is disabled by feature flag.");
  }
  if (typeof document === "undefined") {
    throw new Error("Product Studio GPU showcase requires a browser document.");
  }

  injectStyles();
  const root = options.root ?? document.body;
  root.classList?.add?.(ROOT_CLASS);
  const previousMarkup = root.innerHTML;
  const previousRenderGameToText = globalThis.window?.render_game_to_text;
  const productAssetUrl = resolveProductAssetUrl(options);
  const modelLoader =
    typeof options.__modelLoader === "function" ? options.__modelLoader : loadGltfModel;
  const productModel = await modelLoader(productAssetUrl);
  const sceneObjects = buildProductStudioSceneObjects(productModel, options);
  const width = Number(options.width ?? DEFAULT_WIDTH);
  const height = Number(options.height ?? DEFAULT_HEIGHT);
  const maxDepth = Number(options.maxDepth ?? DEFAULT_MAX_DEPTH);
  const dom = buildDom(root, {
    title: options.title ?? "Product Studio",
    width,
    height,
  });
  const rendererModule = await loadRendererModule(options);
  if (
    typeof rendererModule.supportsWavefrontPathTracingCompute === "function" &&
    !rendererModule.supportsWavefrontPathTracingCompute(options)
  ) {
    throw new Error("Product Studio GPU showcase requires WebGPU wavefront compute support.");
  }
  const renderer = await rendererModule.createWavefrontPathTracingComputeRenderer({
    canvas: dom.canvas,
    width,
    height,
    maxDepth,
    sceneObjects,
    navigator: options.navigator,
    gpu: options.gpu,
    adapter: options.adapter,
    device: options.device,
    context: options.context,
  });
  const stats = await renderer.renderFrame({
    readStats: options.readStats !== false,
    readOutputProbe: options.readOutputProbe !== false,
  });
  const state = {
    mode: "product-studio",
    productAssetUrl: String(productAssetUrl),
    productModel,
    sceneObjects,
    stats,
    rendererMode: rendererModule.rendererWavefrontComputeMode ?? "webgpu-compute",
  };
  syncStatus(dom.status, state);

  if (globalThis.window) {
    globalThis.window.render_game_to_text = () => JSON.stringify(createSnapshot(state));
  }

  let destroyed = false;
  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    renderer.destroy?.();
    root.classList?.remove?.(ROOT_CLASS);
    root.innerHTML = previousMarkup;
    if (globalThis.window) {
      if (typeof previousRenderGameToText === "function") {
        globalThis.window.render_game_to_text = previousRenderGameToText;
      } else {
        delete globalThis.window.render_game_to_text;
      }
    }
  };

  return {
    state,
    productModel,
    canvas: dom.canvas,
    renderer,
    destroy,
  };
}

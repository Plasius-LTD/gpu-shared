import { loadGltfModel } from "./gltf-loader.js";

const STYLE_ID = "plasius-product-studio-wavefront-style";
const DEFAULT_PRODUCT_ASSET_URL =
  "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf";
const DEFAULT_TARGET_CENTER = Object.freeze([0, 0.74, 0]);
const DEFAULT_TARGET_SIZE = 2.25;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isFiniteVector(value) {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1]) &&
    Number.isFinite(value[2])
  );
}

function createEmptyBounds() {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  };
}

function expandBounds(bounds, point) {
  bounds.min[0] = Math.min(bounds.min[0], point[0]);
  bounds.min[1] = Math.min(bounds.min[1], point[1]);
  bounds.min[2] = Math.min(bounds.min[2], point[2]);
  bounds.max[0] = Math.max(bounds.max[0], point[0]);
  bounds.max[1] = Math.max(bounds.max[1], point[1]);
  bounds.max[2] = Math.max(bounds.max[2], point[2]);
}

function getBoundsSize(bounds) {
  return [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  ];
}

function getBoundsCenter(bounds) {
  return [
    (bounds.min[0] + bounds.max[0]) * 0.5,
    (bounds.min[1] + bounds.max[1]) * 0.5,
    (bounds.min[2] + bounds.max[2]) * 0.5,
  ];
}

function getModelBounds(model) {
  if (isFiniteVector(model?.bounds?.min) && isFiniteVector(model?.bounds?.max)) {
    return {
      min: [...model.bounds.min],
      max: [...model.bounds.max],
    };
  }

  const bounds = createEmptyBounds();
  for (const primitive of model?.primitives ?? []) {
    for (let index = 0; index < primitive.positions.length; index += 3) {
      expandBounds(bounds, [
        primitive.positions[index],
        primitive.positions[index + 1],
        primitive.positions[index + 2],
      ]);
    }
  }
  return bounds;
}

function transformPoint(point, modelCenter, scale, targetCenter) {
  return [
    (point[0] - modelCenter[0]) * scale + targetCenter[0],
    (point[1] - modelCenter[1]) * scale + targetCenter[1],
    (point[2] - modelCenter[2]) * scale + targetCenter[2],
  ];
}

function readMaterialColor(material) {
  const color = material?.color ?? {};
  return [
    Number.isFinite(color.r) ? color.r : 0.62,
    Number.isFinite(color.g) ? color.g : 0.56,
    Number.isFinite(color.b) ? color.b : 0.48,
    Number.isFinite(color.a) ? color.a : 1,
  ];
}

function readMaterialKind(material) {
  const emissive = material?.emissive ?? {};
  if ((emissive.r ?? 0) + (emissive.g ?? 0) + (emissive.b ?? 0) > 0.001) {
    return "emissive";
  }
  if ((material?.metallic ?? 0) >= 0.5) {
    return "metal";
  }
  const alpha = readMaterialColor(material)[3];
  if (alpha < 0.9) {
    return "transparent";
  }
  return "diffuse";
}

function readEmission(material) {
  const emissive = material?.emissive ?? {};
  return [
    Number.isFinite(emissive.r) ? emissive.r : 0,
    Number.isFinite(emissive.g) ? emissive.g : 0,
    Number.isFinite(emissive.b) ? emissive.b : 0,
    1,
  ];
}

function createQuadMesh({
  id,
  corners,
  color,
  emission = [0, 0, 0, 1],
  materialKind = "diffuse",
  roughness = 0.72,
  metallic = 0,
  opacity = color[3] ?? 1,
}) {
  const [a, b, c] = corners;
  const edge1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const edge2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const normal = [
    edge1[1] * edge2[2] - edge1[2] * edge2[1],
    edge1[2] * edge2[0] - edge1[0] * edge2[2],
    edge1[0] * edge2[1] - edge1[1] * edge2[0],
  ];
  const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
  const unitNormal = normal.map((value) => value / length);

  return Object.freeze({
    id,
    positions: Object.freeze(corners.flat()),
    indices: Object.freeze([0, 1, 2, 0, 2, 3]),
    normals: Object.freeze([unitNormal, unitNormal, unitNormal, unitNormal].flat()),
    color: Object.freeze([...color]),
    emission: Object.freeze([...emission]),
    materialKind,
    roughness,
    metallic,
    opacity,
  });
}

function createProductStudioEnvironmentMeshes() {
  return [
    createQuadMesh({
      id: 1,
      corners: [
        [-3.2, -0.08, 2.4],
        [3.2, -0.08, 2.4],
        [3.2, -0.08, -3.1],
        [-3.2, -0.08, -3.1],
      ],
      color: [0.48, 0.55, 0.55, 1],
      roughness: 0.82,
    }),
    createQuadMesh({
      id: 2,
      corners: [
        [-3.2, -0.08, -2.45],
        [3.2, -0.08, -2.45],
        [3.2, 2.65, -2.45],
        [-3.2, 2.65, -2.45],
      ],
      color: [0.43, 0.42, 0.38, 1],
      roughness: 0.86,
    }),
    createQuadMesh({
      id: 3,
      corners: [
        [-2.85, -0.08, -2.45],
        [-2.85, 2.55, -2.45],
        [-2.85, 2.55, 2.15],
        [-2.85, -0.08, 2.15],
      ],
      color: [0.36, 0.42, 0.45, 1],
      roughness: 0.8,
    }),
    createQuadMesh({
      id: 4,
      corners: [
        [0.78, 2.55, -0.82],
        [-0.78, 2.55, -0.82],
        [-0.78, 2.55, -1.78],
        [0.78, 2.55, -1.78],
      ],
      color: [1, 0.94, 0.78, 1],
      emission: [8.5, 7.2, 4.8, 1],
      materialKind: "emissive",
      roughness: 0,
    }),
  ];
}

function createProductStudioMeshFromPrimitive(primitive, primitiveIndex, transform) {
  if (!Array.isArray(primitive?.positions) || primitive.positions.length < 9) {
    return null;
  }

  const positions = [];
  for (let index = 0; index < primitive.positions.length; index += 3) {
    const point = transform([
      primitive.positions[index],
      primitive.positions[index + 1],
      primitive.positions[index + 2],
    ]);
    positions.push(point[0], point[1], point[2]);
  }

  const indices =
    Array.isArray(primitive.indices) && primitive.indices.length >= 3
      ? [...primitive.indices]
      : Array.from({ length: positions.length / 3 }, (_, index) => index);
  const material = primitive.material ?? {};
  const color = readMaterialColor(material);

  return Object.freeze({
    id: 1000 + primitiveIndex,
    positions: Object.freeze(positions),
    indices: Object.freeze(indices),
    normals: Array.isArray(primitive.normals) ? Object.freeze([...primitive.normals]) : null,
    color: Object.freeze(color),
    emission: Object.freeze(readEmission(material)),
    materialKind: readMaterialKind(material),
    materialRefId: 1000 + primitiveIndex,
    roughness: Number.isFinite(material.roughness) ? material.roughness : 0.72,
    metallic: Number.isFinite(material.metallic) ? material.metallic : 0,
    opacity: color[3],
  });
}

export function createProductStudioMeshes(model, options = {}) {
  const primitives = Array.isArray(model?.primitives) ? model.primitives : [];
  if (primitives.length === 0) {
    throw new Error("Product Studio model must contain at least one renderable primitive.");
  }

  const targetCenter = isFiniteVector(options.targetCenter)
    ? [...options.targetCenter]
    : [...DEFAULT_TARGET_CENTER];
  const targetSize = Number.isFinite(options.targetSize)
    ? Math.max(options.targetSize, 0.25)
    : DEFAULT_TARGET_SIZE;
  const modelBounds = getModelBounds(model);
  const modelSize = getBoundsSize(modelBounds);
  const modelCenter = getBoundsCenter(modelBounds);
  const scale = targetSize / Math.max(modelSize[0], modelSize[1], modelSize[2], 0.000001);
  const transform = (point) => transformPoint(point, modelCenter, scale, targetCenter);
  const modelMeshes = primitives
    .map((primitive, index) => createProductStudioMeshFromPrimitive(primitive, index, transform))
    .filter(Boolean);

  return Object.freeze([...createProductStudioEnvironmentMeshes(), ...modelMeshes]);
}

function ensureStyles(documentRef) {
  if (documentRef.getElementById?.(STYLE_ID)) {
    return;
  }
  const style = documentRef.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .plasius-product-studio-wavefront {
      position: relative;
      width: 100%;
      min-height: 420px;
      overflow: hidden;
      background: #0f1418;
      display: grid;
      place-items: center;
    }

    .plasius-product-studio-wavefront canvas {
      display: block;
      width: 100%;
      height: auto;
      max-height: 100%;
      aspect-ratio: 16 / 9;
      min-height: 420px;
      object-fit: contain;
    }
  `;
  documentRef.head?.appendChild?.(style);
}

function resolveRoot(options) {
  const documentRef = options.document ?? globalThis.document;
  if (options.root) {
    return options.root;
  }
  const root =
    documentRef?.querySelector?.("[data-plasius-gpu-product-studio]") ?? documentRef?.body;
  if (!root) {
    throw new Error("Product Studio requires a DOM root.");
  }
  return root;
}

function resolveRenderSize(root, options) {
  const rect = root.getBoundingClientRect?.() ?? { width: 1280, height: 720 };
  const devicePixelRatio =
    Number.isFinite(options.devicePixelRatio)
      ? options.devicePixelRatio
      : Number.isFinite(globalThis.window?.devicePixelRatio)
        ? globalThis.window.devicePixelRatio
        : 1;
  const cssWidth = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : 1280;
  const cssHeight =
    Number.isFinite(rect.height) && rect.height > 0 ? rect.height : cssWidth * (9 / 16);
  const width = Number.isFinite(options.width)
    ? Math.trunc(options.width)
    : clamp(Math.round(cssWidth * devicePixelRatio), 640, 1920);
  const height = Number.isFinite(options.height)
    ? Math.trunc(options.height)
    : clamp(Math.round(cssHeight * devicePixelRatio), 360, 1080);

  return {
    width,
    height,
  };
}

function installSnapshotHook(state) {
  if (typeof globalThis.window === "undefined") {
    return () => {};
  }
  const previous = globalThis.window.render_game_to_text;
  globalThis.window.render_game_to_text = () =>
    JSON.stringify({
      surface: "gpu-product-studio-wavefront",
      model: state.modelName,
      sourceTriangles: state.sourceTriangleCount,
      meshCount: state.meshCount,
      geometryMode: state.geometryMode,
      requiresTriangleMeshRenderer: state.requiresTriangleMeshRenderer,
      displayQuality: state.displayQuality,
      requiresMeshBvhForDisplayQuality: state.requiresMeshBvhForDisplayQuality,
      renderer: state.rendererStats,
    });
  return () => {
    if (previous === undefined) {
      delete globalThis.window.render_game_to_text;
    } else {
      globalThis.window.render_game_to_text = previous;
    }
  };
}

function countSourceTriangles(model) {
  return (model.primitives ?? []).reduce(
    (total, primitive) => total + Math.floor((primitive.indices?.length ?? 0) / 3),
    0
  );
}

async function resolveWavefrontLightingOptions(options) {
  const fallback = {
    environmentColor: [0.35, 0.43, 0.49, 1],
    ambientColor: [0.02, 0.024, 0.028, 1],
  };
  const lightingLoader =
    typeof options.__lightingLoader === "function"
      ? options.__lightingLoader
      : () => import("@plasius/gpu-lighting").catch(() => null);
  const lightingModule = await lightingLoader();

  if (
    typeof lightingModule?.createWavefrontEnvironmentLightingOptions !== "function"
  ) {
    return fallback;
  }

  return lightingModule.createWavefrontEnvironmentLightingOptions({
    preset: options.lightingPreset ?? "product-studio",
    intensity: options.lightingIntensity,
  });
}

export async function mountGpuProductStudio(options = {}, featureFlags = null) {
  const root = resolveRoot(options);
  const documentRef = options.document ?? root.ownerDocument ?? globalThis.document;
  ensureStyles(documentRef);
  const previousMarkup = root.innerHTML;
  root.innerHTML = "";
  root.classList?.add?.("plasius-product-studio-wavefront");

  const canvas = documentRef.createElement("canvas");
  canvas.dataset.plasiusGpuProductStudio = "wavefront";
  root.appendChild(canvas);

  const modelLoader =
    typeof options.__modelLoader === "function" ? options.__modelLoader : loadGltfModel;
  const rendererLoader =
    typeof options.__rendererLoader === "function"
      ? options.__rendererLoader
      : () => import("@plasius/gpu-renderer");
  const assetUrl = options.productAssetUrl ?? options.assetUrl ?? DEFAULT_PRODUCT_ASSET_URL;
  const model = await modelLoader(assetUrl);
  const meshes = createProductStudioMeshes(model, {
    targetCenter: options.targetCenter,
    targetSize: options.targetSize,
  });
  const rendererModule = await rendererLoader();
  if (typeof rendererModule.createWavefrontPathTracingComputeRenderer !== "function") {
    throw new Error("Product Studio renderer loader must provide createWavefrontPathTracingComputeRenderer.");
  }

  const size = resolveRenderSize(root, options);
  const lightingOptions = await resolveWavefrontLightingOptions(options);
  const renderer = await rendererModule.createWavefrontPathTracingComputeRenderer({
    canvas,
    width: size.width,
    height: size.height,
    maxDepth: Number.isFinite(options.maxDepth) ? options.maxDepth : 6,
    tileSize: Number.isFinite(options.tileSize) ? options.tileSize : 128,
    samplesPerPixel: Number.isFinite(options.samplesPerPixel) ? options.samplesPerPixel : 8,
    denoise: options.denoise !== false,
    displayQuality: true,
    meshes,
    camera: {
      position: [0, 1.12, 5.05],
      target: [0, 0.72, 0],
      up: [0, 1, 0],
      fovYDegrees: 43,
    },
    ...lightingOptions,
  });
  const rendererStats = renderer.renderOnce();
  const state = Object.freeze({
    featureFlags,
    modelName: model.name,
    sourceTriangleCount: countSourceTriangles(model),
    meshCount: meshes.length,
    geometryMode: "mesh-bvh-display-quality",
    requiresTriangleMeshRenderer: true,
    displayQuality: true,
    requiresMeshBvhForDisplayQuality: true,
    rendererStats,
  });
  const restoreSnapshotHook = installSnapshotHook(state);

  return Object.freeze({
    state,
    model,
    canvas,
    renderer,
    meshes,
    destroy() {
      restoreSnapshotHook();
      renderer.destroy();
      root.classList?.remove?.("plasius-product-studio-wavefront");
      root.innerHTML = previousMarkup;
    },
  });
}

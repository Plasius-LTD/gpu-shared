import { createGpuDebugSession } from "@plasius/gpu-debug";
import {
  createLightingBandPlan,
  createRayTracedShadowPostProcessPlan,
} from "@plasius/gpu-lighting";
import {
  createDeviceProfile,
  createGpuPerformanceGovernor,
  createQualityLadderAdapter,
} from "@plasius/gpu-performance";

import {
  GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
} from "./feature-flags.js";
import { loadGltfModel } from "./gltf-loader.js";

const STYLE_ID = "plasius-product-studio-style";
const ROOT_CLASS = "plasius-product-studio-root";
const CAPTURE_CLASS = "plasius-product-studio-root--capture";
const DEFAULT_PRODUCT_ASSET_URL =
  "/data/models/eames-lounge-chair-ottoman/Eames_Lounge_Chair_Ottoman.gltf";
const DEFAULT_CANVAS_WIDTH = 1440;
const DEFAULT_CANVAS_HEIGHT = 960;
const CAPTURE_RENDER_SCALE = 1.65;

const ANGLE_PRESETS = Object.freeze({
  hero: Object.freeze({ yaw: -0.58, pitch: 0.18, distanceScale: 2.05 }),
  leather: Object.freeze({ yaw: -0.82, pitch: 0.28, distanceScale: 1.82 }),
  wood: Object.freeze({ yaw: -0.12, pitch: 0.22, distanceScale: 2.0 }),
  turntable: Object.freeze({ yaw: -0.58, pitch: 0.2, distanceScale: 2.04 }),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function vec3(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function addVec3(a, b) {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function subVec3(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scaleVec3(a, scale) {
  return vec3(a.x * scale, a.y * scale, a.z * scale);
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
  return scaleVec3(a, 1 / length);
}

function mixColor(a, b, t) {
  return {
    r: mix(a.r, b.r, t),
    g: mix(a.g, b.g, t),
    b: mix(a.b, b.b, t),
    a: mix(a.a ?? 1, b.a ?? 1, t),
  };
}

function scaleColor(color, scale) {
  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
    a: color.a ?? 1,
  };
}

function addColor(a, b) {
  return {
    r: a.r + b.r,
    g: a.g + b.g,
    b: a.b + b.b,
    a: a.a ?? 1,
  };
}

function colorToRgba(color, alpha = color.a ?? 1) {
  return `rgba(${Math.round(clamp(color.r, 0, 1) * 255)}, ${Math.round(
    clamp(color.g, 0, 1) * 255
  )}, ${Math.round(clamp(color.b, 0, 1) * 255)}, ${clamp(alpha, 0, 1)})`;
}

function pseudoRandom(value) {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
}

function rotateY(point, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return vec3(point.x * cos - point.z * sin, point.y, point.x * sin + point.z * cos);
}

function getBoundsCenter(bounds) {
  return vec3(
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  );
}

function getBoundsSize(bounds) {
  return vec3(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2]
  );
}

function isTruthyQueryValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

function isFalsyQueryValue(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["0", "false", "no", "off"].includes(normalized);
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
    // Browser query flags are optional in tests and server-side environments.
  }

  return undefined;
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
  return typeof queryValue === "boolean" ? queryValue : fallback;
}

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${ROOT_CLASS} {
      min-height: 100vh;
      background: #e9e9e6;
      color: #111318;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .plasius-product-studio {
      min-height: 100vh;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 0;
      background: linear-gradient(180deg, #f5f5f3 0%, #d9dbd8 100%);
    }
    .plasius-product-studio__stage {
      position: relative;
      min-height: 100vh;
      overflow: hidden;
    }
    .plasius-product-studio__canvas {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      background: #efefed;
    }
    .plasius-product-studio__toolbar {
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: 18px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(246, 247, 244, 0.78);
      border: 1px solid rgba(18, 22, 26, 0.12);
      backdrop-filter: blur(16px);
    }
    .plasius-product-studio__toolbar button,
    .plasius-product-studio__toolbar select {
      min-height: 34px;
      border: 1px solid rgba(14, 18, 24, 0.18);
      background: rgba(255, 255, 255, 0.9);
      color: #15181d;
      padding: 0 10px;
      font: inherit;
      border-radius: 6px;
    }
    .plasius-product-studio__toolbar label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #30343a;
    }
    .plasius-product-studio__side {
      min-height: 100vh;
      padding: 18px;
      background: rgba(249, 249, 247, 0.86);
      border-left: 1px solid rgba(20, 25, 32, 0.12);
      overflow: auto;
    }
    .plasius-product-studio__side h1 {
      margin: 0 0 10px;
      font-size: 18px;
      font-weight: 650;
      letter-spacing: 0;
    }
    .plasius-product-studio__status {
      margin: 0 0 16px;
      font-size: 13px;
      line-height: 1.42;
      color: #3d4249;
    }
    .plasius-product-studio__metrics {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
      color: #2f343b;
    }
    .plasius-product-studio__metrics li {
      padding: 10px 0;
      border-top: 1px solid rgba(18, 24, 30, 0.1);
    }
    .${CAPTURE_CLASS} .plasius-product-studio {
      display: block;
    }
    .${CAPTURE_CLASS} .plasius-product-studio__side,
    .${CAPTURE_CLASS} .plasius-product-studio__toolbar {
      display: none;
    }
    .${CAPTURE_CLASS} .plasius-product-studio__canvas {
      width: 100vw;
      height: 100vh;
    }
    @media (max-width: 900px) {
      .plasius-product-studio {
        grid-template-columns: 1fr;
      }
      .plasius-product-studio__side {
        min-height: auto;
        border-left: 0;
        border-top: 1px solid rgba(20, 25, 32, 0.12);
      }
    }
  `;
  document.head?.appendChild(style);
}

function buildDemoDom(root, options) {
  root.innerHTML = `
    <main class="plasius-product-studio">
      <section class="plasius-product-studio__stage">
        <canvas id="productCanvas" class="plasius-product-studio__canvas" width="${DEFAULT_CANVAS_WIDTH}" height="${DEFAULT_CANVAS_HEIGHT}"></canvas>
        <div class="plasius-product-studio__toolbar">
          <button id="productPauseButton" type="button">Pause</button>
          <label>
            Angle
            <select id="productAngle">
              <option value="hero">hero</option>
              <option value="leather">leather</option>
              <option value="wood">wood</option>
              <option value="turntable">turntable</option>
            </select>
          </label>
          <label>
            Quality
            <select id="productQuality">
              <option value="max">max</option>
              <option value="adaptive">adaptive</option>
              <option value="preview">preview</option>
            </select>
          </label>
        </div>
      </section>
      <aside class="plasius-product-studio__side">
        <h1>${options.title}</h1>
        <p id="productStatus" class="plasius-product-studio__status">Loading product scene...</p>
        <ul id="productMetrics" class="plasius-product-studio__metrics"></ul>
      </aside>
    </main>
  `;

  return {
    canvas: root.querySelector("#productCanvas"),
    pauseButton: root.querySelector("#productPauseButton"),
    angle: root.querySelector("#productAngle"),
    quality: root.querySelector("#productQuality"),
    status: root.querySelector("#productStatus"),
    metrics: root.querySelector("#productMetrics"),
  };
}

function setListContent(element, values) {
  if (element) {
    element.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
  }
}

function resolveQueryParam(...names) {
  try {
    const params = new URLSearchParams(globalThis.window?.location?.search ?? "");
    for (const name of names) {
      const value = params.get(name);
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  } catch {
    // Query parameters are optional outside browser execution.
  }
  return null;
}

function toAbsoluteBrowserUrl(value) {
  try {
    return new URL(value, globalThis.window?.location?.href ?? "http://localhost/").href;
  } catch {
    return value;
  }
}

export function resolveProductStudioAssetUrl(options = {}) {
  const explicit =
    options.productAssetUrl ??
    options.modelUrl ??
    options.assetUrl ??
    resolveQueryParam("productAssetUrl", "modelUrl", "assetUrl");
  if (explicit) {
    return toAbsoluteBrowserUrl(explicit);
  }

  const namedAsset = resolveQueryParam("productAsset", "model", "asset");
  if (
    !namedAsset ||
    String(namedAsset).trim().toLowerCase() === "eames-lounge-chair-ottoman" ||
    String(namedAsset).trim().toLowerCase() === "eames"
  ) {
    return toAbsoluteBrowserUrl(DEFAULT_PRODUCT_ASSET_URL);
  }

  return toAbsoluteBrowserUrl(namedAsset);
}

function getCanvasDisplaySize(canvas) {
  const rect =
    typeof canvas.getBoundingClientRect === "function"
      ? canvas.getBoundingClientRect()
      : null;
  const width = Math.round(rect?.width ?? canvas.clientWidth ?? canvas.width);
  const height = Math.round(rect?.height ?? canvas.clientHeight ?? canvas.height);

  return {
    width: Math.max(1, width || DEFAULT_CANVAS_WIDTH),
    height: Math.max(1, height || DEFAULT_CANVAS_HEIGHT),
  };
}

function resizeCanvasToDisplaySize(canvas, state) {
  const display = getCanvasDisplaySize(canvas);
  const deviceScale = Math.max(1, globalThis.devicePixelRatio ?? 1);
  const requestedScale = state.captureMode ? CAPTURE_RENDER_SCALE : deviceScale;
  const qualityScale =
    state.quality === "preview" ? 1 : state.quality === "adaptive" ? 1.25 : requestedScale;
  const scale = clamp(qualityScale, 1, state.captureMode ? 2 : 1.65);
  const width = Math.round(display.width * scale);
  const height = Math.round(display.height * scale);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  state.renderScale = scale;
}

function buildProductStudioCamera(model, canvas, state) {
  const preset = ANGLE_PRESETS[state.angle] ?? ANGLE_PRESETS.hero;
  const bounds = model.bounds;
  const size = getBoundsSize(bounds);
  const maxSize = Math.max(size.x, size.y, size.z, 0.1);
  const center = getBoundsCenter(bounds);
  const yaw =
    state.angle === "turntable"
      ? preset.yaw + state.turntablePhase
      : preset.yaw + state.cameraYawOffset;
  const pitch = preset.pitch;
  const distance = maxSize * preset.distanceScale * state.cameraDistanceScale;
  const target = addVec3(center, vec3(size.x * 0.08, size.y * -0.03, 0));
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
    fov: 36,
    aspect: canvas.width / canvas.height,
    boundsSize: size,
  };
}

function projectPoint(point, camera, viewport) {
  const relative = subVec3(point, camera.eye);
  const viewX = dotVec3(relative, camera.right);
  const viewY = dotVec3(relative, camera.up);
  const viewZ = dotVec3(relative, camera.forward);
  if (viewZ <= 0.05) {
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

function getVertex(values, vertexIndex) {
  const offset = vertexIndex * 3;
  return vec3(values[offset], values[offset + 1], values[offset + 2]);
}

function getUv(values, vertexIndex) {
  if (!values) {
    return null;
  }
  const offset = vertexIndex * 2;
  return { u: values[offset], v: values[offset + 1] };
}

function interpolateUv(uvs, barycentric) {
  if (!uvs || uvs.some((uv) => !uv)) {
    return null;
  }
  return {
    u: uvs[0].u * barycentric[0] + uvs[1].u * barycentric[1] + uvs[2].u * barycentric[2],
    v: uvs[0].v * barycentric[0] + uvs[1].v * barycentric[1] + uvs[2].v * barycentric[2],
  };
}

function interpolateVec3(values, barycentric) {
  return normalizeVec3(
    addVec3(
      addVec3(scaleVec3(values[0], barycentric[0]), scaleVec3(values[1], barycentric[1])),
      scaleVec3(values[2], barycentric[2])
    )
  );
}

function computeTriangleTangent(vertices, uvs, normal) {
  if (!uvs || uvs.some((uv) => !uv)) {
    const tangent = normalizeVec3(crossVec3(Math.abs(normal.y) > 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0), normal));
    return {
      tangent,
      bitangent: normalizeVec3(crossVec3(normal, tangent)),
    };
  }

  const edge1 = subVec3(vertices[1], vertices[0]);
  const edge2 = subVec3(vertices[2], vertices[0]);
  const du1 = uvs[1].u - uvs[0].u;
  const dv1 = uvs[1].v - uvs[0].v;
  const du2 = uvs[2].u - uvs[0].u;
  const dv2 = uvs[2].v - uvs[0].v;
  const denominator = du1 * dv2 - du2 * dv1;
  if (Math.abs(denominator) < 0.000001) {
    return computeTriangleTangent(vertices, null, normal);
  }

  const inverse = 1 / denominator;
  const tangent = normalizeVec3(
    vec3(
      inverse * (dv2 * edge1.x - dv1 * edge2.x),
      inverse * (dv2 * edge1.y - dv1 * edge2.y),
      inverse * (dv2 * edge1.z - dv1 * edge2.z)
    )
  );
  return {
    tangent,
    bitangent: normalizeVec3(crossVec3(normal, tangent)),
  };
}

function buildProductTriangles(model, camera, viewport, state) {
  const triangles = [];
  const totalTriangles = model.primitives.reduce(
    (total, primitive) => total + Math.floor(primitive.indices.length / 3),
    0
  );
  const budget =
    state.quality === "preview"
      ? 62000
      : state.quality === "adaptive"
        ? 145000
        : 320000;
  const step = Math.max(1, Math.ceil(totalTriangles / budget));

  for (const primitive of model.primitives) {
    const material = primitive.material;
    const normalValues = primitive.normals;
    for (let index = 0; index < primitive.indices.length; index += 3 * step) {
      const vertexIndices = [
        primitive.indices[index],
        primitive.indices[index + 1],
        primitive.indices[index + 2],
      ];
      if (vertexIndices.some((value) => typeof value !== "number")) {
        continue;
      }

      const vertices = vertexIndices.map((vertexIndex) =>
        rotateY(getVertex(primitive.positions, vertexIndex), state.modelRotationY)
      );
      const faceNormal = normalizeVec3(
        crossVec3(subVec3(vertices[1], vertices[0]), subVec3(vertices[2], vertices[0]))
      );
      if (lengthVec3(faceNormal) < 0.0001) {
        continue;
      }

      const vertexNormals = normalValues
        ? vertexIndices.map((vertexIndex) => rotateY(getVertex(normalValues, vertexIndex), state.modelRotationY))
        : [faceNormal, faceNormal, faceNormal];
      const uvs = vertexIndices.map((vertexIndex) => getUv(primitive.uvs, vertexIndex));
      const projected = vertices.map((vertex) => projectPoint(vertex, camera, viewport));
      if (projected.some((point) => point === null)) {
        continue;
      }

      const center = scaleVec3(addVec3(addVec3(vertices[0], vertices[1]), vertices[2]), 1 / 3);
      const viewDir = normalizeVec3(subVec3(camera.eye, center));
      const facing = dotVec3(faceNormal, viewDir);
      if (!material.doubleSided && facing < -0.72) {
        continue;
      }

      triangles.push({
        points: projected,
        vertices,
        vertexNormals,
        uvs,
        tangentBasis: computeTriangleTangent(vertices, uvs, faceNormal),
        faceNormal: facing < 0 ? scaleVec3(faceNormal, -1) : faceNormal,
        center,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        material,
      });
    }
  }

  triangles.sort((left, right) => right.depth - left.depth);
  return {
    triangles,
    totalTriangles,
    submittedTriangles: triangles.length,
    decimationStep: step,
  };
}

function applyTextureTransform(uv, textureInfo) {
  if (!uv || !textureInfo?.transform) {
    return uv;
  }
  const { offset, scale, rotation } = textureInfo.transform;
  const scaled = {
    u: uv.u * (scale[0] ?? 1),
    v: uv.v * (scale[1] ?? 1),
  };
  const cos = Math.cos(rotation ?? 0);
  const sin = Math.sin(rotation ?? 0);
  return {
    u: offset[0] + scaled.u * cos - scaled.v * sin,
    v: offset[1] + scaled.u * sin + scaled.v * cos,
  };
}

function wrapTextureCoordinate(value) {
  return ((value % 1) + 1) % 1;
}

export function sampleProductTexture(texture, uv, textureInfo = null) {
  if (!texture || !uv || !texture.data || texture.width <= 0 || texture.height <= 0) {
    return null;
  }
  const transformed = applyTextureTransform(uv, textureInfo);
  const u = wrapTextureCoordinate(transformed.u);
  const v = wrapTextureCoordinate(transformed.v);
  const x = clamp(Math.floor(u * texture.width), 0, texture.width - 1);
  const y = clamp(Math.floor((1 - v) * texture.height), 0, texture.height - 1);
  const offset = (y * texture.width + x) * 4;
  return {
    r: texture.data[offset] / 255,
    g: texture.data[offset + 1] / 255,
    b: texture.data[offset + 2] / 255,
    a: texture.data[offset + 3] / 255,
  };
}

function getTextureByInfo(textureStore, textureInfo) {
  return textureInfo?.uri ? textureStore.get(textureInfo.uri) ?? null : null;
}

export function resolveProductMaterialColor(material, uv, textureStore = new Map()) {
  const factor = material.baseColorFactor ?? [material.color.r, material.color.g, material.color.b, material.color.a ?? 1];
  const factorColor = {
    r: factor[0] ?? 1,
    g: factor[1] ?? 1,
    b: factor[2] ?? 1,
    a: factor[3] ?? 1,
  };
  const sample = sampleProductTexture(
    getTextureByInfo(textureStore, material.baseColorTexture),
    uv,
    material.baseColorTexture
  );
  const base = sample ?? material.color ?? factorColor;
  return {
    r: clamp(base.r * factorColor.r, 0, 1),
    g: clamp(base.g * factorColor.g, 0, 1),
    b: clamp(base.b * factorColor.b, 0, 1),
    a: clamp((base.a ?? 1) * factorColor.a, 0, 1),
  };
}

function resolveProductRoughness(material, uv, textureStore) {
  const textureSample = sampleProductTexture(
    getTextureByInfo(textureStore, material.metallicRoughnessTexture),
    uv,
    material.metallicRoughnessTexture
  );
  const textureRoughness =
    textureSample ? (textureSample.g + textureSample.r + textureSample.b) / 3 : 1;
  return clamp((material.roughness ?? 0.82) * textureRoughness, 0.025, 1);
}

function resolveProductNormal(triangle, barycentric, uv, textureStore) {
  const normal = interpolateVec3(triangle.vertexNormals, barycentric);
  const normalSample = sampleProductTexture(
    getTextureByInfo(textureStore, triangle.material.normalTexture),
    uv,
    triangle.material.normalTexture
  );
  if (!normalSample) {
    return normal;
  }

  const strength = triangle.material.normalTexture?.scale ?? 1;
  const tangentNormal = vec3(
    (normalSample.r * 2 - 1) * strength,
    (normalSample.g * 2 - 1) * strength,
    normalSample.b * 2 - 1
  );
  return normalizeVec3(
    addVec3(
      addVec3(
        scaleVec3(triangle.tangentBasis.tangent, tangentNormal.x),
        scaleVec3(triangle.tangentBasis.bitangent, tangentNormal.y)
      ),
      scaleVec3(normal, Math.max(0.15, tangentNormal.z))
    )
  );
}

function applyProductSurfaceDetail(color, material, uv, point) {
  const name = String(material?.name ?? "").toLowerCase();
  const seed = point.x * 17.1 + point.y * 31.7 + point.z * 11.3;
  const grain = pseudoRandom(seed) - 0.5;
  if (name.includes("leather")) {
    const pore =
      Math.sin((uv?.u ?? point.x) * 740 + grain * 2.2) *
      Math.sin((uv?.v ?? point.z) * 680 - grain * 1.7);
    return scaleColor(color, 0.94 + pore * 0.025 + grain * 0.035);
  }
  if (name.includes("wood")) {
    const streak =
      Math.sin((uv?.u ?? point.x) * 92 + Math.sin((uv?.v ?? point.z) * 16) * 1.8);
    return {
      r: clamp(color.r * (1.04 + streak * 0.05), 0, 1),
      g: clamp(color.g * (1.01 + streak * 0.035), 0, 1),
      b: clamp(color.b * (0.98 + streak * 0.018), 0, 1),
      a: color.a ?? 1,
    };
  }
  return scaleColor(color, 0.98 + grain * 0.018);
}

function shadeProductHit(baseColor, normal, viewDir, material, roughness, shadowPlan) {
  const keyDir = normalizeVec3(vec3(-0.42, 0.76, 0.48));
  const fillDir = normalizeVec3(vec3(0.58, 0.44, -0.34));
  const rimDir = normalizeVec3(vec3(0.1, 0.34, -0.9));
  const key = Math.pow(clamp(dotVec3(normal, keyDir), 0, 1), 0.82);
  const fill = Math.pow(clamp(dotVec3(normal, fillDir), 0, 1), 1.2);
  const rim = Math.pow(clamp(dotVec3(normal, rimDir), 0, 1), 3.2);
  const halfVector = normalizeVec3(addVec3(keyDir, viewDir));
  const specularPower = mix(150, 12, roughness);
  const specular =
    Math.pow(clamp(dotVec3(normal, halfVector), 0, 1), specularPower) *
    mix(1.15, 0.16, roughness);
  const metallic = clamp(material.metallic ?? 0, 0, 1);
  const specularColor = mixColor({ r: 1, g: 1, b: 1, a: 1 }, baseColor, metallic);
  const shadowContribution = clamp(
    shadowPlan?.polygonShadowContribution ?? 0.36,
    0,
    1
  );
  const ambient = 0.28 + normal.y * 0.08;
  const diffuse = ambient + key * 0.78 + fill * 0.19 + rim * 0.12;
  const occlusion = (1 - clamp(normal.y * 0.5 + 0.5, 0, 1)) * 0.04 * shadowContribution;

  return {
    r: clamp(baseColor.r * diffuse + specularColor.r * specular * 0.8 - occlusion, 0, 1),
    g: clamp(baseColor.g * diffuse + specularColor.g * specular * 0.78 - occlusion, 0, 1),
    b: clamp(baseColor.b * diffuse + specularColor.b * specular * 0.72 - occlusion * 0.8, 0, 1),
    a: baseColor.a ?? 1,
  };
}

function drawStudioBackground(ctx, canvas) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#f7f7f5");
  sky.addColorStop(0.52, "#ececea");
  sky.addColorStop(1, "#d7d8d5");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const floorY = canvas.height * 0.72;
  const floor = ctx.createLinearGradient(0, floorY, 0, canvas.height);
  floor.addColorStop(0, "rgba(255, 255, 255, 0)");
  floor.addColorStop(1, "rgba(177, 181, 176, 0.42)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
}

function drawContactShadow(ctx, canvas) {
  const x = canvas.width * 0.48;
  const y = canvas.height * 0.78;
  const shadow = ctx.createRadialGradient(x, y, 0, x, y, canvas.width * 0.36);
  shadow.addColorStop(0, "rgba(22, 25, 26, 0.24)");
  shadow.addColorStop(0.48, "rgba(22, 25, 26, 0.09)");
  shadow.addColorStop(1, "rgba(22, 25, 26, 0)");
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(x, y, canvas.width * 0.32, canvas.height * 0.105, -0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProductTriangles(ctx, triangles, camera, textureStore, shadowPlan) {
  const barycentric = [1 / 3, 1 / 3, 1 / 3];
  for (const triangle of triangles) {
    const uv = interpolateUv(triangle.uvs, barycentric);
    const baseColor = resolveProductMaterialColor(triangle.material, uv, textureStore);
    if ((triangle.material.alphaMode === "MASK" && baseColor.a < triangle.material.alphaCutoff) || baseColor.a <= 0.01) {
      continue;
    }

    const normal = resolveProductNormal(triangle, barycentric, uv, textureStore);
    const roughness = resolveProductRoughness(triangle.material, uv, textureStore);
    const viewDir = normalizeVec3(subVec3(camera.eye, triangle.center));
    const detailed = applyProductSurfaceDetail(baseColor, triangle.material, uv, triangle.center);
    const shaded = shadeProductHit(detailed, normal, viewDir, triangle.material, roughness, shadowPlan);

    ctx.fillStyle = colorToRgba(shaded, triangle.material.alphaMode === "BLEND" ? shaded.a : 1);
    ctx.beginPath();
    ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
    ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
    ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStudioPostProcess(ctx, canvas) {
  const highlight = ctx.createRadialGradient(
    canvas.width * 0.34,
    canvas.height * 0.25,
    0,
    canvas.width * 0.34,
    canvas.height * 0.25,
    canvas.width * 0.5
  );
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  highlight.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const vignette = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.46,
    canvas.width * 0.18,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.78
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(35, 37, 38, 0.13)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function renderProductStudioScene(ctx, canvas, state, dom) {
  const viewport = { width: canvas.width, height: canvas.height };
  const camera = buildProductStudioCamera(state.model, canvas, state);
  const lightingPlan = createLightingBandPlan({
    profile: "reference",
    importance: "critical",
  });
  const nearBand = lightingPlan.bands.find((band) => band.band === "near") ?? lightingPlan.bands[0];
  const shadowPlan = createRayTracedShadowPostProcessPlan({
    directShadows: nearBand.rtParticipation.directShadows,
    quality: state.quality === "preview" ? "medium" : "ultra",
    primaryShadowSource: nearBand.primaryShadowSource,
  });
  const build = buildProductTriangles(state.model, camera, viewport, state);
  state.lastTriangleBuild = build;
  state.camera = camera;

  drawStudioBackground(ctx, canvas);
  drawContactShadow(ctx, canvas);
  drawProductTriangles(ctx, build.triangles, camera, state.textures, shadowPlan);
  drawStudioPostProcess(ctx, canvas);

  const debugSnapshot = state.debugSession.getSnapshot();
  const governorSnapshot = state.qualityDetail.getSnapshot();
  if (dom.status) {
    dom.status.textContent = state.loadError
      ? state.loadError
      : `${state.model.name} rendered with ${build.submittedTriangles.toLocaleString()} submitted triangles`;
  }
  setListContent(dom.metrics, [
    `asset: ${state.assetUrl}`,
    `materials: ${new Set(state.model.primitives.map((primitive) => primitive.material.name)).size}`,
    `textures: ${state.textures.size} loaded / ${state.textureUris.length} referenced`,
    `triangles: ${build.submittedTriangles.toLocaleString()} / ${build.totalTriangles.toLocaleString()}`,
    `quality: ${state.quality} (${governorSnapshot.currentLevel.id})`,
    `lighting: ${nearBand.primaryShadowSource}; ${shadowPlan.shadowMask}`,
    `feature flag: ${GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE}=on`,
    `debug samples: ${debugSnapshot.queues.sampleCount}`,
  ]);
}

async function loadImageBitmapTexture(uri, maxDimension = 1024) {
  if (typeof fetch !== "function" || typeof createImageBitmap !== "function") {
    return null;
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to load product texture: ${response.status} ${response.statusText}`);
  }
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(width, height)
      : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const data = context.getImageData(0, 0, width, height).data;
  bitmap.close?.();
  return { uri, width, height, data };
}

function collectTextureUris(model) {
  const uris = new Set();
  for (const primitive of model.primitives) {
    for (const textureInfo of [
      primitive.material.baseColorTexture,
      primitive.material.normalTexture,
      primitive.material.metallicRoughnessTexture,
      primitive.material.occlusionTexture,
      primitive.material.emissiveTexture,
    ]) {
      if (textureInfo?.uri) {
        uris.add(textureInfo.uri);
      }
    }
  }
  return [...uris];
}

async function loadProductTextureStore(model) {
  const textureUris = collectTextureUris(model);
  const entries = await Promise.all(
    textureUris.map(async (uri) => {
      try {
        return [uri, await loadImageBitmapTexture(uri)];
      } catch {
        return [uri, null];
      }
    })
  );
  return {
    textureUris,
    textures: new Map(entries.filter(([, texture]) => texture)),
  };
}

function createProductPerformanceGovernor() {
  const qualityDetail = createQualityLadderAdapter({
    id: "product-studio-detail",
    domain: "geometry",
    levels: [
      { id: "preview", config: { triangleBudget: 62000 }, estimatedCostMs: 4.5 },
      { id: "adaptive", config: { triangleBudget: 145000 }, estimatedCostMs: 8.4 },
      { id: "max", config: { triangleBudget: 320000 }, estimatedCostMs: 15.5 },
    ],
    initialLevel: "max",
  });
  const governor = createGpuPerformanceGovernor({
    device: createDeviceProfile({
      deviceClass: "desktop",
      mode: "flat",
      refreshRateHz: 60,
      supportedFrameRates: [30, 60],
      supportsWebGpu: true,
    }),
    modules: [qualityDetail],
  });
  return { governor, qualityDetail };
}

function syncTextState(state) {
  window.render_game_to_text = () =>
    JSON.stringify({
      mode: "product-studio",
      assetUrl: state.assetUrl,
      frame: state.frame,
      quality: state.quality,
      productStudioEnabled: state.productStudioEnabled,
      hitDrivenPathtraceEnabled: state.hitDrivenPathtraceEnabled,
      materials: state.model?.primitives?.map((primitive) => primitive.material.name) ?? [],
      textureUris: state.textureUris,
      triangles: state.lastTriangleBuild
        ? {
            submitted: state.lastTriangleBuild.submittedTriangles,
            total: state.lastTriangleBuild.totalTriangles,
            decimationStep: state.lastTriangleBuild.decimationStep,
          }
        : null,
    });
}

export async function mountGpuProductStudio(options = {}, featureFlags = null) {
  injectStyles();
  const root = options.root ?? document.body;
  root.classList?.add?.(ROOT_CLASS);
  const captureMode =
    options.captureMode === true || isTruthyQueryValue(resolveQueryParam("capture"));
  if (captureMode) {
    root.classList?.add?.(CAPTURE_CLASS);
  }
  const previousMarkup = root.innerHTML;
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const previousCaptureFrame = window.__plasiusCaptureFrame;
  const assetUrl = resolveProductStudioAssetUrl(options);
  const dom = buildDemoDom(root, {
    title: options.title ?? "Eames Lounge Chair + Ottoman",
  });
  const initialAngle = options.productAngle ?? resolveQueryParam("angle", "productAngle") ?? "hero";
  const initialQuality =
    options.performanceMode === "adaptive"
      ? "adaptive"
      : options.performanceMode === "preview"
        ? "preview"
        : resolveQueryParam("quality", "productQuality") ?? "max";
  dom.angle.value = ANGLE_PRESETS[initialAngle] ? initialAngle : "hero";
  dom.quality.value = ["preview", "adaptive", "max"].includes(initialQuality)
    ? initialQuality
    : "max";

  const { governor, qualityDetail } = createProductPerformanceGovernor();
  const state = {
    mode: "product-studio",
    assetUrl,
    frame: 0,
    time: 0,
    paused: false,
    captureMode,
    frameExport: options.frameExport === true || isTruthyQueryValue(resolveQueryParam("frameExport")),
    angle: dom.angle.value,
    quality: dom.quality.value,
    modelRotationY: 0,
    cameraYawOffset: 0,
    cameraDistanceScale: 1,
    turntablePhase: 0,
    model: null,
    textures: new Map(),
    textureUris: [],
    lastTriangleBuild: null,
    productStudioEnabled: isFeatureEnabled(
      featureFlags,
      GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
      true
    ),
    hitDrivenPathtraceEnabled: isFeatureEnabled(
      featureFlags,
      GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
      true
    ),
    debugSession: createGpuDebugSession({ owner: "renderer" }),
    governor,
    qualityDetail,
    loadError: null,
  };

  if (!state.productStudioEnabled) {
    state.loadError = "Product studio demo is disabled by feature flag.";
    dom.status.textContent = state.loadError;
    setListContent(dom.metrics, [`feature flag: ${GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE}=off`]);
    syncTextState(state);
    return {
      state,
      productModel: null,
      canvas: dom.canvas,
      destroy() {
        root.classList?.remove?.(ROOT_CLASS);
        root.classList?.remove?.(CAPTURE_CLASS);
        root.innerHTML = previousMarkup;
      },
    };
  }

  state.model = await loadGltfModel(assetUrl);
  const textureStore = await loadProductTextureStore(state.model);
  state.textures = textureStore.textures;
  state.textureUris = textureStore.textureUris;
  syncTextState(state);

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is required for the product studio demo.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let animationFrameId = 0;
  let destroyed = false;
  const renderSingleFrame = () => {
    resizeCanvasToDisplaySize(dom.canvas, state);
    renderProductStudioScene(ctx, dom.canvas, state, dom);
    syncTextState(state);
  };
  const advanceSeconds = (dt) => {
    state.time += dt;
    state.frame += 1;
    if (!state.paused && state.angle === "turntable") {
      state.turntablePhase += dt * 0.32;
    }
    const syntheticFrameMs =
      state.quality === "max" ? 16.4 : state.quality === "adaptive" ? 12.2 : 7.4;
    state.governor.recordFrame({ frameTimeMs: syntheticFrameMs });
    state.debugSession.recordFrame?.({
      frameId: `product-studio-${state.frame}`,
      frameTimeMs: syntheticFrameMs,
      targetFrameTimeMs: 16.67,
      gpuBusyMs: syntheticFrameMs * 0.62,
      dropped: syntheticFrameMs > 18,
    });
  };

  window.__plasiusCaptureFrame = (captureOptions = {}) => {
    const stepMs =
      typeof captureOptions.stepMs === "number" && Number.isFinite(captureOptions.stepMs)
        ? captureOptions.stepMs
        : 1000 / 60;
    advanceSeconds(Math.max(0, stepMs) / 1000);
    renderSingleFrame();
    return {
      frame: state.frame,
      width: dom.canvas.width,
      height: dom.canvas.height,
      mode: state.mode,
      assetUrl: state.assetUrl,
      quality: state.quality,
      texturesLoaded: state.textures.size,
    };
  };
  window.advanceTime = (ms) => {
    const step = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let index = 0; index < step; index += 1) {
      advanceSeconds(1 / 60);
    }
    renderSingleFrame();
  };

  const renderFrame = (nowMs) => {
    if (destroyed) {
      return;
    }
    if (!state.frameExport) {
      const previous = state.lastTimeMs ?? nowMs;
      state.lastTimeMs = nowMs;
      advanceSeconds(Math.min(0.033, (nowMs - previous) / 1000));
    }
    renderSingleFrame();
    animationFrameId = requestAnimationFrame(renderFrame);
  };
  const handlePause = () => {
    state.paused = !state.paused;
    dom.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  };
  const handleAngle = () => {
    state.angle = dom.angle.value;
    state.turntablePhase = 0;
  };
  const handleQuality = () => {
    state.quality = dom.quality.value;
  };

  dom.pauseButton.addEventListener("click", handlePause);
  dom.angle.addEventListener("change", handleAngle);
  dom.quality.addEventListener("change", handleQuality);
  animationFrameId = requestAnimationFrame(renderFrame);

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    dom.pauseButton.removeEventListener("click", handlePause);
    dom.angle.removeEventListener("change", handleAngle);
    dom.quality.removeEventListener("change", handleQuality);
    root.classList?.remove?.(ROOT_CLASS);
    root.classList?.remove?.(CAPTURE_CLASS);
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
    productModel: state.model,
    canvas: dom.canvas,
    destroy,
  };
}

export {
  buildProductStudioCamera as __testOnlyBuildProductStudioCamera,
  buildProductTriangles as __testOnlyBuildProductTriangles,
  renderProductStudioScene as __testOnlyRenderProductStudioScene,
};

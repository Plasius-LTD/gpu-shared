import {
  clothGarmentKinds,
  clothProfileNames,
  createClothContinuityEnvelope,
  createClothRepresentationPlan,
  selectClothRepresentationBand,
} from "@plasius/gpu-cloth";
import {
  fluidBodyKinds,
  fluidProfileNames,
  createFluidContinuityEnvelope,
  createFluidRepresentationPlan,
  selectFluidRepresentationBand,
} from "@plasius/gpu-fluid";
import {
  createLightingBandPlan,
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

const STYLE_ID = "plasius-shared-3d-showcase-style";
const ROOT_CLASS = "plasius-showcase-root";
const DEFAULT_TITLE = "Flag by the Sea";
const DEFAULT_SUBTITLE =
  "Shared 3D validation scene using GLTF ships, cloth, fluid continuity, adaptive performance, and telemetry.";
const SHIP_SCALE = 1.1;
const HARBOR_BOUNDS = Object.freeze({
  minX: -11.2,
  maxX: 11.2,
  minZ: 1.8,
  maxZ: 17.2,
});
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
  "Moonlight sets the cold ambient read while deck lanterns and harbor torches provide warm local contrast.",
  "Cloth and fluid continuity stay coherent across near, mid, far, and horizon bands even in the darker night palette.",
  "Performance pressure reduces visual detail before mass-weighted authoritative collision motion is touched.",
]);

const UNIT_BOX_MESH = Object.freeze({
  positions: Object.freeze([
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5, 0.5, -0.5,
    -0.5, 0.5, -0.5,
    -0.5, -0.5, 0.5,
     0.5, -0.5, 0.5,
     0.5, 0.5, 0.5,
    -0.5, 0.5, 0.5,
  ]),
  indices: Object.freeze([
    0, 1, 2, 0, 2, 3,
    5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7,
    1, 5, 6, 1, 6, 2,
    3, 2, 6, 3, 6, 7,
    4, 5, 1, 4, 1, 0,
  ]),
});

const SHIP_LANTERNS = Object.freeze([
  Object.freeze({ x: 0.94, y: 1.54, z: 2.52, glow: 1 }),
  Object.freeze({ x: -0.9, y: 1.58, z: 2.44, glow: 0.92 }),
  Object.freeze({ x: 0.62, y: 1.42, z: -2.18, glow: 0.88 }),
  Object.freeze({ x: -0.58, y: 1.46, z: -2.04, glow: 0.84 }),
]);

const HARBOR_TORCHES = Object.freeze([
  Object.freeze({ x: -5.2, y: 1.25, z: 1.36, glow: 1.1 }),
  Object.freeze({ x: -8.6, y: 2.48, z: -0.72, glow: 1 }),
  Object.freeze({ x: -10.4, y: 1.28, z: 0.82, glow: 0.92 }),
]);
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

function colorToRgba(color, alpha = 1) {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
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

function shadeColor(base, normal, lightDir, heightBias = 0, accent = 0) {
  const diffuse = clamp(dotVec3(normalizeVec3(normal), lightDir), 0, 1);
  const brightness = 0.24 + diffuse * 0.72 + heightBias * 0.08 + accent;
  return {
    r: clamp(base.r * brightness, 0, 1),
    g: clamp(base.g * brightness, 0, 1),
    b: clamp(base.b * (brightness + 0.03), 0, 1),
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

function buildTrianglesFromMesh(mesh, transform, baseColor, camera, viewport, triangles, accent = 0) {
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const aIndex = mesh.indices[index] * 3;
    const bIndex = mesh.indices[index + 1] * 3;
    const cIndex = mesh.indices[index + 2] * 3;

    const a = transformPoint(
      vec3(mesh.positions[aIndex], mesh.positions[aIndex + 1], mesh.positions[aIndex + 2]),
      transform
    );
    const b = transformPoint(
      vec3(mesh.positions[bIndex], mesh.positions[bIndex + 1], mesh.positions[bIndex + 2]),
      transform
    );
    const c = transformPoint(
      vec3(mesh.positions[cIndex], mesh.positions[cIndex + 1], mesh.positions[cIndex + 2]),
      transform
    );

    const ab = subVec3(b, a);
    const ac = subVec3(c, a);
    const normal = normalizeVec3(crossVec3(ab, ac));
    const viewDir = normalizeVec3(subVec3(camera.eye, a));
    if (dotVec3(normal, viewDir) <= 0) {
      continue;
    }

    const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
    if (projected.some((value) => value === null)) {
      continue;
    }

    triangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
      baseColor,
      accent,
    });
  }
}

function createPerformanceGovernor() {
  const fluidDetail = createQualityLadderAdapter({
    id: "fluid-detail",
    domain: "geometry",
    levels: [
      { id: "low", config: { nearResolution: 10, midResolution: 6, splashCount: 10 }, estimatedCostMs: 0.8 },
      { id: "medium", config: { nearResolution: 16, midResolution: 8, splashCount: 18 }, estimatedCostMs: 1.4 },
      { id: "high", config: { nearResolution: 24, midResolution: 12, splashCount: 28 }, estimatedCostMs: 2.4 },
    ],
    initialLevel: "high",
  });

  const clothDetail = createQualityLadderAdapter({
    id: "cloth-detail",
    domain: "cloth",
    levels: [
      { id: "low", config: { cols: 10, rows: 7 }, estimatedCostMs: 0.7 },
      { id: "medium", config: { cols: 16, rows: 11 }, estimatedCostMs: 1.3 },
      { id: "high", config: { cols: 24, rows: 16 }, estimatedCostMs: 2.1 },
    ],
    initialLevel: "high",
  });

  const lightingDetail = createQualityLadderAdapter({
    id: "lighting-detail",
    domain: "lighting",
    levels: [
      { id: "low", config: { shadowStrength: 0.18, reflectionStrength: 0.08 }, estimatedCostMs: 0.5 },
      { id: "medium", config: { shadowStrength: 0.34, reflectionStrength: 0.16 }, estimatedCostMs: 1.0 },
      { id: "high", config: { shadowStrength: 0.5, reflectionStrength: 0.24 }, estimatedCostMs: 1.8 },
    ],
    initialLevel: "high",
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
          <canvas id="demoCanvas" class="plasius-demo__canvas" width="1280" height="720"></canvas>
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
  return Object.freeze({
    focus: state.focus,
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
    physics: Object.freeze({
      profile: state.physics.profile,
      plan: state.physics.plan,
      manifest: state.physics.manifest,
      snapshot: state.physics.snapshot,
      shipPhysics: shipModel?.physics ?? null,
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

function readVisualNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function resolveVisualConfig(nearLighting, lightingSnapshot, customVisuals = {}) {
  const premiumShadows = nearLighting.primaryShadowSource === "ray-traced-primary";
  const defaults = {
    skyTop: premiumShadows ? "#040c1a" : "#06101f",
    skyMid: premiumShadows ? "#11203b" : "#152643",
    skyBottom: premiumShadows ? "#2f4468" : "#364d73",
    duskGlow: premiumShadows ? "rgba(116, 142, 201, 0.26)" : "rgba(104, 128, 188, 0.22)",
    seaTop: premiumShadows ? "#102946" : "#153050",
    seaMid: premiumShadows ? "#0a1d33" : "#0d2138",
    seaBottom: "#04101d",
    moonCore: "rgba(241, 246, 255, 0.98)",
    moonHalo: "rgba(167, 191, 255, 0.24)",
    moonReflection: "rgba(192, 214, 255, 0.22)",
    starColor: "rgba(232, 239, 255, 0.82)",
    ambientMist: "rgba(41, 63, 97, 0.16)",
    reflectionStrength: lightingSnapshot.currentLevel.config.reflectionStrength,
    shadowAccent: lightingSnapshot.currentLevel.config.shadowStrength,
    waveAmplitude: 0.94,
    waveDirection: { x: 0.88, z: 0.28 },
    wavePhaseSpeed: 0.88,
    wakeStrength: 0.31,
    wakeLength: 18,
    collisionRippleStrength: 0.42,
    waterNear: { r: 0.08, g: 0.23, b: 0.33 },
    waterFar: { r: 0.18, g: 0.35, b: 0.49 },
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
    moonCore:
      typeof customVisuals.moonCore === "string"
        ? customVisuals.moonCore
        : typeof customVisuals.sunCore === "string"
          ? customVisuals.sunCore
          : defaults.moonCore,
    moonHalo:
      typeof customVisuals.moonHalo === "string" ? customVisuals.moonHalo : defaults.moonHalo,
    moonReflection:
      typeof customVisuals.moonReflection === "string"
        ? customVisuals.moonReflection
        : defaults.moonReflection,
    starColor:
      typeof customVisuals.starColor === "string" ? customVisuals.starColor : defaults.starColor,
    ambientMist:
      typeof customVisuals.ambientMist === "string"
        ? customVisuals.ambientMist
        : defaults.ambientMist,
    reflectionStrength: readVisualNumber(
      customVisuals.reflectionStrength,
      defaults.reflectionStrength
    ),
    shadowAccent: readVisualNumber(customVisuals.shadowAccent, defaults.shadowAccent),
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
  const clothPlan = createClothRepresentationPlan({
    garmentId: "shore-flag",
    kind: state.focus === "cloth" ? "flag" : clothGarmentKinds[0],
    profile: state.focus === "cloth" ? "cinematic" : clothProfileNames[0],
    supportsRayTracing: true,
    nearFieldMaxMeters: 18,
    midFieldMaxMeters: 55,
    farFieldMaxMeters: 180,
  });
  const cameraDistance = lengthVec3(subVec3(state.camera.target, state.camera.eye ?? vec3(...CAMERA_PRESETS[state.focus].target)));
  const band = selectClothRepresentationBand(cameraDistance, clothPlan.thresholds);
  const representation =
    clothPlan.representations.find((entry) => entry.band === band) ?? clothPlan.representations[0];
  const continuity = createClothContinuityEnvelope({ garmentId: "shore-flag" });

  const cols = meshDetail.cols;
  const rows = meshDetail.rows;
  const origin = vec3(-3.5, 5.9, 2.4);
  const width = 4.8;
  const height = 2.7;
  const positions = [];
  const indices = [];
  const time = state.time;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      const u = column / (cols - 1);
      const v = row / (rows - 1);
      const gust =
        Math.sin(time * 1.9 + v * 3.2 + u * 2.1) *
        continuity.broadMotionFloor *
        visuals.flagMotion;
      const wrinkle =
        Math.sin(time * 4.4 + u * 9.2 + v * 5.6) *
        continuity.wrinkleFloor *
        0.22 *
        Math.max(0.55, visuals.flagMotion);
      const x = origin.x + u * 1.8 + gust * 0.55 * (u * 0.9);
      const y = origin.y - height * v + wrinkle * 0.2;
      const z = origin.z + width * u + gust * 0.72 * (u * 0.85);
      const flap =
        Math.cos(time * 2.7 + u * 7.4 + v * 3.8) *
        continuity.broadMotionFloor *
        0.28 *
        visuals.flagMotion;
      positions.push(vec3(x + flap, y, z));
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < cols - 1; column += 1) {
      const a = row * cols + column;
      const b = a + 1;
      const c = a + cols + 1;
      const d = a + cols;
      indices.push(a, b, c, a, c, d);
    }
  }

  return {
    clothPlan,
    band,
    representation,
    continuity,
    color: visuals.flagColor,
    positions,
    indices,
    grid: { rows, cols },
  };
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

function sampleShipWake(state, x, z, time) {
  const wakeStrength = readVisualNumber(state.demoVisuals?.wakeStrength, 0.24);
  const wakeLength = readVisualNumber(state.demoVisuals?.wakeLength, 15);
  let total = 0;

  for (const ship of state.ships) {
    const speed = Math.hypot(ship.velocity.x, ship.velocity.z);
    if (speed <= 0.05) {
      continue;
    }

    const direction = normalizeVec3(vec3(ship.velocity.x, 0, ship.velocity.z));
    const behind = scaleVec3(direction, -1);
    const lateral = vec3(-direction.z, 0, direction.x);
    const delta = vec3(x - ship.position.x, 0, z - ship.position.z);
    const along = dotVec3(delta, behind);
    if (along < 0 || along > wakeLength) {
      continue;
    }

    const cross = Math.abs(dotVec3(delta, lateral));
    const width = 0.9 + along * 0.2;
    if (cross > width * 3.2) {
      continue;
    }

    const envelope =
      Math.exp(-along * 0.14) * Math.exp(-((cross * cross) / Math.max(0.4, width * width * 2.4)));
    total += Math.sin(along * 1.6 - time * 4.2) * speed * wakeStrength * envelope;
  }

  return total;
}

function sampleWaveImpulses(state, x, z, time) {
  const rippleStrength = readVisualNumber(state.demoVisuals?.collisionRippleStrength, 0.34);
  let total = 0;

  for (const impulse of state.waveImpulses) {
    const dx = x - impulse.x;
    const dz = z - impulse.z;
    const distance = Math.hypot(dx, dz);
    const radius = impulse.radius + (1 - impulse.life) * 4.8;
    if (distance > radius * 2.8) {
      continue;
    }

    const phase = distance * 1.8 - (1 - impulse.life) * 10 - time * 0.4;
    const envelope = Math.exp(-distance / Math.max(0.1, radius)) * impulse.life;
    total += Math.sin(phase) * impulse.strength * rippleStrength * envelope * 0.18;
  }

  return total;
}

function sampleWave(state, x, z, time) {
  const direction = resolveWaveDirection(state);
  const lateral = vec3(-direction.z, 0, direction.x);
  const along = x * direction.x + z * direction.z;
  const cross = x * lateral.x + z * lateral.z;
  const phaseSpeed = readVisualNumber(state.demoVisuals?.wavePhaseSpeed, 1);
  const amplitude = readVisualNumber(state.demoVisuals?.waveAmplitude, 1);
  const base =
    Math.sin(along * 0.22 - time * 1.12 * phaseSpeed) * 0.42 +
    Math.cos(along * 0.11 + cross * 0.07 - time * 0.78 * phaseSpeed) * 0.26 +
    Math.sin(cross * 0.19 - time * 1.34 * phaseSpeed) * 0.16;

  return (
    base * amplitude +
    sampleShipWake(state, x, z, time) +
    sampleWaveImpulses(state, x, z, time)
  );
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

  const bandMeshes = [];
  const bandExtents = Object.freeze([
    { band: "near", width: 20, depth: 18, step: 1, y: 0.2 },
    { band: "mid", width: 34, depth: 28, step: 2, y: 0.05 },
    { band: "far", width: 54, depth: 42, step: 3.5, y: -0.05 },
    { band: "horizon", width: 80, depth: 76, step: 7, y: -0.14 },
  ]);

  for (const bandSpec of bandExtents) {
    const representation =
      fluidPlan.representations.find((entry) => entry.band === bandSpec.band) ??
      fluidPlan.representations[0];
    const continuity = createFluidContinuityEnvelope({ fluidBodyId: "harbor" });
    const bandResolution =
      bandSpec.band === "near"
        ? fluidDetail.nearResolution
        : bandSpec.band === "mid"
          ? fluidDetail.midResolution
          : bandSpec.band === "far"
            ? 5
            : 3;
    const cols = Math.max(4, bandResolution * 2);
    const rows = Math.max(4, bandResolution + 2);
    const positions = [];
    const indices = [];
    const originX = -bandSpec.width * 0.5;
    const originZ = -6;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        const u = column / (cols - 1);
        const v = row / (rows - 1);
        const x = originX + bandSpec.width * u;
        const z = originZ + bandSpec.depth * v;
        const y =
          bandSpec.y +
          sampleWave(state, x, z, state.time) *
            continuity.amplitudeFloor *
            (bandSpec.band === "near" ? 0.9 : bandSpec.band === "mid" ? 0.55 : 0.3);
        positions.push(vec3(x, y, z));
      }
    }
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < cols - 1; column += 1) {
        const a = row * cols + column;
        const b = a + 1;
        const c = a + cols + 1;
        const d = a + cols;
        indices.push(a, b, c, a, c, d);
      }
    }

    bandMeshes.push({
      band: bandSpec.band,
      representation,
      continuity,
      rows,
      cols,
      positions,
      indices,
      color:
        bandSpec.band === "near"
          ? visuals.waterNear
          : bandSpec.band === "mid"
            ? {
                r: mix(visuals.waterNear.r, visuals.waterFar.r, 0.4),
                g: mix(visuals.waterNear.g, visuals.waterFar.g, 0.4),
                b: mix(visuals.waterNear.b, visuals.waterFar.b, 0.4),
              }
            : bandSpec.band === "far"
              ? visuals.waterFar
              : {
                  r: mix(visuals.waterFar.r, 0.76, 0.2),
                  g: mix(visuals.waterFar.g, 0.78, 0.2),
                  b: mix(visuals.waterFar.b, 0.82, 0.2),
                },
    });
  }

  return { fluidPlan, bandMeshes };
}

function createSceneState(options) {
  const { governor, fluidDetail, clothDetail, lightingDetail } = createPerformanceGovernor();
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
        lanterns: SHIP_LANTERNS,
        lanternStrength: 1.06,
        collisionRadiusScale: 1.04,
      },
      {
        id: "tidecaller",
        position: vec3(4.8, 0, 4.4),
        velocity: vec3(-2.15, 0, 1.74),
        rotationY: -2.48,
        angularVelocity: -0.2,
        tint: { r: 0.48, g: 0.28, b: 0.19 },
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
    physics: {
      profile: physicsProfile,
      plan: physicsPlan,
      manifest: physicsManifest,
      snapshot: null,
    },
    shipModel: null,
  };
}

function setListContent(element, values) {
  element.innerHTML = values.map((value) => `<li>${value}</li>`).join("");
}

function drawSkyAndShore(ctx, canvas, state, nearLighting, reflectionStrength, shadowStrength, visuals) {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
  sky.addColorStop(0, visuals.skyTop);
  sky.addColorStop(0.54, visuals.skyMid);
  sky.addColorStop(1, visuals.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 70; index += 1) {
    const x = pseudoRandom(index + 13) * canvas.width;
    const y = pseudoRandom(index * 7 + 5) * canvas.height * 0.42;
    const twinkle = 0.45 + Math.sin(state.time * 1.4 + index * 0.73) * 0.25;
    const radius = 0.6 + pseudoRandom(index * 11 + 2) * 1.9;
    ctx.fillStyle = visuals.starColor.replace(/[\d.]+\)$/u, `${clamp(twinkle, 0.16, 0.92)})`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const horizonGlow = ctx.createLinearGradient(0, canvas.height * 0.22, 0, canvas.height * 0.62);
  horizonGlow.addColorStop(0, "rgba(0, 0, 0, 0)");
  horizonGlow.addColorStop(1, visuals.duskGlow);
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, canvas.height * 0.2, canvas.width, canvas.height * 0.45);

  const shoreline = ctx.createLinearGradient(0, canvas.height * 0.45, 0, canvas.height);
  shoreline.addColorStop(0, visuals.seaTop);
  shoreline.addColorStop(0.52, visuals.seaMid);
  shoreline.addColorStop(1, visuals.seaBottom);
  ctx.fillStyle = shoreline;
  ctx.fillRect(0, canvas.height * 0.45, canvas.width, canvas.height * 0.55);

  const moonX = canvas.width * 0.76 + Math.sin(state.time * 0.045) * 18;
  const moonY = canvas.height * 0.17 + Math.cos(state.time * 0.05) * 10;
  const moon = ctx.createRadialGradient(moonX, moonY, 14, moonX, moonY, 126);
  moon.addColorStop(0, visuals.moonCore);
  moon.addColorStop(0.46, visuals.moonHalo);
  moon.addColorStop(1, "rgba(167, 191, 255, 0)");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 94, 0, Math.PI * 2);
  ctx.fill();

  const moonCore = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 28);
  moonCore.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  moonCore.addColorStop(1, visuals.moonCore);
  ctx.fillStyle = moonCore;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
  ctx.fill();

  const track = ctx.createLinearGradient(moonX, canvas.height * 0.44, moonX, canvas.height * 0.98);
  track.addColorStop(0, visuals.moonReflection.replace(/[\d.]+\)$/u, `${0.08 + reflectionStrength * 0.12})`));
  track.addColorStop(0.42, visuals.moonReflection.replace(/[\d.]+\)$/u, `${0.04 + reflectionStrength * 0.18})`));
  track.addColorStop(1, "rgba(192, 214, 255, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = track;
  ctx.beginPath();
  ctx.ellipse(moonX, canvas.height * 0.75, 38 + shadowStrength * 42, canvas.height * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

function drawTriangles(ctx, triangles, lightDir, reflectionStrength, camera, shadowStrength) {
  triangles.sort((left, right) => right.depth - left.depth);
  for (const triangle of triangles) {
    const surfaceNormal = normalizeVec3(triangle.normal);
    const shaded = shadeColor(
      triangle.baseColor,
      surfaceNormal,
      lightDir,
      clamp((triangle.worldCenter.y + 3) / 10, 0, 1),
      triangle.accent
    );
    const reflection = triangle.worldCenter.y < 0.8 ? reflectionStrength : 0;
    const viewDir = normalizeVec3(subVec3(camera.eye, triangle.worldCenter));
    const reflectedLight = reflectVec3(scaleVec3(lightDir, -1), surfaceNormal);
    const gloss = triangle.worldCenter.y < 0.9 ? 1 : triangle.accent > 0.05 ? 0.55 : 0.3;
    const specular = Math.pow(clamp(dotVec3(reflectedLight, viewDir), 0, 1), triangle.worldCenter.y < 0.9 ? 18 : 12) * gloss;
    const occlusion = triangle.worldCenter.y < 0.9 ? shadowStrength * 0.035 : 0;
    const fill = colorToRgba(
      {
        r: clamp(shaded.r + reflection * 0.08 + specular * 0.14 - occlusion, 0, 1),
        g: clamp(shaded.g + reflection * 0.08 + specular * 0.15 - occlusion, 0, 1),
        b: clamp(shaded.b + reflection * 0.16 + specular * 0.2 - occlusion * 0.5, 0, 1),
      },
      0.98
    );
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(triangle.points[0].x, triangle.points[0].y);
    ctx.lineTo(triangle.points[1].x, triangle.points[1].y);
    ctx.lineTo(triangle.points[2].x, triangle.points[2].y);
    ctx.closePath();
    ctx.fill();
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

function pushHarborGeometry(camera, viewport, triangles, visuals) {
  const harborObjects = [
    {
      position: vec3(-8.2, 1.1, -0.9),
      rotationY: -0.16,
      scale: { x: 5.4, y: 2.4, z: 4.2 },
      color: visuals.harborWall,
      accent: 0.06,
    },
    {
      position: vec3(-5.7, 0.45, 1.4),
      rotationY: -0.08,
      scale: { x: 6.8, y: 0.3, z: 2.1 },
      color: visuals.harborDeck,
      accent: 0.04,
    },
    {
      position: vec3(-10.4, 0.28, 0.8),
      rotationY: 0.22,
      scale: { x: 1.2, y: 0.9, z: 1.2 },
      color: visuals.harborTower,
      accent: 0.02,
    },
  ];

  for (const object of harborObjects) {
    buildTrianglesFromMesh(
      UNIT_BOX_MESH,
      {
        position: object.position,
        rotationY: object.rotationY,
        scale: object.scale,
      },
      object.color,
      camera,
      viewport,
      triangles,
      object.accent
    );
  }
}

function renderShipRigging(ctx, ship, camera, viewport) {
  const transform = { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE };
  const mastBase = transformPoint(vec3(0, 0.38, -0.4), transform);
  const mastTop = transformPoint(vec3(0, 3.8, -0.2), transform);
  const aftBase = transformPoint(vec3(-0.25, 0.32, -1.9), transform);
  const aftTop = transformPoint(vec3(-0.15, 2.7, -1.75), transform);
  const sailA = transformPoint(vec3(0.08, 3.2, -0.2), transform);
  const sailB = transformPoint(vec3(0.12, 1.2, -0.5), transform);
  const sailC = transformPoint(vec3(2.25, 2.25, 0.15), transform);
  const projected = [mastBase, mastTop, aftBase, aftTop, sailA, sailB, sailC].map((point) =>
    projectPoint(point, camera, viewport)
  );
  if (projected.some((value) => value === null)) {
    return;
  }

  ctx.strokeStyle = "rgba(73, 54, 45, 0.94)";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  ctx.lineTo(projected[1].x, projected[1].y);
  ctx.moveTo(projected[2].x, projected[2].y);
  ctx.lineTo(projected[3].x, projected[3].y);
  ctx.stroke();

  ctx.fillStyle = "rgba(238, 232, 214, 0.88)";
  ctx.beginPath();
  ctx.moveTo(projected[4].x, projected[4].y);
  ctx.lineTo(projected[5].x, projected[5].y);
  ctx.lineTo(projected[6].x, projected[6].y);
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

function renderWaterHighlights(ctx, waterBands, camera, viewport) {
  for (const band of waterBands) {
    if (band.band === "horizon") {
      continue;
    }
    const interval = band.band === "near" ? 2 : 3;
    const alpha = band.band === "near" ? 0.22 : 0.14;
    ctx.strokeStyle = `rgba(232, 247, 255, ${alpha})`;
    ctx.lineWidth = band.band === "near" ? 1.3 : 0.9;
    for (let row = interval; row < band.rows - 1; row += interval) {
      ctx.beginPath();
      let started = false;
      for (let column = 0; column < band.cols; column += 1) {
        const point = projectPoint(
          band.positions[row * band.cols + column],
          camera,
          viewport
        );
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
  }
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
      position: vec3(point.x, point.y, point.z),
      velocity: vec3(Math.cos(angle) * speed * 0.35, 1.1 + Math.random() * 0.8, Math.sin(angle) * speed * 0.25),
      life: 1.2 + Math.random() * 0.4,
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

function resolveShipCollision(state, a, b, shipModel) {
  const delta = subVec3(b.position, a.position);
  const radiusA = getShipCollisionRadius(a, shipModel);
  const radiusB = getShipCollisionRadius(b, shipModel);
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
  const invMassA = getShipInverseMass(a, shipModel);
  const invMassB = getShipInverseMass(b, shipModel);
  const invMassSum = invMassA + invMassB;
  const correction = scaleVec3(normal, (penetration / Math.max(0.0001, invMassSum)) * 0.72);
  a.position = subVec3(a.position, scaleVec3(correction, invMassA));
  b.position = addVec3(b.position, scaleVec3(correction, invMassB));

  const relativeVelocity = subVec3(b.velocity, a.velocity);
  const velocityAlongNormal = dotVec3(relativeVelocity, normal);
  const restitution = readPhysicsNumber(shipModel.physics, "restitution", 0.22) * 0.88;
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
      tangentSpeed * radiusA * getShipInverseInertia(a, shipModel) * 0.2 +
      impulseMagnitude * 0.00024;
    b.angularVelocity +=
      tangentSpeed * radiusB * getShipInverseInertia(b, shipModel) * 0.2 +
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
    updateShipMotion(state, ship, dt, shipModel);
    resolveBoundaryCollision(ship, state, shipModel);
  }

  for (let index = 0; index < state.ships.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < state.ships.length; otherIndex += 1) {
      collided =
        resolveShipCollision(state, state.ships[index], state.ships[otherIndex], shipModel) ||
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
        position: nextPosition,
        velocity: nextVelocity,
        life: particle.life - dt,
      };
    })
    .filter((particle) => particle.life > 0 && particle.position.y > -0.2);
}

function recordTelemetry(state, frameTimeMs) {
  const frameId = `showcase-${state.frame}`;
  const quality = {
    fluid: state.fluidDetail.getSnapshot(),
    cloth: state.clothDetail.getSnapshot(),
    lighting: state.lightingDetail.getSnapshot(),
  };
  const synthetic = frameTimeMs + state.sprays.length * 0.1 + (state.stress ? 6.5 : 0);
  const decision = state.governor.recordFrame({ frameTimeMs: synthetic });
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
    const radius = clamp((1 / projected.depth) * 260, 1.5, 7.5);
    ctx.fillStyle = `rgba(225, 243, 250, ${clamp(spray.life / 1.6, 0, 0.9)})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
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

function renderShipShadow(ctx, shipModel, ship, state, camera, viewport, lightDir, shadowStrength) {
  const bounds = shipModel.bounds;
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
    alpha: 0.08 + shadowStrength * 0.2,
    blur: 14 + shadowStrength * 24,
  });
}

function renderFlagShadow(ctx, cloth, camera, viewport, lightDir, shadowStrength) {
  const clothPoints = [
    cloth.positions[0],
    cloth.positions[cloth.grid.cols - 1],
    cloth.positions[cloth.positions.length - 1],
    cloth.positions[cloth.positions.length - cloth.grid.cols],
  ];

  renderProjectedShadow(ctx, clothPoints, camera, viewport, lightDir, {
    planeY: 0.56,
    alpha: 0.05 + shadowStrength * 0.16,
    blur: 12 + shadowStrength * 20,
  });
}

function renderGlowLight(
  ctx,
  point,
  camera,
  viewport,
  coreColor,
  glowColor,
  glowScale,
  reflectionStrength = 0,
  state = null
) {
  const projected = projectPoint(point, camera, viewport);
  if (!projected) {
    return;
  }

  const radius = clamp((1 / projected.depth) * 420 * glowScale, 4, 34);
  const halo = ctx.createRadialGradient(projected.x, projected.y, radius * 0.12, projected.x, projected.y, radius);
  halo.addColorStop(0, colorToRgba(coreColor, 0.98));
  halo.addColorStop(0.5, colorToRgba(glowColor, 0.42));
  halo.addColorStop(1, colorToRgba(glowColor, 0));
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = colorToRgba(coreColor, 0.98);
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, Math.max(1.2, radius * 0.16), 0, Math.PI * 2);
  ctx.fill();

  if (state && reflectionStrength > 0) {
    const waterline = sampleWave(state, point.x, point.z, state.time) * 0.22;
    const reflectedPoint = vec3(point.x, waterline - (point.y - waterline) * 0.58, point.z + 0.08);
    const reflected = projectPoint(reflectedPoint, camera, viewport);
    if (reflected) {
      const reflectionRadius = radius * 0.72;
      const glow = ctx.createRadialGradient(
        reflected.x,
        reflected.y,
        reflectionRadius * 0.1,
        reflected.x,
        reflected.y,
        reflectionRadius
      );
      glow.addColorStop(0, colorToRgba(coreColor, reflectionStrength * 0.34));
      glow.addColorStop(1, colorToRgba(glowColor, 0));
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(
        reflected.x,
        reflected.y,
        reflectionRadius * 0.34,
        reflectionRadius,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }
}

function renderShipLanterns(ctx, ship, state, camera, viewport, visuals) {
  const lanterns = Array.isArray(ship.lanterns) ? ship.lanterns : SHIP_LANTERNS;
  const strength = readVisualNumber(ship.lanternStrength, 1);
  for (const lantern of lanterns) {
    const position = transformPoint(
      vec3(lantern.x, lantern.y, lantern.z),
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE }
    );
    renderGlowLight(
      ctx,
      position,
      camera,
      viewport,
      visuals.lanternCore,
      visuals.lanternGlow,
      lantern.glow * strength,
      visuals.lanternReflectionStrength,
      state
    );
  }
}

function renderHarborTorches(ctx, state, camera, viewport, visuals) {
  for (const torch of HARBOR_TORCHES) {
    renderGlowLight(
      ctx,
      vec3(torch.x, torch.y, torch.z),
      camera,
      viewport,
      visuals.torchCore,
      visuals.torchGlow,
      torch.glow,
      visuals.lanternReflectionStrength * 0.55,
      state
    );
  }
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
  const lightDir = normalizeVec3(vec3(-0.22, 0.94, -0.31));
  const lightingSnapshot = state.lightingDetail.getSnapshot();
  const visuals = resolveVisualConfig(
    nearLighting,
    lightingSnapshot,
    state.demoDescription?.visuals
  );
  state.demoVisuals = visuals;
  const reflectionStrength = visuals.reflectionStrength;
  const shadowStrength = visuals.shadowAccent;
  drawSkyAndShore(
    ctx,
    canvas,
    state,
    nearLighting,
    reflectionStrength,
    shadowStrength,
    visuals
  );

  const triangles = [];
  pushHarborGeometry(camera, viewport, triangles, visuals);
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
      const normal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
      const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
      if (projected.some((value) => value === null)) {
        continue;
      }
      triangles.push({
        points: projected,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
        normal,
        baseColor: bandMesh.color,
        accent: bandAccent,
      });
    }
  }

  const cloth = buildClothSurface(
    state,
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    visuals
  );
  for (let index = 0; index < cloth.indices.length; index += 3) {
    const a = cloth.positions[cloth.indices[index]];
    const b = cloth.positions[cloth.indices[index + 1]];
    const c = cloth.positions[cloth.indices[index + 2]];
    const normal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
    const projected = [projectPoint(a, camera, viewport), projectPoint(b, camera, viewport), projectPoint(c, camera, viewport)];
    if (projected.some((value) => value === null)) {
      continue;
    }
    triangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
      baseColor: cloth.color,
      accent: cloth.band === "near" ? 0.1 : 0.04,
    });
  }

  for (const ship of state.ships) {
    buildTrianglesFromMesh(
      shipModel,
      { position: ship.position, rotationY: ship.rotationY, scale: SHIP_SCALE },
      ship.tint,
      camera,
      viewport,
      triangles,
      nearLighting.rtParticipation.directShadows === "premium" ? 0.08 : 0.02
    );
  }

  for (const ship of state.ships) {
    renderShipShadow(ctx, shipModel, ship, state, camera, viewport, lightDir, shadowStrength);
  }
  renderFlagShadow(ctx, cloth, camera, viewport, lightDir, shadowStrength);

  drawTriangles(ctx, triangles, lightDir, reflectionStrength, camera, shadowStrength);
  renderWaterHighlights(ctx, water.bandMeshes, camera, viewport);
  renderHarborTorches(ctx, state, camera, viewport, visuals);
  renderFlagPole(ctx, camera, viewport);
  renderClothAccent(ctx, cloth, camera, viewport);
  for (const ship of state.ships) {
    renderShipRigging(ctx, ship, camera, viewport);
    renderShipLanterns(ctx, ship, state, camera, viewport, visuals);
  }
  renderSprays(ctx, state.sprays, camera, viewport);

  const debugSnapshot = state.debugSession.getSnapshot();
  const quality = {
    fluid: state.fluidDetail.getSnapshot(),
    cloth: state.clothDetail.getSnapshot(),
    lighting: lightingSnapshot,
  };

  const sceneMetrics = [
    `focus: ${state.focus}`,
    `ships: ${state.ships.length} active GLTF hulls`,
    `moonlight: cold overhead key + ${HARBOR_TORCHES.length + state.ships.length * SHIP_LANTERNS.length} warm deck and harbor lights`,
    `physics snapshot: ${state.physics.snapshot.stage} (${state.physics.snapshot.stability})`,
    `physics contacts: ${state.contactCount}`,
    `mass split: ${state.ships.map((ship) => `${ship.id} ${(getShipMass(ship, shipModel) / 1000).toFixed(1)}t`).join(" · ")}`,
    `cloth band: ${cloth.band} -> ${cloth.representation.output}`,
    `fluid near band: ${water.bandMeshes[0].representation.output}`,
    `lighting profile: ${lightingPlan.profile} (${lightingDistanceBands.length} bands)`,
  ];
  const qualityMetrics = [
    `fluid detail: ${quality.fluid.currentLevel.id} (${quality.fluid.currentLevel.config.nearResolution} near cells)`,
    `cloth detail: ${quality.cloth.currentLevel.id} (${quality.cloth.currentLevel.config.cols}x${quality.cloth.currentLevel.config.rows})`,
    `lighting detail: ${quality.lighting.currentLevel.id}`,
    `near shadows: ${nearLighting.primaryShadowSource}`,
    `near reflections: ${nearLighting.rtParticipation.reflections}`,
    `governor pressure: ${state.lastDecision.pressureLevel}`,
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
        : `Moonlit GLTF ships collide on ${shipModel.physics.shape ?? "box"} physics volumes; lantern reflections, cloth, and fluid remain continuous while the governor pressure is ${state.lastDecision.pressureLevel}.`;
}

function updateSceneState(state, dt, shipModel) {
  updateShips(state, dt, shipModel);
  updateWaveImpulses(state, dt);
  updateSpray(state, dt);
  updatePhysicsSnapshot(state, shipModel);
}

function syncTextState(state, shipModel) {
  const snapshot = {
    coordinateSystem: "right-handed world; +x right, +y up, +z forward from the shore",
    focus: state.focus,
    stress: state.stress,
    ships: state.ships.map((ship) => ({
      id: ship.id,
      x: Number(ship.position.x.toFixed(2)),
      y: Number(ship.position.y.toFixed(2)),
      z: Number(ship.position.z.toFixed(2)),
      vx: Number(ship.velocity.x.toFixed(2)),
      vz: Number(ship.velocity.z.toFixed(2)),
      massKg: Math.round(getShipMass(ship, shipModel)),
      lanterns: Array.isArray(ship.lanterns) ? ship.lanterns.length : 0,
    })),
    shipPhysics: shipModel.physics,
    sprays: state.sprays.length,
    waveImpulses: state.waveImpulses.length,
    pressure: state.lastDecision?.pressureLevel ?? "stable",
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

export async function mountGpuShowcase(options = {}) {
  injectStyles();
  const root = options.root ?? document.body;
  root.classList.add(ROOT_CLASS);
  const previousMarkup = root.innerHTML;
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const focus = options.focus ?? new URLSearchParams(window.location.search).get("focus") ?? "integrated";
  const dom = buildDemoDom(root, {
    packageName: options.packageName ?? "@plasius/gpu-demo-viewer",
    title: options.title ?? DEFAULT_TITLE,
    subtitle: options.subtitle ?? DEFAULT_SUBTITLE,
  });
  dom.focusMode.value = focus;

  const state = createSceneState({ focus });
  const shipModel = await loadGltfModel(resolveShowcaseAssetUrl());
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
  let animationFrameId = 0;
  let destroyed = false;
  const renderFrame = (nowMs) => {
    if (destroyed) {
      return;
    }
    if (!state.paused) {
      if (state.lastTimeMs == null) {
        state.lastTimeMs = nowMs;
      }
      const dt = Math.min(0.033, (nowMs - state.lastTimeMs) / 1000);
      state.lastTimeMs = nowMs;
      state.time += dt;
      state.frame += 1;
      updateSceneState(state, dt, shipModel);
      updatePackageState(state, options, shipModel, dt);
      const syntheticFrame = 14.2 + state.sprays.length * 0.1 + (state.stress ? 6.4 : 0);
      state.lastDecision = recordTelemetry(state, syntheticFrame);
    }

    state.demoDescription = resolveSceneDescription(state, options, shipModel).description;
    renderScene(ctx, dom.canvas, state, shipModel, dom);
    syncTextState(state, shipModel);
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
    root.classList.remove(ROOT_CLASS);
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
  };
  return {
    state,
    shipModel,
    canvas: dom.canvas,
    destroy,
  };
}

function updatePhysicsSnapshot(state, shipModel) {
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
    },
  });
}

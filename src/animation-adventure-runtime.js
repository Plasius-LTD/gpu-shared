import { GPU_SHOWCASE_CAMERA_MODES_FEATURE } from "./feature-flags.js";

const STYLE_ID = "plasius-animation-adventure-style";
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 540;
const CAMERA_VIEW_MODES = Object.freeze(["editor", "spectator", "third-person", "first-person"]);
const DEFAULT_CAMERA = Object.freeze({
  mode: "lagged-follow",
  viewMode: "spectator",
  availableViewModes: CAMERA_VIEW_MODES,
  cubicBezier: [0.22, 0.61, 0.36, 1],
  lagMs: 240,
  lookAheadMs: 320,
  offset: [-1.1, 2.4, 5.5],
  constraints: Object.freeze({
    maxDistance: 10,
    firstPersonHeadOffset: 0.05,
  }),
  headLook: Object.freeze({
    enabled: true,
    activeOnly: true,
    returnMs: 240,
  }),
});

function isFeatureEnabled(featureFlags, featureId) {
  if (typeof featureFlags?.get === "function") {
    return featureFlags.get(featureId) === true;
  }
  if (typeof featureFlags?.[featureId] === "boolean") {
    return featureFlags[featureId] === true;
  }
  if (typeof featureFlags?.enabled?.[featureId] === "boolean") {
    return featureFlags.enabled[featureId] === true;
  }
  if (typeof featureFlags?.flags?.[featureId] === "boolean") {
    return featureFlags.flags[featureId] === true;
  }
  return false;
}

function normalizeCameraViewMode(value) {
  return CAMERA_VIEW_MODES.includes(value) ? value : "spectator";
}

function normalizeAdventureCamera(camera, featureFlags) {
  const cameraModesEnabled = isFeatureEnabled(featureFlags, GPU_SHOWCASE_CAMERA_MODES_FEATURE);
  const requested = { ...DEFAULT_CAMERA, ...(camera ?? {}) };
  const viewMode = normalizeCameraViewMode(requested.viewMode ?? requested.mode);
  return {
    ...requested,
    mode: requested.mode ?? "lagged-follow",
    viewMode: cameraModesEnabled ? viewMode : "spectator",
    availableViewModes: cameraModesEnabled ? [...CAMERA_VIEW_MODES] : ["spectator"],
    constraints: {
      ...DEFAULT_CAMERA.constraints,
      ...(requested.constraints ?? {}),
    },
    headLook: {
      ...DEFAULT_CAMERA.headLook,
      ...(requested.headLook ?? {}),
      enabled: cameraModesEnabled && requested.headLook?.enabled !== false,
      activeOnly: true,
    },
  };
}

function createPrng(seed) {
  let state = (Number.isInteger(seed) ? seed : 0x12_08_04) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function between(random, min, max) {
  return min + (max - min) * random();
}

function createProp(id, kind, position) {
  return Object.freeze({
    id,
    kind,
    position: Object.freeze(position),
  });
}

export function createAnimationAdventureProps(layout = {}) {
  const random = createPrng(layout.seed);
  const props = [];
  const cropRows = 6;
  for (let index = 0; index < cropRows; index += 1) {
    props.push(createProp(`crop-row-${index}`, "crop-row", [2.4 + index * 0.42, 0, 0.6 + index * 0.22]));
  }

  for (let index = 0; index < 8; index += 1) {
    props.push(createProp(`fence-${index}`, "fence-segment", [-1.5 + index * 1.2, 0, -1.1 + between(random, -0.12, 0.12)]));
  }

  props.push(createProp("cart", "cart", [7.2, 0, -0.3]));
  props.push(createProp("crate-a", "crate", [6.4, 0, 0.42]));
  props.push(createProp("crate-b", "crate", [6.8, 0, 0.78]));

  for (let index = 0; index < 5; index += 1) {
    props.push(createProp(`small-tree-${index}`, "small-tree", [
      between(random, -2.8, 8.4),
      0,
      between(random, 2.8, 4.8),
    ]));
  }

  for (const [index, point] of (layout.route ?? []).entries()) {
    props.push(createProp(`path-marker-${index}`, "path-marker", point.position));
  }

  return Object.freeze(props);
}

function installStyle(document) {
  if (document.getElementById?.(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .plasius-animation-adventure {
      min-height: 100%;
      display: grid;
      place-items: stretch;
      background: #d8e8d0;
      overflow: hidden;
    }
    .plasius-animation-adventure__canvas {
      width: 100%;
      height: 100%;
      min-height: 420px;
      display: block;
    }
  `;
  document.head?.appendChild?.(style);
}

function resolveRoot(options) {
  if (options.root) {
    return options.root;
  }
  return globalThis.document?.body;
}

async function loadBinaryAsset(url, loader) {
  if (!url) {
    return null;
  }
  if (typeof loader === "function") {
    return loader(url);
  }
  if (typeof fetch !== "function") {
    return null;
  }
  const response = await fetch(String(url));
  if (!response.ok) {
    throw new Error(`Animation adventure asset failed to load: ${url}`);
  }
  return response.arrayBuffer();
}

function distance3(a = [0, 0, 0], b = [0, 0, 0]) {
  return Math.hypot(
    (b[0] ?? 0) - (a[0] ?? 0),
    (b[1] ?? 0) - (a[1] ?? 0),
    (b[2] ?? 0) - (a[2] ?? 0),
  );
}

function movementDistancePerLoop(profile) {
  const movementProfile = profile ?? {};
  const rootDistance = Number(movementProfile.rootTranslationDistance ?? movementProfile.rootTranslation?.distance ?? 0);
  if (Number.isFinite(rootDistance) && rootDistance > 0) {
    return rootDistance;
  }
  const strideLength = Number(movementProfile.strideLength ?? movementProfile.strideLengthMeters ?? 0);
  return Number.isFinite(strideLength) && strideLength > 0 ? strideLength : 0;
}

function movementRequirementType(requirement, beat) {
  if (requirement?.type) {
    return requirement.type;
  }
  if (beat?.kind === "locomotion") {
    return beat?.rootMotion === "in-place" ? "stationary" : "travel";
  }
  if (beat?.kind === "action" || beat?.kind === "idle") {
    return "stationary";
  }
  return beat?.pathPointId ? "travel" : "stationary";
}

function validateMovementProfiles({ clips, beats, route }) {
  const profiles = new Map(clips.map((clip) => [clip.id, clip.movementProfile ?? null]));
  const routePoints = new Map(route.map((point) => [point.id, point]));
  const errors = [];
  const warnings = [];
  const validatedBeats = [];
  let currentPosition = route[0]?.position ? [...route[0].position] : [0, 0, 0];

  for (const beat of beats) {
    const requirement = beat.movementRequirement ?? beat.movement ?? null;
    const type = movementRequirementType(requirement, beat);
    const profile = profiles.get(beat.clipId);
    const targetPoint = beat.pathPointId ? routePoints.get(beat.pathPointId) : null;
    const targetPosition = targetPoint?.position ? [...targetPoint.position] : [...currentPosition];
    const movesThroughWorld = type === "travel" || type === "jump" || type === "root-authored";
    const distance = Number(requirement?.distance ?? (movesThroughWorld ? distance3(currentPosition, targetPosition) : 0));
    const distancePerLoop = movementDistancePerLoop(profile);
    const durationMs = Math.max(1, Number(profile?.durationMs ?? beat.durationMs ?? 1));
    const loops = movesThroughWorld && distancePerLoop > 0 ? Math.max(1, Math.ceil(distance / distancePerLoop)) : 1;
    const derivedDurationMs = movesThroughWorld && distancePerLoop > 0 ? Math.round(loops * durationMs) : beat.durationMs;
    const actualSpeed = distance > 0 && derivedDurationMs > 0 ? distance / (derivedDurationMs / 1000) : 0;
    const [minSpeed, maxSpeed] = Array.isArray(requirement?.speedRange)
      ? [Number(requirement.speedRange[0] ?? 0), Number(requirement.speedRange[1] ?? Infinity)]
      : [0, Infinity];

    if (!profile) {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: distance,
        actualDistance: 0,
        reason: `clip '${beat.clipId}' is missing a movementProfile`,
      });
    } else if (profile.motionMode === "invalid") {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: distance,
        actualDistance: distancePerLoop,
        reason: `clip '${beat.clipId}' is quarantined for animation adventure playback`,
      });
    } else if (movesThroughWorld && profile.worldDisplacementAllowed !== true) {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: distance,
        actualDistance: distancePerLoop,
        reason: `beat '${beat.id}' requires ${type} movement but clip '${beat.clipId}' is stationary`,
      });
    } else if (movesThroughWorld && distancePerLoop <= 0) {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: distance,
        actualDistance: 0,
        reason: `beat '${beat.id}' requires ${type} movement but clip '${beat.clipId}' has no root or calibrated stride distance`,
      });
    } else if (!movesThroughWorld && profile.worldDisplacementAllowed === true && (profile.rootTranslationDistance ?? 0) > (requirement?.maxDrift ?? 0.05)) {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: 0,
        actualDistance: profile.rootTranslationDistance,
        reason: `stationary beat '${beat.id}' uses a clip with root drift`,
      });
    }

    if (movesThroughWorld && actualSpeed > 0 && (actualSpeed < minSpeed || actualSpeed > maxSpeed)) {
      errors.push({
        beatId: beat.id,
        clipId: beat.clipId,
        expectedDistance: distance,
        actualDistance: distancePerLoop,
        reason: `beat '${beat.id}' speed ${actualSpeed.toFixed(3)}m/s is outside ${minSpeed}-${maxSpeed}m/s`,
      });
    }

    if (movesThroughWorld && Number(profile?.footSlideTolerance ?? 0) > 0.2) {
      warnings.push({
        beatId: beat.id,
        clipId: beat.clipId,
        reason: `clip '${beat.clipId}' foot-slide tolerance is loose`,
      });
    }

    validatedBeats.push({
      ...beat,
      durationMs: derivedDurationMs,
      validatedDurationMs: derivedDurationMs,
      movementRequirement: {
        ...(requirement ?? { type }),
        type,
        distance,
        actualSpeed,
        loopCount: loops,
        validatedDurationMs: derivedDurationMs,
      },
    });

    if (movesThroughWorld) {
      currentPosition = targetPosition;
    }
  }

  return Object.freeze({
    status: errors.length ? "failed" : "passed",
    errors: Object.freeze(errors),
    warnings: Object.freeze(warnings),
    beats: Object.freeze(validatedBeats),
  });
}

export async function mountGpuAnimationAdventure(options = {}, featureFlags = options.__featureFlags) {
  const root = resolveRoot(options);
  if (!root?.ownerDocument) {
    throw new Error("animation adventure requires a root element with an ownerDocument.");
  }
  const document = root.ownerDocument;
  const adventure = options.animationAdventure ?? {};
  installStyle(document);

  const previousHtml = root.innerHTML;
  root.innerHTML = "";
  root.classList?.add?.("plasius-animation-adventure");

  const canvas = document.createElement("canvas");
  canvas.className = "plasius-animation-adventure__canvas";
  canvas.width = options.width ?? DEFAULT_WIDTH;
  canvas.height = options.height ?? DEFAULT_HEIGHT;
  root.appendChild(canvas);

  const clips = [...(adventure.clips ?? adventure.clipRefs ?? [])];
  const [modelAsset, clipAssets, rendererModule] = await Promise.all([
    loadBinaryAsset(adventure.modelUrl, options.__modelAssetLoader),
    Promise.all(clips.map((clip) => loadBinaryAsset(clip.url ?? clip.clipUrl, options.__clipAssetLoader))),
    (typeof options.__rendererLoader === "function"
      ? options.__rendererLoader()
      : import("@plasius/gpu-renderer")),
  ]);

  if (typeof rendererModule.createAnimatedSceneRenderer !== "function") {
    throw new Error("renderer loader must provide createAnimatedSceneRenderer.");
  }

  const route = adventure.route ?? [];
  const movementValidation = validateMovementProfiles({
    clips,
    beats: adventure.beats ?? [],
    route,
  });
  if (movementValidation.status !== "passed") {
    const firstError = movementValidation.errors[0];
    throw new Error(
      `Animation adventure movement validation failed for beat '${firstError?.beatId ?? "unknown"}' clip '${firstError?.clipId ?? "unknown"}': ${firstError?.reason ?? "unknown movement mismatch"}`,
    );
  }
  const props = adventure.generatedProps ?? createAnimationAdventureProps({
    ...(adventure.props ?? {}),
    route,
  });
  const camera = normalizeAdventureCamera(adventure.camera, featureFlags);
  const renderer = rendererModule.createAnimatedSceneRenderer({
    canvas,
    route,
    beats: movementValidation.beats,
    props,
    camera,
    modelAsset,
    clipAssets: clips.map((clip, index) => ({
      id: clip.id,
      asset: clipAssets[index] ?? null,
      movementProfile: clip.movementProfile ?? null,
    })),
    animationAdventure: {
      ...adventure,
      beats: movementValidation.beats,
      movementValidation,
    },
  });
  renderer.resize(canvas.width, canvas.height, 1);
  renderer.start();
  const rendererSnapshot = renderer.getSnapshot();

  return {
    canvas,
    state: {
      demoMode: "animation-adventure",
      modelUrl: adventure.modelUrl,
      modelLoaded: modelAsset !== null,
      modelRenderable: rendererSnapshot.modelRenderable === true,
      fallbackProxyActive: rendererSnapshot.fallbackProxyActive === true,
      skinnedJointCount: rendererSnapshot.skinnedJointCount ?? 0,
      skinnedVertexCount: rendererSnapshot.skinnedVertexCount ?? 0,
      activeClipRenderable: rendererSnapshot.activeClipRenderable === true,
      loadedClipCount: clipAssets.filter(Boolean).length,
      clipIds: clips.map((clip) => clip.id),
      propSeed: adventure.props?.seed,
      propCount: props.length,
      cameraModesEnabled: isFeatureEnabled(featureFlags, GPU_SHOWCASE_CAMERA_MODES_FEATURE),
      camera,
      movementValidation: {
        status: movementValidation.status,
        errors: movementValidation.errors,
        warnings: movementValidation.warnings,
      },
      rendererSnapshot,
    },
    renderer,
    props,
    setCameraViewMode(viewMode) {
      renderer.setCameraViewMode?.(viewMode);
    },
    applyCameraControl(control, controlOptions) {
      renderer.applyCameraControl?.(control, controlOptions);
    },
    destroy() {
      renderer.destroy();
      root.classList?.remove?.("plasius-animation-adventure");
      root.innerHTML = previousHtml;
    },
  };
}

import { resolveShowcaseAssetUrl } from "./asset-url.js";
import { loadGltfModel } from "./gltf-loader.js";
import { GPU_SHOWCASE_REALISTIC_MODELS_FEATURE } from "./feature-flags.js";
import {
  createGpuSharedTranslator,
  gpuSharedTranslationKeys,
} from "./i18n.js";

const STYLE_ID = "plasius-shared-3d-showcase-style";
const ROOT_CLASS = "plasius-showcase-root";
const CAPTURE_CLASS = "plasius-showcase-root--capture";
const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;
const CAPTURE_CANVAS_PIXEL_BUDGET = 1920 * 1080;
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

const FALLBACK_LIGHTING_DISTANCE_BANDS = Object.freeze([
  Object.freeze({
    band: "near",
    primaryShadowSource: "ray-traced-primary",
    rtParticipation: Object.freeze({
      reflections: "full",
      globalIllumination: "high",
      directShadows: "premium",
    }),
    updateCadenceDivisor: 1,
  }),
  Object.freeze({
    band: "mid",
    primaryShadowSource: "ray-traced-secondary",
    rtParticipation: Object.freeze({
      reflections: "medium",
      globalIllumination: "medium",
      directShadows: "selective",
    }),
    updateCadenceDivisor: 2,
  }),
  Object.freeze({
    band: "far",
    primaryShadowSource: "baked",
    rtParticipation: Object.freeze({
      reflections: "low",
      globalIllumination: "low",
      directShadows: "none",
    }),
    updateCadenceDivisor: 4,
  }),
  Object.freeze({
    band: "horizon",
    primaryShadowSource: "impression",
    rtParticipation: Object.freeze({
      reflections: "off",
      globalIllumination: "off",
      directShadows: "none",
    }),
    updateCadenceDivisor: 8,
  }),
]);
const FALLBACK_LIGHTING_PROFILE = "cinematic";
const FALLBACK_PHYSICS_PROFILE = "cinematic";
const FALLBACK_PERFORMANCE_LEVELS = Object.freeze({
  fluid: Object.freeze([
    Object.freeze({
      id: "low",
      config: Object.freeze({ nearResolution: 10, midResolution: 6, splashCount: 10 }),
      estimatedCostMs: 0.8,
    }),
    Object.freeze({
      id: "medium",
      config: Object.freeze({ nearResolution: 16, midResolution: 8, splashCount: 18 }),
      estimatedCostMs: 1.4,
    }),
    Object.freeze({
      id: "high",
      config: Object.freeze({ nearResolution: 24, midResolution: 12, splashCount: 28 }),
      estimatedCostMs: 2.4,
    }),
  ]),
  cloth: Object.freeze([
    Object.freeze({
      id: "low",
      config: Object.freeze({ cols: 10, rows: 7 }),
      estimatedCostMs: 0.7,
    }),
    Object.freeze({
      id: "medium",
      config: Object.freeze({ cols: 16, rows: 11 }),
      estimatedCostMs: 1.3,
    }),
    Object.freeze({
      id: "high",
      config: Object.freeze({ cols: 24, rows: 16 }),
      estimatedCostMs: 2.1,
    }),
  ]),
  lighting: Object.freeze([
    Object.freeze({
      id: "low",
      config: Object.freeze({ shadowStrength: 0.18, reflectionStrength: 0.08 }),
      estimatedCostMs: 0.5,
    }),
    Object.freeze({
      id: "medium",
      config: Object.freeze({ shadowStrength: 0.34, reflectionStrength: 0.16 }),
      estimatedCostMs: 1.0,
    }),
    Object.freeze({
      id: "high",
      config: Object.freeze({ shadowStrength: 0.5, reflectionStrength: 0.24 }),
      estimatedCostMs: 1.8,
    }),
  ]),
});

function createFallbackClothFeatureModule() {
  const fallback = createFallbackClothFeatureAdapters();
  return {
    clothGarmentKinds: fallback.garmentKinds,
    clothProfileNames: fallback.profileNames,
    createClothRepresentationPlan: fallback.createPlan,
    selectClothRepresentationBand: fallback.selectBand,
  };
}

function createFallbackFluidFeatureModule() {
  const fallback = createFallbackFluidFeatureAdapters();
  return {
    fluidBodyKinds: fallback.bodyKinds,
    fluidProfileNames: fallback.profileNames,
    createFluidContinuityEnvelope: fallback.createContinuityEnvelope,
    createFluidRepresentationPlan: fallback.createPlan,
    selectFluidRepresentationBand: fallback.selectBand,
  };
}

function createFallbackLightingFeatureModule() {
  return {
    createLightingBandPlan({ profile = FALLBACK_LIGHTING_PROFILE, importance = "high" } = {}) {
      const defaultPlan = {
        profile,
        importance,
        bands: FALLBACK_LIGHTING_DISTANCE_BANDS,
      };
      return defaultPlan;
    },
    defaultLightingProfile: FALLBACK_LIGHTING_PROFILE,
    getLightingProfile(profile = FALLBACK_LIGHTING_PROFILE) {
      return {
        name: profile,
        bands: FALLBACK_LIGHTING_DISTANCE_BANDS,
      };
    },
    lightingDistanceBands: FALLBACK_LIGHTING_DISTANCE_BANDS,
  };
}

function createFallbackPerformanceQualityState(levels = [], initialLevel = "high", profile = "") {
  const fallbackLevels = levels.length ? levels : FALLBACK_PERFORMANCE_LEVELS[profile] ?? [];
  const resolvedLevels = fallbackLevels.map((entry) => ({
    id: String(entry?.id ?? "high"),
    config: entry?.config ?? {},
    estimatedCostMs: Number.isFinite(Number(entry?.estimatedCostMs))
      ? Number(entry.estimatedCostMs)
      : 1.0,
  }));
  if (resolvedLevels.length === 0) {
    return {
      module: {
        id: "high",
        config: Object.freeze({}),
        estimatedCostMs: 1.0,
      },
      getSnapshot() {
        return {
          currentLevel: {
            id: "high",
            config: Object.freeze({}),
            estimatedCostMs: 1.0,
          },
        };
      },
      id: "high",
    };
  }
  const initial = resolvedLevels.find((entry) => entry.id === initialLevel) ?? resolvedLevels[0];
  return {
    id: initial.id,
    getSnapshot() {
      return {
        currentLevel: {
          id: initial.id,
          config: initial.config,
          estimatedCostMs: initial.estimatedCostMs,
        },
      };
    },
  };
}

function createFallbackPerformanceFeatureModule() {
  const moduleIds = new Set(["fluid-detail", "cloth-detail", "lighting-detail"]);

  return {
    createDeviceProfile(profile = {}) {
      return {
        deviceClass: "desktop",
        mode: "flat",
        refreshRateHz: Number.isFinite(profile?.refreshRateHz)
          ? Number(profile.refreshRateHz)
          : 60,
        supportedFrameRates: Array.isArray(profile?.supportedFrameRates)
          ? profile.supportedFrameRates
          : [60, 90],
        supportsWebGpu: true,
      };
    },
    createQualityLadderAdapter({ id, domain, levels, initialLevel }) {
      return {
        id: String(id ?? ""),
        domain,
        ...createFallbackPerformanceQualityState(
          domain === "fluid" ? FALLBACK_PERFORMANCE_LEVELS.fluid : domain === "cloth" ? FALLBACK_PERFORMANCE_LEVELS.cloth : FALLBACK_PERFORMANCE_LEVELS.lighting,
          initialLevel,
          domain
        ),
      };
    },
    createGpuPerformanceGovernor({ device, modules = [], adaptation = {} } = {}) {
      let pressureLevel = "stable";
      let frameSamples = 0;
      let averageMs = 16.67;

      const clamp = (next = 16.67) => (Number.isFinite(next) ? Math.max(1, next) : 16.67);
      const target = Object.freeze({
        targetFrameTimeMs: 16.67,
        downgradeFrameTimeMs: clamp(adaptation?.degradeThresholdMs ?? 20),
        upgradeFrameTimeMs: clamp(adaptation?.upgradeThresholdMs ?? 14),
      });

      return {
        recordFrame({ frameTimeMs = averageMs } = {}) {
          const sample = Number.isFinite(Number(frameTimeMs)) ? Number(frameTimeMs) : averageMs;
          frameSamples += 1;
          averageMs = clamp((averageMs * (frameSamples - 1) + sample) / frameSamples);
          const fps = 1000 / averageMs;

          pressureLevel =
            sample > target.downgradeFrameTimeMs
              ? "degrade"
              : pressureLevel === "degrade" && sample <= target.upgradeFrameTimeMs
                ? "stable"
                : pressureLevel;

          return {
            pressureLevel,
            metrics: {
              fps,
              averageFrameTimeMs: averageMs,
            },
            adjustments: pressureLevel === "degrade" ? [{ type: "capability-step-down" }] : [],
          };
        },
        getTarget() {
          return target;
        },
        getState() {
          return {
            modules: modules
              .filter((entry) => entry != null && typeof entry.id === "string" && moduleIds.has(entry.id))
              .map((entry) => ({
                isAtMaximum: pressureLevel === "stable",
              })),
          };
        },
      };
    },
  };
}

function createFallbackDebugFeatureModule() {
  let queueSamples = 0;
  let queuePeakDepth = 0;
  let readyLaneSamples = 0;
  let readyLanePeakDepth = 0;
  let dispatchSamples = 0;
  let dispatchDurationTotal = 0;
  let dependencyUnlockSamples = 0;
  let dependencyUnlockCount = 0;
  let pipelineSamples = 0;
  let pipelineAgeTotal = 0;
  let frameSamples = 0;
  let frameTimeTotal = 0;
  let gpuBusyTotal = 0;
  let frameDroppedSamples = 0;
  let memoryTotalBytes = 0;

  function ensureNumber(value, fallback = 0) {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : fallback;
  }

  function createDebugSession({ adapter } = {}) {
    const memoryHint = Number.isFinite(Number(adapter?.memoryCapacityHintBytes))
      ? Number(adapter.memoryCapacityHintBytes)
      : 0;

    memoryTotalBytes = Math.max(0, memoryHint);

    return {
      trackAllocation({ sizeBytes = 0 } = {}) {
        memoryTotalBytes += ensureNumber(sizeBytes);
      },
      recordQueue({ depth = 0 } = {}) {
        queueSamples += 1;
        queuePeakDepth = Math.max(queuePeakDepth, ensureNumber(depth, 0));
      },
      recordReadyLane({ depth = 0 } = {}) {
        readyLaneSamples += 1;
        readyLanePeakDepth = Math.max(readyLanePeakDepth, ensureNumber(depth, 0));
      },
      recordDispatch({ durationMs = 0 } = {}) {
        dispatchSamples += 1;
        dispatchDurationTotal += ensureNumber(durationMs);
      },
      recordDependencyUnlock({ unlockCount = 0 } = {}) {
        dependencyUnlockSamples += 1;
        dependencyUnlockCount += ensureNumber(unlockCount);
      },
      recordPipelinePhase({ snapshotAgeMs = 0 } = {}) {
        pipelineSamples += 1;
        pipelineAgeTotal += ensureNumber(snapshotAgeMs);
      },
      recordFrame({
        frameTimeMs = 16.67,
        targetFrameTimeMs = 16.67,
        gpuBusyMs = 0,
        dropped = false,
      } = {}) {
        frameSamples += 1;
        frameTimeTotal += ensureNumber(frameTimeMs);
        gpuBusyTotal += ensureNumber(gpuBusyMs);
        frameDroppedSamples += dropped === true ? 1 : 0;
        targetFrameTimeMs;
      },
      getSnapshot() {
        const queueAverageDepth = queueSamples > 0 ? queuePeakDepth / queueSamples : 0;
        return {
          frames: {
            sampleCount: frameSamples,
            averageFrameTimeMs: frameSamples > 0 ? frameTimeTotal / frameSamples : 0,
            averageGpuBusyMs: frameSamples > 0 ? gpuBusyTotal / frameSamples : 0,
            droppedCount: frameDroppedSamples,
          },
          queues: {
            sampleCount: queueSamples,
            peakDepth: queuePeakDepth,
            averageDepth: queueAverageDepth,
          },
          dispatch: {
            sampleCount: dispatchSamples,
            averageDurationMs: dispatchSamples > 0 ? dispatchDurationTotal / dispatchSamples : 0,
          },
          dag: {
            peakReadyLaneDepth: readyLanePeakDepth,
            totalUnlockCount: dependencyUnlockCount,
            unlockSamples: dependencyUnlockSamples,
          },
          pipeline: {
            sampleCount: pipelineSamples,
            averageSnapshotAgeMs: pipelineSamples > 0 ? pipelineAgeTotal / pipelineSamples : 0,
          },
          memory: {
            totalTrackedBytes: memoryTotalBytes,
          },
        };
      },
    };
  }

  return {
    createGpuDebugSession({ adapter } = {}) {
      return createDebugSession({ adapter });
    },
    createSession({ adapter } = {}) {
      return createDebugSession({ adapter });
    },
  };
}

function createFallbackPhysicsFeatureModule() {
  const fallbackPlan = Object.freeze({
    snapshotStageId: "baseline",
    stageOrder: Object.freeze(["authoritative"]),
    secondarySimulationStageIds: Object.freeze(["visual"]),
  });
  return {
    createPhysicsSimulationPlan() {
      return {
        snapshotStageId: "baseline",
        stageOrder: fallbackPlan.stageOrder,
        secondarySimulationStageIds: fallbackPlan.secondarySimulationStageIds,
      };
    },
    createPhysicsWorldSnapshot(input = {}) {
      return {
        stage: "baseline",
        stability: "stable",
        stageId: fallbackPlan.snapshotStageId,
        metadata: input.metadata ?? {},
        bodyCount: input.bodyCount ?? 0,
        dynamicBodyCount: input.dynamicBodyCount ?? 0,
        contactCount: input.contactCount ?? 0,
        snapshotStageId: fallbackPlan.snapshotStageId,
      };
    },
    defaultPhysicsWorkerProfile: FALLBACK_PHYSICS_PROFILE,
    getPhysicsWorkerManifest() {
      return {
        jobs: [
          Object.freeze({
            worker: Object.freeze({ authority: "authoritative", jobType: "simulate" }),
          }),
        ],
        suggestedAllocationIds: Object.freeze(["physics-workspace"]),
      };
    },
  };
}

const SHOWCASE_FEATURE_LOADERS = Object.freeze({
  cloth: () => Promise.resolve(createFallbackClothFeatureModule()),
  fluid: () => Promise.resolve(createFallbackFluidFeatureModule()),
  lighting: () => Promise.resolve(createFallbackLightingFeatureModule()),
  performance: () => Promise.resolve(createFallbackPerformanceFeatureModule()),
  debug: () => Promise.resolve(createFallbackDebugFeatureModule()),
  physics: () => Promise.resolve(createFallbackPhysicsFeatureModule()),
});

const DEFAULT_FLUID_BAND_THRESHOLDS = Object.freeze({
  near: Object.freeze({ minDistance: 0, maxDistance: 22 }),
  mid: Object.freeze({ minDistance: 22, maxDistance: 90 }),
  far: Object.freeze({ minDistance: 90, maxDistance: 260 }),
  horizon: Object.freeze({ minDistance: 260, maxDistance: Number.POSITIVE_INFINITY }),
});

const DEFAULT_CLOTH_BAND_THRESHOLDS = Object.freeze({
  near: Object.freeze({ minDistance: 0, maxDistance: 24 }),
  mid: Object.freeze({ minDistance: 24, maxDistance: 86 }),
  far: Object.freeze({ minDistance: 86, maxDistance: 190 }),
  horizon: Object.freeze({ minDistance: 190, maxDistance: Number.POSITIVE_INFINITY }),
});

function resolveFluidBandSelection(distance, thresholds = DEFAULT_FLUID_BAND_THRESHOLDS) {
  if (!Number.isFinite(distance)) {
    return "horizon";
  }
  if (distance <= (thresholds.near?.maxDistance ?? DEFAULT_FLUID_BAND_THRESHOLDS.near.maxDistance)) {
    return "near";
  }
  if (distance <= (thresholds.mid?.maxDistance ?? DEFAULT_FLUID_BAND_THRESHOLDS.mid.maxDistance)) {
    return "mid";
  }
  if (distance <= (thresholds.far?.maxDistance ?? DEFAULT_FLUID_BAND_THRESHOLDS.far.maxDistance)) {
    return "far";
  }
  return "horizon";
}

function createFallbackFluidFeatureAdapters() {
  const defaultContinuityBand = Object.freeze({
    amplitudeFloor: 0.22,
    frequencyFloor: 0.05,
    blendWindowMeters: 14,
    retainFoamHistory: true,
    retainDirectionality: true,
  });
  return {
    bodyKinds: Object.freeze(["ocean"]),
    profileNames: Object.freeze(["cinematic"]),
    createContinuityEnvelope() {
      return Object.freeze({
        bands: Object.freeze({
          near: defaultContinuityBand,
          mid: Object.freeze({
            ...defaultContinuityBand,
            blendWindowMeters: 22,
            amplitudeFloor: 0.17,
          }),
          far: Object.freeze({
            ...defaultContinuityBand,
            blendWindowMeters: 34,
            amplitudeFloor: 0.12,
          }),
          horizon: Object.freeze({
            ...defaultContinuityBand,
            blendWindowMeters: 42,
            amplitudeFloor: 0.09,
          }),
        }),
      });
    },
    createPlan({ fluidBodyId = "harbor", kind = "ocean", profile = "cinematic" }) {
      return Object.freeze({
        fluidBodyId,
        kind,
        profile,
        thresholds: DEFAULT_FLUID_BAND_THRESHOLDS,
        representations: Object.freeze([
          Object.freeze({
            band: "near",
            output: "raster",
            rtParticipation: "full",
            shading: Object.freeze({ refraction: 0.14, reflectionMode: "full", caustics: true }),
          }),
          Object.freeze({
            band: "mid",
            output: "raster",
            rtParticipation: "reduced",
            shading: Object.freeze({ reflectionMode: "partial" }),
          }),
          Object.freeze({
            band: "far",
            output: "raster",
            rtParticipation: "low",
            shading: Object.freeze({ reflectionMode: "partial" }),
          }),
          Object.freeze({
            band: "horizon",
            output: "coarse",
            rtParticipation: "off",
            shading: Object.freeze({ reflectionMode: "reduced" }),
          }),
        ]),
      });
    },
    selectBand(distance, thresholds = DEFAULT_FLUID_BAND_THRESHOLDS) {
      return resolveFluidBandSelection(distance, thresholds);
    },
  };
}

function createFallbackClothFeatureAdapters() {
  const defaultContinuity = Object.freeze({
    amplitudeFloor: 0.22,
    wrinkleFloor: 0.32,
    damping: 0.58,
    creaseBias: 0.14,
  });
  return {
    garmentKinds: Object.freeze(["flag"]),
    profileNames: Object.freeze(["cinematic"]),
    createPlan() {
      return Object.freeze({
        thresholds: DEFAULT_CLOTH_BAND_THRESHOLDS,
        representations: Object.freeze([
          Object.freeze({
            band: "near",
            continuity: defaultContinuity,
          }),
          Object.freeze({
            band: "mid",
            continuity: defaultContinuity,
          }),
          Object.freeze({
            band: "far",
            continuity: defaultContinuity,
          }),
          Object.freeze({
            band: "horizon",
            continuity: defaultContinuity,
          }),
        ]),
      });
    },
    selectBand(distance, thresholds = DEFAULT_CLOTH_BAND_THRESHOLDS) {
      if (!Number.isFinite(distance)) {
        return "horizon";
      }
      if (distance <= (thresholds.near?.maxDistance ?? DEFAULT_CLOTH_BAND_THRESHOLDS.near.maxDistance)) {
        return "near";
      }
      if (distance <= (thresholds.mid?.maxDistance ?? DEFAULT_CLOTH_BAND_THRESHOLDS.mid.maxDistance)) {
        return "mid";
      }
      if (distance <= (thresholds.far?.maxDistance ?? DEFAULT_CLOTH_BAND_THRESHOLDS.far.maxDistance)) {
        return "far";
      }
      return "horizon";
    },
  };
}

function normalizeClothFeatureAdapters(clothFeatures) {
  const fallback = createFallbackClothFeatureAdapters();
  if (clothFeatures == null || typeof clothFeatures !== "object") {
    return fallback;
  }

  return {
    garmentKinds:
      Array.isArray(clothFeatures.garmentKinds) && clothFeatures.garmentKinds.length > 0
        ? clothFeatures.garmentKinds
        : fallback.garmentKinds,
    profileNames:
      Array.isArray(clothFeatures.profileNames) && clothFeatures.profileNames.length > 0
        ? clothFeatures.profileNames
        : fallback.profileNames,
    createPlan: assertRequiredFunction(clothFeatures, "cloth", "createPlan"),
    selectBand: assertRequiredFunction(clothFeatures, "cloth", "selectBand"),
  };
}

function normalizeFluidFeatureAdapters(fluidFeatures) {
  const fallback = createFallbackFluidFeatureAdapters();
  if (fluidFeatures == null || typeof fluidFeatures !== "object") {
    return fallback;
  }

  return {
    bodyKinds:
      Array.isArray(fluidFeatures.bodyKinds) && fluidFeatures.bodyKinds.length > 0
        ? fluidFeatures.bodyKinds
        : fallback.bodyKinds,
    profileNames:
      Array.isArray(fluidFeatures.profileNames) && fluidFeatures.profileNames.length > 0
        ? fluidFeatures.profileNames
        : fallback.profileNames,
    createContinuityEnvelope: assertRequiredFunction(
      fluidFeatures,
      "fluid",
      "createContinuityEnvelope"
    ),
    createPlan: assertRequiredFunction(fluidFeatures, "fluid", "createPlan"),
    selectBand: assertRequiredFunction(fluidFeatures, "fluid", "selectBand"),
  };
}

function assertRequiredFunction(module, featureLabel, exportName) {
  const value = module?.[exportName];
  if (typeof value !== "function") {
    throw new Error(
      `Showcase ${featureLabel} feature package must export "${exportName}" as a function.`
    );
  }
  return value;
}

function assertRequiredArray(module, featureLabel, exportName) {
  const value = module?.[exportName];
  if (!Array.isArray(value)) {
    throw new Error(
      `Showcase ${featureLabel} feature package must export "${exportName}" as an array.`
    );
  }
  return value;
}

async function loadShowcaseFeatureModule(featureLabel, loader) {
  try {
    const module = await loader();
    if (module == null || typeof module !== "object") {
      throw new Error("module is missing or not an object.");
    }
    return module;
  } catch (error) {
    const message = error?.message ?? String(error);
    throw new Error(`Unable to load showcase ${featureLabel} feature package: ${message}`, {
      cause: error,
    });
  }
}

function resolveShowcaseFeatureLoaders(options = {}) {
  const overrides = options.__showcaseFeatureLoaders;
  return {
    cloth:
      typeof overrides?.cloth === "function"
        ? overrides.cloth
        : SHOWCASE_FEATURE_LOADERS.cloth,
    fluid:
      typeof overrides?.fluid === "function"
        ? overrides.fluid
        : SHOWCASE_FEATURE_LOADERS.fluid,
    lighting:
      typeof overrides?.lighting === "function"
        ? overrides.lighting
        : SHOWCASE_FEATURE_LOADERS.lighting,
    performance:
      typeof overrides?.performance === "function"
        ? overrides.performance
        : SHOWCASE_FEATURE_LOADERS.performance,
    debug:
      typeof overrides?.debug === "function"
        ? overrides.debug
        : SHOWCASE_FEATURE_LOADERS.debug,
    physics:
      typeof overrides?.physics === "function"
        ? overrides.physics
        : SHOWCASE_FEATURE_LOADERS.physics,
  };
}

async function resolveShowcaseFeatureAdapters(options = {}) {
  const loaders = resolveShowcaseFeatureLoaders(options);
  const [
    clothModule,
    fluidModule,
    lightingModule,
    performanceModule,
    debugModule,
    physicsModule,
  ] = await Promise.all([
    loadShowcaseFeatureModule("cloth", loaders.cloth),
    loadShowcaseFeatureModule("fluid", loaders.fluid),
    loadShowcaseFeatureModule("lighting", loaders.lighting),
    loadShowcaseFeatureModule("performance", loaders.performance),
    loadShowcaseFeatureModule("debug", loaders.debug),
    loadShowcaseFeatureModule("physics", loaders.physics),
  ]);

  return {
    cloth: {
      garmentKinds: assertRequiredArray(clothModule, "cloth", "clothGarmentKinds"),
      profileNames: assertRequiredArray(clothModule, "cloth", "clothProfileNames"),
      createPlan: assertRequiredFunction(clothModule, "cloth", "createClothRepresentationPlan"),
      selectBand: assertRequiredFunction(clothModule, "cloth", "selectClothRepresentationBand"),
    },
    fluid: {
      bodyKinds: assertRequiredArray(fluidModule, "fluid", "fluidBodyKinds"),
      profileNames: assertRequiredArray(fluidModule, "fluid", "fluidProfileNames"),
      createContinuityEnvelope: assertRequiredFunction(
        fluidModule,
        "fluid",
        "createFluidContinuityEnvelope"
      ),
      createPlan: assertRequiredFunction(fluidModule, "fluid", "createFluidRepresentationPlan"),
      selectBand: assertRequiredFunction(fluidModule, "fluid", "selectFluidRepresentationBand"),
    },
    lighting: {
      createBandPlan: assertRequiredFunction(lightingModule, "lighting", "createLightingBandPlan"),
      defaultProfile: lightingModule.defaultLightingProfile,
      getProfile: assertRequiredFunction(lightingModule, "lighting", "getLightingProfile"),
      distanceBands: assertRequiredArray(lightingModule, "lighting", "lightingDistanceBands"),
    },
    performance: {
      createDeviceProfile: assertRequiredFunction(
        performanceModule,
        "performance",
        "createDeviceProfile"
      ),
      createGovernor: assertRequiredFunction(
        performanceModule,
        "performance",
        "createGpuPerformanceGovernor"
      ),
      createQualityAdapter: assertRequiredFunction(
        performanceModule,
        "performance",
        "createQualityLadderAdapter"
      ),
    },
    debug: {
      createSession: assertRequiredFunction(debugModule, "debug", "createGpuDebugSession"),
    },
    physics: {
      createSimulationPlan: assertRequiredFunction(
        physicsModule,
        "physics",
        "createPhysicsSimulationPlan"
      ),
      createWorldSnapshot: assertRequiredFunction(
        physicsModule,
        "physics",
        "createPhysicsWorldSnapshot"
      ),
      defaultProfile: physicsModule.defaultPhysicsWorkerProfile,
      getManifest: assertRequiredFunction(physicsModule, "physics", "getPhysicsWorkerManifest"),
    },
  };
}

export const showcaseFocusModes = Object.freeze(Object.keys(CAMERA_PRESETS));

const FOCUS_MODE_TRANSLATION_KEYS = Object.freeze({
  integrated: gpuSharedTranslationKeys.focusIntegrated,
  lighting: gpuSharedTranslationKeys.focusLighting,
  cloth: gpuSharedTranslationKeys.focusCloth,
  fluid: gpuSharedTranslationKeys.focusFluid,
  physics: gpuSharedTranslationKeys.focusPhysics,
  performance: gpuSharedTranslationKeys.focusPerformance,
  debug: gpuSharedTranslationKeys.focusDebug,
});

const SCENE_NOTE_KEYS = Object.freeze([
  gpuSharedTranslationKeys.noteAssetLoading,
  gpuSharedTranslationKeys.noteMoonlight,
  gpuSharedTranslationKeys.noteContinuity,
  gpuSharedTranslationKeys.notePerformance,
]);

const PHYSICS_SCENE_NOTE_KEYS = Object.freeze([
  gpuSharedTranslationKeys.notePhysicsSnapshots,
  gpuSharedTranslationKeys.notePhysicsCollisions,
  gpuSharedTranslationKeys.notePhysicsLighting,
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
    assetKey: "shoreline",
    position: Object.freeze({ x: 1.8, y: -0.04, z: 0.48 }),
    rotationY: -0.03,
    scale: 1.02,
    accent: 0.03,
  }),
  Object.freeze({
    assetKey: "harbor-dock",
    position: Object.freeze({ x: -4.6, y: 0.16, z: 0.7 }),
    rotationY: -0.08,
    scale: 0.84,
    accent: 0.04,
  }),
  Object.freeze({
    assetKey: "lighthouse",
    position: Object.freeze({ x: -9.8, y: 0, z: -0.58 }),
    rotationY: 0.12,
    scale: 0.56,
    accent: 0.08,
  }),
]);

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
const SHORELINE_FOAM_ANCHORS = Object.freeze([
  Object.freeze({ x: -7.8, z: 3.0, length: 1.25, angle: -0.12 }),
  Object.freeze({ x: -6.3, z: 2.72, length: 0.92, angle: 0.08 }),
  Object.freeze({ x: -4.9, z: 3.16, length: 1.08, angle: -0.2 }),
  Object.freeze({ x: -3.2, z: 2.42, length: 0.76, angle: 0.16 }),
  Object.freeze({ x: -1.4, z: 2.82, length: 1.18, angle: -0.04 }),
  Object.freeze({ x: 0.4, z: 3.08, length: 0.88, angle: 0.14 }),
  Object.freeze({ x: 2.1, z: 2.56, length: 1.34, angle: -0.18 }),
  Object.freeze({ x: 3.8, z: 3.0, length: 0.94, angle: 0.1 }),
  Object.freeze({ x: 5.5, z: 2.72, length: 1.12, angle: -0.08 }),
  Object.freeze({ x: 7.0, z: 3.22, length: 0.72, angle: 0.18 }),
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
      position: relative;
      width: 100%;
      min-height: 100dvh;
      overflow: hidden;
    }
    .plasius-panel {
      border: 1px solid var(--plasius-border);
      border-radius: 8px;
      background: var(--plasius-panel);
      box-shadow: var(--plasius-shadow);
      backdrop-filter: blur(12px);
    }
    .plasius-demo__hero-card,
    .plasius-demo__status {
      position: absolute;
      z-index: 3;
      padding: 10px 12px;
    }
    .plasius-demo__hero-card {
      display: none;
    }
    .plasius-demo__status {
      left: 16px;
      bottom: 84px;
      max-width: min(360px, calc(100vw - 32px));
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
      padding: 6px 9px;
      border-radius: 6px;
      background: rgba(243, 177, 106, 0.14);
      color: var(--plasius-accent);
      font-weight: 700;
      font-size: 12px;
    }
    .plasius-demo__status-text {
      margin: 10px 0 0;
      color: var(--plasius-muted);
      font-size: 12px;
      line-height: 1.45;
    }
    .plasius-demo__canvas-panel {
      position: absolute;
      inset: 0;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      backdrop-filter: none;
    }
    .plasius-demo__canvas {
      width: 100%;
      height: 100%;
      min-height: 100dvh;
      display: block;
      border: 0;
      border-radius: 0;
      background: linear-gradient(180deg, #071220 0%, #132440 42%, #10344b 42%, #05111d 100%);
    }
    .${CAPTURE_CLASS} .plasius-demo {
      width: 100vw;
      height: 100vh;
      padding: 0;
      display: block;
    }
    .${CAPTURE_CLASS} .plasius-demo__hero,
    .${CAPTURE_CLASS} .plasius-demo__toolbar,
    .${CAPTURE_CLASS} .plasius-demo__legend,
    .${CAPTURE_CLASS} .plasius-demo__sidebar,
    .${CAPTURE_CLASS} .plasius-demo__diagnostics,
    .${CAPTURE_CLASS} .plasius-demo__status,
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
      top: 84px;
      left: 16px;
      z-index: 4;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      max-width: min(560px, calc(100vw - 32px));
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
      border-radius: 6px;
      background: rgba(9, 20, 34, 0.84);
      color: var(--plasius-ink);
      padding: 8px 10px;
    }
    .plasius-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .plasius-demo__diagnostics {
      position: absolute;
      right: 16px;
      bottom: 84px;
      z-index: 4;
      max-width: min(420px, calc(100vw - 32px));
      color: var(--plasius-ink);
      font-family: "JetBrains Mono", monospace;
      font-size: 12px;
    }
    .plasius-demo__diagnostics summary {
      width: fit-content;
      margin-left: auto;
      border: 1px solid rgba(159, 185, 223, 0.18);
      border-radius: 6px;
      padding: 8px 10px;
      background: rgba(9, 20, 34, 0.84);
      cursor: pointer;
      list-style: none;
    }
    .plasius-demo__diagnostics summary::-webkit-details-marker {
      display: none;
    }
    .plasius-demo__diagnostics[open] {
      width: min(420px, calc(100vw - 32px));
    }
    .plasius-demo__diagnostics[open] summary {
      margin-bottom: 8px;
      background: rgba(243, 177, 106, 0.14);
      color: var(--plasius-accent);
    }
    .plasius-demo__sidebar {
      display: grid;
      gap: 8px;
      max-height: min(58vh, 520px);
      overflow: auto;
    }
    .plasius-demo__card {
      padding: 10px;
    }
    .plasius-demo__card h2 {
      margin: 0;
      color: rgba(226, 236, 255, 0.72);
      font-family: "JetBrains Mono", monospace;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .plasius-demo__metrics,
    .plasius-demo__metrics li {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .plasius-demo__metrics {
      margin-top: 8px;
      display: grid;
      gap: 5px;
      color: var(--plasius-muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .plasius-demo__metrics li {
      border-top: 1px solid rgba(21, 32, 40, 0.08);
      padding-top: 5px;
    }
    .plasius-demo__legend {
      display: none;
    }
    .plasius-demo__legend strong {
      display: block;
      color: var(--plasius-ink);
      margin-bottom: 4px;
    }
    .plasius-demo__footer {
      display: none;
    }
    @media (max-width: 1200px) {
      .plasius-demo__toolbar {
        top: 92px;
      }
    }
    @media (max-width: 640px) {
      .plasius-demo__status {
        left: 10px;
        bottom: 10px;
        max-width: calc(100vw - 126px);
        padding: 6px 8px;
      }
      .plasius-demo__status-text {
        display: none;
      }
      .plasius-demo__status-badge {
        max-width: calc(100vw - 142px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .plasius-demo__toolbar {
        top: 10px;
        left: 10px;
        right: 10px;
        max-width: calc(100vw - 20px);
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: none;
      }
      .plasius-demo__toolbar::-webkit-scrollbar {
        display: none;
      }
      .plasius-demo button,
      .plasius-demo .plasius-toggle,
      .plasius-demo select {
        padding: 7px 8px;
        font-size: 12px;
        white-space: nowrap;
      }
      .plasius-demo__diagnostics {
        right: 10px;
        bottom: 10px;
      }
      .plasius-demo__diagnostics[open] {
        bottom: 56px;
        left: 10px;
        right: 10px;
        width: auto;
        max-width: none;
      }
      .plasius-demo__diagnostics[open] .plasius-demo__sidebar {
        max-height: min(42vh, 340px);
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

function colorToRgba(color, alpha = 1) {
  const r = Math.round(clamp(color.r, 0, 1) * 255);
  const g = Math.round(clamp(color.g, 0, 1) * 255);
  const b = Math.round(clamp(color.b, 0, 1) * 255);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function mixColor(a, b, t) {
  return {
    r: mix(a.r, b.r, t),
    g: mix(a.g, b.g, t),
    b: mix(a.b, b.b, t),
    a: mix(a.a ?? 1, b.a ?? 1, t),
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

  return fallback;
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

function shadeColor(base, normal, lightDir, heightBias = 0, accent = 0) {
  const diffuse = clamp(dotVec3(normalizeVec3(normal), lightDir), 0, 1);
  const brightness = 0.24 + diffuse * 0.72 + heightBias * 0.08 + accent;
  return {
    r: clamp(base.r * brightness, 0, 1),
    g: clamp(base.g * brightness, 0, 1),
    b: clamp(base.b * (brightness + 0.03), 0, 1),
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
        normal,
        baseColor: resolvedColor,
        accent: options.accent ?? 0,
        material: primitive.material,
        reflection: options.reflection ?? 0,
        surfaceType: options.surfaceType ?? "solid",
      });
    }
  }
}

async function loadShowcaseAssetCatalog() {
  const [brigantine, cutter, lighthouse, harborDock, shoreline] = await Promise.all([
    loadGltfModel(resolveShowcaseAssetUrl("brigantine")),
    loadGltfModel(resolveShowcaseAssetUrl("cutter")),
    loadGltfModel(resolveShowcaseAssetUrl("lighthouse")),
    loadGltfModel(resolveShowcaseAssetUrl("harbor-dock")),
    loadGltfModel(resolveShowcaseAssetUrl("shoreline")),
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
      shoreline,
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

function createPerformanceGovernor(performanceFeatures) {
  const createQualityLadderAdapter = assertRequiredFunction(
    performanceFeatures,
    "performance",
    "createQualityAdapter"
  );
  const createDeviceProfile = assertRequiredFunction(
    performanceFeatures,
    "performance",
    "createDeviceProfile"
  );
  const createGpuPerformanceGovernor = assertRequiredFunction(
    performanceFeatures,
    "performance",
    "createGovernor"
  );

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
  const t = options.translate;
  root.innerHTML = `
    <main class="plasius-demo">
      <section class="plasius-demo__hero">
        <section class="plasius-panel plasius-demo__hero-card">
          <p class="plasius-demo__eyebrow">${options.packageName}</p>
          <h1>${options.title}</h1>
          <p class="plasius-demo__lead">${options.subtitle}</p>
        </section>
        <section class="plasius-panel plasius-demo__status">
          <p id="demoStatus" class="plasius-demo__status-badge">${t(gpuSharedTranslationKeys.statusBooting)}</p>
          <p id="demoDetails" class="plasius-demo__status-text">
            ${t(gpuSharedTranslationKeys.detailsBooting)}
          </p>
        </section>
      </section>
      <section class="plasius-demo__layout">
        <section class="plasius-panel plasius-demo__canvas-panel">
          <canvas id="demoCanvas" class="plasius-demo__canvas" width="${DEFAULT_CANVAS_WIDTH}" height="${DEFAULT_CANVAS_HEIGHT}"></canvas>
          <div class="plasius-demo__toolbar">
            <button id="pauseButton" type="button">${t(gpuSharedTranslationKeys.pause)}</button>
            <label class="plasius-toggle">
              <input id="stressToggle" type="checkbox" />
              ${t(gpuSharedTranslationKeys.stressMode)}
            </label>
            <label class="plasius-toggle">
              ${t(gpuSharedTranslationKeys.focus)}
              <select id="focusMode">
                ${showcaseFocusModes
                  .map(
                    (mode) =>
                      `<option value="${mode}">${t(FOCUS_MODE_TRANSLATION_KEYS[mode])}</option>`
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="plasius-demo__legend">
            <strong>${t(gpuSharedTranslationKeys.legendTitle)}</strong>
            ${t(gpuSharedTranslationKeys.legendShipMetadata)}<br />
            ${t(gpuSharedTranslationKeys.legendLighting)}<br />
            ${t(gpuSharedTranslationKeys.legendCollisions)}
          </div>
        </section>
        <details class="plasius-demo__diagnostics">
          <summary>${t(gpuSharedTranslationKeys.debugTelemetry)}</summary>
          <aside class="plasius-demo__sidebar">
            <section class="plasius-panel plasius-demo__card">
              <h2>${t(gpuSharedTranslationKeys.sceneState)}</h2>
              <ul id="sceneMetrics" class="plasius-demo__metrics"></ul>
            </section>
            <section class="plasius-panel plasius-demo__card">
              <h2>${t(gpuSharedTranslationKeys.qualityBudgets)}</h2>
              <ul id="qualityMetrics" class="plasius-demo__metrics"></ul>
            </section>
            <section class="plasius-panel plasius-demo__card">
              <h2>${t(gpuSharedTranslationKeys.debugTelemetry)}</h2>
              <ul id="debugMetrics" class="plasius-demo__metrics"></ul>
            </section>
            <section class="plasius-panel plasius-demo__card">
              <h2>${t(gpuSharedTranslationKeys.notes)}</h2>
              <ul id="sceneNotes" class="plasius-demo__metrics"></ul>
            </section>
          </aside>
        </details>
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

function readVisualNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readPositiveNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function isTruthyCaptureValue(value) {
  return value === "1" || value === "true" || value === "scene" || value === "video";
}

function resolveCaptureSettings(options) {
  const explicitCaptureMode =
    typeof options.captureMode === "boolean" ? options.captureMode : undefined;
  let captureMode = explicitCaptureMode ?? false;
  let renderScale = readPositiveNumber(options.renderScale, undefined);

  try {
    const params = new URLSearchParams(window.location.search);
    if (explicitCaptureMode === undefined) {
      captureMode =
        isTruthyCaptureValue(params.get("capture")) ||
        params.get("presentation") === "capture";
    }
    renderScale = readPositiveNumber(Number(params.get("renderScale")), renderScale);
  } catch {
    // Query-string capture controls are optional and only available in browsers.
  }

  return {
    captureMode,
    renderScale,
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
  const maxScale = state.captureMode ? 2 : 1.5;
  let scale = clamp(requestedScale, 1, maxScale);
  const pixelBudget = state.captureMode
    ? CAPTURE_CANVAS_PIXEL_BUDGET
    : DEFAULT_CANVAS_WIDTH * DEFAULT_CANVAS_HEIGHT * 1.5;
  const projectedPixels = width * height * scale * scale;

  if (projectedPixels > pixelBudget) {
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

function resolveClothPresentation(state, meshDetail, clothFeatures) {
  const clothPlan = clothFeatures.createPlan({
    garmentId: "shore-flag",
    kind: state.focus === "cloth" ? "flag" : clothFeatures.garmentKinds[0],
    profile: state.focus === "cloth" ? "cinematic" : clothFeatures.profileNames[0],
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
  const band = clothFeatures.selectBand(cameraDistance, clothPlan.thresholds);
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
      (0.94 + broadMotion * 0.82 + wrinkleLayers * 0.08) *
      flagMotion *
      (0.36 + u * 0.92);
    const wrinkleForce = vec3(
      Math.sin(wrinklePhase) * 0.12 * wrinkleMotion * flagMotion,
      Math.cos(wrinklePhase * 0.7) * 0.045 * wrinkleMotion,
      Math.cos(wrinklePhase) * 0.08 * broadMotion * flagMotion
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
    waveAmplitude: 0.82,
    waveDirection: { x: 0.88, z: 0.28 },
    wavePhaseSpeed: 0.74,
    wakeStrength: 0.24,
    wakeLength: 17,
    collisionRippleStrength: 0.22,
    waterNear: { r: 0.05, g: 0.2, b: 0.3 },
    waterFar: { r: 0.13, g: 0.31, b: 0.45 },
    harborWall: { r: 0.26, g: 0.24, b: 0.28 },
    harborDeck: { r: 0.33, g: 0.22, b: 0.16 },
    harborTower: { r: 0.23, g: 0.24, b: 0.29 },
    flagColor: { r: 0.54, g: 0.13, b: 0.11 },
    flagMotion: 0.58,
    lanternCore: { r: 0.98, g: 0.8, b: 0.48 },
    lanternGlow: { r: 1, g: 0.56, b: 0.2 },
    lanternReflectionStrength: 0.42,
    torchCore: { r: 0.99, g: 0.72, b: 0.36 },
    torchGlow: { r: 0.98, g: 0.38, b: 0.15 },
    collisionFlash: "rgba(255, 212, 168, 0.08)",
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

function buildClothSurface(model, state, meshDetail, visuals, clothFeatures) {
  const resolvedClothFeatures = normalizeClothFeatureAdapters(clothFeatures);
  const clothPresentation = resolveClothPresentation(state, meshDetail, resolvedClothFeatures);
  const clothState = ensureShowcaseClothState(state, meshDetail, clothPresentation);

  return {
    clothPlan: clothPresentation.clothPlan,
    band: clothPresentation.band,
    representation: clothPresentation.representation,
    continuity: clothPresentation.continuity,
    color: visuals.flagColor,
    material: Object.freeze({
      weaveAlpha: clothPresentation.band === "near" ? 0.22 : 0.12,
      foldAlpha: clothPresentation.band === "near" ? 0.3 : 0.18,
      edgeHighlightAlpha: clothPresentation.band === "near" ? 0.42 : 0.28,
    }),
    positions: clothState.positions.map((point) => vec3(point.x, point.y, point.z)),
    indices: clothState.indices,
    grid: { rows: clothState.rows, cols: clothState.cols },
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

function resolveFluidBandContinuity(continuity, band) {
  if (continuity?.bands && continuity.bands[band]) {
    return continuity.bands[band];
  }

  return continuity ?? { amplitudeFloor: 1, frequencyFloor: 1 };
}

function buildWaterMotionEffects(state) {
  const wakeTrails = [];
  const rippleRings = state.waveImpulses.map((impulse) => {
    const radius = impulse.radius + (1 - impulse.life) * 4.8;
    return Object.freeze({
      center: vec3(
        impulse.x,
        sampleWave(state, impulse.x, impulse.z, state.time) * 0.24 + 0.06,
        impulse.z
      ),
      radius,
      opacity: clamp(impulse.life * 0.13, 0.035, 0.15),
    });
  });

  for (const ship of state.ships) {
    const speed = Math.hypot(ship.velocity.x, ship.velocity.z);
    if (speed <= 0.18) {
      continue;
    }

    const direction = normalizeVec3(vec3(ship.velocity.x, 0, ship.velocity.z));
    const behind = scaleVec3(direction, -1);
    const lateral = vec3(-direction.z, 0, direction.x);
    const points = [];
    for (let sampleIndex = 0; sampleIndex < 6; sampleIndex += 1) {
      const along = 1 + sampleIndex * 1.55;
      const lateralOffset =
        Math.sin(state.time * 1.2 + sampleIndex * 0.8 + readVisualNumber(ship.wanderPhase, 0)) * 0.12;
      const worldPoint = addVec3(
        ship.position,
        addVec3(scaleVec3(behind, along), scaleVec3(lateral, lateralOffset))
      );
      points.push(
        Object.freeze({
          center: vec3(
            worldPoint.x,
            sampleWave(state, worldPoint.x, worldPoint.z, state.time) * 0.24 + 0.04,
            worldPoint.z
          ),
          width: 0.3 + sampleIndex * 0.11,
          foam: clamp(0.28 - sampleIndex * 0.028 + speed * 0.025, 0.1, 0.34),
        })
      );
    }
    wakeTrails.push(
      Object.freeze({
        opacity: clamp(0.1 + speed * 0.048, 0.12, 0.24),
        points: Object.freeze(points),
      })
    );
  }

  return Object.freeze({
    wakeTrails: Object.freeze(wakeTrails),
    rippleRings: Object.freeze(rippleRings),
  });
}

function buildShorelineFoamSegments(state) {
  return Object.freeze(
    SHORELINE_FOAM_ANCHORS.map((anchor, index) => {
      const pulse = 0.5 + Math.sin(state.time * 0.84 + index * 1.17) * 0.5;
      const drift = Math.sin(state.time * 0.38 + index * 0.61) * 0.1;
      const direction = normalizeVec3(vec3(Math.cos(anchor.angle), 0, Math.sin(anchor.angle)));
      const center = vec3(
        anchor.x + direction.x * drift,
        sampleWave(state, anchor.x, anchor.z, state.time) * 0.12 - 0.02,
        anchor.z + direction.z * drift
      );
      return Object.freeze({
        center,
        direction,
        length: anchor.length * (0.78 + pulse * 0.34),
        width: 0.16 + pulse * 0.12,
        opacity: 0.07 + pulse * 0.12,
      });
    })
  );
}

function buildWaterBands(state, fluidDetail, visuals, fluidFeatures) {
  const resolvedFluidFeatures = normalizeFluidFeatureAdapters(fluidFeatures);
  const fluidPlan = resolvedFluidFeatures.createPlan({
    fluidBodyId: "harbor",
    kind: state.focus === "fluid" ? "ocean" : resolvedFluidFeatures.bodyKinds[0],
    profile: state.focus === "fluid" ? "cinematic" : resolvedFluidFeatures.profileNames[0],
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
    const continuity = resolvedFluidFeatures.createContinuityEnvelope({ fluidBodyId: "harbor" });
    const bandContinuity = resolveFluidBandContinuity(continuity, bandSpec.band);
    const bandResolution =
      bandSpec.band === "near"
        ? Math.ceil(fluidDetail.nearResolution * 1.28)
        : bandSpec.band === "mid"
          ? Math.ceil(fluidDetail.midResolution * 1.2)
          : bandSpec.band === "far"
            ? 5
            : 3;
    const cols = Math.max(4, bandResolution * (bandSpec.band === "near" ? 3 : 2));
    const rows = Math.max(4, bandResolution + (bandSpec.band === "near" ? 5 : 2));
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
        const baseHeight =
          bandSpec.y +
          sampleWave(state, x, z, state.time) *
            bandContinuity.amplitudeFloor *
            (bandSpec.band === "near" ? 0.9 : bandSpec.band === "mid" ? 0.55 : 0.3);
        const detailHeight =
          bandSpec.band === "near"
            ? Math.sin(x * 1.25 + z * 0.42 - state.time * 2.4) * 0.035
            : 0;
        const y = baseHeight + detailHeight;
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
      continuity: bandContinuity,
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
      material: Object.freeze({
        highlightAlpha: bandSpec.band === "near" ? 0.2 : bandSpec.band === "mid" ? 0.13 : 0.07,
        foamAlpha: bandSpec.band === "near" ? 0.28 : bandSpec.band === "mid" ? 0.14 : 0.05,
        microRippleScale: bandSpec.band === "near" ? 1 : bandSpec.band === "mid" ? 0.58 : 0.28,
      }),
    });
  }

  return { fluidPlan, bandMeshes };
}

function createSceneState(options, featureAdapters) {
  const translate = options.translate;
  const { governor, fluidDetail, clothDetail, lightingDetail } = createPerformanceGovernor(
    featureAdapters.performance
  );
  const physicsProfile = featureAdapters.physics.defaultProfile;
  const createPhysicsSimulationPlan = assertRequiredFunction(
    featureAdapters.physics,
    "physics",
    "createSimulationPlan"
  );
  const getPhysicsWorkerManifest = assertRequiredFunction(
    featureAdapters.physics,
    "physics",
    "getManifest"
  );
  const createGpuDebugSession = assertRequiredFunction(
    featureAdapters.debug,
    "debug",
    "createSession"
  );

  const physicsPlan = createPhysicsSimulationPlan(physicsProfile);
  const physicsManifest = getPhysicsWorkerManifest(physicsProfile);
  const debugSession = createGpuDebugSession({
    enabled: true,
    adapter: {
      label: translate(gpuSharedTranslationKeys.debugAdapterShowcase),
      memoryCapacityHintBytes: 6 * 1024 * 1024 * 1024,
      coreCountHint: 12,
    },
  });
  debugSession.trackAllocation({
    id: "showcase.color",
    owner: "renderer",
    category: "texture",
    sizeBytes: 1280 * 720 * 4,
    label: translate(gpuSharedTranslationKeys.debugMainColorBuffer),
  });
  debugSession.trackAllocation({
    id: "showcase.shadow-impression",
    owner: "lighting",
    category: "texture",
    sizeBytes: 12 * 1024 * 1024,
    label: translate(gpuSharedTranslationKeys.debugShadowImpressionAtlas),
  });

  return {
    translate,
    focus: options.focus,
    governor,
    fluidDetail,
    clothDetail,
    lightingDetail,
    debugSession,
    showcaseRealisticModelsEnabled: options.realisticModelsEnabled !== false,
    captureMode: options.captureMode === true,
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
        position: vec3(-7.8, 0, 11.2),
        velocity: vec3(1.08, 0, -0.18),
        rotationY: 1.38,
        angularVelocity: 0.025,
        tint: { r: 0.62, g: 0.39, b: 0.23 },
        massScale: 1.42,
        cruiseSpeed: 1.22,
        throttleResponse: 0.36,
        rudderResponse: 0.4,
        wanderPhase: 0.35,
        lanterns: CUTTER_LANTERNS,
        lanternStrength: 1.06,
        collisionRadiusScale: 1.04,
      },
      {
        id: "tidecaller",
        modelKey: "cutter",
        position: vec3(6.8, 0, 5.4),
        velocity: vec3(-0.82, 0, 0.14),
        rotationY: -1.34,
        angularVelocity: -0.035,
        tint: { r: 0.58, g: 0.24, b: 0.16 },
        massScale: 0.84,
        cruiseSpeed: 1.36,
        throttleResponse: 0.52,
        rudderResponse: 0.58,
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

function resolveLocalLightContribution(triangle, lightSources) {
  const contribution = { r: 0, g: 0, b: 0 };
  if (!Array.isArray(lightSources) || triangle.surfaceType === "water") {
    return contribution;
  }

  const normal = normalizeVec3(triangle.normal);
  for (const source of lightSources.slice(0, 8)) {
    const delta = subVec3(source.point, triangle.worldCenter);
    const distance = lengthVec3(delta);
    const attenuation =
      (source.glowScale ?? 1) / Math.max(1, 0.68 + distance * distance * 0.2);
    if (attenuation < 0.012) {
      continue;
    }

    const lightDir = normalizeVec3(delta);
    const facing = clamp(dotVec3(normal, lightDir), 0, 1);
    const response = attenuation * (0.18 + facing * 0.82);
    const glowColor = source.glowColor ?? source.coreColor ?? { r: 1, g: 0.72, b: 0.4 };
    contribution.r += glowColor.r * response * 0.32;
    contribution.g += glowColor.g * response * 0.26;
    contribution.b += glowColor.b * response * 0.18;
  }

  return contribution;
}

function drawTriangles(
  ctx,
  triangles,
  lightDir,
  reflectionStrength,
  camera,
  shadowStrength,
  localLights = []
) {
  triangles.sort((left, right) => right.depth - left.depth);
  for (const triangle of triangles) {
    const surfaceNormal = normalizeVec3(triangle.normal);
    const material = triangle.material ?? {
      roughness: 0.88,
      metallic: 0.08,
      emissive: { r: 0, g: 0, b: 0 },
    };
    const shaded = shadeColor(
      triangle.baseColor,
      surfaceNormal,
      lightDir,
      clamp((triangle.worldCenter.y + 3) / 10, 0, 1),
      triangle.accent
    );
    const reflection = reflectionStrength * (triangle.reflection ?? 0);
    const viewDir = normalizeVec3(subVec3(camera.eye, triangle.worldCenter));
    const reflectedLight = reflectVec3(scaleVec3(lightDir, -1), surfaceNormal);
    const gloss = mix(0.78, 0.14, clamp(material.roughness ?? 0.88, 0, 1)) + (material.metallic ?? 0) * 0.18;
    const specularPower = mix(26, 7, clamp(material.roughness ?? 0.88, 0, 1));
    const specular =
      Math.pow(clamp(dotVec3(reflectedLight, viewDir), 0, 1), specularPower) * gloss;
    const emissive = material.emissive ?? { r: 0, g: 0, b: 0 };
    const localLight = resolveLocalLightContribution(triangle, localLights);
    const occlusion = triangle.surfaceType === "water" ? shadowStrength * 0.018 : shadowStrength * 0.04;
    const detailed = applyMaterialDetail(
      {
        r: clamp(
          shaded.r + reflection * 0.08 + specular * 0.16 + emissive.r * 0.42 + localLight.r - occlusion,
          0,
          1
        ),
        g: clamp(
          shaded.g + reflection * 0.08 + specular * 0.16 + emissive.g * 0.42 + localLight.g - occlusion,
          0,
          1
        ),
        b: clamp(
          shaded.b + reflection * 0.16 + specular * 0.22 + emissive.b * 0.46 + localLight.b - occlusion * 0.5,
          0,
          1
        ),
      },
      material,
      triangle.worldCenter,
      surfaceNormal,
      triangle.surfaceType
    );
    const fill = colorToRgba(
      detailed,
      triangle.baseColor.a ?? 0.98
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

function pushHarborGeometry(camera, viewport, triangles, state) {
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
  const material = cloth.material ?? {};
  ctx.strokeStyle = `rgba(255, 241, 226, ${material.foldAlpha ?? 0.32})`;
  ctx.lineWidth = 1.8;

  for (
    let row = 0;
    row < cloth.grid.rows;
    row += Math.max(1, Math.floor(cloth.grid.rows / 6))
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

  ctx.strokeStyle = `rgba(255, 228, 204, ${material.weaveAlpha ?? 0.22})`;
  ctx.lineWidth = 0.85;
  for (
    let column = 1;
    column < cloth.grid.cols - 1;
    column += Math.max(1, Math.floor(cloth.grid.cols / 8))
  ) {
    ctx.beginPath();
    let started = false;
    for (let row = 0; row < cloth.grid.rows; row += 1) {
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
  ctx.strokeStyle = `rgba(255, 246, 236, ${material.edgeHighlightAlpha ?? 0.5})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let borderStarted = false;
  for (let column = 0; column < cloth.grid.cols; column += 1) {
    const point = projected[column];
    if (!point) {
      continue;
    }
    if (!borderStarted) {
      ctx.moveTo(point.x, point.y);
      borderStarted = true;
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  if (borderStarted) {
    ctx.stroke();
  }

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
    const interval = band.band === "near" ? 4 : 5;
    const alpha = band.material?.highlightAlpha ?? (band.band === "near" ? 0.22 : 0.14);
    ctx.strokeStyle = `rgba(232, 247, 255, ${alpha})`;
    ctx.lineWidth = band.band === "near" ? 0.9 : 0.65;
    for (let row = interval; row < band.rows - 1; row += interval) {
      let started = false;
      ctx.beginPath();
      for (let column = 0; column < band.cols; column += band.band === "near" ? 2 : 3) {
        if (pseudoRandom(row * 47 + column * 13) < 0.18) {
          if (started) {
            ctx.stroke();
            ctx.beginPath();
            started = false;
          }
          continue;
        }
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

    if (band.band === "near") {
      ctx.fillStyle = `rgba(236, 249, 255, ${(band.material?.foamAlpha ?? 0.28) * 0.72})`;
      for (let column = 3; column < band.cols - 3; column += 10) {
        const point = projectPoint(
          band.positions[Math.floor(band.rows * 0.42) * band.cols + column],
          camera,
          viewport
        );
        if (!point) {
          continue;
        }
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, 1.8, 0.75, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function renderShorelineFoamSegments(ctx, segments, camera, viewport) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const segment of segments) {
    const half = scaleVec3(segment.direction, segment.length * 0.5);
    const start = projectPoint(subVec3(segment.center, half), camera, viewport);
    const end = projectPoint(addVec3(segment.center, half), camera, viewport);
    const center = projectPoint(segment.center, camera, viewport);
    if (!start || !end || !center) {
      continue;
    }

    const depthScale = clamp(140 / Math.max(12, center.depth), 3, 10);
    ctx.strokeStyle = `rgba(232, 242, 238, ${segment.opacity})`;
    ctx.lineWidth = clamp(segment.width * depthScale, 0.8, 2.8);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(
      center.x,
      center.y + Math.sin(segment.center.x * 1.7) * 2.4,
      end.x,
      end.y
    );
    ctx.stroke();

    ctx.fillStyle = `rgba(248, 251, 246, ${segment.opacity * 0.68})`;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, depthScale * 0.18, depthScale * 0.08, -0.2, 0, Math.PI * 2);
    ctx.fill();
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
  const count = Math.max(
    3,
    Math.ceil(state.fluidDetail.getSnapshot().currentLevel.config.splashCount * 0.32)
  );
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const speed = 0.46 + Math.random() * intensity * 0.24;
    state.sprays.push({
      position: vec3(point.x, point.y, point.z),
      velocity: vec3(Math.cos(angle) * speed * 0.24, 0.46 + Math.random() * 0.34, Math.sin(angle) * speed * 0.18),
      life: 0.72 + Math.random() * 0.22,
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
      ? 11.6 + wander * 0.82 + crossCurrent * 0.24
      : 5.4 + wander * 0.94 - crossCurrent * 0.32;
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
  const cruiseSpeed = readVisualNumber(ship.cruiseSpeed, 1.25);

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
    0.42;
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
      impactSpeed > 0.36 &&
      Math.max(readVisualNumber(a.collisionCooldown, 0), readVisualNumber(b.collisionCooldown, 0)) <= 0
    ) {
      const contactPoint = vec3(
        (a.position.x + b.position.x) * 0.5,
        (a.position.y + b.position.y) * 0.5 + 0.14,
        (a.position.z + b.position.z) * 0.5
      );
      spawnSpray(state, contactPoint, impactSpeed * 0.9 + penetration * 2.4);
      state.waveImpulses.push({
        x: contactPoint.x,
        z: contactPoint.z,
        strength: clamp(0.1 + impactSpeed * 0.18 + penetration * 0.28, 0.08, 0.52),
        radius: 0.72 + penetration * 0.72,
        life: 1,
      });
      state.collisionCount += 1;
      state.collisionFlash = Math.max(
        state.collisionFlash,
        clamp(impactSpeed * 0.14 + penetration * 0.32, 0.04, 0.24)
      );
      a.collisionCooldown = 0.72;
      b.collisionCooldown = 0.72;
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
    ? Math.max(0.04, state.collisionFlash)
    : Math.max(0, state.collisionFlash - dt * 1.7);
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

  const radius = clamp((1 / projected.depth) * 420 * source.glowScale, 4, 34);
  const halo = ctx.createRadialGradient(projected.x, projected.y, radius * 0.12, projected.x, projected.y, radius);
  halo.addColorStop(0, colorToRgba(source.coreColor, 0.98));
  halo.addColorStop(0.5, colorToRgba(source.glowColor, 0.42));
  halo.addColorStop(1, colorToRgba(source.glowColor, 0));
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = colorToRgba(source.coreColor, 0.98);
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, Math.max(1.2, radius * 0.16), 0, Math.PI * 2);
  ctx.fill();
}

function renderWaterLightReflection(ctx, source, state, camera, viewport) {
  const projected = projectPoint(source.point, camera, viewport);
  if (!projected) {
    return;
  }

  const radius = clamp((1 / projected.depth) * 420 * source.glowScale, 4, 34);
  const waterline = sampleWave(state, source.point.x, source.point.z, state.time) * 0.22;
  const reflectedPoint = vec3(
    source.point.x,
    waterline - (source.point.y - waterline) * 0.58,
    source.point.z + 0.08
  );
  const reflected = projectPoint(reflectedPoint, camera, viewport);
  if (!reflected) {
    return;
  }

  const reflectionRadius = radius * 0.72;
  const glow = ctx.createRadialGradient(
    reflected.x,
    reflected.y,
    reflectionRadius * 0.1,
    reflected.x,
    reflected.y,
    reflectionRadius
  );
  glow.addColorStop(0, colorToRgba(source.coreColor, source.reflectionStrength * 0.34));
  glow.addColorStop(1, colorToRgba(source.glowColor, 0));
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
  ctx.fillStyle = colorToRgba(visuals.torchCore, 0.055 * pulse);
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
  core.addColorStop(0, colorToRgba(visuals.torchCore, 0.58));
  core.addColorStop(0.5, colorToRgba(visuals.torchGlow, 0.18));
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
  vignette.addColorStop(0.68, "rgba(0, 0, 0, 0.08)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.32)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const seaHaze = ctx.createLinearGradient(0, canvas.height * 0.34, 0, canvas.height);
  seaHaze.addColorStop(0, "rgba(0, 0, 0, 0)");
  seaHaze.addColorStop(0.5, visuals.ambientMist);
  seaHaze.addColorStop(1, "rgba(3, 8, 16, 0.18)");
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
        foam: point.foam,
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
    ctx.strokeStyle = `rgba(146, 194, 236, ${wake.opacity * 0.34})`;
    ctx.lineWidth = baseWidth * 1.45;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(projected[0].projected.x, projected[0].projected.y);
    for (let index = 1; index < projected.length; index += 1) {
      ctx.lineTo(projected[index].projected.x, projected[index].projected.y);
    }
    ctx.stroke();

    ctx.strokeStyle = `rgba(234, 247, 255, ${wake.opacity * 0.72})`;
    ctx.lineWidth = baseWidth * 0.72;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(projected[0].projected.x, projected[0].projected.y);
    for (let index = 1; index < projected.length; index += 1) {
      ctx.lineTo(projected[index].projected.x, projected[index].projected.y);
    }
    ctx.stroke();

    for (const entry of projected.slice(1, 5)) {
      const foam = entry.foam ?? 0.3;
      ctx.fillStyle = `rgba(239, 248, 255, ${wake.opacity * foam * 0.92})`;
      ctx.beginPath();
      ctx.ellipse(
        entry.projected.x,
        entry.projected.y,
        baseWidth * 0.54,
        baseWidth * 0.28,
        0,
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
    ctx.strokeStyle = `rgba(216, 235, 255, ${ring.opacity})`;
    ctx.lineWidth = clamp((radiusX + radiusY) * 0.014, 0.65, 1.8);
    for (let segment = 0; segment < 5; segment += 1) {
      if (pseudoRandom(segment * 31 + radiusX * 0.7 + radiusY * 0.3) < 0.32) {
        continue;
      }
      const startAngle = segment * 1.22 + stateTimePhase(center.x, center.y) * 0.04;
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, radiusX, radiusY, 0, startAngle, startAngle + 0.48);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function stateTimePhase(x, y) {
  return Math.sin(x * 0.013 + y * 0.017);
}

function renderScene(
  ctx,
  canvas,
  state,
  shipModel,
  dom,
  lightingFeatures,
  fluidFeatures,
  clothFeatures
) {
  const viewport = { width: canvas.width, height: canvas.height };
  const camera = buildCamera(state, canvas);
  state.camera.eye = camera.eye;
  const lightingPlan = lightingFeatures.createBandPlan({
    profile:
      state.focus === "lighting"
        ? lightingFeatures.defaultProfile
        : lightingFeatures.getProfile(lightingFeatures.defaultProfile).name,
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

  const waterTriangles = [];
  const sceneTriangles = [];
  const water = buildWaterBands(
    state,
    state.fluidDetail.getSnapshot().currentLevel.config,
    visuals,
    fluidFeatures
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
      waterTriangles.push({
        points: projected,
        depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
        worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
        normal,
        baseColor: bandMesh.color,
        accent: bandAccent,
        material: {
          name: "water-surface",
          color: bandMesh.color,
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
  const shorelineFoamSegments = buildShorelineFoamSegments(state);
  const lightSources = collectSceneLightSources(state, visuals);

  pushHarborGeometry(camera, viewport, sceneTriangles, state);
  const cloth = buildClothSurface(
    state,
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    visuals,
    clothFeatures
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
    sceneTriangles.push({
      points: projected,
      depth: (projected[0].depth + projected[1].depth + projected[2].depth) / 3,
      worldCenter: scaleVec3(addVec3(addVec3(a, b), c), 1 / 3),
      normal,
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

  for (const ship of state.ships) {
    const activeShipModel = resolveShipModel(state, ship, shipModel);
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
        surfaceType: "ship",
      }
    );
  }

  drawTriangles(ctx, waterTriangles, lightDir, reflectionStrength, camera, shadowStrength);
  for (const ship of state.ships) {
    renderShipShadow(
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
  renderFlagShadow(ctx, cloth, camera, viewport, lightDir, shadowStrength);
  for (const source of lightSources.reflectionLights) {
    renderWaterLightReflection(ctx, source, state, camera, viewport);
  }
  renderWaterMotionEffects(ctx, waterMotionEffects, camera, viewport);
  renderWaterHighlights(ctx, water.bandMeshes, camera, viewport);
  renderShorelineFoamSegments(ctx, shorelineFoamSegments, camera, viewport);
  drawTriangles(
    ctx,
    sceneTriangles,
    lightDir,
    reflectionStrength,
    camera,
    shadowStrength,
    lightSources.directLights
  );
  renderFlagPole(ctx, camera, viewport);
  renderClothAccent(ctx, cloth, camera, viewport);
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
    `ships: ${state.ships.length} active GLTF hulls across ${new Set(state.ships.map((ship) => ship.modelKey)).size} model families`,
    `moonlight: cold overhead key + ${HARBOR_TORCHES.length + state.ships.reduce((total, ship) => total + (Array.isArray(ship.lanterns) ? ship.lanterns.length : 0), 0)} warm deck and harbor lights`,
    `physics snapshot: ${state.physics.snapshot.stage} (${state.physics.snapshot.stability})`,
    `physics contacts: ${state.contactCount}`,
    `mass split: ${state.ships.map((ship) => `${ship.id} ${(getShipMass(ship, resolveShipModel(state, ship, shipModel)) / 1000).toFixed(1)}t`).join(" · ")}`,
    `cloth band: ${cloth.band} -> ${cloth.representation.output}`,
    `fluid near band: ${water.bandMeshes[0].representation.output}`,
    `lighting profile: ${lightingPlan.profile} (${lightingFeatures.distanceBands.length} bands)`,
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
      ? PHYSICS_SCENE_NOTE_KEYS.map((key) => state.translate(key))
      : SCENE_NOTE_KEYS.map((key) => state.translate(key));
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
      : state.translate(gpuSharedTranslationKeys.statusLive, {
          fps: state.lastDecision.metrics.fps.toFixed(1),
        });
  dom.details.textContent =
    typeof custom?.details === "string"
      ? custom.details
      : state.focus === "physics"
        ? state.translate(gpuSharedTranslationKeys.detailsPhysics, {
            snapshotStageId: state.physics.plan.snapshotStageId,
          })
        : state.showcaseRealisticModelsEnabled
          ? state.translate(gpuSharedTranslationKeys.detailsRealistic, {
              pressureLevel: state.lastDecision.pressureLevel,
            })
          : state.translate(gpuSharedTranslationKeys.detailsLegacy, {
              pressureLevel: state.lastDecision.pressureLevel,
            });
}

function updateSceneState(state, dt, shipModel, featureAdapters) {
  updateShips(state, dt, shipModel);
  updateWaveImpulses(state, dt);
  updateSpray(state, dt);
  const clothPresentation = resolveClothPresentation(
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    featureAdapters.cloth
  );
  const clothState = ensureShowcaseClothState(
    state,
    state.clothDetail.getSnapshot().currentLevel.config,
    clothPresentation
  );
  advanceShowcaseClothSimulationState(clothState, {
    dt,
    time: state.time,
    flagMotion: readVisualNumber(state.demoVisuals?.flagMotion, 0.58),
    waveInfluence: sampleWave(state, FLAG_LAYOUT.origin.x + FLAG_LAYOUT.width * 0.55, FLAG_LAYOUT.origin.z + FLAG_LAYOUT.width * 0.48, state.time),
  });
  updatePhysicsSnapshot(state, shipModel, featureAdapters.physics);
}

function syncTextState(state, shipModel, featureAdapters) {
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
      updateSceneState(state, 1 / 60, shipModel, featureAdapters);
      state.lastDecision = recordTelemetry(state, 16.67 + (state.stress ? 6.5 : 0));
    }
  };
}

export async function mountGpuShowcase(options = {}, featureFlags = null) {
  const featureAdapters = await resolveShowcaseFeatureAdapters(options);
  injectStyles();
  const root = options.root ?? document.body;
  root.classList?.add?.(ROOT_CLASS);
  const captureSettings = resolveCaptureSettings(options);
  if (captureSettings.captureMode) {
    root.classList?.add?.(CAPTURE_CLASS);
  }
  const previousMarkup = root.innerHTML;
  const previousRenderGameToText = window.render_game_to_text;
  const previousAdvanceTime = window.advanceTime;
  const focus = options.focus ?? new URLSearchParams(window.location.search).get("focus") ?? "integrated";
  const translate = createGpuSharedTranslator(options.translate);
  const dom = buildDemoDom(root, {
    packageName: options.packageName ?? "@plasius/gpu-demo-viewer",
    title: options.title ?? translate(gpuSharedTranslationKeys.showcaseTitle),
    subtitle: options.subtitle ?? translate(gpuSharedTranslationKeys.showcaseSubtitle),
    translate,
  });
  dom.focusMode.value = focus;
  const state = createSceneState(
    {
      focus,
      translate,
      realisticModelsEnabled: isFeatureEnabled(featureFlags, GPU_SHOWCASE_REALISTIC_MODELS_FEATURE, true),
      captureMode: captureSettings.captureMode,
      renderScale: captureSettings.renderScale,
    },
    featureAdapters
  );
  const assetCatalog = await (state.showcaseRealisticModelsEnabled
    ? loadShowcaseAssetCatalog()
    : createLegacyShowcaseAssetCatalog());
  const shipModel = assetCatalog.ships[assetCatalog.primaryShipKey];

  state.assetCatalog = assetCatalog;
  state.shipModel = shipModel;
  state.packageState =
    typeof options.createState === "function" ? options.createState() : undefined;
  updatePhysicsSnapshot(state, shipModel, featureAdapters.physics);
  state.lastDecision = recordTelemetry(state, 16.4);
  state.demoDescription = resolveSceneDescription(state, options, shipModel).description;
  syncTextState(state, shipModel, featureAdapters);

  const ctx = dom.canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context is required for the shared showcase.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
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
      updateSceneState(state, dt, shipModel, featureAdapters);
      updatePackageState(state, options, shipModel, dt);
      const syntheticFrame = 14.2 + state.sprays.length * 0.1 + (state.stress ? 6.4 : 0);
      state.lastDecision = recordTelemetry(state, syntheticFrame);
    }

    state.demoDescription = resolveSceneDescription(state, options, shipModel).description;
    resizeCanvasToDisplaySize(dom.canvas, state);
    renderScene(
      ctx,
      dom.canvas,
      state,
      shipModel,
      dom,
      featureAdapters.lighting,
      featureAdapters.fluid,
      featureAdapters.cloth
    );
    syncTextState(state, shipModel, featureAdapters);
    animationFrameId = requestAnimationFrame(renderFrame);
  };

  const handlePauseClick = () => {
    state.paused = !state.paused;
    dom.pauseButton.textContent = state.paused
      ? state.translate(gpuSharedTranslationKeys.resume)
      : state.translate(gpuSharedTranslationKeys.pause);
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

function updatePhysicsSnapshot(state, shipModel, physicsFeatures) {
  const createPhysicsWorldSnapshot = assertRequiredFunction(
    physicsFeatures,
    "physics",
    "createWorldSnapshot"
  );
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
  buildClothSurface as __testOnlyBuildClothSurface,
  buildShorelineFoamSegments as __testOnlyBuildShorelineFoamSegments,
  buildWaterBands as __testOnlyBuildWaterBands,
  buildWaterMotionEffects as __testOnlyBuildWaterMotionEffects,
  collectSceneLightSources as __testOnlyCollectSceneLightSources,
  createShowcaseClothSimulationState as __testOnlyCreateShowcaseClothSimulationState,
};

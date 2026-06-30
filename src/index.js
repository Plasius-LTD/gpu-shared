import {
  GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE,
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
} from "./feature-flags.js";

export { resolveShowcaseAssetUrl } from "./asset-url.js";
export {
  createGpuSharedTranslator,
  gpuSharedTranslationKeys,
  gpuSharedTranslations,
  translateGpuSharedText,
} from "./i18n.js";
export { gpuSharedEnGbTranslations } from "./translations/en-GB.js";
export {
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
  GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE,
};
export {
  createAnimationAdventureProps,
  mountGpuAnimationAdventure,
} from "./animation-adventure-runtime.js";
export {
  buildProductStudioSceneObjects,
  createProductStudioMeshes,
  mountGpuProductStudio,
} from "./product-studio-runtime.js";

export const showcaseFocusModes = Object.freeze([
  "integrated",
  "lighting",
  "cloth",
  "fluid",
  "physics",
  "performance",
  "debug",
]);
export const showcaseDemoModes = Object.freeze(["harbor", "product-studio", "animation-adventure"]);

export async function loadGltfModel(url) {
  const module = await import("./gltf-loader.js");
  return module.loadGltfModel(url);
}

function isProductStudioFeatureEnabled(featureFlags) {
  return isFeatureEnabled(featureFlags, GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE);
}

function isFeatureEnabled(featureFlags, featureId) {
  if (typeof featureFlags?.get === "function") {
    return featureFlags.get(featureId) === true;
  }

  const direct = featureFlags?.[featureId];
  if (typeof direct === "boolean") {
    return direct;
  }

  const flagsValue = featureFlags?.flags?.[featureId];
  if (typeof flagsValue === "boolean") {
    return flagsValue;
  }

  const enabledValue = featureFlags?.enabled?.[featureId];
  if (typeof enabledValue === "boolean") {
    return enabledValue;
  }

  return false;
}

export async function mountGpuShowcase(options = {}) {
  const demoMode = options.demoMode ?? options.mode;
  if (
    demoMode === "animation-adventure" ||
    demoMode === "adventure" ||
    demoMode === "animation"
  ) {
    if (!isFeatureEnabled(options.__featureFlags, GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE)) {
      throw new Error(
        `${GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE} must be enabled before Animation Adventure can mount.`
      );
    }

    const adventureRuntimeLoader =
      typeof options.__animationAdventureRuntimeLoader === "function"
        ? options.__animationAdventureRuntimeLoader
        : () => import("./animation-adventure-runtime.js");
    const adventureModule = await adventureRuntimeLoader();
    if (typeof adventureModule.mountGpuAnimationAdventure !== "function") {
      throw new Error("animation adventure runtime loader must provide mountGpuAnimationAdventure.");
    }

    const adventureOptions = { ...options, demoMode };
    delete adventureOptions.__runtimeLoader;
    delete adventureOptions.__productRuntimeLoader;
    delete adventureOptions.__animationAdventureRuntimeLoader;
    delete adventureOptions.__featureFlags;
    return adventureModule.mountGpuAnimationAdventure(adventureOptions, options.__featureFlags);
  }

  if (
    demoMode === "product-studio" ||
    demoMode === "product" ||
    demoMode === "studio" ||
    demoMode === "eames"
  ) {
    if (!isProductStudioFeatureEnabled(options.__featureFlags)) {
      throw new Error(
        `${GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE} must be enabled before Product Studio can mount.`
      );
    }

    const productRuntimeLoader =
      typeof options.__productRuntimeLoader === "function"
        ? options.__productRuntimeLoader
        : () => import("./product-studio-runtime.js");
    const productModule = await productRuntimeLoader();
    if (typeof productModule.mountGpuProductStudio !== "function") {
      throw new Error("product runtime loader must provide mountGpuProductStudio.");
    }

    const productOptions = { ...options, demoMode };
    delete productOptions.__runtimeLoader;
    delete productOptions.__productRuntimeLoader;
    delete productOptions.__featureFlags;
    return productModule.mountGpuProductStudio(productOptions, options.__featureFlags);
  }

  const runtimeLoader =
    typeof options.__runtimeLoader === "function"
      ? options.__runtimeLoader
      : () => import("./showcase-runtime.js");
  const module = await runtimeLoader();
  if (typeof module.mountGpuShowcase !== "function") {
    throw new Error("showcase runtime loader must provide mountGpuShowcase.");
  }

  const publicOptions = { ...options };
  delete publicOptions.__runtimeLoader;
  delete publicOptions.__productRuntimeLoader;
  delete publicOptions.__featureFlags;
  return module.mountGpuShowcase(publicOptions, options.__featureFlags);
}

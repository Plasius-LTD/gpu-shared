export { resolveShowcaseAssetUrl } from "./asset-url.js";
export {
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
} from "./feature-flags.js";
export {
  createGpuSharedTranslator,
  gpuSharedTranslationKeys,
  gpuSharedTranslations,
  translateGpuSharedText,
} from "./i18n.js";
export { gpuSharedEnGbTranslations } from "./translations/en-GB.js";

export const showcaseFocusModes = Object.freeze([
  "integrated",
  "lighting",
  "cloth",
  "fluid",
  "physics",
  "performance",
  "debug",
]);

export const showcaseDemoModes = Object.freeze(["harbor", "product-studio"]);

export async function loadGltfModel(url) {
  const module = await import("./gltf-loader.js");
  return module.loadGltfModel(url);
}

function resolveShowcaseDemoMode(options = {}) {
  return String(options.demoMode ?? options.mode ?? "harbor").toLowerCase();
}

function isProductStudioMode(mode) {
  return (
    mode === "product-studio" ||
    mode === "product" ||
    mode === "studio" ||
    mode === "eames"
  );
}

export async function mountGpuProductStudio(options = {}) {
  const runtimeLoader =
    typeof options.__productStudioRuntimeLoader === "function"
      ? options.__productStudioRuntimeLoader
      : () => import("./product-studio-runtime.js");
  const module = await runtimeLoader();
  if (typeof module.mountGpuProductStudio !== "function") {
    throw new Error("product studio runtime loader must provide mountGpuProductStudio.");
  }

  const publicOptions = { ...options };
  delete publicOptions.__productStudioRuntimeLoader;
  delete publicOptions.__runtimeLoader;
  delete publicOptions.__featureFlags;
  return module.mountGpuProductStudio(publicOptions, options.__featureFlags);
}

export async function mountGpuShowcase(options = {}) {
  if (isProductStudioMode(resolveShowcaseDemoMode(options))) {
    return mountGpuProductStudio(options);
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
  delete publicOptions.__featureFlags;
  return module.mountGpuShowcase(publicOptions, options.__featureFlags);
}

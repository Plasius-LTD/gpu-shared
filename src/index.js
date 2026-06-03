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
} from "./feature-flags.js";
export {
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
export const showcaseDemoModes = Object.freeze(["harbor", "product-studio"]);

export async function loadGltfModel(url) {
  const module = await import("./gltf-loader.js");
  return module.loadGltfModel(url);
}

export async function mountGpuShowcase(options = {}) {
  const demoMode = options.demoMode ?? options.mode;
  if (
    demoMode === "product-studio" ||
    demoMode === "product" ||
    demoMode === "studio" ||
    demoMode === "eames"
  ) {
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

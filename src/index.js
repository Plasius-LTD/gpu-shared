export { resolveShowcaseAssetUrl } from "./asset-url.js";
export {
  GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
  GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE,
  GPU_SHOWCASE_REALISTIC_MODELS_FEATURE,
} from "./feature-flags.js";

export const showcaseDemoModes = Object.freeze(["harbor", "product-studio"]);

export const showcaseFocusModes = Object.freeze([
  "integrated",
  "lighting",
  "cloth",
  "fluid",
  "physics",
  "performance",
  "debug",
]);

export async function loadGltfModel(url) {
  const module = await import("./gltf-loader.js");
  return module.loadGltfModel(url);
}

function resolveShowcaseDemoMode(options = {}) {
  const explicit = options.mode ?? options.demoMode;
  if (typeof explicit === "string" && explicit.length > 0) {
    return explicit;
  }

  try {
    return (
      new URLSearchParams(globalThis.window?.location?.search ?? "").get("mode") ??
      new URLSearchParams(globalThis.window?.location?.search ?? "").get("demoMode") ??
      "harbor"
    );
  } catch {
    return "harbor";
  }
}

function isProductStudioMode(mode) {
  const normalized = String(mode ?? "").trim().toLowerCase();
  return (
    normalized === "product-studio" ||
    normalized === "product" ||
    normalized === "studio" ||
    normalized === "eames"
  );
}

export async function mountGpuProductStudio(options = {}) {
  const runtimeLoader =
    typeof options.__productRuntimeLoader === "function"
      ? options.__productRuntimeLoader
      : () => import("./product-studio-runtime.js");
  const module = await runtimeLoader();
  if (typeof module.mountGpuProductStudio !== "function") {
    throw new Error("product studio runtime loader must provide mountGpuProductStudio.");
  }

  const publicOptions = { ...options };
  delete publicOptions.__productRuntimeLoader;
  delete publicOptions.featureFlags;
  delete publicOptions.__featureFlags;
  return module.mountGpuProductStudio(
    publicOptions,
    options.featureFlags ?? options.__featureFlags
  );
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
  delete publicOptions.featureFlags;
  delete publicOptions.__featureFlags;
  return module.mountGpuShowcase(
    publicOptions,
    options.featureFlags ?? options.__featureFlags
  );
}

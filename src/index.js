export { resolveShowcaseAssetUrl } from "./asset-url.js";
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

export async function loadGltfModel(url) {
  const module = await import("./gltf-loader.js");
  return module.loadGltfModel(url);
}

export async function mountGpuShowcase(options = {}) {
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

export const showcaseFocusModes = Object.freeze([
  "integrated",
  "lighting",
  "cloth",
  "fluid",
  "physics",
  "performance",
  "debug",
]);

export function resolveShowcaseAssetUrl(baseUrl = import.meta.url) {
  return new URL("../assets/brigantine.gltf", baseUrl);
}

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
  return module.mountGpuShowcase(publicOptions);
}

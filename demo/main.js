import { mountGpuShowcase } from "../dist/index.js";

const root = globalThis.document?.getElementById("app");
if (!root) {
  throw new Error("Shared demo root element was not found.");
}

await mountGpuShowcase({
  root,
  packageName: "@plasius/gpu-shared",
  title: "Shared GPU Harbor Runtime",
  subtitle:
    "Browser-safe moonlit showcase ownership for the Plasius gpu-* family, with GLTF ships, lantern-lit collisions, cloth, fluid, lighting, performance, and telemetry.",
});

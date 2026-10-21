export const GPU_SHOWCASE_REALISTIC_MODELS_FEATURE = "gpu_showcase_realistic_models_v1";
export const GPU_SHOWCASE_PRODUCT_STUDIO_FEATURE = "gpu_showcase_product_studio_wavefront_v1";
export const GPU_SHOWCASE_ANIMATION_ADVENTURE_FEATURE = "gpu-demo.animation-adventure.enabled";
export const GPU_SHOWCASE_PROFESSIONAL_ANIMATION_ADVENTURE_FEATURE = "gpu-demo.animation-adventure.professional.enabled";
export const GPU_SHOWCASE_CAMERA_MODES_FEATURE = "gpu-demo.camera-modes.enabled";

/** Host-provided remote snapshot only; missing decisions keep the legacy loader. */
export function isModelConversionEnabled(featureFlags) {
  const key = "gpu.model.conversion.enabled";
  if (typeof featureFlags?.get === "function") return featureFlags.get(key) === true;
  return (featureFlags?.[key] ?? featureFlags?.flags?.[key] ?? featureFlags?.enabled?.[key]) === true;
}

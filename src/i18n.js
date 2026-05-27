import { gpuSharedEnGbTranslations } from "./translations/en-GB.js";

export const gpuSharedTranslationKeys = Object.freeze({
  showcaseTitle: "gpuShared.showcase.title",
  showcaseSubtitle: "gpuShared.showcase.subtitle",
  statusBooting: "gpuShared.showcase.status.booting",
  statusLive: "gpuShared.showcase.status.live",
  detailsBooting: "gpuShared.showcase.details.booting",
  detailsPhysics: "gpuShared.showcase.details.physics",
  detailsRealistic: "gpuShared.showcase.details.realistic",
  detailsLegacy: "gpuShared.showcase.details.legacy",
  pause: "gpuShared.showcase.action.pause",
  resume: "gpuShared.showcase.action.resume",
  stressMode: "gpuShared.showcase.control.stressMode",
  focus: "gpuShared.showcase.control.focus",
  focusIntegrated: "gpuShared.showcase.focus.integrated",
  focusLighting: "gpuShared.showcase.focus.lighting",
  focusCloth: "gpuShared.showcase.focus.cloth",
  focusFluid: "gpuShared.showcase.focus.fluid",
  focusPhysics: "gpuShared.showcase.focus.physics",
  focusPerformance: "gpuShared.showcase.focus.performance",
  focusDebug: "gpuShared.showcase.focus.debug",
  legendTitle: "gpuShared.showcase.legend.title",
  legendShipMetadata: "gpuShared.showcase.legend.shipMetadata",
  legendLighting: "gpuShared.showcase.legend.lighting",
  legendCollisions: "gpuShared.showcase.legend.collisions",
  sceneState: "gpuShared.showcase.section.sceneState",
  qualityBudgets: "gpuShared.showcase.section.qualityBudgets",
  debugTelemetry: "gpuShared.showcase.section.debugTelemetry",
  notes: "gpuShared.showcase.section.notes",
  noteAssetLoading: "gpuShared.showcase.note.assetLoading",
  noteMoonlight: "gpuShared.showcase.note.moonlight",
  noteContinuity: "gpuShared.showcase.note.continuity",
  notePerformance: "gpuShared.showcase.note.performance",
  notePhysicsSnapshots: "gpuShared.showcase.note.physicsSnapshots",
  notePhysicsCollisions: "gpuShared.showcase.note.physicsCollisions",
  notePhysicsLighting: "gpuShared.showcase.note.physicsLighting",
  debugAdapterShowcase: "gpuShared.debug.adapter.showcase",
  debugMainColorBuffer: "gpuShared.debug.allocation.mainColorBuffer",
  debugShadowImpressionAtlas: "gpuShared.debug.allocation.shadowImpressionAtlas",
});

export const gpuSharedTranslations = Object.freeze({
  "en-GB": gpuSharedEnGbTranslations,
});

function formatTranslation(template, args = {}) {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(args, name)) {
      return match;
    }

    const value = args[name];
    return value == null ? "" : String(value);
  });
}

export function translateGpuSharedText(key, args, translate) {
  const translated = translate?.(key, args);
  if (translated && translated !== key) {
    return translated;
  }

  const fallback = gpuSharedEnGbTranslations[key];
  return fallback ? formatTranslation(fallback, args) : key;
}

export function createGpuSharedTranslator(translate) {
  return (key, args) => translateGpuSharedText(key, args, translate);
}


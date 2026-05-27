export const gpuSharedEnGbTranslations = Object.freeze({
  "gpuShared.showcase.title": "Flag by the Sea",
  "gpuShared.showcase.subtitle":
    "Shared 3D validation scene using GLTF ships, cloth, fluid continuity, adaptive performance, and telemetry.",
  "gpuShared.showcase.status.booting": "Booting 3D scene...",
  "gpuShared.showcase.status.live": "3D scene live - {fps} FPS",
  "gpuShared.showcase.details.booting":
    "Preparing a moonlit harbor scene, GLTF hull data, cloth and fluid continuity plans, and adaptive quality metadata.",
  "gpuShared.showcase.details.physics":
    "Stable world snapshots are emitted from {snapshotStageId} after the authoritative solver; the heavier hull now carries momentum through mass-aware collision impulses while cloth and fluid remain downstream.",
  "gpuShared.showcase.details.realistic":
    "Moonlit GLTF ships now mix a brigantine and a cutter against modeled harbor assets; cloth, fluid, and ship-local lighting stay continuous while the governor pressure is {pressureLevel}.",
  "gpuShared.showcase.details.legacy":
    "Moonlit GLTF ships use the legacy brigantine and placeholder harbor blocks while cloth, fluid, and ship-local lighting stay continuous while the governor pressure is {pressureLevel}.",
  "gpuShared.showcase.action.pause": "Pause",
  "gpuShared.showcase.action.resume": "Resume",
  "gpuShared.showcase.control.stressMode": "Stress mode",
  "gpuShared.showcase.control.focus": "Focus",
  "gpuShared.showcase.focus.integrated": "integrated",
  "gpuShared.showcase.focus.lighting": "lighting",
  "gpuShared.showcase.focus.cloth": "cloth",
  "gpuShared.showcase.focus.fluid": "fluid",
  "gpuShared.showcase.focus.physics": "physics",
  "gpuShared.showcase.focus.performance": "performance",
  "gpuShared.showcase.focus.debug": "debug",
  "gpuShared.showcase.legend.title": "Scene",
  "gpuShared.showcase.legend.shipMetadata":
    "GLTF ships carry hull mass and damping metadata.",
  "gpuShared.showcase.legend.lighting":
    "Lanterns and torches warm the moonlit harbor.",
  "gpuShared.showcase.legend.collisions":
    "Mass-aware collisions stay authoritative near the camera.",
  "gpuShared.showcase.section.sceneState": "Scene State",
  "gpuShared.showcase.section.qualityBudgets": "Quality + Budgets",
  "gpuShared.showcase.section.debugTelemetry": "Debug Telemetry",
  "gpuShared.showcase.section.notes": "Notes",
  "gpuShared.showcase.note.assetLoading":
    "Ships are loaded from a GLTF asset and carry mass, damping, restitution, and hull extents from node extras.",
  "gpuShared.showcase.note.moonlight":
    "Moonlight sets the cold ambient read while deck lanterns and harbor torches provide warm local contrast.",
  "gpuShared.showcase.note.continuity":
    "Cloth and fluid continuity stay coherent across near, mid, far, and horizon bands even in the darker night palette.",
  "gpuShared.showcase.note.performance":
    "Performance pressure reduces visual detail before mass-weighted authoritative collision motion is touched.",
  "gpuShared.showcase.note.physicsSnapshots":
    "Stable world snapshots are taken after the authoritative rigid-body commit and before visual follow-up work.",
  "gpuShared.showcase.note.physicsCollisions":
    "The ships collide with mass-weighted impulses and positional correction, so the heavier hull keeps more of its line.",
  "gpuShared.showcase.note.physicsLighting":
    "Moonlight keeps the overall read legible while lanterns and torches make collision moments easy to track against the water.",
  "gpuShared.debug.adapter.showcase": "3D showcase",
  "gpuShared.debug.allocation.mainColorBuffer": "Main color buffer",
  "gpuShared.debug.allocation.shadowImpressionAtlas": "Shadow impression atlas",
});


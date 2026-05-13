import test from "node:test";
import assert from "node:assert/strict";

import {
  __testOnlyAdvanceShowcaseClothSimulationState,
  __testOnlyBuildWaterBands,
  __testOnlyBuildWaterMotionEffects,
  __testOnlyCollectSceneLightSources,
  __testOnlyCreateShowcaseClothSimulationState,
} from "../src/showcase-runtime.js";

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function createWaterTestState(time) {
  return {
    focus: "integrated",
    time,
    demoVisuals: {
      waveAmplitude: 0.94,
      waveDirection: { x: 0.88, z: 0.28 },
      wavePhaseSpeed: 0.88,
      wakeStrength: 0.31,
      wakeLength: 18,
      collisionRippleStrength: 0.42,
    },
    ships: [
      {
        id: "northwind",
        position: { x: -5.2, y: 0, z: 7.2 },
        velocity: { x: 2.35, y: 0, z: -1.08 },
        wanderPhase: 0.35,
      },
      {
        id: "tidecaller",
        position: { x: 4.8, y: 0, z: 4.4 },
        velocity: { x: -2.15, y: 0, z: 1.74 },
        wanderPhase: 1.6,
      },
    ],
    waveImpulses: [
      {
        x: -0.6,
        z: 7.1,
        strength: 1.05,
        radius: 1.1,
        life: 0.72,
      },
    ],
  };
}

const WATER_TEST_VISUALS = Object.freeze({
  waterNear: { r: 0.08, g: 0.23, b: 0.33 },
  waterFar: { r: 0.18, g: 0.35, b: 0.49 },
});

const WATER_TEST_DETAIL = Object.freeze({
  nearResolution: 24,
  midResolution: 12,
});

test("cloth simulation keeps the pole edge pinned while the free edge moves", () => {
  const cloth = __testOnlyCreateShowcaseClothSimulationState({
    rows: 8,
    cols: 12,
    continuity: {
      broadMotionFloor: 0.8,
      wrinkleFloor: 0.66,
    },
    representation: {
      mesh: {
        solverIterations: 6,
        wrinkleLayers: 2,
      },
    },
  });
  const pinnedIndices = cloth.pinned
    .map((isPinned, index) => (isPinned ? index : -1))
    .filter((index) => index >= 0);
  const freeEdgeIndices = cloth.pinned
    .map((_, index) => (index % cloth.cols === cloth.cols - 1 ? index : -1))
    .filter((index) => index >= 0);
  const pinnedBefore = pinnedIndices.map((index) => ({ ...cloth.positions[index] }));
  const freeEdgeBefore = freeEdgeIndices.map((index) => ({ ...cloth.positions[index] }));

  for (let frame = 1; frame <= 8; frame += 1) {
    __testOnlyAdvanceShowcaseClothSimulationState(cloth, {
      dt: 1 / 60,
      time: frame / 60,
      flagMotion: 1,
      waveInfluence: 0.2,
    });
  }

  const pinnedAfter = pinnedIndices.map((index) => cloth.positions[index]);
  pinnedBefore.forEach((point, index) => {
    assert.deepEqual(pinnedAfter[index], point);
  });

  const maxFreeEdgeDisplacement = Math.max(
    ...freeEdgeIndices.map((index, edgeIndex) =>
      distanceBetween(cloth.positions[index], freeEdgeBefore[edgeIndex])
    )
  );
  assert.ok(
    maxFreeEdgeDisplacement > 0.12,
    `expected free edge to move, saw max displacement ${maxFreeEdgeDisplacement}`
  );
});

test("water motion effects expose wakes for moving ships and expanding ripple rings", () => {
  const state = {
    time: 2.5,
    ships: [
      {
        id: "northwind",
        position: { x: 0, y: 0.42, z: 6.2 },
        velocity: { x: 2.35, y: 0, z: -1.05 },
        wanderPhase: 0.35,
      },
      {
        id: "idle",
        position: { x: 4.2, y: 0.42, z: 9.8 },
        velocity: { x: 0.02, y: 0, z: 0.01 },
        wanderPhase: 1.1,
      },
    ],
    waveImpulses: [
      {
        x: 1.6,
        z: 7.4,
        strength: 0.9,
        radius: 1,
        life: 0.5,
      },
    ],
  };

  const effects = __testOnlyBuildWaterMotionEffects(state);
  assert.equal(effects.wakeTrails.length, 1);
  assert.ok(effects.wakeTrails[0].points.length >= 5);
  assert.ok(effects.rippleRings[0].radius > state.waveImpulses[0].radius);
  assert.equal(Number.isFinite(effects.wakeTrails[0].points[0].center.y), true);
});

test("water bands keep finite heights and show material near-band motion between frames", () => {
  const before = __testOnlyBuildWaterBands(
    createWaterTestState(0),
    WATER_TEST_DETAIL,
    WATER_TEST_VISUALS
  );
  const after = __testOnlyBuildWaterBands(
    createWaterTestState(1 / 6),
    WATER_TEST_DETAIL,
    WATER_TEST_VISUALS
  );
  const nearBefore = before.bandMeshes.find((band) => band.band === "near");
  const nearAfter = after.bandMeshes.find((band) => band.band === "near");

  assert.ok(nearBefore);
  assert.ok(nearAfter);
  assert.ok(
    nearBefore.positions.every((point) => Number.isFinite(point.y)),
    "expected near-band heights to stay finite"
  );
  assert.ok(
    nearAfter.positions.every((point) => Number.isFinite(point.y)),
    "expected next-frame near-band heights to stay finite"
  );

  const deltas = nearBefore.positions.map((point, index) =>
    Math.abs(nearAfter.positions[index].y - point.y)
  );
  const maxDisplacement = Math.max(...deltas);
  const averageDisplacement =
    deltas.reduce((total, value) => total + value, 0) / deltas.length;

  assert.ok(
    maxDisplacement > 0.05,
    `expected visible near-band motion, saw max displacement ${maxDisplacement}`
  );
  assert.ok(
    averageDisplacement > 0.01,
    `expected broad near-band motion, saw average displacement ${averageDisplacement}`
  );
});

test("scene lighting separates water reflections from direct glow sources", () => {
  const state = {
    ships: [
      {
        position: { x: 0, y: 0.42, z: 6.8 },
        rotationY: 0.5,
        lanterns: [
          { x: 0.94, y: 1.54, z: 2.52, glow: 1 },
          { x: -0.9, y: 1.58, z: 2.44, glow: 0.92 },
        ],
        lanternStrength: 1.06,
      },
    ],
  };
  const visuals = {
    lanternCore: { r: 0.98, g: 0.8, b: 0.48 },
    lanternGlow: { r: 1, g: 0.56, b: 0.2 },
    lanternReflectionStrength: 0.42,
    torchCore: { r: 0.99, g: 0.72, b: 0.36 },
    torchGlow: { r: 0.98, g: 0.38, b: 0.15 },
  };

  const separated = __testOnlyCollectSceneLightSources(state, visuals);
  assert.ok(separated.directLights.length > 0);
  assert.equal(separated.directLights.length, separated.reflectionLights.length);
  assert.ok(separated.directLights.every((source) => source.pass === "direct-glow"));
  assert.ok(
    separated.reflectionLights.every((source) => source.pass === "water-reflection")
  );

  const noReflections = __testOnlyCollectSceneLightSources(state, {
    ...visuals,
    lanternReflectionStrength: 0,
  });
  assert.ok(noReflections.directLights.length > 0);
  assert.equal(noReflections.reflectionLights.length, 0);
});

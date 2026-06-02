import test from "node:test";
import assert from "node:assert/strict";

import {
  __testOnlyAdvanceShowcaseClothSimulationState,
  __testOnlyBuildWaterBands,
  __testOnlyBuildWaterMotionEffects,
  __testOnlyBuildWaterReflectionTrianglesFromMesh,
  __testOnlyBuildTriangleHitPatches,
  __testOnlyBuildHarborShorelineGeometry,
  __testOnlyCollectSceneLightSources,
  __testOnlyCreateShowcaseClothSimulationState,
  __testOnlyCreateTimeOfDayVisualOverrides,
  __testOnlyResolveSmoothedHitNormal,
  __testOnlyResolveTriangleLightingContribution,
  __testOnlyResolveWaterAtmosphereColor,
  __testOnlyResolveVisualConfig,
  __testOnlyShadeColor,
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

function getBandRange(band) {
  return {
    minX: Math.min(...band.positions.map((point) => point.x)),
    maxX: Math.max(...band.positions.map((point) => point.x)),
    minZ: Math.min(...band.positions.map((point) => point.z)),
    maxZ: Math.max(...band.positions.map((point) => point.z)),
  };
}

function getWaterTriangleCenters(water) {
  return water.bandMeshes.flatMap((band) => {
    const centers = [];
    for (let index = 0; index < band.indices.length; index += 3) {
      const a = band.positions[band.indices[index]];
      const b = band.positions[band.indices[index + 1]];
      const c = band.positions[band.indices[index + 2]];
      centers.push({
        x: (a.x + b.x + c.x) / 3,
        z: (a.z + b.z + c.z) / 3,
      });
    }
    return centers;
  });
}

function pointInsideBox(point, bounds) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.z >= bounds.minZ &&
    point.z <= bounds.maxZ
  );
}

function pointInsidePolygonXZ(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crossesZ = currentPoint.z > point.z !== previousPoint.z > point.z;
    const denominator = previousPoint.z - currentPoint.z;
    const edgeX =
      ((previousPoint.x - currentPoint.x) * (point.z - currentPoint.z)) /
        (Math.abs(denominator) < 0.0001 ? 0.0001 : denominator) +
      currentPoint.x;
    if (crossesZ && point.x < edgeX) {
      inside = !inside;
    }
  }
  return inside;
}

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
  const centerWake = effects.wakeTrails.find((wake) => wake.kind === "center");
  const kelvinArms = effects.wakeTrails.filter((wake) => wake.kind === "kelvin-arm");
  assert.equal(effects.wakeTrails.length, 3);
  assert.ok(centerWake);
  assert.equal(kelvinArms.length, 2);
  assert.deepEqual(
    kelvinArms.map((wake) => wake.side).sort(),
    [-1, 1]
  );
  assert.ok(effects.wakeTrails.every((wake) => wake.points.length >= 8));
  assert.ok(effects.foamPatches.length >= 6);
  assert.ok(effects.particles.length > 20);
  assert.deepEqual(
    new Set(effects.particles.map((particle) => particle.kind)),
    new Set(["ripple-foam", "impact-spray", "wake-foam", "bow-spray"])
  );
  assert.ok(effects.rippleRings[0].radius > state.waveImpulses[0].radius);
  assert.equal(Number.isFinite(centerWake.points[0].center.y), true);
  assert.equal(Number.isFinite(effects.foamPatches[0].center.y), true);
  assert.ok(
    kelvinArms.every((wake) => wake.opacity < centerWake.opacity),
    "expected Kelvin arms to render as softer side wakes"
  );
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
  assert.equal(nearBefore.normals.length, nearBefore.positions.length);
  const normalYValues = nearBefore.normals.map((normal) => normal.y);
  const averageNormalY =
    normalYValues.reduce((total, value) => total + value, 0) / normalYValues.length;
  assert.ok(
    nearBefore.normals.every((normal) =>
      Number.isFinite(normal.x) &&
      Number.isFinite(normal.y) &&
      Number.isFinite(normal.z) &&
      Math.hypot(normal.x, normal.y, normal.z) > 0.999 &&
      normal.y > 0.55
    ),
    "expected smoothed water normals to stay finite and upward-facing"
  );
  assert.ok(averageNormalY > 0.98, "expected smoothed water normals to avoid broad faceting");

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

test("water bands extend the horizon field enough to read as open water", () => {
  const water = __testOnlyBuildWaterBands(
    createWaterTestState(0.25),
    WATER_TEST_DETAIL,
    WATER_TEST_VISUALS
  );
  const horizon = water.bandMeshes.find((band) => band.band === "horizon");
  assert.ok(horizon, "expected a horizon water band");
  const maxHorizonZ = Math.max(...horizon.positions.map((point) => point.z));
  const minHorizonX = Math.min(...horizon.positions.map((point) => point.x));
  const maxHorizonX = Math.max(...horizon.positions.map((point) => point.x));

  assert.ok(
    maxHorizonZ >= 190,
    `expected horizon water to extend into the distance, got ${maxHorizonZ}`
  );
  assert.ok(
    maxHorizonX - minHorizonX >= 140,
    "expected horizon water to span beyond the harbor mouth"
  );
});

test("water bands tile the harbor field without overlapping depth ranges", () => {
  const water = __testOnlyBuildWaterBands(
    createWaterTestState(0.25),
    WATER_TEST_DETAIL,
    WATER_TEST_VISUALS
  );
  const expectedOrder = ["near", "mid", "far", "horizon"];
  const ranges = expectedOrder.map((bandName) => {
    const band = water.bandMeshes.find((entry) => entry.band === bandName);
    assert.ok(band, `expected ${bandName} water band`);
    return { band: bandName, ...getBandRange(band) };
  });

  for (let index = 0; index < ranges.length - 1; index += 1) {
    const current = ranges[index];
    const next = ranges[index + 1];
    assert.ok(
      Math.abs(current.maxZ - next.minZ) < 0.0001,
      `expected ${current.band}/${next.band} to share one z boundary, got ${current.maxZ}/${next.minZ}`
    );
    assert.ok(
      current.maxX - current.minX <= next.maxX - next.minX + 24,
      `expected ${next.band} width to continue the visible water field`
    );
  }
});

test("water grid omits fixed harbor structure footprints instead of interpenetrating them", () => {
  const water = __testOnlyBuildWaterBands(
    createWaterTestState(0.25),
    WATER_TEST_DETAIL,
    WATER_TEST_VISUALS
  );
  const centers = getWaterTriangleCenters(water);
  const structureFootprints = [
    {
      name: "quay apron",
      contains: (point) =>
        pointInsidePolygonXZ(point, [
          { x: -12.4, z: -3.2 },
          { x: -12.0, z: 4.8 },
          { x: -1.05, z: 4.35 },
          { x: -1.25, z: -3.25 },
        ]),
    },
    {
      name: "inner landing",
      contains: (point) =>
        pointInsideBox(point, { minX: -5.4, maxX: 0.95, minZ: 3.0, maxZ: 4.12 }),
    },
    {
      name: "right pier",
      contains: (point) =>
        pointInsideBox(point, { minX: 9.65, maxX: 10.95, minZ: 6.4, maxZ: 15.2 }),
    },
  ];

  for (const footprint of structureFootprints) {
    assert.equal(
      centers.some((center) => footprint.contains(center)),
      false,
      `expected water cells to be clipped out of the ${footprint.name} footprint`
    );
  }
});

test("hit-driven shading samples smoothed normals at trace impact points", () => {
  const triangle = {
    points: [
      { x: 120, y: 120, depth: 8 },
      { x: 360, y: 130, depth: 8.4 },
      { x: 240, y: 330, depth: 9 },
    ],
    vertices: [
      { x: -1, y: 0, z: 2 },
      { x: 1, y: 0.05, z: 2.2 },
      { x: 0, y: 1.8, z: 2.1 },
    ],
    worldCenter: { x: 0, y: 0.62, z: 2.1 },
    faceNormal: { x: 0, y: 0, z: 1 },
    normal: { x: 0, y: 0, z: 1 },
    vertexNormals: [
      { x: -0.18, y: 0.42, z: 0.89 },
      { x: 0.44, y: 0.08, z: 0.89 },
      { x: 0.02, y: 0.28, z: 0.96 },
    ],
    normalSmoothing: 1,
    normalSmoothingSubdivisions: 2,
  };

  const nearLeftHit = __testOnlyResolveSmoothedHitNormal(triangle, [0.86, 0.08, 0.06]);
  const nearRightHit = __testOnlyResolveSmoothedHitNormal(triangle, [0.08, 0.86, 0.06]);
  assert.ok(nearLeftHit.y > nearRightHit.y);
  assert.ok(nearRightHit.x > nearLeftHit.x);
  assert.ok(Math.abs(Math.hypot(nearLeftHit.x, nearLeftHit.y, nearLeftHit.z) - 1) < 0.0001);
  assert.ok(Math.abs(Math.hypot(nearRightHit.x, nearRightHit.y, nearRightHit.z) - 1) < 0.0001);

  const patches = __testOnlyBuildTriangleHitPatches(triangle);
  assert.equal(patches.length, 4);
  assert.ok(
    patches.every((patch) =>
      patch.points.every((point) =>
        Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.depth)
      )
    )
  );
  const minPatchX = Math.min(...patches.map((patch) => patch.normal.x));
  const maxPatchX = Math.max(...patches.map((patch) => patch.normal.x));
  assert.ok(maxPatchX - minPatchX > 0.1, "expected hit normals to vary across one polygon");

  const singlePatch = __testOnlyBuildTriangleHitPatches({
    ...triangle,
    normalSmoothingSubdivisions: 1,
  });
  assert.equal(singlePatch.length, 1);
});

test("procedural harbor shoreline anchors modeled buildings to land and breakwaters", () => {
  const geometry = __testOnlyBuildHarborShorelineGeometry({
    harborWall: { r: 0.5, g: 0.48, b: 0.44 },
    harborDeck: { r: 0.42, g: 0.34, b: 0.26 },
    waterFar: { r: 0.18, g: 0.36, b: 0.46 },
  });
  const names = geometry.map((quad) => quad.name);
  const quay = geometry.find((quad) => quad.name === "quay-apron");
  const breakwater = geometry.filter((quad) => quad.name.startsWith("outer-breakwater"));
  const rightPier = geometry.filter((quad) => quad.name.startsWith("right-pier"));

  assert.ok(names.includes("left-coastal-shelf"));
  assert.ok(names.includes("quay-water-face"));
  assert.ok(quay, "expected a raised quay apron under harbor buildings");
  assert.ok(breakwater.length >= 6, "expected the harbor mouth to include a modeled breakwater");
  assert.ok(rightPier.length >= 6, "expected the harbor mouth to include a right-side pier");

  const quayX = quay.points.map((point) => point.x);
  const quayZ = quay.points.map((point) => point.z);
  assert.ok(Math.min(...quayX) < -4.8 && Math.max(...quayX) > -4.8);
  assert.ok(Math.min(...quayZ) < 0.48 && Math.max(...quayZ) > 0.48);
  assert.ok(quay.points.every((point) => point.y >= 0.58));
  assert.ok(
    Math.min(...rightPier.flatMap((quad) => quad.points.map((point) => point.z))) >= 6.4,
    "expected the right pier to start at the harbor mouth instead of crossing the foreground water"
  );
});

test("time-of-day profiles support day, night, and animated transitions", () => {
  const day = __testOnlyCreateTimeOfDayVisualOverrides({
    timeOfDayMode: "day",
    time: 0,
  });
  const night = __testOnlyCreateTimeOfDayVisualOverrides({
    timeOfDayMode: "night",
    time: 0,
  });
  const cycle = __testOnlyCreateTimeOfDayVisualOverrides({
    timeOfDayMode: "cycle",
    time: 28,
  });

  assert.equal(day.celestialKind, "sun");
  assert.equal(day.starVisibility, 0);
  assert.equal(night.celestialKind, "moon");
  assert.ok(night.starVisibility > 0.9);
  assert.equal(cycle.timeOfDayMode, "cycle");
  assert.ok(cycle.timeOfDayPhase > 0);
  assert.ok(cycle.skyTop.startsWith("#"));
  assert.ok(cycle.waterFar.r > 0 && cycle.waterFar.b > 0);
});

test("water reflections mirror scene geometry onto the animated water plane", () => {
  const mesh = {
    primitives: [
      {
        positions: [
          -1, 0.4, 1,
          1, 0.5, 1.2,
          0, 2.4, 1.1,
        ],
        indices: [0, 1, 2],
        normals: null,
        material: {
          name: "painted-hull",
          color: { r: 0.56, g: 0.32, b: 0.2, a: 1 },
          roughness: 0.6,
          metallic: 0,
          emissive: { r: 0, g: 0, b: 0 },
        },
      },
      {
        positions: [
          -0.3, 3.4, 1.05,
          0.3, 3.5, 1.15,
          0, 5.8, 1.1,
        ],
        indices: [0, 1, 2],
        normals: null,
        material: {
          name: "sail-canvas",
          color: { r: 0.86, g: 0.82, b: 0.72, a: 1 },
          roughness: 0.94,
          metallic: 0,
          emissive: { r: 0, g: 0, b: 0 },
        },
      },
    ],
  };
  const triangles = [];
  const camera = {
    eye: { x: 0, y: 2, z: -10 },
    right: { x: 1, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
    forward: { x: 0, y: 0, z: 1 },
    fov: 54,
    aspect: 16 / 9,
  };
  const state = createWaterTestState(0.25);

  __testOnlyBuildWaterReflectionTrianglesFromMesh(
    mesh,
    { position: { x: 0, y: 0, z: 4 }, rotationY: 0, scale: 1 },
    null,
    camera,
    { width: 1600, height: 900 },
    state,
    triangles,
    {
      baseAlpha: 0.24,
      intensity: 1,
      waterTint: { r: 0.12, g: 0.32, b: 0.44, a: 1 },
      maxReflectionHeight: 2.2,
      reflectionFadeHeight: 2.4,
    }
  );

  assert.equal(triangles.length, 1);
  assert.ok(triangles[0].alpha > 0.02);
  assert.ok(triangles[0].alpha <= 0.12);
  assert.ok(triangles[0].worldCenter.y < 0.4, "expected the reflected triangle below the source geometry");
  assert.ok(
    triangles[0].points.every((point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.depth)
    )
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

test("scene lighting resolves a balanced natural night environment", () => {
  const visuals = __testOnlyResolveVisualConfig(
    { primaryShadowSource: "ray-traced-primary" },
    { currentLevel: { config: { reflectionStrength: 0.24, shadowStrength: 0.5 } } },
    {}
  );
  const lighting = visuals.lightingEnvironment;

  assert.ok(lighting.ambientStrength >= 0.4);
  assert.ok(lighting.keyStrength < 0.85);
  assert.ok(lighting.moonKey.b > lighting.moonKey.r);
  assert.ok(lighting.warmBounce.r > lighting.warmBounce.b);
  assert.ok(visuals.horizonWarmth.startsWith("rgba("));

  const lightDir = { x: -0.34, y: 0.72, z: -0.6 };
  const baseColor = { r: 0.58, g: 0.34, b: 0.22 };
  const upward = __testOnlyShadeColor(
    baseColor,
    { x: 0, y: 1, z: 0 },
    lightDir,
    0.5,
    0.02,
    lighting
  );
  const vertical = __testOnlyShadeColor(
    baseColor,
    { x: 1, y: 0, z: 0 },
    lightDir,
    0.2,
    0,
    lighting
  );

  assert.ok(Object.values(upward).every((value) => Number.isFinite(value)));
  assert.ok(Object.values(vertical).every((value) => Number.isFinite(value)));
  assert.ok(upward.r > vertical.r, "expected moon-facing surfaces to remain the key read");
  assert.ok(vertical.r > 0.025, "expected horizon fill to keep side planes out of black crush");
});

test("water horizon atmosphere accepts CSS sky colors without producing invalid canvas colors", () => {
  const visuals = __testOnlyResolveVisualConfig(
    { primaryShadowSource: "ray-traced-primary" },
    { currentLevel: { config: { reflectionStrength: 0.24, shadowStrength: 0.5 } } },
    {}
  );
  const color = __testOnlyResolveWaterAtmosphereColor(visuals);

  assert.match(color, /^rgba\(\d+, \d+, \d+, 0\.18\)$/u);
  assert.equal(color.includes("NaN"), false);
});

test("ray-traced shadow mode removes polygon shadow darkening from scene triangles", () => {
  const sceneContribution = __testOnlyResolveTriangleLightingContribution("ship", {
    shadowMask: "per-pixel-screen-space-ray-mask",
    polygonShadowContribution: 0,
    polygonLightingContribution: 0,
  });
  const waterContribution = __testOnlyResolveTriangleLightingContribution("water", {
    shadowMask: "per-pixel-screen-space-ray-mask",
    polygonShadowContribution: 0,
    polygonLightingContribution: 0,
  });

  assert.equal(sceneContribution.polygonShadowContribution, 0);
  assert.equal(sceneContribution.polygonLightingContribution, 0);
  assert.equal(waterContribution.polygonShadowContribution, 0);
  assert.ok(
    waterContribution.polygonLightingContribution > sceneContribution.polygonLightingContribution,
    "expected smoothed water normals to keep more specular shape than faceted scene geometry"
  );
});

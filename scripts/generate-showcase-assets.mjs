import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const assetsDir = path.join(repoRoot, "assets");
const inlineModulePath = path.join(repoRoot, "src", "showcase-inline-assets.js");

const MATERIAL_LIBRARY = Object.freeze({
  "painted-hull": {
    baseColorFactor: [0.42, 0.24, 0.16, 1],
    metallicFactor: 0.08,
    roughnessFactor: 0.76,
  },
  "hull-trim": {
    baseColorFactor: [0.72, 0.71, 0.66, 1],
    metallicFactor: 0.18,
    roughnessFactor: 0.42,
  },
  "deck-plank": {
    baseColorFactor: [0.53, 0.39, 0.26, 1],
    metallicFactor: 0.02,
    roughnessFactor: 0.9,
  },
  "mast-wood": {
    baseColorFactor: [0.37, 0.27, 0.18, 1],
    metallicFactor: 0.02,
    roughnessFactor: 0.82,
  },
  "sail-canvas": {
    baseColorFactor: [0.82, 0.79, 0.72, 1],
    metallicFactor: 0,
    roughnessFactor: 0.96,
  },
  "metal-dark": {
    baseColorFactor: [0.21, 0.22, 0.24, 1],
    metallicFactor: 0.84,
    roughnessFactor: 0.34,
  },
  "metal-brass": {
    baseColorFactor: [0.71, 0.56, 0.26, 1],
    metallicFactor: 0.94,
    roughnessFactor: 0.3,
  },
  "paint-white": {
    baseColorFactor: [0.84, 0.84, 0.82, 1],
    metallicFactor: 0,
    roughnessFactor: 0.88,
  },
  "paint-red": {
    baseColorFactor: [0.67, 0.12, 0.1, 1],
    metallicFactor: 0.04,
    roughnessFactor: 0.72,
  },
  stone: {
    baseColorFactor: [0.49, 0.48, 0.46, 1],
    metallicFactor: 0,
    roughnessFactor: 0.97,
  },
  concrete: {
    baseColorFactor: [0.56, 0.55, 0.53, 1],
    metallicFactor: 0,
    roughnessFactor: 0.95,
  },
  "warehouse-plaster": {
    baseColorFactor: [0.76, 0.74, 0.69, 1],
    metallicFactor: 0,
    roughnessFactor: 0.92,
  },
  "roof-tiles": {
    baseColorFactor: [0.31, 0.19, 0.17, 1],
    metallicFactor: 0.04,
    roughnessFactor: 0.88,
  },
  "window-glass": {
    baseColorFactor: [0.49, 0.66, 0.78, 0.72],
    metallicFactor: 0.04,
    roughnessFactor: 0.08,
    emissiveFactor: [0.18, 0.24, 0.28],
  },
  "warm-glass": {
    baseColorFactor: [0.95, 0.82, 0.56, 0.84],
    metallicFactor: 0.02,
    roughnessFactor: 0.16,
    emissiveFactor: [0.92, 0.7, 0.34],
  },
  "jetty-timber": {
    baseColorFactor: [0.4, 0.31, 0.21, 1],
    metallicFactor: 0.03,
    roughnessFactor: 0.9,
  },
  "dock-metal": {
    baseColorFactor: [0.24, 0.26, 0.29, 1],
    metallicFactor: 0.88,
    roughnessFactor: 0.26,
  },
  "crate-wood": {
    baseColorFactor: [0.44, 0.31, 0.17, 1],
    metallicFactor: 0.02,
    roughnessFactor: 0.92,
  },
});

function vec3(x, y, z) {
  return [x, y, z];
}

function addVec3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subVec3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(a, scale) {
  return [a[0] * scale, a[1] * scale, a[2] * scale];
}

function crossVec3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalizeVec3(a) {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

function rotateY(point, radians) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return [
    point[0] * cosine - point[2] * sine,
    point[1],
    point[0] * sine + point[2] * cosine,
  ];
}

function translatePoints(points, translation) {
  return points.map((point) => addVec3(point, translation));
}

class PrimitiveBuilder {
  constructor(materialName) {
    this.materialName = materialName;
    this.positions = [];
    this.normals = [];
    this.indices = [];
  }

  addTriangle(a, b, c, normals = null) {
    const faceNormal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(c, a)));
    const triangleNormals = normals ?? [faceNormal, faceNormal, faceNormal];
    const startIndex = this.positions.length / 3;

    for (let index = 0; index < 3; index += 1) {
      const point = [a, b, c][index];
      const normal = triangleNormals[index] ?? faceNormal;
      this.positions.push(point[0], point[1], point[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.indices.push(startIndex + index);
    }
  }

  addQuad(a, b, c, d, normals = null) {
    if (normals) {
      this.addTriangle(a, b, c, [normals[0], normals[1], normals[2]]);
      this.addTriangle(a, c, d, [normals[0], normals[2], normals[3]]);
      return;
    }

    this.addTriangle(a, b, c);
    this.addTriangle(a, c, d);
  }

  addPolygon(points) {
    if (points.length < 3) {
      return;
    }

    for (let index = 1; index < points.length - 1; index += 1) {
      this.addTriangle(points[0], points[index], points[index + 1]);
    }
  }
}

function createPrimitiveMap(materialNames) {
  return Object.fromEntries(materialNames.map((name) => [name, new PrimitiveBuilder(name)]));
}

function addBox(builder, min, max) {
  const [minX, minY, minZ] = min;
  const [maxX, maxY, maxZ] = max;
  const points = {
    lbf: vec3(minX, minY, maxZ),
    rbf: vec3(maxX, minY, maxZ),
    rtf: vec3(maxX, maxY, maxZ),
    ltf: vec3(minX, maxY, maxZ),
    lbb: vec3(minX, minY, minZ),
    rbb: vec3(maxX, minY, minZ),
    rtb: vec3(maxX, maxY, minZ),
    ltb: vec3(minX, maxY, minZ),
  };

  builder.addQuad(points.lbf, points.rbf, points.rtf, points.ltf);
  builder.addQuad(points.rbb, points.lbb, points.ltb, points.rtb);
  builder.addQuad(points.lbb, points.lbf, points.ltf, points.ltb);
  builder.addQuad(points.rbf, points.rbb, points.rtb, points.rtf);
  builder.addQuad(points.ltf, points.rtf, points.rtb, points.ltb);
  builder.addQuad(points.lbb, points.rbb, points.rbf, points.lbf);
}

function addCylinder(builder, options) {
  const {
    center = vec3(0, 0, 0),
    height,
    radiusTop,
    radiusBottom = radiusTop,
    radialSegments = 12,
    capTop = true,
    capBottom = true,
  } = options;
  const topY = center[1] + height * 0.5;
  const bottomY = center[1] - height * 0.5;
  const topRing = [];
  const bottomRing = [];
  const sideNormals = [];
  const sideSlope = (radiusBottom - radiusTop) / height;

  for (let index = 0; index < radialSegments; index += 1) {
    const angle = (index / radialSegments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    topRing.push(vec3(center[0] + cosine * radiusTop, topY, center[2] + sine * radiusTop));
    bottomRing.push(vec3(center[0] + cosine * radiusBottom, bottomY, center[2] + sine * radiusBottom));
    sideNormals.push(normalizeVec3(vec3(cosine, sideSlope, sine)));
  }

  for (let index = 0; index < radialSegments; index += 1) {
    const next = (index + 1) % radialSegments;
    builder.addQuad(
      bottomRing[index],
      topRing[index],
      topRing[next],
      bottomRing[next],
      [sideNormals[index], sideNormals[index], sideNormals[next], sideNormals[next]]
    );
  }

  if (capTop) {
    builder.addPolygon([...topRing].reverse());
  }

  if (capBottom) {
    builder.addPolygon(bottomRing);
  }
}

function addTrapezoidPrism(builder, options) {
  const {
    length,
    widthBottom,
    widthTop,
    height,
    center = vec3(0, 0, 0),
  } = options;
  const halfLength = length * 0.5;
  const halfWidthBottom = widthBottom * 0.5;
  const halfWidthTop = widthTop * 0.5;
  const bottomY = center[1] - height * 0.5;
  const topY = center[1] + height * 0.5;
  const minZ = center[2] - halfLength;
  const maxZ = center[2] + halfLength;

  const points = {
    lbf: vec3(-halfWidthBottom + center[0], bottomY, maxZ),
    rbf: vec3(halfWidthBottom + center[0], bottomY, maxZ),
    rbb: vec3(halfWidthBottom + center[0], bottomY, minZ),
    lbb: vec3(-halfWidthBottom + center[0], bottomY, minZ),
    ltf: vec3(-halfWidthTop + center[0], topY, maxZ),
    rtf: vec3(halfWidthTop + center[0], topY, maxZ),
    rtb: vec3(halfWidthTop + center[0], topY, minZ),
    ltb: vec3(-halfWidthTop + center[0], topY, minZ),
  };

  builder.addQuad(points.lbf, points.rbf, points.rtf, points.ltf);
  builder.addQuad(points.rbb, points.lbb, points.ltb, points.rtb);
  builder.addQuad(points.lbb, points.lbf, points.ltf, points.ltb);
  builder.addQuad(points.rbf, points.rbb, points.rtb, points.rtf);
  builder.addQuad(points.ltf, points.rtf, points.rtb, points.ltb);
  builder.addQuad(points.lbb, points.rbb, points.rbf, points.lbf);
}

function addGabledRoof(builder, options) {
  const {
    minX,
    maxX,
    minZ,
    maxZ,
    eaveY,
    ridgeY,
  } = options;
  const ridgeZ = (minZ + maxZ) * 0.5;
  const leftFront = vec3(minX, eaveY, maxZ);
  const rightFront = vec3(maxX, eaveY, maxZ);
  const leftBack = vec3(minX, eaveY, minZ);
  const rightBack = vec3(maxX, eaveY, minZ);
  const ridgeFront = vec3(0, ridgeY, maxZ);
  const ridgeBack = vec3(0, ridgeY, minZ);
  const ridgeMidFront = vec3(0, ridgeY, ridgeZ + (maxZ - ridgeZ) * 0.2);
  const ridgeMidBack = vec3(0, ridgeY, ridgeZ - (ridgeZ - minZ) * 0.2);

  builder.addQuad(leftBack, leftFront, ridgeMidFront, ridgeMidBack);
  builder.addQuad(ridgeMidBack, ridgeMidFront, rightFront, rightBack);
  builder.addTriangle(leftFront, rightFront, ridgeFront);
  builder.addTriangle(rightBack, leftBack, ridgeBack);
}

function addHull(builder, deckBuilder, stations) {
  const rings = stations.map((station) => {
    const lowerY = station.bottomY + (station.deckY - station.bottomY) * 0.28;
    const upperY = station.bottomY + (station.deckY - station.bottomY) * 0.76;
    return {
      keel: vec3(0, station.bottomY, station.z),
      chineLowerStarboard: vec3(station.halfWidth * 0.48, lowerY, station.z),
      chineUpperStarboard: vec3(station.halfWidth * 0.88, upperY, station.z),
      railStarboard: vec3(station.halfWidth, station.deckY, station.z),
      deckCenter: vec3(0, station.deckY + station.camber, station.z),
      railPort: vec3(-station.halfWidth, station.deckY, station.z),
      chineUpperPort: vec3(-station.halfWidth * 0.88, upperY, station.z),
      chineLowerPort: vec3(-station.halfWidth * 0.48, lowerY, station.z),
    };
  });

  for (let index = 0; index < rings.length - 1; index += 1) {
    const current = rings[index];
    const next = rings[index + 1];
    builder.addQuad(current.keel, current.chineLowerStarboard, next.chineLowerStarboard, next.keel);
    builder.addQuad(
      current.chineLowerStarboard,
      current.chineUpperStarboard,
      next.chineUpperStarboard,
      next.chineLowerStarboard
    );
    builder.addQuad(
      current.chineUpperStarboard,
      current.railStarboard,
      next.railStarboard,
      next.chineUpperStarboard
    );
    builder.addQuad(current.railPort, current.chineUpperPort, next.chineUpperPort, next.railPort);
    builder.addQuad(
      current.chineUpperPort,
      current.chineLowerPort,
      next.chineLowerPort,
      next.chineUpperPort
    );
    builder.addQuad(current.chineLowerPort, current.keel, next.keel, next.chineLowerPort);

    deckBuilder.addQuad(
      current.deckCenter,
      current.railStarboard,
      next.railStarboard,
      next.deckCenter
    );
    deckBuilder.addQuad(
      current.railPort,
      current.deckCenter,
      next.deckCenter,
      next.railPort
    );
  }

  const bow = rings[rings.length - 1];
  const stern = rings[0];
  builder.addPolygon([
    bow.railStarboard,
    bow.deckCenter,
    bow.railPort,
    bow.chineUpperPort,
    bow.chineLowerPort,
    bow.keel,
    bow.chineLowerStarboard,
    bow.chineUpperStarboard,
  ]);
  builder.addPolygon([
    stern.railPort,
    stern.deckCenter,
    stern.railStarboard,
    stern.chineUpperStarboard,
    stern.chineLowerStarboard,
    stern.keel,
    stern.chineLowerPort,
    stern.chineUpperPort,
  ]);
}

function createBrigantineAsset() {
  const parts = createPrimitiveMap([
    "painted-hull",
    "hull-trim",
    "deck-plank",
    "mast-wood",
    "sail-canvas",
    "metal-dark",
    "warm-glass",
  ]);

  addHull(parts["painted-hull"], parts["deck-plank"], [
    { z: -4.4, halfWidth: 0.72, deckY: 0.82, bottomY: -0.82, camber: 0.04 },
    { z: -3.25, halfWidth: 1.18, deckY: 0.9, bottomY: -0.96, camber: 0.05 },
    { z: -2.1, halfWidth: 1.46, deckY: 0.98, bottomY: -1.04, camber: 0.05 },
    { z: -0.7, halfWidth: 1.58, deckY: 1.02, bottomY: -1.08, camber: 0.06 },
    { z: 1.05, halfWidth: 1.42, deckY: 0.96, bottomY: -0.98, camber: 0.05 },
    { z: 2.55, halfWidth: 0.94, deckY: 0.88, bottomY: -0.84, camber: 0.04 },
    { z: 3.9, halfWidth: 0.24, deckY: 0.78, bottomY: -0.68, camber: 0.02 },
  ]);

  addBox(parts["hull-trim"], vec3(-1.48, 0.84, -2.2), vec3(1.48, 0.95, 2.4));
  addBox(parts["deck-plank"], vec3(-0.68, 1.0, -2.35), vec3(0.68, 1.54, -0.6));
  addBox(parts["deck-plank"], vec3(-0.44, 1.02, 0.5), vec3(0.44, 1.38, 1.7));
  addTrapezoidPrism(parts["hull-trim"], {
    center: vec3(0, 1.48, -1.48),
    height: 0.28,
    length: 1.1,
    widthBottom: 1.12,
    widthTop: 0.82,
  });

  addCylinder(parts["mast-wood"], {
    center: vec3(0, 3.55, -0.92),
    height: 5.4,
    radiusTop: 0.07,
    radiusBottom: 0.1,
    radialSegments: 18,
  });
  addCylinder(parts["mast-wood"], {
    center: vec3(-0.08, 2.86, -2.92),
    height: 3.8,
    radiusTop: 0.05,
    radiusBottom: 0.08,
    radialSegments: 18,
  });
  addBox(parts["mast-wood"], vec3(-0.08, 3.3, -1.0), vec3(2.18, 3.38, -0.88));
  addBox(parts["mast-wood"], vec3(-0.14, 2.4, -3.0), vec3(1.28, 2.48, -2.9));
  addBox(parts["mast-wood"], vec3(-0.04, 1.42, 3.7), vec3(0.06, 1.5, 5.05));

  parts["sail-canvas"].addQuad(
    vec3(0.08, 4.82, -0.92),
    vec3(1.86, 3.42, -0.84),
    vec3(1.54, 1.62, -0.74),
    vec3(0.02, 2.08, -0.86)
  );
  parts["sail-canvas"].addQuad(
    vec3(-0.05, 3.86, -2.96),
    vec3(1.15, 2.46, -2.86),
    vec3(0.96, 1.12, -2.78),
    vec3(-0.08, 1.56, -2.92)
  );
  addBox(parts["metal-dark"], vec3(-0.96, 0.78, 1.26), vec3(0.96, 0.88, 1.44));

  addCylinder(parts["warm-glass"], {
    center: vec3(0.72, 1.24, 0.96),
    height: 0.24,
    radiusTop: 0.08,
    radialSegments: 16,
  });
  addCylinder(parts["warm-glass"], {
    center: vec3(-0.72, 1.18, -1.54),
    height: 0.24,
    radiusTop: 0.08,
    radialSegments: 16,
  });

  return {
    name: "brigantine",
    physics: {
      shape: "box",
      halfExtents: [1.58, 1.12, 4.4],
      mass: 4700,
      restitution: 0.2,
      linearDamping: 0.038,
      angularDamping: 0.076,
      waterline: 0.44,
    },
    children: [
      { name: "brigantine-hull", primitives: [parts["painted-hull"], parts["deck-plank"], parts["hull-trim"]] },
      { name: "brigantine-rig", primitives: [parts["mast-wood"], parts["sail-canvas"], parts["metal-dark"]] },
      { name: "brigantine-lanterns", primitives: [parts["warm-glass"]] },
    ],
  };
}

function createCutterAsset() {
  const parts = createPrimitiveMap([
    "painted-hull",
    "paint-white",
    "deck-plank",
    "window-glass",
    "metal-dark",
    "warm-glass",
  ]);

  addHull(parts["painted-hull"], parts["deck-plank"], [
    { z: -2.9, halfWidth: 0.5, deckY: 0.56, bottomY: -0.52, camber: 0.03 },
    { z: -1.8, halfWidth: 0.82, deckY: 0.66, bottomY: -0.62, camber: 0.04 },
    { z: -0.15, halfWidth: 0.98, deckY: 0.72, bottomY: -0.68, camber: 0.04 },
    { z: 1.4, halfWidth: 0.8, deckY: 0.64, bottomY: -0.58, camber: 0.03 },
    { z: 2.6, halfWidth: 0.22, deckY: 0.48, bottomY: -0.42, camber: 0.02 },
  ]);

  addBox(parts["paint-white"], vec3(-0.58, 0.72, -0.72), vec3(0.58, 1.52, 0.82));
  addGabledRoof(parts["paint-white"], {
    minX: -0.7,
    maxX: 0.7,
    minZ: -0.92,
    maxZ: 0.98,
    eaveY: 1.52,
    ridgeY: 1.86,
  });
  addBox(parts["window-glass"], vec3(-0.5, 1.0, -0.62), vec3(0.5, 1.3, -0.48));
  addBox(parts["window-glass"], vec3(-0.5, 1.0, 0.36), vec3(0.5, 1.28, 0.52));
  addBox(parts["window-glass"], vec3(-0.64, 1.02, -0.28), vec3(-0.5, 1.28, 0.18));
  addBox(parts["window-glass"], vec3(0.5, 1.02, -0.28), vec3(0.64, 1.28, 0.18));
  addCylinder(parts["metal-dark"], {
    center: vec3(0, 1.86, -0.3),
    height: 1.28,
    radiusTop: 0.05,
    radiusBottom: 0.08,
    radialSegments: 18,
  });
  addBox(parts["metal-dark"], vec3(-0.9, 0.76, 0.98), vec3(0.9, 0.88, 1.12));
  addCylinder(parts["warm-glass"], {
    center: vec3(0.44, 1.02, 1.18),
    height: 0.18,
    radiusTop: 0.06,
    radialSegments: 16,
  });

  return {
    name: "cutter",
    physics: {
      shape: "box",
      halfExtents: [1.02, 0.92, 2.95],
      mass: 2400,
      restitution: 0.24,
      linearDamping: 0.044,
      angularDamping: 0.084,
      waterline: 0.36,
    },
    children: [
      { name: "cutter-hull", primitives: [parts["painted-hull"], parts["deck-plank"]] },
      { name: "cutter-cabin", primitives: [parts["paint-white"], parts["window-glass"], parts["metal-dark"], parts["warm-glass"]] },
    ],
  };
}

function createLighthouseAsset() {
  const parts = createPrimitiveMap([
    "paint-white",
    "paint-red",
    "stone",
    "metal-dark",
    "warm-glass",
    "window-glass",
    "roof-tiles",
  ]);

  addCylinder(parts["paint-white"], {
    center: vec3(0, 5.8, 0),
    height: 8.8,
    radiusTop: 0.86,
    radiusBottom: 1.38,
    radialSegments: 40,
  });
  addCylinder(parts["paint-red"], {
    center: vec3(0, 4.7, 0),
    height: 1.2,
    radiusTop: 1.06,
    radiusBottom: 1.22,
    radialSegments: 40,
    capTop: false,
    capBottom: false,
  });
  addCylinder(parts.stone, {
    center: vec3(0, 0.7, 0),
    height: 1.4,
    radiusTop: 1.52,
    radiusBottom: 1.72,
    radialSegments: 40,
  });
  addCylinder(parts["metal-dark"], {
    center: vec3(0, 10.4, 0),
    height: 0.26,
    radiusTop: 1.42,
    radiusBottom: 1.42,
    radialSegments: 48,
  });
  addCylinder(parts["warm-glass"], {
    center: vec3(0, 11.34, 0),
    height: 1.34,
    radiusTop: 0.92,
    radiusBottom: 0.92,
    radialSegments: 36,
  });
  addCylinder(parts["roof-tiles"], {
    center: vec3(0, 12.34, 0),
    height: 1.22,
    radiusTop: 0.14,
    radiusBottom: 0.9,
    radialSegments: 36,
    capBottom: false,
  });
  addBox(parts.stone, vec3(-1.7, 0.2, -3.1), vec3(1.7, 1.65, -0.9));
  addGabledRoof(parts["roof-tiles"], {
    minX: -1.95,
    maxX: 1.95,
    minZ: -3.3,
    maxZ: -0.7,
    eaveY: 1.65,
    ridgeY: 2.36,
  });
  addBox(parts["window-glass"], vec3(-0.42, 5.3, 1.26), vec3(0.42, 6.2, 1.42));

  return {
    name: "lighthouse",
    physics: null,
    children: [
      { name: "lighthouse-tower", primitives: [parts["paint-white"], parts["paint-red"], parts.stone, parts["metal-dark"], parts["warm-glass"]] },
      {
        name: "lighthouse-keeper-house",
        translation: [0.8, 0, -0.3],
        primitives: [parts["roof-tiles"], parts["window-glass"]],
      },
    ],
  };
}

function createHarborDockAsset() {
  const parts = createPrimitiveMap([
    "concrete",
    "jetty-timber",
    "warehouse-plaster",
    "roof-tiles",
    "dock-metal",
    "crate-wood",
    "window-glass",
    "warm-glass",
  ]);

  addBox(parts.concrete, vec3(-7.2, -0.9, -2.4), vec3(1.2, 0.3, 2.2));
  addBox(parts["jetty-timber"], vec3(-4.6, 0.22, -1.1), vec3(4.2, 0.44, 1.1));
  addBox(parts["jetty-timber"], vec3(3.6, 0.22, -1.55), vec3(7.4, 0.42, 1.55));

  for (const x of [-3.8, -2, -0.2, 1.6, 4.2, 5.8, 7]) {
    addBox(parts["jetty-timber"], vec3(x - 0.08, -1.42, -0.9), vec3(x + 0.08, 0.22, -0.74));
    addBox(parts["jetty-timber"], vec3(x - 0.08, -1.42, 0.74), vec3(x + 0.08, 0.22, 0.9));
  }

  addBox(parts["warehouse-plaster"], vec3(-6.3, 0.3, -1.7), vec3(-2.2, 2.4, 1.3));
  addGabledRoof(parts["roof-tiles"], {
    minX: -6.6,
    maxX: -1.9,
    minZ: -1.95,
    maxZ: 1.55,
    eaveY: 2.4,
    ridgeY: 3.26,
  });
  addBox(parts["window-glass"], vec3(-5.84, 1.06, 1.32), vec3(-4.9, 1.78, 1.46));
  addBox(parts["window-glass"], vec3(-3.58, 1.06, 1.32), vec3(-2.66, 1.78, 1.46));
  addBox(parts["dock-metal"], vec3(0.18, 0.42, -0.22), vec3(0.36, 2.32, -0.02));
  addBox(parts["dock-metal"], vec3(0.24, 2.06, -0.18), vec3(1.96, 2.22, -0.02));
  addBox(parts["dock-metal"], vec3(1.72, 1.36, -0.16), vec3(1.9, 2.06, 0.02));

  addBox(parts["crate-wood"], vec3(1.2, 0.44, -0.88), vec3(1.8, 1.0, -0.28));
  addBox(parts["crate-wood"], vec3(2.04, 0.44, -0.78), vec3(2.68, 1.18, -0.16));
  addBox(parts["crate-wood"], vec3(1.48, 0.44, 0.24), vec3(2.06, 0.92, 0.82));
  addCylinder(parts["dock-metal"], {
    center: vec3(5.46, 0.64, -0.88),
    height: 0.44,
    radiusTop: 0.12,
    radialSegments: 18,
  });
  addCylinder(parts["dock-metal"], {
    center: vec3(5.46, 0.64, 0.88),
    height: 0.44,
    radiusTop: 0.12,
    radialSegments: 18,
  });
  addCylinder(parts["warm-glass"], {
    center: vec3(-4.18, 2.82, 1.08),
    height: 0.22,
    radiusTop: 0.14,
    radialSegments: 16,
  });

  return {
    name: "harbor-dock",
    physics: null,
    children: [
      { name: "harbor-dock-main", primitives: [parts.concrete, parts["jetty-timber"], parts["dock-metal"], parts["crate-wood"]] },
      {
        name: "harbor-dock-warehouse",
        translation: [0, 0, 0],
        primitives: [parts["warehouse-plaster"], parts["roof-tiles"], parts["window-glass"], parts["warm-glass"]],
      },
    ],
  };
}

function chunkBuffer(buffer, chunks) {
  const alignedLength = Math.ceil(buffer.length / 4) * 4;
  const chunk = Buffer.alloc(alignedLength);
  buffer.copy(chunk);
  const byteOffset = chunks.reduce((total, part) => total + part.length, 0);
  chunks.push(chunk);
  return { byteOffset, byteLength: buffer.length };
}

function computeBounds(values) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < values.length; index += 3) {
    min[0] = Math.min(min[0], values[index]);
    min[1] = Math.min(min[1], values[index + 1]);
    min[2] = Math.min(min[2], values[index + 2]);
    max[0] = Math.max(max[0], values[index]);
    max[1] = Math.max(max[1], values[index + 1]);
    max[2] = Math.max(max[2], values[index + 2]);
  }
  return { min, max };
}

function compileAsset(assetDefinition) {
  const materialNames = new Set();
  const meshes = [];
  const nodes = [
    {
      name: assetDefinition.name,
      children: [],
      ...(assetDefinition.physics ? { extras: { physics: assetDefinition.physics } } : {}),
    },
  ];

  for (const child of assetDefinition.children) {
    for (const primitive of child.primitives) {
      if (primitive.positions.length > 0) {
        materialNames.add(primitive.materialName);
      }
    }
  }

  const materialOrder = [...materialNames];
  const materialIndices = new Map(materialOrder.map((name, index) => [name, index]));
  const materials = materialOrder.map((name) => ({
    name,
    pbrMetallicRoughness: {
      baseColorFactor: MATERIAL_LIBRARY[name].baseColorFactor,
      metallicFactor: MATERIAL_LIBRARY[name].metallicFactor,
      roughnessFactor: MATERIAL_LIBRARY[name].roughnessFactor,
    },
    ...(MATERIAL_LIBRARY[name].emissiveFactor
      ? { emissiveFactor: MATERIAL_LIBRARY[name].emissiveFactor }
      : {}),
    ...(MATERIAL_LIBRARY[name].baseColorFactor[3] < 1 ? { alphaMode: "BLEND" } : {}),
  }));

  const bufferChunks = [];
  const bufferViews = [];
  const accessors = [];

  function appendAccessor(typedArray, options) {
    const buffer = Buffer.from(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );
    const { byteOffset, byteLength } = chunkBuffer(buffer, bufferChunks);
    const bufferViewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength,
      target: options.target,
    });
    const accessorIndex = accessors.length;
    accessors.push({
      bufferView: bufferViewIndex,
      byteOffset: 0,
      componentType: options.componentType,
      count: options.count,
      type: options.type,
      ...(options.min ? { min: options.min } : {}),
      ...(options.max ? { max: options.max } : {}),
    });
    return accessorIndex;
  }

  for (const child of assetDefinition.children) {
    const meshPrimitives = [];

    for (const primitive of child.primitives) {
      if (primitive.positions.length === 0) {
        continue;
      }

      const positions = new Float32Array(primitive.positions);
      const normals = new Float32Array(primitive.normals);
      const indices =
        primitive.positions.length / 3 > 65535
          ? new Uint32Array(primitive.indices)
          : new Uint16Array(primitive.indices);
      const bounds = computeBounds(primitive.positions);
      const positionAccessor = appendAccessor(positions, {
        componentType: 5126,
        count: positions.length / 3,
        type: "VEC3",
        min: bounds.min,
        max: bounds.max,
        target: 34962,
      });
      const normalAccessor = appendAccessor(normals, {
        componentType: 5126,
        count: normals.length / 3,
        type: "VEC3",
        target: 34962,
      });
      const indexAccessor = appendAccessor(indices, {
        componentType: indices instanceof Uint32Array ? 5125 : 5123,
        count: indices.length,
        type: "SCALAR",
        min: [0],
        max: [positions.length / 3 - 1],
        target: 34963,
      });

      meshPrimitives.push({
        attributes: {
          POSITION: positionAccessor,
          NORMAL: normalAccessor,
        },
        indices: indexAccessor,
        material: materialIndices.get(primitive.materialName),
      });
    }

    if (meshPrimitives.length === 0) {
      continue;
    }

    const meshIndex = meshes.length;
    meshes.push({
      name: child.name,
      primitives: meshPrimitives,
    });
    nodes.push({
      name: child.name,
      mesh: meshIndex,
      ...(Array.isArray(child.translation) ? { translation: child.translation } : {}),
      ...(Array.isArray(child.scale) ? { scale: child.scale } : {}),
      ...(Array.isArray(child.rotation) ? { rotation: child.rotation } : {}),
    });
    nodes[0].children.push(nodes.length - 1);
  }

  const binary = Buffer.concat(bufferChunks);
  const document = {
    asset: {
      version: "2.0",
      generator: "@plasius/gpu-shared showcase asset generator",
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes,
    meshes,
    materials,
    buffers: [
      {
        uri: `data:application/octet-stream;base64,${binary.toString("base64")}`,
        byteLength: binary.length,
      },
    ],
    bufferViews,
    accessors,
  };

  return JSON.stringify(document, null, 2);
}

function writeAsset(fileName, contents) {
  mkdirSync(assetsDir, { recursive: true });
  writeFileSync(path.join(assetsDir, fileName), contents);
}

function writeInlineModule(assetName, contents) {
  const inlineUrl = `data:application/json;base64,${Buffer.from(contents).toString("base64")}`;
  writeFileSync(
    inlineModulePath,
    `export const INLINE_SHOWCASE_ASSET_URLS = Object.freeze({\n  ${JSON.stringify(assetName)}: ${JSON.stringify(inlineUrl)},\n});\n`
  );
}

const assets = [
  ["brigantine.gltf", compileAsset(createBrigantineAsset())],
  ["cutter.gltf", compileAsset(createCutterAsset())],
  ["lighthouse.gltf", compileAsset(createLighthouseAsset())],
  ["harbor-dock.gltf", compileAsset(createHarborDockAsset())],
];

for (const [fileName, contents] of assets) {
  writeAsset(fileName, `${contents}\n`);
}

writeInlineModule("brigantine", `${assets[0][1]}\n`);

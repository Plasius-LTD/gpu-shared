import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const assetsDir = path.join(repoRoot, "assets");
const inlineModulePath = path.join(
  repoRoot,
  "src",
  "showcase-inline-assets.js",
);

const MATERIAL_LIBRARY = Object.freeze({
  "painted-hull": {
    baseColorFactor: [0.14, 0.052, 0.025, 1],
    metallicFactor: 0.08,
    roughnessFactor: 0.76,
  },
  "hull-trim": {
    baseColorFactor: [0.72, 0.71, 0.66, 1],
    metallicFactor: 0.18,
    roughnessFactor: 0.42,
  },
  "deck-plank": {
    baseColorFactor: [0.31, 0.2, 0.095, 1],
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
  "rigging-rope": {
    baseColorFactor: [0.055, 0.038, 0.023, 1],
    metallicFactor: 0,
    roughnessFactor: 0.96,
  },
  "headland-grass": {
    baseColorFactor: [0.085, 0.12, 0.055, 1],
    metallicFactor: 0,
    roughnessFactor: 0.98,
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
  "quay-stone": {
    baseColorFactor: [0.28, 0.29, 0.27, 1],
    metallicFactor: 0,
    roughnessFactor: 0.96,
  },
  "quay-stone-warm": {
    baseColorFactor: [0.34, 0.32, 0.27, 1],
    metallicFactor: 0,
    roughnessFactor: 0.98,
  },
  "quay-stone-wet": {
    baseColorFactor: [0.12, 0.16, 0.15, 1],
    metallicFactor: 0,
    roughnessFactor: 0.84,
  },
  "roof-slate": {
    baseColorFactor: [0.075, 0.1, 0.12, 1],
    metallicFactor: 0,
    roughnessFactor: 0.88,
  },
  "roof-slate-weathered": {
    baseColorFactor: [0.085, 0.108, 0.127, 1],
    metallicFactor: 0,
    roughnessFactor: 0.93,
  },
  "warehouse-timber": {
    baseColorFactor: [0.075, 0.09, 0.082, 1],
    metallicFactor: 0,
    roughnessFactor: 0.94,
  },
  "warehouse-glazing": {
    baseColorFactor: [0.028, 0.055, 0.069, 1],
    metallicFactor: 0,
    roughnessFactor: 0.22,
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
  "shore-sand": {
    baseColorFactor: [0.45, 0.42, 0.34, 1],
    metallicFactor: 0,
    roughnessFactor: 0.98,
  },
  "wet-rock": {
    baseColorFactor: [0.2, 0.22, 0.22, 1],
    metallicFactor: 0.02,
    roughnessFactor: 0.9,
  },
  seaweed: {
    baseColorFactor: [0.07, 0.16, 0.1, 1],
    metallicFactor: 0,
    roughnessFactor: 0.96,
  },
  driftwood: {
    baseColorFactor: [0.31, 0.25, 0.18, 1],
    metallicFactor: 0.02,
    roughnessFactor: 0.94,
  },
  "foam-stain": {
    baseColorFactor: [0.78, 0.82, 0.78, 0.68],
    metallicFactor: 0,
    roughnessFactor: 0.99,
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

function pseudoRandom(seed) {
  const sine = Math.sin(seed * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
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
  return Object.fromEntries(
    materialNames.map((name) => [name, new PrimitiveBuilder(name)]),
  );
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
    topRing.push(
      vec3(center[0] + cosine * radiusTop, topY, center[2] + sine * radiusTop),
    );
    bottomRing.push(
      vec3(
        center[0] + cosine * radiusBottom,
        bottomY,
        center[2] + sine * radiusBottom,
      ),
    );
    sideNormals.push(normalizeVec3(vec3(cosine, sideSlope, sine)));
  }

  for (let index = 0; index < radialSegments; index += 1) {
    const next = (index + 1) % radialSegments;
    builder.addQuad(
      bottomRing[index],
      topRing[index],
      topRing[next],
      bottomRing[next],
      [
        sideNormals[index],
        sideNormals[index],
        sideNormals[next],
        sideNormals[next],
      ],
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
    gableBuilder = builder,
  } = options;
  const ridgeX = (minX + maxX) * 0.5;
  const leftFront = vec3(minX, eaveY, maxZ);
  const rightFront = vec3(maxX, eaveY, maxZ);
  const leftBack = vec3(minX, eaveY, minZ);
  const rightBack = vec3(maxX, eaveY, minZ);
  const ridgeFront = vec3(ridgeX, ridgeY, maxZ);
  const ridgeBack = vec3(ridgeX, ridgeY, minZ);

  builder.addQuad(leftBack, leftFront, ridgeFront, ridgeBack);
  builder.addQuad(ridgeBack, ridgeFront, rightFront, rightBack);
  gableBuilder.addTriangle(leftFront, rightFront, ridgeFront);
  gableBuilder.addTriangle(rightBack, leftBack, ridgeBack);
}

function addHull(builder, deckBuilder, stations) {
  // Subdivide longitudinal stations with a shape-preserving cubic interpolation.
  const controls = stations;
  stations = [];
  for (let i = 0; i < controls.length - 1; i++) {
    for (let step = 0; step < 4; step++) {
      const t = step / 4;
      const p0 = controls[Math.max(0, i - 1)],
        p1 = controls[i],
        p2 = controls[i + 1],
        p3 = controls[Math.min(controls.length - 1, i + 2)];
      const station = {};
      for (const key of ["halfWidth", "deckY", "bottomY", "camber"]) {
        station[key] =
          0.5 *
          (2 * p1[key] +
            (-p0[key] + p2[key]) * t +
            (2 * p0[key] - 5 * p1[key] + 4 * p2[key] - p3[key]) * t * t +
            (-p0[key] + 3 * p1[key] - 3 * p2[key] + p3[key]) * t * t * t);
      }
      station.z = p1.z + (p2.z - p1.z) * t;
      stations.push(station);
    }
  }
  stations.push(controls.at(-1));
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
    builder.addQuad(
      current.keel,
      current.chineLowerStarboard,
      next.chineLowerStarboard,
      next.keel,
    );
    builder.addQuad(
      current.chineLowerStarboard,
      current.chineUpperStarboard,
      next.chineUpperStarboard,
      next.chineLowerStarboard,
    );
    builder.addQuad(
      current.chineUpperStarboard,
      current.railStarboard,
      next.railStarboard,
      next.chineUpperStarboard,
    );
    builder.addQuad(
      current.railPort,
      current.chineUpperPort,
      next.chineUpperPort,
      next.railPort,
    );
    builder.addQuad(
      current.chineUpperPort,
      current.chineLowerPort,
      next.chineLowerPort,
      next.chineUpperPort,
    );
    builder.addQuad(
      current.chineLowerPort,
      current.keel,
      next.keel,
      next.chineLowerPort,
    );

    deckBuilder.addQuad(
      current.deckCenter,
      current.railStarboard,
      next.railStarboard,
      next.deckCenter,
    );
    deckBuilder.addQuad(
      current.railPort,
      current.deckCenter,
      next.deckCenter,
      next.railPort,
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

function addRope(builder, start, end, radius = 0.015, sag = 0) {
  const direction = normalizeVec3(subVec3(end, start));
  const right = normalizeVec3(
    crossVec3(
      direction,
      Math.abs(direction[1]) > 0.9 ? vec3(1, 0, 0) : vec3(0, 1, 0),
    ),
  );
  const up = normalizeVec3(crossVec3(direction, right));
  const ring = (t) => {
    const c = addVec3(start, scaleVec3(subVec3(end, start), t));
    c[1] -= Math.sin(t * Math.PI) * sag;
    return Array.from({ length: 6 }, (_, i) =>
      addVec3(
        c,
        addVec3(
          scaleVec3(right, Math.cos((i / 6) * Math.PI * 2) * radius),
          scaleVec3(up, Math.sin((i / 6) * Math.PI * 2) * radius),
        ),
      ),
    );
  };
  // Straight struts/rope segments need no longitudinal subdivisions.
  const sections = sag === 0 ? 1 : 6;
  for (let j = 0; j < sections; j++) {
    const a = ring(j / sections),
      b = ring((j + 1) / sections);
    for (let i = 0; i < 6; i++)
      builder.addQuad(a[i], a[(i + 1) % 6], b[(i + 1) % 6], b[i]);
  }
}

function addBillowedSail(builder, a, b, c, d) {
  const normal = normalizeVec3(crossVec3(subVec3(b, a), subVec3(d, a)));
  const point = (u, v) => {
    const top = addVec3(a, scaleVec3(subVec3(b, a), u)),
      bottom = addVec3(d, scaleVec3(subVec3(c, d), u));
    return addVec3(
      addVec3(top, scaleVec3(subVec3(bottom, top), v)),
      scaleVec3(normal, Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.32),
    );
  };
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 16; x++) {
      builder.addQuad(
        point(x / 16, y / 12),
        point((x + 1) / 16, y / 12),
        point((x + 1) / 16, (y + 1) / 12),
        point(x / 16, (y + 1) / 12),
      );
    }
}

function addShipRails(parts, length, width, deckHeight) {
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const z = (i / 11 - 0.5) * length;
      const x = side * width * (0.65 + 0.35 * Math.sin((i / 11) * Math.PI));
      addRope(
        parts["mast-wood"] ?? parts["deck-plank"],
        vec3(x, deckHeight, z),
        vec3(x, deckHeight + 0.42, z),
        0.027,
      );
      if (i < 11) {
        const nz = ((i + 1) / 11 - 0.5) * length,
          nx =
            side * width * (0.65 + 0.35 * Math.sin(((i + 1) / 11) * Math.PI));
        addRope(
          parts["rigging-rope"] ?? parts["metal-dark"],
          vec3(x, deckHeight + 0.38, z),
          vec3(nx, deckHeight + 0.38, nz),
          0.018,
          0.025,
        );
      }
    }
  }
}

function addTerrainStrip(builder, sections) {
  for (let index = 0; index < sections.length - 1; index += 1) {
    const current = sections[index];
    const next = sections[index + 1];
    builder.addQuad(
      vec3(current.leftX, current.y, current.z),
      vec3(current.rightX, current.y + current.camber, current.z),
      vec3(next.rightX, next.y + next.camber, next.z),
      vec3(next.leftX, next.y, next.z),
    );
  }
}

function addIrregularRock(builder, options) {
  const {
    center,
    radius = 0.8,
    height = 0.7,
    radialSegments = 8,
    seed = 1,
  } = options;
  const topRing = [];
  const midRing = [];
  const bottomRing = [];

  for (let index = 0; index < radialSegments; index += 1) {
    const angle = (index / radialSegments) * Math.PI * 2;
    const variance = 0.76 + pseudoRandom(seed * 17 + index * 13) * 0.38;
    const topVariance = 0.46 + pseudoRandom(seed * 23 + index * 19) * 0.2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    bottomRing.push(
      vec3(
        center[0] + cosine * radius * variance,
        center[1],
        center[2] + sine * radius * (0.74 + variance * 0.22),
      ),
    );
    midRing.push(
      vec3(
        center[0] + cosine * radius * variance * 0.92,
        center[1] + height * (0.44 + pseudoRandom(seed * 29 + index) * 0.12),
        center[2] + sine * radius * variance * 0.72,
      ),
    );
    topRing.push(
      vec3(
        center[0] + cosine * radius * topVariance,
        center[1] +
          height * (0.86 + pseudoRandom(seed * 31 + index * 5) * 0.22),
        center[2] + sine * radius * topVariance * 0.76,
      ),
    );
  }

  for (let index = 0; index < radialSegments; index += 1) {
    const next = (index + 1) % radialSegments;
    builder.addQuad(
      bottomRing[index],
      midRing[index],
      midRing[next],
      bottomRing[next],
    );
    builder.addQuad(
      midRing[index],
      topRing[index],
      topRing[next],
      midRing[next],
    );
  }
  builder.addPolygon([...topRing].reverse());
  builder.addPolygon(bottomRing);
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
    "rigging-rope",
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

  addShipRails(parts, 6.2, 1.35, 0.99);
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

  addBillowedSail(
    parts["sail-canvas"],
    vec3(0.08, 4.82, -0.92),
    vec3(1.86, 3.42, -0.84),
    vec3(1.54, 1.62, -0.74),
    vec3(0.02, 2.08, -0.86),
  );
  addBillowedSail(
    parts["sail-canvas"],
    vec3(-0.05, 3.86, -2.96),
    vec3(1.15, 2.46, -2.86),
    vec3(0.96, 1.12, -2.78),
    vec3(-0.08, 1.56, -2.92),
  );
  addBox(parts["metal-dark"], vec3(-0.96, 0.78, 1.26), vec3(0.96, 0.88, 1.44));
  for (const z of [-0.92, -2.92]) {
    const height = z === -0.92 ? 5.9 : 4.5;
    for (const side of [-1, 1])
      for (const offset of [-0.65, 0.65]) {
        addRope(
          parts["rigging-rope"],
          vec3(0, height, z),
          vec3(side * 1.28, 1.1, z + offset),
          0.013,
          0.08,
        );
      }
    addRope(
      parts["rigging-rope"],
      vec3(0, height, z),
      vec3(0, 1.5, 4.8),
      0.018,
      0.16,
    );
  }

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
      {
        name: "brigantine-hull",
        primitives: [
          parts["painted-hull"],
          parts["deck-plank"],
          parts["hull-trim"],
        ],
      },
      {
        name: "brigantine-rig",
        primitives: [
          parts["mast-wood"],
          parts["sail-canvas"],
          parts["metal-dark"],
          parts["rigging-rope"],
        ],
      },
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

  addBox(
    parts["paint-white"],
    vec3(-0.58, 0.72, -0.72),
    vec3(0.58, 1.52, 0.82),
  );
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
  addBox(
    parts["window-glass"],
    vec3(-0.64, 1.02, -0.28),
    vec3(-0.5, 1.28, 0.18),
  );
  addBox(parts["window-glass"], vec3(0.5, 1.02, -0.28), vec3(0.64, 1.28, 0.18));
  addCylinder(parts["metal-dark"], {
    center: vec3(0, 1.86, -0.3),
    height: 1.28,
    radiusTop: 0.05,
    radiusBottom: 0.08,
    radialSegments: 18,
  });
  addBox(parts["metal-dark"], vec3(-0.9, 0.76, 0.98), vec3(0.9, 0.88, 1.12));
  addShipRails(parts, 4.5, 0.78, 0.68);
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
      {
        name: "cutter-hull",
        primitives: [parts["painted-hull"], parts["deck-plank"]],
      },
      {
        name: "cutter-cabin",
        primitives: [
          parts["paint-white"],
          parts["window-glass"],
          parts["metal-dark"],
          parts["warm-glass"],
        ],
      },
    ],
  };
}

function createLighthouseAsset() {
  const railing = new PrimitiveBuilder("metal-dark");
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
    radiusTop: 1.19,
    radiusBottom: 1.27,
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
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2,
      next = ((i + 1) / 20) * Math.PI * 2;
    const bottom = vec3(Math.cos(angle) * 1.31, 10.5, Math.sin(angle) * 1.31);
    const top = vec3(bottom[0], 11.22, bottom[2]);
    addRope(railing, bottom, top, 0.028);
    addRope(
      railing,
      top,
      vec3(Math.cos(next) * 1.31, 11.22, Math.sin(next) * 1.31),
      0.028,
    );
  }

  return {
    name: "lighthouse",
    physics: null,
    children: [
      {
        name: "lighthouse-tower",
        primitives: [
          parts["paint-white"],
          parts["paint-red"],
          parts.stone,
          parts["metal-dark"],
          parts["warm-glass"],
        ],
      },
      { name: "lighthouse-gallery-rail", primitives: [railing] },
      {
        name: "lighthouse-keeper-house",
        primitives: [parts["roof-tiles"], parts["window-glass"]],
      },
    ],
  };
}

// These are asset-authoring helpers, executed at generation time only.
function addRoofSlate(builder, minX, maxX, minZ, maxZ, heightAtX) {
  const top = [
    vec3(minX, heightAtX(minX), minZ),
    vec3(minX, heightAtX(minX), maxZ),
    vec3(maxX, heightAtX(maxX), maxZ),
    vec3(maxX, heightAtX(maxX), minZ),
  ];
  const bottom = top.map(([x, y, z]) => vec3(x, y - 0.024, z));
  builder.addQuad(...top);
  builder.addQuad(...bottom.toReversed());
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    builder.addQuad(top[i], bottom[i], bottom[next], top[next]);
  }
}

function createHarborConstructionDetail() {
  const boards = new PrimitiveBuilder("jetty-timber");
  const supports = new PrimitiveBuilder("jetty-timber");
  const masonry = createPrimitiveMap([
    "quay-stone",
    "quay-stone-warm",
    "quay-stone-wet",
  ]);
  const roof = createPrimitiveMap(["roof-slate", "roof-slate-weathered"]);
  const joinery = createPrimitiveMap([
    "warehouse-timber",
    "quay-stone",
    "dock-metal",
  ]);
  const fittings = createPrimitiveMap(["dock-metal", "rigging-rope"]);

  // The gap is a real opening, with transverse beams visible below it.
  for (const [start, end, halfWidth] of [
    [-1.7, 3.6, 1.1],
    [3.6, 7.4, 1.55],
  ]) {
    const count = Math.ceil((end - start) / 0.23);
    const pitch = (end - start) / count;
    for (let i = 0; i < count; i++) {
      const x = start + i * pitch;
      addBox(
        boards,
        vec3(x + 0.012, 0.22, -halfWidth),
        vec3(x + pitch - 0.012, 0.42 + pseudoRandom(i + 70) * 0.012, halfWidth),
      );
    }
    for (const z of [-halfWidth + 0.18, halfWidth - 0.18]) {
      addBox(supports, vec3(start, 0.03, z - 0.08), vec3(end, 0.22, z + 0.08));
    }
    for (let x = start + 0.3; x < end; x += 1.4) {
      for (const z of [-halfWidth + 0.18, halfWidth - 0.18]) {
        addCylinder(supports, {
          center: vec3(x, -0.46, z),
          height: 1.68,
          radiusTop: 0.105,
          radiusBottom: 0.14,
          radialSegments: 10,
        });
      }
      addRope(
        supports,
        vec3(x, -0.8, -halfWidth + 0.18),
        vec3(x, 0.13, halfWidth - 0.18),
        0.065,
      );
    }
  }

  // Staggered wall courses, darker below the tidal line, with a projecting coping.
  for (let row = 0; row < 4; row++) {
    const y = -0.88 + row * 0.29;
    for (const z of [-2.42, 2.1]) {
      for (let column = 0; column < 12; column++) {
        const x = -7.2 + column * 0.74 - (row % 2) * 0.37;
        const left = Math.max(-7.2, x),
          right = Math.min(1.2, x + 0.715);
        if (right <= left) continue;
        const material =
          row < 2
            ? "quay-stone-wet"
            : (column + row) % 3
              ? "quay-stone"
              : "quay-stone-warm";
        addBox(
          masonry[material],
          vec3(left, y, z),
          vec3(right, y + 0.265, z + 0.32),
        );
      }
    }
    for (const x of [-7.24, 1.08])
      for (let column = 0; column < 7; column++) {
        const z = -2.1 + column * 0.6;
        addBox(
          masonry[row < 2 ? "quay-stone-wet" : "quay-stone"],
          vec3(x, y, z),
          vec3(x + 0.32, y + 0.265, z + 0.575),
        );
      }
  }
  for (let x = -7.26; x < 1.16; x += 0.66) {
    for (const z of [-2.48, 2.03])
      addBox(
        masonry["quay-stone-warm"],
        vec3(x, 0.26, z),
        vec3(Math.min(1.34, x + 0.64), 0.38, z + 0.43),
      );
  }
  for (const x of [-7.3, 1.05])
    for (let z = -2.04; z < 2; z += 0.66) {
      addBox(
        masonry["quay-stone-warm"],
        vec3(x, 0.26, z),
        vec3(x + 0.38, 0.38, Math.min(2.03, z + 0.64)),
      );
    }

  // Thin, overlapping slates on both slopes, retaining the closed original roof below.
  const ridge = -4.25;
  const heightAtX = (x) => 3.29 - Math.abs(x - ridge) * (0.86 / 2.35);
  for (let side = 0; side < 2; side++)
    for (let row = 0; row < 8; row++) {
      const start = (row / 8) * 2.35,
        end = Math.min(2.35, ((row + 1) / 8) * 2.35 + 0.055);
      const minX = side ? ridge + start : ridge - end;
      const maxX = side ? ridge + end : ridge - start;
      for (let column = 0; column < 9; column++) {
        const minZ = -1.95 + column * (3.5 / 9);
        const material =
          (column + row * 3 + side) % 5 === 0
            ? "roof-slate-weathered"
            : "roof-slate";
        addRoofSlate(
          roof[material],
          minX,
          maxX,
          minZ + 0.006,
          minZ + 3.5 / 9 - 0.006,
          (x) => heightAtX(x) + row * 0.005,
        );
      }
    }
  for (let z = -1.95; z < 1.5; z += 0.35) {
    addRoofSlate(
      roof["roof-slate-weathered"],
      ridge - 0.105,
      ridge + 0.105,
      z,
      Math.min(1.55, z + 0.34),
      (x) => 3.35 - Math.abs(x - ridge) * 0.42,
    );
  }

  // Frames and mullions sit proud of the opaque dark glazing; no fake transmission.
  for (const [left, right] of [
    [-5.84, -4.9],
    [-3.58, -2.66],
  ]) {
    for (const x of [left - 0.06, right - 0.01, (left + right) / 2 - 0.025]) {
      addBox(
        joinery["warehouse-timber"],
        vec3(x, 1.01, 1.45),
        vec3(x + 0.065, 1.84, 1.52),
      );
    }
    for (const y of [1.01, 1.42, 1.78])
      addBox(
        joinery["warehouse-timber"],
        vec3(left - 0.06, y, 1.45),
        vec3(right + 0.06, y + 0.055, 1.52),
      );
    addBox(
      joinery["quay-stone"],
      vec3(left - 0.12, 0.94, 1.28),
      vec3(right + 0.12, 1.02, 1.6),
    );
    addBox(
      joinery["quay-stone"],
      vec3(left - 0.12, 1.85, 1.28),
      vec3(right + 0.12, 1.98, 1.47),
    );
  }
  for (let plank = 0; plank < 8; plank++) {
    const x = -4.68 + plank * 0.115;
    addBox(
      joinery["warehouse-timber"],
      vec3(x, 0.36, 1.305),
      vec3(x + 0.108, 1.91, 1.4),
    );
  }
  for (const x of [-4.76, -3.76])
    addBox(
      joinery["quay-stone"],
      vec3(x, 0.32, 1.3),
      vec3(x + 0.09, 2.02, 1.49),
    );
  addBox(
    joinery["quay-stone"],
    vec3(-4.76, 2.02, 1.3),
    vec3(-3.67, 2.16, 1.49),
  );
  for (const y of [0.7, 1.6])
    addBox(
      joinery["dock-metal"],
      vec3(-4.65, y, 1.402),
      vec3(-3.82, y + 0.045, 1.426),
    );
  addBox(
    joinery["dock-metal"],
    vec3(-4.08, 1.05, 1.42),
    vec3(-4.03, 1.21, 1.48),
  );
  // Chimney, cap, and gutters supply architectural scale and cast real shadows.
  addBox(
    joinery["quay-stone"],
    vec3(-5.48, 2.65, -1.35),
    vec3(-5.03, 3.56, -0.88),
  );
  addBox(
    joinery["quay-stone"],
    vec3(-5.56, 3.52, -1.43),
    vec3(-4.95, 3.65, -0.8),
  );
  addCylinder(joinery["dock-metal"], {
    center: vec3(-5.25, 3.77, -1.1),
    height: 0.25,
    radiusTop: 0.095,
    radialSegments: 12,
  });
  for (const x of [-6.59, -1.91])
    addRope(
      joinery["dock-metal"],
      vec3(x, 2.38, -1.93),
      vec3(x, 2.38, 1.53),
      0.035,
    );

  for (const x of [0.7, 3.8, 7.05])
    for (const side of [-1, 1]) {
      const z = side * (x > 3.6 ? 1.3 : 0.87);
      addCylinder(fittings["dock-metal"], {
        center: vec3(x, 0.64, z),
        height: 0.42,
        radiusTop: 0.085,
        radialSegments: 12,
      });
      addRope(
        fittings["dock-metal"],
        vec3(x - 0.16, 0.78, z),
        vec3(x + 0.16, 0.78, z),
        0.055,
      );
      for (let turn = 0; turn < 3; turn++)
        for (let step = 0; step < 24; step++) {
          const radius = 0.19 + turn * 0.036;
          const point = (angle) =>
            vec3(
              x + Math.cos(angle) * radius,
              0.46,
              z + Math.sin(angle) * radius,
            );
          addRope(
            fittings["rigging-rope"],
            point((step * Math.PI) / 12),
            point(((step + 1) * Math.PI) / 12),
            0.014,
          );
        }
    }
  // A ladder connects the berth to the pier rather than ending at the water surface.
  for (const x of [6.23, 6.65])
    addRope(
      fittings["dock-metal"],
      vec3(x, -0.95, 1.65),
      vec3(x, 0.8, 1.65),
      0.032,
    );
  for (let y = -0.8; y < 0.5; y += 0.24)
    addRope(
      fittings["dock-metal"],
      vec3(6.23, y, 1.65),
      vec3(6.65, y, 1.65),
      0.026,
    );
  return [
    { name: "harbor-dock-pier-boards", primitives: [boards] },
    { name: "harbor-dock-pier-supports", primitives: [supports] },
    { name: "harbor-dock-quay-masonry", primitives: Object.values(masonry) },
    { name: "harbor-dock-roof-courses", primitives: Object.values(roof) },
    {
      name: "harbor-dock-warehouse-joinery",
      primitives: Object.values(joinery),
    },
    {
      name: "harbor-dock-mooring-fittings",
      primitives: Object.values(fittings),
    },
  ];
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
    "warehouse-glazing",
  ]);

  addBox(parts.concrete, vec3(-7.2, -0.9, -2.4), vec3(1.2, 0.3, 2.2));
  const detail = createHarborConstructionDetail();

  addBox(
    parts["warehouse-plaster"],
    vec3(-6.3, 0.3, -1.7),
    vec3(-2.2, 2.4, 1.3),
  );
  addGabledRoof(parts["roof-tiles"], {
    minX: -6.6,
    maxX: -1.9,
    minZ: -1.95,
    maxZ: 1.55,
    eaveY: 2.4,
    ridgeY: 3.26,
    gableBuilder: parts["warehouse-plaster"],
  });
  addBox(
    parts["warehouse-glazing"],
    vec3(-5.84, 1.06, 1.32),
    vec3(-4.9, 1.78, 1.46),
  );
  addBox(
    parts["warehouse-glazing"],
    vec3(-3.58, 1.06, 1.32),
    vec3(-2.66, 1.78, 1.46),
  );
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
      ...detail,
      {
        name: "harbor-dock-main",
        primitives: [
          parts.concrete,
          parts["jetty-timber"],
          parts["dock-metal"],
          parts["crate-wood"],
        ],
      },
      {
        name: "harbor-dock-warehouse",
        translation: [0, 0, 0],
        primitives: [
          parts["warehouse-plaster"],
          parts["roof-tiles"],
          parts["warehouse-glazing"],
          parts["warm-glass"],
        ],
      },
    ],
  };
}

function createShorelineAsset() {
  const parts = createPrimitiveMap([
    "shore-sand",
    "wet-rock",
    "stone",
    "seaweed",
    "driftwood",
    "foam-stain",
    "headland-grass",
  ]);
  // A continuous coastal headland replaces the old isolated strip behind the quay.
  const landHeight = (x, z) => {
    const inland = Math.max(0, (-z - 2) / 10);
    return (
      -0.12 +
      Math.max(0, 2 - z) * 0.08 +
      inland * (1.5 + 0.75 * Math.sin(x * 0.13) + 0.45 * Math.cos(z * 0.2)) +
      Math.min(1, inland) * Math.sin(x * 0.73 + Math.cos(z * 0.48)) * 0.24
    );
  };
  for (let z = -38; z < 2; z += 1.5)
    for (let x = -34; x < 28; x += 1.5) {
      const a = vec3(x, landHeight(x, z), z),
        b = vec3(x + 1.5, landHeight(x + 1.5, z), z);
      const c = vec3(x + 1.5, landHeight(x + 1.5, z + 1.5), z + 1.5),
        d = vec3(x, landHeight(x, z + 1.5), z + 1.5);
      parts["headland-grass"].addQuad(d, c, b, a);
    }

  addTerrainStrip(parts["shore-sand"], [
    { leftX: -9.8, rightX: 8.8, y: -0.42, camber: 0.04, z: 4.1 },
    { leftX: -10.4, rightX: 8.2, y: -0.18, camber: 0.08, z: 2.7 },
    { leftX: -9.3, rightX: 7.6, y: 0.14, camber: 0.12, z: 1.0 },
    { leftX: -8.4, rightX: 6.4, y: 0.48, camber: 0.18, z: -0.92 },
    { leftX: -7.1, rightX: 4.9, y: 0.82, camber: 0.2, z: -2.7 },
  ]);

  addTerrainStrip(parts["foam-stain"], [
    { leftX: -9.2, rightX: 7.8, y: -0.3, camber: 0.02, z: 3.4 },
    { leftX: -8.7, rightX: 7.4, y: -0.2, camber: 0.03, z: 2.84 },
    { leftX: -7.6, rightX: 6.2, y: -0.08, camber: 0.04, z: 2.22 },
  ]);

  addBox(parts.stone, vec3(-9.5, 0.28, -2.92), vec3(5.8, 1.12, -2.28));
  addBox(parts.stone, vec3(-9.2, 0.08, -2.22), vec3(5.45, 0.54, -1.78));
  addBox(parts.stone, vec3(-8.88, -0.1, -1.72), vec3(5.1, 0.18, -1.38));

  const rockSpecs = [
    { center: [-8.4, -0.32, 2.5], radius: 0.78, height: 0.68, seed: 4 },
    { center: [-7.2, -0.2, 1.64], radius: 0.54, height: 0.58, seed: 8 },
    { center: [-5.8, -0.22, 2.95], radius: 0.62, height: 0.62, seed: 12 },
    { center: [-4.2, 0.02, 0.42], radius: 0.96, height: 0.88, seed: 16 },
    { center: [-2.7, -0.34, 2.1], radius: 0.48, height: 0.48, seed: 20 },
    { center: [-1.2, -0.1, 1.18], radius: 0.74, height: 0.7, seed: 24 },
    { center: [0.8, -0.28, 2.74], radius: 0.66, height: 0.54, seed: 28 },
    { center: [2.4, -0.06, 0.92], radius: 0.86, height: 0.78, seed: 32 },
    { center: [4.5, -0.24, 2.36], radius: 0.58, height: 0.54, seed: 36 },
    { center: [6.4, -0.36, 2.92], radius: 0.48, height: 0.42, seed: 40 },
  ];
  for (const rock of rockSpecs) {
    addIrregularRock(parts["wet-rock"], {
      center: vec3(...rock.center),
      radius: rock.radius,
      height: rock.height,
      radialSegments: 9,
      seed: rock.seed,
    });
  }

  for (const [x, z, length, rotation] of [
    [-6.8, 2.04, 1.18, -0.24],
    [-3.6, 2.52, 0.88, 0.18],
    [1.4, 2.16, 1.06, -0.08],
    [5.2, 2.64, 0.82, 0.26],
  ]) {
    const halfLength = length * 0.5;
    const cosine = Math.cos(rotation);
    const sine = Math.sin(rotation);
    const dx = cosine * halfLength;
    const dz = sine * halfLength;
    const widthX = -sine * 0.045;
    const widthZ = cosine * 0.045;
    parts.seaweed.addQuad(
      vec3(x - dx - widthX, -0.26, z - dz - widthZ),
      vec3(x + dx - widthX, -0.25, z + dz - widthZ),
      vec3(x + dx + widthX, -0.22, z + dz + widthZ),
      vec3(x - dx + widthX, -0.23, z - dz + widthZ),
    );
  }

  addCylinder(parts.driftwood, {
    center: vec3(-2.2, 0.1, 1.72),
    height: 1.72,
    radiusTop: 0.08,
    radiusBottom: 0.12,
    radialSegments: 10,
  });
  addBox(parts.driftwood, vec3(-2.96, 0.34, 1.57), vec3(-1.52, 0.48, 1.78));
  addCylinder(parts.driftwood, {
    center: vec3(3.84, 0.04, 1.9),
    height: 1.16,
    radiusTop: 0.06,
    radiusBottom: 0.1,
    radialSegments: 10,
  });

  return {
    name: "shoreline",
    physics: null,
    children: [
      { name: "shoreline-headland", primitives: [parts["headland-grass"]] },
      {
        name: "shoreline-beach",
        primitives: [parts["shore-sand"], parts["foam-stain"], parts.seaweed],
      },
      { name: "shoreline-rocks", primitives: [parts["wet-rock"]] },
      { name: "shoreline-breakwater", primitives: [parts.stone] },
      { name: "shoreline-detail", primitives: [parts.driftwood] },
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
  const min = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const max = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
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
      ...(assetDefinition.physics
        ? { extras: { physics: assetDefinition.physics } }
        : {}),
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
  const materialIndices = new Map(
    materialOrder.map((name, index) => [name, index]),
  );
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
    ...(MATERIAL_LIBRARY[name].baseColorFactor[3] < 1
      ? { alphaMode: "BLEND" }
      : {}),
  }));

  const bufferChunks = [];
  const bufferViews = [];
  const accessors = [];

  function appendAccessor(typedArray, options) {
    const buffer = Buffer.from(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength,
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
      ...(Array.isArray(child.translation)
        ? { translation: child.translation }
        : {}),
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
    `export const INLINE_SHOWCASE_ASSET_URLS = Object.freeze({\n  ${JSON.stringify(assetName)}: ${JSON.stringify(inlineUrl)},\n});\n`,
  );
}

export function createShowcaseAssets() {
  return [
    ["brigantine.gltf", compileAsset(createBrigantineAsset())],
    ["cutter.gltf", compileAsset(createCutterAsset())],
    ["lighthouse.gltf", compileAsset(createLighthouseAsset())],
    ["harbor-dock.gltf", compileAsset(createHarborDockAsset())],
    ["shoreline.gltf", compileAsset(createShorelineAsset())],
  ];
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const assets = createShowcaseAssets();
  for (const [fileName, contents] of assets) {
    writeAsset(fileName, `${contents}\n`);
  }

  writeInlineModule("brigantine", `${assets[0][1]}\n`);
}

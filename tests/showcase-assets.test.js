import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const assetNames = [
  "brigantine.gltf",
  "cutter.gltf",
  "lighthouse.gltf",
  "harbor-dock.gltf",
];

const accessorTypeSizes = Object.freeze({
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
});

function loadAssetDocument(assetName) {
  return JSON.parse(readFileSync(path.join(repoRoot, "assets", assetName), "utf8"));
}

function decodeDataUri(uri) {
  const match = /^data:.*?;base64,(.+)$/i.exec(uri);
  assert.ok(match, "showcase assets should embed their binary buffer as a data URI");
  return Buffer.from(match[1], "base64");
}

function getComponentArray(componentType, buffer, byteOffset, count) {
  switch (componentType) {
    case 5121:
      return new Uint8Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
    case 5123:
      return new Uint16Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
    case 5125:
      return new Uint32Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
    case 5126:
      return new Float32Array(buffer.buffer, buffer.byteOffset + byteOffset, count);
    default:
      throw new Error(`Unsupported component type ${componentType}.`);
  }
}

function readAccessor(document, buffers, accessorIndex) {
  const accessor = document.accessors[accessorIndex];
  const bufferView = document.bufferViews[accessor.bufferView];
  const componentCount = accessorTypeSizes[accessor.type];
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);

  return Array.from(
    getComponentArray(
      accessor.componentType,
      buffers[bufferView.buffer],
      byteOffset,
      accessor.count * componentCount
    )
  );
}

function getPrimitiveGeometry(document, buffers, primitive) {
  return {
    positions: readAccessor(document, buffers, primitive.attributes.POSITION),
    normals: readAccessor(document, buffers, primitive.attributes.NORMAL),
    indices: readAccessor(document, buffers, primitive.indices),
    materialName: document.materials[primitive.material].name,
  };
}

function getVertex(values, vertexIndex) {
  const offset = vertexIndex * 3;
  return [values[offset], values[offset + 1], values[offset + 2]];
}

function subtractVec3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function crossVec3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dotVec3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalizeVec3(a) {
  const length = Math.hypot(a[0], a[1], a[2]);
  assert.ok(length > 0.000001, "asset geometry should not contain degenerate normals");
  return [a[0] / length, a[1] / length, a[2] / length];
}

function getFaceNormal(a, b, c) {
  return normalizeVec3(crossVec3(subtractVec3(b, a), subtractVec3(c, a)));
}

function getCentroid(points) {
  return [
    (points[0][0] + points[1][0] + points[2][0]) / 3,
    (points[0][1] + points[1][1] + points[2][1]) / 3,
    (points[0][2] + points[1][2] + points[2][2]) / 3,
  ];
}

function forEachTriangle(geometry, callback) {
  for (let index = 0; index < geometry.indices.length; index += 3) {
    const vertexIndices = [
      geometry.indices[index],
      geometry.indices[index + 1],
      geometry.indices[index + 2],
    ];
    const points = vertexIndices.map((vertexIndex) =>
      getVertex(geometry.positions, vertexIndex)
    );
    const normals = vertexIndices.map((vertexIndex) =>
      normalizeVec3(getVertex(geometry.normals, vertexIndex))
    );

    callback({
      points,
      normals,
      faceNormal: getFaceNormal(...points),
      triangleIndex: index / 3,
    });
  }
}

test("generated showcase assets keep normals aligned to triangle winding", () => {
  for (const assetName of assetNames) {
    const document = loadAssetDocument(assetName);
    const buffers = document.buffers.map((buffer) => decodeDataUri(buffer.uri));

    for (const mesh of document.meshes) {
      for (const primitive of mesh.primitives) {
        const geometry = getPrimitiveGeometry(document, buffers, primitive);

        forEachTriangle(geometry, ({ faceNormal, normals }) => {
          for (const normal of normals) {
            assert.ok(
              dotVec3(faceNormal, normal) > 0.82,
              `${assetName}/${mesh.name}/${geometry.materialName} has normals that disagree with face winding`
            );
          }
        });
      }
    }
  }
});

test("lighthouse cylindrical bands use outward-facing side winding", () => {
  const document = loadAssetDocument("lighthouse.gltf");
  const buffers = document.buffers.map((buffer) => decodeDataUri(buffer.uri));
  const mesh = document.meshes.find((candidate) => candidate.name === "lighthouse-tower");
  assert.ok(mesh, "lighthouse tower mesh should be present");

  for (const materialName of ["paint-white", "paint-red", "metal-dark", "warm-glass"]) {
    const primitive = mesh.primitives.find(
      (candidate) => document.materials[candidate.material].name === materialName
    );
    assert.ok(primitive, `lighthouse tower should include ${materialName}`);

    const geometry = getPrimitiveGeometry(document, buffers, primitive);
    let checkedSides = 0;

    forEachTriangle(geometry, ({ points, faceNormal }) => {
      if (Math.abs(faceNormal[1]) > 0.45) {
        return;
      }

      const centroid = [
        (points[0][0] + points[1][0] + points[2][0]) / 3,
        0,
        (points[0][2] + points[1][2] + points[2][2]) / 3,
      ];
      const radialLength = Math.hypot(centroid[0], centroid[2]);

      if (radialLength <= 0.000001) {
        return;
      }

      const outward = [centroid[0] / radialLength, 0, centroid[2] / radialLength];
      checkedSides += 1;
      assert.ok(
        dotVec3(faceNormal, outward) > 0.95,
        `lighthouse tower ${materialName} side face should point outward`
      );
    });

    assert.ok(checkedSides > 0, `${materialName} should expose cylindrical side faces`);
  }
});

test("lighthouse cylindrical bands expose smooth radial side normals", () => {
  const document = loadAssetDocument("lighthouse.gltf");
  const buffers = document.buffers.map((buffer) => decodeDataUri(buffer.uri));
  const mesh = document.meshes.find((candidate) => candidate.name === "lighthouse-tower");
  assert.ok(mesh, "lighthouse tower mesh should be present");

  for (const materialName of ["paint-white", "paint-red", "metal-dark", "warm-glass"]) {
    const primitive = mesh.primitives.find(
      (candidate) => document.materials[candidate.material].name === materialName
    );
    assert.ok(primitive, `lighthouse tower should include ${materialName}`);

    const geometry = getPrimitiveGeometry(document, buffers, primitive);
    let checkedSides = 0;
    let smoothSides = 0;

    forEachTriangle(geometry, ({ points, normals, faceNormal }) => {
      if (Math.abs(faceNormal[1]) > 0.45) {
        return;
      }

      const radialNormals = points.map((point) => {
        const radialLength = Math.hypot(point[0], point[2]);
        return radialLength > 0.000001
          ? [point[0] / radialLength, 0, point[2] / radialLength]
          : null;
      });

      if (radialNormals.some((normal) => normal === null)) {
        return;
      }

      checkedSides += 1;
      for (let index = 0; index < normals.length; index += 1) {
        assert.ok(
          dotVec3(normals[index], radialNormals[index]) > 0.88,
          `lighthouse tower ${materialName} side normal should follow vertex radial direction`
        );
      }

      const normalSpread = Math.max(
        1 - dotVec3(normals[0], normals[1]),
        1 - dotVec3(normals[1], normals[2]),
        1 - dotVec3(normals[0], normals[2])
      );
      if (normalSpread > 0.001) {
        smoothSides += 1;
      }
    });

    assert.ok(checkedSides > 0, `${materialName} should expose cylindrical side faces`);
    assert.ok(smoothSides > 0, `${materialName} should use per-vertex side normals`);
  }
});

test("ship hull deck surfaces use upward winding for single-sided rendering", () => {
  const hullDeckTriangleCounts = Object.freeze({
    "brigantine.gltf": 24,
    "cutter.gltf": 16,
  });

  for (const [assetName, triangleCount] of Object.entries(hullDeckTriangleCounts)) {
    const document = loadAssetDocument(assetName);
    const buffers = document.buffers.map((buffer) => decodeDataUri(buffer.uri));
    const mesh = document.meshes.find((candidate) => candidate.name.endsWith("-hull"));
    assert.ok(mesh, `${assetName} should include a hull mesh`);
    const primitive = mesh.primitives.find(
      (candidate) => document.materials[candidate.material].name === "deck-plank"
    );
    assert.ok(primitive, `${assetName} hull mesh should include deck planking`);

    const geometry = getPrimitiveGeometry(document, buffers, primitive);
    let checkedTriangles = 0;

    forEachTriangle(geometry, ({ faceNormal, triangleIndex }) => {
      if (triangleIndex >= triangleCount) {
        return;
      }

      checkedTriangles += 1;
      assert.ok(
        faceNormal[1] > 0.82,
        `${assetName}/${mesh.name}/deck-plank triangle ${triangleIndex} should face upward for single-sided rendering`
      );
    });

    assert.equal(
      checkedTriangles,
      triangleCount,
      `${assetName} should expose the expected hull deck triangle count`
    );
  }
});

test("ship painted hull sides and caps use outward winding for single-sided rendering", () => {
  for (const assetName of ["brigantine.gltf", "cutter.gltf"]) {
    const document = loadAssetDocument(assetName);
    const buffers = document.buffers.map((buffer) => decodeDataUri(buffer.uri));
    const mesh = document.meshes.find((candidate) => candidate.name.endsWith("-hull"));
    assert.ok(mesh, `${assetName} should include a hull mesh`);
    const primitive = mesh.primitives.find(
      (candidate) => document.materials[candidate.material].name === "painted-hull"
    );
    assert.ok(primitive, `${assetName} hull mesh should include painted hull sides`);

    const geometry = getPrimitiveGeometry(document, buffers, primitive);
    const zValues = [];
    for (let index = 2; index < geometry.positions.length; index += 3) {
      zValues.push(geometry.positions[index]);
    }
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);
    let checkedSides = 0;
    let checkedCaps = 0;

    forEachTriangle(geometry, ({ points, faceNormal, triangleIndex }) => {
      const centroid = getCentroid(points);

      if (Math.abs(faceNormal[0]) >= Math.abs(faceNormal[2]) && Math.abs(centroid[0]) > 0.04) {
        const expectedSideNormal = [Math.sign(centroid[0]), 0, 0];
        checkedSides += 1;
        assert.ok(
          dotVec3(faceNormal, expectedSideNormal) > 0.4,
          `${assetName}/${mesh.name}/painted-hull triangle ${triangleIndex} should face away from the centerline`
        );
        return;
      }

      if (Math.abs(faceNormal[2]) > 0.75 && (centroid[2] <= minZ + 0.001 || centroid[2] >= maxZ - 0.001)) {
        const expectedCapNormal = [0, 0, centroid[2] >= maxZ - 0.001 ? 1 : -1];
        checkedCaps += 1;
        assert.ok(
          dotVec3(faceNormal, expectedCapNormal) > 0.95,
          `${assetName}/${mesh.name}/painted-hull triangle ${triangleIndex} should cap the hull outward`
        );
      }
    });

    assert.ok(checkedSides > 0, `${assetName} should expose outward hull side faces`);
    assert.ok(checkedCaps > 0, `${assetName} should expose outward hull cap faces`);
  }
});

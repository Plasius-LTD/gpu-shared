const PVOX_CONTENT_TYPE = "application/vnd.plasius.pvox";
const DEFAULT_MAXIMUM_PVOX_BYTES = 4_521_984;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

function isNumericArray(value) {
  return Array.isArray(value) || ArrayBuffer.isView(value);
}

async function readBoundedBytes(response, maximumBytes) {
  const contentLength = response.headers?.get?.("content-length");
  if (contentLength !== null && contentLength !== undefined) {
    if (!/^\d{1,12}$/u.test(contentLength)) {
      throw new Error("PVOX response Content-Length is invalid.");
    }
    if (Number(contentLength) > maximumBytes) {
      throw new Error("PVOX response exceeds the bounded artifact profile.");
    }
  }
  const reader = response.body?.getReader?.();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maximumBytes) {
      throw new Error("PVOX response exceeds the bounded artifact profile.");
    }
    return bytes;
  }
  const chunks = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!(value instanceof Uint8Array)) {
      await reader.cancel();
      throw new Error("PVOX response contains an invalid byte stream.");
    }
    byteLength += value.byteLength;
    if (byteLength > maximumBytes) {
      await reader.cancel();
      throw new Error("PVOX response exceeds the bounded artifact profile.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function surfaceMaterial(surface) {
  const [r, g, b, a] = surface.baseColor;
  const [emissiveR, emissiveG, emissiveB] = surface.emission;
  return Object.freeze({
    name: `pvox-surface-${surface.surfaceIndex}`,
    color: Object.freeze({ r, g, b, a }),
    roughness: surface.roughness,
    metallic: surface.metallic,
    specular: surface.specular,
    emissive: Object.freeze({
      r: emissiveR,
      g: emissiveG,
      b: emissiveB,
      a: 1,
    }),
  });
}

function compactSurfacePrimitives(decoded, surfaceMesh) {
  if (
    surfaceMesh.representation !== "pvox-derived-surface-cache"
    || surfaceMesh.sourceArtifactSha256 !== decoded.artifactSha256
    || !isNumericArray(surfaceMesh.positions)
    || !isNumericArray(surfaceMesh.normals)
    || !isNumericArray(surfaceMesh.colors)
    || !isNumericArray(surfaceMesh.surfaceIndices)
    || !isNumericArray(surfaceMesh.indices)
    || surfaceMesh.positions.length % 3 !== 0
    || surfaceMesh.normals.length !== surfaceMesh.positions.length
    || surfaceMesh.colors.length / 4 !== surfaceMesh.positions.length / 3
    || surfaceMesh.surfaceIndices.length !== surfaceMesh.positions.length / 3
    || surfaceMesh.indices.length % 3 !== 0
  ) {
    throw new Error("PVOX surface projection is invalid.");
  }
  const surfaceByIndex = new Map(decoded.surfaces.map((surface) => [
    surface.surfaceIndex,
    surface,
  ]));
  const groups = new Map();
  for (let triangleOffset = 0; triangleOffset < surfaceMesh.indices.length; triangleOffset += 3) {
    const triangleIndices = [
      surfaceMesh.indices[triangleOffset],
      surfaceMesh.indices[triangleOffset + 1],
      surfaceMesh.indices[triangleOffset + 2],
    ];
    if (triangleIndices.some((index) => !Number.isSafeInteger(index)
      || index < 0 || index >= surfaceMesh.surfaceIndices.length)) {
      throw new Error("PVOX surface projection contains an invalid triangle index.");
    }
    const surfaceIndex = surfaceMesh.surfaceIndices[triangleIndices[0]];
    if (
      !Number.isSafeInteger(surfaceIndex)
      || !surfaceByIndex.has(surfaceIndex)
      || triangleIndices.some((index) => surfaceMesh.surfaceIndices[index] !== surfaceIndex)
    ) {
      throw new Error("PVOX surface projection crosses a surface-property boundary.");
    }
    let group = groups.get(surfaceIndex);
    if (!group) {
      group = {
        surfaceIndex,
        vertexMap: new Map(),
        positions: [],
        normals: [],
        colors: [],
        indices: [],
      };
      groups.set(surfaceIndex, group);
    }
    for (const sourceIndex of triangleIndices) {
      let targetIndex = group.vertexMap.get(sourceIndex);
      if (targetIndex === undefined) {
        targetIndex = group.vertexMap.size;
        group.vertexMap.set(sourceIndex, targetIndex);
        group.positions.push(
          surfaceMesh.positions[sourceIndex * 3],
          surfaceMesh.positions[sourceIndex * 3 + 1],
          surfaceMesh.positions[sourceIndex * 3 + 2],
        );
        group.normals.push(
          surfaceMesh.normals[sourceIndex * 3],
          surfaceMesh.normals[sourceIndex * 3 + 1],
          surfaceMesh.normals[sourceIndex * 3 + 2],
        );
        group.colors.push(
          surfaceMesh.colors[sourceIndex * 4],
          surfaceMesh.colors[sourceIndex * 4 + 1],
          surfaceMesh.colors[sourceIndex * 4 + 2],
          surfaceMesh.colors[sourceIndex * 4 + 3],
        );
      }
      group.indices.push(targetIndex);
    }
  }
  return Object.freeze([...groups.values()]
    .sort((left, right) => left.surfaceIndex - right.surfaceIndex)
    .map((group) => {
      const surface = surfaceByIndex.get(group.surfaceIndex);
      if (!surface) throw new Error("PVOX surface projection references an unknown surface.");
      return Object.freeze({
        name: `pvox-surface-${group.surfaceIndex}`,
        positions: Object.freeze(group.positions),
        indices: Object.freeze(group.indices),
        normals: Object.freeze(group.normals),
        colors: Object.freeze(group.colors),
        material: surfaceMaterial(surface),
        bounds: Object.freeze({
          min: Object.freeze([...surfaceMesh.bounds.minimum]),
          max: Object.freeze([...surfaceMesh.bounds.maximum]),
        }),
      });
    }));
}

/** Load, independently validate, and derive a disposable Product Studio PVOX surface cache. */
export async function loadPvoxModel(url, options = {}) {
  const moduleLoader = typeof options.moduleLoader === "function"
    ? options.moduleLoader
    : () => import("@plasius/gpu-model-voxel");
  const voxelModule = await moduleLoader();
  if (
    typeof voxelModule?.validatePvoxV1 !== "function"
    || typeof voxelModule?.createPvoxSurfaceMeshV1 !== "function"
  ) {
    throw new Error("PVOX loader module must provide validation and surface-cache derivation.");
  }
  const moduleMaximum = Number.isSafeInteger(voxelModule.PVOX_STATIC_MAXIMUM_ARTIFACT_BYTES_V1)
    ? voxelModule.PVOX_STATIC_MAXIMUM_ARTIFACT_BYTES_V1
    : DEFAULT_MAXIMUM_PVOX_BYTES;
  const maximumBytes = options.maximumBytes ?? moduleMaximum;
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 65_536 || maximumBytes > moduleMaximum) {
    throw new Error("PVOX maximumBytes is outside the released static profile.");
  }
  if (
    options.expectedArtifactSha256 !== undefined
    && (typeof options.expectedArtifactSha256 !== "string"
      || !SHA256_PATTERN.test(options.expectedArtifactSha256))
  ) {
    throw new Error("PVOX expected artifact hash is invalid.");
  }
  const fetchImpl = typeof options.fetch === "function" ? options.fetch : globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("PVOX loading requires fetch support.");
  }
  const response = await fetchImpl(url, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
  });
  if (!response?.ok) {
    throw new Error("PVOX asset request failed.");
  }
  const contentType = response.headers?.get?.("content-type")?.split(";", 1)[0]
    ?.trim().toLowerCase();
  if (contentType !== PVOX_CONTENT_TYPE) {
    throw new Error("PVOX asset response has an unexpected content type.");
  }
  const bytes = await readBoundedBytes(response, maximumBytes);
  const expectations = options.expectedArtifactSha256 === undefined
    ? {}
    : { artifactSha256: options.expectedArtifactSha256 };
  const decoded = await voxelModule.validatePvoxV1(bytes, expectations);
  const surfaceMesh = voxelModule.createPvoxSurfaceMeshV1(decoded, {
    maximumFaces: options.maximumFaces,
  });
  const primitives = compactSurfacePrimitives(decoded, surfaceMesh);
  if (primitives.length === 0) {
    throw new Error("PVOX asset contains no renderable surface-property groups.");
  }
  const primarySurface = decoded.surfaces[0];
  return Object.freeze({
    name: typeof options.name === "string" && options.name.trim().length > 0
      ? options.name.trim()
      : `pvox-${decoded.artifactSha256.slice(0, 12)}`,
    representation: "pvox",
    compatibilityProjection: surfaceMesh.representation,
    sourceArtifactSha256: decoded.artifactSha256,
    bounds: Object.freeze({
      min: Object.freeze([...surfaceMesh.bounds.minimum]),
      max: Object.freeze([...surfaceMesh.bounds.maximum]),
    }),
    color: Object.freeze({
      r: primarySurface.baseColor[0],
      g: primarySurface.baseColor[1],
      b: primarySurface.baseColor[2],
      a: primarySurface.baseColor[3],
    }),
    physics: Object.freeze({}),
    positions: Object.freeze([]),
    indices: Object.freeze([]),
    primitives,
  });
}

export function isPvoxAssetUrl(value) {
  try {
    const url = new URL(String(value), "https://plasius.invalid");
    return url.pathname.toLowerCase().endsWith(".pvox");
  } catch {
    return false;
  }
}

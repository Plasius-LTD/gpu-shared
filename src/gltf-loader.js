import { resolveShowcaseAssetUrl, shouldUseInlineShowcaseFallback } from "./asset-url.js";

function decodeDataUri(uri) {
  const match = /^data:.*?;base64,(.+)$/i.exec(uri);
  if (!match) {
    throw new Error(`Unsupported glTF buffer URI: ${uri.slice(0, 48)}`);
  }

  const binary = atob(match[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function getComponentArray(componentType, buffer, byteOffset, count) {
  switch (componentType) {
    case 5121:
      return new Uint8Array(buffer, byteOffset, count);
    case 5123:
      return new Uint16Array(buffer, byteOffset, count);
    case 5125:
      return new Uint32Array(buffer, byteOffset, count);
    case 5126:
      return new Float32Array(buffer, byteOffset, count);
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function getNormalizationScale(componentType) {
  switch (componentType) {
    case 5121:
      return 255;
    case 5123:
      return 65535;
    default:
      return 1;
  }
}

function getTypeSize(type) {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    default:
      throw new Error(`Unsupported glTF accessor type: ${type}`);
  }
}

function readAccessor(document, accessorIndex, buffers) {
  const accessor = document.accessors?.[accessorIndex];
  if (!accessor) {
    throw new Error(`glTF accessor ${accessorIndex} is missing.`);
  }

  const bufferView = document.bufferViews?.[accessor.bufferView];
  if (!bufferView) {
    throw new Error(`glTF bufferView ${accessor.bufferView} is missing.`);
  }

  const buffer = buffers[bufferView.buffer];
  const componentCount = getTypeSize(accessor.type);
  const byteOffset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const valueCount = accessor.count * componentCount;
  const values = Array.from(
    getComponentArray(accessor.componentType, buffer, byteOffset, valueCount)
  );

  if (accessor.normalized) {
    const scale = getNormalizationScale(accessor.componentType);
    return values.map((value) => value / scale);
  }

  return values;
}

function freezeNumericArray(values, fallback) {
  const source = Array.isArray(values) ? values : fallback;
  return Object.freeze([...source]);
}

function resolveRelativeAssetUri(uri, baseUrl) {
  if (typeof uri !== "string" || uri.length === 0) {
    return null;
  }
  if (uri.startsWith("data:")) {
    return uri;
  }
  return new URL(uri, baseUrl).href;
}

function getTextureTransform(textureInfo) {
  const transform = textureInfo?.extensions?.KHR_texture_transform ?? {};
  return Object.freeze({
    offset: freezeNumericArray(transform.offset, [0, 0]),
    scale: freezeNumericArray(transform.scale, [1, 1]),
    rotation:
      typeof transform.rotation === "number" && Number.isFinite(transform.rotation)
        ? transform.rotation
        : 0,
    texCoord:
      typeof transform.texCoord === "number"
        ? transform.texCoord
        : typeof textureInfo?.texCoord === "number"
          ? textureInfo.texCoord
          : 0,
  });
}

function getTextureInfo(document, textureInfo, baseUrl) {
  if (!textureInfo || typeof textureInfo.index !== "number") {
    return null;
  }

  const texture = document.textures?.[textureInfo.index];
  const image =
    typeof texture?.source === "number" ? document.images?.[texture.source] : null;

  return Object.freeze({
    index: textureInfo.index,
    name: texture?.name ?? image?.name ?? `texture-${textureInfo.index}`,
    texCoord:
      typeof textureInfo.texCoord === "number" ? textureInfo.texCoord : 0,
    sampler: typeof texture?.sampler === "number" ? texture.sampler : null,
    source: typeof texture?.source === "number" ? texture.source : null,
    uri: resolveRelativeAssetUri(image?.uri, baseUrl),
    mimeType: image?.mimeType ?? null,
    bufferView: typeof image?.bufferView === "number" ? image.bufferView : null,
    transform: getTextureTransform(textureInfo),
    scale:
      typeof textureInfo.scale === "number" && Number.isFinite(textureInfo.scale)
        ? textureInfo.scale
        : 1,
    strength:
      typeof textureInfo.strength === "number" && Number.isFinite(textureInfo.strength)
        ? textureInfo.strength
        : 1,
  });
}

function getMaterialInfo(document, primitive, baseUrl) {
  const material = document.materials?.[primitive.material] ?? null;
  const factor =
    material?.pbrMetallicRoughness?.baseColorFactor ??
    (material ? [1, 1, 1, 1] : [0.56, 0.33, 0.22, 1]);
  const emissive = material?.emissiveFactor ?? [0, 0, 0];
  const pbr = material?.pbrMetallicRoughness ?? {};
  const specular = material?.extensions?.KHR_materials_specular ?? {};
  const transmission = material?.extensions?.KHR_materials_transmission ?? {};
  const ior = material?.extensions?.KHR_materials_ior ?? {};

  return Object.freeze({
    index: typeof primitive.material === "number" ? primitive.material : null,
    name: material?.name ?? "default-material",
    color: Object.freeze({
      r: factor[0],
      g: factor[1],
      b: factor[2],
      a: factor[3] ?? 1,
    }),
    roughness:
      typeof material?.pbrMetallicRoughness?.roughnessFactor === "number"
        ? material.pbrMetallicRoughness.roughnessFactor
        : 0.92,
    metallic:
      typeof pbr.metallicFactor === "number"
        ? pbr.metallicFactor
        : 0.08,
    baseColorFactor: freezeNumericArray(factor, [1, 1, 1, 1]),
    emissive: Object.freeze({
      r: emissive[0] ?? 0,
      g: emissive[1] ?? 0,
      b: emissive[2] ?? 0,
    }),
    emissiveFactor: freezeNumericArray(emissive, [0, 0, 0]),
    alphaMode: material?.alphaMode ?? "OPAQUE",
    alphaCutoff:
      typeof material?.alphaCutoff === "number" ? material.alphaCutoff : 0.5,
    doubleSided: material?.doubleSided === true,
    baseColorTexture: getTextureInfo(document, pbr.baseColorTexture, baseUrl),
    metallicRoughnessTexture: getTextureInfo(
      document,
      pbr.metallicRoughnessTexture,
      baseUrl
    ),
    normalTexture: getTextureInfo(document, material?.normalTexture, baseUrl),
    occlusionTexture: getTextureInfo(document, material?.occlusionTexture, baseUrl),
    emissiveTexture: getTextureInfo(document, material?.emissiveTexture, baseUrl),
    specular: Object.freeze({
      factor:
        typeof specular.specularFactor === "number" ? specular.specularFactor : 1,
      colorFactor: freezeNumericArray(specular.specularColorFactor, [1, 1, 1]),
      texture: getTextureInfo(document, specular.specularTexture, baseUrl),
      colorTexture: getTextureInfo(document, specular.specularColorTexture, baseUrl),
    }),
    transmission: Object.freeze({
      factor:
        typeof transmission.transmissionFactor === "number"
          ? transmission.transmissionFactor
          : 0,
      texture: getTextureInfo(document, transmission.transmissionTexture, baseUrl),
    }),
    ior: typeof ior.ior === "number" ? ior.ior : 1.5,
  });
}

function computeBounds(positions) {
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

  for (let index = 0; index < positions.length; index += 3) {
    min[0] = Math.min(min[0], positions[index]);
    min[1] = Math.min(min[1], positions[index + 1]);
    min[2] = Math.min(min[2], positions[index + 2]);
    max[0] = Math.max(max[0], positions[index]);
    max[1] = Math.max(max[1], positions[index + 1]);
    max[2] = Math.max(max[2], positions[index + 2]);
  }

  return Object.freeze({
    min: Object.freeze([min[0], min[1], min[2]]),
    max: Object.freeze([max[0], max[1], max[2]]),
  });
}

function resolveBrowserRequestBaseUrl() {
  if (
    typeof document !== "undefined" &&
    typeof document.baseURI === "string" &&
    document.baseURI.length > 0
  ) {
    return document.baseURI;
  }
  if (
    typeof window !== "undefined" &&
    typeof window.location?.href === "string" &&
    window.location.href.length > 0
  ) {
    return window.location.href;
  }
  return null;
}

function resolveFetchBaseUrl(requestUrl, responseUrl) {
  if (typeof responseUrl === "string" && responseUrl.length > 0) {
    try {
      return new URL(responseUrl);
    } catch {
      // Keep trying the other candidates when an environment reports a malformed response URL.
    }
  }

  try {
    return new URL(requestUrl);
  } catch {
    const browserBaseUrl = resolveBrowserRequestBaseUrl();
    if (browserBaseUrl) {
      return new URL(requestUrl, browserBaseUrl);
    }
    throw new Error(
      `Unable to resolve a stable base URL for glTF asset loading: ${String(requestUrl)}`
    );
  }
}

function createIdentityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiplyMatrices(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] =
        a[0 * 4 + row] * b[column * 4 + 0] +
        a[1 * 4 + row] * b[column * 4 + 1] +
        a[2 * 4 + row] * b[column * 4 + 2] +
        a[3 * 4 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function composeNodeMatrix(node) {
  if (Array.isArray(node.matrix) && node.matrix.length === 16) {
    return [...node.matrix];
  }

  const translation = Array.isArray(node.translation) ? node.translation : [0, 0, 0];
  const rotation = Array.isArray(node.rotation) ? node.rotation : [0, 0, 0, 1];
  const scale = Array.isArray(node.scale) ? node.scale : [1, 1, 1];
  const [x, y, z, w] = rotation;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;

  return [
    (1 - (yy + zz)) * scale[0],
    (xy + wz) * scale[0],
    (xz - wy) * scale[0],
    0,
    (xy - wz) * scale[1],
    (1 - (xx + zz)) * scale[1],
    (yz + wx) * scale[1],
    0,
    (xz + wy) * scale[2],
    (yz - wx) * scale[2],
    (1 - (xx + yy)) * scale[2],
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ];
}

function transformPosition(position, matrix) {
  return [
    matrix[0] * position[0] + matrix[4] * position[1] + matrix[8] * position[2] + matrix[12],
    matrix[1] * position[0] + matrix[5] * position[1] + matrix[9] * position[2] + matrix[13],
    matrix[2] * position[0] + matrix[6] * position[1] + matrix[10] * position[2] + matrix[14],
  ];
}

function transformNormal(normal, matrix) {
  const transformed = [
    matrix[0] * normal[0] + matrix[4] * normal[1] + matrix[8] * normal[2],
    matrix[1] * normal[0] + matrix[5] * normal[1] + matrix[9] * normal[2],
    matrix[2] * normal[0] + matrix[6] * normal[1] + matrix[10] * normal[2],
  ];
  const length = Math.hypot(transformed[0], transformed[1], transformed[2]) || 1;
  return [transformed[0] / length, transformed[1] / length, transformed[2] / length];
}

async function loadGltfDocument(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load glTF asset: ${response.status} ${response.statusText}`);
  }

  return {
    document: await response.json(),
    baseUrl: resolveFetchBaseUrl(url, response.url),
  };
}

async function loadInlineShowcaseDocument() {
  return loadGltfDocument(resolveShowcaseAssetUrl("brigantine"));
}

function shouldRetryWithInlineShowcaseFallback(url, error) {
  if (!shouldUseInlineShowcaseFallback(url)) {
    return false;
  }

  return error instanceof TypeError || /^Failed to load glTF asset:/u.test(error.message);
}

function collectScenePrimitives(document, buffers, baseUrl) {
  const scene = document.scenes?.[document.scene ?? 0];
  if (!scene || !Array.isArray(scene.nodes) || scene.nodes.length === 0) {
    throw new Error("glTF demo asset must expose a default scene with at least one node.");
  }

  const results = [];
  let modelName = null;
  let physics = null;

  function visit(nodeIndex, parentMatrix) {
    const node = document.nodes?.[nodeIndex];
    if (!node) {
      throw new Error(`glTF node ${nodeIndex} is missing.`);
    }

    const localMatrix = composeNodeMatrix(node);
    const worldMatrix = multiplyMatrices(parentMatrix, localMatrix);

    if (!modelName && typeof node.name === "string" && node.name.length > 0) {
      modelName = node.name;
    }

    if (!physics && node.extras?.physics && typeof node.extras.physics === "object") {
      physics = Object.freeze({ ...node.extras.physics });
    }

    if (typeof node.mesh === "number") {
      const mesh = document.meshes?.[node.mesh];
      if (!mesh || !Array.isArray(mesh.primitives)) {
        throw new Error(`glTF mesh ${node.mesh} is missing primitives.`);
      }

      mesh.primitives.forEach((primitive, primitiveIndex) => {
        const positions = readAccessor(document, primitive.attributes.POSITION, buffers);
        const normals =
          typeof primitive.attributes.NORMAL === "number"
            ? readAccessor(document, primitive.attributes.NORMAL, buffers)
            : null;
        const colors =
          typeof primitive.attributes.COLOR_0 === "number"
            ? readAccessor(document, primitive.attributes.COLOR_0, buffers)
            : null;
        const uvs =
          typeof primitive.attributes.TEXCOORD_0 === "number"
            ? readAccessor(document, primitive.attributes.TEXCOORD_0, buffers)
            : null;
        const tangents =
          typeof primitive.attributes.TANGENT === "number"
            ? readAccessor(document, primitive.attributes.TANGENT, buffers)
            : null;
        const transformedPositions = [];
        const transformedNormals = [];
        const transformedTangents = [];

        for (let index = 0; index < positions.length; index += 3) {
          const point = transformPosition(
            [positions[index], positions[index + 1], positions[index + 2]],
            worldMatrix
          );
          transformedPositions.push(point[0], point[1], point[2]);

          if (normals) {
            const normal = transformNormal(
              [normals[index], normals[index + 1], normals[index + 2]],
              worldMatrix
            );
            transformedNormals.push(normal[0], normal[1], normal[2]);
          }
          if (tangents) {
            const tangentOffset = (index / 3) * 4;
            const tangent = transformNormal(
              [
                tangents[tangentOffset],
                tangents[tangentOffset + 1],
                tangents[tangentOffset + 2],
              ],
              worldMatrix
            );
            transformedTangents.push(
              tangent[0],
              tangent[1],
              tangent[2],
              tangents[tangentOffset + 3] ?? 1
            );
          }
        }

        const indices =
          typeof primitive.indices === "number"
            ? readAccessor(document, primitive.indices, buffers).map((value) => Number(value))
            : Array.from({ length: transformedPositions.length / 3 }, (_, index) => index);
        const material = getMaterialInfo(document, primitive, baseUrl);
        const primitiveName =
          `${node.name ?? mesh.name ?? "mesh"}-${primitiveIndex}`;

        results.push(
          Object.freeze({
            name: primitiveName,
            nodeName: node.name ?? null,
            meshName: mesh.name ?? null,
            primitiveIndex,
            materialIndex:
              typeof primitive.material === "number" ? primitive.material : null,
            mode: primitive.mode ?? 4,
            positions: Object.freeze(transformedPositions),
            indices: Object.freeze(indices),
            normals:
              transformedNormals.length > 0
                ? Object.freeze(transformedNormals)
                : null,
            colors: colors ? Object.freeze(colors) : null,
            uvs: uvs ? Object.freeze(uvs) : null,
            tangents:
              transformedTangents.length > 0
                ? Object.freeze(transformedTangents)
                : null,
            tangentSpace:
              uvs && normals
                ? Object.freeze({
                    source: tangents ? "asset" : "generated-from-uv-normal-position",
                    texCoord: 0,
                  })
                : null,
            material,
            bounds: computeBounds(transformedPositions),
          })
        );
      });
    }

    if (Array.isArray(node.children)) {
      for (const childIndex of node.children) {
        visit(childIndex, worldMatrix);
      }
    }
  }

  for (const rootNodeIndex of scene.nodes) {
    visit(rootNodeIndex, createIdentityMatrix());
  }

  if (results.length === 0) {
    throw new Error("glTF demo asset must contain at least one mesh primitive.");
  }

  return {
    name: modelName ?? "gltf-model",
    physics: physics ?? Object.freeze({}),
    primitives: results,
  };
}

export async function loadGltfModel(url) {
  let document;
  let baseUrl;

  try {
    ({ document, baseUrl } = await loadGltfDocument(url));
  } catch (error) {
    if (!shouldRetryWithInlineShowcaseFallback(url, error)) {
      throw error;
    }

    ({ document, baseUrl } = await loadInlineShowcaseDocument());
  }

  const buffers = await Promise.all(
    (document.buffers ?? []).map(async (buffer) => {
      if (typeof buffer.uri !== "string") {
        throw new Error("glTF buffer URI is required for demo asset loading.");
      }
      if (buffer.uri.startsWith("data:")) {
        return decodeDataUri(buffer.uri);
      }
      const nested = await fetch(new URL(buffer.uri, baseUrl));
      if (!nested.ok) {
        throw new Error(`Failed to load glTF buffer: ${nested.status} ${nested.statusText}`);
      }
      return nested.arrayBuffer();
    })
  );

  const scene = collectScenePrimitives(document, buffers, baseUrl);
  const aggregatePositions = [];
  const aggregateIndices = [];

  for (const primitive of scene.primitives) {
    const vertexOffset = aggregatePositions.length / 3;
    for (const position of primitive.positions) {
      aggregatePositions.push(position);
    }
    for (const index of primitive.indices) {
      aggregateIndices.push(index + vertexOffset);
    }
  }

  const color = scene.primitives[0]?.material?.color ?? { r: 0.56, g: 0.33, b: 0.22, a: 1 };

  return Object.freeze({
    name: scene.name,
    positions: Object.freeze(aggregatePositions),
    indices: Object.freeze(aggregateIndices),
    bounds: computeBounds(aggregatePositions),
    color: Object.freeze({ ...color }),
    physics: scene.physics,
    materials: Object.freeze(
      scene.primitives.map((primitive) => primitive.material)
    ),
    primitives: Object.freeze(scene.primitives),
  });
}

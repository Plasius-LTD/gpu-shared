import { shouldUseInlineShowcaseFallback } from "./asset-url.js";

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;
const GLB_BIN_CHUNK_TYPE = 0x004e4942;

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

function getComponentByteSize(componentType) {
  switch (componentType) {
    case 5121:
      return 1;
    case 5123:
      return 2;
    case 5125:
    case 5126:
      return 4;
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
  }
}

function readComponentValue(view, componentType, byteOffset) {
  switch (componentType) {
    case 5121:
      return view.getUint8(byteOffset);
    case 5123:
      return view.getUint16(byteOffset, true);
    case 5125:
      return view.getUint32(byteOffset, true);
    case 5126:
      return view.getFloat32(byteOffset, true);
    default:
      throw new Error(`Unsupported glTF componentType: ${componentType}`);
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
  const componentByteSize = getComponentByteSize(accessor.componentType);
  const packedElementByteLength = componentCount * componentByteSize;
  const byteStride = Math.max(bufferView.byteStride ?? packedElementByteLength, packedElementByteLength);
  let values;

  if (byteStride === packedElementByteLength) {
    const valueCount = accessor.count * componentCount;
    values = Array.from(
      getComponentArray(accessor.componentType, buffer, byteOffset, valueCount)
    );
  } else {
    const view = new DataView(buffer, byteOffset);
    values = new Array(accessor.count * componentCount);
    for (let index = 0; index < accessor.count; index += 1) {
      const elementOffset = index * byteStride;
      for (let componentIndex = 0; componentIndex < componentCount; componentIndex += 1) {
        values[index * componentCount + componentIndex] = readComponentValue(
          view,
          accessor.componentType,
          elementOffset + componentIndex * componentByteSize
        );
      }
    }
  }

  if (accessor.normalized) {
    const scale = getNormalizationScale(accessor.componentType);
    return values.map((value) => value / scale);
  }

  return values;
}

async function decodeImagePixels(blob, urlLabel = "glTF texture") {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas =
        typeof OffscreenCanvas === "function"
          ? new OffscreenCanvas(bitmap.width, bitmap.height)
          : typeof document !== "undefined"
            ? Object.assign(document.createElement("canvas"), {
                width: bitmap.width,
                height: bitmap.height,
              })
            : null;
      const context = canvas?.getContext?.("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Unable to create 2D context for glTF texture decode.");
      }
      context.drawImage(bitmap, 0, 0);
      const imageData = context.getImageData(0, 0, bitmap.width, bitmap.height);
      return Object.freeze({
        width: bitmap.width,
        height: bitmap.height,
        data: imageData.data,
      });
    } finally {
      bitmap.close?.();
    }
  }

  if (typeof document === "undefined") {
    throw new Error(`Unable to decode ${urlLabel}: browser image decode APIs are unavailable.`);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error(`Failed to decode ${urlLabel}.`));
      element.src = objectUrl;
    });
    const canvas = Object.assign(document.createElement("canvas"), {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Unable to create 2D context for glTF texture decode.");
    }
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return Object.freeze({
      width: canvas.width,
      height: canvas.height,
      data: imageData.data,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function sliceBufferView(document, bufferViewIndex, buffers) {
  const bufferView = document.bufferViews?.[bufferViewIndex];
  if (!bufferView) {
    throw new Error(`glTF bufferView ${bufferViewIndex} is missing.`);
  }
  const buffer = buffers[bufferView.buffer];
  if (!buffer) {
    throw new Error(`glTF buffer ${bufferView.buffer} is missing.`);
  }
  const start = bufferView.byteOffset ?? 0;
  const end = start + (bufferView.byteLength ?? 0);
  return buffer.slice(start, end);
}

async function loadImageResource(document, image, index, buffers, baseUrl) {
  if (typeof image?.uri === "string") {
    const response = await fetch(new URL(image.uri, baseUrl));
    if (!response.ok) {
      throw new Error(`Failed to load glTF texture: ${response.status} ${response.statusText}`);
    }
    return decodeImagePixels(
      await response.blob(),
      `glTF texture ${index}${image.uri ? ` (${image.uri})` : ""}`
    );
  }

  if (typeof image?.bufferView === "number") {
    const bytes = sliceBufferView(document, image.bufferView, buffers);
    return decodeImagePixels(
      new Blob([bytes], { type: image.mimeType ?? "application/octet-stream" }),
      `glTF texture ${index}`
    );
  }

  return null;
}

function normalizeTextureTransformPair(value, fallback) {
  if (!Array.isArray(value) || value.length < 2) {
    return fallback;
  }
  return [
    Number.isFinite(value[0]) ? Number(value[0]) : fallback[0],
    Number.isFinite(value[1]) ? Number(value[1]) : fallback[1],
  ];
}

function readTextureTransform(textureRef) {
  const transformExtension = textureRef?.extensions?.KHR_texture_transform ?? null;
  return {
    texCoord:
      typeof transformExtension?.texCoord === "number"
        ? transformExtension.texCoord
        : textureRef?.texCoord ?? 0,
    offset: normalizeTextureTransformPair(transformExtension?.offset, [0, 0]),
    scale: normalizeTextureTransformPair(transformExtension?.scale, [1, 1]),
    rotation: Number.isFinite(transformExtension?.rotation) ? Number(transformExtension.rotation) : 0,
  };
}

function wrapTextureCoordinate(value) {
  return ((value % 1) + 1) % 1;
}

function transformTextureCoordinate(uv, transform) {
  const scaledU = uv[0] * transform.scale[0];
  const scaledV = uv[1] * transform.scale[1];
  const cosine = Math.cos(transform.rotation);
  const sine = Math.sin(transform.rotation);
  return [
    scaledU * cosine - scaledV * sine + transform.offset[0],
    scaledU * sine + scaledV * cosine + transform.offset[1],
  ];
}

function readTexturePixel(data, width, height, x, y) {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  const offset = (clampedY * width + clampedX) * 4;
  return [
    data[offset] ?? 0,
    data[offset + 1] ?? 0,
    data[offset + 2] ?? 0,
    data[offset + 3] ?? 255,
  ];
}

function mixChannel(a, b, weight) {
  return a + (b - a) * weight;
}

function sampleTexturePixel(data, width, height, uv) {
  const u = wrapTextureCoordinate(uv[0]);
  const v = wrapTextureCoordinate(uv[1]);
  const sourceX = u * Math.max(width - 1, 0);
  const sourceY = (1 - v) * Math.max(height - 1, 0);
  const x0 = Math.floor(sourceX);
  const y0 = Math.floor(sourceY);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = sourceX - x0;
  const ty = sourceY - y0;
  const topLeft = readTexturePixel(data, width, height, x0, y0);
  const topRight = readTexturePixel(data, width, height, x1, y0);
  const bottomLeft = readTexturePixel(data, width, height, x0, y1);
  const bottomRight = readTexturePixel(data, width, height, x1, y1);
  return [0, 1, 2, 3].map((channelIndex) => {
    const top = mixChannel(topLeft[channelIndex], topRight[channelIndex], tx);
    const bottom = mixChannel(bottomLeft[channelIndex], bottomRight[channelIndex], tx);
    return mixChannel(top, bottom, ty);
  });
}

function applyTextureTransformToPixels(pixels, transform) {
  const isIdentityTransform =
    transform.offset[0] === 0 &&
    transform.offset[1] === 0 &&
    transform.scale[0] === 1 &&
    transform.scale[1] === 1 &&
    transform.rotation === 0;
  if (isIdentityTransform) {
    return pixels;
  }

  const transformedData = new Uint8ClampedArray(pixels.data.length);
  for (let y = 0; y < pixels.height; y += 1) {
    const outputV = pixels.height > 1 ? 1 - y / (pixels.height - 1) : 0;
    for (let x = 0; x < pixels.width; x += 1) {
      const outputU = pixels.width > 1 ? x / (pixels.width - 1) : 0;
      const sourcePixel = sampleTexturePixel(
        pixels.data,
        pixels.width,
        pixels.height,
        transformTextureCoordinate([outputU, outputV], transform)
      );
      const offset = (y * pixels.width + x) * 4;
      transformedData[offset] = sourcePixel[0];
      transformedData[offset + 1] = sourcePixel[1];
      transformedData[offset + 2] = sourcePixel[2];
      transformedData[offset + 3] = sourcePixel[3];
    }
  }

  return Object.freeze({
    width: pixels.width,
    height: pixels.height,
    data: transformedData,
  });
}

function getMaterialTexture(document, textureRef, imageResources) {
  if (!textureRef || typeof textureRef.index !== "number") {
    return null;
  }
  const texture = document.textures?.[textureRef.index] ?? null;
  const sourceIndex = texture?.source;
  if (typeof sourceIndex !== "number") {
    return null;
  }
  const pixels = imageResources.get(sourceIndex) ?? null;
  if (!pixels) {
    return null;
  }

  const transform = readTextureTransform(textureRef);
  const transformedPixels = applyTextureTransformToPixels(pixels, transform);
  return Object.freeze({
    texCoord: transform.texCoord,
    scale: textureRef.scale,
    strength: textureRef.strength,
    width: transformedPixels.width,
    height: transformedPixels.height,
    data: transformedPixels.data,
  });
}

function getMaterialInfo(document, primitive, imageResources) {
  const material = document.materials?.[primitive.material] ?? null;
  const pbr = material?.pbrMetallicRoughness ?? null;
  const factor = pbr?.baseColorFactor ?? [0.56, 0.33, 0.22, 1];
  const emissive = Array.isArray(material?.emissiveFactor) ? material.emissiveFactor : [0, 0, 0];
  const extensions = material?.extensions ?? {};
  const specular = extensions.KHR_materials_specular ?? null;
  const transmission = extensions.KHR_materials_transmission ?? null;
  const ior = extensions.KHR_materials_ior ?? null;
  const clearcoat = extensions.KHR_materials_clearcoat ?? null;
  const sheen = extensions.KHR_materials_sheen ?? null;
  const volume = extensions.KHR_materials_volume ?? null;
  const iridescence = extensions.KHR_materials_iridescence ?? null;
  const anisotropy = extensions.KHR_materials_anisotropy ?? null;
  const dispersion = extensions.KHR_materials_dispersion ?? null;

  return Object.freeze({
    name: material?.name ?? "default-material",
    color: Object.freeze({
      r: factor[0],
      g: factor[1],
      b: factor[2],
      a: factor[3] ?? 1,
    }),
    roughness:
      typeof pbr?.roughnessFactor === "number"
        ? pbr.roughnessFactor
        : 0.92,
    metallic:
      typeof pbr?.metallicFactor === "number"
        ? pbr.metallicFactor
        : 0.08,
    opacity: factor[3] ?? 1,
    emissive: Object.freeze({
      r: emissive[0] ?? 0,
      g: emissive[1] ?? 0,
      b: emissive[2] ?? 0,
      a: 1,
    }),
    baseColorTexture: getMaterialTexture(document, pbr?.baseColorTexture, imageResources),
    metallicRoughnessTexture: getMaterialTexture(
      document,
      pbr?.metallicRoughnessTexture,
      imageResources
    ),
    normalTexture: getMaterialTexture(document, material?.normalTexture, imageResources),
    occlusionTexture: getMaterialTexture(document, material?.occlusionTexture, imageResources),
    emissiveTexture: getMaterialTexture(document, material?.emissiveTexture, imageResources),
    specular:
      typeof specular?.specularFactor === "number"
        ? specular.specularFactor
        : 1,
    specularColor: Object.freeze(
      Array.isArray(specular?.specularColorFactor)
        ? [...specular.specularColorFactor]
        : [1, 1, 1]
    ),
    specularTexture: getMaterialTexture(document, specular?.specularTexture, imageResources),
    specularColorTexture: getMaterialTexture(
      document,
      specular?.specularColorTexture,
      imageResources
    ),
    transmission:
      typeof transmission?.transmissionFactor === "number"
        ? transmission.transmissionFactor
        : 0,
    transmissionTexture: getMaterialTexture(
      document,
      transmission?.transmissionTexture,
      imageResources
    ),
    ior: typeof ior?.ior === "number" ? ior.ior : 1.45,
    attenuationDistance:
      typeof volume?.attenuationDistance === "number"
        ? volume.attenuationDistance
        : null,
    attenuationColor: Object.freeze(
      Array.isArray(volume?.attenuationColor)
        ? [...volume.attenuationColor]
        : [1, 1, 1]
    ),
    thickness:
      typeof volume?.thicknessFactor === "number"
        ? volume.thicknessFactor
        : 0,
    thicknessTexture: getMaterialTexture(document, volume?.thicknessTexture, imageResources),
    clearcoat:
      typeof clearcoat?.clearcoatFactor === "number"
        ? clearcoat.clearcoatFactor
        : 0,
    clearcoatTexture: getMaterialTexture(document, clearcoat?.clearcoatTexture, imageResources),
    clearcoatRoughness:
      typeof clearcoat?.clearcoatRoughnessFactor === "number"
        ? clearcoat.clearcoatRoughnessFactor
        : 0.08,
    clearcoatRoughnessTexture: getMaterialTexture(
      document,
      clearcoat?.clearcoatRoughnessTexture,
      imageResources
    ),
    clearcoatNormalTexture: getMaterialTexture(
      document,
      clearcoat?.clearcoatNormalTexture,
      imageResources
    ),
    sheenColor: Object.freeze(
      Array.isArray(sheen?.sheenColorFactor) ? [...sheen.sheenColorFactor] : [0, 0, 0]
    ),
    sheenColorTexture: getMaterialTexture(document, sheen?.sheenColorTexture, imageResources),
    sheenRoughness:
      typeof sheen?.sheenRoughnessFactor === "number"
        ? sheen.sheenRoughnessFactor
        : 0,
    sheenRoughnessTexture: getMaterialTexture(
      document,
      sheen?.sheenRoughnessTexture,
      imageResources
    ),
    iridescence:
      typeof iridescence?.iridescenceFactor === "number"
        ? iridescence.iridescenceFactor
        : 0,
    iridescenceTexture: getMaterialTexture(
      document,
      iridescence?.iridescenceTexture,
      imageResources
    ),
    iridescenceIor:
      typeof iridescence?.iridescenceIor === "number"
        ? iridescence.iridescenceIor
        : 1.3,
    iridescenceThicknessMinimum:
      typeof iridescence?.iridescenceThicknessMinimum === "number"
        ? iridescence.iridescenceThicknessMinimum
        : 100,
    iridescenceThicknessMaximum:
      typeof iridescence?.iridescenceThicknessMaximum === "number"
        ? iridescence.iridescenceThicknessMaximum
        : 400,
    iridescenceThicknessTexture: getMaterialTexture(
      document,
      iridescence?.iridescenceThicknessTexture,
      imageResources
    ),
    anisotropy:
      typeof anisotropy?.anisotropyStrength === "number"
        ? anisotropy.anisotropyStrength
        : 0,
    anisotropyRotation:
      typeof anisotropy?.anisotropyRotation === "number"
        ? anisotropy.anisotropyRotation
        : 0,
    anisotropyTexture: getMaterialTexture(document, anisotropy?.anisotropyTexture, imageResources),
    dispersion:
      typeof dispersion?.dispersion === "number"
        ? dispersion.dispersion
        : 0,
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

function appendValues(target, values) {
  for (let index = 0; index < values.length; index += 1) {
    target.push(values[index]);
  }
}

function appendIndicesWithOffset(target, values, vertexOffset) {
  for (let index = 0; index < values.length; index += 1) {
    target.push(values[index] + vertexOffset);
  }
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

function shouldReadResponseAsGlb(requestUrl, response) {
  const contentType = response.headers?.get?.("content-type")?.toLowerCase?.() ?? "";
  if (contentType.includes("model/gltf-binary")) {
    return true;
  }

  try {
    return new URL(requestUrl, resolveBrowserRequestBaseUrl() ?? "https://plasius.invalid/")
      .pathname.toLowerCase().endsWith(".glb");
  } catch {
    return String(requestUrl).split(/[?#]/u, 1)[0]?.toLowerCase().endsWith(".glb") === true;
  }
}

function alignGlbChunkLength(byteLength) {
  return byteLength + ((4 - (byteLength % 4)) % 4);
}

function parseGlbDocument(buffer) {
  if (!(buffer instanceof ArrayBuffer)) {
    throw new Error("Binary glTF asset must be loaded as an ArrayBuffer.");
  }
  if (buffer.byteLength < 20) {
    throw new Error("Binary glTF asset is too small to contain a valid GLB header.");
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  const declaredLength = view.getUint32(8, true);
  if (magic !== GLB_MAGIC) {
    throw new Error("Binary glTF asset does not contain a valid GLB magic header.");
  }
  if (version !== GLB_VERSION) {
    throw new Error(`Unsupported binary glTF version: ${version}`);
  }
  if (declaredLength > buffer.byteLength) {
    throw new Error("Binary glTF asset is truncated.");
  }

  let offset = 12;
  let document = null;
  const buffers = [];
  while (offset + 8 <= declaredLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > declaredLength) {
      throw new Error("Binary glTF asset contains an invalid chunk length.");
    }

    const chunkBuffer = buffer.slice(chunkStart, chunkEnd);
    if (chunkType === GLB_JSON_CHUNK_TYPE) {
      const jsonText = new TextDecoder("utf-8").decode(chunkBuffer).trim();
      document = JSON.parse(jsonText);
    } else if (chunkType === GLB_BIN_CHUNK_TYPE) {
      buffers.push(chunkBuffer);
    }

    offset = chunkStart + alignGlbChunkLength(chunkLength);
  }

  if (!document || typeof document !== "object") {
    throw new Error("Binary glTF asset does not contain a JSON scene chunk.");
  }

  return { document, buffers };
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

function collectScenePrimitives(document, buffers, imageResources) {
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
        const transformedPositions = [];
        const transformedNormals = [];

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
        }

        const indices =
          typeof primitive.indices === "number"
            ? readAccessor(document, primitive.indices, buffers).map((value) => Number(value))
            : Array.from({ length: transformedPositions.length / 3 }, (_, index) => index);
        const material = getMaterialInfo(document, primitive, imageResources);
        const primitiveName =
          `${node.name ?? mesh.name ?? "mesh"}-${primitiveIndex}`;

        results.push(
          Object.freeze({
            name: primitiveName,
            positions: Object.freeze(transformedPositions),
            indices: Object.freeze(indices),
            normals:
              transformedNormals.length > 0
                ? Object.freeze(transformedNormals)
                : null,
            uvs: uvs ? Object.freeze(uvs) : null,
            colors: colors ? Object.freeze(colors) : null,
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

async function loadGltfDocument(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load glTF asset: ${response.status} ${response.statusText}`);
  }

  if (shouldReadResponseAsGlb(url, response)) {
    const { document, buffers } = parseGlbDocument(await response.arrayBuffer());
    return {
      document,
      buffers,
      baseUrl: resolveFetchBaseUrl(url, response.url),
    };
  }

  return {
    document: await response.json(),
    buffers: [],
    baseUrl: resolveFetchBaseUrl(url, response.url),
  };
}

async function loadInlineShowcaseDocument() {
  const module = await import("./showcase-inline-assets.js");
  return loadGltfDocument(new URL(module.INLINE_SHOWCASE_ASSET_URLS.brigantine));
}

async function buildGltfModel(document, baseUrl, embeddedBuffers = []) {
  const buffers = await Promise.all(
    (document.buffers ?? []).map(async (buffer, index) => {
      if (typeof buffer.uri !== "string" && embeddedBuffers[index]) {
        return embeddedBuffers[index];
      }
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

  const imageResources = new Map();
  await Promise.all(
    (document.images ?? []).map(async (image, index) => {
      const pixels = await loadImageResource(document, image, index, buffers, baseUrl);
      if (pixels) {
        imageResources.set(index, pixels);
      }
    })
  );

  const scene = collectScenePrimitives(document, buffers, imageResources);
  const aggregatePositions = [];
  const aggregateIndices = [];

  for (const primitive of scene.primitives) {
    const vertexOffset = aggregatePositions.length / 3;
    appendValues(aggregatePositions, primitive.positions);
    appendIndicesWithOffset(aggregateIndices, primitive.indices, vertexOffset);
  }

  const color = scene.primitives[0]?.material?.color ?? { r: 0.56, g: 0.33, b: 0.22, a: 1 };

  return Object.freeze({
    name: scene.name,
    positions: Object.freeze(aggregatePositions),
    indices: Object.freeze(aggregateIndices),
    bounds: computeBounds(aggregatePositions),
    color: Object.freeze({ ...color }),
    physics: scene.physics,
    primitives: Object.freeze(scene.primitives),
  });
}

function shouldRetryWithInlineShowcaseFallback(url, error) {
  if (!shouldUseInlineShowcaseFallback(url)) {
    return false;
  }

  return error instanceof TypeError || /^Failed to load glTF asset:/u.test(error.message);
}

export async function loadGltfModel(url) {
  try {
    const { document, baseUrl, buffers } = await loadGltfDocument(url);
    return buildGltfModel(document, baseUrl, buffers);
  } catch (error) {
    if (!shouldRetryWithInlineShowcaseFallback(url, error)) {
      throw error;
    }

    const { document, baseUrl, buffers } = await loadInlineShowcaseDocument();
    return buildGltfModel(document, baseUrl, buffers);
  }
}

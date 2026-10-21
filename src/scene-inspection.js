import { createInspectionRuntime } from './model-inspection-runtime.js';

const vector = value => Array.isArray(value) && value.length === 3 &&
  value.every(n => Number.isFinite(n) && Math.abs(n) <= 20);

function validateSources(models) {
  if (!Array.isArray(models) || models.length < 1 || models.length > 6) {
    throw new Error('Scene inspection requires 1–6 models.');
  }
  return models.map(({ modelUrl, integrity, anchor, size, yaw = 0 }) => {
    const url = new URL(modelUrl).href;
    if (!['http:', 'https:'].includes(new URL(url).protocol) ||
        !vector(anchor) || anchor[1] < 0 || !Number.isFinite(size) || size < .25 || size > 10 ||
        !Number.isFinite(yaw)) throw new Error('Invalid scene model URL or placement.');
    if (!integrity || !Object.hasOwn(integrity, url) ||
        !Object.values(integrity).every(v => /^sha256-[A-Za-z0-9+/]{43}=$/u.test(v))) {
      throw new Error('Every scene model requires a SHA-256 integrity manifest.');
    }
    return { modelUrl: url, integrity: { ...integrity }, anchor: [...anchor], size, yaw };
  });
}

function rotate(values, yaw, offset = [0, 0, 0]) {
  if (!values) return null;
  const result = [], cosine = Math.cos(yaw), sine = Math.sin(yaw);
  for (let i = 0; i < values.length; i += 3) {
    result.push(values[i] * cosine + values[i + 2] * sine + offset[0],
      values[i + 1] + offset[1], -values[i] * sine + values[i + 2] * cosine + offset[2]);
  }
  return Object.freeze(result);
}

function ground(extent) {
  return Object.freeze({ id: 1000, materialRefId: 1000,
    positions: [-extent, 0, -extent, -extent, 0, extent, extent, 0, extent, extent, 0, -extent],
    normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], indices: [0, 1, 2, 0, 2, 3],
    color: [.36, .38, .4, 1], roughness: .92, metallic: 0, materialKind: 'diffuse' });
}

/** Compose authored models; renderer/camera/refinement remain in the inspection lifecycle. */
export async function createSceneInspectionRuntime(options = {}, deps) {
  const sources = validateSources(options.models);
  const camera = options.camera ?? { eye: [3, 2.1, 4.6], target: [0, .7, 0], fov: 32 };
  let textureBytes = 0;
  const load = async (_url, { signal }) => {
    const meshes = [], textureBuffers = new Set();
    let triangles = 2, nextMaterial = 1001, extent = 3;
    for (const source of sources) {
      signal.throwIfAborted();
      const model = await deps.load(source.modelUrl, { signal, integrity: source.integrity });
      signal.throwIfAborted();
      const count = model.primitives.reduce((sum, p) => sum + p.indices.length / 3, 0);
      triangles += count;
      if (!Number.isInteger(count) || count < 1 || triangles > 500000) {
        throw new Error('Scene inspection exceeds its 1–500000 triangle budget (including ground).');
      }
      const materials = new Map();
      for (const primitive of model.primitives) {
        if (materials.has(primitive.material)) continue;
        materials.set(primitive.material, nextMaterial++);
        for (const [key, texture] of Object.entries(primitive.material ?? {})) {
          const data = key.endsWith('Texture') ? texture?.data : null;
          if (!ArrayBuffer.isView(data) || textureBuffers.has(data.buffer)) continue;
          textureBuffers.add(data.buffer); textureBytes += data.buffer.byteLength;
          if (textureBytes > 128 * 1024 * 1024) throw new Error('Scene inspection exceeds its 128 MiB decoded texture budget.');
        }
      }
      const projected = deps.meshes(model, { targetCenter: [0, 0, 0], targetSize: source.size })
        .filter(mesh => mesh.id >= 1000);
      if (projected.length !== model.primitives.length) throw new Error('Scene contains an invalid mesh primitive.');
      let bottom = Infinity;
      for (const mesh of projected) {
        if (!mesh.positions.every(Number.isFinite)) throw new Error('Scene contains invalid geometry.');
        for (let i = 1; i < mesh.positions.length; i += 3) bottom = Math.min(bottom, mesh.positions[i]);
      }
      const offset = [source.anchor[0], source.anchor[1] - bottom, source.anchor[2]];
      for (let i = 0; i < projected.length; i++) {
        const mesh = projected[i], positions = rotate(mesh.positions, source.yaw, offset);
        for (let p = 0; p < positions.length; p += 3) {
          extent = Math.max(extent, Math.abs(positions[p]) + 1, Math.abs(positions[p + 2]) + 1);
        }
        meshes.push(Object.freeze({ ...mesh, id: 1001 + meshes.length, positions,
          normals: rotate(mesh.normals, source.yaw),
          materialRefId: materials.get(model.primitives[i].material) }));
      }
    }
    const sceneMeshes = Object.freeze([ground(extent), ...meshes]);
    return { primitives: sceneMeshes, sceneMeshes };
  };
  const runtime = await createInspectionRuntime({ ...options, modelUrl: sources[0].modelUrl,
    integrity: sources[0].integrity }, { ...deps, load, meshes: model => model.sceneMeshes,
    camera: config => deps.camera({ ...config, camera }) });
  return Object.freeze({ ...runtime, modelCount: sources.length, textureBytes });
}

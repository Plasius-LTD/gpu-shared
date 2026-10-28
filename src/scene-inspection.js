import { createInspectionRuntime } from './model-inspection-runtime.js';

const finiteTransformValue = n => Number.isFinite(n) && Math.abs(n) <= 1e12;
const vector = value => Array.isArray(value) && value.length === 3 && value.every(finiteTransformValue);
const yieldPreparation = () => new Promise(resolve => setTimeout(resolve, 0));

async function validateSources(models, signal) {
  if (!Array.isArray(models) || models.length < 1 || models.length >= 0xffffffff - 1000) {
    throw new Error('Scene inspection requires model placements with unsigned instance identities.');
  }
  const sources = new Map(), manifests = new WeakMap(), placements = [];
  for (const [index, model] of models.entries()) {
    if (index > 0 && index % 256 === 0) await yieldPreparation();
    signal?.throwIfAborted();
    const { modelUrl, integrity, anchor, size, yaw = 0, primitiveIndices } = model;
    const url = new URL(modelUrl).href;
    if (!['http:', 'https:'].includes(new URL(url).protocol) ||
        !vector(anchor) || anchor[1] < 0 || !finiteTransformValue(size) || size <= 0 ||
        !Number.isFinite(yaw)) throw new Error('Invalid scene model URL or placement.');
    let manifest = integrity && manifests.get(integrity);
    if (!manifest) {
      if (!integrity || !Object.hasOwn(integrity, url) ||
          !Object.values(integrity).every(v => /^sha256-[A-Za-z0-9+/]{43}=$/u.test(v))) {
        throw new Error('Every scene model requires a SHA-256 integrity manifest.');
      }
      manifest = JSON.stringify(Object.entries(integrity).sort(([a], [b]) => a.localeCompare(b)));
      manifests.set(integrity, manifest);
    }
    if (!Object.hasOwn(integrity, url)) throw new Error('Every scene model requires a SHA-256 integrity manifest.');
    if (primitiveIndices !== undefined && (!Array.isArray(primitiveIndices) || primitiveIndices.length === 0 ||
        !primitiveIndices.every(i => Number.isSafeInteger(i) && i >= 0) || new Set(primitiveIndices).size !== primitiveIndices.length)) {
      throw new Error('Primitive selection must contain distinct nonnegative indices.');
    }
    let source = sources.get(url);
    if (source && source.manifest !== manifest) throw new Error('Conflicting source integrity manifests.');
    if (!source) {
      source = { modelUrl: url, integrity: { ...integrity }, manifest };
      sources.set(url, source);
    }
    placements.push({ source, anchor: [...anchor], size, yaw,
      primitiveIndices: primitiveIndices ? [...primitiveIndices] : undefined });
  }
  return { placements, sources: [...sources.values()] };
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
  if (options.enabled !== true) throw new Error('Model inspection must be explicitly enabled.');
  const { placements, sources } = await validateSources(options.models, options.signal);
  if(options.instancing !== undefined && typeof options.instancing !== 'boolean') throw new Error('Scene instancing must be a boolean.');
  const instancing=options.instancing===true;
  let instanceCount=0;
  const camera = options.camera ?? { eye: [3, 2.1, 4.6], target: [0, .7, 0], fov: 32 };
  let textureBytes = 0;
  const load = async (_url, { signal }) => {
    const meshes = [], textureBuffers = new Set();
    const instances=instancing?[Object.freeze({id:1000,meshId:1000,
      transform:Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])})]:undefined;
    let nextMaterial = 1001, extent = 3;
    for (const source of sources) {
      signal.throwIfAborted();
      const model = await deps.load(source.modelUrl, { signal, integrity: source.integrity });
      signal.throwIfAborted();
      const count = model.primitives.reduce((sum, p) => sum + p.indices.length / 3, 0);
      if (!Number.isSafeInteger(count) || count < 1) {
        throw new Error('Scene inspection requires a valid positive triangle count.');
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
      source.model = model;
      source.materials = materials;
      source.projections = new Map();
    }
    // Decode and validate every unique source before creating scene geometry.
    for (const [index, { source, anchor, size, yaw, primitiveIndices }] of placements.entries()) {
      if (index > 0 && index % 256 === 0) await yieldPreparation();
      signal.throwIfAborted();
      const projectionSize=instancing?1:size;
      const projectionKey = `${projectionSize}:${primitiveIndices?.join(',') ?? 'all'}`;
      let projection = source.projections.get(projectionKey);
      if (!projection) {
        const selected = primitiveIndices ? primitiveIndices.map(i => source.model.primitives[i]) : source.model.primitives;
        if (selected.some(p => !p)) throw new Error('Primitive selection references missing geometry.');
        const selectedModel = primitiveIndices ? { ...source.model, primitives: selected, bounds: undefined } : source.model;
        const projected = deps.meshes(selectedModel, { targetCenter: [0, 0, 0], targetSize: projectionSize })
          .filter(mesh => mesh.id >= 1000);
        if (projected.length !== selected.length) throw new Error('Scene contains an invalid mesh primitive.');
        let bottom = Infinity, radius=0;
        for (const mesh of projected) {
          if (!mesh.positions.every(Number.isFinite)) throw new Error('Scene contains invalid geometry.');
          for (let i = 1; i < mesh.positions.length; i += 3) {
            bottom = Math.min(bottom, mesh.positions[i]);
            radius = Math.max(radius,Math.hypot(mesh.positions[i-1],mesh.positions[i+1]));
          }
        }
        projection = { projected, bottom, radius, selected };
        source.projections.set(projectionKey, projection);
        if(instancing) {
          projection.geometry=projected.map((mesh,i)=>Object.freeze({...mesh,id:1001+meshes.length+i,
            materialRefId:source.materials.get(projection.selected[i].material)}));
          meshes.push(...projection.geometry);
        }
      }
      if(instancing) {
        const cosine=Math.cos(yaw)*size,sine=Math.sin(yaw)*size;
        const transform=Object.freeze([cosine,0,-sine,0,0,size,0,0,sine,0,cosine,0,
          anchor[0],anchor[1]-projection.bottom*size,anchor[2],1]);
        if (instances.length + projection.geometry.length >= 0xffffffff - 1000) throw new Error('Scene mesh instances exceed unsigned identity storage.');
        for(const mesh of projection.geometry) instances.push(Object.freeze({id:1000+instances.length,meshId:mesh.id,transform}));
        extent=Math.max(extent,Math.abs(anchor[0])+projection.radius*size+1,Math.abs(anchor[2])+projection.radius*size+1);
        continue;
      }
      const { projected, bottom } = projection;
      const offset = [anchor[0], anchor[1] - bottom, anchor[2]];
      for (let i = 0; i < projected.length; i++) {
        const mesh = projected[i], positions = rotate(mesh.positions, yaw, offset);
        for (let p = 0; p < positions.length; p += 3) {
          extent = Math.max(extent, Math.abs(positions[p]) + 1, Math.abs(positions[p + 2]) + 1);
        }
        meshes.push(Object.freeze({ ...mesh, id: 1001 + meshes.length, positions,
          normals: rotate(mesh.normals, yaw),
          materialRefId: source.materials.get(projection.selected[i].material) }));
      }
    }
    const sceneMeshes = Object.freeze([ground(extent), ...meshes]);
    instanceCount=instances?.length??0;
    return { primitives: sceneMeshes, sceneMeshes, sceneInstances:instances?Object.freeze(instances):undefined };
  };
  const runtime = await createInspectionRuntime({ ...options, modelUrl: sources[0].modelUrl,
    integrity: sources[0].integrity }, { ...deps, load, meshes: model => model.sceneMeshes,
    camera: config => deps.camera({ ...config, camera }) });
  return Object.freeze({ ...runtime, modelCount: placements.length, sourceCount: sources.length,
    instanceCount, geometryMode: instancing?'instanced':'expanded', textureBytes });
}

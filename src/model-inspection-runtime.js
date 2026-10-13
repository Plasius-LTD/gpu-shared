/** Shared fixture inspection. Asset acquisition and review copy belong to the host. */
export async function createInspectionRuntime(options = {}, deps) {
  const { canvas, modelUrl, integrity, enabled, signal, onHintChange,
    onError = () => {}, width = 800, height = 600 } = options;
  if (enabled !== true) throw new Error('Model inspection must be explicitly enabled.');
  const url = new URL(modelUrl);
  if (!['http:', 'https:'].includes(url.protocol) || !canvas ||
      ![width, height].every(v => Number.isInteger(v) && v >= 1 && v <= 1440)) {
    throw new Error('Invalid inspection canvas, size or asset URL.');
  }
  if (!integrity || !Object.hasOwn(integrity, url.href) ||
      !Object.values(integrity).every(v => /^sha256-[A-Za-z0-9+/]{43}=$/u.test(v))) {
    throw new Error('A SHA-256 integrity manifest is required.');
  }
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const wait = promise => new Promise((resolve, reject) => {
    const cancel = () => reject(combined.reason);
    combined.addEventListener('abort', cancel, { once: true });
    if (combined.aborted) cancel();
    Promise.resolve(promise).then(resolve, reject).finally(() => combined.removeEventListener('abort', cancel));
  });
  let renderer, camera, disposed = false, busy = false, dirty = false;
  const destroyRenderer = value => { value?.destroy(); value?.device?.destroy(); };
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    combined.removeEventListener('abort', destroy);
    controller.abort(); camera?.destroy(); destroyRenderer(renderer); renderer = undefined;
  };
  combined.addEventListener('abort', destroy, { once: true });
  async function draw() {
    if (disposed) return;
    if (busy) { dirty = true; return; }
    busy = true;
    try {
      do {
        dirty = false;
        const c = camera.read();
        renderer.updateCamera({ position: c.eye, target: c.target, up: [0, 1, 0], fovYDegrees: c.fov });
        renderer.renderOnce();
        await wait(renderer.device.queue.onSubmittedWorkDone());
      } while (dirty && !disposed);
    } catch (error) {
      if (!disposed) { destroy(); onError(error); }
      throw error;
    } finally { busy = false; }
  }
  const initTimeout = setTimeout(() => controller.abort(new Error('Model inspection timed out.')), 60000);
  try {
    combined.throwIfAborted();
    const model = await wait(deps.load(url, { signal: combined, integrity: { ...integrity } }));
    combined.throwIfAborted();
    const triangleCount = model.primitives.reduce((n, p) => n + p.indices.length / 3, 0);
    if (!Number.isInteger(triangleCount) || triangleCount < 1 || triangleCount > 500000) {
      throw new Error('Inspection requires 1–500000 triangles.');
    }
    // Product Studio owns normalization and material preservation. Its environment
    // quads are omitted here to inspect the model against the renderer sky.
    const meshes = deps.meshes(model, { targetCenter: [0, 0, 0], targetSize: 2.2 })
      .filter(mesh => mesh.id >= 1000);
    const created = await wait(deps.renderer({ canvas, width, height, meshes, displayQuality: true,
      maxDepth: 6, tileSize: 128, samplesPerPixel: 8, denoise: true,
      environmentPortalMode: 'disabled', environmentPortals: [],
      environmentColor: [0.58, 0.66, 0.76, 1], ambientColor: [0.04, 0.046, 0.052, 1],
      environmentLighting: { horizonColor: [0.7, 0.78, 0.86, 1], zenithColor: [0.18, 0.24, 0.34, 1],
        sunDirection: [0.18, 0.9, -0.4], sunColor: [2.8, 2.55, 2.2, 1], intensity: 1.35, mode: 1, exposure: 1 },
      camera: { position: [3, 1.5, 4.2], target: [0, 0, 0], up: [0, 1, 0], fovYDegrees: 38 },
    }).then(value => {
      if (combined.aborted) { destroyRenderer(value); combined.throwIfAborted(); }
      return value;
    }));
    renderer = created;
    camera = deps.camera({ canvas, camera: { eye: [3, 1.5, 4.2], target: [0, 0, 0], fov: 38 },
      onHintChange, onChange: () => { void draw().catch(() => {}); } });
    await draw(); combined.throwIfAborted();
    return Object.freeze({ triangleCount, primitiveCount: model.primitives.length,
      draw, reset: () => { if (!disposed) camera.reset(); }, destroy });
  } catch (error) { destroy(); throw error; }
  finally { clearTimeout(initTimeout); }
}

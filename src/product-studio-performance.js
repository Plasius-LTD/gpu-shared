/** Connect a host's motion target to the existing performance governor and renderer budget. */
export async function createProductStudioMotionPerformance(policy, sampleTarget, loader, now = () => performance.now()) {
  if (policy === undefined) return null;
  const rate = policy?.targetFrameRate;
  if (!Number.isSafeInteger(rate) || rate < 1 || rate > 1000) {
    throw new Error('motionPerformance.targetFrameRate must be an integer from 1 to 1000.');
  }
  if (typeof loader !== 'function') throw new Error('Motion performance requires a performance module loader.');
  const module = await loader();
  if (typeof module?.createGpuPerformanceGovernor !== 'function' || typeof module?.createQualityLadderAdapter !== 'function') {
    throw new Error('Motion performance requires gpu-performance governor and quality ladder APIs.');
  }
  // Each level changes only optional samples; geometry, transport and resolution stay intact.
  const maximum = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.trunc(sampleTarget)));
  const levels = [];
  for (let samples = 1; samples < maximum; samples *= 2) {
    levels.push({ id: `spp-${samples}`, config: { samplesPerPixel: samples } });
  }
  levels.push({ id: `spp-${maximum}`, config: { samplesPerPixel: maximum } });
  const adapter = module.createQualityLadderAdapter({ id: 'product-studio-motion', domain: 'custom', levels });
  const governor = module.createGpuPerformanceGovernor({
    device: { deviceClass: 'unknown', mode: 'flat', supportsWebGpu: true },
    target: { minimumFrameRate: rate, maximumFrameRate: rate, preferredFrameRates: [rate], supportedFrameRates: [rate], deviceRefreshRateHz: rate },
    modules: [adapter],
  });
  const { targetFrameRate, targetFrameTimeMs } = governor.getTarget();
  let latest = null;
  let completedFrames = 0;
  return Object.freeze({
    frameOptions(queuedAt) {
      return Object.freeze({
        samplesPerPixel: adapter.getCurrentLevel().config.samplesPerPixel,
        minimumSamplesPerPixel: 1,
        frameTimeBudgetMs: Math.max(0, targetFrameTimeMs - Math.max(0, now() - queuedAt)),
        awaitGPUCompletion: true, readStats: false, readOutputProbe: false,
      });
    },
    complete(queuedAt, options, stats) {
      const frameTimeMs = Math.max(0, now() - queuedAt);
      // A zero-resolution clock gives no usable timing evidence. Do not invent samples.
      if (frameTimeMs > 0) governor.recordFrame({ frameTimeMs });
      latest = Object.freeze({ targetFrameRate, targetFrameTimeMs, frameTimeMs,
        frameTimeBudgetMs: options.frameTimeBudgetMs, requestedSamplesPerPixel: options.samplesPerPixel,
        renderedSamplesPerPixel: Number.isSafeInteger(stats?.renderedSamplesPerPixel) && stats.renderedSamplesPerPixel > 0
          ? stats.renderedSamplesPerPixel : null,
        overBudget: frameTimeMs > targetFrameTimeMs, completedFrames: ++completedFrames });
    },
    snapshot: () => latest,
  });
}

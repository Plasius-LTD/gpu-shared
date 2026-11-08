/** Product-owned motion bounds, governed by the shared performance package. */
export async function createInspectionMotionPerformance(policy, loader, now = () => performance.now()) {
  if (policy === undefined) return null;
  const rate = policy?.targetFrameRate;
  const scales = policy?.renderScales ?? [1];
  const headroomRatio = policy?.headroomRatio ?? .9;
  if (typeof headroomRatio !== 'number' || !Number.isFinite(headroomRatio) || headroomRatio <= 0 || headroomRatio > 1 || !Number.isSafeInteger(rate) || rate < 1 || rate > 1000 || !Array.isArray(scales) ||
      scales.length < 1 || scales.length > 16 || scales.at(-1) !== 1 ||
      scales.some((scale, index) => typeof scale !== 'number' || !Number.isFinite(scale) ||
        scale <= 0 || scale > 1 || (index > 0 && scale <= scales[index - 1]))) {
    throw new Error('Invalid motionPerformance targetFrameRate or ascending renderScales ending at one.');
  }
  if (typeof loader !== 'function') throw new Error('Motion performance requires a governor module loader.');
  const module = await loader();
  if (typeof module?.createGpuPerformanceGovernor !== 'function' || typeof module?.createQualityLadderAdapter !== 'function') {
    throw new Error('Motion performance requires gpu-performance governor and quality ladder APIs.');
  }
  const levels = scales.map(renderScale => ({ id: `scale-${renderScale}`, config: { renderScale, samplesPerPixel: 1 } }));
  // Inspection's existing bounded batch contract admits at most four samples.
  levels.push(...[2, 4].map(samplesPerPixel => ({ id: `spp-${samplesPerPixel}`, config: { renderScale: 1, samplesPerPixel } })));
  const adapter = module.createQualityLadderAdapter({ id: 'inspection-motion', domain: 'custom', levels, recoveryBudget: { headroomRatio } });
  if (typeof adapter.recordFrameTime !== 'function') throw new Error('Motion performance requires measured quality recovery support.');
  const governor = module.createGpuPerformanceGovernor({
    device: { deviceClass: 'unknown', mode: 'flat', supportsWebGpu: true },
    target: { minimumFrameRate: rate, maximumFrameRate: rate, frameBudgetRatio: headroomRatio, preferredFrameRates: [rate], supportedFrameRates: [rate], deviceRefreshRateHz: rate },
    // Camera work changes with each view. Sub-budget variation alone must not
    // reduce quality; the governor's absolute latency/drop/thermal gates remain.
    adaptation: { trendSensitivityMs: 1000 / rate, sampleWindowSize: 8,
      minimumSamplesBeforeAdjustment: 4, degradeCooldownFrames: 2 },
    modules: [adapter],
  });
  const { targetFrameRate, targetFrameTimeMs } = governor.getTarget();
  const starts = new WeakMap();
  let latest = null, completedFrames = 0;
  return Object.freeze({
    frameOptions(queuedAt, sampleCapacity) {
      const startedAt = now();
      const level = adapter.getCurrentLevel().config;
      const options = Object.freeze({ renderScale: level.renderScale,
        samplesPerPixel: Math.max(1, Math.min(sampleCapacity, level.samplesPerPixel)),
        minimumSamplesPerPixel: 1,
        frameTimeBudgetMs: targetFrameTimeMs * headroomRatio,
        awaitGPUCompletion: true, readStats: false, readOutputProbe: false });
      starts.set(options, startedAt);
      return options;
    },
    complete(queuedAt, options, stats) {
      const completedAt = now(), startedAt = starts.get(options);
      if (startedAt === undefined) throw new Error('Motion completion requires its pending frame options.');
      starts.delete(options);
      const frameTimeMs = Math.max(0, completedAt - startedAt);
      const queueDelayMs = Math.max(0, startedAt - queuedAt);
      const inputLatencyMs = Math.max(0, completedAt - queuedAt);
      if (frameTimeMs > 0) {
        adapter.recordFrameTime(frameTimeMs);
        governor.recordFrame({ frameTimeMs });
      }
      latest = Object.freeze({ targetFrameRate, targetFrameTimeMs, frameTimeMs, queueDelayMs, inputLatencyMs,
        renderScale: options.renderScale, requestedSamplesPerPixel: options.samplesPerPixel,
        renderedSamplesPerPixel: stats.renderedSamplesPerPixel, width: stats.width, height: stats.height,
        overBudget: frameTimeMs > targetFrameTimeMs, completedFrames: ++completedFrames });
    },
    snapshot: () => latest,
  });
}

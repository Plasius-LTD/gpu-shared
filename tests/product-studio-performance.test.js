import assert from 'node:assert/strict';
import test from 'node:test';
import * as performanceModule from '@plasius/gpu-performance';
import { createProductStudioMotionPerformance } from '../src/product-studio-performance.js';

function fixture(targetFrameRate = 24, samplesPerPixel = 128) {
  let time = 0;
  let governor;
  const module = { ...performanceModule, createGpuPerformanceGovernor(options) {
    governor = performanceModule.createGpuPerformanceGovernor(options);
    return governor;
  } };
  return { create: () => createProductStudioMotionPerformance({ targetFrameRate }, samplesPerPixel, async () => module, () => time),
    setTime: value => { time = value; }, governor: () => governor };
}

test('policy is optional; invalid explicit policies and unavailable modules fail clearly', async () => {
  assert.equal(await createProductStudioMotionPerformance(undefined, 128), null);
  for (const value of [null, {}, { targetFrameRate: 0 }, { targetFrameRate: NaN }, { targetFrameRate: Infinity }, { targetFrameRate: -24 }, { targetFrameRate: '24' }]) {
    await assert.rejects(createProductStudioMotionPerformance(value, 128), /targetFrameRate/);
  }
  await assert.rejects(createProductStudioMotionPerformance({ targetFrameRate: 24 }, 128), /performance.*loader/i);
  await assert.rejects(createProductStudioMotionPerformance({ targetFrameRate: 24 }, 128, async () => ({})), /gpu-performance/);
});

test('caller owns exact target; deadline excludes user idle and includes scheduling', async () => {
  for (const rate of [24, 30, 60]) {
    const f = fixture(rate), policy = await f.create();
    assert.equal(f.governor().getTarget().targetFrameRate, rate);
    f.setTime(10003);
    const options = policy.frameOptions(10000);
    assert.equal(options.samplesPerPixel, 128);
    assert.equal(options.minimumSamplesPerPixel, 1);
    assert.equal(options.frameTimeBudgetMs, 1000/rate - 3);
    assert.equal(options.awaitGPUCompletion, true);
    assert.equal(options.readStats, false);
    f.setTime(10015);
    policy.complete(10000, options, { renderedSamplesPerPixel: 4 });
    assert.equal(f.governor().getState().metrics.latestFrameTimeMs, 15);
    assert.deepEqual(policy.snapshot(), { targetFrameRate: rate, targetFrameTimeMs: 1000/rate,
      frameTimeMs: 15, frameTimeBudgetMs: 1000/rate - 3, requestedSamplesPerPixel: 128,
      renderedSamplesPerPixel: 4, overBudget: false, completedFrames: 1 });
    assert.ok(Object.isFrozen(policy.snapshot()));
    f.setTime(11000);
    assert.equal(policy.frameOptions(10000).frameTimeBudgetMs, 0, 'overrun retains minimum coverage, never a negative budget');
  }
});

test('real governor reduces ceiling under pressure and recovers when renderer becomes faster', async () => {
  const f = fixture(24, 5), policy = await f.create();
  let start = 0;
  for (let i = 0; i < 80; i++) {
    f.setTime(start); const options = policy.frameOptions(start);
    f.setTime(start + 80); policy.complete(start, options, { renderedSamplesPerPixel: 1 }); start += 80;
  }
  assert.equal(policy.frameOptions(start).samplesPerPixel, 1);
  assert.equal(policy.snapshot().overBudget, true);
  for (let i = 0; i < 200; i++) {
    f.setTime(start); const options = policy.frameOptions(start);
    f.setTime(start + 10); policy.complete(start, options, { renderedSamplesPerPixel: Math.min(4, options.samplesPerPixel) }); start += 10;
  }
  assert.equal(policy.frameOptions(start).samplesPerPixel, 5, 'non-power-of-two reference target remains the ceiling');
  assert.equal(policy.snapshot().renderedSamplesPerPixel, 4);
  assert.equal(policy.snapshot().overBudget, false);
});

test('absent renderer count stays unknown; zero-duration mocks do not invent timing samples', async () => {
  const f = fixture(24, 1), policy = await f.create();
  const options = policy.frameOptions(0);
  policy.complete(0, options, {});
  assert.equal(policy.snapshot().renderedSamplesPerPixel, null);
  assert.equal(f.governor().getState().metrics, null);
  assert.equal(options.samplesPerPixel, 1);
  f.setTime(1); policy.complete(0, options, { renderedSamplesPerPixel: NaN });
  assert.equal(policy.snapshot().renderedSamplesPerPixel, null);
});

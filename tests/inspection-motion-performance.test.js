import test from 'node:test';
import assert from 'node:assert/strict';
import * as performanceModule from '@plasius/gpu-performance';
import {createInspectionMotionPerformance} from '../src/inspection-motion-performance.js';
test('inspection uses the host frame target and governor for resolution and optional samples',async()=>{
 let time=0;const motion=await createInspectionMotionPerformance({targetFrameRate:24,renderScales:[.5,.64,.8,1]},async()=>performanceModule,()=>time);
 const initial=motion.frameOptions(time,4);assert.equal(initial.samplesPerPixel,4);assert.equal(initial.renderScale,1);assert.equal(initial.frameTimeBudgetMs,(1000/24)*.9);
 for(let i=0;i<48;i++){const start=time,options=motion.frameOptions(start,4);time+=70;motion.complete(start,options,{renderedSamplesPerPixel:1,width:400,height:250});}
 const constrained=motion.frameOptions(time,4);assert.equal(constrained.samplesPerPixel,1);assert.equal(constrained.renderScale,.5);
 assert.equal(motion.snapshot().overBudget,true);assert.equal(motion.snapshot().targetFrameRate,24);
 for(let i=0;i<360;i++){const start=time,options=motion.frameOptions(start,4);time+=5;motion.complete(start,options,{renderedSamplesPerPixel:options.samplesPerPixel,width:800,height:500});}
 assert.equal(motion.frameOptions(time,4).samplesPerPixel,4);assert.equal(motion.frameOptions(time,4).renderScale,1);
 assert.equal(motion.frameOptions(time,1).samplesPerPixel,1);
 assert.equal(motion.frameOptions(time-50,4).frameTimeBudgetMs,(1000/24)*.9);
});
test('inspection validates motion policy without loading optional code when disabled or invalid',async()=>{
 let calls=0;const loader=async()=>{calls++;return performanceModule;};
 assert.equal(await createInspectionMotionPerformance(undefined,loader),null);assert.equal(calls,0);
 for(const policy of [null,{}, {targetFrameRate:0},{targetFrameRate:24,renderScales:[]},{targetFrameRate:24,renderScales:[.5,2]},{targetFrameRate:24,renderScales:[.8,.5,1]},{targetFrameRate:24,renderScales:[.5,.8]}])await assert.rejects(createInspectionMotionPerformance(policy,loader),/motionPerformance/);
 assert.equal(calls,0);
 await assert.rejects(createInspectionMotionPerformance({targetFrameRate:24},async()=>({})),/governor/);
});
test('sub-budget timing variation retains motion quality instead of cascading to reduced resolution',async()=>{
 let time=0;const motion=await createInspectionMotionPerformance({targetFrameRate:24,renderScales:[.5,.64,.8,1]},async()=>performanceModule,()=>time);
 for(let i=0;i<240;i++){
  const start=time,options=motion.frameOptions(start,4);time+=(i%48<24?12:28);
  motion.complete(start,options,{renderedSamplesPerPixel:2,width:800,height:500});
  assert.equal(motion.frameOptions(time,4).renderScale,1,'all completed frames remain below the24FPS budget');
 }
});
test('queued input age is separate from executed frame time and cannot double-count pressure',async()=>{
 let time=0;const motion=await createInspectionMotionPerformance({targetFrameRate:24,renderScales:[.5,.64,.8,1]},async()=>performanceModule,()=>time);
 for(let i=0;i<120;i++){
  const requested=time-15,options=motion.frameOptions(requested,4);time+=30;
  motion.complete(requested,options,{renderedSamplesPerPixel:2,width:800,height:500});
  assert.equal(motion.snapshot().frameTimeMs,30);
  assert.equal(motion.snapshot().inputLatencyMs,45);
  assert.equal(motion.snapshot().queueDelayMs,15);
  assert.equal(motion.snapshot().overBudget,false);
  assert.equal(motion.frameOptions(time,4).renderScale,1);
 }
});
test('host headroom reserves motion capacity while the cadence target remains24FPS',async()=>{
 const motion=await createInspectionMotionPerformance({targetFrameRate:24,headroomRatio:.8},async()=>performanceModule,()=>10);
 assert.equal(motion.frameOptions(10,4).frameTimeBudgetMs,(1000/24)*.8);
 assert.equal(motion.frameOptions(0,4).frameTimeBudgetMs,(1000/24)*.8);
 for(const headroomRatio of [0,-1,1.1,NaN,Infinity,'1'])await assert.rejects(createInspectionMotionPerformance({targetFrameRate:24,headroomRatio},async()=>performanceModule),/motionPerformance/);
});
test('queued camera age does not consume the next frame execution budget twice',async()=>{
 const motion=await createInspectionMotionPerformance({targetFrameRate:24},async()=>performanceModule,()=>100);
 assert.equal(motion.frameOptions(85,4).frameTimeBudgetMs,37.5);
 assert.equal(motion.frameOptions(0,4).frameTimeBudgetMs,37.5);
});

test('host execution reserve reduces work before camera frames exceed the cadence interval', async () => {
  let time = 0;
  const motion = await createInspectionMotionPerformance({
    targetFrameRate: 24, headroomRatio: .85, renderScales: [.5, .64, .8, 1],
  }, async () => performanceModule, () => time);
  for (let i = 0; i < 24; i++) {
    const requested = time, options = motion.frameOptions(requested, 4);
    time += 38;
    motion.complete(requested, options, {renderedSamplesPerPixel: 1, width: 800, height: 500});
    assert.equal(motion.snapshot().overBudget, false);
  }
  assert.ok(motion.frameOptions(time, 4).renderScale < 1);
  assert.equal(motion.snapshot().targetFrameRate, 24);
});

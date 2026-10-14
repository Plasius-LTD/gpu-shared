import { inspectionQuality } from './model-inspection-quality.js';

/** Framework-independent inspection lifecycle; all rendering stays in gpu-renderer. */
export async function createInspectionRuntime({ canvas, modelUrl, integrity, enabled,
  signal, onHintChange, onError = () => {}, onProgress = () => {}, quality,
  width = 800, height = 600 } = {}, deps) {
  if (enabled !== true) throw new Error('Model inspection must be explicitly enabled.');
  const url = new URL(modelUrl);
  if (!['http:', 'https:'].includes(url.protocol) || !canvas) throw new Error('Invalid inspection canvas or asset URL.');
  let desired = inspectionQuality({...quality,width,height});
  if (!integrity || !Object.hasOwn(integrity, url.href) ||
      !Object.values(integrity).every(v => /^sha256-[A-Za-z0-9+/]{43}=$/u.test(v))) {
    throw new Error('A SHA-256 integrity manifest is required.');
  }
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  // Every GPU/allocation wait has a deadline as well as cancellation.
  const wait = promise => new Promise((resolve, reject) => {
    const cleanup = () => {clearTimeout(timeout);combined.removeEventListener('abort',cancel);};
    const cancel = () => {cleanup();reject(combined.reason);};
    const timeout = setTimeout(() => {cleanup();reject(new Error('Model inspection timed out.'));},60000);
    combined.addEventListener('abort',cancel,{once:true});
    if(combined.aborted) cancel();
    Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});
  });
  let renderer, camera, meshes, applied, disposed=false, pending, timer, paused=false;
  let generation=0, renderedGeneration=-1, samples=0, changedAt=Date.now();
  const destroyRenderer = value => { value?.destroy(); value?.device?.destroy(); };
  const progress = phase => {
    if (!disposed) onProgress(Object.freeze({phase,samples,target:desired.samplesPerPixel,
      width:desired.width,height:desired.height,maxDepth:desired.maxDepth,denoise:desired.denoise}));
  };
  const destroy = () => {
    if (disposed) return;
    disposed=true;clearTimeout(timer);combined.removeEventListener('abort',destroy);
    controller.abort();camera?.destroy();destroyRenderer(renderer);renderer=undefined;
  };
  combined.addEventListener('abort',destroy,{once:true});
  const readCamera = () => {
    const c=camera.read();return {position:c.eye,target:c.target,up:[0,1,0],fovYDegrees:c.fov};
  };
  const schedule = () => {
    clearTimeout(timer);
    if (disposed || paused || samples>=desired.samplesPerPixel) return;
    timer=setTimeout(()=>{void pump().catch(()=>{});},Math.max(16,200-(Date.now()-changedAt)));
  };
  async function allocate(settings) {
    destroyRenderer(renderer);renderer=undefined;
    const value=await wait(deps.renderer({canvas,meshes,...settings,
      samplesPerPixel:4,progressive:true,displayQuality:true,tileSize:128,
      environmentPortalMode:'disabled',environmentPortals:[],
      environmentColor:[0.58,0.66,0.76,1],ambientColor:[0.04,0.046,0.052,1],
      environmentLighting:{horizonColor:[0.7,0.78,0.86,1],zenithColor:[0.18,0.24,0.34,1],
        sunDirection:[0.18,0.9,-0.4],sunColor:[2.8,2.55,2.2,1],intensity:1.35,mode:1,exposure:1},
      camera:readCamera(),
    }).then(value=>{
      if(combined.aborted){destroyRenderer(value);combined.throwIfAborted();}
      return value;
    }));
    renderer=value;applied=settings;
    if(typeof renderer.resetAccumulation!=='function') throw new Error('This renderer version does not support progressive inspection.');
  }
  async function run() {
    try {
      do {
        const id=generation,settings=desired;
        if (!renderer || ['maxDepth','denoise','width','height'].some(key=>applied[key]!==settings[key])) await allocate(settings);
        if(disposed) return;
        if(id!==generation) continue;
        if(renderedGeneration!==id){renderer.updateCamera(readCamera());renderer.resetAccumulation();samples=0;renderedGeneration=id;}
        const batch=Math.min(samples===0?1:4,settings.samplesPerPixel-samples);
        if(batch<1) return;
        progress(samples===0?'rendering':'refining');
        renderer.renderOnce({samplesPerPixel:batch});
        await wait(renderer.device.queue.onSubmittedWorkDone());
        if(disposed) return;
        if(id!==generation) continue;
        samples+=batch;
        progress(paused?'paused':samples>=settings.samplesPerPixel?'complete':'refining');
        break;
      } while(!disposed && !paused);
    } catch(error) {
      if(!disposed){destroy();onError(error);}
      throw error;
    }
  }
  function pump() {
    if(disposed || paused) return Promise.resolve();
    if(pending) return pending;
    pending=run().finally(()=>{pending=undefined;schedule();});
    return pending;
  }
  function draw() {
    if(disposed) return Promise.resolve();
    generation++;samples=0;changedAt=Date.now();clearTimeout(timer);progress(paused?'paused':'rendering');
    return pump();
  }
  try {
    combined.throwIfAborted();
    const model=await wait(deps.load(url,{signal:combined,integrity:{...integrity}}));
    combined.throwIfAborted();
    const triangleCount=model.primitives.reduce((n,p)=>n+p.indices.length/3,0);
    if(!Number.isInteger(triangleCount)||triangleCount<1||triangleCount>500000) throw new Error('Inspection requires 1–500000 triangles.');
    meshes=deps.meshes(model,{targetCenter:[0,0,0],targetSize:2.2}).filter(mesh=>mesh.id>=1000);
    camera=deps.camera({canvas,camera:{eye:[3,1.5,4.2],target:[0,0,0],fov:38},onHintChange,
      onChange:()=>{void draw().catch(()=>{});}});
    await draw();combined.throwIfAborted();
    return Object.freeze({triangleCount,primitiveCount:model.primitives.length,draw,
      async setQuality(patch){if(disposed)return;desired=inspectionQuality(patch,desired);await draw();},
      setPaused(value){
        if(disposed)return;paused=value===true;clearTimeout(timer);
        if(paused)progress('paused');else{progress(samples>=desired.samplesPerPixel?'complete':'refining');schedule();}
      },
      reset:()=>{if(!disposed)camera.reset();},destroy});
  } catch(error){destroy();throw error;}
}

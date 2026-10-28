import { materialStudyAssets } from './material-study-assets.js';
import { crateFinishRanges } from './material-study-helpers/native-crate-finish.js';
import { createCrateAgeing } from './material-study-helpers/native-crate-ageing.js';

function geometry(model) {
  const data=[],uv=[],surfaces=[],finishIndex={wood:0,rope:1,metal:2};
  let minY=Infinity,maxY=-Infinity;
  for(const p of model.primitives) for(let i=1;i<p.positions.length;i+=3) {
    minY=Math.min(minY,p.positions[i]);maxY=Math.max(maxY,p.positions[i]);
  }
  if(!Number.isFinite(maxY-minY) || maxY<=minY) throw new Error('Invalid material-study geometry.');
  for(const p of model.primitives) {
    const firstVertex=data.length/12,m=p.material;
    for(const i of p.indices) {
      data.push(p.positions[i*3],p.positions[i*3+1]-minY,p.positions[i*3+2],...p.normals.slice(i*3,i*3+3),m.color.r,m.color.g,m.color.b,m.roughness,m.metallic,0);
      uv.push(...p.uvs.slice(i*2,i*2+2));
    }
    for(const range of crateFinishRanges(p.name,p.indices.length)) surfaces.push({firstVertex:firstVertex+range.firstVertex,vertexCount:range.vertexCount,materialIndex:finishIndex[range.finish]});
  }
  const firstVertex=data.length/12;
  for(const p of [[-6,0,-6],[-6,0,6],[6,0,6],[-6,0,-6],[6,0,6],[6,0,-6]]) {data.push(...p,0,1,0,.24,.25,.25,.9,0,0);uv.push(0,0);}
  surfaces.push({firstVertex,vertexCount:6,materialIndex:3});
  const source=model.primitives[0].material;
  return {vertices:new Float32Array(data),texcoords:new Float32Array(uv),surfaces,height:maxY-minY,heightOffset:-minY,
    maps:{baseColor:source.baseColorTexture,normal:source.normalTexture,orm:source.metallicRoughnessTexture}};
}

/** Internal dependency boundary; the public entry supplies the released package adapters. */
export async function createStudyRuntime({canvas,modelUrl,signal,onHintChange,onUnavailable}={},deps) {
  const url=new URL(modelUrl);
  if(!['http:','https:'].includes(url.protocol) || !url.pathname.endsWith('/wooden_crate_01.gltf')) throw new Error('A reviewed material-study asset URL is required.');
  const abort=new AbortController();
  const combined=signal?AbortSignal.any([signal,abort.signal]):abort.signal;
  let renderer,camera,disposed=false,busy=false,ready=false,mounted=false,generation=0,terminalError,profile=createCrateAgeing().profile;
  let toggles={coated:true,fibres:true,materials:true},mesh,fibred,looseEndCount=0;
  const ensure=()=>{if(terminalError)throw terminalError;combined.throwIfAborted();};
  const release=resource=>{try{resource?.destroy();}catch{/* Attempt all terminal cleanup even if an adapter fails. */}};
  const destroy=()=>{
    if(disposed)return;disposed=true;ready=false;generation++;
    combined.removeEventListener('abort',destroy);abort.abort();
    const input=camera,gpu=renderer;camera=undefined;renderer=undefined;
    release(input);release(gpu);
  };
  const fail=()=>{
    if(disposed)return;
    terminalError=new Error('Material study rendering is unavailable.');
    destroy();
    if(mounted)try{
      Promise.resolve(onUnavailable?.(Object.freeze({code:'render-unavailable',message:terminalError.message}))).catch(()=>{});
    }catch{/* Host callbacks cannot escape GPU/input events or prevent cleanup. */}
  };
  combined.addEventListener('abort',destroy,{once:true});
  const draw=()=>{
    try {
    if(!ready || disposed || canvas.clientWidth<=0 || canvas.clientHeight<=0)return;
    const scale=Math.min(2,globalThis.devicePixelRatio||1,1440/canvas.clientWidth,1440/canvas.clientHeight);
    const width=Math.max(1,Math.round(canvas.clientWidth*scale));
    const height=Math.max(1,Math.round(canvas.clientHeight*scale));
    if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
    const chosen=toggles.fibres?fibred:mesh;
    renderer.render({vertices:chosen.vertices,texcoords:chosen.texcoords,...(toggles.materials?{surfaces:chosen.surfaces}:{}),camera:camera.read(),water:false});
    }catch{fail();}
  };
  const buildFibres=()=>{
    const fibres=createCrateAgeing(profile).createFibres({...mesh,ranges:mesh.surfaces.filter(s=>s.materialIndex===1)});
    const vertices=new Float32Array(mesh.vertices.length+fibres.vertices.length);vertices.set(mesh.vertices);vertices.set(fibres.vertices,mesh.vertices.length);
    const texcoords=new Float32Array(mesh.texcoords.length+fibres.texcoords.length);texcoords.set(mesh.texcoords);texcoords.set(fibres.texcoords,mesh.texcoords.length);
    fibred={vertices,texcoords,surfaces:[...mesh.surfaces,{firstVertex:mesh.vertices.length/12,vertexCount:fibres.vertices.length/12,materialIndex:4}]};
    looseEndCount=fibres.looseEndCount;
  };
  const replaceRenderer=async()=>{
    ready=false;const current=++generation,previous=renderer;renderer=undefined;release(previous);
    const {wood,rope,metal,fibres}=createCrateAgeing(profile).createMaterials(mesh.maps,toggles.coated);
    const replacement=await deps.createRenderer({canvas,materials:[wood,rope,metal,{},fibres],
      onUnavailable:()=>{if(current===generation)fail();}});
    if(disposed){release(replacement);ensure();}
    renderer=replacement;
  };
  try {
    ensure();
    const integrity=Object.fromEntries(Object.entries(materialStudyAssets).map(([path,hash])=>[new URL(path,url).href,hash]));
    const model=await deps.load(url,{signal:AbortSignal.any([combined,AbortSignal.timeout(30000)]),integrity});
    ensure();mesh=geometry(model);buildFibres();await replaceRenderer();ensure();
    const distance=mesh.height*3.4,centreY=mesh.height*.5;
    camera=deps.createCamera({canvas,camera:{eye:[-distance*.643,centreY+distance*.38,distance*.766],target:[0,centreY,0],fov:42},onChange:draw,onHintChange});
    ready=true;draw();ensure();mounted=true;
  } catch(error) {destroy();throw error;}
  return Object.freeze({
    read:()=>({...profile,...toggles,looseEndCount}),resize:draw,destroy,
    async update(patch={}) {
      ensure();if(busy)throw new Error('Material study is busy.');
      const {ropeFray=profile.ropeFray,varnishWear=profile.varnishWear,...options}=patch;
      for(const [key,value] of Object.entries(options)) if(!Object.hasOwn(toggles,key) || typeof value!=='boolean')throw new Error('Material study options must be known boolean switches.');
      const next=createCrateAgeing({...profile,ropeFray,varnishWear}).profile;
      const rebuild=next.varnishWear!==profile.varnishWear || (options.coated!==undefined && options.coated!==toggles.coated);
      const regroom=next.ropeFray!==profile.ropeFray;
      busy=true;profile=next;toggles={...toggles,...options};
      try {if(regroom)buildFibres();if(rebuild)await replaceRenderer();ensure();ready=true;draw();ensure();}
      catch(error){fail();throw error;}
      finally{busy=false;}
    },
  });
}

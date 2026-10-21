import { loadGltfModel } from '../src/index.js';
import { registerAdapterContract } from './helpers/gltf-adapter-contract.js';
registerAdapterContract('source public export', loadGltfModel);

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createProductStudioMeshes} from '../src/index.js';
import {adapterFixture} from './helpers/gltf-adapter-contract.js';
import {isModelConversionEnabled} from '../src/feature-flags.js';

test('all ten tracked showcase assets preserve exact renderer and physics output through adapter',async t=>{
  for(const name of readdirSync(new URL('../assets/',import.meta.url)).filter(n=>n.endsWith('.gltf'))){
    const bytes=readFileSync(new URL(`../assets/${name}`,import.meta.url));
    t.mock.method(globalThis,'fetch',async()=>new Response(bytes,{headers:{'content-type':'model/gltf+json'}}));
    const url=`https://example.test/assets/${name}`;
    const legacy=await loadGltfModel(url);
    const model=await loadGltfModel(url,{conversionEnabled:true});
    const {importProfile,...shape}=model;
    assert.equal(importProfile,'gltf-static-resources-v1',name);assert.deepEqual(shape,legacy,name);
    assert.deepEqual(createProductStudioMeshes(model),createProductStudioMeshes(legacy),name);
    t.mock.restoreAll();
  }
});

test('only explicit true remote snapshot decisions enable conversion',()=>{
  const k='gpu.model.conversion.enabled';
  for(const value of [{[k]:true},{flags:{[k]:true}},{enabled:{[k]:true}},{get:key=>key===k}])assert.equal(isModelConversionEnabled(value),true);
  for(const value of [null,{}, {[k]:'true'},{[k]:false},{flags:{[k]:false}},{get:()=>false}])assert.equal(isModelConversionEnabled(value),false);
});

test('WebP compatibility retains pixels, reused material identity and bounded SRI acquisition',async t=>{
  const fixture=adapterFixture(),url='https://example.test/model.gltf', imageUrl='https://example.test/authored.webp';
  fixture.document.extensionsUsed=['EXT_texture_webp'];fixture.document.extensionsRequired=['EXT_texture_webp'];
  fixture.document.meshes[0].primitives[0].attributes.TEXCOORD_0=1;
  const packed=new Uint8Array(fixture.bytes.length+24);packed.set(fixture.bytes);new Float32Array(packed.buffer,36).set([0,0,1,0,0,1]);fixture.bytes=packed;
  fixture.document.buffers[0].byteLength=packed.length;fixture.document.bufferViews.push({buffer:0,byteOffset:36,byteLength:24});fixture.document.accessors.push({bufferView:1,componentType:5126,count:3,type:'VEC2'});
  fixture.document.images=[{uri:'authored.webp'}];fixture.document.textures=[{extensions:{EXT_texture_webp:{source:0}}}];
  fixture.document.materials[0].pbrMetallicRoughness.baseColorTexture={index:0};
  const seen=[];t.mock.method(globalThis,'fetch',async (input,options)=>{
    seen.push([String(input),options]);return new Response(String(input)===url?JSON.stringify(fixture.document):String(input)===imageUrl?'webp-pixels':fixture.bytes,{headers:{'content-type':String(input)===url?'model/gltf+json':String(input)===imageUrl?'image/webp':'application/octet-stream'}});
  });
  const replace=(name,value)=>{const d=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});t.after(()=>d?Object.defineProperty(globalThis,name,d):delete globalThis[name]);};
  let bitmapWidth=1,closed=0;
  replace('createImageBitmap',async()=>({width:bitmapWidth,height:1,close(){closed++;}}));
  replace('OffscreenCanvas',class{getContext(){return {drawImage(){},getImageData(){return {data:new Uint8ClampedArray([12,84,120,255])};}};}});
  const integrity=Object.fromEntries([url,imageUrl,'https://example.test/mesh.bin'].map(u=>[u,'sha256-reviewed']));
  const model=await loadGltfModel(url,{conversionEnabled:true,integrity});
  assert.equal(model.importProfile,'legacy');assert.equal(model.compatibilityReason,'unsupported-gltf-feature');
  assert.deepEqual([...model.primitives[0].material.baseColorTexture.data],[12,84,120,255]);
  assert.equal(seen.filter(([u])=>u===url).length,1,'compatibility reuses exact admitted entry bytes');
  for(const [u,o] of seen)assert.equal(o.integrity,integrity[u]);
  const closedBefore=closed;bitmapWidth=4097;
  await assert.rejects(loadGltfModel(url,{conversionEnabled:true,integrity}));
  assert.ok(closed>closedBefore,'Rejected oversized bitmap is still closed');
});

test('enabled inline network fallback is explicit, cancellation/integrity never substitutes it',async t=>{
  const nativeFetch=globalThis.fetch,url='https://example.test/assets/brigantine.gltf';let requests=0;
  t.mock.method(globalThis,'fetch',async (input,options)=>{requests++;if(String(input)===url)throw new TypeError('network unavailable');return nativeFetch(input,options);});
  const model=await loadGltfModel(url,{conversionEnabled:true});
  assert.equal(model.importProfile,'legacy');assert.equal(model.compatibilityReason,'showcase-network-unavailable');assert.equal(requests,2);
  requests=0;await assert.rejects(loadGltfModel(url,{conversionEnabled:true,integrity:{[url]:'sha256-reviewed'}}));assert.equal(requests,1);
});

import {texturedAdapterFixture,glbFixture} from './helpers/gltf-adapter-contract.js';
test('textured JSON and GLB preserve every existing material slot, authored transforms and shared identity',async t=>{
  const f=texturedAdapterFixture();
  const replace=(name,value)=>{const d=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});t.after(()=>d?Object.defineProperty(globalThis,name,d):delete globalThis[name]);};
  replace('createImageBitmap',async()=>({width:1,height:1,close(){}}));replace('OffscreenCanvas',class{getContext(){return{drawImage(){},getImageData(){return {data:new Uint8ClampedArray([255,255,255,255])};}};}});
  for(const ext of ['gltf','glb']){
    const url=`https://example.test/model.${ext}`;
    t.mock.method(globalThis,'fetch',async input=>new Response(String(input)===url?(ext==='glb'?glbFixture(f.document,f.bytes):JSON.stringify(f.document)):String(input).endsWith('.png')?f.image:f.bytes,{headers:{'content-type':String(input)===url?(ext==='glb'?'model/gltf-binary':'model/gltf+json'):String(input).endsWith('.png')?'image/png':'application/octet-stream'}}));
    const legacy=await loadGltfModel(url);const model=await loadGltfModel(url,{conversionEnabled:true});
    const {importProfile,...shape}=model;assert.equal(importProfile,'gltf-static-resources-v1');assert.deepEqual(shape,legacy);
    assert.strictEqual(model.primitives[0].material,model.primitives[1].material);
    assert.equal(Object.keys(model.primitives[0].material).filter(k=>k.endsWith('Texture')&&model.primitives[0].material[k]).length,17);
    assert.deepEqual(createProductStudioMeshes(model),createProductStudioMeshes(legacy));t.mock.restoreAll();
  }
});

test('redirected entry resolves nested resources from the final URL without losing SRI',async t=>{
  const f=adapterFixture(),entry='https://example.test/model.gltf',final='https://cdn.example.test/nested/model.gltf',buffer='https://cdn.example.test/nested/mesh.bin',seen=[];
  t.mock.method(globalThis,'fetch',async (url,options)=>{
    seen.push([String(url),options]);const response=new Response(String(url)===entry?JSON.stringify(f.document):f.bytes,{headers:{'content-type':String(url)===entry?'model/gltf+json':'application/octet-stream'}});
    if(String(url)===entry)Object.defineProperty(response,'url',{value:final});return response;
  });
  const model=await loadGltfModel(entry,{conversionEnabled:true,integrity:{[entry]:'sha256-entry',[buffer]:'sha256-buffer'}});
  assert.equal(model.importProfile,'gltf-static-resources-v1');assert.deepEqual(seen.map(x=>x[0]),[entry,buffer]);assert.equal(seen[1][1].integrity,'sha256-buffer');
});

test('malformed encoded images fail validation without retry or compatibility downgrade',async t=>{
  const f=texturedAdapterFixture(),seen=[];
  t.mock.method(globalThis,'fetch',async input=>{seen.push(String(input));return new Response(String(input).endsWith('.gltf')?JSON.stringify(f.document):String(input).endsWith('.png')?new Uint8Array([0,1,2]):f.bytes,{headers:{'content-type':String(input).endsWith('.gltf')?'model/gltf+json':String(input).endsWith('.png')?'image/png':'application/octet-stream'}});});
  await assert.rejects(loadGltfModel('https://example.test/model.gltf',{conversionEnabled:true}));
  assert.deepEqual(seen,['https://example.test/model.gltf','https://example.test/mesh.bin','https://example.test/pixel.png']);
});

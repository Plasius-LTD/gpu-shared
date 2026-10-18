import assert from 'node:assert/strict';
import test from 'node:test';
import {loadGltfModel} from '../src/gltf-loader.js';
import {createProductStudioMeshes} from '../src/product-studio-runtime.js';

function modelDocument(assignments) {
  const positions=new Float32Array([0,0,0,1,0,0,0,1,0]);
  return {asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],
    meshes:[{primitives:assignments.map(material=>({attributes:{POSITION:0},...(material===undefined?{}:{material})}))}],
    materials:[{name:'Wood',pbrMetallicRoughness:{baseColorTexture:{index:0},roughnessFactor:0.7}},
      {name:'Other finish',pbrMetallicRoughness:{baseColorTexture:{index:0},roughnessFactor:0.2}}],
    images:[{uri:'surface.png'}],textures:[{source:0}],
    buffers:[{uri:'data:application/octet-stream;base64,'+Buffer.from(positions.buffer).toString('base64'),byteLength:positions.byteLength}],
    bufferViews:[{buffer:0,byteLength:positions.byteLength}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}]};
}
async function fixture(t,assignments) {
  const document=modelDocument(assignments);
  t.mock.method(globalThis,'fetch',async url=>String(url).endsWith('.png')
    ? {ok:true,blob:async()=>new Blob([new Uint8Array([1])])}
    : {ok:true,url:'https://example.test/model.gltf',json:async()=>document});
  const priorBitmap=globalThis.createImageBitmap,priorCanvas=globalThis.OffscreenCanvas;
  globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
  globalThis.OffscreenCanvas=class {getContext(){return {drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([74,38,15,255])})};}};
  t.after(()=>{globalThis.createImageBitmap=priorBitmap;globalThis.OffscreenCanvas=priorCanvas;});
  return ()=>loadGltfModel('https://example.test/model.gltf');
}
test('repeated material assignments preserve a single texture identity through mesh conversion',async t=>{
  const load=await fixture(t,Array(263).fill(0)),model=await load();
  assert.equal(model.primitives.length,263);
  assert.equal(new Set(model.primitives.map(p=>p.material)).size,1);
  const meshes=createProductStudioMeshes(model).filter(mesh=>mesh.id>=1000);
  assert.equal(new Set(meshes.map(mesh=>mesh.baseColorTexture)).size,1);
  assert.deepEqual([...meshes[0].baseColorTexture.data],[74,38,15,255]);
  assert.equal(meshes[0].roughness,0.7);
});
test('different material slots remain separate and caching is scoped to one model load',async t=>{
  const load=await fixture(t,[0,1,0,undefined,undefined]),first=await load(),second=await load();
  const materials=first.primitives.map(p=>p.material);
  assert.equal(materials[0],materials[2]);
  assert.notEqual(materials[0],materials[1]);
  assert.equal(materials[1].roughness,0.2);
  assert.equal(materials[3],materials[4]);
  assert.notEqual(materials[0],second.primitives[0].material);
  assert.notEqual(materials[0].baseColorTexture,second.primitives[0].material.baseColorTexture);
  assert.ok(Object.isFrozen(materials[0]));
});

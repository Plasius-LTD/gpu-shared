import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGltfModel } from '../src/gltf-loader.js';

function fixture(t, texture) {
  const positions = new Float32Array([0,0,0,1,0,0,0,1,0]);
  const document = {
    asset: {version:'2.0'}, scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],
    materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0}},normalTexture:{index:0,scale:0.7}}],
    images:[{uri:'fallback.png'},{uri:'authored.webp'}], textures:[texture],
    buffers:[{uri:'data:application/octet-stream;base64,'+Buffer.from(positions.buffer).toString('base64'),byteLength:positions.byteLength}],
    bufferViews:[{buffer:0,byteLength:positions.byteLength}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'}],
  };
  t.mock.method(globalThis,'fetch',async url => String(url).endsWith('.gltf')
    ? {ok:true,url:'https://example.test/model.gltf',json:async()=>document}
    : {ok:true,blob:async()=>new Blob([String(url).endsWith('.webp')?'webp':'png'])});
  const bitmap=globalThis.createImageBitmap, canvas=globalThis.OffscreenCanvas;
  globalThis.createImageBitmap=async blob=>({width:1,height:1,kind:await blob.text(),close(){}});
  globalThis.OffscreenCanvas=class {
    getContext(){let kind;return {drawImage(image){kind=image.kind;},getImageData:()=>({data:new Uint8ClampedArray(kind==='webp'?[12,84,120,255]:[200,10,10,255])})};}
  };
  t.after(()=>{globalThis.createImageBitmap=bitmap;globalThis.OffscreenCanvas=canvas;});
  return ()=>loadGltfModel('https://example.test/model.gltf');
}

test('required WebP source binds decoded authored pixels without a core fallback',async t=>{
  const model=await fixture(t,{extensions:{EXT_texture_webp:{source:1}}})();
  const material=model.primitives[0].material;
  assert.deepEqual([...material.baseColorTexture.data],[12,84,120,255]);
  assert.deepEqual([...material.normalTexture.data],[12,84,120,255]);
  assert.equal(material.normalTexture.scale,0.7);
});
test('declared WebP source takes precedence over the optional core image',async t=>{
  const model=await fixture(t,{source:0,extensions:{EXT_texture_webp:{source:1}}})();
  assert.deepEqual([...model.primitives[0].material.baseColorTexture.data],[12,84,120,255]);
});
test('core source remains unchanged when WebP is not declared',async t=>{
  const model=await fixture(t,{source:0})();
  assert.deepEqual([...model.primitives[0].material.baseColorTexture.data],[200,10,10,255]);
});
for(const source of [undefined,-1,0.5,2,'1']){
  test(`invalid declared WebP image ${source} fails instead of silently using a fallback`,async t=>{
    await assert.rejects(fixture(t,{source:0,extensions:{EXT_texture_webp:{source}}})(),/WebP texture source/);
  });
}

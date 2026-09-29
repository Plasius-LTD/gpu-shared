import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGltfModel} from '../src/gltf-loader.js';
import {createProductStudioMeshes} from '../src/product-studio-runtime.js';

async function load({set=1,override,missing=false,badLength=false,doubleSided,textureTransform,wrapS}={}){
 const bytes=new ArrayBuffer(84),f=new Float32Array(bytes);
 f.set([0,0,0,1,0,0,0,1,0, 0,0,1,0,0,1]);
 const v=new DataView(bytes);for(let i=0;i<3;i++){v.setUint16(60+i*8,65535,true);v.setUint16(62+i*8,32768,true);}
 const doc={asset:{version:'2.0'},scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,TEXCOORD_0:1,...missing?{}:{TEXCOORD_1:2}},material:0}]}],
  materials:[{doubleSided,occlusionTexture:{index:0,texCoord:set,...override===undefined&&textureTransform===undefined?{}:{extensions:{KHR_texture_transform:{...textureTransform,...override===undefined?{}:{texCoord:override}}}}}}],textures:[{source:0,sampler:0}],samplers:[{wrapS}],images:[{uri:'map.png'}],
  buffers:[{uri:'mesh.bin',byteLength:84}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:24},{buffer:0,byteOffset:60,byteLength:24,byteStride:8}],
  accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5126,count:3,type:'VEC2'},{bufferView:2,componentType:5123,normalized:true,count:badLength?2:3,type:'VEC2'}]};
 const saved={fetch:globalThis.fetch,createImageBitmap:globalThis.createImageBitmap,OffscreenCanvas:globalThis.OffscreenCanvas};
 globalThis.fetch=async url=>String(url).endsWith('mesh.bin')?{ok:true,arrayBuffer:async()=>bytes}:String(url).endsWith('map.png')?{ok:true,blob:async()=>new Blob()}:{ok:true,url:'https://example.test/a.gltf',json:async()=>doc};
 globalThis.createImageBitmap=async()=>({width:4,height:4,close(){}});
 globalThis.OffscreenCanvas=class{getContext(){return{drawImage(){},getImageData(){return{data:Uint8ClampedArray.from({length:64},(_,i)=>i*3)};}};}};
 try{return await loadGltfModel('https://example.test/a.gltf');}finally{Object.assign(globalThis,saved);}
}
test('glTF preserves normalized strided UV1 separately through Product Studio',async()=>{
 const model=await load(),p=model.primitives[0],mesh=createProductStudioMeshes(model).at(-1);
 assert.deepEqual(p.uvs,[0,0,1,0,0,1]);assert.deepEqual(p.uvs1,[1,32768/65535,1,32768/65535,1,32768/65535]);
 assert.deepEqual(mesh.uvs1,p.uvs1);assert(Object.isFrozen(mesh.uvs1));assert.equal(mesh.occlusionTexture.texCoord,1);
});
test('texture transforms preserve original pixels and metadata through Product Studio',async()=>{
 const transform={offset:[-3,3],scale:[7,7],rotation:0.2};
 const model=await load({textureTransform:transform,wrapS:33648}),texture=model.primitives[0].material.occlusionTexture;
 assert.deepEqual(texture.data,Uint8ClampedArray.from({length:64},(_,i)=>i*3));
 assert.deepEqual(texture.transform,transform);assert.equal(texture.wrapS,33648);assert.equal(texture.wrapT,10497);
 assert.equal(texture.width,4);assert.equal(createProductStudioMeshes(model).at(-1).occlusionTexture,texture);
 assert(Object.isFrozen(texture.transform));
});
test('invalid transforms and wrap modes reject instead of silently baking defaults',async()=>{
 for(const textureTransform of [{scale:[1,NaN]},{offset:[1]},{rotation:Infinity}])await assert.rejects(()=>load({textureTransform}),/transform/);
 await assert.rejects(()=>load({wrapS:7}),/wrap/);
});
test('texture transform UV override takes precedence; UV0 remains valid',async()=>{
 assert.equal((await load({set:0,override:1})).primitives[0].material.occlusionTexture.texCoord,1);
 assert.equal((await load({set:1,override:0,missing:true})).primitives[0].material.occlusionTexture.texCoord,0);
});
test('missing, malformed or unsupported referenced UV sets fail closed',async()=>{
 for(const options of [{missing:true},{badLength:true},{set:2},{set:-1},{set:0,override:3}])await assert.rejects(()=>load(options),/UV|texCoord|TEXCOORD/);
});
test('authored glTF sidedness and the single-sided default reach Product Studio meshes',async()=>{
 for(const doubleSided of [undefined,false,true]){
  const model=await load({doubleSided}),mesh=createProductStudioMeshes(model).at(-1);
  assert.equal(model.primitives[0].material.doubleSided,doubleSided===true);
  assert.equal(mesh.doubleSided,doubleSided===true);
 }
 await assert.rejects(()=>load({doubleSided:'false'}),/doubleSided/);
});

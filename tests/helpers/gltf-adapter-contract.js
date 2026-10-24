import test from 'node:test';
import assert from 'node:assert/strict';

export function adapterFixture() {
  const values = new Float32Array([2,3,4,3,3,4,2,4,4]);
  const bytes = new Uint8Array(values.buffer);
  const document = {
    asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],
    nodes:[{name:'authored-origin',translation:[8,-2,5],children:[1],extras:{physics:{mass:12}}},{mesh:0,name:'mesh-child'}],
    meshes:[{primitives:[{attributes:{POSITION:0},material:0}]}],materials:[{name:'authored',pbrMetallicRoughness:{baseColorFactor:[0.2,0.3,0.4,1],metallicFactor:0,roughnessFactor:0.6}}],
    buffers:[{uri:'mesh.bin',byteLength:bytes.length}],bufferViews:[{buffer:0,byteLength:bytes.length}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[2,3,4],max:[3,4,4]}],
  };
  return {document,bytes};
}
export function registerAdapterContract(label, load) {
  test(`${label}: adapter migration`, async t => {
    let current=adapterFixture(), calls=[], respond;
    const modelUrl='https://example.test/folder/model.gltf';
    t.mock.method(globalThis,'fetch',async (url,options)=>{
      calls.push([String(url),options]);
      return respond(String(url),options);
    });
    const reset=()=>{
      current=adapterFixture();calls=[];
      respond=async url=>new Response(url===modelUrl?JSON.stringify(current.document):current.bytes,
        {headers:{'content-type':url===modelUrl?'model/gltf+json':'application/octet-stream'}});
    };
    const enabled={conversionEnabled:true};
    await t.test('enabled uses public adapter and preserves source origin, winding, names and physics',{timeout:2000},async()=>{
      reset();const legacy=await load(modelUrl);calls=[];
      const model=await load(modelUrl,enabled);
      assert.equal(model.importProfile,'gltf-static-resources-v1');
      const {importProfile,...shape}=model;assert.deepEqual(shape,legacy);
      assert.deepEqual(model.positions,[10,1,9,11,1,9,10,2,9]);
      assert.deepEqual(model.physics,{mass:12});
      assert.deepEqual(calls.map(x=>x[0]),[modelUrl,'https://example.test/folder/mesh.bin']);
    });
    await t.test('disabled/absent retains legacy compatibility without import metadata',{timeout:2000},async()=>{
      reset();const absent=await load(modelUrl);const disabled=await load(modelUrl,{conversionEnabled:false});
      assert.deepEqual(disabled,absent);assert.equal(disabled.importProfile,undefined);
    });
    await t.test('enabled rejects malformed source rather than using the permissive legacy parser',{timeout:2000},async()=>{
      reset();current.document.asset.version='1.0';
      await assert.rejects(load(modelUrl,enabled));assert.equal(calls.length,1);
    });
    await t.test('enabled never caches mutable external-resource revisions',{timeout:2000},async()=>{
      reset();const first=await load(modelUrl,enabled);
      const changed=new Float32Array(current.bytes.buffer.slice(0));changed[0]=2.5;current.bytes=new Uint8Array(changed.buffer);
      const second=await load(modelUrl,enabled);
      assert.notDeepEqual(first.positions,second.positions);assert.equal(second.positions[0],10.5);
      assert.equal(calls.length,4);
    });
    await t.test('missing nested SRI rejects before its request with no legacy or inline fallback',{timeout:2000},async()=>{
      reset();await assert.rejects(load(modelUrl,{...enabled,integrity:{[modelUrl]:'sha256-reviewed'}}));
      assert.deepEqual(calls.map(x=>x[0]),[modelUrl]);
    });
    await t.test('same SRI policy reaches every external request',{timeout:2000},async()=>{
      reset();const integrity={[modelUrl]:'sha256-model','https://example.test/folder/mesh.bin':'sha384-buffer'};
      await load(modelUrl,{...enabled,integrity});
      assert.equal(calls.length,2);for(const [url,options] of calls)assert.equal(options.integrity,integrity[url]);
    });
    await t.test('nonboolean conversion decision fails before request',{timeout:2000},async()=>{
      reset();await assert.rejects(load(modelUrl,{conversionEnabled:'true'}));assert.equal(calls.length,0);
    });
    for (const [reasonName, reason] of [
      ['default', undefined],
      ['error', new Error('SYNTHETIC_ABORT_CANARY')],
      ['string', 'SYNTHETIC_ABORT_CANARY'],
      ['object', Object.freeze({ detail: 'SYNTHETIC_ABORT_CANARY' })],
      ['hostile', Object.freeze({ toString() { throw new Error('reason must not be coerced'); },
        toJSON() { throw new Error('reason must not be serialized'); } })],
    ]) {
      await t.test(`pre-abort ${reasonName} is bounded before network or showcase fallback`,{timeout:2000},async()=>{
        reset();const controller=new AbortController();controller.abort(reason);
        for (const url of [modelUrl, 'https://example.test/assets/brigantine.gltf']) {
          await assert.rejects(load(url,{...enabled,signal:controller.signal}),error=>{
            assert.ok(error instanceof Error);
            assert.notStrictEqual(error, controller.signal.reason);
            assert.equal(error.name,'GltfAdapterLoadError');
            assert.equal(error.code,'aborted-or-timeout');
            assert.equal(error.message,'glTF adapter loading failed: aborted-or-timeout.');
            assert.equal(error.cause,undefined);
            assert.deepEqual(Object.keys(error).sort(),['code','name']);
            assert.equal(JSON.stringify(error).includes('SYNTHETIC_ABORT_CANARY'),false);
            return true;
          });
        }
        assert.equal(calls.length,0);
      });
    }
    await t.test('disabled/absent pre-abort retains legacy reason identity',{timeout:2000},async()=>{
      reset();const reason=new Error('SYNTHETIC_LEGACY_REASON');
      const controller=new AbortController();controller.abort(reason);
      for (const options of [{},{conversionEnabled:false}]) {
        await assert.rejects(load(modelUrl,{...options,signal:controller.signal}),error=>error===reason);
      }
      assert.equal(calls.length,0);
    });
    await t.test('mid-acquisition abort stops an ignoring fetch without retry',{timeout:2000},async()=>{
      reset();const controller=new AbortController();respond=async()=>{controller.abort();return new Promise(()=>{});};
      await assert.rejects(load(modelUrl,{...enabled,signal:controller.signal}),{name:'GltfAdapterLoadError',code:'aborted-or-timeout'});assert.equal(calls.length,1);
    });
    await t.test('bounded deadline stops an ignoring fetch without retry',{timeout:2000},async()=>{
      reset();respond=async()=>new Promise(()=>{});
      await assert.rejects(load(modelUrl,{...enabled,timeoutMs:20}),{name:'GltfAdapterLoadError',code:'aborted-or-timeout'});assert.equal(calls.length,1);
    });
    await t.test('entrypoint byte budget rejects and cancels stream before parsing',{timeout:2000},async()=>{
      reset();let cancelled=false;
      respond=async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(4096));},cancel(){cancelled=true;}}));
      await assert.rejects(load(modelUrl,{...enabled,maxInputBytes:64}));assert.equal(calls.length,1);assert.equal(cancelled,true);
    });
    await t.test('invalid raised/zero/noninteger budgets fail before request',{timeout:2000},async()=>{
      for(const maxInputBytes of [0,1.5,32*1024*1024]){reset();await assert.rejects(load(modelUrl,{...enabled,maxInputBytes}));assert.equal(calls.length,0);}
    });
  });
}

export function texturedAdapterFixture() {
  const f=adapterFixture(),packed=new Uint8Array(144);packed.set(f.bytes);
  new Float32Array(packed.buffer,36).set([0,0,1,0,0,1,0,0,1]);
  new Float32Array(packed.buffer,72).set([0,0,1,0,0,1]);
  new Float32Array(packed.buffer,96).set([1,0,0,1,0,1,0,1,0,0,1,1]);
  f.bytes=packed;f.document.buffers[0].byteLength=packed.length;
  f.document.bufferViews.push({buffer:0,byteOffset:36,byteLength:36},{buffer:0,byteOffset:72,byteLength:24},{buffer:0,byteOffset:96,byteLength:48});
  f.document.accessors.push({bufferView:1,componentType:5126,count:3,type:'VEC3'},{bufferView:2,componentType:5126,count:3,type:'VEC2'},{bufferView:3,componentType:5126,count:3,type:'VEC4'});
  const p=f.document.meshes[0].primitives[0];p.attributes={POSITION:0,NORMAL:1,TEXCOORD_0:2,COLOR_0:3};f.document.meshes[0].primitives.push(structuredClone(p));
  f.image=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));
  f.document.images=[{uri:'pixel.png'}];f.document.textures=[{source:0}];
  const m=f.document.materials[0],ref={index:0,extensions:{KHR_texture_transform:{offset:[0.25,-0.5],scale:[2,0.5],rotation:0.4}}};
  m.pbrMetallicRoughness.baseColorTexture=ref;m.pbrMetallicRoughness.metallicRoughnessTexture={index:0};m.normalTexture={index:0,scale:0.7};m.occlusionTexture={index:0,strength:0.4};m.emissiveTexture={index:0};m.emissiveFactor=[0.1,0.2,0.3];
  m.extensions={KHR_materials_specular:{specularFactor:0.8,specularColorFactor:[0.5,0.6,0.7],specularTexture:{index:0},specularColorTexture:{index:0}},KHR_materials_clearcoat:{clearcoatFactor:0.6,clearcoatRoughnessFactor:0.2,clearcoatTexture:{index:0},clearcoatRoughnessTexture:{index:0},clearcoatNormalTexture:{index:0}},KHR_materials_transmission:{transmissionFactor:0.3,transmissionTexture:{index:0}},KHR_materials_sheen:{sheenColorFactor:[0.2,0.3,0.4],sheenRoughnessFactor:0.7,sheenColorTexture:{index:0},sheenRoughnessTexture:{index:0}},KHR_materials_volume:{thicknessFactor:0.5,thicknessTexture:{index:0}},KHR_materials_iridescence:{iridescenceFactor:0.4,iridescenceTexture:{index:0},iridescenceThicknessTexture:{index:0}},KHR_materials_anisotropy:{anisotropyStrength:0.3,anisotropyTexture:{index:0}},KHR_materials_dispersion:{dispersion:0.2},KHR_materials_ior:{ior:1.7}};
  f.document.extensionsUsed=[...Object.keys(m.extensions),'KHR_texture_transform'];return f;
}

export function glbFixture(document,bytes) {
  const d=structuredClone(document);delete d.buffers[0].uri;
  const json=new TextEncoder().encode(JSON.stringify(d)),j=(json.length+3)&~3,b=(bytes.length+3)&~3;
  const output=new Uint8Array(28+j+b),view=new DataView(output.buffer);
  [0x46546c67,2,output.length,j,0x4e4f534a].forEach((n,i)=>view.setUint32(i*4,n,true));output.fill(32,20,20+j);output.set(json,20);view.setUint32(20+j,b,true);view.setUint32(24+j,0x004e4942,true);output.set(bytes,28+j);return output;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMaterialStudy } from '../src/material-study.js';
test('isolated entry imports without DOM/GPU and rejects unreviewed assets before allocation',async()=>{
 assert.equal(typeof createMaterialStudy,'function');
 await assert.rejects(createMaterialStudy({modelUrl:'https://example.test/other.gltf'}),/reviewed/);
 const barrel=await readFile(new URL('../src/index.js',import.meta.url),'utf8');
 assert.ok(!barrel.includes('material-study'));
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  packShowcaseSurfaces,
  loadNativeShowcaseRenderer,
} from "../src/native-showcase.js";

test("world geometry retains individual vertex normals and material response", () => {
  const packed = packShowcaseSurfaces([
    {
      worldPoints: [
        { x: 1, y: 2, z: 3 },
        { x: 2, y: 3, z: 4 },
        { x: 3, y: 4, z: 5 },
      ],
      vertexNormals: [
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
      ],
      normal: { x: 0, y: 1, z: 0 },
      baseColor: { r: 0.1, g: 0.2, b: 0.3 },
      material: { name: "weathered-wood", roughness: 0.8, metallic: 0.1 },
    },
  ]);
  assert.equal(packed.length, 36);
  assert.deepEqual([...packed.slice(0, 6)], [1, 2, 3, 0, 1, 0]);
  assert.deepEqual([...packed.slice(15, 18)], [1, 0, 0]);
  assert.equal(packed[11], 1);
  assert.ok(Math.abs(packed[9] - 0.8) < 0.00001);
});

test("native loading is gated and unavailable WebGPU does not acquire a canvas context", async () => {
  let loads = 0;
  const loader = async () => {
    loads++;
    return { createNativeSceneRenderer: async () => ({}) };
  };
  assert.equal(
    await loadNativeShowcaseRenderer({ enabled: false, loader }),
    null,
  );
  assert.equal(
    await loadNativeShowcaseRenderer({ enabled: true, navigator: {}, loader }),
    null,
  );
  assert.equal(loads, 0);
  await loadNativeShowcaseRenderer({
    enabled: true,
    navigator: { gpu: {} },
    loader,
  });
  assert.equal(loads, 1);
});

test("native initialization errors remain visible and cannot silently report a fallback as GPU", async () => {
  await assert.rejects(
    loadNativeShowcaseRenderer({
      enabled: true,
      navigator: { gpu: {} },
      loader: async () => ({}),
    }),
    /native surface/i,
  );
});

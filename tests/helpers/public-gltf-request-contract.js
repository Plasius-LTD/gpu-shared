import test from "node:test";
import assert from "node:assert/strict";

const modelUrl = "https://example.test/model.gltf";
const bufferUrl = "https://example.test/mesh.bin";
const imageUrl = "https://example.test/color.png";
const fallbackUrl = "https://example.test/assets/brigantine.gltf";
const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
const bytes = new Float32Array(positions).buffer;
const document = {
  asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: "request-contract" }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
  buffers: [{ uri: "mesh.bin", byteLength: bytes.byteLength }],
  bufferViews: [{ buffer: 0, byteLength: bytes.byteLength }],
  accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }],
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 } } }],
  textures: [{ source: 0 }], images: [{ uri: "color.png" }],
};
const integrity = Object.freeze({
  [modelUrl]: "sha256-model-reviewed",
  [bufferUrl]: "sha256-buffer-reviewed",
  [imageUrl]: "sha256-image-reviewed",
});

// These tests verify forwarding/admission, not a replacement implementation of
// browser SRI or image decoding. Only the platform boundaries are synthetic.
export function registerGltfRequestContract(label, loadGltfModel) {
  test(`${label}: public glTF request policy`, async (t) => {
    let seen;
    let respond;
    t.mock.method(globalThis, "fetch", async (url, options) => {
      seen.push([String(url), options]);
      return respond(String(url), options);
    });
    const replace = (name, value) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
      t.after(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
    };
    replace("createImageBitmap", async () => ({
      width: 1, height: 1, close() {},
    }));
    replace("OffscreenCanvas", class {
      getContext() {
        return { drawImage() {}, getImageData: () => ({ data: new Uint8ClampedArray([1, 2, 3, 255]) }) };
      }
    });
    const reset = () => {
      seen = [];
      respond = async (url) => {
        if (url === modelUrl) return { ok: true, url, json: async () => structuredClone(document) };
        if (url === bufferUrl) return { ok: true, arrayBuffer: async () => bytes.slice(0) };
        if (url === imageUrl) return { ok: true, blob: async () => new Blob(["synthetic-pixels"]) };
        throw new Error("Unexpected resource request");
      };
    };

    await t.test("pre-abort rejects before any request", async () => {
      reset();
      const controller = new AbortController(); controller.abort();
      await assert.rejects(loadGltfModel(modelUrl, { signal: controller.signal }), { name: "AbortError" });
      assert.equal(seen.length, 0);
    });
    await t.test("empty manifest rejects before the top-level request", async () => {
      reset();
      await assert.rejects(loadGltfModel(modelUrl, { integrity: {} }), /integrity manifest/);
      assert.equal(seen.length, 0);
    });
    for (const [missing, permitted] of [[bufferUrl, [modelUrl]], [imageUrl, [modelUrl, bufferUrl]]]) {
      await t.test(`unlisted ${missing === bufferUrl ? "buffer" : "image"} rejects before its request`, async () => {
        reset();
        const manifest = { ...integrity }; delete manifest[missing];
        await assert.rejects(loadGltfModel(modelUrl, { integrity: manifest }), /integrity manifest/);
        assert.deepEqual(seen.map(([url]) => url), permitted);
      });
    }
    await t.test("the same signal and declared digest reach model, buffer and image", async () => {
      reset();
      const controller = new AbortController();
      const model = await loadGltfModel(new URL(modelUrl), { signal: controller.signal, integrity });
      assert.deepEqual(seen.map(([url]) => url), [modelUrl, bufferUrl, imageUrl]);
      for (const [url, options] of seen) {
        assert.equal(options.signal, controller.signal);
        assert.equal(options.integrity, integrity[url]);
      }
      assert.deepEqual(model.positions, positions);
      assert.deepEqual([...model.primitives[0].material.baseColorTexture.data], [1, 2, 3, 255]);
    });
    await t.test("mid-load abort stops nested requests and fallback", async () => {
      reset();
      const controller = new AbortController();
      respond = async (url) => {
        controller.abort();
        return { ok: true, url, json: async () => structuredClone(document) };
      };
      await assert.rejects(loadGltfModel(fallbackUrl, { signal: controller.signal }), { name: "AbortError" });
      assert.deepEqual(seen.map(([url]) => url), [fallbackUrl]);
    });
    await t.test("integrity network rejection never substitutes inline brigantine", async () => {
      reset();
      const rejected = new TypeError("synthetic SRI rejection");
      respond = async () => { throw rejected; };
      await assert.rejects(loadGltfModel(fallbackUrl, { integrity: { [fallbackUrl]: "sha256-reviewed" } }), error => error === rejected);
      assert.deepEqual(seen.map(([url]) => url), [fallbackUrl]);
    });
    await t.test("ordinary one-argument calls still load geometry", async () => {
      reset();
      const model = await loadGltfModel(modelUrl);
      assert.deepEqual(model.positions, positions);
      assert.deepEqual(seen.map(([url]) => url), [modelUrl, bufferUrl, imageUrl]);
    });
    await t.test("ordinary network failure retains the approved inline fallback", async () => {
      reset();
      respond = async (url) => {
        if (url === fallbackUrl) throw new TypeError("synthetic unavailable showcase");
        assert.match(url, /^data:application\/json/u);
        const encoded = url.slice(url.indexOf(",") + 1);
        return { ok: true, url, json: async () => JSON.parse(url.slice(0, url.indexOf(",")).endsWith(";base64") ? atob(encoded) : decodeURIComponent(encoded)) };
      };
      const model = await loadGltfModel(fallbackUrl);
      assert.ok(model.positions.length > 0);
      assert.equal(seen.length, 2);
      assert.ok(model.primitives.length > 0);
    });
  });
}

import { createRequire } from "node:module";
import test from "node:test";
import assert from "node:assert/strict";
import { loadGltfModel } from "@plasius/gpu-shared";
import { createMaterialStudy } from "@plasius/gpu-shared/material-study";
import { registerGltfRequestContract } from "./request-contract.mjs";

registerGltfRequestContract("packed ESM export", loadGltfModel);
registerGltfRequestContract("packed CJS export", createRequire(import.meta.url)("@plasius/gpu-shared").loadGltfModel);

import { registerAdapterContract } from "./adapter-contract.mjs";
registerAdapterContract("packed ESM export", loadGltfModel);
registerAdapterContract("packed CJS export", createRequire(import.meta.url)("@plasius/gpu-shared").loadGltfModel);

for (const [format, create] of [
  ["ESM", createMaterialStudy],
  ["CJS", createRequire(import.meta.url)("@plasius/gpu-shared/material-study").createMaterialStudy],
]) test(`packed ${format} material-study initialization rejects without terminal host notification`, async () => {
  const events = [];
  await assert.rejects(create({ modelUrl: "https://example.test/other.gltf", onUnavailable: event => events.push(event) }), /reviewed/);
  assert.deepEqual(events, []);
});

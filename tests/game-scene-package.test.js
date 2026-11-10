import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import configuration from "../tsup.config.ts";

test("game scene has a separately built public ESM and CommonJS entry", async () => {
  assert.ok(configuration.entry.includes("src/game-scene.js"));
  for (const entry of [await import("@plasius/gpu-shared/game-scene"), createRequire(import.meta.url)("@plasius/gpu-shared/game-scene")]) {
    assert.equal(await entry.createGameSceneAdapter({ enabled: false }), null);
    assert.equal(typeof entry.parseGameSceneSnapshot, "function");
    assert.equal(entry.GAME_SCENE_LIMITS.maxInstances, 2048);
  }
});

test("the game entry imports the renderer only dynamically and no showcase runtime", async () => {
  const result = await build({ entryPoints: ["src/game-scene.js"], bundle: true, format: "esm", platform: "browser",
    write: false, metafile: true, packages: "external", logLevel: "silent" });
  const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports);
  assert.deepEqual(imports.filter(entry => entry.path === "@plasius/gpu-renderer").map(entry => entry.kind), ["dynamic-import"]);
  assert.ok(!Object.keys(result.metafile.inputs).some(path => /showcase-runtime|model-inspection|product-studio/.test(path)));
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");

test("package exports keep the public gpu-shared runtime surface stable", () => {
  assert.deepEqual(packageJson.exports["."], {
    types: "./src/index.d.ts",
    import: "./dist/index.js",
    require: "./dist/index.cjs",
  });
  assert.equal(packageJson.exports["./assets/brigantine.gltf"], "./assets/brigantine.gltf");
});

test("readme documents package-surface imports for browser demos", () => {
  assert.match(readme, /import \{ mountGpuShowcase \} from "@plasius\/gpu-shared"/);
  assert.match(readme, /import map/i);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(path.join(repoRoot, "package-lock.json"), "utf8"));
const readme = readFileSync(path.join(repoRoot, "README.md"), "utf8");

function compareVersions(actual, expected) {
  const actualParts = actual.split(".").map((part) => Number.parseInt(part, 10));
  const expectedParts = expected.split(".").map((part) => Number.parseInt(part, 10));

  for (let index = 0; index < expectedParts.length; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const expectedPart = expectedParts[index] ?? 0;

    if (actualPart > expectedPart) {
      return 1;
    }

    if (actualPart < expectedPart) {
      return -1;
    }
  }

  return 0;
}

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

test("bundled lighting dependency uses the bundle-safe module URL release", () => {
  const dependencyRange = packageJson.dependencies["@plasius/gpu-lighting"];
  const lockedLighting = packageLock.packages["node_modules/@plasius/gpu-lighting"];
  const minimumVersion = dependencyRange.replace(/^[^^~]+/, "");

  assert.match(dependencyRange, /^\^0\.1\.\d+$/);
  assert.ok(lockedLighting, "package-lock.json must pin @plasius/gpu-lighting");
  assert.equal(compareVersions(lockedLighting.version, minimumVersion.slice(1)) >= 0, true);
});

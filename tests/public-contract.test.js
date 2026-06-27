import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const packageLock = JSON.parse(readFileSync(path.join(repoRoot, "package-lock.json"), "utf8"));
const showcaseRuntime = readFileSync(path.join(repoRoot, "src", "showcase-runtime.js"), "utf8");
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
  assert.equal(packageJson.exports["./assets/cutter.gltf"], "./assets/cutter.gltf");
  assert.equal(packageJson.exports["./assets/lighthouse.gltf"], "./assets/lighthouse.gltf");
  assert.equal(packageJson.exports["./assets/harbor-dock.gltf"], "./assets/harbor-dock.gltf");
  assert.equal(packageJson.exports["./assets/shoreline.gltf"], "./assets/shoreline.gltf");
});

test("readme documents package-surface imports for browser demos", () => {
  assert.match(readme, /import \{ mountGpuShowcase \} from "@plasius\/gpu-shared"/);
  assert.match(readme, /import map/i);
  assert.match(readme, /resolveShowcaseAssetUrl\("lighthouse"\)/);
  assert.match(readme, /gpuSharedTranslations/);
  assert.match(readme, /@plasius\/translations/);
});

test("showcase feature packages are adapter-injected from mount options", () => {
  const featureKeys = [
    "@plasius/gpu-cloth",
    "@plasius/gpu-fluid",
    "@plasius/gpu-lighting",
    "@plasius/gpu-performance",
    "@plasius/gpu-debug",
    "@plasius/gpu-physics",
  ];

  for (const featureKey of featureKeys) {
    assert.equal(packageJson.dependencies?.[featureKey], undefined);
    assert.equal(packageLock.packages[""]?.dependencies?.[featureKey], undefined);
    assert.equal(
      packageLock.packages["node_modules/@plasius/gpu-shared"]?.dependencies?.[featureKey],
      undefined
    );
  }

  assert.match(
    showcaseRuntime,
    /__showcaseFeatureLoaders/,
    "Runtime should resolve feature dependencies through injected loaders."
  );
  assert.match(
    showcaseRuntime,
    /resolveShowcaseFeatureLoaders\(/,
    "Runtime should provide a stable loader resolution path."
  );
});

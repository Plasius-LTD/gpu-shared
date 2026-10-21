import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, copyFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadGltfModel } from "../src/index.js";
import { registerGltfRequestContract } from "./helpers/public-gltf-request-contract.js";

registerGltfRequestContract("source root export", loadGltfModel);

test("fresh npm tarball preserves public ESM and CJS request policy", (t) => {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const directory = mkdtempSync(join(tmpdir(), "gpu-shared-loader-contract-"));
  const environment = { ...process.env };
  delete environment.NODE_TEST_CONTEXT;
  const run = (file, args, cwd = root) => execFileSync(file, args, { cwd, env: environment, encoding: "utf8", stdio: "pipe" });
  try {
    run(process.execPath, ["node_modules/tsup/dist/cli-default.js"]);
    const [archive] = JSON.parse(run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", directory]));
    run("tar", ["-xzf", join(directory, archive.filename), "-C", directory]);
    const packaged = join(directory, "package");
    // Only installed registry dependencies are reused; all package code and its
    // export map are read from the fresh tarball, outside the source checkout.
    symlinkSync(join(root, "node_modules"), join(packaged, "node_modules"), "dir");
    copyFileSync(join(root, "tests/helpers/public-gltf-request-contract.js"), join(packaged, "request-contract.mjs"));
    copyFileSync(join(root, "tests/helpers/packed-gltf-request-runner.mjs"), join(packaged, "request-runner.mjs"));
    t.diagnostic(run(process.execPath, ["--test", "request-runner.mjs"], packaged));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

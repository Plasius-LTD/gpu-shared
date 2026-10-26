import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("Getting-started scene loads generated geometry, preserves materials and releases owned resources", () => {
  const example = readFileSync(path.join(root, "README.md"), "utf8").match(/```js\n([\s\S]*?)\n```/)?.[1];
  assert.ok(example, "A complete getting-started module is required");
  const directory = mkdtempSync(path.join(root, ".readme-scene-"));
  try {
    const entry = pathToFileURL(path.join(root, "src/index.js")).href;
    writeFileSync(path.join(directory, "shared.mjs"), `
      import { mountGpuProductStudio as mount } from ${JSON.stringify(entry)};
      export const calls = { allocated: 0, destroy: 0, render: 0 };
      export async function mountGpuProductStudio(options) {
        return mount({ ...options, __lightingLoader: async () => null,
          __rendererLoader: async () => ({
            async createWavefrontPathTracingComputeRenderer(settings) {
              calls.options = settings;
              if (process.env.SCENE_FAILURE === "init") throw new Error("GPU unavailable");
              calls.allocated++;
              return {
                renderOnce() { calls.render++; if (process.env.SCENE_FAILURE === "draw") throw new Error("GPU unavailable"); return {}; },
                destroy() { calls.destroy++; },
              };
            },
          }),
        });
      }
    `);
    writeFileSync(path.join(directory, "scene.mjs"), example
      .replaceAll('"@plasius/gpu-shared"', '"./shared.mjs"'));
    writeFileSync(path.join(directory, "run.mjs"), `
      import assert from "node:assert/strict";
      import { calls } from "./shared.mjs";
      globalThis.HTMLElement = class {};
      const root = Object.assign(new HTMLElement(), {
        innerHTML: "<p>original host</p>", children: [], classList: {
          values: new Set(["caller-owned"]),
          add(value) { this.values.add(value); },
          remove(value) { this.values.delete(value); },
          contains(value) { return this.values.has(value); },
        },
        appendChild(child) { this.children.push(child); },
        replaceChildren() { this.children = []; },
      });
      const status = { textContent: "Loading" };
      globalThis.document = {
        querySelector: selector => selector === "#gallery" ? root : status,
        getElementById: () => null, head: { appendChild() {} },
        createElement: () => ({ dataset: {}, attributes: {},
          setAttribute(key, value) { this.attributes[key] = value; } }),
      };
      root.ownerDocument = document;
      const revoke = URL.revokeObjectURL;
      let revoked = 0;
      URL.revokeObjectURL = url => { revoked++; revoke(url); };
      const scene = await import("./scene.mjs");
      const sculptures = calls.options.meshes.filter(mesh => mesh.id >= 1000);
      assert.equal(sculptures.length, 3);
      assert.ok(sculptures.every(mesh => mesh.indices.length === 24));
      assert.equal(new Set(sculptures.map(mesh => mesh.positions[0])).size, 3);
      assert.deepEqual(sculptures.map(mesh => mesh.metallic), [0, 1, 0]);
      assert.deepEqual(sculptures.map(mesh => mesh.roughness), [0.85, 0.22, 0.32]);
      assert.equal(calls.options.meshes.length, 7);
      assert.ok(calls.options.samplesPerPixel > 0 && calls.options.samplesPerPixel <= 64);
      assert.equal(revoked, 1, "Release the generated Blob after loading on either path");
      if (process.env.SCENE_FAILURE) {
        assert.match(status.textContent, /GPU unavailable/);
        assert.equal(root.innerHTML, "<p>original host</p>");
        assert.deepEqual([...root.classList.values], ["caller-owned"]);
      } else {
        assert.equal(calls.render, 1);
        assert.match(status.textContent, /submitted/i);
        assert.match(root.children[0].attributes["aria-label"], /terracotta, copper and blue ceramic/);
      }
      scene.dispose();
      scene.dispose();
      assert.equal(calls.allocated, process.env.SCENE_FAILURE === "init" ? 0 : 1);
      assert.equal(calls.destroy, calls.allocated);
      assert.deepEqual([...root.classList.values], ["caller-owned"]);
    `);
    for (const failure of ["", "init", "draw"]) {
      const result = spawnSync(process.execPath, [path.join(directory, "run.mjs")], {
        cwd: root, encoding: "utf8", timeout: 30000,
        env: { ...process.env, SCENE_FAILURE: failure },
      });
      assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Consumer JavaScript examples typecheck against the public package declarations", () => {
  const readme = ["README.md", "docs/guides/model-inspection.md", "docs/guides/showcase-integration.md", "docs/guides/material-study.md", "docs/guides/feedback-diagnostics.md"]
    .map(file => readFileSync(path.join(root, file), "utf8")).join("\n");
  const examples = [...readme.matchAll(/```js\n([\s\S]*?)\n```/g)];
  assert.ok(examples.length > 0, "The package needs an executable usage example");
  const directory = mkdtempSync(path.join(root, ".readme-examples-"));
  try {
    const files = examples.map((match, index) => {
      const file = path.join(directory, `example-${index + 1}.mjs`);
      writeFileSync(file, `${match[1]}\nexport {};\n`);
      return file;
    });
    const result = spawnSync(process.execPath, [
      path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--allowJs", "--checkJs", "--skipLibCheck",
      "--target", "ES2022", "--module", "NodeNext",
      "--moduleResolution", "NodeNext", ...files,
    ], { cwd: root, encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

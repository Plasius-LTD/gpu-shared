import test from "node:test";
import assert from "node:assert/strict";

import { mountGpuAnimationAdventure } from "../src/index.js";

function createFakeDocument() {
  const styleElements = new Map();
  const root = {
    innerHTML: "<p>previous</p>",
    children: [],
    classList: {
      values: new Set(),
      add(value) {
        this.values.add(value);
      },
      remove(value) {
        this.values.delete(value);
      },
    },
    appendChild(element) {
      this.children.push(element);
    },
    ownerDocument: null,
  };
  const document = {
    head: {
      appendChild(element) {
        if (element.id) {
          styleElements.set(element.id, element);
        }
      },
    },
    getElementById(id) {
      return styleElements.get(id) ?? null;
    },
    createElement(tagName) {
      return {
        nodeName: tagName.toUpperCase(),
        className: "",
        id: "",
        style: {},
        width: 0,
        height: 0,
        textContent: "",
        getContext() {
          return {};
        },
      };
    },
  };
  root.ownerDocument = document;
  return { document, root };
}

test("mountGpuAnimationAdventure submits adventure state to gpu-renderer", async () => {
  const { root } = createFakeDocument();
  const loadedUrls = [];
  let rendererOptions = null;
  let destroyed = false;

  const result = await mountGpuAnimationAdventure({
    root,
    width: 640,
    height: 360,
    animationAdventure: {
      modelUrl: "/models/peasant-girl.glb",
      clips: [
        { id: "female-basic-locomotion-idle", url: "/clips/idle.glb" },
        { id: "female-basic-locomotion-walking", url: "/clips/walk.glb" },
      ],
      route: [
        { id: "gate", position: [0, 0, 0], arriveMs: 0 },
        { id: "crop-row", position: [3, 0, 1], arriveMs: 3200 },
      ],
      beats: [
        {
          id: "idle-at-gate",
          order: 0,
          clipId: "female-basic-locomotion-idle",
          durationMs: 1000,
          blend: { inMs: 0, outMs: 120 },
        },
      ],
      camera: {
        mode: "lagged-follow",
        cubicBezier: [0.22, 0.61, 0.36, 1],
        lagMs: 240,
        lookAheadMs: 320,
        offset: [-1, 2.4, 5.5],
      },
      props: {
        seed: 1208,
      },
    },
    __modelAssetLoader: async (url) => {
      loadedUrls.push(String(url));
      return new ArrayBuffer(4);
    },
    __clipAssetLoader: async (url) => {
      loadedUrls.push(String(url));
      return new ArrayBuffer(2);
    },
    __rendererLoader: async () => ({
      createAnimatedSceneRenderer(options) {
        rendererOptions = options;
        return {
          resize(width, height) {
            this.size = { width, height };
          },
          start() {
            this.started = true;
          },
          getSnapshot() {
            return {
              frame: 1,
              activeClipId: "female-basic-locomotion-idle",
              blendProgress: 1,
              characterPosition: [0, 0, 0],
              cameraPosition: [-1, 2.4, 5.5],
              frameState: "running",
            };
          },
          destroy() {
            destroyed = true;
          },
        };
      },
    }),
  });

  assert.deepEqual(loadedUrls, [
    "/models/peasant-girl.glb",
    "/clips/idle.glb",
    "/clips/walk.glb",
  ]);
  assert.equal(root.children.length, 1);
  assert.equal(rendererOptions.route.length, 2);
  assert.equal(rendererOptions.beats.length, 1);
  assert.equal(rendererOptions.props.some((prop) => prop.kind === "crop-row"), true);
  assert.equal(result.state.modelLoaded, true);
  assert.equal(result.state.loadedClipCount, 2);
  assert.equal(result.state.propCount, rendererOptions.props.length);

  result.destroy();
  assert.equal(destroyed, true);
  assert.equal(root.innerHTML, "<p>previous</p>");
});

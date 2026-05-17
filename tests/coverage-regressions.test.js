import test from "node:test";
import assert from "node:assert/strict";

import {
  loadGltfModel,
  mountGpuShowcase,
  resolveShowcaseAssetUrl,
} from "../src/index.js";

function createControl(id, registry, removals, extra = {}) {
  return {
    id,
    textContent: "",
    checked: false,
    value: "",
    addEventListener(type, handler) {
      registry.set(`${id}:${type}`, handler);
    },
    removeEventListener(type, handler) {
      removals.push(`${id}:${type}`);
      assert.equal(registry.get(`${id}:${type}`), handler);
      registry.delete(`${id}:${type}`);
    },
    ...extra,
  };
}

function createCanvasContext() {
  const operations = [];

  const push = (type, ...args) => {
    operations.push({ type, args });
  };

  const createGradient = (type, args) => ({
    addColorStop(offset, color) {
      operations.push({ type: `${type}:stop`, args: [...args, offset, color] });
    },
  });

  return {
    operations,
    createLinearGradient(...args) {
      push("createLinearGradient", ...args);
      return createGradient("linearGradient", args);
    },
    createRadialGradient(...args) {
      push("createRadialGradient", ...args);
      return createGradient("radialGradient", args);
    },
    beginPath() {
      push("beginPath");
    },
    arc(...args) {
      push("arc", ...args);
    },
    ellipse(...args) {
      push("ellipse", ...args);
    },
    moveTo(...args) {
      push("moveTo", ...args);
    },
    lineTo(...args) {
      push("lineTo", ...args);
    },
    closePath() {
      push("closePath");
    },
    fillRect(...args) {
      push("fillRect", ...args);
    },
    fill() {
      push("fill");
    },
    stroke() {
      push("stroke");
    },
    save() {
      push("save");
    },
    restore() {
      push("restore");
    },
  };
}

function createSceneHarness({ canvasContext, search = "", href = "https://plasius.co.uk/gpu-demo" } = {}) {
  const listenerRegistry = new Map();
  const removals = [];
  const classNames = new Set();
  const styleElements = new Map();
  const ctx = canvasContext ?? createCanvasContext();

  const elements = {
    "#demoStatus": { textContent: "" },
    "#demoDetails": { textContent: "" },
    "#demoCanvas": {
      width: 1280,
      height: 720,
      getContext() {
        return ctx;
      },
    },
    "#pauseButton": createControl("pauseButton", listenerRegistry, removals),
    "#stressToggle": createControl("stressToggle", listenerRegistry, removals),
    "#focusMode": createControl("focusMode", listenerRegistry, removals, { value: "integrated" }),
    "#sceneMetrics": { innerHTML: "" },
    "#qualityMetrics": { innerHTML: "" },
    "#debugMetrics": { innerHTML: "" },
    "#sceneNotes": { innerHTML: "" },
  };

  const root = {
    innerHTML: "<p>placeholder</p>",
    classList: {
      add(name) {
        classNames.add(name);
      },
      remove(name) {
        classNames.delete(name);
      },
      contains(name) {
        return classNames.has(name);
      },
    },
    querySelector(selector) {
      return elements[selector] ?? null;
    },
  };

  const documentStub = {
    body: root,
    baseURI: `${href}/index.html`,
    head: {
      appendChild(node) {
        if (node?.id) {
          styleElements.set(node.id, node);
        }
      },
    },
    createElement(tag) {
      return {
        tagName: String(tag).toUpperCase(),
        id: "",
        textContent: "",
      };
    },
    getElementById(id) {
      return styleElements.get(id) ?? null;
    },
  };

  return {
    ctx,
    elements,
    root,
    removals,
    listenerRegistry,
    styleElements,
    documentStub,
    windowStub: {
      location: { search, href },
      render_game_to_text: () => "previous-text",
      advanceTime: () => "previous-time",
    },
  };
}

function createTriangleGltfDocument({ bufferUri } = {}) {
  const positions = new Float32Array([
    -1, -0.5, -1.5,
    1, -0.5, -1.5,
    0, 0.95, 2.1,
  ]);
  const indices = new Uint16Array([0, 1, 2]);
  const bytes = Buffer.concat([Buffer.from(positions.buffer), Buffer.from(indices.buffer)]);

  return {
    positions,
    indices,
    bytes,
    document: {
      asset: { version: "2.0" },
      buffers: [
        {
          uri:
            bufferUri ??
            `data:application/octet-stream;base64,${bytes.toString("base64")}`,
        },
      ],
      bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: positions.byteLength },
        {
          buffer: 0,
          byteOffset: positions.byteLength,
          byteLength: indices.byteLength,
        },
      ],
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: 3,
          type: "VEC3",
        },
        {
          bufferView: 1,
          componentType: 5123,
          count: 3,
          type: "SCALAR",
        },
      ],
      meshes: [
        {
          name: "brigantine-hull",
          primitives: [
            {
              attributes: { POSITION: 0 },
              indices: 1,
              material: 0,
            },
          ],
        },
      ],
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorFactor: [0.56, 0.33, 0.22, 1],
          },
        },
      ],
      nodes: [
        {
          name: "brigantine",
          mesh: 0,
          extras: {
            physics: {
              shape: "box",
              halfExtents: [1.35, 0.95, 3.9],
              mass: 3200,
              restitution: 0.22,
              linearDamping: 0.04,
              angularDamping: 0.08,
              waterline: 0.42,
            },
          },
        },
      ],
      scenes: [{ nodes: [0] }],
      scene: 0,
    },
  };
}

test("mountGpuShowcase renders live frames, package hooks, and physics telemetry", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    search: "?focus=physics",
    href: "https://plasius.co.uk/showcase",
  });
  const cancelledFrames = [];
  const animationFrames = [];
  let nextAnimationFrameId = 1;
  let destroyedPackageState = null;

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextAnimationFrameId;
    nextAnimationFrameId += 1;
    animationFrames.push({ id, callback });
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelledFrames.push(id);
  };

  try {
    const showcase = await mountGpuShowcase({
      root: harness.root,
      packageName: "@plasius/gpu-demo-viewer",
      createState() {
        return {
          updates: 0,
          useCustomDescription: true,
        };
      },
      updateState(packageState, scene, dt) {
        assert.equal(Object.isFrozen(scene), true);
        assert.equal(Object.isFrozen(scene.ships[0]), true);
        return {
          ...packageState,
          updates: packageState.updates + 1,
          lastDt: dt,
          lastFrame: scene.frame,
        };
      },
      describeState(packageState, scene) {
        if (!packageState.useCustomDescription) {
          return null;
        }

        return {
          status: `Frame ${scene.frame}`,
          details: `Focus ${scene.focus}`,
          sceneMetrics: ["scene metric"],
          qualityMetrics: ["quality metric"],
          debugMetrics: ["debug metric"],
          notes: ["custom note"],
          textState: { packageUpdates: packageState.updates },
          visuals: {
            sunCore: "rgba(255, 250, 240, 0.97)",
            waveAmplitude: 1.25,
            waveDirection: { x: 1, z: 0.25 },
            wavePhaseSpeed: 1.2,
            wakeStrength: 0.4,
            wakeLength: 22,
            collisionRippleStrength: 0.6,
            reflectionStrength: 0.2,
            shadowAccent: 0.38,
            waterNear: { r: 0.12 },
            waterFar: { g: 0.42, b: 0.51 },
            flagColor: { r: 0.72, g: 0.18 },
            lanternReflectionStrength: 0,
            collisionFlash: "rgba(255, 210, 180, 0.22)",
          },
        };
      },
      destroyState(packageState) {
        destroyedPackageState = packageState;
      },
    });

    assert.equal(showcase.state.focus, "physics");
    assert.equal(harness.root.classList.contains("plasius-showcase-root"), true);
    assert.ok(harness.styleElements.has("plasius-shared-3d-showcase-style"));
    assert.equal(animationFrames.length, 1);

    animationFrames.shift().callback(16.4);

    assert.ok(harness.ctx.operations.length > 100);
    assert.match(harness.elements["#demoStatus"].textContent, /Frame 1/);
    assert.match(harness.elements["#demoDetails"].textContent, /Focus physics/);
    assert.match(harness.elements["#sceneMetrics"].innerHTML, /scene metric/);
    assert.match(harness.elements["#qualityMetrics"].innerHTML, /quality metric/);
    assert.match(harness.elements["#debugMetrics"].innerHTML, /debug metric/);
    assert.match(harness.elements["#sceneNotes"].innerHTML, /custom note/);
    assert.equal(showcase.state.demoVisuals.moonCore, "rgba(255, 250, 240, 0.97)");
    assert.deepEqual(showcase.state.demoVisuals.waveDirection, { x: 1, z: 0.25 });
    assert.deepEqual(showcase.state.demoVisuals.waterNear, {
      r: 0.12,
      g: 0.23,
      b: 0.33,
    });

    showcase.state.ships[0].position.x = 13.5;
    showcase.state.ships[0].position.z = 8.4;
    showcase.state.ships[0].velocity.x = 5.4;
    showcase.state.ships[0].velocity.z = 0;
    showcase.state.ships[0].rotationY = Math.PI / 2;
    showcase.state.ships[0].collisionCooldown = 0;
    showcase.state.ships[1].position.x = 12.9;
    showcase.state.ships[1].position.z = 8.4;
    showcase.state.ships[1].velocity.x = -4.8;
    showcase.state.ships[1].velocity.z = 0;
    showcase.state.ships[1].rotationY = -Math.PI / 2;
    showcase.state.ships[1].collisionCooldown = 0;
    showcase.state.waveImpulses.push({
      x: 0.4,
      z: 6.8,
      strength: 0.7,
      radius: 1,
      life: 0.01,
    });
    showcase.state.sprays.push({
      position: { x: 0, y: -0.3, z: 0 },
      velocity: { x: 0, y: 0.2, z: 0 },
      life: 0.01,
    });

    harness.elements["#stressToggle"].checked = true;
    harness.listenerRegistry.get("stressToggle:change")();
    harness.elements["#focusMode"].value = "lighting";
    harness.listenerRegistry.get("focusMode:change")();
    animationFrames.shift().callback(33.4);

    assert.equal(showcase.state.stress, true);
    assert.equal(showcase.state.focus, "lighting");
    assert.ok(showcase.state.physics.snapshot);
    assert.ok(showcase.state.contactCount >= 1);
    assert.ok(showcase.state.collisionCount >= 1);
    assert.ok(showcase.state.waveImpulses.length >= 1);
    assert.ok(showcase.state.sprays.length >= 1);
    assert.ok(showcase.state.collisionFlash > 0);

    harness.listenerRegistry.get("pauseButton:click")();
    const pausedFrame = showcase.state.frame;
    animationFrames.shift().callback(50.1);
    assert.equal(showcase.state.frame, pausedFrame);
    assert.equal(harness.elements["#pauseButton"].textContent, "Resume");

    harness.listenerRegistry.get("pauseButton:click")();
    assert.equal(harness.elements["#pauseButton"].textContent, "Pause");
    globalThis.window.advanceTime(100);
    const textState = JSON.parse(globalThis.window.render_game_to_text());
    assert.equal(textState.focus, "lighting");
    assert.ok(textState.physics.snapshot);
    assert.equal(textState.package.packageUpdates >= 1, true);

    showcase.state.packageState.useCustomDescription = false;
    harness.elements["#focusMode"].value = "integrated";
    harness.listenerRegistry.get("focusMode:change")();
    animationFrames.shift().callback(66.8);
    assert.match(harness.elements["#demoStatus"].textContent, /3D scene live/);
    assert.match(harness.elements["#demoDetails"].textContent, /Moonlit GLTF ships collide/);

    harness.elements["#focusMode"].value = "physics";
    harness.listenerRegistry.get("focusMode:change")();
    animationFrames.shift().callback(83.5);
    assert.match(harness.elements["#demoDetails"].textContent, /Stable world snapshots are emitted/);
    assert.match(harness.elements["#sceneNotes"].innerHTML, /Stable world snapshots/);

    showcase.destroy();
    showcase.destroy();

    assert.deepEqual(harness.removals.sort(), [
      "focusMode:change",
      "pauseButton:click",
      "stressToggle:change",
    ]);
    assert.deepEqual(cancelledFrames, [6]);
    assert.equal(harness.root.classList.contains("plasius-showcase-root"), false);
    assert.equal(harness.root.innerHTML, "<p>placeholder</p>");
    assert.equal(globalThis.window.render_game_to_text(), "previous-text");
    assert.equal(globalThis.window.advanceTime(), "previous-time");
    assert.equal(destroyedPackageState.updates >= 1, true);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  }
});

test("mountGpuShowcase fails fast when a 2D canvas context is unavailable", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    canvasContext: null,
  });

  harness.elements["#demoCanvas"].getContext = () => null;
  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });

  try {
    await assert.rejects(
      mountGpuShowcase({ root: harness.root }),
      /2D canvas context is required/
    );
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("resolveShowcaseAssetUrl resolves invalid relative bases against document.baseURI", () => {
  const originalDocument = globalThis.document;
  globalThis.document = {
    baseURI: "https://plasius.co.uk/packages/gpu-shared/demo/index.html",
  };

  try {
    const url = resolveShowcaseAssetUrl("assets/demo-entry.js");
    assert.equal(
      url.href,
      "https://plasius.co.uk/packages/gpu-shared/demo/assets/brigantine.gltf"
    );
  } finally {
    globalThis.document = originalDocument;
  }
});

test("loadGltfModel lazily activates the inline showcase fallback for the shared brigantine asset", async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];

  globalThis.fetch = async (input, init) => {
    const href = input instanceof URL ? input.href : String(input);
    fetchCalls.push(href);

    if (href.endsWith("/assets/brigantine.gltf")) {
      return {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };
    }

    return originalFetch(input, init);
  };

  try {
    const model = await loadGltfModel(resolveShowcaseAssetUrl("file:///tmp/dist/index.js"));
    assert.equal(fetchCalls[0], "file:///tmp/assets/brigantine.gltf");
    assert.match(fetchCalls[1], /^data:application\/json;base64,/);
    assert.equal(model.name, "brigantine");
    assert.equal(model.physics.waterline, 0.42);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadGltfModel rejects failed asset and nested buffer fetches", async () => {
  const originalFetch = globalThis.fetch;
  const { document, bytes } = createTriangleGltfDocument({
    bufferUri: "./brigantine.bin",
  });

  globalThis.fetch = async (input) => {
    const href = input instanceof URL ? input.href : String(input);
    if (href.endsWith("broken.gltf")) {
      return {
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      };
    }

    if (href.endsWith("nested.gltf")) {
      return {
        ok: true,
        url: "https://plasius.co.uk/assets/nested.gltf",
        async json() {
          return document;
        },
      };
    }

    return {
      ok: false,
      status: 404,
      statusText: "Not Found",
      async arrayBuffer() {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      },
    };
  };

  try {
    await assert.rejects(loadGltfModel("https://plasius.co.uk/broken.gltf"), /503 Service Unavailable/);
    await assert.rejects(loadGltfModel("https://plasius.co.uk/nested.gltf"), /404 Not Found/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadGltfModel rejects missing default scenes", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        asset: { version: "2.0" },
        buffers: [],
        scenes: [],
      };
    },
  });

  try {
    await assert.rejects(
      loadGltfModel("https://plasius.co.uk/no-scene.gltf"),
      /must expose a default scene/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

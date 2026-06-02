import test from "node:test";
import assert from "node:assert/strict";

import {
  GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE,
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
    quadraticCurveTo(...args) {
      push("quadraticCurveTo", ...args);
    },
    bezierCurveTo(...args) {
      push("bezierCurveTo", ...args);
    },
    closePath() {
      push("closePath");
    },
    fillRect(...args) {
      push("fillRect", ...args);
    },
    rect(...args) {
      push("rect", ...args);
    },
    clip(...args) {
      push("clip", ...args);
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

function createSceneHarness({
  canvasContext,
  displaySize = null,
  search = "",
  href = "https://plasius.co.uk/gpu-demo",
} = {}) {
  const listenerRegistry = new Map();
  const removals = [];
  const classNames = new Set();
  const attributes = new Map();
  const styleProperties = new Map();
  const styleElements = new Map();
  const ctx = canvasContext ?? createCanvasContext();

  const elements = {
    "#demoStatus": { textContent: "" },
    "#demoDetails": { textContent: "" },
    "#demoCanvas": {
      width: 1280,
      height: 720,
      clientWidth: displaySize?.width ?? 1280,
      clientHeight: displaySize?.height ?? 720,
      getBoundingClientRect() {
        return {
          width: displaySize?.width ?? this.width,
          height: displaySize?.height ?? this.height,
        };
      },
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
    style: {
      setProperty(name, value) {
        styleProperties.set(name, value);
      },
      getPropertyValue(name) {
        return styleProperties.get(name) ?? "";
      },
      removeProperty(name) {
        styleProperties.delete(name);
      },
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    removeAttribute(name) {
      attributes.delete(name);
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
    attributes,
    styleProperties,
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
    assert.equal(showcase.state.hitDrivenPathtraceEnabled, true);
    assert.equal(harness.root.classList.contains("plasius-showcase-root"), true);
    assert.ok(harness.styleElements.has("plasius-shared-3d-showcase-style"));
    assert.equal(animationFrames.length, 1);
    assert.deepEqual(Object.keys(showcase.state.assetCatalog.ships).sort(), [
      "brigantine",
      "cutter",
    ]);
    assert.deepEqual(Object.keys(showcase.state.assetCatalog.environment).sort(), [
      "harbor-dock",
      "lighthouse",
    ]);

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
      g: 0.19,
      b: 0.27,
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
    assert.equal(textState.hitDrivenPathtraceEnabled, true);
    assert.ok(textState.physics.snapshot);
    assert.equal(textState.package.packageUpdates >= 1, true);

    showcase.state.packageState.useCustomDescription = false;
    harness.elements["#focusMode"].value = "integrated";
    harness.listenerRegistry.get("focusMode:change")();
    animationFrames.shift().callback(66.8);
    assert.match(harness.elements["#demoStatus"].textContent, /3D scene live/);
    assert.match(
      harness.elements["#demoDetails"].textContent,
      /GLTF ships now mix a brigantine and a cutter/
    );

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

test("mountGpuShowcase honors the hit-driven path-trace feature flag", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    search: `?${GPU_RENDERER_HIT_DRIVEN_PATHTRACE_FEATURE}=0`,
  });
  const animationFrames = [];

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = () => undefined;

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.hitDrivenPathtraceEnabled, false);
    assert.equal(animationFrames.length, 1);
    animationFrames.shift()(16.7);

    const textState = JSON.parse(globalThis.window.render_game_to_text());
    assert.equal(textState.hitDrivenPathtraceEnabled, false);

    showcase.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  }
});

test("mountGpuShowcase pins fullscreen capture mode to fixed maximum quality", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalDevicePixelRatio = globalThis.devicePixelRatio;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    displaySize: { width: 1920, height: 1080 },
    search: "?capture=1&renderScale=1",
  });
  const animationFrames = [];

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.devicePixelRatio = 2;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = () => undefined;

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.captureMode, true);
    assert.equal(showcase.state.performanceMode, "max");
    assert.equal(showcase.state.adaptivePerformance, false);
    assert.equal(showcase.state.fluidDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.clothDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.lightingDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.lastDecision.mode, "fixed-max");
    assert.equal(harness.root.classList.contains("plasius-showcase-root--capture"), true);
    animationFrames.shift()(16.7);
    globalThis.window.advanceTime(250);
    assert.equal(showcase.state.fluidDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.clothDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.lightingDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(harness.elements["#demoCanvas"].width, 1280);
    assert.equal(harness.elements["#demoCanvas"].height, 720);
    assert.ok(Math.abs(showcase.state.renderScale - 2 / 3) < 0.001);

    showcase.destroy();
    assert.equal(harness.root.classList.contains("plasius-showcase-root--capture"), false);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (typeof originalDevicePixelRatio === "undefined") {
      delete globalThis.devicePixelRatio;
    } else {
      globalThis.devicePixelRatio = originalDevicePixelRatio;
    }
  }
});

test("mountGpuShowcase honors resolution=720p for deterministic capture framing", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalDevicePixelRatio = globalThis.devicePixelRatio;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    displaySize: { width: 2560, height: 1440 },
    search: "?capture=1&quality=ultra&resolution=720p&renderScale=2",
  });
  const animationFrames = [];

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.devicePixelRatio = 2;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = () => undefined;

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.captureMode, true);
    assert.deepEqual(showcase.state.captureResolution, {
      label: "720p",
      width: 1280,
      height: 720,
    });
    assert.equal(harness.root.getAttribute("data-plasius-capture-resolution"), "720p");
    assert.equal(harness.root.style.getPropertyValue("--plasius-capture-width"), "1280px");
    assert.equal(harness.root.style.getPropertyValue("--plasius-capture-height"), "720px");
    assert.equal(
      harness.root.style.getPropertyValue("--plasius-capture-aspect"),
      String(1280 / 720)
    );
    animationFrames.shift()(16.7);
    assert.equal(harness.elements["#demoCanvas"].width, 1280);
    assert.equal(harness.elements["#demoCanvas"].height, 720);

    showcase.destroy();
    assert.equal(harness.root.getAttribute("data-plasius-capture-resolution"), null);
    assert.equal(harness.root.style.getPropertyValue("--plasius-capture-width"), "");
    assert.equal(harness.root.style.getPropertyValue("--plasius-capture-height"), "");
    assert.equal(harness.root.style.getPropertyValue("--plasius-capture-aspect"), "");
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (typeof originalDevicePixelRatio === "undefined") {
      delete globalThis.devicePixelRatio;
    } else {
      globalThis.devicePixelRatio = originalDevicePixelRatio;
    }
  }
});

test("mountGpuShowcase exposes deterministic frame export capture hook", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalDevicePixelRatio = globalThis.devicePixelRatio;
  const { document } = createTriangleGltfDocument();
  const previousCaptureFrame = () => "previous-capture";
  const harness = createSceneHarness({
    displaySize: { width: 2560, height: 1440 },
    search: "?capture=1&quality=ultra&resolution=720p&timeOfDay=cycle&frameExport=1&renderScale=2",
  });
  const animationFrames = [];
  const cancelledFrames = [];

  harness.windowStub.__plasiusCaptureFrame = previousCaptureFrame;
  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.devicePixelRatio = 2;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelledFrames.push(id);
  };

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.captureMode, true);
    assert.equal(showcase.state.frameExport, true);
    assert.equal(typeof globalThis.window.__plasiusCaptureFrame, "function");
    assert.equal(animationFrames.length, 1);

    animationFrames.shift()(16.7);
    assert.equal(showcase.state.frame, 0);
    assert.equal(harness.elements["#demoCanvas"].width, 1280);
    assert.equal(harness.elements["#demoCanvas"].height, 720);

    const firstFrame = globalThis.window.__plasiusCaptureFrame({
      stepMs: 1000 / 60,
    });
    assert.equal(firstFrame.frame, 1);
    assert.equal(firstFrame.width, 1280);
    assert.equal(firstFrame.height, 720);
    assert.equal(firstFrame.performanceMode, "max");
    assert.equal(firstFrame.timeOfDayMode, "cycle");
    assert.equal(firstFrame.hitDrivenPathtraceEnabled, true);
    assert.ok(Math.abs(firstFrame.time - 0.0167) < 0.0002);

    const stillFrame = globalThis.window.__plasiusCaptureFrame({ stepMs: 0 });
    assert.equal(stillFrame.frame, 1);
    assert.equal(stillFrame.time, firstFrame.time);

    showcase.destroy();
    assert.equal(globalThis.window.__plasiusCaptureFrame, previousCaptureFrame);
    assert.deepEqual(cancelledFrames, [1]);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (typeof originalDevicePixelRatio === "undefined") {
      delete globalThis.devicePixelRatio;
    } else {
      globalThis.devicePixelRatio = originalDevicePixelRatio;
    }
  }
});

test("mountGpuShowcase honors explicit adaptive performance for capture fallback", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalDevicePixelRatio = globalThis.devicePixelRatio;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    displaySize: { width: 1920, height: 1080 },
    search: "?capture=1&quality=adaptive&renderScale=1",
  });
  const animationFrames = [];

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.devicePixelRatio = 2;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = () => undefined;

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.captureMode, true);
    assert.equal(showcase.state.performanceMode, "adaptive");
    assert.equal(showcase.state.adaptivePerformance, true);
    assert.equal(showcase.state.fluidDetail.getSnapshot().currentLevel.id, "high");
    animationFrames.shift()(16.7);
    assert.equal(harness.elements["#demoCanvas"].width, 1920);
    assert.equal(harness.elements["#demoCanvas"].height, 1080);
    assert.equal(showcase.state.renderScale, 1);

    showcase.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (typeof originalDevicePixelRatio === "undefined") {
      delete globalThis.devicePixelRatio;
    } else {
      globalThis.devicePixelRatio = originalDevicePixelRatio;
    }
  }
});

test("mountGpuShowcase honors quality=ultra outside capture mode", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const originalDevicePixelRatio = globalThis.devicePixelRatio;
  const { document } = createTriangleGltfDocument();
  const harness = createSceneHarness({
    displaySize: { width: 1280, height: 720 },
    search: "?quality=ultra&renderScale=2",
  });
  const animationFrames = [];

  globalThis.document = harness.documentStub;
  globalThis.window = harness.windowStub;
  globalThis.devicePixelRatio = 1;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return document;
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  };
  globalThis.cancelAnimationFrame = () => undefined;

  try {
    const showcase = await mountGpuShowcase({ root: harness.root });

    assert.equal(showcase.state.captureMode, false);
    assert.equal(showcase.state.performanceMode, "max");
    assert.equal(showcase.state.adaptivePerformance, false);
    assert.equal(showcase.state.fluidDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.clothDetail.getSnapshot().currentLevel.id, "ultra");
    assert.equal(showcase.state.lightingDetail.getSnapshot().currentLevel.id, "ultra");
    animationFrames.shift()(16.7);
    assert.equal(harness.elements["#demoCanvas"].width, 1280);
    assert.equal(harness.elements["#demoCanvas"].height, 720);

    showcase.destroy();
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (typeof originalDevicePixelRatio === "undefined") {
      delete globalThis.devicePixelRatio;
    } else {
      globalThis.devicePixelRatio = originalDevicePixelRatio;
    }
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
    assert.equal(model.physics.waterline, 0.44);
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

import test from "node:test";
import assert from "node:assert/strict";
import {
  createGameSceneAdapter,
  parseGameSceneSnapshot,
  GAME_SCENE_LIMITS,
} from "../src/game-scene.js";

const basis = () => ({ right: [1, 0, 0], up: [0, 1, 0], forward: [0, 0, 1] });
const mesh = () => ({
  id: "triangle",
  vertices: new Float32Array([
    0, 0, 0, 0, 0, 1, 0.2, 0.4, 0.6, 0.8, 0, 0, 1, 0, 0, 0, 0, 1, 0.2, 0.4, 0.6,
    0.8, 0, 0, 0, 1, 0, 0, 0, 1, 0.2, 0.4, 0.6, 0.8, 0, 0,
  ]),
});
const snapshot = (tick = 1) => ({
  type: "gameScene",
  version: "1.0.0",
  tick,
  time: tick / 60,
  camera: { eye: [0, 3, 8], target: [0, 0, 0], fov: 54 },
  instances: [
    {
      id: "player",
      meshId: "triangle",
      position: [1, 2, 3],
      basis: basis(),
      scale: 2,
    },
  ],
});
function fixture() {
  const renders = [],
    completions = [];
  let loads = 0,
    destroys = 0,
    nativeOptions;
  const renderer = {
    renderAsync(frame, options) {
      renders.push({ ...frame, vertices: frame.vertices.slice(), options });
      return new Promise((resolve, reject) =>
        completions.push({ resolve, reject }),
      );
    },
    getSnapshot: () => ({ available: true }),
    destroy() {
      destroys++;
    },
  };
  const options = {
    enabled: true,
    canvas: { width: 960, height: 540 },
    navigator: { gpu: {} },
    meshes: [mesh()],
    rendererLoader: async () => {
      loads++;
      return {
        createNativeSceneRenderer: async (value) => {
          nativeOptions = value;
          return renderer;
        },
      };
    },
  };
  return {
    options,
    renderer,
    renders,
    completions,
    get loads() {
      return loads;
    },
    get destroys() {
      return destroys;
    },
    get nativeOptions() {
      return nativeOptions;
    },
  };
}
const microtasks = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

test("disabled and unsupported scenes never import renderer code", async () => {
  const f = fixture();
  assert.equal(
    await createGameSceneAdapter({
      ...f.options,
      enabled: false,
      meshes: null,
    }),
    null,
  );
  assert.equal(await createGameSceneAdapter(), null);
  await assert.rejects(
    createGameSceneAdapter({ ...f.options, navigator: {} }),
    { code: "webgpu-unavailable" },
  );
  assert.equal(f.loads, 0);
});

test("snapshot admission preserves explicit identity and detaches caller data", () => {
  const input = snapshot(),
    parsed = parseGameSceneSnapshot(input);
  assert.deepEqual(parsed, input);
  input.camera.eye[0] = 999;
  input.instances[0].basis.right[0] = 99;
  assert.equal(parsed.camera.eye[0], 0);
  assert.equal(parsed.instances[0].basis.right[0], 1);
});

test("invalid snapshot identities, fields, bounds and spatial bases are rejected", () => {
  const cases = [
    null,
    {},
    { ...snapshot(), type: "private" },
    { ...snapshot(), version: "2.0.0" },
    { ...snapshot(), extra: true },
    { ...snapshot(), tick: -1 },
    { ...snapshot(), tick: 1.5 },
    { ...snapshot(), tick: Number.MAX_SAFE_INTEGER + 1 },
    { ...snapshot(), time: Infinity },
    {
      ...snapshot(),
      instances: Array.from({ length: 2049 }, (_, i) => ({
        ...snapshot().instances[0],
        id: "item" + i,
      })),
    },
  ];
  for (const field of ["type", "version"]) {
    const value = snapshot();
    delete value[field];
    cases.push(value);
  }
  for (const change of [
    (s) => {
      s.camera.target = [...s.camera.eye];
    },
    (s) => {
      s.camera.fov = 121;
    },
    (s) => {
      s.camera.extra = 1;
    },
    (s) => {
      s.instances.push(structuredClone(s.instances[0]));
    },
    (s) => {
      s.instances[0].scale = 0;
    },
    (s) => {
      s.instances[0].position = [NaN, 0, 0];
    },
    (s) => {
      s.instances[0].basis.right = [2, 0, 0];
    },
    (s) => {
      s.instances[0].basis.right = [-1, 0, 0];
    },
    (s) => {
      s.instances[0].basis.up = [1, 0, 0];
    },
    (s) => {
      s.instances[0].extra = true;
    },
    (s) => {
      s.instances[0].id = "x".repeat(65);
    },
  ]) {
    const value = snapshot();
    change(value);
    cases.push(value);
  }
  for (const value of cases)
    assert.throws(() => parseGameSceneSnapshot(value), {
      code: "invalid-snapshot",
    });
  const getter = snapshot();
  Object.defineProperty(getter, "time", {
    get() {
      throw new Error("private getter");
    },
  });
  assert.throws(() => parseGameSceneSnapshot(getter), {
    code: "invalid-snapshot",
  });
});

test("initialization validates geometry and dimensions before loading", async () => {
  const invalidMeshes = [
    [],
    Array(129).fill(mesh()),
    [mesh(), mesh()],
    [{ ...mesh(), id: "" }],
    [{ ...mesh(), vertices: new Float32Array(1) }],
    [
      {
        ...mesh(),
        vertices: new Float32Array((GAME_SCENE_LIMITS.maxVertices + 3) * 12),
      },
    ],
  ];
  for (const offset of [0, 3, 6, 9, 10, 11]) {
    const m = mesh();
    m.vertices[offset] = NaN;
    invalidMeshes.push([m]);
  }
  for (const offset of [6, 9, 10, 11]) {
    const m = mesh();
    m.vertices[offset] = 10;
    invalidMeshes.push([m]);
  }
  const flat = mesh();
  flat.vertices.fill(0, 3, 6);
  invalidMeshes.push([flat]);
  const shared = mesh();
  shared.vertices = new Float32Array(new SharedArrayBuffer(36 * 4));
  invalidMeshes.push([shared]);
  for (const meshes of invalidMeshes) {
    const f = fixture();
    await assert.rejects(createGameSceneAdapter({ ...f.options, meshes }), {
      code: "invalid-meshes",
    });
    assert.equal(f.loads, 0);
  }
  for (const patch of [
    { width: 0 },
    { height: 3841 },
    { width: 3840, height: 3840 },
    { timeoutMs: 0 },
    { timeoutMs: 60001 },
    { initializationTimeoutMs: NaN },
    { signal: {} },
    { canvas: null },
  ]) {
    const f = fixture();
    await assert.rejects(createGameSceneAdapter({ ...f.options, ...patch }), {
      code: "invalid-options",
    });
    assert.equal(f.loads, 0);
  }
});

test("prepared mesh and accepted snapshot mutations cannot change spatial rendering", async () => {
  const f = fixture(),
    adapter = await createGameSceneAdapter(f.options);
  f.options.meshes[0].vertices.fill(99);
  const input = snapshot();
  input.instances[0].basis = {
    right: [0, 0, -1],
    up: [0, 1, 0],
    forward: [1, 0, 0],
  };
  assert.equal(adapter.offer(input), "submitted");
  assert.equal(f.nativeOptions.maxVertices, GAME_SCENE_LIMITS.maxVertices);
  assert.deepEqual([...f.renders[0].vertices.slice(0, 6)], [1, 2, 3, 1, 0, 0]);
  assert.deepEqual([...f.renders[0].vertices.slice(12, 15)], [1, 2, 1]);
  assert.equal(f.renders[0].water, false);
  assert.ok(Math.abs(f.renders[0].vertices[6] - 0.2) < 0.00001);
  input.camera.eye[0] = 999;
  assert.equal(f.renders[0].camera.eye[0], 0);
  f.completions[0].resolve();
  await adapter.flush();
  adapter.destroy();
});

test("one pending GPU frame retains only the latest waiting snapshot", async () => {
  const f = fixture(),
    adapter = await createGameSceneAdapter(f.options);
  adapter.offer(snapshot(1));
  const draining = adapter.flush();
  for (let tick = 2; tick <= 1000; tick++)
    assert.equal(adapter.offer(snapshot(tick)), "queued");
  assert.equal(adapter.flush(), draining);
  assert.equal(f.renders.length, 1);
  assert.equal(adapter.getSnapshot().pendingSnapshots, 1);
  assert.equal(adapter.getSnapshot().replacedSnapshots, 998);
  f.completions[0].resolve();
  await microtasks();
  assert.equal(f.renders.length, 2);
  assert.equal(f.renders[1].time, 1000 / 60);
  f.completions[1].resolve();
  await draining;
  assert.equal(adapter.getSnapshot().presentedTick, 1000);
  assert.equal(adapter.getSnapshot().presentedFrames, 2);
  assert.equal(adapter.getSnapshot().status, "ready");
  assert.equal(adapter.offer(snapshot(999)), "stale");
  assert.equal(adapter.offer(snapshot(1000)), "stale");
  assert.equal(f.renders.length, 2);
  adapter.destroy();
});

test("invalid offers preserve queued work and allow subsequent recovery", async () => {
  const f = fixture(),
    adapter = await createGameSceneAdapter(f.options);
  adapter.offer(snapshot(1));
  adapter.offer(snapshot(2));
  const invalid = snapshot(3);
  invalid.instances[0].meshId = "missing";
  assert.throws(() => adapter.offer(invalid), { code: "unknown-mesh" });
  f.completions[0].resolve();
  await microtasks();
  assert.equal(f.renders[1].time, 2 / 60);
  f.completions[1].resolve();
  await adapter.flush();
  adapter.offer(snapshot(3));
  f.completions[2].resolve();
  await adapter.flush();
  adapter.destroy();
});

test("frame geometry capacity is enforced before writing or replacing state", async () => {
  const f = fixture(),
    small = mesh().vertices,
    big = new Float32Array(60003 * 12);
  for (let offset = 0; offset < big.length; offset += small.length)
    big.set(small, offset);
  const adapter = await createGameSceneAdapter({
    ...f.options,
    meshes: [{ id: "triangle", vertices: big }],
  });
  const s = snapshot();
  s.instances.push({ ...structuredClone(s.instances[0]), id: "other" });
  assert.throws(() => adapter.offer(s), { code: "frame-capacity" });
  assert.equal(f.renders.length, 0);
  assert.equal(adapter.getSnapshot().offeredSnapshots, 0);
  adapter.destroy();
});

test("resize waits for outstanding work and redraws the retained scene when paused", async () => {
  const f = fixture(),
    adapter = await createGameSceneAdapter(f.options);
  adapter.offer(snapshot());
  adapter.resize(320, 240);
  assert.equal(f.options.canvas.width, 960);
  assert.throws(() => adapter.resize(4000, 4000), { code: "invalid-options" });
  f.completions[0].resolve();
  await microtasks();
  assert.equal(f.options.canvas.width, 320);
  assert.equal(f.renders.length, 2);
  f.completions[1].resolve();
  await adapter.flush();
  adapter.resize(640, 360);
  assert.equal(f.renders.length, 3);
  f.completions[2].resolve();
  await adapter.flush();
  assert.equal(adapter.getSnapshot().presentedTick, 1);
  adapter.destroy();
});

test("cancellation before load never invokes the loader", async () => {
  const f = fixture(),
    controller = new AbortController();
  controller.abort("private reason");
  await assert.rejects(
    createGameSceneAdapter({ ...f.options, signal: controller.signal }),
    { code: "aborted" },
  );
  assert.equal(f.loads, 0);
});

test("initialization timeout and cancellation dispose late renderer results", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const cancel of [false, true]) {
    const f = fixture(),
      controller = new AbortController();
    let complete;
    f.options.rendererLoader = async () => ({
      createNativeSceneRenderer: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    });
    const pending = createGameSceneAdapter({
      ...f.options,
      signal: controller.signal,
      initializationTimeoutMs: 10,
    });
    const rejected = assert.rejects(pending, {
      code: cancel ? "aborted" : "initialization-timeout",
    });
    await microtasks();
    if (cancel) controller.abort();
    else t.mock.timers.tick(10);
    await rejected;
    complete(f.renderer);
    await microtasks();
    assert.equal(f.destroys, 1);
  }
});

test("failed or incompatible initialization rejects with a bounded error", async () => {
  for (const fail of ["throw", "missing", "sync-only", "unavailable"]) {
    const f = fixture();
    f.options.rendererLoader = async () => {
      if (fail === "throw") throw new Error("private loader detail");
      if (fail === "missing") return {};
      if (fail === "sync-only") delete f.renderer.renderAsync;
      if (fail === "unavailable")
        f.renderer.getSnapshot = () => ({ available: false });
      return { createNativeSceneRenderer: async () => f.renderer };
    };
    await assert.rejects(createGameSceneAdapter(f.options), (error) => {
      assert.ok(
        ["initialization-failed", "renderer-incompatible"].includes(error.code),
      );
      assert.ok(!error.message.includes("private loader detail"));
      return true;
    });
    if (["sync-only", "unavailable"].includes(fail))
      assert.equal(f.destroys, 1);
  }
});

test("partial initialization errors are controlled and remove cancellation listeners", async (t) => {
  const f = fixture(),
    controller = new AbortController();
  const remove = t.mock.method(controller.signal, "removeEventListener");
  Object.defineProperty(f.options.canvas, "width", {
    set() {
      throw new Error("private canvas detail");
    },
  });
  await assert.rejects(
    createGameSceneAdapter({ ...f.options, signal: controller.signal }),
    (error) => {
      assert.equal(error.code, "initialization-failed");
      assert.ok(!error.message.includes("private canvas detail"));
      return true;
    },
  );
  assert.equal(f.loads, 0);
  assert.equal(remove.mock.calls.length, 1);
});

test("late initialization rejection after a deadline is consumed", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const f = fixture();
  let rejectLoad;
  f.options.rendererLoader = () =>
    new Promise((_, reject) => {
      rejectLoad = reject;
    });
  const rejected = assert.rejects(
    createGameSceneAdapter({ ...f.options, initializationTimeoutMs: 10 }),
    { code: "initialization-timeout" },
  );
  t.mock.timers.tick(10);
  await rejected;
  rejectLoad(new Error("late private failure"));
  await microtasks();
  assert.equal(f.destroys, 0);
});

test("cancellation during readiness checks cannot revive initialization", async () => {
  const f = fixture(), controller = new AbortController();
  f.renderer.getSnapshot = () => { controller.abort(); return { available: true }; };
  await assert.rejects(createGameSceneAdapter({ ...f.options, signal: controller.signal }), { code: "aborted" });
  assert.equal(f.destroys, 1);
});

test("abort, device loss and explicit teardown settle flush and ignore late completion", async (t) => {
  for (const reason of ["aborted", "device-lost", "destroyed"]) {
    const f = fixture(),
      controller = new AbortController(),
      codes = [];
    const remove = t.mock.method(controller.signal, "removeEventListener");
    const adapter = await createGameSceneAdapter({
      ...f.options,
      signal: controller.signal,
      onUnavailable: (code) => codes.push(code),
    });
    adapter.offer(snapshot());
    adapter.offer(snapshot(2));
    const rejected = assert.rejects(adapter.flush(), { code: reason });
    if (reason === "aborted") controller.abort("private reason");
    else if (reason === "device-lost")
      f.nativeOptions.onUnavailable("private driver details");
    else adapter.destroy();
    await rejected;
    f.completions[0].resolve();
    await microtasks();
    adapter.destroy();
    assert.equal(f.destroys, 1);
    assert.equal(f.renders.length, 1);
    assert.equal(adapter.getSnapshot().presentedTick, null);
    assert.equal(adapter.getSnapshot().pendingSnapshots, 0);
    assert.equal(
      remove.mock.calls.filter((c) => c.arguments[0] === "abort").length,
      1,
    );
    assert.throws(() => adapter.offer(snapshot(3)), { code: reason });
    assert.deepEqual(codes, reason === "destroyed" ? [] : [reason]);
  }
});

test("failed presentations stop the queue and preserve finite errors despite host failures", async () => {
  for (const synchronous of [false, true]) {
    const f = fixture();
    f.renderer.destroy = () => {
      throw new Error("private cleanup detail");
    };
    if (synchronous)
      f.renderer.renderAsync = () => {
        throw new Error("private render detail");
      };
    const adapter = await createGameSceneAdapter({
      ...f.options,
      timeoutMs: 123,
      onUnavailable() {
        if (synchronous) throw new Error("private callback detail");
        return Promise.reject(new Error("private callback detail"));
      },
    });
    adapter.offer(snapshot());
    if (!synchronous) {
      assert.equal(f.renders[0].options.timeoutMs, 123);
      f.completions[0].reject(new Error("private render detail"));
    }
    await assert.rejects(adapter.flush(), { code: "presentation-failed" });
    assert.equal(adapter.getSnapshot().errorCode, "presentation-failed");
    adapter.destroy();
  }
});

test("empty snapshots clear the scene and disposal without work is idempotent", async () => {
  const f = fixture(),
    adapter = await createGameSceneAdapter(f.options);
  await adapter.flush();
  adapter.resize(480, 320);
  assert.equal(f.renders.length, 0);
  adapter.offer({ ...snapshot(), instances: [] });
  assert.equal(f.renders[0].vertices.length, 0);
  f.completions[0].resolve();
  await adapter.flush();
  adapter.destroy();
  adapter.destroy();
  assert.equal(f.destroys, 1);
  assert.equal(adapter.getSnapshot().status, "destroyed");
  await assert.rejects(adapter.flush(), { code: "destroyed" });
});

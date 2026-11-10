import { createSchema, field } from "@plasius/schema";
import {
  loadNativeShowcaseRenderer,
  writeTransformedShowcaseSurfaces,
} from "./native-showcase.js";

export const GAME_SCENE_LIMITS = Object.freeze({
  maxMeshes: 128,
  maxVertices: 120000,
  maxInstances: 2048,
  maxDimension: 3840,
  maxPixels: 1920 * 1080,
  maxCoordinate: 10000,
  maxScale: 100,
  defaultTimeoutMs: 5000,
  maxTimeoutMs: 60000,
});

export class GameSceneError extends Error {
  constructor(code) {
    super("Game scene unavailable: " + code + ".");
    this.name = "GameSceneError";
    this.code = code;
  }
}

const bounded = (min, max) =>
  field
    .number()
    .validator(
      (value) => Number.isFinite(value) && value >= min && value <= max,
    );
const coordinate = () =>
  bounded(-GAME_SCENE_LIMITS.maxCoordinate, GAME_SCENE_LIMITS.maxCoordinate);
const vector = () => field.array(coordinate()).min(3).max(3);
const id = () =>
  field.string().validator((value) => /^[a-zA-Z0-9_-]{1,64}$/.test(value));
const sceneSchema = createSchema(
  {
    tick: field
      .number()
      .validator((value) => Number.isSafeInteger(value) && value >= 0),
    time: bounded(0, 1e9),
    camera: field.object({
      eye: vector(),
      target: vector(),
      fov: bounded(10, 120),
    }),
    instances: field
      .array(
        field.object({
          id: id(),
          meshId: id(),
          position: vector(),
          scale: bounded(0.0001, GAME_SCENE_LIMITS.maxScale),
          basis: field.object({
            right: field.array(bounded(-1, 1)).min(3).max(3),
            up: field.array(bounded(-1, 1)).min(3).max(3),
            forward: field.array(bounded(-1, 1)).min(3).max(3),
          }),
        }),
      )
      .max(GAME_SCENE_LIMITS.maxInstances),
  },
  "gameScene",
  {
    version: "1.0.0",
    identity: "exact",
    unknownFields: "reject",
    schemaValidator: (_value, context) =>
      context?.wasProvided("type") === true && context.wasProvided("version"),
  },
);

const dot = (a, b) =>
  a.reduce((sum, value, index) => sum + value * b[index], 0);
function validBasis({ right, up, forward }) {
  const near = (value, expected = 0) => Math.abs(value - expected) <= 0.0001;
  return (
    near(dot(right, right), 1) &&
    near(dot(up, up), 1) &&
    near(dot(forward, forward), 1) &&
    near(dot(right, up)) &&
    near(dot(right, forward)) &&
    near(dot(up, forward)) &&
    near(
      dot(
        [
          right[1] * up[2] - right[2] * up[1],
          right[2] * up[0] - right[0] * up[2],
          right[0] * up[1] - right[1] * up[0],
        ],
        forward,
      ),
      1,
    )
  );
}

/** Admit a strict, detached presentation snapshot; this conveys no gameplay authority. */
export function parseGameSceneSnapshot(input) {
  try {
    const result = sceneSchema.validate(input);
    if (!result.valid) throw new Error();
    const value = result.value,
      ids = new Set();
    if (
      Math.hypot(
        ...value.camera.eye.map((v, i) => v - value.camera.target[i]),
      ) < 0.001
    )
      throw new Error();
    for (const instance of value.instances) {
      if (ids.has(instance.id) || !validBasis(instance.basis))
        throw new Error();
      ids.add(instance.id);
    }
    return value;
  } catch {
    throw new GameSceneError("invalid-snapshot");
  }
}

function dimensions(width, height) {
  if (
    ![width, height].every(
      (value) =>
        Number.isInteger(value) &&
        value >= 1 &&
        value <= GAME_SCENE_LIMITS.maxDimension,
    ) ||
    width * height > GAME_SCENE_LIMITS.maxPixels
  )
    throw new GameSceneError("invalid-options");
  return { width, height };
}

function prepareMeshes(input) {
  try {
    if (
      !Array.isArray(input) ||
      !input.length ||
      input.length > GAME_SCENE_LIMITS.maxMeshes
    )
      throw new Error();
    const meshes = new Map();
    let total = 0;
    for (const mesh of input) {
      const vertices = mesh?.vertices;
      if (
        !mesh ||
        typeof mesh.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,64}$/.test(mesh.id) ||
        meshes.has(mesh.id) ||
        Object.keys(mesh).some((key) => key !== "id" && key !== "vertices") ||
        !(vertices instanceof Float32Array) ||
        !vertices.length ||
        vertices.length % 36 !== 0 ||
        (typeof SharedArrayBuffer !== "undefined" &&
          vertices.buffer instanceof SharedArrayBuffer)
      )
        throw new Error();
      total += vertices.length / 12;
      if (total > GAME_SCENE_LIMITS.maxVertices) throw new Error();
      for (let offset = 0; offset < vertices.length; offset += 12) {
        for (let component = 0; component < 12; component++) {
          const value = vertices[offset + component];
          const valid =
            Number.isFinite(value) &&
            (component < 3
              ? Math.abs(value) <= GAME_SCENE_LIMITS.maxCoordinate
              : component < 6
                ? Math.abs(value) <= 1
                : component < 11
                  ? value >= 0 && value <= 1
                  : Number.isInteger(value) && value >= 0 && value <= 3);
          if (!valid) throw new Error();
        }
        if (
          Math.abs(
            Math.hypot(...vertices.subarray(offset + 3, offset + 6)) - 1,
          ) > 0.001
        )
          throw new Error();
      }
      meshes.set(mesh.id, vertices.slice());
    }
    return meshes;
  } catch {
    throw new GameSceneError("invalid-meshes");
  }
}

const vec = ([x, y, z]) => ({ x, y, z });
const increment = (value) => Math.min(0xffffffff, value + 1);
const dispose = (renderer) => {
  try {
    renderer?.destroy?.();
  } catch {
    /* All adapter state still terminates. */
  }
};

/** The host supplies capability admission, simulation, input, camera and semantic UI. */
export async function createGameSceneAdapter(options = {}) {
  if (options.enabled !== true) return null;
  const { canvas, signal, onUnavailable } = options;
  const navigator = options.navigator ?? globalThis.navigator;
  const timeoutMs = options.timeoutMs ?? GAME_SCENE_LIMITS.defaultTimeoutMs;
  const initializationTimeoutMs =
    options.initializationTimeoutMs ?? GAME_SCENE_LIMITS.defaultTimeoutMs;
  if (
    !canvas ||
    typeof canvas !== "object" ||
    ![timeoutMs, initializationTimeoutMs].every(
      (value) =>
        Number.isInteger(value) &&
        value >= 1 &&
        value <= GAME_SCENE_LIMITS.maxTimeoutMs,
    ) ||
    (signal !== undefined &&
      (!signal ||
        typeof signal.aborted !== "boolean" ||
        typeof signal.addEventListener !== "function" ||
        typeof signal.removeEventListener !== "function")) ||
    (onUnavailable !== undefined && typeof onUnavailable !== "function") ||
    (options.rendererLoader !== undefined &&
      typeof options.rendererLoader !== "function")
  )
    throw new GameSceneError("invalid-options");
  if (signal?.aborted) throw new GameSceneError("aborted");
  if (!navigator?.gpu) throw new GameSceneError("webgpu-unavailable");
  let viewport = dimensions(options.width ?? 960, options.height ?? 540);
  const meshes = prepareMeshes(options.meshes);
  const controller = new AbortController();
  let renderer, frameVertices, latest, timer, rejectInitialization;
  let status = "initializing",
    error,
    pending = false,
    draining = false,
    settleDrain;
  let lastOfferedTick = -1,
    presentedTick = null,
    offeredSnapshots = 0,
    replacedSnapshots = 0,
    presentedFrames = 0;
  let completion = Promise.resolve();
  const getSnapshot = () =>
    Object.freeze({
      status: status === "ready" && draining ? "rendering" : status,
      errorCode: error?.code ?? null,
      offeredSnapshots,
      replacedSnapshots,
      presentedFrames,
      presentedTick,
      pendingSnapshots: pending ? 1 : 0,
      inFlightFrames: draining && status === "ready" ? 1 : 0,
      width: viewport.width,
      height: viewport.height,
    });
  function terminate(code, destroyed = false) {
    if (status === "failed" || status === "destroyed") return;
    status = destroyed ? "destroyed" : "failed";
    error = new GameSceneError(code);
    clearTimeout(timer);
    try {
      signal?.removeEventListener("abort", abort);
    } catch {
      /* Continue teardown. */
    }
    controller.abort();
    dispose(renderer);
    renderer = undefined;
    meshes.clear();
    frameVertices = latest = undefined;
    pending = draining = false;
    rejectInitialization?.(error);
    rejectInitialization = undefined;
    settleDrain?.reject(error);
    settleDrain = undefined;
    completion = Promise.reject(error);
    completion.catch(() => {});
    if (!destroyed) {
      try {
        Promise.resolve(onUnavailable?.(code)).catch(() => {});
      } catch {
        /* Host feedback cannot prevent cleanup. */
      }
    }
  }
  const abort = () => terminate("aborted");
  const initialized = new Promise((resolve, reject) => {
    rejectInitialization = reject;
    timer = setTimeout(
      () => terminate("initialization-timeout"),
      initializationTimeoutMs,
    );
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    loadNativeShowcaseRenderer({
      enabled: true,
      canvas,
      navigator,
      loader: options.rendererLoader,
      maxVertices: GAME_SCENE_LIMITS.maxVertices,
      onUnavailable: () => terminate("device-lost"),
    })
      .then((value) => {
        if (status !== "initializing") {
          dispose(value);
          return;
        }
        renderer = value;
        if (
          !renderer ||
          typeof renderer.renderAsync !== "function" ||
          typeof renderer.destroy !== "function" ||
          typeof renderer.getSnapshot !== "function" ||
          renderer.getSnapshot().available !== true
        ) {
          terminate("renderer-incompatible");
          return;
        }
        if (status !== "initializing") return;
        frameVertices = new Float32Array(GAME_SCENE_LIMITS.maxVertices * 12);
        clearTimeout(timer);
        rejectInitialization = undefined;
        status = "ready";
        resolve();
      })
      .catch(() => terminate("initialization-failed"));
  });
  try {
    await initialized;
  } catch {
    terminate("initialization-failed");
    throw error;
  }
  if (status !== "ready") throw error;

  function ensureReady() {
    if (status !== "ready") throw error;
  }
  function frame(snapshot) {
    let offset = 0;
    for (const instance of snapshot.instances) {
      offset = writeTransformedShowcaseSurfaces(
        meshes.get(instance.meshId),
        frameVertices,
        offset,
        [instance.basis.right, instance.basis.up, instance.basis.forward].map(
          vec,
        ),
        vec(instance.position),
        instance.scale,
      );
    }
    return {
      vertices: frameVertices.subarray(0, offset),
      camera: snapshot.camera,
      time: snapshot.time,
      water: false,
    };
  }
  async function drain() {
    try {
      while (pending && status === "ready") {
        const snapshot = latest;
        pending = false;
        const input = frame(snapshot);
        if (canvas.width !== viewport.width) canvas.width = viewport.width;
        if (canvas.height !== viewport.height) canvas.height = viewport.height;
        await renderer.renderAsync(input, {
          signal: controller.signal,
          timeoutMs,
        });
        if (status !== "ready") return;
        presentedTick = snapshot.tick;
        presentedFrames = increment(presentedFrames);
      }
      draining = false;
      settleDrain?.resolve();
      settleDrain = undefined;
    } catch {
      terminate("presentation-failed");
    }
  }
  function startDrain() {
    if (draining) return;
    draining = true;
    completion = new Promise((resolve, reject) => {
      settleDrain = { resolve, reject };
    });
    completion.catch(() => {});
    void drain();
  }
  return {
    offer(input) {
      ensureReady();
      const snapshot = parseGameSceneSnapshot(input);
      let vertices = 0;
      for (const instance of snapshot.instances) {
        const mesh = meshes.get(instance.meshId);
        if (!mesh) throw new GameSceneError("unknown-mesh");
        vertices += mesh.length / 12;
        if (vertices > GAME_SCENE_LIMITS.maxVertices)
          throw new GameSceneError("frame-capacity");
      }
      if (snapshot.tick <= lastOfferedTick) return "stale";
      if (pending) replacedSnapshots = increment(replacedSnapshots);
      offeredSnapshots = increment(offeredSnapshots);
      lastOfferedTick = snapshot.tick;
      latest = snapshot;
      pending = true;
      const result = draining ? "queued" : "submitted";
      startDrain();
      return result;
    },
    resize(width, height) {
      ensureReady();
      const next = dimensions(width, height);
      if (viewport.width === width && viewport.height === height) return;
      viewport = next;
      if (latest) {
        pending = true;
        startDrain();
      }
    },
    flush: () => completion,
    getSnapshot,
    destroy: () => terminate("destroyed", true),
  };
}

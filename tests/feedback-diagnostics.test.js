import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FEEDBACK_BACKEND_BUCKETS as canonicalBackends,
  FEEDBACK_FRAME_RATE_BUCKETS as canonicalFrameRateBuckets,
  FEEDBACK_FRAME_TIME_BUCKETS as canonicalFrameTimeBuckets,
  FEEDBACK_GAME_COUNTER_CODES as canonicalCounterCodes,
  FEEDBACK_GAME_ERROR_CODES as canonicalErrorCodes,
  FEEDBACK_GAME_FEATURE_IDS as canonicalFeatureIds,
  FEEDBACK_RENDERER_BUCKETS as canonicalRenderers,
  FEEDBACK_VIEWPORT_BUCKETS as canonicalViewportBuckets,
  FeedbackGameDiagnosticsSchema,
} from "@plasius/schema/feedback-diagnostics";

import {
  FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY,
  FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION,
  FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG,
  feedbackGameDiagnosticBackends,
  feedbackGameDiagnosticCounterCodes,
  feedbackGameDiagnosticErrorCodes,
  feedbackGameDiagnosticFeatureIds,
  feedbackGameDiagnosticFrameRateBuckets,
  feedbackGameDiagnosticFrameTimeBuckets,
  feedbackGameDiagnosticRenderers,
  feedbackGameDiagnosticSurfaceRegistrations,
  feedbackGameDiagnosticViewportBuckets,
  parseFeedbackGameDiagnostics,
} from "../src/index.js";
import * as focusedDiagnostics from "../src/feedback-diagnostics.js";

const VALID_GPU_DEMO_DIAGNOSTICS = Object.freeze({
  type: "feedback-game-diagnostics",
  version: "1.0.0",
  surfaceId: "site.gpu-demo",
  consentConfirmed: true,
  provenanceContractId: "gpu-demo.renderer-diagnostics.v1",
  renderer: "webgpu",
  backend: "worker",
  viewportBucket: "large-landscape",
  frameRateBucket: "60-plus",
  frameTimeBucket: "under-17ms",
  featureIds: Object.freeze([
    "renderer.initialisation",
    "renderer.frame-loop",
  ]),
  counters: Object.freeze([
    Object.freeze({ code: "frame-drop", count: 2 }),
  ]),
  errorCodes: Object.freeze([
    "renderer.frame-budget-exceeded",
  ]),
});

function assertFixedPrivacyError(action, sensitiveValue) {
  assert.throws(
    action,
    (error) =>
      error instanceof TypeError &&
      error.message === "Invalid privacy-safe game diagnostics." &&
      !Object.hasOwn(error, "cause") &&
      !error.message.includes(sensitiveValue) &&
      !String(error.stack).includes(sensitiveValue)
  );
}

test("diagnostic constants stay aligned with the closed feedback contract", () => {
  assert.equal(FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION, "1.0.0");
  assert.equal(
    FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG,
    "feedback.game-diagnostics.enabled"
  );
  assert.equal(
    FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY,
    "feedback.game-diagnostics.attach"
  );
  assert.deepEqual(feedbackGameDiagnosticRenderers, [
    "webgl2",
    "webgpu",
    "canvas2d",
    "unknown",
  ]);
  assert.deepEqual(feedbackGameDiagnosticBackends, [
    "browser",
    "worker",
    "unknown",
  ]);
  assert.deepEqual(feedbackGameDiagnosticViewportBuckets, [
    "small-portrait",
    "small-landscape",
    "medium-portrait",
    "medium-landscape",
    "large-portrait",
    "large-landscape",
    "unknown",
  ]);
  assert.deepEqual(feedbackGameDiagnosticFrameRateBuckets, [
    "under-15",
    "15-29",
    "30-59",
    "60-plus",
    "unknown",
  ]);
  assert.deepEqual(feedbackGameDiagnosticFrameTimeBuckets, [
    "under-17ms",
    "17-33ms",
    "34-66ms",
    "over-66ms",
    "unknown",
  ]);
  assert.deepEqual(feedbackGameDiagnosticFeatureIds, [
    "renderer.initialisation",
    "renderer.frame-loop",
    "renderer.asset-loading",
    "renderer.input",
    "renderer.scene-generation",
    "renderer.post-processing",
  ]);
  assert.deepEqual(feedbackGameDiagnosticCounterCodes, [
    "frame-drop",
    "device-loss",
    "asset-load-failure",
    "shader-failure",
    "fallback-activation",
  ]);
  assert.deepEqual(feedbackGameDiagnosticErrorCodes, [
    "renderer.initialisation-failed",
    "renderer.device-lost",
    "renderer.asset-load-failed",
    "renderer.frame-budget-exceeded",
    "renderer.shader-failed",
    "renderer.unknown",
  ]);
  assert.equal(feedbackGameDiagnosticRenderers, canonicalRenderers);
  assert.equal(feedbackGameDiagnosticBackends, canonicalBackends);
  assert.equal(
    feedbackGameDiagnosticViewportBuckets,
    canonicalViewportBuckets
  );
  assert.equal(
    feedbackGameDiagnosticFrameRateBuckets,
    canonicalFrameRateBuckets
  );
  assert.equal(
    feedbackGameDiagnosticFrameTimeBuckets,
    canonicalFrameTimeBuckets
  );
  assert.equal(feedbackGameDiagnosticFeatureIds, canonicalFeatureIds);
  assert.equal(feedbackGameDiagnosticCounterCodes, canonicalCounterCodes);
  assert.equal(feedbackGameDiagnosticErrorCodes, canonicalErrorCodes);
});

test("focused diagnostics entrypoint preserves root export identity", () => {
  assert.equal(
    focusedDiagnostics.parseFeedbackGameDiagnostics,
    parseFeedbackGameDiagnostics
  );
  assert.equal(
    focusedDiagnostics.feedbackGameDiagnosticSurfaceRegistrations,
    feedbackGameDiagnosticSurfaceRegistrations
  );
  assert.equal(
    focusedDiagnostics.feedbackGameDiagnosticRenderers,
    feedbackGameDiagnosticRenderers
  );
});

test("surface registrations are exact, curated and exclude player-system", () => {
  assert.deepEqual(
    Object.keys(feedbackGameDiagnosticSurfaceRegistrations),
    ["site.generator", "site.gpu-demo"]
  );
  assert.equal(
    Object.hasOwn(feedbackGameDiagnosticSurfaceRegistrations, "site.player-system"),
    false
  );
  assert.equal(Object.isFrozen(feedbackGameDiagnosticSurfaceRegistrations), true);

  assert.deepEqual(feedbackGameDiagnosticSurfaceRegistrations["site.generator"], {
    type: "feedback-game-diagnostics-surface-registration",
    version: "1.0.0",
    surfaceId: "site.generator",
    provenanceContractId: "generator.renderer-diagnostics.v1",
    ownerPackage: "@plasius/gpu-renderer",
    publicAssetSetIds: ["generator.public-reconstruction-assets.v1"],
    featureFlag: "feedback.game-diagnostics.enabled",
    requiredCapability: "feedback.game-diagnostics.attach",
  });
  assert.deepEqual(feedbackGameDiagnosticSurfaceRegistrations["site.gpu-demo"], {
    type: "feedback-game-diagnostics-surface-registration",
    version: "1.0.0",
    surfaceId: "site.gpu-demo",
    provenanceContractId: "gpu-demo.renderer-diagnostics.v1",
    ownerPackage: "@plasius/gpu-renderer",
    publicAssetSetIds: ["gpu-shared.showcase-public-assets.v1"],
    featureFlag: "feedback.game-diagnostics.enabled",
    requiredCapability: "feedback.game-diagnostics.attach",
  });

  for (const registration of Object.values(
    feedbackGameDiagnosticSurfaceRegistrations
  )) {
    assert.equal(Object.isFrozen(registration), true);
    assert.equal(Object.isFrozen(registration.publicAssetSetIds), true);
    assert.equal(registration.publicAssetSetIds.length > 0, true);
    assert.equal(
      registration.publicAssetSetIds.every((id) =>
        /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(id)
      ),
      true
    );
    assert.equal(
      registration.publicAssetSetIds.some((id) =>
        /(?:https?:|[/?#]|\.(?:png|jpe?g|webp|gltf|glb)$)/iu.test(id)
      ),
      false
    );
  }
});

test("runtime contract has no capture, transport or logging primitive", () => {
  const source = readFileSync(
    new URL("../src/feedback-diagnostics.js", import.meta.url),
    "utf8"
  );
  const declaration = readFileSync(
    new URL("../src/feedback-diagnostics.d.ts", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|console)\b/u
  );
  assert.doesNotMatch(
    source,
    /\b(?:HTMLCanvasElement|OffscreenCanvas|ImageData|MediaStream)\b/u
  );
  assert.match(
    declaration,
    /parseFeedbackGameDiagnostics\(\s*input: unknown\s*\): FeedbackGameDiagnostics/su
  );
  const diagnosticsDeclaration =
    declaration.match(
      /export type FeedbackGameDiagnosticRenderer[\s\S]*?export type FeedbackGameDiagnostics = CanonicalFeedbackGameDiagnostics;/u
    )?.[0] ?? "";
  assert.notEqual(diagnosticsDeclaration, "");
  assert.doesNotMatch(
    diagnosticsDeclaration,
    /\b(?:pixel|image|canvas|dom|identity|url|filename|coordinate|adapter|warning|text)\b/iu
  );
});

test("parser returns a closed immutable diagnostics packet", () => {
  const parsed = parseFeedbackGameDiagnostics(VALID_GPU_DEMO_DIAGNOSTICS);

  assert.deepEqual(parsed, VALID_GPU_DEMO_DIAGNOSTICS);
  assert.notEqual(parsed, VALID_GPU_DEMO_DIAGNOSTICS);
  assert.notEqual(parsed.featureIds, VALID_GPU_DEMO_DIAGNOSTICS.featureIds);
  assert.notEqual(parsed.counters, VALID_GPU_DEMO_DIAGNOSTICS.counters);
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.featureIds), true);
  assert.equal(Object.isFrozen(parsed.counters), true);
  assert.equal(Object.isFrozen(parsed.counters[0]), true);
  assert.equal(Object.isFrozen(parsed.errorCodes), true);
  assert.equal(FeedbackGameDiagnosticsSchema.validate(parsed).valid, true);
});

test("parser rejects missing consent, unknown surfaces and mismatched provenance", () => {
  for (const input of [
    { ...VALID_GPU_DEMO_DIAGNOSTICS, consentConfirmed: false },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, surfaceId: "site.player-system" },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      provenanceContractId: "attacker.contract.v1",
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      surfaceId: "__proto__",
      provenanceContractId: undefined,
    },
  ]) {
    assert.throws(
      () => parseFeedbackGameDiagnostics(input),
      (error) =>
        error instanceof TypeError &&
        error.message === "Invalid privacy-safe game diagnostics."
    );
  }
});

test("parser rejects forbidden or unknown evidence fields instead of stripping them", () => {
  const forbiddenInputs = [
    { ...VALID_GPU_DEMO_DIAGNOSTICS, screenshot: "data:image/png;base64,secret" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, pixels: [1, 2, 3] },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, url: "https://example.test/player?id=person" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, filename: "private-character.glb" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, coordinates: [51.5, -0.1] },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, adapter: "Exact GPU model" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, warning: "user@example.test" },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      counters: [{ code: "frame-drop", count: 1, detail: "raw warning" }],
    },
  ];

  for (const input of forbiddenInputs) {
    assert.throws(
      () => parseFeedbackGameDiagnostics(input),
      /Invalid privacy-safe game diagnostics\./u
    );
  }
});

test("parser rejects inherited, symbol and non-enumerable evidence", () => {
  const inherited = Object.create({ screenshot: "secret" });
  Object.assign(inherited, VALID_GPU_DEMO_DIAGNOSTICS);

  const symbolEvidence = { ...VALID_GPU_DEMO_DIAGNOSTICS };
  symbolEvidence[Symbol("pixel-evidence")] = new Uint8Array([1]);

  const hiddenEvidence = { ...VALID_GPU_DEMO_DIAGNOSTICS };
  Object.defineProperty(hiddenEvidence, "hiddenEvidence", {
    value: "secret",
    enumerable: false,
  });

  for (const input of [inherited, symbolEvidence, hiddenEvidence]) {
    assert.throws(
      () => parseFeedbackGameDiagnostics(input),
      /Invalid privacy-safe game diagnostics\./u
    );
  }
});

test("parser snapshots proxy data descriptors once and never rereads validated fields", () => {
  let rendererDescriptorReads = 0;
  const input = new Proxy(
    { ...VALID_GPU_DEMO_DIAGNOSTICS },
    {
      getOwnPropertyDescriptor(target, key) {
        if (key === "renderer") {
          rendererDescriptorReads += 1;
          return {
            configurable: true,
            enumerable: true,
            value:
              rendererDescriptorReads === 1
                ? "webgpu"
                : "synthetic-person@example.test",
            writable: true,
          };
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    }
  );

  const parsed = parseFeedbackGameDiagnostics(input);

  assert.equal(parsed.renderer, "webgpu");
  assert.equal(rendererDescriptorReads, 1);
});

test("parser rejects switching and throwing accessors without invoking them", () => {
  const sensitiveValue = "synthetic-person@example.test";
  let switchingReads = 0;
  const switchingInput = { ...VALID_GPU_DEMO_DIAGNOSTICS };
  Object.defineProperty(switchingInput, "renderer", {
    configurable: true,
    enumerable: true,
    get() {
      switchingReads += 1;
      return switchingReads === 1 ? "webgpu" : sensitiveValue;
    },
  });

  assertFixedPrivacyError(
    () => parseFeedbackGameDiagnostics(switchingInput),
    sensitiveValue
  );
  assert.equal(switchingReads, 0);

  let throwingReads = 0;
  const throwingInput = { ...VALID_GPU_DEMO_DIAGNOSTICS };
  Object.defineProperty(throwingInput, "backend", {
    configurable: true,
    enumerable: true,
    get() {
      throwingReads += 1;
      throw new Error(sensitiveValue);
    },
  });

  assertFixedPrivacyError(
    () => parseFeedbackGameDiagnostics(throwingInput),
    sensitiveValue
  );
  assert.equal(throwingReads, 0);
});

test("parser redacts exceptions thrown by hostile proxy traps", () => {
  const sensitiveValue = "synthetic-person@example.test";
  const input = new Proxy(
    { ...VALID_GPU_DEMO_DIAGNOSTICS },
    {
      ownKeys() {
        throw new Error(sensitiveValue);
      },
    }
  );

  assertFixedPrivacyError(
    () => parseFeedbackGameDiagnostics(input),
    sensitiveValue
  );
});

test("parser rejects accessor-backed, sparse, symbol-bearing and exotic arrays", () => {
  const sensitiveValue = "synthetic-person@example.test";
  let arrayGetterReads = 0;
  const accessorArray = [];
  Object.defineProperty(accessorArray, "0", {
    configurable: true,
    enumerable: true,
    get() {
      arrayGetterReads += 1;
      throw new Error(sensitiveValue);
    },
  });

  const sparseArray = [];
  sparseArray.length = 1;

  const symbolArray = [];
  symbolArray[Symbol("synthetic-private-evidence")] = sensitiveValue;

  const exoticArray = [];
  Object.setPrototypeOf(exoticArray, {});

  for (const featureIds of [
    accessorArray,
    sparseArray,
    symbolArray,
    exoticArray,
  ]) {
    assertFixedPrivacyError(
      () =>
        parseFeedbackGameDiagnostics({
          ...VALID_GPU_DEMO_DIAGNOSTICS,
          featureIds,
        }),
      sensitiveValue
    );
  }
  assert.equal(arrayGetterReads, 0);
});

test("parser rejects accessor-backed counter fields without invoking them", () => {
  const sensitiveValue = "synthetic-person@example.test";
  let codeReads = 0;
  let countReads = 0;
  const counter = {};
  Object.defineProperties(counter, {
    code: {
      configurable: true,
      enumerable: true,
      get() {
        codeReads += 1;
        return codeReads === 1 ? "frame-drop" : sensitiveValue;
      },
    },
    count: {
      configurable: true,
      enumerable: true,
      get() {
        countReads += 1;
        return countReads === 1 ? 1 : sensitiveValue;
      },
    },
  });

  assertFixedPrivacyError(
    () =>
      parseFeedbackGameDiagnostics({
        ...VALID_GPU_DEMO_DIAGNOSTICS,
        counters: [counter],
      }),
    sensitiveValue
  );
  assert.equal(codeReads, 0);
  assert.equal(countReads, 0);
});

test("parser enforces allowlists, unique values and bounded counts", () => {
  const invalidInputs = [
    { ...VALID_GPU_DEMO_DIAGNOSTICS, renderer: "webgpu-exact-adapter" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, backend: "dedicated-user-worker" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, viewportBucket: "1920x1080" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, frameRateBucket: "59.94" },
    { ...VALID_GPU_DEMO_DIAGNOSTICS, frameTimeBucket: "16.667ms" },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      featureIds: ["renderer.frame-loop", "renderer.frame-loop"],
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      featureIds: Array.from({ length: 7 }, () => "renderer.frame-loop"),
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      counters: [
        { code: "frame-drop", count: 1 },
        { code: "frame-drop", count: 2 },
      ],
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      counters: [{ code: "frame-drop", count: 0 }],
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      counters: [{ code: "frame-drop", count: 10_001 }],
    },
    {
      ...VALID_GPU_DEMO_DIAGNOSTICS,
      errorCodes: ["renderer.device-lost", "renderer.device-lost"],
    },
  ];

  for (const input of invalidInputs) {
    assert.throws(
      () => parseFeedbackGameDiagnostics(input),
      /Invalid privacy-safe game diagnostics\./u
    );
  }
});

test("parser accepts an empty, bounded diagnostic observation", () => {
  const parsed = parseFeedbackGameDiagnostics({
    ...VALID_GPU_DEMO_DIAGNOSTICS,
    featureIds: [],
    counters: [],
    errorCodes: [],
  });

  assert.deepEqual(parsed.featureIds, []);
  assert.deepEqual(parsed.counters, []);
  assert.deepEqual(parsed.errorCodes, []);
});

import {
  FEEDBACK_BACKEND_BUCKETS,
  FEEDBACK_CONTRACT_VERSION,
  FEEDBACK_FRAME_RATE_BUCKETS,
  FEEDBACK_FRAME_TIME_BUCKETS,
  FEEDBACK_GAME_COUNTER_CODES,
  FEEDBACK_GAME_COUNTER_MAX_COUNT,
  FEEDBACK_GAME_COUNTER_MAX_ITEMS,
  FEEDBACK_GAME_ERROR_CODES,
  FEEDBACK_GAME_FEATURE_IDS,
  FEEDBACK_GAME_PROVENANCE_CONTRACTS,
  FEEDBACK_GAME_SURFACE_IDS,
  FEEDBACK_RENDERER_BUCKETS,
  FEEDBACK_VIEWPORT_BUCKETS,
} from "@plasius/schema/feedback-diagnostics-vocabulary";

// Release blocker: add @plasius/schema ^1.4.0 to package.json and the lock after
// that version is published through its protected CD workflow.
export const FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION =
  FEEDBACK_CONTRACT_VERSION;
export const FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG =
  "feedback.game-diagnostics.enabled";
export const FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY =
  "feedback.game-diagnostics.attach";

export const feedbackGameDiagnosticRenderers = FEEDBACK_RENDERER_BUCKETS;
export const feedbackGameDiagnosticBackends = FEEDBACK_BACKEND_BUCKETS;
export const feedbackGameDiagnosticViewportBuckets = FEEDBACK_VIEWPORT_BUCKETS;
export const feedbackGameDiagnosticFrameRateBuckets =
  FEEDBACK_FRAME_RATE_BUCKETS;
export const feedbackGameDiagnosticFrameTimeBuckets =
  FEEDBACK_FRAME_TIME_BUCKETS;
export const feedbackGameDiagnosticFeatureIds = FEEDBACK_GAME_FEATURE_IDS;
export const feedbackGameDiagnosticCounterCodes = FEEDBACK_GAME_COUNTER_CODES;
export const feedbackGameDiagnosticErrorCodes = FEEDBACK_GAME_ERROR_CODES;

const generatorSurfaceRegistration = freezeSurfaceRegistration({
  type: "feedback-game-diagnostics-surface-registration",
  version: FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION,
  surfaceId: "site.generator",
  provenanceContractId: "generator.renderer-diagnostics.v1",
  ownerPackage: "@plasius/gpu-renderer",
  publicAssetSetIds: ["generator.public-reconstruction-assets.v1"],
  featureFlag: FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG,
  requiredCapability: FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY,
});

const gpuDemoSurfaceRegistration = freezeSurfaceRegistration({
  type: "feedback-game-diagnostics-surface-registration",
  version: FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION,
  surfaceId: "site.gpu-demo",
  provenanceContractId: "gpu-demo.renderer-diagnostics.v1",
  ownerPackage: "@plasius/gpu-renderer",
  publicAssetSetIds: ["gpu-shared.showcase-public-assets.v1"],
  featureFlag: FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG,
  requiredCapability: FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY,
});

export const feedbackGameDiagnosticSurfaceRegistrations = Object.freeze({
  [generatorSurfaceRegistration.surfaceId]: generatorSurfaceRegistration,
  [gpuDemoSurfaceRegistration.surfaceId]: gpuDemoSurfaceRegistration,
});

assertCanonicalSurfaceRegistration(
  generatorSurfaceRegistration.surfaceId,
  generatorSurfaceRegistration.provenanceContractId
);
assertCanonicalSurfaceRegistration(
  gpuDemoSurfaceRegistration.surfaceId,
  gpuDemoSurfaceRegistration.provenanceContractId
);
if (
  FEEDBACK_GAME_SURFACE_IDS.length !==
  Object.keys(feedbackGameDiagnosticSurfaceRegistrations).length
) {
  throw new TypeError("Invalid privacy-safe game diagnostics registration.");
}

const INVALID_DIAGNOSTICS_MESSAGE =
  "Invalid privacy-safe game diagnostics.";

const diagnosticsKeys = Object.freeze([
  "type",
  "version",
  "surfaceId",
  "consentConfirmed",
  "provenanceContractId",
  "renderer",
  "backend",
  "viewportBucket",
  "frameRateBucket",
  "frameTimeBucket",
  "featureIds",
  "counters",
  "errorCodes",
]);

const counterKeys = Object.freeze(["code", "count"]);

const rendererSet = new Set(feedbackGameDiagnosticRenderers);
const backendSet = new Set(feedbackGameDiagnosticBackends);
const viewportBucketSet = new Set(feedbackGameDiagnosticViewportBuckets);
const frameRateBucketSet = new Set(feedbackGameDiagnosticFrameRateBuckets);
const frameTimeBucketSet = new Set(feedbackGameDiagnosticFrameTimeBuckets);
const featureIdSet = new Set(feedbackGameDiagnosticFeatureIds);
const counterCodeSet = new Set(feedbackGameDiagnosticCounterCodes);
const errorCodeSet = new Set(feedbackGameDiagnosticErrorCodes);

export function parseFeedbackGameDiagnostics(input) {
  try {
    const snapshot = snapshotPlainRecordWithExactKeys(input, diagnosticsKeys);
    const {
      type,
      version,
      surfaceId,
      consentConfirmed,
      provenanceContractId,
      renderer,
      backend,
      viewportBucket,
      frameRateBucket,
      frameTimeBucket,
      featureIds: featureIdsInput,
      counters: countersInput,
      errorCodes: errorCodesInput,
    } = snapshot;

    const registration =
      typeof surfaceId === "string" &&
      Object.hasOwn(feedbackGameDiagnosticSurfaceRegistrations, surfaceId)
        ? feedbackGameDiagnosticSurfaceRegistrations[surfaceId]
        : undefined;
    assertValid(
      type === "feedback-game-diagnostics" &&
        version === FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION &&
        consentConfirmed === true &&
        registration !== undefined &&
        provenanceContractId === registration.provenanceContractId &&
        rendererSet.has(renderer) &&
        backendSet.has(backend) &&
        viewportBucketSet.has(viewportBucket) &&
        frameRateBucketSet.has(frameRateBucket) &&
        frameTimeBucketSet.has(frameTimeBucket)
    );

    const featureIds = parseUniqueAllowlistedStrings(
      featureIdsInput,
      featureIdSet,
      feedbackGameDiagnosticFeatureIds.length
    );
    const counters = parseCounters(countersInput);
    const errorCodes = parseUniqueAllowlistedStrings(
      errorCodesInput,
      errorCodeSet,
      feedbackGameDiagnosticErrorCodes.length
    );

    return Object.freeze({
      type: "feedback-game-diagnostics",
      version: FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION,
      surfaceId: registration.surfaceId,
      consentConfirmed: true,
      provenanceContractId: registration.provenanceContractId,
      renderer,
      backend,
      viewportBucket,
      frameRateBucket,
      frameTimeBucket,
      featureIds,
      counters,
      errorCodes,
    });
  } catch {
    throw invalidDiagnosticsError();
  }
}

function assertCanonicalSurfaceRegistration(surfaceId, provenanceContractId) {
  const canonicalRegistration = FEEDBACK_GAME_PROVENANCE_CONTRACTS.find(
    (registration) => registration.surfaceId === surfaceId
  );
  if (
    canonicalRegistration === undefined ||
    canonicalRegistration.contractId !== provenanceContractId
  ) {
    throw new TypeError("Invalid privacy-safe game diagnostics registration.");
  }
}

function freezeSurfaceRegistration(registration) {
  return Object.freeze({
    ...registration,
    publicAssetSetIds: Object.freeze([...registration.publicAssetSetIds]),
  });
}

function parseUniqueAllowlistedStrings(input, allowlist, maximumLength) {
  const snapshot = snapshotArray(input, maximumLength);

  const values = [];
  const seen = new Set();
  for (const value of snapshot) {
    assertValid(
      typeof value === "string" &&
        allowlist.has(value) &&
        !seen.has(value)
    );
    seen.add(value);
    values.push(value);
  }

  return Object.freeze(values);
}

function parseCounters(input) {
  const snapshot = snapshotArray(input, FEEDBACK_GAME_COUNTER_MAX_ITEMS);

  const counters = [];
  const seen = new Set();
  for (const counterInput of snapshot) {
    const counter = snapshotPlainRecordWithExactKeys(counterInput, counterKeys);
    const { code, count } = counter;
    assertValid(
      counterCodeSet.has(code) &&
        !seen.has(code) &&
        Number.isInteger(count) &&
        count >= 1 &&
        count <= FEEDBACK_GAME_COUNTER_MAX_COUNT
    );
    seen.add(code);
    counters.push(Object.freeze({ code, count }));
  }

  return Object.freeze(counters);
}

function snapshotPlainRecordWithExactKeys(value, expectedKeys) {
  assertValid(
    value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
  const prototype = Object.getPrototypeOf(value);
  assertValid(prototype === Object.prototype || prototype === null);

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actualKeys = Reflect.ownKeys(descriptors);
  assertValid(
    actualKeys.length === expectedKeys.length &&
      expectedKeys.every((key) => Object.hasOwn(descriptors, key)) &&
      actualKeys.every((key) => typeof key === "string" && expectedKeys.includes(key))
  );

  const snapshot = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    assertValid(
      descriptor !== undefined &&
        Object.hasOwn(descriptor, "value") &&
        descriptor.enumerable === true
    );
    snapshot[key] = descriptor.value;
  }

  return Object.freeze(snapshot);
}

function snapshotArray(value, maximumLength) {
  assertValid(
    Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype
  );

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const lengthDescriptor = descriptors.length;
  assertValid(
    lengthDescriptor !== undefined &&
      Object.hasOwn(lengthDescriptor, "value") &&
      lengthDescriptor.enumerable === false &&
      Number.isInteger(lengthDescriptor.value) &&
      lengthDescriptor.value >= 0 &&
      lengthDescriptor.value <= maximumLength
  );

  const length = lengthDescriptor.value;
  assertValid(
    ownKeys.length === length + 1 &&
      ownKeys.every(
        (key) =>
          typeof key === "string" &&
          (key === "length" ||
            (/^(?:0|[1-9][0-9]*)$/u.test(key) &&
              Number(key) >= 0 &&
              Number(key) < length))
      )
  );

  const snapshot = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = descriptors[String(index)];
    assertValid(
      descriptor !== undefined &&
        Object.hasOwn(descriptor, "value") &&
        descriptor.enumerable === true
    );
    snapshot.push(descriptor.value);
  }

  return Object.freeze(snapshot);
}

function assertValid(condition) {
  if (!condition) {
    throw invalidDiagnosticsError();
  }
}

function invalidDiagnosticsError() {
  return new TypeError(INVALID_DIAGNOSTICS_MESSAGE);
}

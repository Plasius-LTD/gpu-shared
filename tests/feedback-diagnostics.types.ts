import {
  feedbackGameDiagnosticSurfaceRegistrations,
  parseFeedbackGameDiagnostics,
  type FeedbackGameDiagnostics,
  type FeedbackGameDiagnosticErrorCode,
  type FeedbackGameDiagnosticSurfaceId,
} from "../src/index.js";
import type {
  FeedbackGameDiagnostics as CanonicalFeedbackGameDiagnostics,
} from "@plasius/schema/feedback-diagnostics-vocabulary";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type CanonicalDiagnosticsParity = Assert<
  Equal<FeedbackGameDiagnostics, CanonicalFeedbackGameDiagnostics>
>;

const parsed = parseFeedbackGameDiagnostics({
  type: "feedback-game-diagnostics",
});

const surfaceId: FeedbackGameDiagnosticSurfaceId = parsed.surfaceId;
const errorCode: FeedbackGameDiagnosticErrorCode | undefined =
  parsed.errorCodes[0];
const provenance =
  feedbackGameDiagnosticSurfaceRegistrations["site.gpu-demo"]
    .provenanceContractId;
const generatorProvenance: "generator.renderer-diagnostics.v1" =
  feedbackGameDiagnosticSurfaceRegistrations["site.generator"]
    .provenanceContractId;
const generatorAssetSet: readonly [
  "generator.public-reconstruction-assets.v1"
] = feedbackGameDiagnosticSurfaceRegistrations["site.generator"]
  .publicAssetSetIds;

const validGeneratorDiagnostics = {
  type: "feedback-game-diagnostics",
  version: "1.0.0",
  surfaceId: "site.generator",
  consentConfirmed: true,
  provenanceContractId: "generator.renderer-diagnostics.v1",
  renderer: "webgpu",
  backend: "worker",
  viewportBucket: "large-landscape",
  frameRateBucket: "60-plus",
  frameTimeBucket: "under-17ms",
  featureIds: ["renderer.frame-loop"],
  counters: [{ code: "frame-drop", count: 1 }],
  errorCodes: [],
} as const satisfies FeedbackGameDiagnostics;

const mismatchedGeneratorDiagnostics = {
  ...validGeneratorDiagnostics,
  provenanceContractId: "gpu-demo.renderer-diagnostics.v1",
} as const;

// @ts-expect-error generator diagnostics cannot claim GPU-demo provenance.
const invalidGeneratorDiagnostics: FeedbackGameDiagnostics =
  mismatchedGeneratorDiagnostics;

void surfaceId;
void errorCode;
void provenance;
void generatorProvenance;
void generatorAssetSet;
void validGeneratorDiagnostics;
void invalidGeneratorDiagnostics;
const canonicalDiagnosticsParity: CanonicalDiagnosticsParity = true;
void canonicalDiagnosticsParity;

// @ts-expect-error pixels are intentionally absent from the safe output.
void parsed.pixels;

// @ts-expect-error player-system is intentionally not a registered surface.
void feedbackGameDiagnosticSurfaceRegistrations["site.player-system"];

import type {
  FeedbackGameDiagnostics as CanonicalFeedbackGameDiagnostics,
} from "@plasius/schema/feedback-diagnostics-vocabulary";

export type FeedbackGameDiagnosticRenderer =
  CanonicalFeedbackGameDiagnostics["renderer"];

export type FeedbackGameDiagnosticBackend =
  CanonicalFeedbackGameDiagnostics["backend"];

export type FeedbackGameDiagnosticViewportBucket =
  CanonicalFeedbackGameDiagnostics["viewportBucket"];

export type FeedbackGameDiagnosticFrameRateBucket =
  CanonicalFeedbackGameDiagnostics["frameRateBucket"];

export type FeedbackGameDiagnosticFrameTimeBucket =
  CanonicalFeedbackGameDiagnostics["frameTimeBucket"];

export type FeedbackGameDiagnosticFeatureId =
  CanonicalFeedbackGameDiagnostics["featureIds"][number];

export type FeedbackGameDiagnosticCounterCode =
  CanonicalFeedbackGameDiagnostics["counters"][number]["code"];

export type FeedbackGameDiagnosticErrorCode =
  CanonicalFeedbackGameDiagnostics["errorCodes"][number];

export type FeedbackGameDiagnosticSurfaceId =
  CanonicalFeedbackGameDiagnostics["surfaceId"];

export type FeedbackGameDiagnosticProvenanceContractId =
  CanonicalFeedbackGameDiagnostics["provenanceContractId"];

export type FeedbackGameDiagnosticPublicAssetSetId =
  | "generator.public-reconstruction-assets.v1"
  | "gpu-shared.showcase-public-assets.v1";

export type FeedbackGameDiagnosticCounter =
  CanonicalFeedbackGameDiagnostics["counters"][number];

export type FeedbackGameDiagnostics = CanonicalFeedbackGameDiagnostics;

interface FeedbackGameDiagnosticSurfaceRegistrationFields {
  readonly type: "feedback-game-diagnostics-surface-registration";
  readonly version: "1.0.0";
  readonly ownerPackage: "@plasius/gpu-renderer";
  readonly featureFlag: "feedback.game-diagnostics.enabled";
  readonly requiredCapability: "feedback.game-diagnostics.attach";
}

export type FeedbackGameDiagnosticSurfaceRegistration =
  | (FeedbackGameDiagnosticSurfaceRegistrationFields & {
      readonly surfaceId: "site.generator";
      readonly provenanceContractId: "generator.renderer-diagnostics.v1";
      readonly publicAssetSetIds: readonly [
        "generator.public-reconstruction-assets.v1"
      ];
    })
  | (FeedbackGameDiagnosticSurfaceRegistrationFields & {
      readonly surfaceId: "site.gpu-demo";
      readonly provenanceContractId: "gpu-demo.renderer-diagnostics.v1";
      readonly publicAssetSetIds: readonly [
        "gpu-shared.showcase-public-assets.v1"
      ];
    });

export type FeedbackGameDiagnosticSurfaceRegistrationMap = {
  readonly "site.generator": Extract<
    FeedbackGameDiagnosticSurfaceRegistration,
    { readonly surfaceId: "site.generator" }
  >;
  readonly "site.gpu-demo": Extract<
    FeedbackGameDiagnosticSurfaceRegistration,
    { readonly surfaceId: "site.gpu-demo" }
  >;
};

export const FEEDBACK_GAME_DIAGNOSTICS_CONTRACT_VERSION: "1.0.0";
export const FEEDBACK_GAME_DIAGNOSTICS_FEATURE_FLAG:
  "feedback.game-diagnostics.enabled";
export const FEEDBACK_GAME_DIAGNOSTICS_CAPABILITY:
  "feedback.game-diagnostics.attach";
export const feedbackGameDiagnosticRenderers:
  readonly FeedbackGameDiagnosticRenderer[];
export const feedbackGameDiagnosticBackends:
  readonly FeedbackGameDiagnosticBackend[];
export const feedbackGameDiagnosticViewportBuckets:
  readonly FeedbackGameDiagnosticViewportBucket[];
export const feedbackGameDiagnosticFrameRateBuckets:
  readonly FeedbackGameDiagnosticFrameRateBucket[];
export const feedbackGameDiagnosticFrameTimeBuckets:
  readonly FeedbackGameDiagnosticFrameTimeBucket[];
export const feedbackGameDiagnosticFeatureIds:
  readonly FeedbackGameDiagnosticFeatureId[];
export const feedbackGameDiagnosticCounterCodes:
  readonly FeedbackGameDiagnosticCounterCode[];
export const feedbackGameDiagnosticErrorCodes:
  readonly FeedbackGameDiagnosticErrorCode[];
export const feedbackGameDiagnosticSurfaceRegistrations:
  FeedbackGameDiagnosticSurfaceRegistrationMap;
export function parseFeedbackGameDiagnostics(
  input: unknown
): FeedbackGameDiagnostics;

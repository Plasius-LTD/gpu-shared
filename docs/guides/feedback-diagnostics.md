# Feedback diagnostics

Approved renderer and viewer packages can validate an already bucketed
diagnostic observation before attaching it to a bug submission:

```js
import {
  feedbackGameDiagnosticSurfaceRegistrations,
  parseFeedbackGameDiagnostics,
} from "@plasius/gpu-shared/feedback-diagnostics";

const diagnostics = parseFeedbackGameDiagnostics({
  type: "feedback-game-diagnostics",
  version: "1.0.0",
  surfaceId: "site.gpu-demo",
  consentConfirmed: true,
  provenanceContractId:
    feedbackGameDiagnosticSurfaceRegistrations["site.gpu-demo"]
      .provenanceContractId,
  renderer: "webgpu",
  backend: "worker",
  viewportBucket: "large-landscape",
  frameRateBucket: "60-plus",
  frameTimeBucket: "under-17ms",
  featureIds: ["renderer.frame-loop"],
  counters: [{ code: "frame-drop", count: 2 }],
  errorCodes: [],
});
```

The parser accepts only the two registered surfaces, rejects unknown fields and
requires explicit consent. `/player-system` is intentionally not registered.
Its closed vocabulary, numeric bounds and correlated TypeScript type come
directly from the lightweight
`@plasius/schema/feedback-diagnostics-vocabulary` entrypoint, and parity tests
validate accepted output against the full runtime schema.
Public asset-set identifiers remain trusted server-side reconstruction
metadata; they are never copied into a diagnostic packet. Other package modules
load public assets and render canvases, but this diagnostics module never
captures user pixels or performs diagnostic storage, logging, analytics, or
network transport.

The contract consumes the protected-CD-published `@plasius/schema ^1.4.0`
dependency recorded in this package's manifest and lock. Parity, type, bundle
and privacy tests validate it against that published artifact.

Publishing the contract does not enable collection. Production callers must
also receive the remotely evaluated, default-off
`feedback.game-diagnostics.enabled` flag and
`feedback.game-diagnostics.attach` capability. Disabling the flag omits
diagnostics while ordinary structured bug reporting remains available.

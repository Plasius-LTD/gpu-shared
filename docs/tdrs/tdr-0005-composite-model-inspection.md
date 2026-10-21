# TDR 0005: Composite inspection preparation

Status: accepted. Feature: site#1170; Story site#2313; Task gpu-shared#161.
Rollout: host-controlled `gpu-demo.scene-fidelity.enabled`.

Validate and snapshot all source URLs, manifests and transforms before loading.
Load sequentially using the inspection lifecycle's combined cancellation signal
and overall 60-second load deadline. Count source triangles and distinct backing
texture buffers before projecting geometry or allocating the renderer. Fail
closed on incomplete integrity, invalid geometry, budget excess or cancellation.

Reuse `createProductStudioMeshes` for source material projection and uniform
scaling, select only authored meshes, then translate the lowest Y to the declared
anchor and rotate positions/normals around Y. Preserve UVs, colours and texture
references. Allocate independent scene IDs; reuse material IDs only within a
source. Add a neutral ground with two triangles, size it to the placed models,
and pass the resulting meshes through `createInspectionRuntime`.

Keep GPU allocation, quality changes, refinement, camera events, pause and
teardown in their existing owners. Tests cover transforms, material identity,
immutability, budgets, cancellation, errors and shared lifecycle behavior. Real
browser reviews must qualify consumer scenes before release; mocked lifecycle
tests do not prove material fidelity or interactive performance.

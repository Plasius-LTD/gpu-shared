# Model inspection release qualification

Task #143 / Story Plasius-LTD/plasius-ltd-site#2303 / Feature #1170; production follow-on Story #2304. Rollout remains `gpu-demo.scene-fidelity.enabled` composed with the host GPU route access controls.

Release the already-reviewed fixed progressive inspection and native UHD commits independently of the experimental adaptive lifecycle in draft PR147. The additive model-inspection subpath uses published @plasius/gpu-renderer >=0.2.49. Sample targets 1–256, depth 1–12 and native UHD remain supported. No adaptive imports, undocumented source overrides or unqualified optical flags enter this release. This is a staged delivery; adaptive Task #118 stays open and its gates are not waived.

The renderer dependency passed exact-main CI and approved production CD run 38598336802; npm registry version 0.2.49 and integrity were verified. Run the package's complete tests, changed-runtime LCOV, types/lint/build/pack/privacy/Zero-Three and public consumer checks against that released dependency, then exact-head CI and approved CD. Site adoption must use the released package and retain on-demand assets and runtime loading.

# ADR0013: Dual-UV material fidelity

Status: accepted. Tracking site#2256 / shared#133, parent Feature site#2114.

Texture baking described below is historical and superseded by
[ADR0015](adr-0015-preserve-texture-transforms.md).

The loader owns glTF coordinate decoding. Preserve TEXCOORD_0 as `uvs` and
TEXCOORD_1 as `uvs1`, including normalized/strided accessors. Product Studio
forwards both unchanged through rigid placement and source-scale normalization.
Per-texture `texCoord` selects the set; KHR_texture_transform override takes
precedence. Missing referenced UV1, malformed coordinates and unsupported sets
fail closed. Texture-transform baking remains existing behavior, not newly
qualified filtering. No new dependency or material/transport implementation.

Contract: [glTF textureInfo](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#reference-textureinfo),
[texture transform](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Khronos/KHR_texture_transform).

Requires renderer dual-UV support; update/release both packages coherently through
approved CD. Local commit-pinned fixtures may qualify the pair before release.
Inherits Feature flags renderer.sampling.adaptivePerPixel.enabled and
gpu-demo.scene-fidelity.enabled; this input correction applies to fixed sampling
too. Roll back the paired GPU-native release, never flatten materials or add
Three.js. Tests/docs and physical native scene evidence precede quality claims.

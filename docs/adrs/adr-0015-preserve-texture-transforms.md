# ADR 0015: Preserve source texture pixels and transforms

Status: implementation; coordinated qualification pending. Task #135,
Story site#2268 / Feature site#2114; paired renderer Task #224.

Replace unchanged-size texture-transform baking with immutable per-slot
`transform: {offset, scale, rotation}`, UV selector and glTF wrapS/wrapT metadata.
Decoded pixel bytes and dimensions remain unchanged. Normal strength remains a
separate scalar. Reject non-finite/malformed transforms and unsupported wrapping.
Product Studio forwards the same texture objects.

This supersedes the baking policy retained by ADR0013. Rendering consumers must
apply the transform after UV selection and before wrapping; don't release this
loader with a consumer that ignores it. The coordinated native renderer has
bounded per-material metadata and matching tangent handling, not enlarged baked
images. Existing nonidentity texture output intentionally changes to recover
source detail. No local publication or compatibility fallback is permitted.
Three.js remains prohibited. Tests retain exact decoded bytes, selector
precedence, invalid-input rejection and Product Studio forwarding.

[Design](../design/texture-transform-preservation.md).

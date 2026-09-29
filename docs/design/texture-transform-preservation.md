# Preserve glTF texture detail

Parent site Epic#2113 / Feature#2114; coordinated with renderer cloth material
fidelity follow-up to Story#2256. Three.js is prohibited, including fallback.
Tracked Story site#2268; shared Task #135 and renderer Task #224.

Replace same-size transformed-image baking with original pixels plus per-slot
transform metadata (offset, rotation, scale) and wrapS/wrapT. Preserve UV override
selection and normal strength separately. Validate finite values and supported
wrap modes. Original data identity and dimensions remain intact, avoiding
resampling, larger baked atlases and repeated copies at the loader boundary.
gpu-renderer must consume the new metadata before this package is released for
Product Studio. Consumers must not silently ignore it; update contract/docs.

Tests first: identity/nonidentity, sevenfold repeat retaining every source byte,
independent normal/colour transform, UV1 override, invalid transforms/samplers,
Product Studio forwarding. Preserve all existing glTF admission and material
defaults. Parent rollout flags remain default off; no capability change.
Full tests/coverage/changed-source LCOV, types/lint/build/package/Zero-Three,
docs/ADR/CHANGELOG and exact-head CI are mandatory. Physical shader validation
and native room evidence are owned by renderer. No local publish or release.

# Scene-authoring getting started guide

## Purpose

The package README should teach a new consumer to create an original scene with
`@plasius/gpu-shared`. Mounting the Plasius harbour is an optional integration,
not the starting point. This documentation correction belongs to Feature
Plasius-LTD/plasius-ltd-site#1170, Story #2303 and gpu-shared Task #143.
It inherits `gpu-demo.scene-fidelity.enabled`; no runtime, public access,
capability, dependency or rollout changes are introduced.

## Example

Build a small material gallery from generated octahedra. Generate a small glTF
with embedded geometry and pass its Blob URL to the public
`mountGpuProductStudio` API. This composes the shared loader, material/mesh adapter,
framing and studio environment with the renderer peer. Explain this
boundary explicitly: the shared package adapts and frames the model; the renderer
owns lighting transport and GPU execution. This is not a general scene graph.

The example must run from a fresh browser project with the two installed npm
packages, a container and its documented markup. No site services, pre-existing
models, hidden helper files, private exports or internal injection hooks. Show
visible loading/errors, bounded rendering and renderer cleanup. Explain how to
change geometry, placement, material and quality, and how to substitute a loaded
glTF/GLB. Keep the complete inspection lifecycle and quality reference in a linked
guide. Preserve prebuilt integration and release-integrity documentation.

## Verification

- Typecheck every consumer JavaScript example against public declarations.
- Execute the getting-started module with the actual shared loader, scene mount
  and mesh adapter with a renderer double; verify geometry/materials, bounded submission,
  visible failure and disposal rather than matching editorial wording.
- Render the exact example with the released renderer in a WebGPU browser and
  inspect the resulting scene. Verify initialization failure messaging too.
- Run package lint, types, coverage, build, package and Zero-Three checks, then CI.
- Publish only through the approved main/production CD workflow and verify npm
  README content if this documentation update is released.

Existing ADRs 0005 and 0014 describe the reused boundaries. No architectural
decision changes, so a new ADR is not required.

## Public design rationale

Describe the native WebGPU approach through the capabilities and responsibilities
of each package. The README should help consumers build scenes; an internal
dependency-check name should not become the project's public identity or imply
opposition to Three.js. The author's preference for a more direct WebGPU workflow
is not a general claim about another library's quality.

Move dependency admission commands to linked contributor documentation, with the
existing implementation boundary, tests and release gates intact. Preserve the
working gallery, public API examples and managed release-integrity block. Review
the rendered prose and links and run existing example and package checks; no
word-for-word editorial assertion or new runtime test is needed for prose alone.

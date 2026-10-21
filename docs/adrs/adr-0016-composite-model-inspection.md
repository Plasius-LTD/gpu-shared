# ADR 0016: Bounded composite model inspection

Status: accepted. Date: 2026-10-21.
Feature: Plasius-LTD/plasius-ltd-site#1170; Story #2313; gpu-shared Task #161.

## Context

Individual model studies cannot expose inconsistent relative scale, placement,
contact shadows or material interaction between multiple objects. Consumers need
a reusable way to compose their own models without duplicating the loader,
material projection, camera or refinement lifecycle.

## Decision

Add `createSceneInspection` to the lazy `model-inspection` entry. Compose a bounded
list of integrity-checked sources with explicit uniform size, bottom-centre
anchor and up-axis rotation. Reuse the Product Studio material projection and
existing single-model inspection lifecycle. Assign scene-wide mesh/material
identities and retain within-source material reuse. Add one neutral ground plane.
Keep the existing public single-model API unchanged.

The host evaluates `gpu-demo.scene-fidelity.enabled` and its existing capability
before mounting. The generic library also requires explicit `enabled: true`.
It does not introduce account state or a second entitlement system.

## Consequences

The same fixed sampling, native UHD, cancellation and disposal apply to both
inspection modes. Six sources, 500,000 total triangles and 128 MiB decoded
texture buffers bound admitted work. Textures are checked after decoding and
before GPU allocation; hosts still own transport limits and reviewed inputs.
Static study placement is explicit, not a physical-scale inference or animation
system. Future general scene authoring and adaptive optical work remain separate.

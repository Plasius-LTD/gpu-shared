# TDR-0003: Feedback Diagnostic Packet

## Summary

`@plasius/gpu-shared` exports a closed parser and constants for optional,
privacy-safe renderer diagnostics attached to a structured bug report.

## Contract

- Version and type are exactly `1.0.0` and `feedback-game-diagnostics`.
- Surface and provenance must match the package-owned registration.
- Consent must be the literal value `true`.
- Renderer, backend, viewport, frame-rate, frame-time, feature, counter and
  error values come from closed allowlists.
- Feature and error arrays contain at most six unique values.
- Counter arrays contain at most 32 unique codes with integer counts from 1 to
  10,000.
- Unknown outer or counter fields fail validation.
- Inputs are snapshotted once from enumerable own data descriptors; accessors,
  holes, symbols, exotic arrays and proxy failures fail with one fixed error.
- Accepted output is copied and deeply frozen.
- Errors contain a fixed safe message and no rejected value.
- The module contains no network, persistence, logging or capture behavior.

## Release dependency

`@plasius/schema` 1.4.x is published through protected CD,
`@plasius/schema ^1.4.0` is recorded in this package's manifest and lock, and
parity, type, bundle and privacy validation runs against that published
artifact.

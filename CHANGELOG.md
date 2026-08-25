# Changelog

This file records major project milestones and user-visible development changes. The project has not assigned formal release version numbers yet.

## Unreleased

### Changed

- Coverage `mobilityRunRatio` now uses `anchorsFound` as its denominator so future no-anchor canonical runs cannot dilute the metric.
- Coverage metric notes now explicitly distinguish candidate-pool health from duplicate rejections and warn against comparing raw selection counts across different canonical config sets.
- Project README updated to reflect the implemented v0.1 engine, diagnostics, current 20-item fixture checkpoint, and local development workflow.

### Planned

- Correct `private_aftercare.anchorSuitability` from `1` to `0` in the next fixture/data PR.
- Expand the fixture set beyond 20 items with emphasis on Stage 3 and Light + Stage 3 coverage.
- Add at least one Light mobility-changing fixture so Light canonical paths exercise mobility reachability/preservation.
- Add fixtures that use currently sparse provider paths such as `receptacle:oral` and semi-private scene-specific behavior.

## Project milestones

### PR #6 — Coverage follow-up

- Added `avgEligiblePool` and `avgEligiblePoolByStage`.
- Moved mobility usage reporting to per-config `mobilityRunRatio`.
- Added directed and egalitarian semi-private canonical configurations.
- Confirmed semi-private `discovery_risk:semi` provider coverage.

### PR #5 — Fixture expansion batch 1

- Expanded `data/adult-items.json` from 10 to 20 fixtures.
- Focused the batch on Light coverage, egalitarian-friendly options, scene-dependent entries, and owner-aware provider paths.
- Reduced Light 2/3/2 empty-slot rates from severe baseline levels to approximately zero in validation runs.
- Kept the core engine unchanged while measuring data-only effects.

### PR #4 — Diagnostics and coverage tooling

- Added Explain Panel instrumentation and reverse item queries.
- Added Coverage Lint canonical configuration metrics.
- Added candidate-pool, rejection, forced-enabler, pinned-direction, and state diagnostics.
- Strengthened regression assertions and mutation-tested key invariants.
- Confirmed diagnostic instrumentation was observational and did not change generated results.

### PR #3 — v0.1 core engine

- Established the reviewed v0.2 data model used by the v0.1 engine.
- Implemented deterministic seeded RNG, provider ownership, hard eligibility, binding state, anchor selection, stage generation, scoring, and prompt compilation skeletons.
- Added directed and egalitarian bindings, per-character mobility state, Main Anchor reachability, enabler forcing, and anchor preservation.
- Fixed the initial anchor reachability/preservation and egalitarian direction consistency failures found by empirical testing.

## Notes

- Milestone headings refer to repository pull requests, not formal semantic versions.
- Detailed design decisions and empirical review notes live under `docs/`.

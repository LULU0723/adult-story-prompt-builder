# Changelog

This file records major project milestones and user-visible development changes. The project has not assigned formal release version numbers yet.

## Unreleased

### Added

- Automated Quality Gate foundation combining the existing regression suite and Coverage Lint into hard-failure and warning rules.
- `quality.html` developer page for running the gate locally.
- `js/compiler-v01.js` as the first real story prompt compiler, replacing the legacy line-by-line summary in the demo path.
- `compiler-test.html` and `js/compiler-test.js` for compiler-only smoke checks.

### Changed

- The demo app now compiles generated stages into one coherent story-writing prompt instead of using `compiler-dumb.js`.
- Story-level compiler controls are separated into length, opening, pace, writing style, lexical directness, adult-content share, and description focus.
- Main Anchor text is rendered once and only referenced by stage position afterward to avoid accidental duplicate execution.
- Project README updated for the 29-item fixture checkpoint, Quality Gate workflow, and v0.1 compiler foundation.
- Coverage `mobilityRunRatio` uses `anchorsFound` as its denominator so future no-anchor canonical runs cannot dilute the metric.
- Coverage metric notes distinguish candidate-pool health from duplicate rejections and warn against comparing raw selection counts across different canonical config sets.

### Planned

- Build the first product-facing form UI on top of the compiler settings without coupling narrative controls to physical eligibility.
- Complete the Draft Coverage baseline PR when the exact 29-item snapshot can be captured and externally reviewed.
- Keep future fixture expansion balanced across stages; Stage 1 is now the narrowest stage but remains healthy in absolute terms.
- Give Light mobility state a real structural effect; the current `light_position_hold` changes mobility to `partial`, but no existing fixture is gated by that transition.

## Project milestones

### PR #9 — Quality Gate foundation

- Added a thin automated gate over the existing regression suite and Coverage Lint.
- Added fail-closed contract validation so malformed diagnostics cannot silently pass as healthy.
- Added warnings for narrow stage pools, S3/S1 imbalance, mobility without preservation effect, singleton clusters, and low mobility-item ratio.

### PR #8 — Fixture expansion batch 2

- Expanded `data/adult-items.json` from 20 to 29 fixtures.
- Added nine Stage-3-capable fixtures, including Light late-stage options, two `receptacle:oral` provider paths, and semi-private-only behavior.
- Corrected `private_aftercare.anchorSuitability` from `1` to `0`.
- Raised Stage 3 candidate-pool coverage substantially while keeping dead/never-selected lists empty and anchor concentration lower.
- Added `light_position_hold`, which exercises mobility state mutation in Light runs; external review found that its `partial` state currently has no downstream eligibility/preservation effect.

### PR #7 — Maintenance: docs and coverage metric semantics

- Updated `mobilityRunRatio` to use `anchorsFound` as its denominator.
- Added explicit metric notes for duplicate rejections and raw selection counts.
- Refreshed `README.md` and added `CHANGELOG.md`.

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

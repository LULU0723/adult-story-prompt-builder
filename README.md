# Adult Story Prompt Builder

A static, modular prompt builder for adult fictional story prompts. It combines structured content data, deterministic seeded variation, compatibility filtering, character/scene providers, persistent runtime state, and a compiler-oriented architecture without requiring an LLM API or backend.

All fictional characters represented by the builder are adults.

## Current status

The project is in active v0.1 development. The core generation model and diagnostic tooling are implemented and have gone through repeated regression and mutation testing.

Current milestones include:

- deterministic seeded generation with stable item IDs
- directed and egalitarian two-character bindings
- anatomy/equipment/scene provider ownership
- hard eligibility filtering before weighted selection
- per-character mobility state
- Main Anchor reachability, enabler forcing, and preservation
- Explain diagnostics with reverse item queries
- Coverage Lint with canonical configuration matrices and per-stage candidate-pool metrics
- a 29-item fixture checkpoint with substantially improved Stage 3 and Light coverage
- an automated Quality Gate combining regression and coverage health checks
- a 2/3/2-only cross-version Coverage Baseline with 15% pool-regression tolerance

Prompt compilation is currently a minimal placeholder path rather than the finished v0.1 compiler. The current compiler layer is intentionally simple while generation, diagnostics, and content coverage are stabilized first.

The next content milestone should keep Stage 1 balanced while addressing the remaining Light mobility structural-effect gap. Large fixture expansion should rely on the Quality Gate and frozen baseline for routine regression detection, with external review reserved for checkpoints and unusual failures.

## Product principles

- Adult fictional characters only.
- Play/scenario intensity is separate from lexical explicitness and writing style.
- Character narrative fields such as gender, presentation, and archetype do not determine physical eligibility.
- Anatomy, equipment, and scene providers are owner-aware; requirements must be satisfied by the correct actor, receiver, or scene owner.
- Hard eligibility and state consistency are resolved before weighted random selection.
- Main Anchor reachability is preserved across earlier selections.
- Seeded generation must remain deterministic and independent of fixture JSON order.
- User locks and explicit permission states override automatic recommendation.
- Internal modules remain separate even though the final product is intended to compile one coherent prompt.

## Repository layout

- `data/adult-items.json` — structured fixture/content data.
- `data/COVERAGE_BASELINE.json` — frozen validated 2/3/2 coverage checkpoint used for cross-version regression checks.
- `js/app.js` — browser-facing application wiring and schema hard-stop behavior.
- `js/compiler-dumb.js` — current minimal prompt-output placeholder used before the full v0.1 compiler is implemented.
- `js/providers.js` — derives anatomy, equipment, and scene providers.
- `js/eligibility.js` — hard permission, stage, provider, mobility, and binding checks.
- `js/binding.js` — directed/egalitarian role state and role switching.
- `js/anchor.js` — Main Anchor selection and reachability analysis.
- `js/stage.js` — stage generation, preservation, forced enablers, and diagnostics.
- `js/score.js` — weighted scoring after hard filtering.
- `js/rng.js` — deterministic seeded random streams.
- `js/explain.js` — Explain Panel summaries and reverse item queries.
- `js/coverage.js` — canonical Coverage Lint metrics.
- `js/coverage-baseline.js` — captures and compares stable cross-version Coverage baselines.
- `js/test-runner.js` — browser regression suite.
- `js/quality-gate.js` — foundation hard-failure and warning checks.
- `js/quality-gate-baseline.js` — combines the foundation gate with frozen baseline regression checks.
- `docs/` — data-model, architecture, review, baseline policy, and checkpoint notes.

## Diagnostic and entry pages

The repository contains six useful entry points:

- `index.html` — project entry page linking to the developer diagnostics.
- `test.html` — regression suite.
- `explain.html` — generation explanation and reverse-query diagnostics.
- `coverage.html` — canonical configuration coverage metrics.
- `quality.html` — automated Quality Gate and intentional baseline capture utility.
- `lint.html` — fixture/data validation.

Because the pages load JSON and ES modules with `fetch`, use a local static HTTP server rather than opening the files directly with `file://`.

For example, from the repository root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` and navigate to the diagnostic pages as needed. Any equivalent static web server is fine.

## Coverage metrics

Coverage metrics are diagnostic, not product scores. In particular:

- `avgEligiblePool` and `avgEligiblePoolByStage` measure the usable candidate pool after hard filtering and anchor preservation.
- `emptyRate` detects exhausted drawable slots but can miss a pool that is technically non-empty yet too narrow.
- `mobilityRunRatio` should only be compared between configurations with the same `slotsByStage`.
- `nonRepeatableRejections` reflects prior filled-slot history and must not be used as a pool-health metric.
- raw `selectionCounts` depend on the canonical config set and should not be compared across revisions that add or remove configs.

## Quality Gate and baseline

The Quality Gate is intentionally thin: it calls the existing regression suite and Coverage Lint rather than duplicating generation logic.

Foundation hard failures include regression/schema failures, malformed diagnostic contracts, dead or never-selected fixtures, canonical no-anchor runs, and `emptyRate >= 15%`.

Foundation warnings include narrow per-stage pools, `S3/S1 < 0.50`, mobility changes with zero preservation rejections, singleton clusters, and a mobility-changing fixture ratio below 10%.

Cross-version baseline rules apply only to stable 2/3/2 canonical configurations. `avgEligiblePool` and each per-stage pool may fall at most 15% below the frozen checkpoint. `eligibleItems` may increase but may not decrease. Fixture-count or `dataVersion` changes warn so an intentional batch can be reviewed and the baseline refreshed.

The 1/1/1 pool metrics are intentionally excluded at 100 runs because seed-prefix testing showed materially higher Stage 2 variance. `mobilityRunRatio` and `preservationRejections` are stored only as observed/not-observed signals rather than numeric baselines.

See `docs/COVERAGE_BASELINE.md` for the refresh policy. Baseline values must be captured from the canonical Coverage run after a validated checkpoint; they must not be guessed from partial review notes.

## Development workflow

Development is kept in small, reviewable pull requests with explicit responsibility boundaries. Core engine changes, diagnostic changes, and fixture/data expansion should preferably be separated so regressions can be attributed cleanly.

Before merging meaningful engine or data changes:

1. run schema/fixture validation;
2. run the regression matrix;
3. run the Quality Gate and inspect hard failures and warnings;
4. inspect Coverage Lint for dead or never-selected fixtures, empty slots, and per-stage pool collapse;
5. use Explain diagnostics when a candidate is unexpectedly excluded or not selected;
6. refresh `COVERAGE_BASELINE.json` only after an intentional, externally validated content checkpoint;
7. for engine changes, verify deterministic behavior and JSON-order invariance.

See `CHANGELOG.md` for milestone history and `docs/` for detailed architecture decisions and empirical review notes.

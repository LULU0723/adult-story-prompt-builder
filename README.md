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
- an automated Quality Gate foundation that combines regression and coverage health checks
- a v0.1 prompt compiler foundation that turns generated stages into one coherent story-writing prompt

The v0.1 compiler now separates story length, opening style, pacing, writing style, lexical directness, adult-content share, and description focus. It also carries character physical constraints, scene constraints, Main Anchor priority, stage progression, and role-direction consistency into the final prompt.

The final end-user UI is still pending. The current `index.html` remains a developer-oriented demo and debug surface; the next product-facing milestone is a form-based UI that edits compiler/story settings without changing eligibility semantics.

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
- `js/app.js` — browser-facing demo wiring and schema hard-stop behavior.
- `js/compiler-v01.js` — current v0.1 story prompt compiler.
- `js/compiler-dumb.js` — retained legacy minimal compiler for historical comparison; not used by the current demo path.
- `js/compiler-test.js` — prompt compiler smoke checks.
- `js/providers.js` — derives anatomy, equipment, and scene providers.
- `js/eligibility.js` — hard permission, stage, provider, mobility, and binding checks.
- `js/binding.js` — directed/egalitarian role state and role switching.
- `js/anchor.js` — Main Anchor selection and reachability analysis.
- `js/stage.js` — stage generation, preservation, forced enablers, and diagnostics.
- `js/score.js` — weighted scoring after hard filtering.
- `js/rng.js` — deterministic seeded random streams.
- `js/explain.js` — Explain Panel summaries and reverse item queries.
- `js/coverage.js` — canonical Coverage Lint metrics.
- `js/test-runner.js` — browser regression suite.
- `js/quality-gate.js` — orchestrates existing regression and coverage results into hard failures and warnings.
- `docs/` — data-model, architecture, review, and checkpoint notes.

## Diagnostic and entry pages

The repository contains seven useful entry points:

- `index.html` — project demo and compiled prompt preview.
- `compiler-test.html` — compiler-only smoke test and sample prompt output.
- `test.html` — regression suite.
- `explain.html` — generation explanation and reverse-query diagnostics.
- `coverage.html` — canonical configuration coverage metrics.
- `quality.html` — automated hard-failure and warning gate built on regression + Coverage Lint.
- `lint.html` — fixture/data validation.

Because the pages load JSON and ES modules with `fetch`, use a local static HTTP server rather than opening the files directly with `file://`.

For example, from the repository root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` and navigate to the diagnostic pages as needed. Any equivalent static web server is fine.

## Prompt compiler

`compileStoryPrompt()` receives generation output plus character, scene, and story-level settings. It does not re-run eligibility or generation logic.

Current story-level axes are intentionally independent:

- length: ultra-short / short / medium
- opening: direct / situational
- pace: direct / quick escalation / gradual / slow burn / wave
- writing style: character-driven / dialogue-heavy / sensory / concise
- lexical directness: subtle / balanced / direct / very direct
- adult-content share: low / medium / high
- description focus: interaction / dialogue / emotion / physical

The compiler renders the Main Anchor once, marks where it executes in the stage plan, preserves actor/receiver direction for directed items, keeps mutual items non-directed, and tells the downstream model not to invent anatomy, equipment, or scene state that the engine did not provide.

## Coverage metrics

Coverage metrics are diagnostic, not product scores. In particular:

- `avgEligiblePool` and `avgEligiblePoolByStage` measure the usable candidate pool after hard filtering and anchor preservation.
- `emptyRate` detects exhausted drawable slots but can miss a pool that is technically non-empty yet too narrow.
- `mobilityRunRatio` should only be compared between configurations with the same `slotsByStage`.
- `nonRepeatableRejections` reflects prior filled-slot history and must not be used as a pool-health metric.
- raw `selectionCounts` depend on the canonical config set and should not be compared across revisions that add or remove configs.

## Quality Gate

The Quality Gate is intentionally thin: it calls the existing regression suite and Coverage Lint rather than duplicating their generation logic.

Current hard failures include regression/schema failures, dead or never-selected fixtures, canonical no-anchor runs, and `emptyRate >= 15%`.

Current warnings include narrow per-stage pools, `S3/S1 < 0.50`, mobility changes with zero preservation rejections, singleton clusters, and a mobility-changing fixture ratio below 10%.

## Development workflow

Development is kept in small, reviewable pull requests with explicit responsibility boundaries. Core engine changes, diagnostic changes, compiler/UI changes, and fixture/data expansion should preferably be separated so regressions can be attributed cleanly.

Before merging meaningful engine or data changes:

1. run schema/fixture validation;
2. run the regression matrix;
3. run the Quality Gate and inspect any warnings;
4. inspect Coverage Lint for dead or never-selected fixtures, empty slots, and per-stage pool collapse;
5. use Explain diagnostics when a candidate is unexpectedly excluded or not selected;
6. for engine changes, verify deterministic behavior and JSON-order invariance.

For compiler changes, also run `compiler-test.html` and inspect at least one compiled prompt for duplicate anchors, unresolved placeholders, and incorrect role direction.

See `CHANGELOG.md` for milestone history and `docs/` for detailed architecture decisions and empirical review notes.

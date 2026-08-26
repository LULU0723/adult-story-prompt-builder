# Eval Baseline v0

Frozen output-quality baseline for prompt/compiler A/B comparison.

## Source

- Source branch: `main`
- Source commit: `6b3bbf7f57db5d06880685380813f17b7384a052`
- Compiler: `js/compiler-v01.js`
- Data version: `0.2`
- Model outputs: GPT-5.6 Sol, generated once on 2026-08-26 with no extra user instruction

## Rules

1. Do not change the fixed input or seed between A/B comparisons.
2. Use the same model and no extra instruction when generating the comparison output.
3. Generate one output per case/version; do not cherry-pick.
4. B02 and B03 seeds were intentionally selected before freeze to cover forced-enabler and mirror-provider behavior.
5. When a compiler/prompt change is evaluated, compare the new prompt/output against the matching frozen case in this directory.

## Cases

| Case | Seed | Purpose | Anchor | Stage | Key coverage |
|---|---|---|---|---:|---|
| B01 | `100101` | 普通低強度基準 | `manual_oral_contact` | 2 | Light directed |
| B02 | `b02-1` | forced enabler / mobility | `requires_restricted_receiver` | 3 | `light_restraint` forced @ S2 |
| B03 | `b03-30` | Egalitarian + mirror | `verbal_direction` | 2 | `mirror_focus` selected |
| B04 | `400404` | Egalitarian + heavy + semi-public | `mutual_intensity_exchange` | 3 | bidirectional intensity |
| B05 | `500505` | anatomy ownership | `penis_penetrative_contact` | 3 | asymmetric anatomy |
| B06 | `600606` | equipment ownership | `full_restraint` | 3 | A owns `strap_on` |
| B07 | `700707` | public + mirror | `mutual_kissing_exchange` | 2 | public scene constraint |
| B08 | `800808` | Light egalitarian / writing quality | `verbal_direction` | 2 | low-mechanics prose quality |

Each `Bxx.md` contains the frozen fixed input, compact engine summary, compiled prompt, and one frozen model output.

## Intended use

For PR16a and later prompt/compiler work:

- engine selection should remain identical unless the PR explicitly changes generation semantics;
- compiled prompt can be diffed directly;
- model output should be regenerated once with the same model;
- compare objective compliance first, then subjective quality.

Suggested objective checks: length, anatomy/equipment ownership, direction, mobility preservation, list-like output, specification-language leakage, beat compliance.

Suggested human checks: main-anchor clarity, character consistency, narrative naturalness, ending naturalness.

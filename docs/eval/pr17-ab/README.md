# PR17 A/B Evaluation — Compiler output calibration

Baseline: PR #16 `docs/eval/baseline-v0/` (frozen B01–B08)
Candidate: PR #17 `feat/compiler-output-calibration-v01`
Model: GPT-5.6 Sol
Sampling rule: one output per case; no reroll/cherry-pick; same fixed input and seed.

## Engine invariance

B01–B08 engine selections remain 8/8 identical to baseline: anchor, assigned stage, selected items, direction, reachability and forced-enabler behavior are unchanged.

## Prompt-level changes under test

1. Length guidance changed from paragraph/dialogue-turn counts to Chinese-character ranges.
2. Added gender-pronoun guard: pronouns/second-person wording must follow `gender`, not anatomy/equipment/presentation inference.
3. Main Anchor action text moved to its assigned stage; the top `【主軸】` section now declares identity/importance only.

## Objective output comparison

Character counts below use non-whitespace characters for a stable repo-side metric.

| Case | Length mode | v0 chars | PR17 chars | PR17 stated range | Within range? |
|---|---|---:|---:|---|---|
| B01 | short | 631 | 674 | 800–1600 | no |
| B02 | short | 843 | 886 | 800–1600 | yes |
| B03 | medium | 873 | 1228 | 1400–2600 | no |
| B04 | short | 928 | 815 | 800–1600 | yes |
| B05 | ultra_short | 670 | 538 | 500–900 | yes |
| B06 | short | 862 | 853 | 800–1600 | yes |
| B07 | medium | 709 | 935 | 1400–2600 | no |
| B08 | short | 782 | 798 | 800–1600 | no (2 chars below lower bound) |

Current broad-range compliance: 4/8.

By length mode:
- ultra_short: 670 → 538 (single case; no conclusion from one sample)
- short mean: 809.2 → 805.2 (essentially unchanged)
- medium mean: 791.0 → 1081.5 (+36.7%)

Interpretation: changing to explicit Chinese-character guidance produced a meaningful increase for the two Medium cases, but the current `1400–2600` Medium target is still too high for this model. Short outputs did not materially lengthen.

## Structural / consistency checks

- List-like output: 0/8 both v0 and PR17.
- Engine/spec terminology leaked into story output (`provider`, `receptacle`, `penetrator`, `主軸事件`, `必要鋪墊`, stage labels): 0/8 PR17.
- Unresolved placeholders: 0/8 PR17.
- B02 forced-enabler + mobility preservation: preserved. The restriction remains active downstream and is used as the interaction core.
- B03 mirror behavior: preserved and repeatedly integrated into the scene.
- B05 anatomy ownership: preserved.
- B06 equipment ownership: preserved; the wearable prop remains owned/used by A.

## Important correction: B05 does NOT test anatomy→gender override

The actual frozen B05 input is:
- A (悠真): `gender: male`, `presentation: masculine`, anatomy includes `penis`
- B (凜): `gender: female`, `presentation: feminine`, anatomy includes `vagina`

Therefore the previously reported claim that B05 was `female + penis` was based on an incorrect reading of the baseline. Both v0 and PR17 appropriately use male references for A and female references for B.

The new gender guard remains a sensible defensive compiler rule, but B01–B08 do not contain a deliberately contradictory gender/anatomy case, so this A/B does not empirically prove its effect. A separate ad-hoc probe can test that rule without modifying the frozen baseline.

## Main Anchor relocation result

No engine behavior changed. In every PR17 prompt, concrete Main Anchor action text appears at the assigned stage as `核心事件`; the top `【主軸】` section contains only identity, assigned stage, and importance. The old self-reference (`在此階段執行上方主軸`) is gone.

No story-output regression was observed in the dedicated cases. B02 remains especially strong: the setup establishes restriction before the Stage 3 core and downstream behavior respects that state.

## Recommendation before merge

Keep the Main Anchor relocation and gender guard.

Length calibration should receive one small follow-up adjustment rather than treating current ranges as final. Data from this A/B suggests a more realistic next calibration for GPT-5.6 Sol is approximately:
- ultra_short: 500–900 (current range is acceptable)
- short: 700–1300
- medium: 1000–1800

Do not tune all ranges to make the current eight samples pass exactly; these are guidance bands, not hard validators. The main correction needed is lowering Medium and modestly lowering Short.

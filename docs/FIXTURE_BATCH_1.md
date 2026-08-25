# Fixture Expansion Batch 1 — 10 → 19

## Purpose

This batch is intentionally coverage-driven rather than taxonomy-complete. The goal is to test whether adding broader low-intensity and egalitarian-compatible content improves the diagnostic baselines established with the original 10 fixtures.

Core engine and diagnostic logic are not changed in this branch.

## Added fixtures

1. `mutual_kissing_exchange`
   - Light, mutual, stages 1–2
   - Expands egalitarian and low-intensity baseline pool.

2. `guided_touch`
   - Light directed item requiring actor `toucher:manual`
   - Exercises an existing provider kind without adding new engine vocabulary.

3. `mutual_body_contact`
   - Light, mutual, stages 1–2
   - Expands non-directional sensory/body-contact pool.

4. `private_aftercare`
   - Light, mutual, stage 3, requires scene `privacy:private`
   - Adds a private scene-dependent late-stage candidate.

5. `public_risk_whisper`
   - Light directed context modifier, stages 1–2
   - Requires scene `discovery_risk:public|semi`.

6. `breast_focus_touch`
   - Light/medium directed body-preference item
   - Requires actor `toucher:manual` and receiver `body_feature:breasts`.

7. `penis_penetrative_contact`
   - Medium/heavy anatomy-specific directed item
   - Requires actor `penetrator:penis` and receiver vaginal or anal receptacle.
   - Added primarily to exercise owner-aware anatomy asymmetry, not to improve Light coverage.

8. `lingering_pause`
   - Light directed pace item, stages 1–3
   - Provides a broad low-intensity candidate across the full narrative sequence.

9. `mutual_permission_exchange`
   - Light mutual verbal item, stages 1–2
   - Prevents verbal interaction from being represented only by directed control.

10. `private_close_dialogue`
   - Light directed private-scene item, stages 1–2
   - Adds another scene-dependent low-intensity option.

> Note: the branch now contains 20 fixtures, not 19, because this document was written after counting the nine planned additions and the final content pass included ten new fixture records. The coverage review should use the actual dataset count reported by the schema/coverage tool as the source of truth.

## Expected direction of change

The most important baseline from the 10-item dataset was:

- `directed-ff-232-i1`: emptyRate ≈ 33.3%
- `egal-ff-232-i1`: emptyRate ≈ 50.0%

This batch deliberately adds mostly `intensityMin: 1` items. Those two Light / multi-slot configs should improve materially if stage hints and role-shape balance are healthy.

Other expected effects:

- `eligibleItems` for egalitarian configs should grow closer to directed configs.
- `nonRepeatableRejections` per drawable slot should decrease or grow more slowly than the available candidate pool.
- `deadItems` and `neverSelected` should remain empty; any new entry should be reviewed item-by-item.
- `mobilityChangingItemRatio` should fall because no new mobility-changing fixture is added. This is intentional and should not alone be interpreted as evidence to remove mobility state.
- `preservationRejections` should still be observed together with fixed-slot `mobilityRunRatio` before making any decision about the mobility subsystem.

## Checkpoint rule

Do not expand directly to 25–30 until this batch is measured.

Review at least:

1. emptyRate for Light 2/3/2 configs
2. nonRepeatableRejections
3. eligibleItems cross-config ratio
4. deadItems / neverSelected / neverAnchor
5. mobilityChangingItemRatio + fixed-232 mobilityRunRatio + preservationRejections

If Light emptyRate does not improve, inspect `stageHints`, role-shape balance, and intensity distribution before adding more data.

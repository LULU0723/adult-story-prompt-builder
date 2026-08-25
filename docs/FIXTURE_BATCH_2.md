# Fixture Batch 2 Checkpoint

This checkpoint expands `data/adult-items.json` from 20 to 29 fixtures after the validated PR #6/#7 coverage instrumentation.

## Purpose

Batch 1 solved the Light empty-slot problem but exposed a narrower Stage 3 candidate pool, especially for Light + egalitarian configurations. Batch 2 is therefore intentionally Stage-3-heavy rather than taxonomy-balanced.

## Data changes

- Add 9 fixtures; all 9 have Stage 3 eligibility.
- 5 of the 9 have `intensityMin: 1` so Light scenes gain late-stage variation.
- Add one Light mobility-changing fixture (`light_position_hold`) using `setsMobility.receiver = partial`.
- Add two `receptacle: oral` fixtures (`manual_oral_contact`, `penis_oral_contact`).
- Add one `semi`-only scene fixture (`semi_private_risk_escalation`).
- Add both directed and mutual Stage 3 candidates.
- Avoid adding another item to the already dense `sensory_exchange` cluster.
- Correct `private_aftercare.anchorSuitability` from `1` to `0`; aftercare may participate in Stage 3 but must not become the Main Anchor.

## Expected coverage movement

Baseline from the 20-item checkpoint:

- `egal-ff-232-i1` Stage 3 `avgEligiblePool`: ~2.75
- `directed-ff-232-i1` Stage 3 `avgEligiblePool`: ~3.28
- `directed-ff-232-i3` Stage 3 `avgEligiblePool`: ~5.59
- Light directed/egalitarian `mobilityRunRatio`: 0%
- fixtures using `receptacle:oral`: 0
- `deadItems`: []
- `neverSelected`: []

## Acceptance targets

The external coverage review should verify:

1. regression suite remains green;
2. `deadItems` and `neverSelected` remain empty;
3. `egal-ff-232-i1` Stage 3 `avgEligiblePool >= 5.0`;
4. `directed-ff-232-i3` Stage 3 `avgEligiblePool >= 7.5`;
5. every canonical config has `Stage3 / Stage1 >= 0.50`, or any miss is explained by an intentional provider/scene restriction rather than generic pool shortage;
6. Light directed and egalitarian 2/3/2 configs have `mobilityRunRatio > 0`;
7. at least two fixtures exercise `receptacle:oral`;
8. the semi privacy configs can select `semi_private_risk_escalation`, while private/public cannot;
9. `private_aftercare` never appears as a Main Anchor;
10. fixture JSON order invariance remains intact.

## Deferred

No core engine, scoring, binding, provider, anchor, Explain, or Coverage logic is intentionally changed in this batch. Quality-gate automation should be considered after this 29-item checkpoint is externally validated.

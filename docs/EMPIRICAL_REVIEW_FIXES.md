# Empirical Review Fixes — PR #3

This document records the changes made after an external reviewer executed the v0.1 engine over 300 deterministic seeds and found that the selected Main Anchor failed to appear as `kind: "main"` in 131/300 runs (44%).

The measured failure classes were:

- anchor selected as an earlier non-main item: 77/300
- required enabler not preserved: 40/300
- pre-anchor item invalidated anchor: 14/300
- resulting anchor-error: 54/300

These numbers describe the pre-fix PR state. They are not claimed as post-fix results until the regression suite is rerun.

## Blocking fixes accepted

### B1 — Anchor cannot be drawn as a non-anchor item

`stage.js` excludes the chosen anchor ID from all ordinary candidate pools. The anchor may only be emitted through its dedicated anchor slot.

Invariant:

> A chosen anchor appears exactly once and that occurrence has `kind: "main"`.

### B2 — Reachability enabler is preserved

`anchor.js` returns whether the anchor is directly reachable or needs a one-step enabler. `stage.js` carries this information forward.

If a required enabler has not yet appeared, the generator forces it at its last remaining legal pre-anchor opportunity. Earlier slots remain free when reachability remains possible.

### B3 — Pre-anchor selections must preserve anchor reachability

Before an ordinary candidate is accepted, `stage.js` simulates:

- that candidate's mobility effect;
- a persistent role switch when applicable;
- the resulting binding and per-character mobility state.

The candidate is excluded if, after that simulation, the anchor is no longer directly reachable or reachable with one remaining legal enabler.

Pool-size collapse remains diagnostic-only; it is not a hard exclusion rule in v0.1.

### B4 — Egalitarian binding uses real character IDs

`makeEgalitarianBinding(characterIds)` requires exactly two concrete IDs. No code path may manufacture `"A"` / `"B"` IDs.

Missing `characterState[id]` is now an exception, not an implicit `free` mobility fallback. This prevents ghost state keys from silently disabling the mobility subsystem.

### B5 — Participant count is a hard eligibility rule

`evaluateEligibility()` rejects an item when `participantCount < item.minParticipants`.

### B6 — roleShape is a runtime hard eligibility rule

Schema lint remains the first line of defense, but runtime eligibility also rejects unsupported v0.1 role shapes. `app.js` stops generation when dataset validation contains errors.

### B7 — Candidate order must not affect deterministic results

Anchor and play candidate arrays are sorted by stable item slug immediately before weighted drawing. JSON array order is therefore not part of seed semantics.

`test.html` also compares normal fixture order against reversed fixture order for 300 seeds.

## Fixture-shape decisions accepted before expansion

### S1 / S9 — Permission is per item; `defaultStatus` is the fallback

Runtime permission shape:

```js
permissionByItem = {
  play_id: "allowed" | "no_recommend" | "disabled"
}
```

Effective state:

```text
permissionByItem[item.id] ?? item.defaultStatus ?? "allowed"
```

There is no global scalar permission state.

### S3 — Anchor stage is seeded, not always the latest stage

For each anchor candidate, its legal `stageHints` are filtered by current stage/slot budget and then selected through a deterministic per-item anchor-stage RNG stream.

### S10 — Prompt placeholders are schema-validated

For v0.1:

- `directed` templates must contain both `{actor}` and `{receiver}`.
- `mutual` templates must not use directional `{actor}` / `{receiver}` placeholders.

Fixture validation hard-fails on violations.

## Additional fixes included in the same pass

### S2 — Mobility rule syntax is validated

Allowed rule strings are:

- `min:free|partial|restricted|immobilized`
- `max:free|partial|restricted|immobilized`
- `eq:free|partial|restricted|immobilized`

Invalid strings are schema errors rather than runtime surprises.

### S4 — Anchor reachability respects slot budget

An enabler is only considered when at least one legal pre-anchor slot exists at one of its allowed stages.

### S5 — roleSwitch is invalid in egalitarian mode

v0.1 defines role switch as a persistent inversion of a directed binding. A role-switch item is excluded in egalitarian mode rather than becoming a no-op.

### S6 — Egalitarian debt is committed only when a directional item is actually selected

Direction may be proposed before filtering/drawing, but the binding's anti-monopoly memory is not advanced for empty slots. Mutual items also do not consume directional debt.

### S7 — Anchor affinity is not self-scored during anchor selection

When scoring anchor candidates, `anchorAffinity` receives no self-anchor context. Anchor affinity remains meaningful only for non-anchor items relative to the already-selected anchor.

### S8 — Accent exists as a runtime importance kind

v0.1 currently labels non-anchor Stage 1 and Stage 3 items as `accent`, while Stage 2 non-anchor items are `secondary`. This is intentionally simple and can be refined after real prompt review.

## Regression suite

`test.html` / `js/test-runner.js` runs 300 deterministic seeds and asserts:

1. a chosen anchor exists;
2. the chosen anchor appears exactly once as `kind: "main"`;
3. there are zero `anchor-error` steps;
4. reversing the JSON fixture order does not change the generated signature;
5. `minParticipants` is enforced;
6. unsupported `roleShape` is rejected.

This suite should be run before Coverage Lint results are trusted and before expanding the fixture dataset toward 40–60 items.

## Remaining deliberate deferrals

- candidate-pool floor lookahead is a warning/diagnostic, not a hard constraint;
- reversible mobility is still out of scope;
- full multi-party generation is still out of scope;
- the production Explain Panel and Coverage Lint are next, after this regression suite passes;
- fixture expansion should wait until the regression suite is green.

# Empirical Review Round 2 — Egalitarian Integration

A second independent Node harness review confirmed the first empirical-fix pass for directed generation across 13 configurations × 300 seeds, but found an egalitarian-only integration failure.

## E1 — Fixed: egalitarian anchor direction consistency

Root cause: anchor selection, preservation, and execution did not share one direction contract.

Previously:

- selection reachability used the context's current actor/receiver;
- preservation treated either egalitarian direction as sufficient;
- execution independently rolled a seeded direction at the anchor slot.

This allowed an enabler to restrict one character while the anchor later executed with the opposite role assignment.

### v0.1 rule

For egalitarian binding only, `chooseAnchor()` now deterministically pins one direction for each anchor candidate using a per-item stream:

```text
anchor-direction:<item-id>
```

The selected anchor carries:

```js
anchorChoice.direction = { actorId, receiverId }
```

If that anchor needs a one-step mobility enabler, the enabler uses the same pinned direction. The anchor slot also executes with that direction instead of rolling a new one.

The anchor itself does not consume egalitarian anti-monopoly debt. A forced directional enabler does consume debt after it is actually selected.

Directed binding is intentionally different: it does not pin a direction at anchor-selection time because a valid persistent `roleSwitch` before the anchor must be allowed to change the later directed binding.

## Regression matrix

`js/test-runner.js` now parameterizes generation instead of testing only one directed setup.

The browser suite covers 13 representative configurations, each across 300 seeds:

- directed / egalitarian;
- slots 1/1/1, 2/2/2, 2/3/2;
- intensity 1/2/3;
- F×F without equipment;
- F×F with character-owned penetrative toy;
- female actor + male receiver;
- M×M;
- public Scene Config.

For each generation it records/asserts:

- chosen anchor appears exactly once as `kind: "main"`;
- zero `anchor-error` steps;
- fixture JSON order invariance;
- no ghost `characterState` keys;
- runtime exceptions are caught and counted;
- empty slots are counted;
- generations where all non-anchor slots are empty are treated as regressions;
- pinned egalitarian anchor direction is the direction actually executed;
- forced enabler direction matches the pinned anchor direction.

## Schema guards added

Two latent v0.1 ambiguities are rejected at fixture validation time:

1. `roleSwitch === true` may not have `anchorSuitability > 0`. A role switch cannot itself be the Main Anchor in v0.1.
2. `roleShape === "mutual"` may not define `setsMobility`. v0.1 has no symmetric mobility-effect representation, so silently applying a mutual effect through an arbitrary actor/receiver direction would be incorrect.

## Diagnostics retained

`anchor-error` records now include both `direction` and the pre-error `state` snapshot so future Explain Panel diagnostics preserve the context needed to reproduce the failure.

Empty slots are explicitly measured. With the current small fixture set, some empty slots are expected in long slot budgets because most items are non-repeatable. This is not automatically a hard error unless every non-anchor slot in a generated scene is empty.

## defaultStatus semantics

`defaultStatus` is not decorative metadata. It defines the item's default automatic-generation permission when the user has no explicit override:

```text
permissionByItem[item.id] ?? item.defaultStatus ?? "allowed"
```

Use cases:

- `allowed`: participates in automatic generation by default;
- `no_recommend`: excluded from automatic generation until explicitly selected/overridden;
- `disabled`: unavailable by default and intended for content that requires explicit user enablement.

Fixture expansion should intentionally assign `defaultStatus`; it must not be mechanically filled with `allowed` for every item.

## Next gate

Do not trust Coverage Lint or expand active fixtures to 40–60 until the expanded regression matrix is rerun externally and reports zero blocking anchor/determinism/runtime failures for both directed and egalitarian modes.

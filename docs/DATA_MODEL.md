# Data Model v0.2.1

This document is the current source of truth for the v0.1 implementation after the PR #3 empirical review.

## Core design principles

1. Adult fictional characters only.
2. Gender/presentation are narrative fields and never determine physical eligibility.
3. Physical feasibility (Affordance), user allowance (Permission), and stylistic suitability (Fitness) are separate layers.
4. Main/Secondary/Accent are runtime importance labels, not narrative order.
5. Narrative order is controlled by `stageHints` and Stage 1 → 2 → 3 generation order.
6. Random selection occurs only inside the hard-valid candidate set.
7. Item IDs are stable slugs; deprecated IDs remain addressable.
8. JSON array order must never affect deterministic seeded results.

## Character

```js
{
  id: "lin",
  displayName: "Lin",
  adult: true,

  // Narrative-only fields. Engines must not infer anatomy from these.
  gender: "female",
  presentation: "androgynous",
  archetype: "cold_professional",

  // Physical facts used by deriveProviders().
  anatomy: ["vagina", "breasts", "anus", "mouth", "hands"],

  // Character-owned equipment only.
  equipment: ["strap_on"],

  // Five-level soft traits. Seed does not jitter these values.
  traits: {
    dominance: "low",
    initiative: "mid",
    shame: "high"
  },

  locks: {
    anatomy: false,
    traits: false
  }
}
```

Allowed trait scale:

- `very_low`
- `low`
- `mid`
- `high`
- `very_high`

Archetypes are UI presets. They may initialize traits, but once applied the runtime engine reads the resulting traits, not the archetype label.

## Scene Config

Scene Config is immutable during a v0.1 generation.

```js
{
  location: "bedroom",
  privacy: "private", // public | semi | private
  props: ["mirror"]
}
```

Rules:

- `privacy` belongs only here.
- Items must not directly filter on `privacy`; they depend on providers derived from Scene Config.
- Character-owned equipment and scene props are distinct.
- Equipment that supplies an actor-side affordance must have a character owner.

## Providers / Affordances

`deriveProviders(characters, sceneConfig)` is a pure function. Its input contract must not require `gender`, `presentation`, archetype, personality, or relationship labels.

Example output:

```js
[
  { owner: "lin", kind: "penetrator", spec: "manual" },
  { owner: "lin", kind: "penetrator", spec: "toy" },
  { owner: "shuang", kind: "receptacle", spec: "vaginal" },
  { owner: "scene", kind: "mirror", spec: "available" }
]
```

Providers answer only:

> Is the required physical/context resource present, and who owns/provides it?

They do not express user permission or narrative suitability.

## Permission

Permission is per item, never one global scalar.

Runtime shape:

```js
permissionByItem = {
  orgasm_delay: "no_recommend",
  full_restraint: "disabled"
}
```

Allowed states:

- `allowed`: normal random candidate.
- `no_recommend`: manually selectable, excluded from automatic randomization.
- `disabled`: unavailable to randomization and presets.

Effective state:

```text
permissionByItem[item.id] ?? item.defaultStatus ?? "allowed"
```

`defaultStatus` is therefore an active field, not metadata-only.

## Fitness / soft preference

Soft fitness affects weighting only. It must never silently exclude an item.

v0.1 scoring contributions:

- intensity fit;
- explicit user tag preference;
- anchor affinity for non-anchor items;
- diversity penalty.

Style/character/context fit are deferred.

## Character State

v0.1 dynamic state is per character, not scene-global.

```js
{
  lin: { mobility: "free" },
  shuang: { mobility: "free" }
}
```

Mobility order:

`free > partial > restricted > immobilized`

v0.1 rule: mobility is monotonic/non-reversible during one generated scene. No release/unbind planner is implemented.

Missing `characterState[id]` is a hard error. The engine must never silently treat an unknown character as `free`.

Do not create a generic state-expression language in v0.1. Items use explicit mobility fields.

Allowed mobility rules:

```text
min:free|partial|restricted|immobilized
max:free|partial|restricted|immobilized
eq:free|partial|restricted|immobilized
```

## Scene Binding

Directed:

```js
{
  mode: "directed",
  dominant: "lin",
  receptive: "shuang",
  roleSwitchUsed: false
}
```

Egalitarian:

```js
{
  mode: "egalitarian",
  characterIds: ["lin", "shuang"],
  debt: 0,
  previousInitiator: null,
  roleSwitchUsed: false
}
```

Rules:

- engine code uses real character IDs; it must not manufacture `"A"` / `"B"` keys;
- directed mode persists until an explicit `roleSwitch` item occurs;
- maximum one switch per scene;
- switch is persistent for all subsequent items;
- switch is allowed only in Stage 2 or 3;
- v0.1 `roleSwitch` is excluded in egalitarian mode rather than becoming a no-op;
- egalitarian anti-monopoly debt is committed only when a directional item is actually selected;
- mutual items and empty slots do not consume directional debt.

## Play Item

Canonical v0.1 shape:

```js
{
  id: "play_example",
  label: "Example",
  type: "play",
  category: "pace_control",
  subcategory: "example",
  cluster: "verbal_control",
  tags: ["control", "teasing"],

  description: "UI description",
  promptTemplate: "{actor} 對 {receiver} ...",

  roleShape: "directed", // directed | mutual in v0.1
  roleSwitch: false,

  requirements: {
    actor: [
      { kind: "penetrator", spec: ["manual", "toy"] }
    ],
    receiver: [
      { kind: "receptacle", spec: ["vaginal", "anal"] }
    ],
    scene: []
  },

  minParticipants: 2,

  requiresMobility: {
    actor: "min:partial",
    receiver: null
  },
  setsMobility: {
    receiver: "restricted"
  },

  stageHints: [2, 3],
  anchorSuitability: 1, // 0 | 1 | 2

  intensityMin: 1,
  intensityMax: 3,
  defaultIntensity: 2,

  baseWeight: 1,
  defaultStatus: "allowed",
  manualOnly: false,
  repeatable: false,
  deprecated: false
}
```

### Requirement semantics

- The array of requirements for one role is AND.
- `spec: []` inside one requirement is OR.
- Actor requirements must be satisfied by actor-owned providers.
- Receiver requirements must be satisfied by receiver-owned providers.
- Providers must not be combined across owners to satisfy one role.
- `scene` requirements are satisfied only by owner `scene` providers.

Example:

```js
actor: [
  { kind: "penetrator", spec: ["manual", "toy"] },
  { kind: "hands", spec: ["available"] }
]
```

means `(penetrator manual OR toy) AND hands`, all owned by the actor.

### Prompt template semantics

Schema validation enforces:

- `directed` item: template contains both `{actor}` and `{receiver}`;
- `mutual` item: template does not use directional `{actor}` / `{receiver}` placeholders.

This keeps role binding errors visible during fixture lint rather than producing silent malformed prompts.

## Main Anchor / Importance

`main`, `secondary`, and `accent` are runtime assignments and must not be stored as fixed item properties.

Items instead declare `anchorSuitability`:

- 0: not suitable as Main Anchor;
- 1: allowed but not preferred;
- 2: naturally suitable as Main Anchor.

The generator chooses the Main Anchor first.

Formal invariant:

> If an anchor is chosen, that exact item must appear exactly once as `kind:"main"` and must never be emitted through an ordinary slot.

## Narrative stages

v0.1 uses three coarse stages:

- Stage 1: setup / early escalation
- Stage 2: escalation / transition
- Stage 3: core / late interaction

Items declare multiple allowed stages through `stageHints`.

Anchor stage is not always the latest allowed stage. The engine performs a deterministic seeded choice among allowed stages that have available slot budget.

Generation order equals narrative order so Character State can be used in filter-before-draw.

Current simple runtime importance labeling:

- Main Anchor → `main`
- non-anchor Stage 2 item → `secondary`
- non-anchor Stage 1/3 item → `accent`

This labeling is deliberately simple and may be refined after real prompt review without changing canonical item schema.

## Anchor Reachability and Preservation

Selecting an anchor is valid only if it can be reached from the initial Character State within available pre-anchor slots.

v0.1 supports:

1. direct reachability; or
2. one monotonic mobility enabler before the anchor.

If a required enabler exists, its identity/stage are carried from anchor selection into stage generation. The engine forces it only at its last remaining legal opportunity; earlier slots remain free while reachability remains possible.

Before accepting another pre-anchor item, the engine simulates:

- that candidate's mobility effects;
- a persistent role switch when applicable.

The candidate is rejected if the Main Anchor is no longer directly reachable or reachable through one remaining legal enabler.

Candidate-pool collapse is diagnostic-only in v0.1. It is not a hard constraint.

## Intensity semantics

The user's selected play intensity is a maximum allowed intensity, not an exact point match.

Example:

- user max = 3
- item 1..2 → eligible
- item 2..4 → eligible at 2..3
- item 4..4 → ineligible

Rule:

```text
eligible iff item.intensityMin <= userMaxIntensity
actual range = [item.intensityMin, min(item.intensityMax, userMaxIntensity)]
```

Lighter setup/accent items therefore remain available in heavier scenes.

Play intensity remains independent from lexical explicitness.

## Deterministic seed semantics

- stable item slugs only;
- seed state includes `dataVersion`;
- independent streams for character/context/role/play/style;
- local rerolls include reroll count;
- Seed never changes anatomy, personality, or locked values;
- candidate arrays are stable-sorted by item slug before weighted drawing;
- reversing JSON item order must not alter output for identical data/settings/seed.

## Explain instrumentation

Eligibility returns structured rejection data:

```js
{
  eligible: false,
  rejections: [
    { stage: "provider", ruleId: "receiver.receptacle.vaginal", detail: "..." }
  ]
}
```

Explain UI must eventually support:

- candidate-pool funnel;
- top exclusion reasons;
- top score contributions;
- Character State snapshot;
- seed key;
- reverse query for a specific item;
- candidate-pool collapse warnings.

## Regression gate

Before Coverage Lint is trusted or fixtures expand beyond the initial set, `test.html` must run the engine over 300 deterministic seeds and assert:

- chosen anchor appears exactly once as Main;
- zero `anchor-error` steps;
- JSON order reversal produces identical signatures;
- participant count is enforced;
- unsupported role shapes are rejected;
- egalitarian binding uses real IDs and cannot create ghost state keys.

See `docs/EMPIRICAL_REVIEW_FIXES.md` for the pre-fix empirical failure counts and accepted fixes.

## Coverage lint

After regression is green, canonical configurations report:

- eligible item count;
- anchor-eligible count;
- cluster coverage;
- unreachable/dead item IDs;
- percentage of generated paths that actually change mobility.

If mobility-changing items remain rare after 40+ representative fixtures, reassess Character State versus sparse overrides.

## Deferred from v0.1

- reversible mobility / release planning;
- 3+ participant random generation;
- generic state-expression language;
- full pairwise compatibility matrix;
- CSP/SAT/MaxSAT/A*/STRIPS planning;
- embedding similarity;
- personality seed jitter;
- multiple randomness temperatures;
- clothing as a hard state unless fixtures prove it necessary;
- full narrative phase planner.

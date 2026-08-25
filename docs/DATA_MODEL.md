# Data Model v0.2

This document is the current source of truth for the v0.1 implementation.

## Core design principles

1. Adult fictional characters only.
2. Gender/presentation are narrative fields and never determine physical eligibility.
3. Physical feasibility (Affordance), user allowance (Permission), and stylistic suitability (Fitness) are separate layers.
4. Main/Secondary/Accent are runtime importance labels, not narrative order.
5. Narrative order is controlled by stage hints and generation order.
6. Random selection occurs only inside the hard-valid candidate set.
7. Item IDs are stable slugs; deprecated IDs remain addressable.

## Character

```js
{
  id: "A",
  displayName: "A",
  adult: true,

  // Narrative-only fields. Engines must not infer anatomy from these.
  gender: "female",
  presentation: "androgynous",
  archetype: "cold_professional",

  // Physical facts used by deriveProviders().
  anatomy: ["vagina", "breasts", "anus", "mouth", "hands"],

  // Character-owned equipment only. A device that can satisfy an actor-side
  // requirement must have an owner.
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

- very_low
- low
- mid
- high
- very_high

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
- Character-owned equipment and scene props are distinct. Equipment that supplies an actor-side affordance must have a character owner.

## Providers / Affordances

`deriveProviders(characters, sceneConfig)` is a pure function. Its input contract must not require `gender`, `presentation`, or relationship labels.

Example output:

```js
[
  { owner: "A", kind: "penetrator", spec: "manual" },
  { owner: "A", kind: "penetrator", spec: "toy" },
  { owner: "B", kind: "receptacle", spec: "vaginal" },
  { owner: "scene", kind: "mirror", spec: "available" }
]
```

Providers answer only: "is the required physical/context resource present, and who owns/provides it?"

They do not express user consent/preferences or narrative suitability.

## Permission

Every play item has a user-facing state:

- `allowed`: normal random candidate.
- `no_recommend`: manually selectable, excluded from automatic randomization.
- `disabled`: unavailable to randomization and presets.

Locks override randomization. Hard constraints are never relaxed by randomness modes.

## Fitness / soft preference

Soft fitness affects weighting only. It must never silently exclude an item.

v0.1 scoring contributions are intentionally small:

- intensity fit
- explicit user tag preference
- anchor affinity
- diversity penalty

Style/character/context fit are reserved fields for later versions but are not active v0.1 score factors.

## Character State

v0.1 dynamic state is per character, not scene-global.

```js
{
  A: { mobility: "free" },
  B: { mobility: "free" }
}
```

Mobility order:

`free > partial > restricted > immobilized`

v0.1 rule: mobility is monotonic/non-reversible during one generated scene. No release/unbind planner is implemented yet.

Do not create a generic state-expression language in v0.1. Items use explicit mobility fields.

## Scene Binding

A scene has one binding mode:

```js
{ mode: "directed", dominant: "A", receptive: "B" }
```

or

```js
{ mode: "egalitarian" }
```

Directed mode persists until an explicit `roleSwitch` item occurs.

Role switch rules in v0.1:

- maximum one switch per generated scene;
- switch is persistent for all subsequent items;
- switch is allowed only in stages 2 or 3.

Egalitarian mode uses seeded direction choice with anti-monopoly memory; it must avoid both permanent A-only initiation and mechanical ABAB alternation.

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

  // Actor/receiver refer to the effective binding at this narrative point.
  requiresMobility: {
    actor: "min:partial",
    receiver: null
  },
  setsMobility: {
    receiver: "restricted"
  },

  // Item may be valid at multiple stages.
  stageHints: [2, 3],

  // Static suitability for being selected as the scene anchor.
  anchorSuitability: 0, // 0 | 1 | 2

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
- Actor requirements must be satisfied by the actor's providers; receiver requirements by the receiver's providers. Do not combine providers across owners to satisfy one role.
- `scene` requirements are satisfied only by owner `scene` providers.

Example:

```js
actor: [
  { kind: "penetrator", spec: ["manual", "toy"] },
  { kind: "hands", spec: ["available"] }
]
```

means `(penetrator manual OR toy) AND hands`, all owned by the actor.

## Main Anchor / Importance

`main`, `secondary`, and `accent` are runtime assignments.

They must not be stored as a fixed item property.

Items instead declare `anchorSuitability`:

- 0: not suitable as the main anchor;
- 1: allowed but not preferred;
- 2: naturally suitable as a main anchor.

The generator chooses the Main Anchor first, then builds the narrative around it.

## Narrative stages

v0.1 uses three coarse narrative stages:

- Stage 1: setup / early escalation
- Stage 2: escalation / transition
- Stage 3: core / late interaction

Items declare `stageHints: [1,2,3]` as a set of allowed stages rather than one fixed stage.

Generation order equals narrative order so Character State can be used in filter-before-draw.

## Anchor Reachability

Selecting an anchor is valid only if the anchor can be reached from the initial Character State within the available pre-anchor slot budget.

Two checks are required:

1. Preservation: a preceding item may not move state into a condition from which the anchor becomes impossible under the v0.1 monotonic mobility model.
2. Reachability: if the anchor requires a lower mobility state than the initial state, at least one available pre-anchor item must be able to enable that state. If no enabler is available, that anchor is not eligible.

Pool-collapse lookahead is diagnostic-only in v0.1. It should generate Explain Panel warnings but should not become a hard exclusion rule until real generated samples justify it.

## Intensity semantics

The user's scene intensity is the maximum allowed play intensity, not an exact point match.

Example:

- user max intensity = 3
- item range = 1..2 → eligible
- item range = 2..4 → eligible at 2..3
- item range = 4..4 → ineligible

Rule:

```text
eligible iff item.intensityMin <= userMaxIntensity
actual range = [item.intensityMin, min(item.intensityMax, userMaxIntensity)]
```

Intensity fit then weights items closer to the target more strongly, while still allowing lighter setup/accent items in heavier scenes.

Play intensity remains independent from lexical explicitness.

## Diversity

Each item has exactly one manual semantic `cluster` for diversity control. Clusters model substitutability, not taxonomy.

Question for assigning a cluster:

> If the scene already contains one item from this cluster, would adding another often feel like the same idea repeated?

Locked user items do not count toward automatic diversity penalties.

## Deterministic seed model

- stable item slugs only; never hash array indices;
- seed state includes `dataVersion`;
- independent streams for character/context/role/play/style;
- local rerolls use a reroll count in the stream key;
- Seed never changes anatomy, personality, or locked values.

## Explain instrumentation

Eligibility functions must return structured rejection information from day one:

```js
{
  eligible: false,
  rejections: [
    { stage: "provider", ruleId: "receiver.receptacle.vaginal", detail: "..." }
  ]
}
```

Explain UI must support:

- candidate pool funnel by stage/slot;
- top exclusion reasons;
- top candidate score contributions;
- Character State snapshot;
- seed key;
- reverse query: why a specific item was excluded.

## Coverage lint

Canonical configurations must be run against fixtures to detect systematic data bias and dead items.

Report at least:

- eligible item count;
- anchor-eligible count;
- cluster coverage;
- unreachable/dead item IDs;
- percentage of generated test paths that actually change mobility.

If mobility-changing items remain rare after 40+ representative fixtures, reassess whether Character State is worth keeping versus sparse explicit overrides.

## Deferred from v0.1

- reversible mobility / release planning;
- 3+ participant random generation;
- generic state expression language;
- full pairwise compatibility matrix;
- CSP/SAT/MaxSAT/A*/STRIPS planning;
- embedding similarity;
- personality seed jitter;
- multiple randomness temperatures;
- clothing as a hard state unless fixtures prove it necessary;
- full narrative phase planner.

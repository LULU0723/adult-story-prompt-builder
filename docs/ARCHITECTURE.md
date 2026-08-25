# Architecture v0.2

## Runtime

Static GitHub Pages application using Vanilla HTML/CSS/JS.

No backend, database server, authentication, framework, build step, or LLM API is required for v0.1.

## v0.1 goals

The first implementation is a schema/engine validation build, not the final 160–220 item content release.

Target:

- 40–60 representative fixtures eventually;
- start with 8–12 fixtures for end-to-end validation;
- deterministic seed engine;
- two-character generation only;
- provider-based hard eligibility;
- per-character mobility state;
- directed/egalitarian binding;
- Main Anchor + 3 narrative stages;
- Explain Panel and Coverage Lint.

## Directory structure

```text
/
├─ index.html
├─ lint.html
├─ coverage.html
├─ css/
│  └─ app.css
├─ js/
│  ├─ app.js
│  ├─ schema.js
│  ├─ rng.js
│  ├─ providers.js
│  ├─ eligibility.js
│  ├─ binding.js
│  ├─ anchor.js
│  ├─ stage.js
│  ├─ score.js
│  ├─ compiler-dumb.js
│  ├─ compiler.js
│  ├─ explain.js
│  └─ state.js
├─ data/
│  ├─ adult-categories.json
│  ├─ adult-items.json
│  ├─ presets.json
│  ├─ styles.json
│  ├─ character-presets.json
│  ├─ story-frames.json
│  ├─ contexts.json
│  └─ overrides.json
└─ docs/
   ├─ PROJECT_SPEC.md
   ├─ DATA_MODEL.md
   ├─ TAXONOMY.md
   └─ ARCHITECTURE.md
```

## Responsibility boundaries

### `schema.js`

Runtime fixture validation and stable enum definitions.

Responsibilities:

- verify stable IDs;
- validate `stageHints`, `anchorSuitability`, intensity ranges, role shapes;
- validate requirement shape and OR `spec[]` values;
- reject unsupported v0.1 role shapes;
- reject broken references;
- detect duplicate IDs and obvious self-contradictions.

### `rng.js`

Pure deterministic random utilities only.

Responsibilities:

- hash a composite key;
- deterministic PRNG;
- weighted draw;
- independent stream keys;
- reroll-count derivation.

No adult-domain rules belong here.

### `providers.js`

Pure affordance derivation.

Input:

- character anatomy;
- character-owned equipment;
- immutable Scene Config.

Must not inspect gender, presentation, archetype, relationship labels, or personality.

### `eligibility.js`

Hard validity only.

Responsibilities:

- Permission state;
- participant count;
- role-shape support;
- provider/requirement satisfaction by the correct owner;
- per-character mobility requirements;
- stage eligibility;
- duplicate/non-repeatable item exclusion;
- role-switch budget;
- anchor reachability/preservation hooks.

Every rejection returns structured `ruleId` instrumentation for Explain Panel use.

### `binding.js`

Scene-level relationship direction.

Modes:

- directed;
- egalitarian.

Directed role switch is persistent and limited to once per scene.

Egalitarian directed-item direction should use seeded anti-monopoly memory rather than rigid ABAB alternation.

### `anchor.js`

Selects and validates the Main Anchor.

Responsibilities:

- anchor eligibility via `anchorSuitability`;
- allowed `stageHints`;
- user locks;
- reachability under available pre-anchor stage budget;
- future preservation under monotonic mobility.

Candidate-pool collapse is diagnostic-only in v0.1.

### `stage.js`

Narrative-order generation loop.

Generation order equals narrative order:

```text
choose anchor
-> determine anchor stage
-> generate pre-anchor stages in order
-> emit anchor at its stage position
-> generate post-anchor slots
```

Character State is applied immediately after each selected item.

Main/Secondary/Accent are runtime importance labels. They do not determine ordering.

### `score.js`

Soft weighting only.

v0.1 contributions:

- intensity fit;
- explicit user preference;
- anchor affinity;
- diversity penalty.

Hard exclusions must never be encoded as zero scores.

Scores should be additive contributions for Explain Panel readability. A weighted draw may convert total score to a positive weight internally.

### `compiler-dumb.js`

Early end-to-end compiler used before the full prompt system exists.

It should interpolate `promptTemplate` placeholders and concatenate enough output to inspect whether fixture wording and role binding are coherent.

### `compiler.js`

Later full compiler.

It should output one coherent LLM prompt while keeping:

- play intensity;
- lexical explicitness;
- style;
- character behavior;
- story length;

as separate axes.

### `explain.js`

Transforms instrumentation into human-readable diagnostics.

Must support reverse lookup:

> Why was item X excluded at this stage?

### `lint.html`

Developer-facing static page that loads fixtures and reports schema/data errors and warnings.

Warnings should include vocabulary/cluster growth and deprecated/broken references. Avoid arbitrary hard taxonomy caps unless an actual integrity condition is violated.

### `coverage.html`

Runs canonical two-character configurations to report:

- eligible count;
- anchor-eligible count;
- cluster coverage;
- dead items;
- mobility-state utilization.

## Generation pipeline

```text
User State / Locks
        ↓
Character Facts + Character Equipment + Scene Config
        ↓
deriveProviders()
        ↓
Permission Filter
        ↓
Choose Scene Binding
        ↓
Choose Main Anchor + Anchor Reachability
        ↓
Initialize Character State
        ↓
Generate Stage 1 → 2 → 3 in narrative order
        ↓
For each slot:
  hard eligibility
  anchor preservation/reachability
  soft score
  diversity
  seeded weighted draw
  apply per-character mobility effects
        ↓
Final assertions
        ↓
Prompt compiler
```

## Intensity rule

User intensity is the maximum allowed play intensity, not an exact-match filter.

An item is hard eligible if `item.intensityMin <= userMaxIntensity`.

Actual expression range is capped by the user's maximum. Lighter items remain available as setup/accent in heavier scenes.

Lexical explicitness is independent from play intensity.

## Character State rule

v0.1 only tracks per-character mobility:

```text
free > partial > restricted > immobilized
```

Mobility is monotonic/non-reversible in v0.1. Do not add a generic state framework until a second real dynamic state is proven necessary.

## Main Anchor rule

The Main Anchor is selected before stage filling.

An anchor must be reachable from initial Character State within the available pre-anchor slot budget. A preceding candidate that makes the anchor impossible under the monotonic model must be excluded.

If a selected candidate causes future pools to collapse severely, Explain Panel should warn. Pool-size thresholds are not hard constraints in v0.1.

## Fixture strategy

Do not fill the database evenly by taxonomy first. Stress the schema.

Initial fixture mix should cover:

- zero-requirement directed items;
- mutual items;
- anatomy-specific requirements;
- generic provider alternatives;
- equipment-dependent items;
- scene-provider requirements;
- mobility setters;
- mobility requirements;
- role switches;
- participant-count exclusions;
- dense same-cluster candidates;
- wide/narrow intensity ranges.

Only expand toward full taxonomy after these paths behave correctly.

## Test strategy

Unit-test objectively verifiable modules:

- `rng.js` determinism and stream independence;
- `providers.js` table-driven affordance derivation;
- `eligibility.js` pass/fail plus rejection `ruleId`;
- mobility comparisons/effects by character owner;
- anchor reachability.

Manual/Explain testing is appropriate for:

- score coefficient taste;
- cluster quality;
- compiler prose quality;
- egalitarian anti-monopoly constants;
- UI polish.

## Deferred

- reversible restraints;
- 3+ participant automatic generation;
- planner/search algorithms;
- generic state DSL;
- embedding similarity;
- full pair matrix;
- multiple randomness modes;
- clothing hard state until fixtures prove it useful;
- API/backend integration.

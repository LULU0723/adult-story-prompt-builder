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
├─ test.html
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
│  ├─ test-runner.js
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
   ├─ ARCHITECTURE.md
   └─ EMPIRICAL_REVIEW_FIXES.md
```

## Responsibility boundaries

### `schema.js`

Runtime fixture validation and stable enum definitions.

Responsibilities:

- verify stable IDs;
- validate `stageHints`, `anchorSuitability`, intensity ranges, role shapes;
- validate requirement shape and OR `spec[]` values;
- validate mobility rule strings;
- validate `promptTemplate` directional placeholders;
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

Callers must present weighted candidates in stable slug order. JSON array order must never become part of seed semantics.

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

- per-item Permission state (`permissionByItem[item.id]`, falling back to `item.defaultStatus`);
- participant count;
- role-shape support;
- provider/requirement satisfaction by the correct owner;
- per-character mobility requirements;
- stage eligibility;
- duplicate/non-repeatable item exclusion;
- role-switch budget and binding-mode support;
- anchor reachability/preservation hooks.

Every rejection returns structured `ruleId` instrumentation for Explain Panel use.

Missing `characterState[id]` is a hard error. Do not silently assume `free` mobility for an unknown character ID.

### `binding.js`

Scene-level relationship direction.

Modes:

- directed;
- egalitarian.

Directed role switch is persistent and limited to once per scene.

Egalitarian bindings store the actual two character IDs. The engine must never manufacture placeholder IDs such as `A` / `B` internally.

Egalitarian directed-item direction should use seeded anti-monopoly memory rather than rigid ABAB alternation. Directional debt is committed only when a directional item is actually selected; mutual items and empty slots do not consume it.

### `anchor.js`

Selects and validates the Main Anchor.

Responsibilities:

- anchor eligibility via `anchorSuitability`;
- seeded selection among legal `stageHints`;
- user locks;
- reachability under available pre-anchor stage/slot budget;
- future preservation under monotonic mobility.

If the anchor requires one mobility-changing enabler, the selected enabler identity and stage are carried forward to stage generation.

Candidate-pool collapse is diagnostic-only in v0.1.

### `stage.js`

Narrative-order generation loop.

Generation order equals narrative order:

```text
choose anchor
-> determine anchor stage
-> generate pre-anchor stages in order
-> preserve/force a required enabler at its last legal opportunity
-> emit anchor at its stage position
-> generate post-anchor slots
```

The chosen anchor ID is excluded from all ordinary candidate pools. It may only appear through the dedicated Main Anchor emission path.

Before accepting a pre-anchor candidate, the engine simulates its mobility effect and any persistent role switch. The candidate is excluded if the Main Anchor is no longer directly reachable or reachable through one remaining legal enabler.

Character State is applied immediately after each selected item.

Main/Secondary/Accent are runtime importance labels. They do not determine ordering. The current v0.1 labeling rule is intentionally simple: Stage 2 non-anchor items are `secondary`; Stage 1/3 non-anchor items are `accent`.

### `score.js`

Soft weighting only.

v0.1 contributions:

- intensity fit;
- explicit user preference;
- anchor affinity;
- diversity penalty.

Hard exclusions must never be encoded as zero scores.

Scores should be additive contributions for Explain Panel readability. A weighted draw may convert total score to a positive weight internally.

Anchor candidates are scored without self-anchor affinity.

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

### `test.html`

Browser regression gate for engine correctness.

Before Coverage Lint is trusted or fixtures expand toward 40–60 items, the suite must verify at least:

- 300 deterministic seeds;
- chosen Main Anchor appears exactly once as `kind:"main"`;
- zero `anchor-error` steps;
- reversing JSON fixture order does not alter the generated signature;
- participant-count filtering works;
- unsupported role shapes are rejected;
- egalitarian binding uses real character IDs and does not create ghost state keys.

### `coverage.html`

Runs canonical two-character configurations to report:

- eligible count;
- anchor-eligible count;
- cluster coverage;
- dead items;
- mobility-state utilization.

Coverage results are not trusted until `test.html` is green; otherwise engine failures can be misdiagnosed as data-labeling bias.

## Generation pipeline

```text
User State / Locks
        ↓
Character Facts + Character Equipment + Scene Config
        ↓
deriveProviders()
        ↓
Per-item Permission Filter
        ↓
Choose Scene Binding
        ↓
Choose Main Anchor + Seeded Anchor Stage + Reachability
        ↓
Initialize Character State
        ↓
Generate Stage 1 → 2 → 3 in narrative order
        ↓
For each ordinary slot:
  exclude Main Anchor ID
  hard eligibility
  simulate mobility / role switch
  preserve Main Anchor reachability
  force required enabler at last legal opportunity when needed
  soft score
  diversity
  stable-sort candidates by slug
  seeded weighted draw
  apply per-character mobility effects
        ↓
Emit Main Anchor exactly once as kind:"main"
        ↓
Final assertions / regression invariants
        ↓
Prompt compiler
```

## Intensity rule

The user's selected play intensity is a maximum allowed intensity, not an exact point match.

An item is hard-eligible when `item.intensityMin <= userMaxIntensity`. Softer items remain available as setup/accent material in heavier scenes.

## Regression invariant

The empirical pre-fix review found Main Anchor loss in 131/300 seeds. That failure mode is now elevated to a formal invariant:

> If `chooseAnchor()` returns a chosen anchor, `generateStages()` must emit that exact item exactly once with `kind:"main"`, with zero `anchor-error` steps.

See `docs/EMPIRICAL_REVIEW_FIXES.md` for the measured pre-fix failure classes and accepted fixes.

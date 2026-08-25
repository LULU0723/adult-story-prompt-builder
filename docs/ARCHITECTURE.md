# Architecture v0.1

## Runtime

Static GitHub Pages application. No backend, no database server, no authentication, no LLM API dependency.

## Proposed structure

```text
/
├─ index.html
├─ css/
│  └─ app.css
├─ js/
│  ├─ app.js
│  ├─ state.js
│  ├─ random.js
│  ├─ compatibility.js
│  ├─ compiler.js
│  └─ ui.js
├─ data/
│  ├─ adult-categories.json
│  ├─ adult-items.json
│  ├─ compatibility.json
│  ├─ presets.json
│  ├─ styles.json
│  ├─ character-presets.json
│  ├─ story-frames.json
│  └─ contexts.json
├─ prompts/
│  ├─ core.js
│  ├─ character.js
│  ├─ adult.js
│  ├─ story.js
│  ├─ style.js
│  ├─ variation.js
│  └─ output.js
└─ docs/
   ├─ PROJECT_SPEC.md
   ├─ DATA_MODEL.md
   ├─ TAXONOMY.md
   └─ ARCHITECTURE.md
```

## Module responsibilities

### `state.js`

Canonical application state. Must distinguish:

- user-selected values
- locked values
- preferred values
- free/randomizable values
- generated seed selections

Generated state must never silently overwrite locked state.

### `random.js`

Deterministic PRNG and weighted drawing only. It should not contain domain rules.

Responsibilities:

- seed hashing
- deterministic PRNG
- weighted selection
- optional temperature transform
- deterministic shuffle where needed

### `compatibility.js`

Domain validity and scoring.

Responsibilities:

- character capability derivation
- actor/receiver role assignment
- hard requirement filtering
- item compatibility evaluation
- tag-based preference scoring
- sparse explicit pair overrides
- diversity penalties
- final validation

### `compiler.js`

Orchestrates prompt modules and converts structured app state into a single coherent prompt.

It must not dump raw numeric latent parameters unless explicitly useful. Translate them into semantic writing instructions.

### `ui.js`

DOM rendering and event handling. Do not embed the content database in HTML.

### `app.js`

Application bootstrap and module orchestration.

## Data loading

For GitHub Pages compatibility, JSON files can be loaded through `fetch()` when served over HTTP(S). Local `file://` operation is not a v1 requirement.

## UI philosophy

Long single-page flow inspired by parameter-builder tools rather than a dashboard.

Recommended sections:

1. Play intensity
2. Core play selection
3. Adult-content parameters
4. Writing style
5. Plot seed
6. Characters
7. Relationship / scene
8. Story mode
9. Seed / variation
10. Prompt preview

Advanced areas should be collapsible.

## Prompt preview

Normal UI changes should update preview in real time. Randomized generated choices should only change when the relevant reroll action is triggered.

Recommended controls:

- reroll all free fields
- reroll plays
- reroll characters
- reroll context
- reroll story
- reroll style variation
- copy prompt

## Compatibility engine rule

Do not implement random selection as independent dimensions.

Correct order:

```text
user state
-> hard filtering
-> role assignment
-> candidate scoring
-> deterministic weighted draw
-> re-score remaining candidates
-> draw next slot
-> validation
-> compiled prompt
```

## Character anatomy defaults

The UI may derive default anatomy from a selected baseline profile, but anatomy is an independent structure and must remain editable for custom/fantasy/trans configurations.

Never infer play validity solely from labels such as male/female, BL/GL/MF, tomboy, or femboy.

## Avoiding data duplication

A canonical item has one ID. If it belongs conceptually to several UI groups, expose it through tags/aliases rather than duplicating data records.

Example: blindfold may be visible under both sensory and restraint filters while remaining one canonical item.

## V1 implementation sequence

1. Static layout and state model
2. Data loader and schema fixtures
3. Two-character profile editor with anatomy capability model
4. Adult item browser with category/search/status
5. Manual main/secondary/accent selection
6. Hard compatibility filtering
7. Deterministic weighted seed engine
8. Style/story/context modules
9. Prompt compiler
10. Validation/debug panel
11. GitHub Pages polish

## Debugging requirement

During development, provide an optional debug panel that explains why an item is:

- eligible
- down-weighted
- excluded

This is important because a compatibility-driven generator becomes difficult to tune if selection decisions are opaque.

# Project Specification v0.1

## Product definition

Adult Story Prompt Builder is a static GitHub Pages application whose primary function is compiling prompts for adult fictional story generation. Story structure, character design, relationship design, scene selection, and style controls are supporting systems around the adult-content core.

The project does not call an LLM API. It compiles a structured prompt that the user can paste into ChatGPT, Claude, Gemini, or another model.

## Primary goals

1. Let users define a desired adult scenario without requiring a full literary outline.
2. Provide inspiration through curated presets, archetypes, contexts, and play databases.
3. Avoid incoherent random combinations through hard constraints, role assignment, compatibility filtering, and weighted seeded variation.
4. Keep the final prompt executable by an LLM: UI labels must compile into behavioral writing instructions rather than opaque tags.
5. Make the content database maintainable without editing HTML.

## Non-goals for v1

- Backend services
- User accounts
- LLM API calls
- Complex relationship graphs
- Drag-and-drop story graph editor
- Full Character Bible by default
- Large worldbuilding systems
- Persistent preference storage as a priority

## Default workflow

1. Play intensity
2. Core adult plays
3. Adult-content parameters
4. Writing style
5. Core plot seed
6. Characters
7. Relationship and scene
8. Story mode
9. Seed / variation
10. Prompt preview

## Adult-content model

### Play intensity

- Light
- Medium
- Heavy

Heavy refers to play/scenario complexity and intensity, not automatically to anatomical explicitness.

### Lexical directness

Independent from play intensity:

- Subtle
- Balanced (default)
- Direct
- Very direct

Balanced should mix direct terminology with euphemism, sensory description, action, location, and reaction. Avoid repetitive anatomical vocabulary.

### Play slots

- Main play: exactly 1
- Secondary plays: 0-2
- Accent elements: 0-3
- Optional Free Mode may lift normal limits

### Item states

- Allowed
- Do not proactively recommend
- Fully disabled

## Character model

The UI is optimized for two adult original characters, while supporting 1-3 characters.

Core character depth is B+:

- gender
- anatomy/body profile
- appearance preset + custom description
- main archetype
- 0-3 secondary traits
- core personality
- external attitude
- private contrast
- speech style
- initiative
- control tendency
- dependency tendency
- shame/embarrassment tendency
- emotional triggers
- adult-context reactions
- sexual interaction role preference

Optional advanced C-level fields:

- past experiences
- values
- secret
- core contradiction
- long-term goal
- character arc

Gender/presentation/archetype/anatomy must remain separate dimensions.

## Relationship model

Lightweight A <-> B relationship structure:

- relationship type
- intimacy level
- power gap
- likely initiator
- relationship change direction

## Story modes

- Ultra-short scene
- Short story
- Medium story

Default openings should be minimal:

- direct entry
- one-sentence setup
- short setup
- custom

Default ending can be no special ending. Optional endings:

- brief afterglow
- relationship change

## Story skeleton presets

Initial candidates:

- direct / quick-entry
- slow-burn
- contrast
- power tension
- accidental escalation
- established relationship
- conflict-to-intimacy

No drag-and-drop graph in v1. Use preset skeletons plus optional node toggles.

## Pace presets

- Direct
- Quick escalation (recommended default)
- Gradual
- Slow burn
- Wave: rise -> pullback -> re-escalate

## Writing-style system

Use one primary style and optional modifiers.

Primary style candidates:

- sensory
- psychological
- dialogue-driven
- narrative/general-fiction
- cool/controlled
- lush/rich
- slow-burn ambiguity
- power tension
- contrast-driven

Each style preset must define executable behavior, including:

1. sentence rhythm and density
2. description focus
3. show-vs-tell behavior
4. dialogue behavior
5. avoidances / failure modes

Example: Psychological style should prioritize judgment, hesitation, self-rationalization, expectation, shame, and shifts caused by new events. It must avoid repeatedly restating the same feeling.

## Viewpoint

Default: third-person omniscient.

Other options:

- third-person limited
- first person
- second person
- custom

## Randomization philosophy

The system is not a pure random generator.

Pipeline:

User State -> Hard Constraints -> Role Assignment -> Compatibility Filter -> Weighted Preference -> Seeded Random Draw -> Validation -> Prompt Compiler

Same settings + same seed must reproduce the same result.

User-locked values always override seed variation.

## Seed structure

Potential two-level seed design:

### Project Seed

Controls large-scale choices such as:

- play combination
- character supplements
- context
- scene
- story skeleton
- major atmosphere

### Variation Seed

Controls smaller details such as:

- descriptive focus
- minor reactions
- small events
- style micro-variation

## Randomness modes

- Conservative
- Balanced (default)
- Exploratory

These can be implemented as temperature-like flattening/sharpening of weighted candidate scores.

## Prompt compiler output order

1. Core task
2. Non-negotiable conditions
3. Character settings
4. Adult-content specification
5. Story structure
6. Style and narration
7. Seed-derived variation
8. Writing rules
9. Output requirement

Internal numbers should be translated into semantic instructions before being shown to the LLM.

## Safety / validity baseline

- All characters must be adults.
- Random generation must never introduce incompatible anatomy requirements.
- Random generation must never override locked user settings.
- High-control, restraint, pain, or power-exchange scenarios are treated as consensual adult fictional contexts in the compiler's baseline framing.

# Data Model v0.1

## Design rule

Separate content data, rule data, and prompt logic.

- Content data: plays, styles, archetypes, scenes, contexts.
- Rule data: compatibility, requirements, weights, intensity, role constraints.
- Prompt logic: converts structured selections into executable LLM instructions.

## Character profile

Suggested shape:

```json
{
  "id": "char_a",
  "name": "",
  "adult": true,
  "gender": "female",
  "presentation": [],
  "anatomy": {
    "penis": false,
    "vagina": true,
    "breasts": true
  },
  "archetype": {
    "primary": "cool_beauty",
    "secondary": ["restrained", "competitive"]
  },
  "traits": {
    "initiative": 35,
    "control": 60,
    "shame": 65,
    "dependency": 25,
    "sensorySensitivity": 55
  },
  "sexualRolePreference": ["switch"],
  "appearance": {
    "body": "balanced",
    "vibe": "cool",
    "hair": "long",
    "clothingStyle": "formal",
    "custom": ""
  },
  "locked": []
}
```

Gender, presentation, anatomy, archetype, and interaction role are independent dimensions.

## Adult play item

Suggested canonical shape:

```json
{
  "id": "orgasm_delay",
  "label": "延後高潮",
  "type": "play",
  "category": "pace_control",
  "subcategory": "orgasm_control",
  "description": "給使用者看的短說明",
  "llmInstruction": "給 Prompt Compiler 使用的可執行規則",
  "baseIntensity": 2,
  "intensityRange": [1, 3],
  "tags": ["control", "teasing", "pace"],
  "slotWeights": {
    "main": 1.4,
    "secondary": 1.2,
    "accent": 0.1
  },
  "baseWeight": 1.0,
  "requirements": {
    "roleCount": {"min": 2, "max": 2},
    "actorCapabilities": [],
    "receiverCapabilities": [],
    "equipment": [],
    "sceneTags": [],
    "minimumLength": "ultra-short"
  },
  "prefersTags": ["dominance", "permission"],
  "forbidsTags": [],
  "hardConflicts": [],
  "softConflicts": [],
  "recommendedWith": [],
  "manualOnly": false,
  "defaultStatus": "allowed"
}
```

## Item types

Initial enum:

- play
- fetish
- relationship_modifier
- scene_modifier
- clothing_modifier
- context_modifier
- character_modifier

The same canonical item should not be duplicated just because it appears in multiple UI categories. Cross-list items through tags or aliases.

## Capability / requirement model

Hard filtering should operate on capabilities and requirements, not broad relationship labels such as `BL`, `GL`, or `MF`.

Examples of capabilities:

- has_penis
- has_vagina
- has_breasts
- can_penetrate_with_toy
- can_receive_vaginal
- can_receive_anal
- can_dominate
- can_submit
- can_observe

A play may require explicit actor/receiver capabilities.

Example:

```json
{
  "requirements": {
    "actorCapabilities": ["has_penis"],
    "receiverCapabilities": ["has_vagina"]
  }
}
```

A toy-based alternative can instead require equipment and a compatible receiver without requiring actor anatomy.

## Role assignment

Do not evaluate only whether a play is globally valid. Resolve who acts and who receives.

Possible interaction roles:

- actor
- receiver
- dominant
- submissive
- observer
- initiator

Role assignment is influenced by character preferences and locked settings. Preference mismatches lower weight; hard capability mismatches remove the candidate.

## Compatibility levels

Use both generic tag rules and sparse item-level overrides.

Suggested semantic scale:

- +2 strongly recommended
- +1 compatible
- 0 neutral
- -1 unusual but allowed
- hard conflict = excluded

Do not create a full NxN matrix for every item. Most compatibility should be inferred from tags and requirements. Maintain explicit pair overrides only where necessary.

## Disable state

Each item has one user-facing state:

- allowed
- no_recommend
- disabled

Seed behavior:

- allowed: normal weighted candidate
- no_recommend: excluded from auto-generation but manually selectable
- disabled: unavailable to presets and random generation

## Slot model

Normal mode:

- main: exactly 1
- secondary: 0-2
- accent: 0-3

Each item uses slot-specific weights rather than only booleans. A mirror, for example, should have near-zero main weight but high accent weight.

## Intensity model

Use:

- `baseIntensity`: normal expression level
- `intensityRange`: supported adjustable range

This prevents duplicating light/medium/heavy variants of the same concept.

Heavy mode changes play complexity and intensity weighting, not lexical explicitness.

## Random score model

Candidate score can be composed from:

```text
FinalScore =
  BaseWeight
  * SlotWeight
  * IntensityMatch
  * CategoryMatch
  * StyleMatch
  * CharacterMatch
  * ContextMatch
  * CompatibilityModifier
  * DiversityModifier
  * UserPreference
```

Exact coefficients remain implementation-tunable.

## Diversity control

Repeated tags should receive diminishing weight unless the user explicitly requests a dense thematic cluster.

Example default concept:

- first occurrence: 1.00
- second same-tag occurrence: 0.70
- third same-tag occurrence: 0.40

This prevents pseudo-variety such as command + permission + posture command + naming command all appearing together by default.

## Deterministic seeded draw

Use a deterministic PRNG seeded from a user-provided or generated string/integer.

Selection order:

1. build valid candidates
2. score candidates
3. weighted draw for main
4. add selected item to current set
5. recalculate compatibility and diversity
6. draw secondary slots sequentially
7. recalculate
8. draw accent slots sequentially
9. validation pass

Never draw all slots independently before compatibility evaluation.

## Final validation

Validate at least:

- all characters are adults
- role count requirements
- actor/receiver anatomy requirements
- equipment requirements
- hard conflicts
- locked settings
- story-length requirements
- scene requirements
- maximum slot counts
- duplicate canonical item IDs
- excessive tag repetition

If a seeded draw fails validation, advance deterministically within the same PRNG stream rather than switching to uncontrolled randomness.

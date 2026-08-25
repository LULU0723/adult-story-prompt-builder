# Adult Story Prompt Builder

A static, modular prompt builder for adult fictional story generation. The project is designed around structured presets, weighted/seeded variation, compatibility filtering, character profiles, writing-style controls, and a compiler that emits one coherent LLM prompt.

## Project status

Early design / implementation phase. Product requirements and data models are being formalized from the design discussion before feature implementation.

## Core principles

- Adult fictional characters only.
- Adult-content intensity is primarily about play/scenario intensity, not maximal explicit wording.
- Prompt content, data, UI, and compiler logic are separated for maintainability.
- Deterministic seeded variation is used only after hard compatibility filtering.
- User-locked settings always override presets and random variation.
- The final output is one structured prompt even though the project is internally modular.

See `docs/` for the working specification once the development branch is populated.

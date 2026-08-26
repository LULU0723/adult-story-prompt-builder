import { buildPromptModel, renderProjectPrompt, renderStandalonePrompt } from './prompt-model-v01.js';

export const PROMPT_MODES = Object.freeze({
  standalone: 'standalone',
  project: 'project'
});

export function compilePrompt({ mode = PROMPT_MODES.standalone, ...input } = {}) {
  const model = buildPromptModel(input);
  return mode === PROMPT_MODES.project
    ? renderProjectPrompt(model)
    : renderStandalonePrompt(model);
}

export function compileStoryPrompt(input = {}) {
  return compilePrompt({ ...input, mode: PROMPT_MODES.standalone });
}

export function compileProjectPrompt(input = {}) {
  return compilePrompt({ ...input, mode: PROMPT_MODES.project });
}

import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { compileStoryPrompt } from './compiler-v01.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

if (validation.errors.length > 0) {
  document.querySelector('#schema').textContent = JSON.stringify(validation, null, 2);
  document.querySelector('#result').textContent = 'Dataset validation failed. Generation stopped.';
  document.querySelector('#prompt').textContent = 'Fix schema errors before running the engine.';
  document.querySelector('#generate').disabled = true;
  throw new Error(`Dataset validation failed with ${validation.errors.length} error(s)`);
}

const characters = [
  {
    id: 'A', displayName: '角色A', adult: true, gender: 'female', presentation: 'androgynous', archetype: 'cold',
    anatomy: ['vagina','breasts','anus','mouth','hands'], equipment: [],
    traits: { dominance: 'high', initiative: 'high', shame: 'mid' }
  },
  {
    id: 'B', displayName: '角色B', adult: true, gender: 'female', presentation: 'feminine', archetype: 'reserved',
    anatomy: ['vagina','breasts','anus','mouth','hands'], equipment: [],
    traits: { dominance: 'low', initiative: 'mid', shame: 'high' }
  }
];

const sceneConfig = { location: 'bedroom', privacy: 'private', props: ['mirror'] };
const providers = deriveProviders(characters, sceneConfig);
const characterState = Object.fromEntries(characters.map(character => [character.id, { mobility: 'free' }]));
const binding = makeDirectedBinding(characters[0].id, characters[1].id);
const slotsByStage = { 1: 1, 2: 1, 3: 1 };

const storyConfig = {
  length: 'short',
  opening: 'direct',
  pace: 'quick_escalation',
  writingStyle: 'character_driven',
  lexicalDirectness: 'balanced',
  adultContentShare: 'medium',
  descriptionFocus: 'interaction'
};

function generate(masterSeed = 'demo-001', userMaxIntensity = 3) {
  const baseCtx = {
    dataVersion: DATA_VERSION,
    masterSeed,
    userMaxIntensity,
    providers,
    characterState,
    actorId: characters[0].id,
    receiverId: characters[1].id,
    participantCount: characters.length,
    binding,
    minAnchorStage: 2,
    maxAnchorStage: 3,
    slotsByStage,
    selectedIds: new Set(),
    selectedItems: [],
    preferredTags: new Set(['control']),
    permissionByItem: {},
    rerollCounts: [0,0,0]
  };

  const anchorResult = chooseAnchor(items, baseCtx);
  if (!anchorResult.chosen) return { error: 'No reachable anchor', anchorResult };
  const generation = generateStages(items, baseCtx, anchorResult.chosen, slotsByStage);
  return {
    anchor: anchorResult.chosen,
    generation,
    prompt: compileStoryPrompt({ generation, characters, sceneConfig, storyConfig })
  };
}

function render() {
  const seed = document.querySelector('#seed').value || 'demo-001';
  const intensity = Number(document.querySelector('#intensity').value || 3);
  const result = generate(seed, intensity);
  document.querySelector('#schema').textContent = JSON.stringify(validation, null, 2);
  document.querySelector('#result').textContent = JSON.stringify(result, null, 2);
  document.querySelector('#prompt').textContent = result.prompt ?? result.error;
}

document.querySelector('#generate').addEventListener('click', render);
render();

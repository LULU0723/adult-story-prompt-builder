import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { compileStoryPrompt } from './compiler-v01.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

const $ = id => document.querySelector(`#${id}`);

function checkedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map(input => input.value);
}

function csvValues(value) {
  return String(value ?? '').split(',').map(part => part.trim()).filter(Boolean);
}

function readCharacter(prefix, fallbackName) {
  return {
    id: prefix.toUpperCase(),
    displayName: $(`${prefix}-name`).value.trim() || fallbackName,
    adult: true,
    gender: $(`${prefix}-gender`).value,
    presentation: $(`${prefix}-presentation`).value,
    archetype: $(`${prefix}-archetype`).value.trim() || undefined,
    rolePreference: $(`${prefix}-role`).value.trim() || undefined,
    narrativeNote: $(`${prefix}-note`).value.trim() || undefined,
    anatomy: checkedValues(`${prefix}-anatomy`),
    equipment: checkedValues(`${prefix}-equipment`)
  };
}

export function readProductForm() {
  const characters = [readCharacter('a', '角色A'), readCharacter('b', '角色B')];
  const privacy = $('privacy').value;
  const sceneConfig = {
    location: $('location').value.trim() || (privacy === 'private' ? 'bedroom' : privacy === 'semi' ? 'semi_private_space' : 'public_space'),
    privacy,
    props: csvValues($('props').value)
  };
  const storyConfig = {
    length: $('length').value,
    opening: $('opening').value,
    pace: $('pace').value,
    writingStyle: $('writing-style').value,
    lexicalDirectness: $('directness').value,
    adultContentShare: $('adult-share').value,
    descriptionFocus: $('focus').value
  };
  return {
    characters,
    sceneConfig,
    storyConfig,
    bindingMode: $('binding').value,
    masterSeed: $('seed').value.trim() || 'demo-001',
    userMaxIntensity: Number($('intensity').value || 3)
  };
}

function buildGenerationContext(form) {
  const { characters, sceneConfig, bindingMode, masterSeed, userMaxIntensity } = form;
  const providers = deriveProviders(characters, sceneConfig);
  const characterState = Object.fromEntries(characters.map(character => [character.id, { mobility: 'free' }]));
  const binding = bindingMode === 'egalitarian'
    ? makeEgalitarianBinding(characters.map(character => character.id))
    : makeDirectedBinding(characters[0].id, characters[1].id);
  const slotsByStage = { 1: 1, 2: 1, 3: 1 };

  return {
    slotsByStage,
    ctx: {
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
      rerollCounts: [0, 0, 0]
    }
  };
}

export function generateFromForm(form) {
  const { ctx, slotsByStage } = buildGenerationContext(form);
  const anchorResult = chooseAnchor(items, ctx);
  if (!anchorResult.chosen) {
    return {
      error: '目前設定找不到可達的 Main Anchor。可嘗試提高玩法強度、調整 anatomy / equipment、privacy，或更換 Seed。',
      anchorResult
    };
  }

  const generation = generateStages(items, ctx, anchorResult.chosen, slotsByStage);
  return {
    anchor: anchorResult.chosen,
    generation,
    prompt: compileStoryPrompt({
      generation,
      characters: form.characters,
      sceneConfig: form.sceneConfig,
      storyConfig: form.storyConfig
    })
  };
}

function render() {
  const status = $('status');
  try {
    status.textContent = 'Generating…';
    const form = readProductForm();
    const result = generateFromForm(form);
    $('schema').textContent = JSON.stringify(validation, null, 2);
    $('result').textContent = JSON.stringify({ form, ...result }, null, 2);
    $('prompt').textContent = result.prompt ?? result.error;
    $('prompt').classList.toggle('error', Boolean(result.error));
    status.textContent = result.error ? 'No reachable anchor' : 'Generated';
  } catch (error) {
    $('prompt').textContent = `Generation failed: ${String(error?.message ?? error)}`;
    $('prompt').classList.add('error');
    $('result').textContent = String(error?.stack ?? error);
    status.textContent = 'Error';
  }
}

function makeSeed() {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(2);
    crypto.getRandomValues(buffer);
    return `seed-${buffer[0].toString(36)}-${buffer[1].toString(36)}`;
  }
  return `seed-${Date.now().toString(36)}`;
}

if (validation.errors.length > 0) {
  $('schema').textContent = JSON.stringify(validation, null, 2);
  $('result').textContent = 'Dataset validation failed. Generation stopped.';
  $('prompt').textContent = 'Fix schema errors before running the engine.';
  $('prompt').classList.add('error');
  $('generate').disabled = true;
  $('status').textContent = 'Dataset invalid';
} else {
  $('generate').addEventListener('click', render);
  $('random-seed').addEventListener('click', () => {
    $('seed').value = makeSeed();
    $('status').textContent = 'Seed changed';
  });
  $('copy-prompt').addEventListener('click', async () => {
    const text = $('prompt').textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      $('status').textContent = 'Prompt copied';
    } catch {
      $('status').textContent = 'Copy failed — select the prompt manually';
    }
  });
  $('schema').textContent = JSON.stringify(validation, null, 2);
  render();
}

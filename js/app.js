import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { compileStoryPrompt } from './compiler-v01.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

const $ = id => document.querySelector(`#${id}`);
const PRIVACY_DEFAULT_LOCATIONS = Object.freeze({
  private: '臥室',
  semi: '半公開空間',
  public: '公開場所'
});
const SCENE_PROP_ALIASES = Object.freeze({
  mirror: 'mirror',
  '鏡子': 'mirror'
});

function checkedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map(input => input.value);
}

function csvValues(value) {
  return String(value ?? '').split(',').map(part => part.trim()).filter(Boolean);
}

function scenePropValues(value) {
  return csvValues(value).map(part => SCENE_PROP_ALIASES[part.toLowerCase()] || SCENE_PROP_ALIASES[part] || part);
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
    location: $('location').value.trim() || PRIVACY_DEFAULT_LOCATIONS[privacy],
    privacy,
    props: scenePropValues($('props').value)
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
      error: '目前設定找不到可達的主軸事件。可嘗試提高玩法強度、調整身體設定／道具、隱私程度，或更換隨機種子。',
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

function validateProductForm(form) {
  const errors = [];
  for (const character of form.characters) {
    if (!character.anatomy.length) errors.push(`${character.displayName} 尚未勾選任何身體設定。請至少選擇一項後再生成。`);
  }
  return errors;
}

function sceneWarning(form) {
  const privacy = form.sceneConfig.privacy;
  const location = form.sceneConfig.location.trim().toLowerCase();
  const obviousPrivate = ['bedroom', 'private_room', '臥室', '私人房間'].includes(location);
  const obviousPublic = ['public_space', 'street', 'park', '公開場所', '街道', '公園'].includes(location);
  if (privacy === 'public' && obviousPrivate) return '提醒：目前設定為「公開」，但地點看起來較私密。若是刻意設定可以保留；否則請調整其中一項。';
  if (privacy === 'private' && obviousPublic) return '提醒：目前設定為「私密」，但地點看起來較公開。若是刻意設定可以保留；否則請調整其中一項。';
  return '';
}

function isCompactLayout() {
  return globalThis.matchMedia?.('(max-width: 980px)').matches ?? false;
}

function scrollToPrompt() {
  if (!isCompactLayout()) return;
  $('prompt-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function render({ scroll = false } = {}) {
  const status = $('status');
  try {
    status.textContent = '生成中…';
    const form = readProductForm();
    const formErrors = validateProductForm(form);
    $('scene-warning').textContent = sceneWarning(form);
    $('form-warning').textContent = formErrors.join(' ');

    if (formErrors.length) {
      $('prompt').textContent = '請先完成上方必要設定。';
      $('prompt').classList.add('error');
      $('result').textContent = JSON.stringify({ form, validationErrors: formErrors }, null, 2);
      status.textContent = '需要補充設定';
      if (scroll) scrollToPrompt();
      return;
    }

    const result = generateFromForm(form);
    $('schema').textContent = JSON.stringify(validation, null, 2);
    $('result').textContent = JSON.stringify({ form, ...result }, null, 2);
    $('prompt').textContent = result.prompt ?? result.error;
    $('prompt').classList.toggle('error', Boolean(result.error));
    status.textContent = result.error ? '找不到可用主軸' : '已生成';
    if (scroll) scrollToPrompt();
  } catch (error) {
    $('prompt').textContent = `生成失敗：${String(error?.message ?? error)}`;
    $('prompt').classList.add('error');
    $('result').textContent = String(error?.stack ?? error);
    status.textContent = '發生錯誤';
    if (scroll) scrollToPrompt();
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

function handlePrivacyChange() {
  const previousPrivacy = $('privacy').dataset.previousPrivacy || 'private';
  const currentPrivacy = $('privacy').value;
  const currentLocation = $('location').value.trim();
  const previousDefault = PRIVACY_DEFAULT_LOCATIONS[previousPrivacy];
  if (!currentLocation || currentLocation === previousDefault || Object.values(PRIVACY_DEFAULT_LOCATIONS).includes(currentLocation)) {
    $('location').value = PRIVACY_DEFAULT_LOCATIONS[currentPrivacy];
  }
  $('privacy').dataset.previousPrivacy = currentPrivacy;
  $('scene-warning').textContent = sceneWarning(readProductForm());
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const ok = document.execCommand?.('copy') === true;
  textarea.remove();
  return ok;
}

async function copyPrompt() {
  const text = $('prompt').textContent || '';
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    $('status').textContent = 'Prompt 已複製';
    return;
  } catch {
    if (fallbackCopy(text)) {
      $('status').textContent = 'Prompt 已複製';
      return;
    }
    $('status').textContent = '複製失敗，請長按 Prompt 手動複製';
  }
}

const debugMode = new URLSearchParams(globalThis.location?.search ?? '').get('debug') === '1';
if (debugMode && $('developer-tools')) $('developer-tools').style.display = 'block';
$('privacy').dataset.previousPrivacy = $('privacy').value;

if (validation.errors.length > 0) {
  $('schema').textContent = JSON.stringify(validation, null, 2);
  $('result').textContent = 'Dataset validation failed. Generation stopped.';
  $('prompt').textContent = '資料驗證失敗，請先修正資料錯誤。';
  $('prompt').classList.add('error');
  $('generate').disabled = true;
  $('status').textContent = '資料無效';
} else {
  $('generate').addEventListener('click', () => render({ scroll: true }));
  $('privacy').addEventListener('change', handlePrivacyChange);
  $('location').addEventListener('input', () => {
    $('scene-warning').textContent = sceneWarning(readProductForm());
  });
  $('random-seed').addEventListener('click', () => {
    $('seed').value = makeSeed();
    render({ scroll: true });
  });
  $('copy-prompt').addEventListener('click', copyPrompt);
  $('schema').textContent = JSON.stringify(validation, null, 2);
  render();
}
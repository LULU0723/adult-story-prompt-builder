import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor, enumerateAnchorCandidates } from './anchor.js';
import { generateStages } from './stage.js';
import { compilePrompt } from './compiler-v01.js';
import { PROJECT_INSTRUCTIONS_V01 } from './project-instructions-v01.js';
import { itemCopy } from './item-copy-v01.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);

const $ = id => document.querySelector(`#${id}`);
const PRIVACY_DEFAULT_LOCATIONS = Object.freeze({ private: '臥室', semi: '半公開空間', public: '公開場所' });
const SCENE_PROP_ALIASES = Object.freeze({ mirror: 'mirror', '鏡子': 'mirror' });
const ANATOMY_PRESETS = Object.freeze({
  'typical-female': ['vagina', 'breasts', 'anus', 'mouth', 'hands'],
  'typical-male': ['penis', 'anus', 'mouth', 'hands'],
  common: ['anus', 'mouth', 'hands'],
  clear: []
});
const CATEGORY_LABELS = Object.freeze({
  basic_intimacy: '基礎親密互動',
  dominance_submission: '主導與控制',
  restraint: '限制與姿勢控制',
  pace_control: '節奏與升溫',
  sensory_play: '感官互動',
  body_preference: '身體部位偏好',
  props_environment: '道具互動',
  public_risk: '公開／半公開風險',
  shame_display: '展示與視覺',
  character_contrast: '角色反差',
  context: '場景情境',
  bdsm_intense: '高強度控制'
});

function checkedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)].map(input => input.value);
}
function setCheckedValues(containerId, values) {
  const selected = new Set(values);
  for (const input of document.querySelectorAll(`#${containerId} input[type="checkbox"]`)) input.checked = selected.has(input.value);
}
function csvValues(value) { return String(value ?? '').split(',').map(part => part.trim()).filter(Boolean); }
function scenePropValues(value) { return csvValues(value).map(part => SCENE_PROP_ALIASES[part.toLowerCase()] || SCENE_PROP_ALIASES[part] || part); }
function uniqueValues(values) { return [...new Set(values.filter(Boolean))]; }
function itemDisplayName(item) { return itemCopy(item)?.displayName || item?.label || item?.id || '未命名玩法'; }

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

function readMainPlaySelection() {
  return {
    mode: $('main-play-mode')?.value || 'auto',
    category: $('main-play-category')?.value || null,
    itemId: $('main-play-item')?.value || null,
    directionKey: $('main-play-direction')?.value || null
  };
}

export function readProductForm() {
  const characters = [readCharacter('a', '角色A'), readCharacter('b', '角色B')];
  const privacy = $('privacy').value;
  const sceneConfig = {
    location: $('location').value.trim() || PRIVACY_DEFAULT_LOCATIONS[privacy],
    privacy,
    props: uniqueValues([...checkedValues('scene-props'), ...scenePropValues($('other-props').value)])
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
    promptMode: $('prompt-mode')?.value || 'standalone',
    bindingMode: $('binding').value,
    masterSeed: $('seed').value.trim() || 'demo-001',
    userMaxIntensity: Number($('intensity').value || 3),
    mainPlay: readMainPlaySelection()
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

function anchorSelectionForEngine(form) {
  if (form.mainPlay.mode === 'category') return { mode: 'category', category: form.mainPlay.category };
  if (form.mainPlay.mode === 'exact') return { mode: 'exact', itemId: form.mainPlay.itemId, directionKey: form.mainPlay.directionKey };
  return { mode: 'auto' };
}

export function generateFromForm(form) {
  const { ctx, slotsByStage } = buildGenerationContext(form);
  const anchorResult = chooseAnchor(items, ctx, anchorSelectionForEngine(form));
  if (!anchorResult.chosen) {
    const manual = form.mainPlay.mode !== 'auto';
    return {
      error: manual
        ? (anchorResult.validation?.reason || '目前設定下找不到符合指定 Main Play 的可達主軸。請調整類型、玩法、方向、強度或角色設定。')
        : '目前設定找不到可達的主軸事件。可嘗試提高玩法強度、調整身體設定／道具、隱私程度，或更換隨機種子。',
      anchorResult
    };
  }
  const generation = generateStages(items, ctx, anchorResult.chosen, slotsByStage);
  return {
    anchor: anchorResult.chosen,
    generation,
    prompt: compilePrompt({
      mode: form.promptMode,
      generation,
      characters: form.characters,
      sceneConfig: form.sceneConfig,
      storyConfig: form.storyConfig
    })
  };
}

function validateProductForm(form) {
  const errors = [];
  for (const character of form.characters) if (!character.anatomy.length) errors.push(`${character.displayName} 尚未勾選任何身體設定。請至少選擇一項後再生成。`);
  if (form.mainPlay.mode === 'category' && !form.mainPlay.category) errors.push('請選擇 Main Play 類型。');
  if (form.mainPlay.mode === 'exact' && !form.mainPlay.itemId) errors.push('請選擇具體 Main Play。');
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
function updateModeUi() {
  const projectMode = ($('prompt-mode')?.value || 'standalone') === 'project';
  if ($('copy-project-instructions')) $('copy-project-instructions').hidden = !projectMode;
  if ($('prompt-mode-hint')) $('prompt-mode-hint').textContent = projectMode
    ? 'Project Prompt 只輸出本次動態設定；請先把固定指示貼進 GPT Project。'
    : 'Standalone Prompt 已包含固定規則，可直接貼到一般對話使用。';
}
function updateFormFeedback() {
  const form = readProductForm();
  $('scene-warning').textContent = sceneWarning(form);
  $('form-warning').textContent = validateProductForm(form).join(' ');
  updateModeUi();
}
function applyAnatomyPreset(target, presetName) {
  const values = ANATOMY_PRESETS[presetName];
  if (!values) return;
  setCheckedValues(`${target}-anatomy`, values);
  refreshMainPlayPicker();
  updateFormFeedback();
  $('status').textContent = presetName === 'clear' ? '身體設定已清空' : '已套用身體設定，可再自行調整';
}
function isCompactLayout() { return globalThis.matchMedia?.('(max-width: 980px)').matches ?? false; }
function scrollToPrompt() { if (isCompactLayout()) $('prompt-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function installMainPlayPickerUi() {
  const binding = $('binding');
  const card = binding?.closest('.card');
  const grid = binding?.closest('.grid3');
  if (!card || !grid || $('main-play-picker')) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'main-play-picker';
  wrapper.innerHTML = `
    <h3>Main Play 主軸</h3>
    <div class="grid3">
      <label class="field"><span>主軸選擇</span><select id="main-play-mode"><option value="auto" selected>自動選擇</option><option value="category">指定類型</option><option value="exact">指定玩法</option></select></label>
      <label class="field" id="main-play-category-field" hidden><span>玩法類型</span><select id="main-play-category"></select></label>
      <label class="field" id="main-play-item-field" hidden><span>具體玩法</span><select id="main-play-item"></select></label>
      <label class="field" id="main-play-direction-field" hidden><span>角色方向</span><select id="main-play-direction"></select></label>
    </div>
    <p class="hint" id="main-play-hint">自動選擇會依目前設定、強度與隨機種子安排可達的主軸。</p>`;
  grid.insertAdjacentElement('afterend', wrapper);
}

function setSelectOptions(select, entries, previousValue) {
  if (!select) return null;
  select.replaceChildren(...entries.map(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  if (entries.some(entry => entry.value === previousValue)) select.value = previousValue;
  return select.value || null;
}

function pickerCandidates(form) {
  const { ctx } = buildGenerationContext(form);
  return enumerateAnchorCandidates(items, ctx, { directionMode: 'all' });
}

function refreshMainPlayPicker() {
  if (!$('main-play-mode')) return;
  const form = readProductForm();
  const mode = $('main-play-mode').value;
  const candidates = pickerCandidates(form);
  const categoryField = $('main-play-category-field');
  const itemField = $('main-play-item-field');
  const directionField = $('main-play-direction-field');
  categoryField.hidden = mode === 'auto';
  itemField.hidden = mode !== 'exact';
  directionField.hidden = true;

  if (mode === 'auto') {
    $('main-play-hint').textContent = `目前共有 ${new Set(candidates.map(candidate => candidate.item.id)).size} 個可達主軸玩法；由系統自動選擇。`;
    return;
  }

  const categoryEntries = [...new Set(candidates.map(candidate => candidate.item.category))]
    .sort((a, b) => (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, 'zh-Hant'))
    .map(value => ({ value, label: CATEGORY_LABELS[value] || value }));
  const category = setSelectOptions($('main-play-category'), categoryEntries, form.mainPlay.category);
  const categoryCandidates = candidates.filter(candidate => candidate.item.category === category);

  if (mode === 'category') {
    $('main-play-hint').textContent = category
      ? `只會從「${CATEGORY_LABELS[category] || category}」中目前可達的 ${new Set(categoryCandidates.map(candidate => candidate.item.id)).size} 個主軸玩法選擇。`
      : '目前設定沒有可用的 Main Play 類型。';
    return;
  }

  const byItem = new Map();
  for (const candidate of categoryCandidates) if (!byItem.has(candidate.item.id)) byItem.set(candidate.item.id, candidate.item);
  const itemEntries = [...byItem.values()]
    .sort((a, b) => itemDisplayName(a).localeCompare(itemDisplayName(b), 'zh-Hant'))
    .map(item => ({ value: item.id, label: itemDisplayName(item) }));
  const itemId = setSelectOptions($('main-play-item'), itemEntries, form.mainPlay.itemId);
  const exactCandidates = categoryCandidates.filter(candidate => candidate.item.id === itemId);
  const directionEntries = exactCandidates.map(candidate => ({
    value: candidate.directionKey,
    label: candidate.direction
      ? `${form.characters.find(character => character.id === candidate.direction.actorId)?.displayName || candidate.direction.actorId} → ${form.characters.find(character => character.id === candidate.direction.receiverId)?.displayName || candidate.direction.receiverId}`
      : `${form.characters[0].displayName} → ${form.characters[1].displayName}`
  }));
  const uniqueDirections = [...new Map(directionEntries.map(entry => [entry.value, entry])).values()];
  setSelectOptions($('main-play-direction'), uniqueDirections, form.mainPlay.directionKey);
  directionField.hidden = uniqueDirections.length <= 1;
  $('main-play-hint').textContent = itemId
    ? `已固定 Main Play「${itemDisplayName(byItem.get(itemId))}」；隨機種子只決定階段位置與其他配套內容。`
    : '目前類型下沒有可用的具體 Main Play。';
}

function render({ scroll = false } = {}) {
  const status = $('status');
  try {
    status.textContent = '生成中…';
    const form = readProductForm();
    const formErrors = validateProductForm(form);
    $('scene-warning').textContent = sceneWarning(form);
    $('form-warning').textContent = formErrors.join(' ');
    updateModeUi();
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
    status.textContent = result.error ? '找不到可用主軸' : form.promptMode === 'project' ? '已生成 Project Prompt' : '已生成 Standalone Prompt';
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
    const buffer = new Uint32Array(2); crypto.getRandomValues(buffer);
    return `seed-${buffer[0].toString(36)}-${buffer[1].toString(36)}`;
  }
  return `seed-${Date.now().toString(36)}`;
}
function handlePrivacyChange() {
  const previousPrivacy = $('privacy').dataset.previousPrivacy || 'private';
  const currentPrivacy = $('privacy').value;
  const currentLocation = $('location').value.trim();
  const previousDefault = PRIVACY_DEFAULT_LOCATIONS[previousPrivacy];
  if (!currentLocation || currentLocation === previousDefault || Object.values(PRIVACY_DEFAULT_LOCATIONS).includes(currentLocation)) $('location').value = PRIVACY_DEFAULT_LOCATIONS[currentPrivacy];
  $('privacy').dataset.previousPrivacy = currentPrivacy;
  refreshMainPlayPicker();
  updateFormFeedback();
}
function handleGenerationDependencyChange() {
  refreshMainPlayPicker();
  updateFormFeedback();
}
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text; textarea.setAttribute('readonly', ''); textarea.style.position = 'fixed'; textarea.style.opacity = '0'; textarea.style.pointerEvents = 'none'; document.body.appendChild(textarea);
  try { textarea.select(); textarea.setSelectionRange(0, textarea.value.length); return document.execCommand?.('copy') === true; }
  catch { return false; }
  finally { textarea.remove(); }
}
async function copyText(text, successMessage) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text); $('status').textContent = successMessage; return;
  } catch {
    if (fallbackCopy(text)) { $('status').textContent = successMessage; return; }
    $('status').textContent = '複製失敗，請長按內容手動複製';
  }
}
async function copyPrompt() { await copyText($('prompt').textContent || '', 'Prompt 已複製'); }
async function copyProjectInstructions() { await copyText(PROJECT_INSTRUCTIONS_V01, 'Project 固定指示已複製'); }

installMainPlayPickerUi();
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
  $('location').addEventListener('input', updateFormFeedback);
  $('prompt-mode')?.addEventListener('change', () => render());
  $('main-play-mode')?.addEventListener('change', () => { refreshMainPlayPicker(); updateFormFeedback(); });
  $('main-play-category')?.addEventListener('change', () => { refreshMainPlayPicker(); updateFormFeedback(); });
  $('main-play-item')?.addEventListener('change', () => { refreshMainPlayPicker(); updateFormFeedback(); });
  $('main-play-direction')?.addEventListener('change', updateFormFeedback);
  for (const input of document.querySelectorAll('#a-anatomy input, #b-anatomy input, #a-equipment input, #b-equipment input, #scene-props input')) input.addEventListener('change', handleGenerationDependencyChange);
  $('binding').addEventListener('change', handleGenerationDependencyChange);
  $('intensity').addEventListener('change', handleGenerationDependencyChange);
  $('seed').addEventListener('input', handleGenerationDependencyChange);
  $('other-props').addEventListener('input', handleGenerationDependencyChange);
  for (const button of document.querySelectorAll('[data-anatomy-preset]')) button.addEventListener('click', () => applyAnatomyPreset(button.dataset.anatomyTarget, button.dataset.anatomyPreset));
  $('random-seed').addEventListener('click', () => { $('seed').value = makeSeed(); refreshMainPlayPicker(); render({ scroll: true }); });
  $('copy-prompt').addEventListener('click', copyPrompt);
  $('copy-project-instructions')?.addEventListener('click', copyProjectInstructions);
  $('schema').textContent = JSON.stringify(validation, null, 2);
  refreshMainPlayPicker();
  updateFormFeedback();
  render();
}

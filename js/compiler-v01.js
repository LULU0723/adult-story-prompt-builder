const DEFAULT_STORY_CONFIG = Object.freeze({
  length: 'short',
  opening: 'direct',
  pace: 'quick_escalation',
  writingStyle: 'character_driven',
  lexicalDirectness: 'balanced',
  adultContentShare: 'medium',
  descriptionFocus: 'interaction'
});

const LENGTH_TEXT = Object.freeze({
  ultra_short: '極短篇。約 500–900 個中文字，只寫一個完整的互動段落或短場景。',
  short: '短篇。約 800–1600 個中文字，集中完成當前情境，不拉長背景與收尾。',
  medium: '中篇。約 1400–2600 個中文字，可有較完整的情緒與行動推進，但仍以當前情境為核心。'
});

const OPENING_TEXT = Object.freeze({
  direct: '直接從當前互動或衝突開始，不先寫長篇背景介紹。',
  situational: '用很短的場景切入建立位置與氣氛，隨即進入互動。'
});

const PACE_TEXT = Object.freeze({
  direct: '節奏直接，盡快進入主要互動，不刻意拖延。',
  quick_escalation: '快速升溫：短暫鋪陳後就進入主要互動，再依角色反應自然加深。',
  gradual: '漸進推進：每一階段都要有明確的新資訊、反應或關係變化。',
  slow_burn: '慢熱，但不得用重複對話或空泛猶豫灌水；每段都要推進張力。',
  wave: '波浪式節奏：推進、短暫緩和、再推進，避免一路單調加速。'
});

const STYLE_TEXT = Object.freeze({
  character_driven: '以角色反應、對話、微小決策與關係張力驅動內容。',
  dialogue_heavy: '提高對話比例，讓語氣、停頓、稱呼與回應承擔主要敘事功能。',
  sensory: '提高感官與動作細節，但不要犧牲角色反應與因果。',
  concise: '句子與段落保持俐落，只保留對情境、角色或節奏有作用的描寫。'
});

const DIRECTNESS_TEXT = Object.freeze({
  subtle: '用較含蓄的身體與情緒描述，避免過度直白詞彙，但行為本身仍要清楚。',
  balanced: '以自然、清楚的成人用語描述，不刻意迴避，也不把每一句都推到最露骨。',
  direct: '可以使用直接明確的成人用語，優先確保動作與身體關係沒有歧義。',
  very_direct: '文字可以高度直接，但仍需維持敘事節奏、角色個性與可讀性，不做詞彙堆砌。'
});

const ADULT_SHARE_TEXT = Object.freeze({
  low: '成人內容約占少量篇幅，重點放在角色關係、情緒與互動前後的反應。',
  medium: '成人內容與角色互動約各占一半，身體互動必須與情緒或關係變化連動。',
  high: '成人互動是主要篇幅，但仍保留足夠對話、反應與角色判斷，避免變成純動作清單。'
});

const FOCUS_TEXT = Object.freeze({
  interaction: '優先描寫雙方互動、反應與主動權變化。',
  dialogue: '優先描寫對話、語氣、停頓、稱呼與言外之意。',
  emotion: '優先描寫情緒、猶豫、期待、吃醋、羞怯或控制感等心理變化。',
  physical: '優先描寫動作連續性、位置關係與身體反應，確保空間邏輯清楚。'
});

const STAGE_LABELS = Object.freeze({ 1: '起始', 2: '推進', 3: '深化' });
const GENDER_TEXT = Object.freeze({ female:'女性', male:'男性', nonbinary:'非二元', unspecified:'不指定' });
const PRESENTATION_TEXT = Object.freeze({ feminine:'女性化', masculine:'男性化', androgynous:'中性', unspecified:'不指定' });
const ANATOMY_TEXT = Object.freeze({ vagina:'陰道', penis:'陰莖', breasts:'胸部', anus:'肛門', mouth:'口部', hands:'雙手' });
const EQUIPMENT_TEXT = Object.freeze({ strap_on:'穿戴式道具' });
const PRIVACY_TEXT = Object.freeze({ private:'私密', semi:'半公開', public:'公開' });
const SCENE_PROP_TEXT = Object.freeze({ mirror:'鏡子' });

function safeArray(value) { return Array.isArray(value) ? value : []; }
function normalizeCharacters(characters) {
  if (Array.isArray(characters)) return characters;
  if (characters && typeof characters === 'object') return Object.values(characters);
  return [];
}
function charactersById(characters) {
  return Object.fromEntries(normalizeCharacters(characters).map(character => [character.id, character]));
}
function displayName(character, fallback) { return character?.displayName || character?.name || character?.id || fallback; }
function displayValue(map, value) { return map[value] || value; }
function displayList(map, values) { return safeArray(values).map(value => displayValue(map, value)).join('、'); }

function renderTemplate(step, byId) {
  const actorId = step.direction?.actorId;
  const receiverId = step.direction?.receiverId;
  const actor = displayName(byId[actorId], actorId || '角色A');
  const receiver = displayName(byId[receiverId], receiverId || '角色B');
  const template = step.item?.promptTemplate || step.item?.label || '';
  return template.replaceAll('{actor}', actor).replaceAll('{receiver}', receiver).trim();
}

function describeCharacter(character) {
  const name = displayName(character, '未命名角色');
  const parts = [];
  if (character.gender) parts.push(`性別設定：${displayValue(GENDER_TEXT, character.gender)}`);
  if (character.presentation) parts.push(`外在呈現：${displayValue(PRESENTATION_TEXT, character.presentation)}`);
  if (character.archetype) parts.push(`角色類型：${character.archetype}`);
  if (character.relationshipRole) parts.push(`關係定位：${character.relationshipRole}`);
  if (character.rolePreference) parts.push(`互動傾向：${character.rolePreference}`);
  if (character.narrativeNote) parts.push(`補充描述：${character.narrativeNote}`);
  if (safeArray(character.anatomy).length) parts.push(`身體設定：${displayList(ANATOMY_TEXT, character.anatomy)}`);
  if (safeArray(character.equipment).length) parts.push(`攜帶道具：${displayList(EQUIPMENT_TEXT, character.equipment)}`);
  if (character.traits && typeof character.traits === 'object') {
    const traits = Object.entries(character.traits).map(([key, value]) => `${key}:${value}`).join('、');
    if (traits) parts.push(`特質：${traits}`);
  }
  return `- ${name}${parts.length ? `：${parts.join('；')}` : ''}`;
}

function describeScene(sceneConfig = {}) {
  const parts = [];
  if (sceneConfig.location) parts.push(`地點：${sceneConfig.location}`);
  if (sceneConfig.privacy) parts.push(`隱私程度：${displayValue(PRIVACY_TEXT, sceneConfig.privacy)}`);
  if (safeArray(sceneConfig.props).length) parts.push(`場景道具：${displayList(SCENE_PROP_TEXT, sceneConfig.props)}`);
  return parts.length ? parts.join('；') : '未指定額外場景條件。';
}

function readConfig(map, value, fallbackKey) { return map[value] || map[fallbackKey]; }

function stageLines(generation, byId) {
  const grouped = new Map([[1, []], [2, []], [3, []]]);
  for (const step of generation?.results ?? []) {
    if (step.kind === 'anchor-error') continue;
    if (!step.item || !grouped.has(step.stage)) continue;
    grouped.get(step.stage).push({ kind: step.kind, forcedItemId: step.forcedItemId || null, text: renderTemplate(step, byId) });
  }
  const lines = [];
  for (const stage of [1, 2, 3]) {
    const beats = grouped.get(stage);
    if (!beats.length) continue;
    lines.push(`【${STAGE_LABELS[stage]}階段】`);
    for (const beat of beats) {
      if (beat.kind === 'main') {
        lines.push(`- 核心事件：${beat.text}`);
        continue;
      }
      const prefix = beat.forcedItemId ? '必要鋪墊' : '互動節點';
      lines.push(`- ${prefix}：${beat.text}`);
    }
  }
  return lines;
}

function findMainAnchor(generation, byId) {
  const main = (generation?.results ?? []).find(step => step.kind === 'main' && step.item);
  if (!main) return null;
  return { id: main.item.id, label: main.item.label || main.item.id, stage: main.stage, text: renderTemplate(main, byId) };
}

export function normalizeStoryConfig(input = {}) { return { ...DEFAULT_STORY_CONFIG, ...(input || {}) }; }

export function compileStoryPrompt({ generation, characters, sceneConfig = {}, storyConfig = {} } = {}) {
  const normalizedCharacters = normalizeCharacters(characters);
  const byId = charactersById(normalizedCharacters);
  const config = normalizeStoryConfig(storyConfig);
  const anchor = findMainAnchor(generation, byId);
  const lines = [];

  lines.push('【任務】');
  lines.push('根據以下角色設定、場景限制與互動節點，寫成一段連續、自然、有角色性的成人虛構故事。不要把節點逐條照抄成清單；要把它們轉化成有因果、反應與節奏的完整場景。');
  lines.push('所有角色皆為成年人。');
  lines.push('');
  lines.push('【角色設定】');
  if (normalizedCharacters.length) for (const character of normalizedCharacters) lines.push(describeCharacter(character));
  else lines.push('- 未提供角色資料。');
  lines.push('');
  lines.push('【場景】');
  lines.push(describeScene(sceneConfig));
  lines.push('場景條件是固定限制，不要為了方便劇情自行改變隱私程度、地點或道具存在狀態。');
  lines.push('');
  lines.push('【敘事控制】');
  lines.push(`- 建議篇幅：${readConfig(LENGTH_TEXT, config.length, 'short')}`);
  lines.push(`- 開場：${readConfig(OPENING_TEXT, config.opening, 'direct')}`);
  lines.push(`- 節奏：${readConfig(PACE_TEXT, config.pace, 'quick_escalation')}`);
  lines.push(`- 寫作風格：${readConfig(STYLE_TEXT, config.writingStyle, 'character_driven')}`);
  lines.push(`- 文字直接度：${readConfig(DIRECTNESS_TEXT, config.lexicalDirectness, 'balanced')}`);
  lines.push(`- 成人內容占比：${readConfig(ADULT_SHARE_TEXT, config.adultContentShare, 'medium')}`);
  lines.push(`- 描寫焦點：${readConfig(FOCUS_TEXT, config.descriptionFocus, 'interaction')}`);
  lines.push('');
  lines.push('【主軸】');
  if (anchor) {
    lines.push(`本篇核心：${anchor.label}（第 ${anchor.stage} 階段）`);
    lines.push('這是本篇最重要的互動核心；前後內容應該鋪墊、強化或回應它，而不是被其他節點搶走主題。具體行動只在對應階段執行。');
  } else {
    lines.push('沒有可用的主軸事件；不要自行捏造新的核心玩法。');
  }
  lines.push('');
  lines.push('【互動節點】');
  const beats = stageLines(generation, byId);
  if (beats.length) lines.push(...beats);
  else lines.push('沒有可用節點。');
  lines.push('');
  lines.push('【一致性要求】');
  lines.push('- 保持角色身體設定、道具所有權、角色方向與行動限制前後一致。');
  lines.push('- 不要替角色新增未提供的身體條件或道具，也不要把其中一人的身體條件錯算到另一人。');
  lines.push('- 性別代稱與第二人稱用語應依角色的「性別設定」保持一致，不得由身體設定、攜帶道具或外在呈現反推性別；非二元或不指定時也不要自行推定。');
  lines.push('- 若節點包含角色方向，執行時要維持指定的主動方與接受方；雙方互動節點則不要硬改寫成單方面支配。');
  lines.push('- 玩法強度代表允許的上限，不是每一段都必須寫到最高強度。');
  lines.push('- 文字直接度只控制措辭，不應改變可選玩法或身體設定。');
  lines.push('- 避免為了補字數重複同一個動作、對話或情緒。');
  lines.push('');
  lines.push('【輸出方式】');
  lines.push('直接開始故事正文，不要解釋規則、不要輸出分析、不要重列設定表。');
  lines.push('結尾不需要刻意完整收束；在當前情境自然停下即可。');
  return lines.join('\n');
}

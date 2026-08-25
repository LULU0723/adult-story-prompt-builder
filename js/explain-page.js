import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding, makeEgalitarianBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { summarizeGeneration, reverseQuery } from './explain.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());
const validation = validateDataset(items);
if (validation.errors.length) throw new Error(`Dataset validation failed: ${validation.errors.join('; ')}`);

const characters = [
  { id:'lin', displayName:'Lin', adult:true, gender:'female', presentation:'androgynous', anatomy:['vagina','breasts','anus','mouth','hands'], equipment:[] },
  { id:'shuang', displayName:'Shuang', adult:true, gender:'female', presentation:'feminine', anatomy:['vagina','breasts','anus','mouth','hands'], equipment:[] }
];
const sceneConfig = { location:'bedroom', privacy:'private', props:['mirror'] };
let lastGeneration = null;

function build(seed, bindingMode, intensity) {
  const providers = deriveProviders(characters, sceneConfig);
  const binding = bindingMode === 'egalitarian'
    ? makeEgalitarianBinding(characters.map(c => c.id))
    : makeDirectedBinding('lin','shuang');
  const slotsByStage = {1:1,2:1,3:1};
  const ctx = {
    dataVersion: DATA_VERSION,
    masterSeed: seed,
    userMaxIntensity: intensity,
    providers,
    characterState: { lin:{mobility:'free'}, shuang:{mobility:'free'} },
    actorId:'lin', receiverId:'shuang', participantCount:2,
    binding,
    minAnchorStage:2, maxAnchorStage:3,
    slotsByStage,
    selectedIds:new Set(), selectedItems:[], preferredTags:new Set(['control']),
    permissionByItem:{}, rerollCounts:Array(12).fill(0)
  };
  const anchor = chooseAnchor(items, ctx).chosen;
  if (!anchor) throw new Error('No reachable anchor');
  return generateStages(items, ctx, anchor, slotsByStage);
}

function run() {
  const seed = document.querySelector('#seed').value || 'explain-001';
  const binding = document.querySelector('#binding').value;
  const intensity = Number(document.querySelector('#intensity').value || 3);
  lastGeneration = build(seed, binding, intensity);
  document.querySelector('#summary').textContent = JSON.stringify(summarizeGeneration(lastGeneration), null, 2);
  query();
}

function query() {
  if (!lastGeneration) return;
  const itemId = document.querySelector('#item-id').value.trim();
  document.querySelector('#reverse').textContent = JSON.stringify(reverseQuery(lastGeneration, itemId), null, 2);
}

document.querySelector('#run').addEventListener('click', run);
document.querySelector('#query').addEventListener('click', query);
run();

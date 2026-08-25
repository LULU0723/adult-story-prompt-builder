import { DATA_VERSION, validateDataset } from './schema.js';
import { deriveProviders } from './providers.js';
import { makeDirectedBinding } from './binding.js';
import { chooseAnchor } from './anchor.js';
import { generateStages } from './stage.js';
import { evaluateEligibility } from './eligibility.js';

const items = await fetch('./data/adult-items.json').then(r => r.json());

function makeFixtureContext(masterSeed, sourceItems = items) {
  const characters = [
    {
      id: 'lin', displayName: 'Lin', adult: true,
      anatomy: ['vagina','breasts','anus','mouth','hands'], equipment: [],
      gender: 'female', presentation: 'androgynous'
    },
    {
      id: 'shuang', displayName: 'Shuang', adult: true,
      anatomy: ['vagina','breasts','anus','mouth','hands'], equipment: [],
      gender: 'female', presentation: 'feminine'
    }
  ];
  const sceneConfig = { location: 'bedroom', privacy: 'private', props: ['mirror'] };
  const slotsByStage = { 1: 1, 2: 1, 3: 1 };
  return {
    items: sourceItems,
    ctx: {
      dataVersion: DATA_VERSION,
      masterSeed,
      userMaxIntensity: 3,
      providers: deriveProviders(characters, sceneConfig),
      characterState: { lin: { mobility: 'free' }, shuang: { mobility: 'free' } },
      actorId: 'lin',
      receiverId: 'shuang',
      participantCount: 2,
      binding: makeDirectedBinding('lin', 'shuang'),
      minAnchorStage: 2,
      maxAnchorStage: 3,
      slotsByStage,
      selectedIds: new Set(),
      selectedItems: [],
      preferredTags: new Set(['control']),
      permissionByItem: {},
      rerollCounts: [0,0,0]
    },
    slotsByStage
  };
}

function generateForSeed(seed, sourceItems = items) {
  const { ctx, slotsByStage } = makeFixtureContext(seed, sourceItems);
  const anchorResult = chooseAnchor(sourceItems, ctx);
  if (!anchorResult.chosen) return { error: 'no-anchor' };
  const generation = generateStages(sourceItems, ctx, anchorResult.chosen, slotsByStage);
  return { anchor: anchorResult.chosen, generation };
}

function signature(result) {
  if (result.error) return result.error;
  return JSON.stringify({
    anchor: [result.anchor.item.id, result.anchor.stage],
    steps: result.generation.results.map(step => [step.kind, step.item?.id ?? null, step.direction?.actorId ?? null, step.direction?.receiverId ?? null])
  });
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

export function runRegressionSuite() {
  const failures = [];
  const validation = validateDataset(items);
  assert(validation.errors.length === 0, `dataset has ${validation.errors.length} validation error(s)`, failures);

  let anchorFailures = 0;
  let anchorErrors = 0;
  let orderFailures = 0;

  for (let i = 0; i < 300; i++) {
    const seed = `regression-${i}`;
    const normal = generateForSeed(seed, items);
    const reversed = generateForSeed(seed, [...items].reverse());

    if (normal.error) {
      anchorFailures++;
      failures.push(`${seed}: ${normal.error}`);
      continue;
    }

    const anchorId = normal.anchor.item.id;
    const mainAnchorSteps = normal.generation.results.filter(step => step.kind === 'main' && step.item?.id === anchorId);
    const errors = normal.generation.results.filter(step => step.kind === 'anchor-error');
    if (mainAnchorSteps.length !== 1) {
      anchorFailures++;
      failures.push(`${seed}: anchor ${anchorId} emitted as main ${mainAnchorSteps.length} times`);
    }
    if (errors.length > 0) {
      anchorErrors += errors.length;
      failures.push(`${seed}: ${errors.length} anchor-error step(s)`);
    }
    if (signature(normal) !== signature(reversed)) {
      orderFailures++;
      failures.push(`${seed}: result changed when fixture JSON order was reversed`);
    }
  }

  const { ctx } = makeFixtureContext('eligibility-check');
  const base = items[0];
  const needsThree = { ...base, id: 'test_needs_three', minParticipants: 3 };
  const threeResult = evaluateEligibility(needsThree, { ...ctx, stage: 1 });
  assert(!threeResult.eligible && threeResult.rejections.some(r => r.ruleId === 'participants.min'), 'minParticipants regression', failures);

  const unsupported = { ...base, id: 'test_group_shape', roleShape: 'group' };
  const groupResult = evaluateEligibility(unsupported, { ...ctx, stage: 1 });
  assert(!groupResult.eligible && groupResult.rejections.some(r => r.ruleId === 'roleShape.unsupported'), 'roleShape regression', failures);

  return {
    passed: failures.length === 0,
    summary: {
      seeds: 300,
      anchorFailures,
      anchorErrors,
      orderFailures,
      validationErrors: validation.errors.length
    },
    failures: failures.slice(0, 100)
  };
}

const button = document.querySelector('#run-tests');
if (button) {
  button.addEventListener('click', () => {
    const result = runRegressionSuite();
    document.querySelector('#test-output').textContent = JSON.stringify(result, null, 2);
  });
}

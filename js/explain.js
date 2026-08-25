export function summarizeGeneration(generation) {
  return generation.results.map(step => ({
    stage: step.stage,
    slotIndex: step.slotIndex,
    kind: step.kind,
    slotMode: step.diagnostics?.slotMode ?? null,
    itemId: step.item?.id ?? null,
    seedKey: step.seedKey ?? null,
    forcedItemId: step.forcedItemId ?? null,
    pinnedDirection: step.diagnostics?.pinnedDirection ?? false,
    direction: step.direction ? `${step.direction.actorId}->${step.direction.receiverId}` : null,
    pool: {
      total: step.diagnostics?.totalPool ?? null,
      eligible: step.diagnostics?.eligiblePool ?? null,
      excluded: step.diagnostics?.excludedCount ?? null
    },
    topRejections: step.diagnostics?.topRejections ?? [],
    stateBefore: step.diagnostics?.stateBefore ?? null,
    stateAfter: step.state ?? null
  }));
}

export function reverseQuery(generation, itemId) {
  const answers = [];
  for (const step of generation.results) {
    if (step.kind === 'anchor-error' && step.item?.id === itemId) {
      answers.push({
        stage: step.stage,
        slotIndex: step.slotIndex,
        status: 'excluded',
        kind: step.kind,
        rejections: step.rejections ?? [],
        direction: step.direction ?? null,
        stateBefore: step.diagnostics?.stateBefore ?? null
      });
      continue;
    }

    if (step.item?.id === itemId) {
      answers.push({
        stage: step.stage,
        slotIndex: step.slotIndex,
        status: 'selected',
        kind: step.kind,
        detail: `Selected as ${step.kind}`,
        direction: step.direction ?? null,
        stateBefore: step.diagnostics?.stateBefore ?? null,
        stateAfter: step.state ?? null
      });
      continue;
    }

    const exclusion = (step.excluded ?? []).find(entry => entry.itemId === itemId);
    if (exclusion) {
      answers.push({
        stage: step.stage,
        slotIndex: step.slotIndex,
        status: 'excluded',
        rejections: exclusion.rejections,
        forcedItemId: step.forcedItemId ?? null,
        direction: step.direction ?? null,
        stateBefore: step.diagnostics?.stateBefore ?? null
      });
      continue;
    }

    const candidate = (step.candidates ?? []).find(entry => entry.item?.id === itemId);
    if (candidate) {
      const winner = (step.candidates ?? []).find(entry => entry.item?.id === step.item?.id);
      answers.push({
        stage: step.stage,
        slotIndex: step.slotIndex,
        status: 'eligible_not_drawn',
        weight: candidate.weight,
        contributions: candidate.score?.contributions ?? [],
        winner: step.item?.id ?? null,
        winnerWeight: winner?.weight ?? null,
        direction: step.direction ?? null,
        stateBefore: step.diagnostics?.stateBefore ?? null
      });
    }
  }
  return answers;
}

export function emptySlotWarnings(generation, threshold = 0.15) {
  const drawable = generation.results.filter(step => step.kind !== 'main' && step.kind !== 'anchor-error');
  const slots = drawable.length;
  const empty = drawable.filter(step => step.kind === 'empty').length;
  const rate = slots ? empty / slots : 0;
  return {
    slots,
    empty,
    rate,
    level: rate > threshold ? 'warning' : 'ok'
  };
}

import { evaluateEligibility, applyMobilityEffects } from "./eligibility.js";
import { weightedDraw, rngFor } from "./rng.js";
import { scoreItem } from "./score.js";

function slotsAvailable(ctx, stage) {
  return (ctx.slotsByStage?.[stage] ?? 0) > 0;
}

function chooseSeededStage(item, allowedStages, ctx) {
  const stages = [...allowedStages].sort((a, b) => a - b);
  const { rng } = rngFor({
    dataVersion: ctx.dataVersion,
    masterSeed: ctx.masterSeed,
    stream: `anchor-stage:${item.id}`,
    slot: 0,
    reroll: ctx.anchorReroll ?? 0
  });
  return stages[Math.floor(rng() * stages.length)];
}

export function simulatePathToAnchor(anchor, ctx, enablers, anchorStage) {
  const direct = evaluateEligibility(anchor, { ...ctx, stage: anchorStage });
  if (direct.eligible) return { reachable: true, direct: true, enabler: null, enablerStage: null };

  const orderedEnablers = [...enablers].sort((a, b) => a.id.localeCompare(b.id));
  for (const candidate of orderedEnablers) {
    const possibleStages = candidate.stageHints
      .filter(stage => stage < anchorStage && slotsAvailable(ctx, stage))
      .sort((a, b) => a - b);

    for (const candidateStage of possibleStages) {
      const candidateEval = evaluateEligibility(candidate, { ...ctx, stage: candidateStage });
      if (!candidateEval.eligible) continue;

      const nextState = applyMobilityEffects(
        candidate,
        { actorId: ctx.actorId, receiverId: ctx.receiverId },
        ctx.characterState
      );
      const anchorEval = evaluateEligibility(anchor, {
        ...ctx,
        characterState: nextState,
        stage: anchorStage,
        selectedIds: new Set([...(ctx.selectedIds ?? []), candidate.id])
      });
      if (anchorEval.eligible) {
        return { reachable: true, direct: false, enabler: candidate.id, enablerStage: candidateStage };
      }
    }
  }
  return { reachable: false, direct: false, enabler: null, enablerStage: null };
}

export function chooseAnchor(items, ctx) {
  const candidates = [];
  for (const item of items) {
    if ((item.anchorSuitability ?? 0) <= 0) continue;
    const allowedStages = item.stageHints.filter(stage =>
      stage >= ctx.minAnchorStage &&
      stage <= ctx.maxAnchorStage &&
      slotsAvailable(ctx, stage)
    );
    if (allowedStages.length === 0) continue;

    const stage = chooseSeededStage(item, allowedStages, ctx);
    const reachability = simulatePathToAnchor(
      item,
      ctx,
      items.filter(x => x.id !== item.id && x.stageHints.some(s => s < stage)),
      stage
    );
    if (!reachability.reachable) continue;

    const score = scoreItem(item, { ...ctx, anchor: null });
    candidates.push({
      item,
      stage,
      reachability,
      weight: score.weight * Math.max(1, item.anchorSuitability),
      score
    });
  }

  candidates.sort((a, b) => a.item.id.localeCompare(b.item.id));

  const { rng, key } = rngFor({
    dataVersion: ctx.dataVersion,
    masterSeed: ctx.masterSeed,
    stream: "anchor",
    slot: 0,
    reroll: ctx.anchorReroll ?? 0
  });

  const chosen = weightedDraw(candidates, rng, candidate => candidate.weight);
  return { chosen, key, candidates };
}

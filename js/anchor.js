import { evaluateEligibility, applyMobilityEffects } from "./eligibility.js";
import { weightedDraw, rngFor } from "./rng.js";
import { scoreItem } from "./score.js";

function simulatePathToAnchor(anchor, ctx, enablers, anchorStage) {
  // v0.1 reachability supports either direct reachability or one monotonic mobility enabler.
  const direct = evaluateEligibility(anchor, { ...ctx, stage: anchorStage });
  if (direct.eligible) return { reachable: true, enabler: null };

  for (const candidate of enablers) {
    const candidateStage = candidate.stageHints.filter(stage => stage < anchorStage).at(-1);
    if (!candidateStage) continue;
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
      return { reachable: true, enabler: candidate.id, enablerStage: candidateStage };
    }
  }
  return { reachable: false, enabler: null };
}

export function chooseAnchor(items, ctx) {
  const candidates = [];
  for (const item of items) {
    if ((item.anchorSuitability ?? 0) <= 0) continue;
    const allowedStages = item.stageHints.filter(stage => stage >= ctx.minAnchorStage && stage <= ctx.maxAnchorStage);
    if (allowedStages.length === 0) continue;

    // Prefer the latest legal stage for an anchor in v0.1 so setup items remain possible.
    const stage = allowedStages.at(-1);
    const reachability = simulatePathToAnchor(
      item,
      ctx,
      items.filter(x => x.id !== item.id && x.stageHints.some(s => s < stage)),
      stage
    );
    if (!reachability.reachable) continue;

    const score = scoreItem(item, { ...ctx, anchor: item });
    candidates.push({
      item,
      stage,
      reachability,
      weight: score.weight * Math.max(1, item.anchorSuitability),
      score
    });
  }

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

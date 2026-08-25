import { evaluateEligibility, applyMobilityEffects } from "./eligibility.js";
import { weightedDraw, rngFor } from "./rng.js";
import { scoreItem } from "./score.js";

function simulatePathToAnchor(anchor, ctx, enablers) {
  // v0.1 monotonic mobility reachability: search only a single enabler before anchor.
  const direct = evaluateEligibility(anchor, { ...ctx, stage: anchor.stageHints[0] });
  if (direct.eligible) return { reachable: true, enabler: null };

  for (const candidate of enablers) {
    const candidateEval = evaluateEligibility(candidate, ctx);
    if (!candidateEval.eligible) continue;
    const nextState = applyMobilityEffects(candidate, { actorId: ctx.actorId, receiverId: ctx.receiverId }, ctx.characterState);
    const anchorEval = evaluateEligibility(anchor, { ...ctx, characterState: nextState, stage: anchor.stageHints[0] });
    if (anchorEval.eligible) return { reachable: true, enabler: candidate.id };
  }
  return { reachable: false, enabler: null };
}

export function chooseAnchor(items, ctx) {
  const candidates = [];
  for (const item of items) {
    if ((item.anchorSuitability ?? 0) <= 0) continue;
    const allowedStages = item.stageHints.filter(stage => stage >= ctx.minAnchorStage && stage <= ctx.maxAnchorStage);
    if (allowedStages.length === 0) continue;

    const stage = allowedStages.at(-1);
    const baseCtx = { ...ctx, stage };
    const reachability = simulatePathToAnchor({ ...item, stageHints: [stage] }, baseCtx, items.filter(x => x.id !== item.id && x.stageHints.some(s => s < stage)));
    if (!reachability.reachable) continue;

    const score = scoreItem(item, { ...ctx, anchor: item });
    candidates.push({ item, stage, reachability, weight: score.weight * Math.max(1, item.anchorSuitability) });
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

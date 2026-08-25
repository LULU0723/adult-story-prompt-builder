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

function choosePinnedAnchorDirection(item, stage, ctx) {
  if (ctx.binding?.mode !== "egalitarian") return null;
  const [firstId, secondId] = ctx.binding.characterIds ?? [];
  if (!firstId || !secondId) throw new Error("egalitarian binding is missing characterIds");

  const { rng } = rngFor({
    dataVersion: ctx.dataVersion,
    masterSeed: ctx.masterSeed,
    stream: `anchor-direction:${item.id}`,
    slot: stage,
    reroll: ctx.anchorReroll ?? 0
  });
  const actorId = rng() < 0.5 ? firstId : secondId;
  const receiverId = actorId === firstId ? secondId : firstId;
  return { actorId, receiverId };
}

function effectiveDirection(ctx, pinnedDirection) {
  return pinnedDirection ?? { actorId: ctx.actorId, receiverId: ctx.receiverId };
}

export function simulatePathToAnchor(anchor, ctx, enablers, anchorStage, pinnedDirection = null) {
  const direction = effectiveDirection(ctx, pinnedDirection);
  const direct = evaluateEligibility(anchor, {
    ...ctx,
    stage: anchorStage,
    actorId: direction.actorId,
    receiverId: direction.receiverId
  });
  if (direct.eligible) {
    return { reachable: true, direct: true, enabler: null, enablerStage: null, enablerDirection: null };
  }

  const orderedEnablers = [...enablers].sort((a, b) => a.id.localeCompare(b.id));
  for (const candidate of orderedEnablers) {
    const possibleStages = candidate.stageHints
      .filter(stage => stage < anchorStage && slotsAvailable(ctx, stage))
      .sort((a, b) => a - b);

    for (const candidateStage of possibleStages) {
      const candidateEval = evaluateEligibility(candidate, {
        ...ctx,
        stage: candidateStage,
        actorId: direction.actorId,
        receiverId: direction.receiverId
      });
      if (!candidateEval.eligible) continue;

      const nextState = applyMobilityEffects(candidate, direction, ctx.characterState);
      const anchorEval = evaluateEligibility(anchor, {
        ...ctx,
        actorId: direction.actorId,
        receiverId: direction.receiverId,
        characterState: nextState,
        stage: anchorStage,
        selectedIds: new Set([...(ctx.selectedIds ?? []), candidate.id])
      });
      if (anchorEval.eligible) {
        return {
          reachable: true,
          direct: false,
          enabler: candidate.id,
          enablerStage: candidateStage,
          enablerDirection: pinnedDirection ? { ...direction } : null
        };
      }
    }
  }
  return { reachable: false, direct: false, enabler: null, enablerStage: null, enablerDirection: null };
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
    const direction = choosePinnedAnchorDirection(item, stage, ctx);
    const reachability = simulatePathToAnchor(
      item,
      ctx,
      items.filter(x => x.id !== item.id && x.stageHints.some(s => s < stage)),
      stage,
      direction
    );
    if (!reachability.reachable) continue;

    const score = scoreItem(item, { ...ctx, anchor: null });
    candidates.push({
      item,
      stage,
      direction,
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

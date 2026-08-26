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

function allManualDirections(item, stage, ctx) {
  if (ctx.binding?.mode !== "egalitarian" || item.roleShape === "mutual") {
    return [choosePinnedAnchorDirection(item, stage, ctx)];
  }
  const [firstId, secondId] = ctx.binding.characterIds ?? [];
  if (!firstId || !secondId) throw new Error("egalitarian binding is missing characterIds");
  return [
    { actorId: firstId, receiverId: secondId },
    { actorId: secondId, receiverId: firstId }
  ];
}

function effectiveDirection(ctx, pinnedDirection) {
  return pinnedDirection ?? { actorId: ctx.actorId, receiverId: ctx.receiverId };
}

function directionKey(direction) {
  return direction ? `${direction.actorId}->${direction.receiverId}` : "binding";
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

export function enumerateAnchorCandidates(items, ctx, { directionMode = "seeded" } = {}) {
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
    const directions = directionMode === "all"
      ? allManualDirections(item, stage, ctx)
      : [choosePinnedAnchorDirection(item, stage, ctx)];

    for (const direction of directions) {
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
        directionKey: directionKey(direction),
        reachability,
        weight: score.weight * Math.max(1, item.anchorSuitability),
        score
      });
    }
  }

  candidates.sort((a, b) => {
    const itemOrder = a.item.id.localeCompare(b.item.id);
    return itemOrder || a.directionKey.localeCompare(b.directionKey);
  });
  return candidates;
}

export function validatePinnedAnchor({ itemId, directionKey: requestedDirectionKey = null } = {}, candidates = []) {
  const matches = candidates.filter(candidate => candidate.item.id === itemId);
  if (!matches.length) return { valid: false, reason: "目前設定下此主軸不可達或不符合條件。", candidate: null };
  if (requestedDirectionKey) {
    const exact = matches.find(candidate => candidate.directionKey === requestedDirectionKey);
    if (!exact) return { valid: false, reason: "目前設定下指定的角色方向不可用。", candidate: null };
    return { valid: true, reason: null, candidate: exact };
  }
  return { valid: true, reason: null, candidate: matches[0] };
}

export function chooseAnchor(items, ctx, selection = { mode: "auto" }) {
  const mode = selection?.mode ?? "auto";
  const directionMode = mode === "exact" ? "all" : "seeded";
  let candidates = enumerateAnchorCandidates(items, ctx, { directionMode });

  if (mode === "category") {
    candidates = candidates.filter(candidate => candidate.item.category === selection.category);
  } else if (mode === "exact") {
    const validation = validatePinnedAnchor(selection, candidates);
    return {
      chosen: validation.candidate,
      key: validation.candidate ? `manual:${validation.candidate.item.id}:${validation.candidate.directionKey}` : "manual:invalid",
      candidates,
      validation
    };
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

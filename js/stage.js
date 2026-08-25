import { evaluateEligibility, applyMobilityEffects } from "./eligibility.js";
import { scoreItem } from "./score.js";
import { weightedDraw, rngFor } from "./rng.js";
import { applyRoleSwitch, commitEgalitarianDirection, resolveDirection } from "./binding.js";

function nonAnchorKind(stage) {
  return stage === 2 ? "secondary" : "accent";
}

function hasFutureSlotForStage(targetStage, currentStage, currentLocal, slotsByStage, anchorStage) {
  if (targetStage >= anchorStage || targetStage < currentStage) return false;
  const count = slotsByStage[targetStage] ?? 0;
  if (count <= 0) return false;
  if (targetStage > currentStage) return true;
  return currentLocal + 1 < count;
}

function countRemainingOpportunities(item, currentStage, currentLocal, slotsByStage, anchorStage) {
  let count = 0;
  for (const stage of item.stageHints ?? []) {
    if (stage >= anchorStage || stage < currentStage) continue;
    const slots = slotsByStage[stage] ?? 0;
    if (stage === currentStage) count += Math.max(0, slots - currentLocal);
    else count += slots;
  }
  return count;
}

function anchorDirection(anchorChoice, binding) {
  if (anchorChoice.direction) {
    return { ...anchorChoice.direction, binding };
  }
  if (binding.mode === "directed") {
    return { actorId: binding.dominant, receiverId: binding.receptive, binding };
  }
  throw new Error("egalitarian anchor is missing pinned direction");
}

function enablerDirection(anchorChoice, binding) {
  if (anchorChoice.reachability?.enablerDirection) {
    return { ...anchorChoice.reachability.enablerDirection, binding };
  }
  return anchorDirection(anchorChoice, binding);
}

function anchorDirectlyEligible(anchorChoice, baseCtx, state, binding, selectedIds) {
  const direction = anchorDirection(anchorChoice, binding);
  const result = evaluateEligibility(anchorChoice.item, {
    ...baseCtx,
    stage: anchorChoice.stage,
    actorId: direction.actorId,
    receiverId: direction.receiverId,
    characterState: state,
    selectedIds,
    binding,
    roleSwitchUsed: binding.roleSwitchUsed
  });
  return result.eligible;
}

function anchorReachableWithOneEnabler(items, anchorChoice, baseCtx, state, binding, selectedIds, position, slotsByStage) {
  if (anchorDirectlyEligible(anchorChoice, baseCtx, state, binding, selectedIds)) return true;

  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id));
  for (const enabler of ordered) {
    if (enabler.id === anchorChoice.item.id || selectedIds.has(enabler.id)) continue;
    for (const enablerStage of enabler.stageHints ?? []) {
      if (!hasFutureSlotForStage(enablerStage, position.stage, position.local, slotsByStage, anchorChoice.stage)) continue;

      const direction = enablerDirection(anchorChoice, binding);
      const enablerCtx = {
        ...baseCtx,
        stage: enablerStage,
        actorId: direction.actorId,
        receiverId: direction.receiverId,
        characterState: state,
        selectedIds,
        binding,
        roleSwitchUsed: binding.roleSwitchUsed
      };
      const enablerEval = evaluateEligibility(enabler, enablerCtx);
      if (!enablerEval.eligible) continue;

      const afterState = applyMobilityEffects(enabler, direction, state);
      const afterBinding = enabler.roleSwitch ? applyRoleSwitch(binding) : binding;
      const afterSelected = new Set([...selectedIds, enabler.id]);
      if (anchorDirectlyEligible(anchorChoice, baseCtx, afterState, afterBinding, afterSelected)) return true;
    }
  }
  return false;
}

function candidatePreservesAnchor(item, items, ctx, direction, position, slotsByStage) {
  if (!ctx.anchorChoice || position.stage >= ctx.anchorChoice.stage) return true;

  const afterState = applyMobilityEffects(item, direction, ctx.characterState);
  let afterBinding = ctx.binding;
  if (item.roleShape !== "mutual" && ctx.binding.mode === "egalitarian") {
    afterBinding = commitEgalitarianDirection(ctx.binding, direction.actorId);
  } else if (item.roleShape !== "mutual") {
    afterBinding = direction.binding;
  }
  if (item.roleSwitch) afterBinding = applyRoleSwitch(afterBinding);
  const afterSelected = new Set([...(ctx.selectedIds ?? []), item.id]);

  return anchorReachableWithOneEnabler(
    items,
    ctx.anchorChoice,
    ctx,
    afterState,
    afterBinding,
    afterSelected,
    position,
    slotsByStage
  );
}

function drawOne(items, ctx, slotIndex, direction, position, slotsByStage, forcedItemId = null) {
  const candidates = [];
  for (const item of items) {
    if (item.id === ctx.anchorChoice?.item.id) continue;
    if (forcedItemId && item.id !== forcedItemId) continue;

    const result = evaluateEligibility(item, ctx);
    if (!result.eligible) continue;
    if (!candidatePreservesAnchor(item, items, ctx, direction, position, slotsByStage)) continue;

    const score = scoreItem(item, ctx);
    candidates.push({ item, score, weight: score.weight });
  }

  candidates.sort((a, b) => a.item.id.localeCompare(b.item.id));

  const { rng, key } = rngFor({
    dataVersion: ctx.dataVersion,
    masterSeed: ctx.masterSeed,
    stream: "play",
    slot: slotIndex,
    reroll: ctx.rerollCounts?.[slotIndex] ?? 0
  });
  const chosen = weightedDraw(candidates, rng, entry => entry.weight);
  return { chosen, candidates, key };
}

export function generateStages(items, baseCtx, anchorChoice, slotsByStage = { 1: 1, 2: 1, 3: 1 }) {
  const results = [];
  let state = structuredClone(baseCtx.characterState);
  let binding = structuredClone(baseCtx.binding);
  const selectedIds = new Set();
  const selectedItems = [];
  let slotIndex = 0;

  const requiredEnablerId = anchorChoice.reachability?.direct === false ? anchorChoice.reachability.enabler : null;

  for (const stage of [1, 2, 3]) {
    const slotCount = slotsByStage[stage] ?? 0;
    for (let local = 0; local < slotCount; local++) {
      const isAnchorSlot = stage === anchorChoice.stage && !selectedIds.has(anchorChoice.item.id);

      let forcedItemId = null;
      if (!isAnchorSlot && requiredEnablerId && !selectedIds.has(requiredEnablerId) && stage < anchorChoice.stage) {
        const enabler = items.find(item => item.id === requiredEnablerId);
        if (!enabler) throw new Error(`Anchor enabler not found: ${requiredEnablerId}`);
        const opportunities = countRemainingOpportunities(enabler, stage, local, slotsByStage, anchorChoice.stage);
        const currentIsOpportunity = enabler.stageHints.includes(stage);
        if (currentIsOpportunity && opportunities <= 1) forcedItemId = requiredEnablerId;
      }

      let direction;
      let directionIsPinned = false;
      if (isAnchorSlot && anchorChoice.direction) {
        direction = anchorDirection(anchorChoice, binding);
        directionIsPinned = true;
      } else if (forcedItemId && anchorChoice.reachability?.enablerDirection) {
        direction = enablerDirection(anchorChoice, binding);
        directionIsPinned = true;
      } else {
        direction = resolveDirection(binding, {
          dataVersion: baseCtx.dataVersion,
          masterSeed: baseCtx.masterSeed,
          slot: slotIndex,
          reroll: baseCtx.rerollCounts?.[slotIndex] ?? 0
        });
      }

      const ctx = {
        ...baseCtx,
        stage,
        actorId: direction.actorId,
        receiverId: direction.receiverId,
        characterState: state,
        selectedIds,
        selectedItems,
        anchor: anchorChoice.item,
        anchorChoice,
        binding,
        roleSwitchUsed: binding.roleSwitchUsed
      };

      if (isAnchorSlot) {
        const check = evaluateEligibility(anchorChoice.item, ctx);
        if (!check.eligible) {
          results.push({
            stage,
            slotIndex,
            kind: "anchor-error",
            item: anchorChoice.item,
            rejections: check.rejections,
            state: structuredClone(state),
            direction
          });
          slotIndex++;
          continue;
        }
        const chosen = { item: anchorChoice.item, score: scoreItem(anchorChoice.item, { ...ctx, anchor: null }) };
        // A pinned egalitarian anchor is an execution constraint, not a debt event.
        if (chosen.item.roleShape !== "mutual" && binding.mode === "directed") binding = direction.binding;
        state = applyMobilityEffects(chosen.item, direction, state);
        selectedIds.add(chosen.item.id);
        selectedItems.push(chosen.item);
        results.push({ stage, slotIndex, kind: "main", ...chosen, seedKey: "anchor", state: structuredClone(state), direction });
        slotIndex++;
        continue;
      }

      const draw = drawOne(items, ctx, slotIndex, direction, { stage, local }, slotsByStage, forcedItemId);
      if (!draw.chosen) {
        results.push({ stage, slotIndex, kind: "empty", candidates: draw.candidates, seedKey: draw.key, state: structuredClone(state), direction, forcedItemId });
        slotIndex++;
        continue;
      }

      const chosen = draw.chosen;
      if (chosen.item.roleShape !== "mutual") {
        if (binding.mode === "egalitarian") {
          binding = directionIsPinned ? commitEgalitarianDirection(binding, direction.actorId) : direction.binding;
        } else {
          binding = direction.binding;
        }
      }
      state = applyMobilityEffects(chosen.item, direction, state);
      selectedIds.add(chosen.item.id);
      selectedItems.push(chosen.item);
      if (chosen.item.roleSwitch) binding = applyRoleSwitch(binding);
      results.push({
        stage,
        slotIndex,
        kind: nonAnchorKind(stage),
        ...chosen,
        seedKey: draw.key,
        state: structuredClone(state),
        direction,
        forcedItemId
      });
      slotIndex++;
    }
  }

  return { results, finalState: state, finalBinding: binding };
}

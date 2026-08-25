import { evaluateEligibility, applyMobilityEffects } from "./eligibility.js";
import { scoreItem } from "./score.js";
import { weightedDraw, rngFor } from "./rng.js";
import { applyRoleSwitch, resolveDirection } from "./binding.js";

function drawOne(items, ctx, slotIndex) {
  const candidates = [];
  for (const item of items) {
    const result = evaluateEligibility(item, ctx);
    if (!result.eligible) continue;
    const score = scoreItem(item, ctx);
    candidates.push({ item, score, weight: score.weight });
  }
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

  for (const stage of [1, 2, 3]) {
    const slotCount = slotsByStage[stage] ?? 0;
    for (let local = 0; local < slotCount; local++) {
      const isAnchorSlot = stage === anchorChoice.stage && !selectedIds.has(anchorChoice.item.id);

      let direction = resolveDirection(binding, {
        dataVersion: baseCtx.dataVersion,
        masterSeed: baseCtx.masterSeed,
        slot: slotIndex,
        reroll: baseCtx.rerollCounts?.[slotIndex] ?? 0
      });
      binding = direction.binding;

      const ctx = {
        ...baseCtx,
        stage,
        actorId: direction.actorId,
        receiverId: direction.receiverId,
        characterState: state,
        selectedIds,
        selectedItems,
        anchor: anchorChoice.item,
        roleSwitchUsed: binding.roleSwitchUsed
      };

      if (isAnchorSlot) {
        const check = evaluateEligibility(anchorChoice.item, ctx);
        if (!check.eligible) {
          results.push({ stage, slotIndex, kind: "anchor-error", item: anchorChoice.item, rejections: check.rejections });
          slotIndex++;
          continue;
        }
        const chosen = { item: anchorChoice.item, score: scoreItem(anchorChoice.item, ctx) };
        state = applyMobilityEffects(chosen.item, direction, state);
        selectedIds.add(chosen.item.id);
        selectedItems.push(chosen.item);
        results.push({ stage, slotIndex, kind: "main", ...chosen, seedKey: "anchor", state: structuredClone(state), direction });
      } else {
        const draw = drawOne(items, ctx, slotIndex);
        if (!draw.chosen) {
          results.push({ stage, slotIndex, kind: "empty", candidates: draw.candidates, seedKey: draw.key, state: structuredClone(state), direction });
          slotIndex++;
          continue;
        }
        const chosen = draw.chosen;
        state = applyMobilityEffects(chosen.item, direction, state);
        selectedIds.add(chosen.item.id);
        selectedItems.push(chosen.item);
        if (chosen.item.roleSwitch) binding = applyRoleSwitch(binding);
        results.push({ stage, slotIndex, kind: "secondary", ...chosen, seedKey: draw.key, state: structuredClone(state), direction });
      }
      slotIndex++;
    }
  }

  return { results, finalState: state, finalBinding: binding };
}

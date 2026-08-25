import { mobilityRank } from "./schema.js";
import { providersForOwner, requirementSatisfied } from "./providers.js";

function parseMobilityRule(rule) {
  if (!rule) return null;
  const [op, value] = rule.split(":");
  return { op, value };
}

function mobilityRulePasses(current, rule) {
  if (!rule) return true;
  const parsed = parseMobilityRule(rule);
  const currentRank = mobilityRank(current);
  const targetRank = mobilityRank(parsed.value);
  if (parsed.op === "min") return currentRank >= targetRank;
  if (parsed.op === "max") return currentRank <= targetRank;
  if (parsed.op === "eq") return currentRank === targetRank;
  throw new Error(`Unsupported mobility rule: ${rule}`);
}

function roleRequirementsPass(requirements, owner, providers) {
  const ownerProviders = providersForOwner(providers, owner);
  const rejections = [];
  for (const req of requirements ?? []) {
    if (!requirementSatisfied(req, ownerProviders)) {
      rejections.push({
        stage: "provider",
        ruleId: `${owner}.${req.kind}.${(req.spec ?? []).join("|")}`,
        detail: `Owner ${owner} lacks ${req.kind} matching [${(req.spec ?? []).join(", ")}]`
      });
    }
  }
  return rejections;
}

export function evaluateEligibility(item, ctx) {
  const rejections = [];
  const { providers, actorId, receiverId, stage, characterState, userMaxIntensity, permissionState, selectedIds, roleSwitchUsed } = ctx;

  if (item.deprecated) rejections.push({ stage: "status", ruleId: "item.deprecated", detail: "Item is deprecated" });
  if (item.manualOnly) rejections.push({ stage: "status", ruleId: "item.manualOnly", detail: "Manual-only item" });
  if (permissionState === "disabled" || permissionState === "no_recommend") {
    rejections.push({ stage: "permission", ruleId: `permission.${permissionState}`, detail: `Permission state is ${permissionState}` });
  }
  if (!item.stageHints.includes(stage)) rejections.push({ stage: "stage", ruleId: `stage.${stage}`, detail: `Item not allowed in stage ${stage}` });
  if (item.intensityMin > userMaxIntensity) {
    rejections.push({ stage: "intensity", ruleId: "intensity.min_exceeds_user_max", detail: `${item.intensityMin} > ${userMaxIntensity}` });
  }
  if (!item.repeatable && selectedIds?.has(item.id)) {
    rejections.push({ stage: "duplicate", ruleId: "item.non_repeatable", detail: "Item already selected" });
  }
  if (item.roleSwitch && roleSwitchUsed) {
    rejections.push({ stage: "binding", ruleId: "roleSwitch.budget_exhausted", detail: "Only one role switch is allowed" });
  }
  if (item.roleSwitch && stage < 2) {
    rejections.push({ stage: "binding", ruleId: "roleSwitch.too_early", detail: "Role switch is only allowed in stage 2 or 3" });
  }

  rejections.push(...roleRequirementsPass(item.requirements?.actor, actorId, providers));
  rejections.push(...roleRequirementsPass(item.requirements?.receiver, receiverId, providers));
  rejections.push(...roleRequirementsPass(item.requirements?.scene, "scene", providers));

  const actorMobility = characterState?.[actorId]?.mobility ?? "free";
  const receiverMobility = characterState?.[receiverId]?.mobility ?? "free";
  if (!mobilityRulePasses(actorMobility, item.requiresMobility?.actor)) {
    rejections.push({ stage: "mobility", ruleId: "mobility.actor", detail: `${actorId} mobility ${actorMobility} fails ${item.requiresMobility.actor}` });
  }
  if (!mobilityRulePasses(receiverMobility, item.requiresMobility?.receiver)) {
    rejections.push({ stage: "mobility", ruleId: "mobility.receiver", detail: `${receiverId} mobility ${receiverMobility} fails ${item.requiresMobility.receiver}` });
  }

  return { eligible: rejections.length === 0, rejections };
}

export function applyMobilityEffects(item, binding, characterState) {
  const next = structuredClone(characterState);
  const actorId = binding.actorId;
  const receiverId = binding.receiverId;

  for (const [role, value] of Object.entries(item.setsMobility ?? {})) {
    const id = role === "actor" ? actorId : receiverId;
    if (!id || !value) continue;
    const current = next[id]?.mobility ?? "free";
    // v0.1 mobility is monotonic: effects can only maintain or reduce mobility.
    const lowered = Math.min(mobilityRank(current), mobilityRank(value));
    const levels = ["immobilized", "restricted", "partial", "free"];
    next[id] = { ...(next[id] ?? {}), mobility: levels[lowered] };
  }
  return next;
}

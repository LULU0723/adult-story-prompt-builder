import { rngFor } from "./rng.js";

export function makeDirectedBinding(dominant, receptive) {
  return { mode: "directed", dominant, receptive, actorId: dominant, receiverId: receptive, roleSwitchUsed: false };
}

export function makeEgalitarianBinding() {
  return { mode: "egalitarian", debt: 0, previousInitiator: null, roleSwitchUsed: false };
}

export function resolveDirection(binding, seedContext) {
  if (binding.mode === "directed") {
    return { actorId: binding.dominant, receiverId: binding.receptive, binding };
  }

  const { rng } = rngFor({ ...seedContext, stream: "role" });
  const continuity = binding.previousInitiator === "A" ? 0.35 : binding.previousInitiator === "B" ? -0.35 : 0;
  const logit = (-binding.debt * 0.8) + continuity;
  const pA = 1 / (1 + Math.exp(-logit));
  const actorId = rng() < pA ? "A" : "B";
  const receiverId = actorId === "A" ? "B" : "A";
  const nextBinding = {
    ...binding,
    debt: binding.debt + (actorId === "A" ? 1 : -1),
    previousInitiator: actorId
  };
  return { actorId, receiverId, binding: nextBinding };
}

export function applyRoleSwitch(binding) {
  if (binding.mode !== "directed" || binding.roleSwitchUsed) return binding;
  return {
    ...binding,
    dominant: binding.receptive,
    receptive: binding.dominant,
    actorId: binding.receptive,
    receiverId: binding.dominant,
    roleSwitchUsed: true
  };
}

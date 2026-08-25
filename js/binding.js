import { rngFor } from "./rng.js";

export function makeDirectedBinding(dominant, receptive) {
  return { mode: "directed", dominant, receptive, actorId: dominant, receiverId: receptive, roleSwitchUsed: false };
}

export function makeEgalitarianBinding(characterIds) {
  if (!Array.isArray(characterIds) || characterIds.length !== 2 || characterIds.some(id => !id)) {
    throw new Error("v0.1 egalitarian binding requires exactly two real character ids");
  }
  if (characterIds[0] === characterIds[1]) throw new Error("egalitarian binding character ids must be distinct");
  return {
    mode: "egalitarian",
    characterIds: [...characterIds],
    debt: 0,
    previousInitiator: null,
    roleSwitchUsed: false
  };
}

export function resolveDirection(binding, seedContext) {
  if (binding.mode === "directed") {
    return { actorId: binding.dominant, receiverId: binding.receptive, binding };
  }

  if (binding.mode !== "egalitarian") throw new Error(`Unsupported binding mode: ${binding.mode}`);
  const [firstId, secondId] = binding.characterIds ?? [];
  if (!firstId || !secondId) throw new Error("egalitarian binding is missing characterIds");

  const { rng } = rngFor({ ...seedContext, stream: "role" });
  const continuity = binding.previousInitiator === firstId ? 0.35 : binding.previousInitiator === secondId ? -0.35 : 0;
  const logit = (-binding.debt * 0.8) + continuity;
  const pFirst = 1 / (1 + Math.exp(-logit));
  const actorId = rng() < pFirst ? firstId : secondId;
  const receiverId = actorId === firstId ? secondId : firstId;
  const nextBinding = {
    ...binding,
    debt: binding.debt + (actorId === firstId ? 1 : -1),
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

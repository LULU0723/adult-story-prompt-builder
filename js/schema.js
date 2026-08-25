export const DATA_VERSION = "0.2";

export const ROLE_SHAPES_V01 = new Set(["directed", "mutual"]);
export const STAGES = new Set([1, 2, 3]);
export const MOBILITY = ["immobilized", "restricted", "partial", "free"];
export const TRAIT_LEVELS = new Set(["very_low", "low", "mid", "high", "very_high"]);
export const PERMISSION_STATES = new Set(["allowed", "no_recommend", "disabled"]);

export function mobilityRank(value) {
  const index = MOBILITY.indexOf(value);
  if (index < 0) throw new Error(`Unknown mobility: ${value}`);
  return index;
}

export function validateRequirement(req, path = "requirement") {
  const errors = [];
  if (!req || typeof req !== "object") return [`${path} must be an object`];
  if (!req.kind || typeof req.kind !== "string") errors.push(`${path}.kind is required`);
  if (!Array.isArray(req.spec) || req.spec.length === 0) errors.push(`${path}.spec must be a non-empty array`);
  else if (req.spec.some(value => typeof value !== "string" || !value)) errors.push(`${path}.spec values must be non-empty strings`);
  return errors;
}

export function validateMobilityRule(rule, path) {
  if (rule == null) return [];
  if (typeof rule !== "string") return [`${path} must be a string or null`];
  const match = /^(min|max|eq):(immobilized|restricted|partial|free)$/.exec(rule);
  return match ? [] : [`${path} has invalid mobility rule '${rule}'`];
}

export function validateItem(item) {
  const errors = [];
  const warnings = [];

  if (!item?.id || typeof item.id !== "string") errors.push("id is required");
  if (!item?.label || typeof item.label !== "string") errors.push(`${item?.id ?? "item"}: label is required`);
  if (!item?.cluster || typeof item.cluster !== "string") errors.push(`${item?.id ?? "item"}: cluster is required`);
  if (!ROLE_SHAPES_V01.has(item?.roleShape)) errors.push(`${item?.id ?? "item"}: unsupported roleShape ${item?.roleShape}`);
  if (!Array.isArray(item?.stageHints) || item.stageHints.length === 0 || item.stageHints.some(x => !STAGES.has(x))) {
    errors.push(`${item?.id ?? "item"}: stageHints must contain only 1/2/3`);
  }
  if (![0, 1, 2].includes(item?.anchorSuitability)) errors.push(`${item?.id ?? "item"}: anchorSuitability must be 0/1/2`);
  if (!Number.isInteger(item?.intensityMin) || !Number.isInteger(item?.intensityMax) || item.intensityMin > item.intensityMax) {
    errors.push(`${item?.id ?? "item"}: invalid intensity range`);
  }
  if (item?.defaultIntensity < item?.intensityMin || item?.defaultIntensity > item?.intensityMax) {
    errors.push(`${item?.id ?? "item"}: defaultIntensity outside range`);
  }
  if (!Number.isInteger(item?.minParticipants) || item.minParticipants < 1) {
    errors.push(`${item?.id ?? "item"}: minParticipants must be a positive integer`);
  }
  if (!PERMISSION_STATES.has(item?.defaultStatus)) {
    errors.push(`${item?.id ?? "item"}: defaultStatus must be allowed/no_recommend/disabled`);
  }
  if (typeof item?.promptTemplate !== "string" || !item.promptTemplate.trim()) {
    errors.push(`${item?.id ?? "item"}: promptTemplate is required`);
  } else if (item.roleShape === "directed") {
    if (!item.promptTemplate.includes("{actor}")) errors.push(`${item.id}: directed promptTemplate must contain {actor}`);
    if (!item.promptTemplate.includes("{receiver}")) errors.push(`${item.id}: directed promptTemplate must contain {receiver}`);
  } else if (item.roleShape === "mutual") {
    if (item.promptTemplate.includes("{actor}") || item.promptTemplate.includes("{receiver}")) {
      errors.push(`${item.id}: mutual promptTemplate must not use directional {actor}/{receiver} placeholders`);
    }
  }

  for (const role of ["actor", "receiver", "scene"]) {
    const reqs = item?.requirements?.[role] ?? [];
    if (!Array.isArray(reqs)) errors.push(`${item?.id ?? "item"}: requirements.${role} must be an array`);
    else reqs.forEach((req, i) => errors.push(...validateRequirement(req, `${item.id}.requirements.${role}[${i}]`)));
  }

  errors.push(...validateMobilityRule(item?.requiresMobility?.actor, `${item?.id ?? "item"}.requiresMobility.actor`));
  errors.push(...validateMobilityRule(item?.requiresMobility?.receiver, `${item?.id ?? "item"}.requiresMobility.receiver`));
  for (const [role, value] of Object.entries(item?.setsMobility ?? {})) {
    if (!new Set(["actor", "receiver"]).has(role)) errors.push(`${item.id}: setsMobility role '${role}' is unsupported`);
    if (!MOBILITY.includes(value)) errors.push(`${item.id}: setsMobility.${role} has invalid value '${value}'`);
  }

  if (item?.roleSwitch && !item.stageHints.some(stage => stage >= 2)) {
    errors.push(`${item.id}: roleSwitch must be possible in stage 2 or 3`);
  }
  if (item?.deprecated && item?.defaultStatus === "allowed") {
    warnings.push(`${item.id}: deprecated item should not default to allowed`);
  }
  if (item?.anchorSuitability > 0 && item.stageHints.length === 1 && item.stageHints[0] === 1) {
    warnings.push(`${item.id}: anchor-suitable item is stage-1-only; verify this is intentional`);
  }

  return { errors, warnings };
}

export function validateDataset(items) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const clusterCounts = new Map();

  for (const item of items) {
    if (seen.has(item.id)) errors.push(`duplicate item id: ${item.id}`);
    seen.add(item.id);
    clusterCounts.set(item.cluster, (clusterCounts.get(item.cluster) ?? 0) + 1);
    const result = validateItem(item);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  for (const [cluster, count] of clusterCounts) {
    if (count < 2) warnings.push(`cluster '${cluster}' has only ${count} item(s); consider merging after fixtures expand`);
  }

  return { errors, warnings };
}

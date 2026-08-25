const anatomyProviders = {
  penis: [{ kind: "penetrator", spec: "penis" }],
  vagina: [{ kind: "receptacle", spec: "vaginal" }],
  anus: [{ kind: "receptacle", spec: "anal" }],
  mouth: [{ kind: "receptacle", spec: "oral" }],
  hands: [
    { kind: "hands", spec: "available" },
    { kind: "penetrator", spec: "manual" },
    { kind: "toucher", spec: "manual" }
  ],
  breasts: [{ kind: "body_feature", spec: "breasts" }]
};

const equipmentProviders = {
  strap_on: [{ kind: "penetrator", spec: "toy" }],
  penetrative_toy: [{ kind: "penetrator", spec: "toy" }],
  blindfold: [{ kind: "sensory_tool", spec: "blindfold" }],
  restraint_tie: [{ kind: "restraint_tool", spec: "basic" }]
};

export function deriveProviders(characters, sceneConfig) {
  const providers = [];

  for (const character of characters) {
    for (const anatomy of character.anatomy ?? []) {
      for (const provider of anatomyProviders[anatomy] ?? []) {
        providers.push({ owner: character.id, ...provider, source: `anatomy:${anatomy}` });
      }
    }
    for (const equipment of character.equipment ?? []) {
      for (const provider of equipmentProviders[equipment] ?? []) {
        providers.push({ owner: character.id, ...provider, source: `equipment:${equipment}` });
      }
    }
  }

  const sceneOwner = "scene";
  if (sceneConfig?.props?.includes("mirror")) {
    providers.push({ owner: sceneOwner, kind: "mirror", spec: "available", source: "scene:mirror" });
  }
  if (sceneConfig?.privacy === "public" || sceneConfig?.privacy === "semi") {
    providers.push({ owner: sceneOwner, kind: "discovery_risk", spec: sceneConfig.privacy, source: `scene:privacy:${sceneConfig.privacy}` });
  }
  if (sceneConfig?.privacy === "private") {
    providers.push({ owner: sceneOwner, kind: "privacy", spec: "private", source: "scene:privacy:private" });
  }

  return providers;
}

export function providersForOwner(providers, owner) {
  return providers.filter(provider => provider.owner === owner);
}

export function requirementSatisfied(requirement, providers) {
  const allowedSpecs = new Set(requirement.spec ?? []);
  return providers.some(provider => provider.kind === requirement.kind && allowedSpecs.has(provider.spec));
}

export function scoreItem(item, ctx) {
  const contributions = [];
  const target = ctx.userMaxIntensity;
  const center = Math.min(item.intensityMax, target);
  const distance = Math.max(0, target - center);
  const intensity = Math.max(-1.2, 0.8 - distance * 0.35);
  contributions.push({ key: "intensity", value: intensity });

  const preferenceHits = (item.tags ?? []).filter(tag => ctx.preferredTags?.has(tag)).length;
  contributions.push({ key: "preference", value: preferenceHits * 0.35 });

  const anchorTags = ctx.anchor?.tags ?? [];
  const overlap = (item.tags ?? []).filter(tag => anchorTags.includes(tag)).length;
  contributions.push({ key: "anchorAffinity", value: Math.min(0.6, overlap * 0.3) });

  const selectedSameCluster = (ctx.selectedItems ?? []).filter(selected => selected.cluster === item.cluster && !selected.locked).length;
  contributions.push({ key: "diversity", value: -selectedSameCluster * 0.8 });

  const total = contributions.reduce((sum, part) => sum + part.value, 0);
  return { total, weight: Math.exp(total), contributions };
}

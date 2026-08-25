export function compileDumbPrompt(generation, charactersById) {
  const lines = [];
  lines.push("【生成摘要】");
  for (const step of generation.results) {
    if (!step.item) continue;
    const actor = charactersById[step.direction?.actorId]?.displayName ?? step.direction?.actorId ?? "角色A";
    const receiver = charactersById[step.direction?.receiverId]?.displayName ?? step.direction?.receiverId ?? "角色B";
    const template = step.item.promptTemplate ?? step.item.label;
    const phrasing = template.replaceAll("{actor}", actor).replaceAll("{receiver}", receiver);
    lines.push(`- Stage ${step.stage} / ${step.kind}: ${phrasing}`);
  }
  lines.push("");
  lines.push("【寫作要求】");
  lines.push("所有角色皆為成年人。保持角色身體設定、角色方向與行動限制前後一致。玩法強度與文字直接度是兩個獨立維度；不要因高強度設定自動改成全篇極端露骨詞彙。");
  return lines.join("\n");
}

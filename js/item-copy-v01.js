export const ITEM_COPY_V01 = Object.freeze({
  slow_teasing: Object.freeze({
    displayName: '慢速挑逗',
    narrativeDirection: '{actor} 刻意放慢與 {receiver} 的互動，用反覆試探與短暫停頓累積期待；每次停頓都要根據 {receiver} 的反應決定下一步。',
    designerNote: '低強度節奏控制；不改變 mobility。'
  }),
  verbal_direction: Object.freeze({
    displayName: '口頭引導',
    narrativeDirection: '{actor} 主要透過簡短、明確的語句掌握節奏，讓 {receiver} 的回答、遲疑或主動回應實際改變下一步，而不是把指示寫成連續命令清單。',
    designerNote: 'Directed verbal-control item；可作 Main Anchor。'
  }),
  mirror_focus: Object.freeze({
    displayName: '鏡面展示',
    narrativeDirection: '{actor} 持續利用鏡面讓 {receiver} 看見自己的姿態與反應，讓鏡中的視線成為互動的一部分，而不是只在場景裡提到鏡子一次。',
    designerNote: '需要 scene mirror available；anchorSuitability=0。'
  }),
  manual_penetrative_contact: Object.freeze({
    displayName: '手部插入互動',
    narrativeDirection: '{actor} 以手部進行插入式的親密互動，描寫時依照 {receiver} 實際具備的身體條件選擇可行部位，並維持前後位置與反應一致。',
    designerNote: 'Actor manual penetrator + receiver vaginal/anal receptacle。'
  }),
  toy_penetrative_contact: Object.freeze({
    displayName: '穿戴式道具插入互動',
    narrativeDirection: '{actor} 使用自己攜帶的穿戴式道具與 {receiver} 進行插入互動；道具始終由 {actor} 使用，並依照 {receiver} 實際具備的身體條件描寫。',
    designerNote: 'Actor toy penetrator；保持 equipment owner 綁定。'
  }),
  light_restraint: Object.freeze({
    displayName: '輕度行動限制',
    narrativeDirection: '{actor} 以明確但仍保留部分活動空間的方式限制 {receiver} 的動作；之後持續把這個受限狀態寫進姿勢、反應與可採取的動作裡，而不是下一段又恢復成完全自由。',
    designerNote: '將 receiver mobility 設為 restricted；後續節點必須遵守 mobility preservation。'
  }),
  full_restraint: Object.freeze({
    displayName: '高度行動限制',
    narrativeDirection: '{actor} 進一步把 {receiver} 固定在幾乎無法自行改變姿勢的狀態；後續的反應、位置與互動都要自然承接這個限制，而不是突然恢復自由活動。',
    designerNote: '將 receiver mobility 設為 immobilized；後續節點不得忽略此持續狀態。'
  }),
  requires_restricted_receiver: Object.freeze({
    displayName: '限制狀態延伸',
    narrativeDirection: '{actor} 把 {receiver} 已經受到限制的狀態直接轉化成下一段互動的核心，讓可動範圍、姿勢與回應方式都因此產生具體變化。',
    designerNote: '僅在 receiver 已為 restricted/immobilized 時可成立；Reachability 可要求 restraint enabler。'
  }),
  mutual_sensory_focus: Object.freeze({
    displayName: '雙向感官互動',
    narrativeDirection: '兩人以觸感、呼吸、距離與細微反應互相調整節奏，讓主動與回應自然往返，不固定由同一方一路主導。',
    designerNote: 'Mutual item；不指定固定方向。'
  }),
  role_reversal: Object.freeze({
    displayName: '主導權反轉',
    narrativeDirection: '在這個節點讓 {receiver} 從 {actor} 手中真正接過後續節奏；反轉之後，新的主動方向要持續影響後續互動，而不是下一段又自動切回原本角色。',
    designerNote: '唯一 persistent roleSwitch；僅 stage 2/3；不可作 Main Anchor。'
  }),
  mutual_kissing_exchange: Object.freeze({
    displayName: '雙向親吻互動',
    narrativeDirection: '兩人的親吻、靠近與停頓彼此回應，讓誰先靠近、誰先停下、誰重新接手節奏自然往返，而不是固定由單方推進。',
    designerNote: '低強度 mutual intimacy。'
  }),
  guided_touch: Object.freeze({
    displayName: '引導式觸碰',
    narrativeDirection: '{actor} 用手部觸碰逐步引導 {receiver} 的注意力與反應，保留試探、停頓與回饋，不要一開始就直接跳到高強度互動。',
    designerNote: '需要 actor manual toucher；低強度 directed 候選。'
  }),
  mutual_body_contact: Object.freeze({
    displayName: '雙向貼近互動',
    narrativeDirection: '兩人透過距離、體溫與身體貼近互相調整節奏，任何一方的靠近、停頓或退讓都要改變另一方下一步。',
    designerNote: 'Light mutual body-contact；不依賴特定 anatomy。'
  }),
  private_aftercare: Object.freeze({
    displayName: '私密場景收尾照顧',
    narrativeDirection: '在私密環境中，兩人用安撫、整理與彼此確認狀態延續前一段情緒，讓收尾像是互動自然的一部分，而不是突然切斷場景。',
    designerNote: '需要 privacy=private；late-stage mutual context item。'
  }),
  public_risk_whisper: Object.freeze({
    displayName: '公開風險下的低聲互動',
    narrativeDirection: '{actor} 在可能被他人注意到的環境裡，以壓低聲音、縮短動作或控制距離的方式與 {receiver} 互動；被發現的風險要實際限制兩人的行為。',
    designerNote: '需要 discovery_risk public/semi；不作 Main Anchor。'
  }),
  breast_focus_touch: Object.freeze({
    displayName: '胸部偏好觸碰',
    narrativeDirection: '{actor} 把手部觸碰與注意力集中在 {receiver} 的胸部，描寫重點放在接觸方式、反應與節奏變化，且只在 {receiver} 確實具備胸部設定時使用。',
    designerNote: 'Actor manual toucher + receiver breasts body_feature。'
  }),
  penis_penetrative_contact: Object.freeze({
    displayName: '陰莖插入互動',
    narrativeDirection: '{actor} 使用自己的陰莖與 {receiver} 進行插入互動，依照 {receiver} 實際具備的身體條件選擇可行部位，並保持雙方身體位置、方向與反應前後一致。',
    designerNote: 'Actor penis penetrator + receiver vaginal/anal receptacle；owner-aware。'
  }),
  lingering_pause: Object.freeze({
    displayName: '延長停頓',
    narrativeDirection: '{actor} 刻意延長一次關鍵停頓，不急著接下一個動作；先觀察 {receiver} 是否主動靠近、說話或改變姿勢，再讓那個回應決定接下來的節奏。',
    designerNote: '可跨 stage 使用的低強度 pace control。'
  }),
  mutual_permission_exchange: Object.freeze({
    displayName: '雙向確認與邀請',
    narrativeDirection: '兩人用短句、停頓與主動邀請彼此確認下一步，每一次確認都要帶來實際的節奏或方向變化，避免寫成重複而制式的問答。',
    designerNote: 'Egalitarian-friendly mutual verbal item。'
  }),
  private_close_dialogue: Object.freeze({
    displayName: '私密近距離對話',
    narrativeDirection: '{actor} 在私密環境中以近距離對話引導 {receiver} 的注意力，讓語氣、停頓、視線與回答逐步縮短彼此距離。',
    designerNote: '需要 privacy=private；directed context modifier。'
  }),
  mutual_reassurance_exchange: Object.freeze({
    displayName: '雙向安撫回應',
    narrativeDirection: '兩人在後段透過靠近、短句與彼此回應確認狀態，讓前面累積的情緒自然延續，並讓雙方都能主動回應對方。',
    designerNote: 'Late-stage Light mutual reassurance。'
  }),
  quiet_reassurance_guidance: Object.freeze({
    displayName: '低聲安撫引導',
    narrativeDirection: '{actor} 用簡短、低聲的安撫與確認維持 {receiver} 的節奏，讓 {receiver} 的回答、靠近或停頓決定這一段如何繼續。',
    designerNote: 'Directed Light reassurance；stage 2/3。'
  }),
  light_position_hold: Object.freeze({
    displayName: '輕度姿勢固定',
    narrativeDirection: '{actor} 只用輕度姿勢控制縮小 {receiver} 的動作範圍，不讓對方完全失去主動移動能力；後續要持續反映這種「能動但受限」的狀態。',
    designerNote: '將 receiver mobility 設為 partial；Light preservation path。'
  }),
  sustained_position_control: Object.freeze({
    displayName: '持續姿勢控制',
    narrativeDirection: '{actor} 持續控制 {receiver} 的姿勢與節奏，讓前面建立的主導關係在動作與位置上一直看得見，而不是只靠台詞宣告誰在主導。',
    designerNote: 'Medium/Heavy directed position control；不額外改變 mobility。'
  }),
  mutual_intensity_exchange: Object.freeze({
    displayName: '雙向強度交換',
    narrativeDirection: '兩人在後段依彼此的即時反應主動提高或放緩強度，控制權可以往返，但每一次變化都要承接上一個人的反應。',
    designerNote: 'Egalitarian Medium/Heavy late-stage mutual pace item。'
  }),
  manual_oral_contact: Object.freeze({
    displayName: '手部口部互動',
    narrativeDirection: '{actor} 以手部與 {receiver} 的口部進行親密互動，保持節奏偏輕到中等，並讓吞嚥、停頓、退開或重新靠近等反應實際改變下一步。',
    designerNote: 'Actor manual penetrator + receiver oral receptacle。'
  }),
  penis_oral_contact: Object.freeze({
    displayName: '陰莖口部互動',
    narrativeDirection: '{actor} 使用自己的陰莖與 {receiver} 的口部進行親密互動，讓位置、節奏與雙方反應保持清楚一致，且只在雙方相應身體設定都存在時使用。',
    designerNote: 'Actor penis penetrator + receiver oral receptacle；owner-aware。'
  }),
  semi_private_risk_escalation: Object.freeze({
    displayName: '半私密風險延伸',
    narrativeDirection: '{actor} 在仍可能被打擾、但比公開場所更能靠近的環境裡延續與 {receiver} 的互動；被發現的風險要持續限制聲量、姿勢或停留時間。',
    designerNote: '僅 discovery_risk=semi；late-stage context item。'
  }),
  late_stage_response_loop: Object.freeze({
    displayName: '後段反應循環',
    narrativeDirection: '{actor} 在後段持續根據 {receiver} 的即時反應微調下一步，讓同一種互動因停頓、靠近、退讓或回應而產生連續變化，不要直接跳到收尾。',
    designerNote: 'Light stage-3 directed response-loop candidate。'
  })
});

export function itemCopy(item) {
  if (!item?.id) return null;
  return ITEM_COPY_V01[item.id] ?? null;
}

export const ITEM_COPY_V01 = Object.freeze({
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
  manual_penetrative_contact: Object.freeze({
    displayName: '手部插入互動',
    narrativeDirection: '{actor} 以手指與手部動作和 {receiver} 進行插入式親密互動；動作依 {receiver} 的即時反應調整深度、速度與停頓，並保持雙方位置與動作連續性。',
    designerNote: 'actor 需有 manual penetrator；receiver 需有 vaginal 或 anal receptacle。'
  }),
  toy_penetrative_contact: Object.freeze({
    displayName: '道具插入互動',
    narrativeDirection: '{actor} 使用自己持有的插入型或穿戴式道具與 {receiver} 互動；由 {actor} 持續控制道具、角度與節奏，並依 {receiver} 的反應調整，不要把道具所有權或使用方向寫反。',
    designerNote: 'actor 需持有 toy penetrator；receiver 需有 vaginal 或 anal receptacle；保留 owner binding。'
  }),
  penis_penetrative_contact: Object.freeze({
    displayName: '陰莖插入互動',
    narrativeDirection: '{actor} 與 {receiver} 進行以陰莖插入為核心的親密互動；清楚維持雙方身體位置與主動、接受方向，並讓 {receiver} 的反應實際影響節奏與下一步。',
    designerNote: 'actor 需有 penis penetrator；receiver 需有 vaginal 或 anal receptacle；不得由 anatomy 反推 gender。'
  })
});

export function itemCopy(item) {
  if (!item?.id) return null;
  return ITEM_COPY_V01[item.id] ?? null;
}

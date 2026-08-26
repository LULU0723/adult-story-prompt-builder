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
  })
});

export function itemCopy(item) {
  if (!item?.id) return null;
  return ITEM_COPY_V01[item.id] ?? null;
}

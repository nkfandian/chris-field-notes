const units={post:['篇日志'],book:['本书'],note:['条短注']}

// 把轨迹节点按类型汇总成可读文字，例如“5 篇日志 · 8 本书”。
export function trailComposition(items=[]){
  const counts={post:0,book:0,note:0}
  for(const item of items)if(item.item_type in counts)counts[item.item_type]++
  const parts=Object.entries(counts).filter(([,count])=>count).map(([type,count])=>`${count} ${units[type]}`)
  return parts.join(' · ')||'暂无节点'
}

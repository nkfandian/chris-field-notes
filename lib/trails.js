const units={post:['篇日志'],book:['本书'],note:['条短注']}
const PINNED_SLUGS=['Peter-Hessler','China-Nonfiction']

// 将原有的两条经典轨迹置顶，其余按更新时间倒序排列。
export function sortTrails(trails=[]){
  return [...trails].sort((a,b)=>{
    const ia=PINNED_SLUGS.indexOf(a.slug)
    const ib=PINNED_SLUGS.indexOf(b.slug)
    if(ia!==-1&&ib!==-1)return ia-ib
    if(ia!==-1)return -1
    if(ib!==-1)return 1
    return String(b.updated_at||'').localeCompare(String(a.updated_at||''))
  })
}

// 把轨迹节点按类型汇总成可读文字，例如“5 篇日志 · 8 本书”。
export function trailComposition(items=[]){
  const counts={post:0,book:0,note:0}
  for(const item of items)if(item.item_type in counts)counts[item.item_type]++
  const parts=Object.entries(counts).filter(([,count])=>count).map(([type,count])=>`${count} ${units[type]}`)
  return parts.join(' · ')||'暂无节点'
}

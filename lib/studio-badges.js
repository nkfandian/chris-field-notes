// 后台导航未读气泡：用 site_content 存各板块的“上次查看时间”，
// 新留言 / 新订阅数 = 该时间之后新增的行数；进页面后把时间记为现在，气泡清零。
// 复用 site_content（key-value），不用新增表、不改 migration；
// site_content 的 RLS 本就允许 authenticated 读写，站长登录态下可用。
// 注意：首次没有记录时计数为 0（不把历史存量当成新的）；
// 评论只计顶层留言（parent_id 为空），站长自己的回复不算；订阅只计有效的（status='active'）。
export const STUDIO_SEEN_KEYS={comments:'studio_seen_comments',subscribers:'studio_seen_subscribers'}

export async function getStudioBadgeCounts(db){
 const out={comments:0,subscribers:0}
 try{
  const {data}=await db.from('site_content').select('key,value').in('key',Object.values(STUDIO_SEEN_KEYS))
  const seen={}
  for(const row of data||[])seen[row.key]=row.value?.seen_at
  for(const [section,key] of Object.entries(STUDIO_SEEN_KEYS)){
   const at=seen[key]
   if(!at)continue
   try{
    let q=db.from(section==='comments'?'comments':'subscribers').select('id',{count:'exact',head:true}).gt('created_at',at)
    if(section==='comments')q=q.is('parent_id',null)
    else q=q.eq('status','active')
    const {count}=await q
    out[section]=count||0
   }catch{out[section]=0}
  }
 }catch{}
 return out
}

export async function markStudioSeen(db,section){
 const key=STUDIO_SEEN_KEYS[section]
 if(!key)return
 const now=new Date().toISOString()
 try{await db.from('site_content').upsert({key,value:{seen_at:now},updated_at:now})}catch{}
}

export const DEFAULT_ABOUT_TEXT='我经历过 QQ 空间、新浪博客、豆瓣、微博、Goodreads 等数不清的平台，那里都曾留下过我的记录。如今我把 2008 年至今写下的近三百篇长文、一千多本中英文书单与近两千条日常随记，全部整理搬进了这个独立小站，延续我在互联网上的记忆。'

export const DEFAULT_ABOUT_CONFIG={
 version:2,
 headline:'关于 Chris 与这个独立空间',
 intro:DEFAULT_ABOUT_TEXT,
 guideLead:'如果你是第一次来到这里，不妨按下面的顺序逛逛这个空间：',
 sections:[
  {
   id:'ai-twin',
   badge:'AI DIGITAL TWIN',
   title:'✦ 和 AI 作者对话（最快认识这里的入口）',
   body:'不必一页页翻目录，你可以直接向我的「AI 数字分身」提问，也支持顺着话题连续追问（不知道问什么时，可以点「换一批」抽随机问题）。它会翻阅我过去十八年的日志、高分书评与微博，用平实的口吻回答你，并在句尾附上每一处真实原文链接。',
   actions:[
    {label:'✦ 去和 AI 作者聊聊 ↗',href:'/search?mode=ask',primary:true}
   ]
  },
  {
   id:'books-lab',
   badge:'INTERACTIVE SHELF',
   title:'书单里的两个小玩具：私人书方签 & 盲品一页',
   body:'这里收纳了我读过的 600 多本中英文书与短评。除了按语言、专题翻看书架，更推荐你试试书单顶部的两个互动功能：\n• 「✦ 私人书方签」：输入你爱读的几本书或近期的一个困惑，和我的书架做一次品味对撞，算出我们的阅读同频度，并为你开出 3 本高分私藏书方（可一键保存成带二维码的书方卡片图）。\n• 「盲品一页」：先隐去书名、封面和作者光环，像在旧书店抽盲盒书签一样只读一段我当年留下的手记；如果那段话恰好击中你，再翻开封底揭晓书名。',
   actions:[
    {label:'✦ 开一张私人书方 ↗',href:'/books?tab=rx',primary:true},
    {label:'盲品一页书签 →',href:'/books?tab=blind'},
    {label:'浏览完整书架 →',href:'/books'}
   ]
  },
  {
   id:'logs',
   badge:'18-YEAR ESSAYS',
   title:'日志：十八年长文归档与「随机漫步」',
   body:'汇总了从大学求学至今写下的书评、中国近现代史与非虚构阅读笔记、教育观察、台湾纪行及家乡人物记录。你可以按栏目或年份（2009–2026）回溯一个人的阅读与成长变化，也可以直接点「随机读一篇」，随缘翻开某一年的一页。',
   actions:[
    {label:'翻阅全部日志 →',href:'/logs'},
    {label:'随机读一篇 ↗',href:'/logs/random'}
   ]
  },
  {
   id:'trails',
   badge:'TRAILS & ANNUAL',
   title:'阅读轨迹与年度盘点（串点成线）',
   body:'如果想系统看某一个主题，可以去「轨迹」——我把散落在不同年份的同主题长文和书籍串成了几条阅读路径（如乡村观察、台湾纪行、南开六年等）；如果想按时间纵览，可以去「年度盘点」查看每一年的写作字数与目录汇总。',
   actions:[
    {label:'探索阅读轨迹 →',href:'/trails'},
    {label:'查看年度盘点 →',href:'/annual'}
   ]
  },
  {
   id:'weibo-search',
   badge:'NOTES & SEARCH',
   title:'微博随记与全站搜索（日常切片与精准定位）',
   body:'「微博」是我的日常备忘录，保留了近两千条读书摘记、爬山见闻与即兴想法，欢迎随手点赞或留下评论。若你想找某位特定作者（比如“何伟”“秦晖”“E·B·怀特”）或某本书，用顶部的「搜索」就能一次查遍全站所有日志、书单与微博并直达对应位置。',
   actions:[
    {label:'逛逛微博随记 →',href:'/weibo'},
    {label:'全站关键词搜索 →',href:'/search'}
   ]
  },
  {
   id:'contact',
   badge:'KEEP IN TOUCH',
   title:'保持联系',
   body:'小站不投放广告，仅在不定期发布新长文时更新。你可以通过页面底部的邮件订阅（随时可退订）或 RSS 接收新文章，也随时欢迎在页脚「给我留言」打个招呼。',
   actions:[
    {label:'邮件订阅 ↓',href:'#subscribe'},
    {label:'给我留言 ↓',href:'#message'},
    {label:'RSS 订阅 ↗',href:'/feed.xml'}
   ]
  }
 ]
}

export function resolveAboutText(value={},home={}){
 if(value&&Number(value.version)>=2&&typeof value.intro==='string'&&value.intro.trim()){
  return value.intro.trim()
 }
 return String(value?.text||home?.manifesto||value?.statement||DEFAULT_ABOUT_TEXT).trim()||DEFAULT_ABOUT_TEXT
}

export function resolveAboutConfig(value={}){
 if(!value||typeof value!=='object'||Number(value.version)<2||!Array.isArray(value.sections)){
  return structuredClone(DEFAULT_ABOUT_CONFIG)
 }
 return {
  version:2,
  headline:String(value.headline||DEFAULT_ABOUT_CONFIG.headline).trim(),
  intro:String(value.intro||DEFAULT_ABOUT_CONFIG.intro).trim(),
  guideLead:String(value.guideLead??DEFAULT_ABOUT_CONFIG.guideLead).trim(),
  sections:value.sections.map((sec,idx)=>({
   id:String(sec?.id||`sec-${idx+1}`),
   badge:String(sec?.badge||'').trim(),
   title:String(sec?.title||'').trim(),
   body:String(sec?.body||'').trim(),
   actions:Array.isArray(sec?.actions)
    ?sec.actions.filter(a=>a?.label&&a?.href).map(a=>({
     label:String(a.label).trim(),
     href:String(a.href).trim(),
     primary:Boolean(a.primary)
    }))
    :[]
  })).filter(s=>s.title||s.body)
 }
}

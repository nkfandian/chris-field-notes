import Link from 'next/link'
import Logo from '../components/logo'
import StructuredData from '../components/structured-data'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {DEFAULT_ABOUT_TEXT,resolveAboutText} from '@/lib/about'
import {AUTHOR_ID,AUTHOR_URL,SITE_DESCRIPTION,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import '../privacy/privacy.css'

export const revalidate=60
export const metadata=pageMetadata({
  title:'关于 Chris',
  description:'关于 CHRIS / FIELD NOTES、作者 Chris，以及这个中文个人网站持续记录的阅读、写作、商业、技术与身体经验。',
  path:'/about',
  keywords:['Chris','作者介绍','独立博客','个人网站']
})

export default async function AboutPage(){
  let aboutText=DEFAULT_ABOUT_TEXT,updated
  if(isConfigured()){
    const db=await createClient()
    const [{data:about},{data:home}]=await Promise.all([
      db.from('site_content').select('value,updated_at').eq('key','about').maybeSingle(),
      db.from('site_content').select('value').eq('key','home').maybeSingle()
    ])
    aboutText=resolveAboutText(about?.value||{},home?.value||{})
    updated=about?.updated_at
  }
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'ProfilePage','@id':AUTHOR_URL,url:AUTHOR_URL,name:'关于 Chris',description:metadata.description,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},dateModified:updated,mainEntity:{'@type':'Person','@id':AUTHOR_ID,name:'Chris',url:AUTHOR_URL,description:'CHRIS / FIELD NOTES 的作者，持续记录阅读、写作、商业、技术与身体经验。',knowsAbout:['阅读','写作','教育','商业','人工智能','技术实践','个人知识管理']}},
    {'@type':'BreadcrumbList','@id':`${AUTHOR_URL}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:'关于 Chris',item:AUTHOR_URL}]}
  ]}
  const sections=[
    ['origin','为什么有这个网站',<p key="origin">{aboutText}</p>],
    ['subjects','这里写什么',<div key="subjects"><p>这里主要记录语言与叙事、教育与商业、人工智能与技术实践、阅读与书评，以及行走和身体经验。它们共同指向同一件事：一个判断是怎样在现实中慢慢形成的。</p><p>日志保留具体问题和个人经验；书单收纳阅读中的短评；轨迹把文章与书重新组织成可以继续探索的主题路径。</p></div>],
    ['method','如何写与如何读',<div key="method"><p>文章以作者的观察、阅读和实践为起点。涉及工具与方法时，页面会尽量保留“输入与工具”等说明，让读者知道内容如何形成。</p><p>你可以从<Link href="/logs">全部日志</Link>按时间阅读，也可以从<Link href="/books">书单</Link>或<Link href="/trails">阅读轨迹</Link>进入某个主题。</p></div>],
    ['contact','作者与联系',<div key="contact"><p>本站作者署名为 Chris。新日志可以通过<Link href="/#subscribe">邮件订阅</Link>或 <a href="/feed.xml">RSS</a> 获取；问题、线索和反馈可以从首页留言。</p><p>关于订阅、评论、访问统计和第三方服务的数据处理方式，请查看<Link href="/privacy">隐私政策</Link>。</p></div>]
  ]
  return <main className="privacy-page about-page" id="top">
    <StructuredData data={schema}/>
    <nav className="privacy-nav"><Link href="/" aria-label={`${SITE_NAME} 首页`}><Logo compact/></Link><span>ABOUT</span><Link href="/">返回首页</Link></nav>
    <header className="privacy-hero"><h1>关于 Chris<br/>与 FIELD NOTES</h1><div className="privacy-intro"><p>{SITE_DESCRIPTION}</p><dl><div><dt>作者</dt><dd>Chris</dd></div><div><dt>语言</dt><dd>中文 / zh-CN</dd></div><div><dt>更新</dt><dd>不定期</dd></div></dl></div></header>
    <div className="privacy-layout"><aside aria-label="关于页面目录"><span>目录</span><ol>{sections.map(([id,label],index)=><li key={id}><a href={`#${id}`}><b>{String(index+1).padStart(2,'0')}</b>{label}</a></li>)}</ol></aside><article className="privacy-copy">{sections.map(([id,label,content],index)=><section id={id} key={id}><header><span>{String(index+1).padStart(2,'0')}</span><h2>{label}</h2></header><div>{content}</div></section>)}</article></div>
    <footer className="privacy-footer"><Link href="/"><Logo compact/></Link><Link href="/logs">继续阅读日志 →</Link></footer>
  </main>
}

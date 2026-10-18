import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {DEFAULT_ABOUT_TEXT,resolveAboutText} from '@/lib/about'
import {AUTHOR_ID,AUTHOR_URL,SITE_LANGUAGE,SITE_NAME,SITE_URL,WEBSITE_ID,pageMetadata} from '@/lib/seo'
import '../privacy/privacy.css'

export const revalidate=60
export const metadata=pageMetadata({
  title:'关于 Chris',
  description:'关于作者 Chris：曾在南开读书六年，长期阅读中英文非虚构作品，在这个独立小站记录书评、教育观察与个人记忆。',
  path:'/about',
  keywords:['Chris','作者介绍','独立博客','个人网站','南开大学']
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
    {'@type':'ProfilePage','@id':AUTHOR_URL,url:AUTHOR_URL,name:'关于 Chris',description:metadata.description,inLanguage:SITE_LANGUAGE,isPartOf:{'@id':WEBSITE_ID},dateModified:updated,mainEntity:{'@type':'Person','@id':AUTHOR_ID,name:'Chris',url:AUTHOR_URL,description:'CHRIS / FIELD NOTES 的作者，曾在南开读书六年，记录中英文书评、教育观察与个人记忆。',knowsAbout:['阅读','写作','教育','商业','人工智能','技术实践','个人知识管理']}},
    {'@type':'BreadcrumbList','@id':`${AUTHOR_URL}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:'关于 Chris',item:AUTHOR_URL}]}
  ]}
  const sections=[
    ['subjects','这里写什么',<div key="subjects"><p>这里写得最多的是书评和读书笔记，中文书、英文书都有，尤其是关于中国的非虚构作品；其次是对教育和社会现象的观察，比如高考、东亚教育，以及 AI 时代的学习。还有一部分是个人记忆：南开读书的六年、家族长辈的往事、身边那些走出村庄的普通人。另外几篇，记录了自己不写一行代码、借助 AI 把这个网站一点点搭起来的过程。</p><p>日志保留具体问题和个人经验；书单收纳阅读中的短评；轨迹把文章与书重新组织成可以继续探索的主题路径。</p></div>],
    ['method','如何写与如何读',<div key="method"><p>文章以作者的观察、阅读和实践为起点。涉及工具与方法时，页面会尽量保留“输入与工具”等说明，让读者知道内容如何形成。</p><p>你可以从<Link href="/logs">全部日志</Link>按时间阅读，也可以从<Link href="/books">书单</Link>或<Link href="/trails">阅读轨迹</Link>进入某个主题。</p></div>],
    ['contact','作者与联系',<div key="contact"><p>本站作者署名为 Chris。新日志可以通过<Link href="/#subscribe">邮件订阅</Link>或 <a href="/feed.xml">RSS</a> 获取；问题、线索和反馈可以从首页留言。</p><p>关于订阅、评论、访问统计和第三方服务的数据处理方式，请查看<Link href="/privacy">隐私政策</Link>。</p></div>]
  ]
  return <><SiteHeader current="about"/><main className="privacy-page about-page" id="content">
    <StructuredData data={schema}/>
    <header className="privacy-hero"><h1>关于 Chris<br/>与 FIELD NOTES</h1><div className="privacy-intro"><p>{aboutText}</p><dl><div><dt>作者</dt><dd>Chris</dd></div><div><dt>语言</dt><dd>中文 / zh-CN</dd></div><div><dt>更新</dt><dd>不定期</dd></div></dl></div></header>
    <div className="privacy-layout"><aside aria-label="关于页面目录"><span>目录</span><ol>{sections.map(([id,label],index)=><li key={id}><a href={`#${id}`}><b>{String(index+1).padStart(2,'0')}</b>{label}</a></li>)}</ol></aside><article className="privacy-copy">{sections.map(([id,label,content],index)=><section id={id} key={id}><header><span>{String(index+1).padStart(2,'0')}</span><h2>{label}</h2></header><div>{content}</div></section>)}</article></div>
  </main><SiteFooter/></>
}

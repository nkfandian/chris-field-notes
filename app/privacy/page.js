import Link from 'next/link'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './privacy.css'

export const metadata=pageMetadata({
  title:'隐私政策',
  description:'CHRIS / FIELD NOTES 如何处理访问、订阅、评论和留言信息，以及如何退订或联系作者。',
  path:'/privacy',
  keywords:['隐私政策','个人信息保护']
})

const updated='2026-11-10'

export default function PrivacyPage(){
  const schema={'@context':'https://schema.org','@type':'WebPage',name:'隐私政策',url:`${SITE_URL}/privacy`,description:'CHRIS / FIELD NOTES 的隐私政策。',inLanguage:SITE_LANGUAGE,isPartOf:{'@id':`${SITE_URL}/#website`},dateModified:updated}
  return <><SiteHeader/><main id="content" className="privacy-page">
    <StructuredData data={schema}/>
    <header className="privacy-hero">
      <h1>隐私政策</h1>
      <div className="privacy-intro"><p>CHRIS / FIELD NOTES 是 Chris 维护的个人网站。这里说明你访问、订阅或留言时，哪些信息会被使用。本站不出售个人信息，也不投放广告。</p><dl><div><dt>适用网站</dt><dd>chrisreading.ink</dd></div><div><dt>最后更新</dt><dd>{updated}</dd></div></dl></div>
    </header>

    <article className="privacy-copy privacy-simple">
      <PolicySection no="01" title="我们会收到什么信息">
        <p>访问网站时，托管和统计服务可能记录 IP 地址、设备类型、访问页面及时间，用于了解访问情况和排查故障。订阅时，我们保存你填写的邮箱及订阅状态。评论或留言时，我们保存你填写的称呼、邮箱、内容和提交时间。</p>
        <p>审核通过的评论会公开显示称呼和正文；邮箱不会公开。请不要在留言中填写密码、证件号码等敏感信息。</p>
      </PolicySection>
      <PolicySection no="02" title="这些信息用来做什么">
        <p>邮箱用于发送你订阅的新日志和处理退订；评论、留言信息用于审核与回复；访问数据用于统计阅读情况、维护网站和防止滥用。本站使用 Vercel Web Analytics 查看访问趋势，不使用 Google Analytics。</p>
      </PolicySection>
      <PolicySection no="03" title="谁会处理这些信息">
        <p>网站运行依赖 Vercel（托管与访问统计）、Supabase（数据存储）、Resend（邮件发送）和 Cloudflare（图片存储等服务）。它们只在提供相应服务所需的范围内处理信息。订阅邮箱保留至退订或提出删除请求；评论和留言在展示、审核或回复所需期间保留，服务日志按服务商的设置清理。</p>
      </PolicySection>
      <PolicySection no="04" title="退订与联系">
        <p>每封订阅邮件底部都有退订链接。若要查询、更正或删除你提交的信息，或对本政策有疑问，请到首页页脚的 <Link href="/#message">“给我留言”</Link> 联系，并留下便于核对的信息。网站处理方式有变化时，本页会更新日期和内容。</p>
      </PolicySection>
    </article>
  </main><SiteFooter/></>
}

function PolicySection({no,title,children}){return <section><header><span>{no}</span><h2>{title}</h2></header><div>{children}</div></section>}

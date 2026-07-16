import Link from 'next/link'
import Logo from '../components/logo'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_NAME,SITE_URL,pageMetadata} from '@/lib/seo'
import './privacy.css'

export const metadata=pageMetadata({
  title:'隐私政策',
  description:'了解 CHRIS / FIELD NOTES 如何处理访问统计、订阅、评论、留言、Cookie 与广告相关数据。',
  path:'/privacy',
  keywords:['隐私政策','Cookie 政策','个人信息保护']
})

const updated='2026-07-16'
const sections=[
  ['scope','适用范围'],
  ['collection','收集的信息'],
  ['purpose','使用目的'],
  ['cookies','Cookie 与广告'],
  ['sharing','服务提供方'],
  ['retention','保存期限'],
  ['rights','你的选择与权利'],
  ['security','安全与跨境处理'],
  ['changes','政策更新']
]

export default function PrivacyPage(){
  const schema={'@context':'https://schema.org','@type':'WebPage',name:'隐私政策',url:`${SITE_URL}/privacy`,description:'CHRIS / FIELD NOTES 的隐私政策与数据处理说明。',inLanguage:SITE_LANGUAGE,isPartOf:{'@id':`${SITE_URL}/#website`},dateModified:updated}
  return <main id="top" className="privacy-page">
    <StructuredData data={schema}/>
    <nav className="privacy-nav"><Link href="/" aria-label={`${SITE_NAME} 首页`}><Logo compact/></Link><span>DATA NOTE / 隐私政策</span><Link href="/">返回首页 ↗</Link></nav>

    <header className="privacy-hero">
      <small>PUBLIC DATA PRACTICE / 公开数据说明</small>
      <h1>记录可以公开，<br/><em>个人信息不必。</em></h1>
      <div className="privacy-intro"><p>本政策说明本网站在访问统计、内容订阅、评论、留言及广告服务中如何处理信息。原则很简单：只收集提供功能所必需的数据，不出售个人信息，也不公开订阅者和留言者的邮箱。</p><dl><div><dt>适用网站</dt><dd>chrisreading.ink</dd></div><div><dt>最后更新</dt><dd>{updated}</dd></div><div><dt>版本</dt><dd>PRIVACY / 01</dd></div></dl></div>
    </header>

    <div className="privacy-layout">
      <aside aria-label="隐私政策目录"><span>INDEX / 目录</span><ol>{sections.map(([id,label],index)=><li key={id}><a href={`#${id}`}><b>{String(index+1).padStart(2,'0')}</b>{label}</a></li>)}</ol></aside>
      <article className="privacy-copy">
        <PolicySection id="scope" no="01" title="适用范围">
          <p>本政策适用于 CHRIS / FIELD NOTES 网站及其提供的日志、书单、阅读轨迹、搜索、订阅、评论和留言功能。通过第三方链接离开本站后，相关服务将适用其各自的隐私政策。</p>
          <p>本站由个人维护，主要用于公开阅读记录、文章和相关内容。本站不会要求用户创建公开账户，也不会以出售个人信息为目的收集数据。</p>
        </PolicySection>

        <PolicySection id="collection" no="02" title="收集的信息">
          <h3>访问与设备信息</h3><p>访问网站时，服务器和访问统计工具可能接收 IP 地址、浏览器及设备类型、访问时间、来源页面、浏览过的页面和基础交互信息。这些信息主要以汇总形式用于理解网站使用情况、排查故障和防止滥用。</p>
          <h3>订阅信息</h3><p>选择订阅时，本站会处理你主动提交的邮箱地址，以及确认状态、订阅时间和退订状态，用于发送新日志通知和管理订阅关系。</p>
          <h3>评论与留言</h3><p>提交评论或留言时，本站会处理你填写的姓名、邮箱、正文、关联页面和提交时间。评论经审核后，姓名和正文可能公开显示；邮箱仅用于识别、审核或必要回复，不会随评论公开。</p>
        </PolicySection>

        <PolicySection id="purpose" no="03" title="信息的使用目的">
          <ul><li>提供、维护和改进网站功能；</li><li>发送用户主动订阅的新日志通知，并处理退订；</li><li>审核评论与留言，回复必要的问题；</li><li>统计整体访问趋势，改善页面和移动端体验；</li><li>识别异常请求、防止垃圾内容和保护网站安全；</li><li>履行适用的法律义务。</li></ul>
          <p>在适用法律要求的情况下，相关处理会以你的同意、提供所请求的服务、本站的合理运营需要或法律义务为依据。你可以随时撤回此前作出的同意，但撤回不影响此前处理的合法性。</p>
        </PolicySection>

        <PolicySection id="cookies" no="04" title="Cookie、访问统计与广告">
          <p>本站使用或可能使用必要 Cookie、类似的本地存储技术和访问统计服务，以维持网站功能、测量访问情况并了解内容表现。</p>
          <p>本站使用 Google Analytics，并接入 Google AdSense。Google 及其合作方可能通过 Cookie、网络信标、IP 地址或其他标识符收集和处理数据，用于广告投放、个性化、频次控制、效果衡量、安全和防欺诈。第三方也可能因广告展示而在你的浏览器中放置或读取 Cookie。</p>
          <p>你可以阅读 <a href="https://policies.google.com/technologies/partner-sites?hl=zh-CN" target="_blank" rel="noreferrer">Google 如何使用合作伙伴网站或应用中的信息 ↗</a>，并通过 <a href="https://adssettings.google.com/" target="_blank" rel="noreferrer">Google 广告设置 ↗</a> 管理个性化广告。你也可以通过浏览器设置删除或限制 Cookie；禁用部分技术可能影响网站功能或广告显示。</p>
          <p>对于依法需要事先同意的地区，本站会通过适用的同意管理机制提供选择。你可以在出现的隐私消息中接受、拒绝或管理相关用途。</p>
        </PolicySection>

        <PolicySection id="sharing" no="05" title="服务提供方与信息共享">
          <p>为运行网站，本站会使用托管、数据库、邮件发送、访问统计、安全和广告服务提供方。这些服务可能仅在提供相应功能所需的范围内处理数据，并受其服务条款与隐私政策约束。</p>
          <p>本站不会出售个人信息。除提供服务、保护本站及用户安全、完成业务转移或遵守法律要求外，不会主动向无关第三方披露可识别个人身份的信息。</p>
        </PolicySection>

        <PolicySection id="retention" no="06" title="信息保存期限">
          <p>订阅邮箱通常保存至你退订或提出删除请求。评论和留言会在内容展示、审核、回复、维护记录或处理争议所需期间保存。访问统计和安全日志按照相应服务设置及合理运营需要保存，超过用途所需后将删除、匿名化或随备份周期清除。</p>
        </PolicySection>

        <PolicySection id="rights" no="07" title="你的选择与权利">
          <p>依据所在地适用法律，你可能有权查询、更正、删除或限制个人信息处理，反对特定处理，获取数据副本，或撤回同意。订阅邮件底部提供退订入口，退订后本站将停止发送新的日志通知。</p>
          <p>如需查询、修改或删除订阅、评论及留言相关信息，可通过首页的 <Link href="/#message">“留下信号”表单 ↗</Link> 联系，并说明需要处理的内容。为避免误删，本站可能要求提供足以核对请求的信息，但不会要求无关资料。</p>
        </PolicySection>

        <PolicySection id="security" no="08" title="安全、未成年人及跨境处理">
          <p>本站采取与网站规模相适应的访问控制、权限管理和技术措施保护信息，但互联网传输和存储无法保证绝对安全。请不要在评论或留言中提交密码、身份证件、财务资料或其他敏感信息。</p>
          <p>本站并非面向儿童提供的服务，也不会主动收集已知儿童的个人信息。如果你认为儿童在未经适当授权的情况下提交了信息，请通过本站联系入口提出删除请求。</p>
          <p>部分服务提供方可能在用户所在国家或地区之外处理数据。使用本站即意味着相关信息可能依据适用的保护机制被传输至其他司法辖区。</p>
        </PolicySection>

        <PolicySection id="changes" no="09" title="政策更新与联系">
          <p>网站功能或数据处理方式发生实质变化时，本政策会相应更新，并在页面顶部修改“最后更新”日期。重大变化会在合理可行的情况下通过网站提示。</p>
          <p>对本政策或本站数据处理方式有疑问，可通过首页的 <Link href="/#message">留言入口 ↗</Link> 联系。</p>
        </PolicySection>
      </article>
    </div>
    <footer className="privacy-footer"><Link href="/"><Logo compact/></Link><p>最少收集 · 明确用途 · 保留选择</p><a href="#top">TOP ↑</a></footer>
  </main>
}

function PolicySection({id,no,title,children}){return <section id={id}><header><span>{no}</span><h2>{title}</h2></header><div>{children}</div></section>}

import Link from 'next/link'
import SubscribeForm from './subscribe-form'
import InteractionForm from './interaction-form'
import './site-chrome.css'

// 所有公开页面共用的页脚：订阅、留言和站点链接。导航里的“订阅”指向这里的 #subscribe。
export default function SiteFooter(){
  return <footer className="sc-footer">
    <section id="subscribe" className="sc-contact" aria-labelledby="sc-contact-title">
      <div className="sc-contact-intro"><small>KEEP IN TOUCH</small><h2 id="sc-contact-title">偶尔更新，<br/>随时联系。</h2></div>
      <div className="sc-contact-actions">
        <div className="sc-subscribe"><div className="sc-copy"><b>订阅新日志</b><span>只在新内容发布时发送。</span></div><SubscribeForm/></div>
        <details className="sc-message"><summary><span className="sc-copy"><b>给我留言</b><span>问题、线索，或只是打个招呼。</span></span><i aria-hidden="true">＋</i></summary><InteractionForm kind="message"/></details>
      </div>
    </section>
    <div className="sc-footer-bar">
      <span>CHRIS / FIELD NOTES © 2026</span>
      <nav aria-label="页脚导航"><Link href="/logs">日志</Link><Link href="/books">书单</Link><Link href="/trails">轨迹</Link><Link href="/about">关于</Link><Link href="/privacy">隐私政策</Link><a href="#top">返回顶部 ↑</a></nav>
    </div>
  </footer>
}

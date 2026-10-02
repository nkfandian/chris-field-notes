import Link from 'next/link'
import SiteHeader from './components/site-header'
import SiteFooter from './components/site-footer'
import './not-found.css'

export const metadata={title:'页面未找到',robots:{index:false,follow:true}}

export default function NotFound(){
  return <><SiteHeader/><main className="not-found-page" id="content">
    <small>404</small>
    <h1>这一页不在这里。</h1>
    <p>链接可能已经失效，或者内容已被移动。可以从日志、书单或搜索重新找起。</p>
    <nav aria-label="继续浏览"><Link href="/logs">全部日志 →</Link><Link href="/books">书单 →</Link><Link href="/search">搜索 →</Link></nav>
  </main><SiteFooter/></>
}

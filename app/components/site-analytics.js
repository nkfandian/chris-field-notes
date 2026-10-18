'use client'

import {usePathname} from 'next/navigation'
import Script from 'next/script'

// 只保留 Vercel Web Analytics（本站域名下的脚本，国内可访问，无第三方 Cookie）。
// 后台和带令牌的页面不加载任何统计脚本。
export default function SiteAnalytics(){
  const pathname=usePathname()
  const sensitive=pathname.startsWith('/studio')||pathname==='/unsubscribe'||pathname==='/subscribe/confirm'||pathname==='/reset-password'
  if(sensitive)return null
  return <>
    <Script id="vercel-analytics-queue" strategy="afterInteractive">{`window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}`}</Script>
    <Script src="/_vercel/insights/script.js" strategy="afterInteractive"/>
  </>
}

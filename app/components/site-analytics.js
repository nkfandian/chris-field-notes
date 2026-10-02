'use client'

import {useEffect,useRef} from 'react'
import {usePathname} from 'next/navigation'
import Script from 'next/script'

// 后台和带令牌的页面不加载任何第三方脚本（统计、广告）。
export default function SiteAnalytics({gaId,adsenseClient}){
  const pathname=usePathname()
  const firstPage=useRef(true)
  const sensitive=pathname.startsWith('/studio')||pathname==='/unsubscribe'||pathname==='/subscribe/confirm'||pathname==='/reset-password'

  useEffect(()=>{
    if(firstPage.current){firstPage.current=false;return}
    if(sensitive||!gaId||typeof window.gtag!=='function')return
    window.gtag('event','page_view',{page_path:pathname,page_location:`${window.location.origin}${pathname}`,page_title:document.title})
  },[gaId,pathname,sensitive])

  if(sensitive)return null
  return <>
    <Script id="vercel-analytics-queue" strategy="afterInteractive">{`window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}`}</Script>
    <Script src="/_vercel/insights/script.js" strategy="afterInteractive"/>
    {adsenseClient&&<Script src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsenseClient)}`} strategy="afterInteractive" crossOrigin="anonymous"/>}
    {gaId&&<>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive"/>
      <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}',{page_path:location.pathname,page_location:location.origin+location.pathname});`}</Script>
    </>}
  </>
}

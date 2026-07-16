import './globals.css'
import './mobile.css'
import './interaction.css'
import './subscribe.css'
import './brand.css'
import './utilities.css'
import SiteAnalytics from './components/site-analytics'
import StructuredData from './components/structured-data'
import {PUBLISHER_ID,SITE_DESCRIPTION,SITE_KEYWORDS,SITE_LANGUAGE,SITE_LOCALE,SITE_NAME,SITE_URL,WEBSITE_ID,ogImage} from '@/lib/seo'

const verificationOther=Object.fromEntries([
  ['msvalidate.01',process.env.BING_SITE_VERIFICATION],
  ['baidu-site-verification',process.env.BAIDU_SITE_VERIFICATION],
  ['360-site-verification',process.env.SO_SITE_VERIFICATION],
  ['sogou_site_verification',process.env.SOGOU_SITE_VERIFICATION],
  ['naver-site-verification',process.env.NAVER_SITE_VERIFICATION]
].filter(([,value])=>value))

export const metadata={
  metadataBase:new URL(SITE_URL),
  applicationName:SITE_NAME,
  title:{default:SITE_NAME,template:`%s | ${SITE_NAME}`},
  description:SITE_DESCRIPTION,
  keywords:SITE_KEYWORDS,
  authors:[{name:'Chris',url:SITE_URL}],
  creator:'Chris',
  publisher:SITE_NAME,
  category:'个人日志与书评',
  referrer:'strict-origin-when-cross-origin',
  manifest:'/manifest.webmanifest',
  alternates:{types:{'application/rss+xml':'/feed.xml'}},
  icons:{icon:[{url:'/icon.svg',type:'image/svg+xml'},{url:'/field-notes-mark.png',sizes:'512x512',type:'image/png'}],shortcut:'/icon.svg',apple:{url:'/field-notes-mark.png',sizes:'512x512',type:'image/png'}},
  robots:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}},
  verification:{
    google:process.env.GOOGLE_SITE_VERIFICATION,
    yahoo:process.env.YAHOO_SITE_VERIFICATION,
    yandex:process.env.YANDEX_SITE_VERIFICATION,
    other:verificationOther
  },
  openGraph:{siteName:SITE_NAME,title:SITE_NAME,description:SITE_DESCRIPTION,type:'website',locale:SITE_LOCALE,url:'/',images:[{url:ogImage('记录理解发生的过程'),width:1200,height:630,alt:SITE_NAME}]},
  twitter:{card:'summary_large_image',title:SITE_NAME,description:SITE_DESCRIPTION,images:[ogImage('记录理解发生的过程')]},
  appleWebApp:{capable:true,title:'FIELD NOTES',statusBarStyle:'black-translucent'}
}

export const viewport={themeColor:'#efeee8',colorScheme:'light'}

const ADSENSE_CLIENT='ca-pub-5286360916046186'

const siteSchema={'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':PUBLISHER_ID,name:SITE_NAME,url:SITE_URL,logo:{'@type':'ImageObject',url:`${SITE_URL}/field-notes-mark.png`,width:512,height:512},description:SITE_DESCRIPTION},
  {'@type':'Person','@id':`${SITE_URL}/#author`,name:'Chris',url:SITE_URL},
  {'@type':'WebSite','@id':WEBSITE_ID,url:SITE_URL,name:SITE_NAME,alternateName:'FIELD NOTES',description:SITE_DESCRIPTION,inLanguage:SITE_LANGUAGE,publisher:{'@id':PUBLISHER_ID},potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:`${SITE_URL}/search?q={search_term_string}`} ,'query-input':'required name=search_term_string'}}
]}

export default function RootLayout({children}){const gaId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID||'G-GKQVSFLWM4';return <html lang={SITE_LANGUAGE}><head><link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title={SITE_NAME}/><script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`} crossOrigin="anonymous"/></head><body><StructuredData data={siteSchema}/><div className="grain"/>{children}<SiteAnalytics gaId={gaId}/></body></html>}

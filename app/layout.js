import './globals.css'
import './mobile.css'
import './interaction.css'
import './subscribe.css'
import './brand.css'
import './utilities.css'
import { Analytics } from '@vercel/analytics/next'
export const metadata={metadataBase:new URL('https://www.chrisreading.ink'),title:{default:'CHRIS / FIELD NOTES',template:'%s / FIELD NOTES'},description:'一个实用主义智识者的个人操作系统。',alternates:{types:{'application/rss+xml':'/feed.xml'}},icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/field-notes-mark.png'},openGraph:{siteName:'CHRIS / FIELD NOTES',title:'CHRIS / FIELD NOTES',description:'记录理解发生的过程。',type:'website',images:['/api/og?title=记录理解发生的过程']},twitter:{card:'summary_large_image',title:'CHRIS / FIELD NOTES',description:'记录理解发生的过程。',images:['/api/og?title=记录理解发生的过程']}}
export default function RootLayout({children}){return <html lang="zh-CN"><body><div className="grain"/>{children}<Analytics /></body></html>}

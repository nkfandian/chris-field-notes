import './globals.css'
import './mobile.css'
import './interaction.css'
import './subscribe.css'
import './brand.css'
export const metadata={metadataBase:new URL('https://www.chrisreading.ink'),title:'CHRIS / FIELD NOTES',description:'一个实用主义智识者的个人操作系统。',icons:{icon:'/icon.svg',shortcut:'/icon.svg',apple:'/field-notes-mark.png'},openGraph:{title:'CHRIS / FIELD NOTES',description:'记录理解发生的过程。',images:['/field-notes-mark.png']}}
export default function RootLayout({children}){return <html lang="zh-CN"><body><div className="grain"/>{children}</body></html>}

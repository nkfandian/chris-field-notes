// 公开页实际加载的图片主机（2026-11-01 对照线上正文与书单，不在仓库代码里）。
// img.chrisreading.ink 是 R2 公网图；m.media-amazon.com 是书单封面；其余四条各对应一篇旧日志的一张配图。
// 新的外链图不会自动显示。不要改回任意 https:，也不要加回 Google Fonts / Analytics / AdSense。
const imageHosts=[
 'https://img.chrisreading.ink',
 'https://m.media-amazon.com',
 'https://images.squarespace-cdn.com',
 'https://www.macfound.org',
 'https://static.themoscowtimes.com',
 'https://ticket-2-ride.com'
]
const imageSrc=`'self' data: blob: ${imageHosts.join(' ')}`

const csp=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 // Next.js 15 把 RSC flight 写进内联 script，统计队列也是内联脚本。静态头放不了按请求 nonce，见交接文档第 17 节。
 "script-src 'self' 'unsafe-inline'",
 "script-src-attr 'none'",
 "style-src 'self' 'unsafe-inline'",
 "font-src 'self' data:",
 `img-src ${imageSrc}`,
 // 浏览器 Supabase 只用项目主机的 /auth/v1 与 /rest/v1。代码没有 .channel()，不加 *.supabase.co。
 // R2 直传的账户子域由签名接口返回，必须保留通配。统计脚本实际 POST 到同源 /_vercel/insights。
 "connect-src 'self' https://kdmhceaxcyimnaxfoswo.supabase.co https://*.r2.cloudflarestorage.com https://*.vercel-insights.com",
 "frame-src 'none'",
 "worker-src 'self' blob:",
 "manifest-src 'self'",
 `media-src ${imageSrc}`,
 "upgrade-insecure-requests"
].join('; ')

const securityHeaders=[
 {key:'Content-Security-Policy',value:csp},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'X-Permitted-Cross-Domain-Policies',value:'none'},
 {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
 {key:'Origin-Agent-Cluster',value:'?1'},
 {key:'Permissions-Policy',value:'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), usb=(), browsing-topics=()'},
 {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'}
]

const privateHeaders=[{key:'X-Robots-Tag',value:'noindex, nofollow, noarchive, nosnippet'}]
const privateApiRoutes=['/api/campaigns','/api/indexnow','/api/interactions','/api/notifications','/api/posts','/api/studio/:path*','/api/subscribe/:path*','/api/unsubscribe','/api/uploads/:path*','/api/views']

export default {
 poweredByHeader:false,
 // Vercel 自带的 *.vercel.app 地址一律 308 到正式域名，避免被搜索引擎当成重复站点。
 async redirects(){return ['chris-field-notes.vercel.app','chris-field-notes-web.vercel.app'].map(value=>({source:'/:path*',has:[{type:'host',value}],destination:'https://www.chrisreading.ink/:path*',permanent:true}))},
 async rewrites(){return [{source:'/:key([a-fA-F0-9-]{8,128}).txt',destination:'/api/indexnow-key/:key'}]},
 async headers(){return [
  {source:'/:path*',headers:securityHeaders},
  {source:'/studio/:path*',headers:privateHeaders},
  {source:'/reset-password',headers:privateHeaders},
  {source:'/subscribe/confirm',headers:privateHeaders},
  {source:'/unsubscribe',headers:privateHeaders},
  ...privateApiRoutes.map(source=>({source,headers:privateHeaders}))
 ]}
}

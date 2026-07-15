const csp=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
 "script-src-attr 'none'",
 "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
 "font-src 'self' data: https://fonts.gstatic.com",
 "img-src 'self' data: blob: https:",
 "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.vercel-insights.com",
 "frame-src 'none'",
 "worker-src 'self' blob:",
 "manifest-src 'self'",
 "media-src 'self' https:",
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

export default {
 poweredByHeader:false,
 async headers(){return [
  {source:'/:path*',headers:securityHeaders},
  {source:'/studio/:path*',headers:privateHeaders},
  {source:'/reset-password',headers:privateHeaders},
  {source:'/subscribe/confirm',headers:privateHeaders},
  {source:'/unsubscribe',headers:privateHeaders},
  {source:'/api/:path*',headers:privateHeaders}
 ]}
}

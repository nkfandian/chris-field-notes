const csp=[
 "default-src 'self'",
 "base-uri 'self'",
 "object-src 'none'",
 "frame-ancestors 'none'",
 "form-action 'self'",
 "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
 "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
 "font-src 'self' data: https://fonts.gstatic.com",
 "img-src 'self' data: blob: https:",
 "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.vercel-insights.com",
 "upgrade-insecure-requests"
].join('; ')

const securityHeaders=[
 {key:'Content-Security-Policy',value:csp},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
 {key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains; preload'}
]

export default {
 poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:securityHeaders}]}
}

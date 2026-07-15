import {SITE_URL} from '@/lib/seo'

export default function robots(){
  return {
    rules:{
      userAgent:'*',
      allow:['/','/api/og'],
      disallow:['/studio/','/api/','/reset-password','/subscribe/confirm','/unsubscribe']
    },
    sitemap:[`${SITE_URL}/sitemap.xml`,`${SITE_URL}/feed.xml`],
    host:SITE_URL
  }
}

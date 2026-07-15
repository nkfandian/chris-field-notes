export const SITE_URL='https://www.chrisreading.ink'
export const SITE_HOST='www.chrisreading.ink'
export const SITE_NAME='CHRIS / FIELD NOTES'
export const SITE_SHORT_NAME='FIELD NOTES'
export const SITE_DESCRIPTION='关于语言、商业、技术、阅读与身体经验的中文个人日志与书评，记录判断如何形成。'
export const SITE_LANGUAGE='zh-CN'
export const SITE_LOCALE='zh_CN'
export const PUBLISHER_ID=`${SITE_URL}/#publisher`
export const WEBSITE_ID=`${SITE_URL}/#website`

export const SITE_KEYWORDS=['中文博客','个人日志','书评','阅读书单','人工智能','商业观察','技术实践','个人知识管理','阅读轨迹']

export function absoluteUrl(path='/'){
  return new URL(path,SITE_URL).toString()
}

export function ogImage(title){
  return absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`)
}

export function pageMetadata({title,description=SITE_DESCRIPTION,path='/',keywords=[]}){
  const image=ogImage(title)
  return {
    title,
    description,
    keywords:[...SITE_KEYWORDS,...keywords],
    alternates:{canonical:path,languages:{'zh-CN':path,'x-default':path}},
    openGraph:{
      type:'website',
      locale:SITE_LOCALE,
      url:path,
      siteName:SITE_NAME,
      title,
      description,
      images:[{url:image,width:1200,height:630,alt:title}]
    },
    twitter:{card:'summary_large_image',title,description,images:[image]}
  }
}

export function plainText(value=''){
  return String(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/<[^>]+>/g,' ')
    .replace(/[`#>*_~|]/g,' ')
    .replace(/\s+/g,' ')
    .trim()
}

export function jsonLd(value){
  return JSON.stringify(value).replace(/</g,'\\u003c')
}

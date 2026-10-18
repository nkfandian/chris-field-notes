export const SITE_URL='https://www.chrisreading.ink'
export const SITE_HOST='www.chrisreading.ink'
export const SITE_NAME='CHRIS / FIELD NOTES'
export const SITE_SHORT_NAME='FIELD NOTES'
// 以下介绍文字只用于 SEO（meta、结构化数据、RSS、manifest），不要渲染到页面正文里。
export const SITE_DESCRIPTION='Chris 的中文个人网站：中英文书评与读书笔记，东亚教育与社会观察，南开求学往事与家族记忆，以及零基础用 AI 搭建个人网站的实践记录。'
export const HOME_TITLE='CHRIS / FIELD NOTES｜中文书评、教育观察与个人记忆'
export const SITE_LANGUAGE='zh-CN'
export const SITE_LOCALE='zh_CN'
export const PUBLISHER_ID=`${SITE_URL}/#publisher`
export const WEBSITE_ID=`${SITE_URL}/#website`
export const AUTHOR_URL=`${SITE_URL}/about`
export const AUTHOR_ID=`${AUTHOR_URL}#chris`
export const RSS_ALTERNATES={'application/rss+xml':'/feed.xml'}

export const SITE_KEYWORDS=['中文书评','读书笔记','英文书单','中国非虚构','何伟','教育观察','高考','南开大学','个人记忆','AI 建站','个人网站']

export function absoluteUrl(path='/'){
  return new URL(path,SITE_URL).toString()
}

export function ogImage(title){
  return absoluteUrl(`/api/og?title=${encodeURIComponent(title)}`)
}

export function pageMetadata({title,description=SITE_DESCRIPTION,path='/',keywords=[]}){
  const summary=seoDescription(description)
  const image=ogImage(title)
  return {
    title,
    description:summary,
    keywords:[...SITE_KEYWORDS,...keywords],
    alternates:{canonical:path,languages:{'zh-CN':path,'x-default':path},types:RSS_ALTERNATES},
    openGraph:{
      type:'website',
      locale:SITE_LOCALE,
      url:path,
      siteName:SITE_NAME,
      title,
      description:summary,
      images:[{url:image,width:1200,height:630,alt:title}]
    },
    twitter:{card:'summary_large_image',title,description:summary,images:[image]}
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

export function seoDescription(value='',fallback=SITE_DESCRIPTION,limit=180){
  const text=plainText(value)||plainText(fallback)
  if(text.length<=limit)return text
  const clipped=text.slice(0,limit-1).replace(/[，、；：,.!?！？\s]+$/u,'')
  return `${clipped}…`
}

export function firstPostImage(value=''){
  const source=String(value||'')
  const match=source.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)|<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>|(https?:\/\/[^\s]+\.(?:jpe?g|png|gif|webp|avif)(?:\?[^\s]*)?)/i)
  return match?.[1]||match?.[2]||match?.[3]||''
}

export function jsonLd(value){
  return JSON.stringify(value).replace(/</g,'\\u003c')
}

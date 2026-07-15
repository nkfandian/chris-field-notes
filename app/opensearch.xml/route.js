import {SITE_DESCRIPTION,SITE_NAME,SITE_URL} from '@/lib/seo'

const esc=value=>String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]))

export function GET(){
  const xml=`<?xml version="1.0" encoding="UTF-8"?><OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/"><ShortName>${esc(SITE_NAME)}</ShortName><Description>${esc(SITE_DESCRIPTION)}</Description><InputEncoding>UTF-8</InputEncoding><Image height="32" width="32" type="image/png">${SITE_URL}/field-notes-mark.png</Image><Url type="text/html" template="${SITE_URL}/search?q={searchTerms}"/></OpenSearchDescription>`
  return new Response(xml,{headers:{'Content-Type':'application/opensearchdescription+xml; charset=utf-8','Cache-Control':'public, max-age=86400, s-maxage=604800'}})
}

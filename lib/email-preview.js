const entities={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>entities[char])

export function emailPreview(value,fallback='新内容已经发布，点击阅读完整内容。'){
  const text=String(value||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
    .replace(/<[^>]+>/g,' ')
    .replace(/https?:\/\/\S+/g,' ')
    .replace(/[#>*_`~|]+/g,' ')
    .replace(/\s+/g,' ')
    .trim()
  return Array.from(text||fallback).slice(0,160).join('')
}

export function preheaderHtml(value){
  const padding='&zwnj;&nbsp;'.repeat(40)
  return `<div style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;color:transparent">${escapeHtml(value)}${padding}</div>`
}

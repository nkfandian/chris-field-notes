import {preheaderHtml} from '@/lib/email-preview'
import {imageCaption, parsePostBlocks} from '@/lib/post-format'

// 订阅邮件与网站手机端日志页保持一致：纸靛蓝色板、栏目 → 标题 → 署名 → 分隔线 → 正文，不显示摘要。
// 邮件客户端只认内联样式，所以这里集中维护所有颜色和字号。
export const SITE_URL = 'https://www.chrisreading.ink'
const C = {
  paper: '#f4f0e7',
  deep: '#e9e1d4',
  ink: '#27231e',
  muted: '#71695f',
  accent: '#3f718c',
  line: '#d2c8b8',
}
const SERIF = "'Noto Serif SC','Songti SC','STSong','Source Han Serif SC',Georgia,serif"
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace"
const BODY = `font-family:${SERIF};font-size:16px;line-height:1.9;color:${C.ink}`

export function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'}[char]))
}

function inlineHtml(runs = [], options = {}) {
  return runs.map(run => {
    let content = esc(run.text).replace(/\n/g, '<br>')
    if (run.code) content = `<code style="padding:1px 5px;background:${C.deep};font-family:${MONO};font-size:14px">${content}</code>`
    if (run.bold || options.bold) content = `<strong style="font-weight:700">${content}</strong>`
    if (run.italic) content = `<em>${content}</em>`
    if (run.strike) content = `<span style="text-decoration:line-through;color:${C.muted}">${content}</span>`
    if (run.href) content = `<a href="${esc(run.href)}" style="color:${C.accent};text-decoration:underline">${content}</a>`
    return content
  }).join('')
}

export function postBodyHtml(body = '') {
  return parsePostBlocks(body).map(block => {
    const align = block.align === 'center' ? 'text-align:center;' : ''
    const weight = block.blockBold ? 'font-weight:700;' : ''
    if (block.type === 'image') {
      if (!block.src) return ''
      const caption = imageCaption(block.alt)
      return `<div style="margin:28px 0"><img src="${esc(block.src)}" alt="${esc(caption || block.alt)}" width="556" style="display:block;width:100%;max-width:100%;height:auto;border:1px solid ${C.line};background:${C.deep}">${caption ? `<div style="margin-top:8px;text-align:center;font-family:${MONO};font-size:12px;line-height:1.6;color:${C.muted}">${esc(caption)}</div>` : ''}</div>`
    }
    if (block.type === 'hr') return `<div style="margin:28px 0;border-top:1px solid ${C.line};height:0;line-height:0;font-size:0">&nbsp;</div>`
    if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
      const size = block.type === 'h1' ? 22 : block.type === 'h2' ? 20 : 18
      const tag = `h${block.type.slice(1)}`
      return `<${tag} style="margin:32px 0 14px;${align}font-family:${SERIF};font-size:${size}px;line-height:1.5;font-weight:700;color:${C.ink}">${inlineHtml(block.runs)}</${tag}>`
    }
    if (block.type === 'ul' || block.type === 'ol') {
      return `<${block.type} style="margin:0 0 24px;padding-left:22px;${BODY}">${block.items.map(item => `<li style="margin:0 0 6px;${weight}">${inlineHtml(item, {bold: block.blockBold})}</li>`).join('')}</${block.type}>`
    }
    if (block.type === 'quote') {
      return `<div style="margin:24px 0;padding:14px 18px;border-left:3px solid ${C.accent};background:${C.deep};${align}font-family:${SERIF};font-size:16px;line-height:1.85;color:${C.muted}">${inlineHtml(block.runs, {bold: block.blockBold})}</div>`
    }
    return `<p style="margin:0 0 24px;${align}${weight}${BODY}">${inlineHtml(block.runs, {bold: block.blockBold})}</p>`
  }).join('')
}

// 文章抬头：栏目 → 标题 → 署名与日期 → 分隔线（与网站手机端日志页同序，不含摘要）。
export function articleHeader({category = '', categoryUrl = '', title = '', date = ''}) {
  const kicker = category ? `<div style="font-family:${MONO};font-size:12px;letter-spacing:.12em;line-height:1.6">${categoryUrl ? `<a href="${esc(categoryUrl)}" style="color:${C.accent};text-decoration:none">${esc(category)}</a>` : `<span style="color:${C.accent}">${esc(category)}</span>`}</div>` : ''
  return `${kicker}<h1 style="margin:12px 0 14px;font-family:${SERIF};font-size:26px;line-height:1.4;font-weight:700;color:${C.ink}">${esc(title)}</h1><div style="font-family:${MONO};font-size:12px;line-height:1.6;color:${C.muted}">Chris${date ? ` &nbsp;·&nbsp; ${esc(date)}` : ''}</div><div style="margin:24px 0 28px;border-top:1px solid ${C.line};height:0;line-height:0;font-size:0">&nbsp;</div>`
}

export function ctaButton(href, label) {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0"><tr><td style="background:${C.ink}"><a href="${esc(href)}" style="display:inline-block;padding:12px 18px;font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.paper};text-decoration:none">${esc(label)}</a></td></tr></table>`
}

export function emailShell({preheader = '', inner = '', unsubscribeUrl = ''}) {
  const logo = `${SITE_URL}/field-notes-mark.png`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:${C.paper};color:${C.ink}">${preheaderHtml(preheader)}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper}"><tr><td align="center"><div style="max-width:600px;margin:0 auto;padding:28px 22px 36px;text-align:left"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid ${C.line}"><tr><td style="padding:0 0 14px"><a href="${SITE_URL}" style="text-decoration:none;color:${C.ink}"><img src="${logo}" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:6px"><span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${MONO};font-size:13px;letter-spacing:.14em;color:${C.ink}">FIELD NOTES</span></a></td></tr></table><div style="padding-top:32px">${inner}</div><div style="margin-top:40px;padding-top:16px;border-top:1px solid ${C.line};font-family:${SERIF};font-size:13px;line-height:1.8;color:${C.muted}">你收到这封邮件，是因为订阅了 CHRIS / FIELD NOTES。${unsubscribeUrl ? `<br><a href="${esc(unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline">管理或取消订阅</a>` : ''}</div></div></td></tr></table></body></html>`
}

export function unsubscribeLink(token = '') {
  return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token || '')}`
}

export function plainBody(value = '') {
  return parsePostBlocks(value).map(block => {
    if (block.type === 'image' || block.type === 'hr') return ''
    if (block.items) return block.items.map(item => `- ${item.map(run => run.text).join('')}`).join('\n')
    return (block.runs || []).map(run => run.text).join('')
  }).filter(Boolean).join('\n\n')
}

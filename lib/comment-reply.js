import {esc,SITE_URL} from '@/lib/email-template'

// 站长回复的邮件提醒：与订阅推送共用纸靛蓝配色，但页脚不写订阅文案，
// 因为收件人是留了言的访客，不一定是订阅者。
const C={paper:'#f4f0e7',deep:'#e9e1d4',ink:'#27231e',muted:'#71695f',accent:'#3f718c',line:'#d2c8b8'}
const SERIF="'Noto Serif SC','Songti SC','STSong','Source Han Serif SC',Georgia,serif"
const MONO="'IBM Plex Mono',Menlo,Consolas,monospace"

export function buildReplyEmail({name,postTitle,postSlug,original,reply}){
 const isComment=Boolean(postSlug)
 const url=isComment?`${SITE_URL}/logs/${encodeURIComponent(postSlug)}#comments`:SITE_URL
 const kicker=isComment?'评论回复':'留言回复'
 const ctaLabel=isComment?'在网站查看回复 →':'访问 CHRIS / FIELD NOTES →'
 const footerCopy=isComment?'你收到这封邮件，是因为你在 chrisreading.ink 留下了评论并留下了邮箱。':'你收到这封邮件，是因为你在 chrisreading.ink 给站长留了言并留下了邮箱。'
 const subject=postTitle?`Chris 回复了你在《${postTitle}》的评论`:'Chris 回复了你的留言'
 const quote=String(original||'').slice(0,300)
 const text=[
  `你好 ${name}，`,
  '',
  postTitle?`Chris 回复了你在《${postTitle}》下的评论：`:'Chris 回复了你的留言：',
  '',
  `「${quote}」`,
  '',
  'Chris 的回复：',
  '',
  reply,
  '',
  isComment?`在网站查看：${url}`:`访问网站：${url}`,
  '',
  '— CHRIS / FIELD NOTES',
 ].join('\n')
 const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head><body style="margin:0;padding:0;background:${C.paper};color:${C.ink}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper}"><tr><td align="center"><div style="max-width:600px;margin:0 auto;padding:28px 22px 36px;text-align:left"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-bottom:1px solid ${C.line}"><tr><td style="padding:0 0 14px"><a href="${SITE_URL}" style="text-decoration:none;color:${C.ink}"><img src="${SITE_URL}/field-notes-mark.png" width="30" height="30" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:6px"><span style="display:inline-block;vertical-align:middle;margin-left:10px;font-family:${MONO};font-size:13px;letter-spacing:.14em;color:${C.ink}">FIELD NOTES</span></a></td></tr></table><div style="padding-top:32px"><div style="font-family:${MONO};font-size:12px;letter-spacing:.12em;line-height:1.6;color:${C.accent}">${kicker}</div><h1 style="margin:12px 0 14px;font-family:${SERIF};font-size:24px;line-height:1.4;font-weight:700;color:${C.ink}">${esc(subject)}</h1><div style="margin:24px 0 28px;border-top:1px solid ${C.line};height:0;line-height:0;font-size:0">&nbsp;</div><div style="margin:0 0 24px;padding:14px 18px;border-left:3px solid ${C.accent};background:${C.deep};font-family:${SERIF};font-size:15px;line-height:1.85;color:${C.muted}">${esc(quote).replace(/\n/g,'<br>')}</div><p style="margin:0 0 8px;font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${C.muted}">CHRIS 的回复</p><p style="margin:0 0 24px;font-family:${SERIF};font-size:16px;line-height:1.9;color:${C.ink}">${esc(reply).replace(/\n/g,'<br>')}</p><table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0"><tr><td style="background:${C.ink}"><a href="${esc(url)}" style="display:inline-block;padding:12px 18px;font-family:${MONO};font-size:13px;letter-spacing:.04em;color:${C.paper};text-decoration:none">${esc(ctaLabel)}</a></td></tr></table></div><div style="margin-top:40px;padding-top:16px;border-top:1px solid ${C.line};font-family:${SERIF};font-size:13px;line-height:1.8;color:${C.muted}">${footerCopy}</div></div></td></tr></table></body></html>`
 return {subject,text,html}
}

'use client'

import {useEffect, useRef, useState} from 'react'
import {labels} from '@/lib/demo'
import './post-image-exporter.css'

const PAPER = '#efeee8'
const INK = '#151713'
const MUTED = '#696d65'
const MOSS = '#526b3f'
const MONO = "'IBM Plex Mono', monospace"
const SERIF = "Georgia, 'Noto Serif SC', serif"
const SITE = 'www.chrisreading.ink'
const IMAGE_WIDTH = 1080
const SIDE = 72
const CONTENT_WIDTH = IMAGE_WIDTH - SIDE * 2
const MAX_BODY_LENGTH = 18000
const MAX_IMAGE_HEIGHT = 24000

function cleanParagraphs(value = '') {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_>#]/g, '')
    .split(/\n{2,}|\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function wrapText(ctx, text, maxWidth) {
  const tokens = String(text || '').trim().match(/[\u4e00-\u9fff]|[^\s\u4e00-\u9fff]+|\s+/g) || []
  const lines = []
  let current = ''
  for (const token of tokens) {
    const pieces = ctx.measureText(token).width > maxWidth ? Array.from(token) : [token]
    for (const piece of pieces) {
      const candidate = `${current}${piece}`
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current.trimEnd())
        current = piece.trimStart()
      } else current = candidate
    }
  }
  if (current.trim()) lines.push(current.trimEnd())
  return lines.length ? lines : ['']
}

function drawLines(ctx, lines, x, y, lineHeight, color = INK) {
  ctx.fillStyle = color
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + lines.length * lineHeight
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function drawMark(ctx, logo, x, y) {
  const size = 96
  if (logo) {
    ctx.save()
    roundedRect(ctx, x, y, size, size, 15)
    ctx.clip()
    ctx.drawImage(logo, x, y, size, size)
    ctx.restore()
    return
  }
  ctx.fillStyle = INK
  roundedRect(ctx, x, y, size, size, 15)
  ctx.fill()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(x + 48, y + 48, 28, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = MOSS
  ctx.lineWidth = 8
  ctx.beginPath()
  ctx.moveTo(x + 31, y + 69)
  ctx.lineTo(x + 68, y + 27)
  ctx.stroke()
}

function drawFooter(ctx, y) {
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIDE, y)
  ctx.lineTo(IMAGE_WIDTH - SIDE, y)
  ctx.stroke()
  ctx.font = `500 22px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.fillText('CHRIS / FIELD NOTES  ·  OPEN INDEX', SIDE, y + 48)
  ctx.textAlign = 'right'
  ctx.fillText(SITE, IMAGE_WIDTH - SIDE, y + 48)
  ctx.textAlign = 'left'
}

function drawCta(ctx, y) {
  ctx.fillStyle = INK
  ctx.fillRect(SIDE, y, 430, 94)
  ctx.font = `500 25px ${MONO}`
  ctx.fillStyle = PAPER
  ctx.fillText('在网站阅读与评论  →', SIDE + 34, y + 59)
}

function articleInfo(post) {
  return {
    title: post.title?.trim() || '未命名日志',
    excerpt: post.excerpt?.trim() || '在此补充这篇日志的摘要。',
    domain: labels[post.domain] || post.domain || 'FIELD NOTES',
    date: post.published_at ? String(post.published_at).replaceAll('-', '.') : 'DRAFT',
    slug: post.slug?.trim() || 'draft',
  }
}

function drawCanvas(ctx, post, mode, logo) {
  const info = articleInfo(post)
  const paragraphs = cleanParagraphs(post.body || post.excerpt || '')
  const titleFont = 94
  const titleLine = 116
  const summaryFont = 52
  const summaryLine = 86
  const bodyFont = 50
  const bodyLine = 90
  const paragraphGap = 34
  ctx.font = `700 ${titleFont}px ${SERIF}`
  const titleLines = wrapText(ctx, info.title, CONTENT_WIDTH)
  ctx.font = `400 ${summaryFont}px ${SERIF}`
  const excerptLines = wrapText(ctx, info.excerpt, CONTENT_WIDTH)
  let fullLines = []
  let truncated = false
  if (mode === 'full') {
    const completeBody = paragraphs.join('\n\n')
    const clipped = completeBody.slice(0, MAX_BODY_LENGTH)
    truncated = completeBody.length > clipped.length
    ctx.font = `400 ${bodyFont}px ${SERIF}`
    fullLines = cleanParagraphs(clipped).flatMap((paragraph) => [...wrapText(ctx, paragraph, CONTENT_WIDTH), ''])
    if (fullLines.at(-1) === '') fullLines.pop()
  }

  const titleY = 414
  const excerptY = titleY + titleLines.length * titleLine + 38
  const dividerY = excerptY + excerptLines.length * summaryLine + 66
  let visibleLines = fullLines
  let bodyHeight = 0
  if (mode === 'full') {
    const bodyY = dividerY + 76
    const availableHeight = MAX_IMAGE_HEIGHT - bodyY - 460
    visibleLines = []
    for (const line of fullLines) {
      const step = line ? bodyLine : paragraphGap
      if (bodyHeight + step > availableHeight) {
        truncated = true
        break
      }
      visibleLines.push(line)
      bodyHeight += step
    }
    while (visibleLines.at(-1) === '') {
      visibleLines.pop()
      bodyHeight -= paragraphGap
    }
  }

  const bodyY = dividerY + 76
  const truncationHeight = truncated ? 76 : 0
  const ctaY = mode === 'full' ? bodyY + bodyHeight + truncationHeight + 62 : dividerY + 68
  const footerY = ctaY + 94 + 128
  const height = footerY + 94
  ctx.canvas.width = IMAGE_WIDTH
  ctx.canvas.height = height
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, IMAGE_WIDTH, height)
  drawMark(ctx, logo, SIDE, 66)
  ctx.font = `700 33px ${MONO}`
  ctx.fillStyle = INK
  ctx.fillText('FIELD NOTES', 194, 108)
  ctx.font = `400 21px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.fillText('CHRIS / OPEN INDEX', 194, 146)
  ctx.textAlign = 'right'
  ctx.font = `500 24px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText('NEW ENTRY', IMAGE_WIDTH - SIDE, 121)
  ctx.textAlign = 'left'
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIDE, 204)
  ctx.lineTo(IMAGE_WIDTH - SIDE, 204)
  ctx.stroke()
  ctx.font = `500 24px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText(`${String(info.domain).toUpperCase()} / 最新日志`, SIDE, 300)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.fillText(info.date, IMAGE_WIDTH - SIDE, 300)
  ctx.textAlign = 'left'
  ctx.font = `700 ${titleFont}px ${SERIF}`
  drawLines(ctx, titleLines, SIDE, titleY, titleLine)
  ctx.font = `400 ${summaryFont}px ${SERIF}`
  drawLines(ctx, excerptLines, SIDE, excerptY, summaryLine, MUTED)
  ctx.strokeStyle = '#b9b9b2'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIDE, dividerY)
  ctx.lineTo(IMAGE_WIDTH - SIDE, dividerY)
  ctx.stroke()

  if (mode === 'full') {
    let y = bodyY
    ctx.font = `400 ${bodyFont}px ${SERIF}`
    visibleLines.forEach((line) => {
      if (!line) {
        y += paragraphGap
        return
      }
      ctx.fillStyle = INK
      ctx.fillText(line, SIDE, y)
      y += bodyLine
    })
    if (truncated) {
      ctx.font = `400 24px ${MONO}`
      ctx.fillStyle = MUTED
      ctx.fillText('文章较长，本图保留可读范围内的正文；完整内容请前往网站阅读。', SIDE, y + 48)
    }
  }
  drawCta(ctx, ctaY)
  drawFooter(ctx, footerY)
}

function filePart(value) {
  return String(value || 'field-notes').trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-').replace(/^-+|-+$/g, '') || 'field-notes'
}

export default function PostImageExporter({post}) {
  const canvasRef = useRef(null)
  const logoRef = useRef(null)
  const [mode, setMode] = useState('summary')
  const [ready, setReady] = useState(false)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let cancelled = false
    const logo = new Image()
    logo.src = '/field-notes-mark.png'
    logo.onload = () => { if (!cancelled) { logoRef.current = logo; setReady(true) } }
    logo.onerror = () => !cancelled && setReady(true)
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    let cancelled = false
    async function render() {
      if (document.fonts?.ready) await document.fonts.ready
      if (cancelled || !canvasRef.current) return
      drawCanvas(canvasRef.current.getContext('2d'), post, mode, logoRef.current)
    }
    render()
    return () => { cancelled = true }
  }, [post, mode, ready])
  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    setNotice('正在生成 PNG…')
    canvas.toBlob((blob) => {
      if (!blob) { setNotice('生成失败，请重试。'); return }
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `${filePart(post.slug || post.title)}-${mode === 'summary' ? 'summary' : 'full'}.png`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('PNG 已下载到本机。')
    }, 'image/png')
  }
  return <section className="post-image-export" aria-labelledby="post-image-export-title">
    <div className="post-image-export-head">
      <div>
        <p className="editor-top">PUBLISHING ASSET / 日志图片</p>
        <h2 id="post-image-export-title">导出文章信笺</h2>
        <p>沿用订阅邮件的抬头、摘要与站点信息；在本机浏览器生成，不上传草稿。</p>
      </div>
      <div className="post-image-export-actions" role="group" aria-label="导出图片类型">
        <button type="button" className={mode === 'summary' ? 'active' : ''} onClick={() => setMode('summary')}>摘要图</button>
        <button type="button" className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')}>手机长图</button>
        <button type="button" className="download-image" onClick={download}>下载 PNG ↓</button>
      </div>
    </div>
    <div className="post-image-export-preview"><canvas ref={canvasRef} aria-label="文章图片预览" /></div>
    <p className="post-image-export-note">{notice || (mode === 'summary' ? '适合社交平台与文章转发。' : '按手机阅读比例排版；超长文章会在安全画布高度内完整保留尽可能多的正文。')}</p>
  </section>
}

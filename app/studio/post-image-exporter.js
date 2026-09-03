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
const IMAGE_WIDTH = 1440
const MAX_BODY_LENGTH = 18000

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
  if (logo) {
    ctx.save()
    roundedRect(ctx, x, y, 56, 56, 10)
    ctx.clip()
    ctx.drawImage(logo, x, y, 56, 56)
    ctx.restore()
    return
  }
  ctx.fillStyle = INK
  roundedRect(ctx, x, y, 56, 56, 10)
  ctx.fill()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(x + 28, y + 28, 16, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = MOSS
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(x + 18, y + 40)
  ctx.lineTo(x + 39, y + 16)
  ctx.stroke()
}

function drawFooter(ctx, y, slug) {
  ctx.strokeStyle = INK
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(80, y)
  ctx.lineTo(IMAGE_WIDTH - 80, y)
  ctx.stroke()
  ctx.font = `500 15px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.fillText('CHRIS / FIELD NOTES  ·  OPEN INDEX', 80, y + 38)
  ctx.textAlign = 'right'
  ctx.fillText(`${SITE}/logs/${slug || 'draft'}`, IMAGE_WIDTH - 80, y + 38)
  ctx.textAlign = 'left'
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
  const titleMax = IMAGE_WIDTH - 160
  const paragraphs = cleanParagraphs(post.body || post.excerpt || '')
  const titleFont = mode === 'full' ? 64 : 78
  const titleLine = mode === 'full' ? 88 : 104
  const summaryLine = 42
  ctx.font = `700 ${titleFont}px ${SERIF}`
  const titleLines = wrapText(ctx, info.title, titleMax)
  ctx.font = `400 29px ${SERIF}`
  const excerptLines = wrapText(ctx, info.excerpt, titleMax)
  let fullLines = []
  if (mode === 'full') {
    const clipped = paragraphs.join('\n\n').slice(0, MAX_BODY_LENGTH)
    ctx.font = `400 28px ${SERIF}`
    fullLines = cleanParagraphs(clipped).flatMap((paragraph) => [...wrapText(ctx, paragraph, titleMax), ''])
  }
  const estimatedHeight = mode === 'full'
    ? 350 + titleLines.length * titleLine + excerptLines.length * summaryLine + fullLines.length * 47 + 230
    : 650 + titleLines.length * titleLine + excerptLines.length * summaryLine
  const height = Math.max(mode === 'full' ? 1300 : 1120, Math.min(26000, Math.ceil(estimatedHeight)))
  ctx.canvas.width = IMAGE_WIDTH
  ctx.canvas.height = height
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, IMAGE_WIDTH, height)
  drawMark(ctx, logo, 80, 62)
  ctx.font = `700 20px ${MONO}`
  ctx.fillStyle = INK
  ctx.fillText('FIELD NOTES', 156, 86)
  ctx.font = `400 13px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.fillText('CHRIS / OPEN INDEX', 156, 110)
  ctx.textAlign = 'right'
  ctx.font = `500 14px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText('NEW ENTRY', IMAGE_WIDTH - 80, 93)
  ctx.textAlign = 'left'
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(80, 146)
  ctx.lineTo(IMAGE_WIDTH - 80, 146)
  ctx.stroke()
  let y = 226
  ctx.font = `500 16px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText(`${String(info.domain).toUpperCase()} / 最新日志`, 80, y)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  ctx.fillText(info.date, IMAGE_WIDTH - 80, y)
  ctx.textAlign = 'left'
  y += 76
  ctx.font = `700 ${titleFont}px ${SERIF}`
  y = drawLines(ctx, titleLines, 80, y, titleLine)
  y += 38
  ctx.font = `400 29px ${SERIF}`
  y = drawLines(ctx, excerptLines, 80, y, summaryLine, MUTED)
  if (mode === 'summary') {
    y += 88
    ctx.strokeStyle = '#b9b9b2'
    ctx.beginPath()
    ctx.moveTo(80, y)
    ctx.lineTo(IMAGE_WIDTH - 80, y)
    ctx.stroke()
    y += 60
    ctx.fillStyle = INK
    ctx.fillRect(80, y, 264, 64)
    ctx.font = `500 15px ${MONO}`
    ctx.fillStyle = PAPER
    ctx.fillText('在网站阅读与评论  →', 104, y + 40)
    drawFooter(ctx, height - 104, info.slug)
    return
  }
  y += 84
  ctx.strokeStyle = '#b9b9b2'
  ctx.beginPath()
  ctx.moveTo(80, y)
  ctx.lineTo(IMAGE_WIDTH - 80, y)
  ctx.stroke()
  y += 70
  ctx.font = `400 28px ${SERIF}`
  fullLines.forEach((line) => {
    if (!line) {
      y += 26
      return
    }
    ctx.fillStyle = INK
    ctx.fillText(line, 80, y)
    y += 47
  })
  if ((post.body || '').length > MAX_BODY_LENGTH) {
    y += 20
    ctx.font = `400 15px ${MONO}`
    ctx.fillStyle = MUTED
    ctx.fillText('文章较长，图片仅导出前 18,000 个字符。', 80, y)
  }
  drawFooter(ctx, Math.min(Math.max(y + 92, 0), height - 104), info.slug)
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
        <button type="button" className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')}>全文长图</button>
        <button type="button" className="download-image" onClick={download}>下载 PNG ↓</button>
      </div>
    </div>
    <div className="post-image-export-preview"><canvas ref={canvasRef} aria-label="文章图片预览" /></div>
    <p className="post-image-export-note">{notice || (mode === 'summary' ? '适合社交平台与文章转发。' : '适合保存、长图分享；过长文章会保留开头正文。')}</p>
  </section>
}

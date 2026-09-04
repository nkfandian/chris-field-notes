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
const MAX_PAGE_BODY_CHARS = 2800

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

function splitBodyPages(value = '') {
  const paragraphs = cleanParagraphs(value)
  const pieces = []
  for (const paragraph of paragraphs) {
    const chars = Array.from(paragraph)
    if (chars.length <= MAX_PAGE_BODY_CHARS) {
      pieces.push(paragraph)
      continue
    }
    for (let index = 0; index < chars.length; index += MAX_PAGE_BODY_CHARS) {
      pieces.push(chars.slice(index, index + MAX_PAGE_BODY_CHARS).join(''))
    }
  }
  const pages = []
  let current = []
  let length = 0
  for (const paragraph of pieces) {
    const addition = paragraph.length + (current.length ? 2 : 0)
    if (current.length && length + addition > MAX_PAGE_BODY_CHARS) {
      pages.push(current.join('\n\n'))
      current = []
      length = 0
    }
    current.push(paragraph)
    length += paragraph.length + (current.length > 1 ? 2 : 0)
  }
  if (current.length) pages.push(current.join('\n\n'))
  return pages.length ? pages : ['']
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 生成失败')), 'image/png')
  })
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipImages(files) {
  const encoder = new TextEncoder()
  const locals = []
  const centrals = []
  let offset = 0
  let centralSize = 0
  for (const file of files) {
    const name = encoder.encode(file.name)
    const checksum = crc32(file.bytes)
    const local = new Uint8Array(30 + name.length + file.bytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, file.bytes.length, true)
    localView.setUint32(22, file.bytes.length, true)
    localView.setUint16(26, name.length, true)
    local.set(name, 30)
    local.set(file.bytes, 30 + name.length)
    locals.push(local)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, file.bytes.length, true)
    centralView.setUint32(24, file.bytes.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centrals.push(central)
    offset += local.length
    centralSize += central.length
  }
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  return new Blob([...locals, ...centrals, end], {type: 'application/zip'})
}

function drawCanvas(ctx, post, mode, logo, {pageNumber = 1, pageCount = 1} = {}) {
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
  if (mode === 'full') {
    ctx.font = `400 ${bodyFont}px ${SERIF}`
    fullLines = paragraphs.flatMap((paragraph) => [...wrapText(ctx, paragraph, CONTENT_WIDTH), ''])
    if (fullLines.at(-1) === '') fullLines.pop()
  }

  const titleY = 414
  const excerptY = titleY + titleLines.length * titleLine + 38
  const dividerY = excerptY + excerptLines.length * summaryLine + 66
  const bodyHeight = mode === 'full'
    ? fullLines.reduce((height, line) => height + (line ? bodyLine : paragraphGap), 0)
    : 0

  const bodyY = dividerY + 76
  const ctaY = mode === 'full' ? bodyY + bodyHeight + 62 : dividerY + 68
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
  ctx.fillText(pageCount > 1 ? `PAGE ${String(pageNumber).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}` : 'NEW ENTRY', IMAGE_WIDTH - SIDE, 121)
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
    fullLines.forEach((line) => {
      if (!line) {
        y += paragraphGap
        return
      }
      ctx.fillStyle = INK
      ctx.fillText(line, SIDE, y)
      y += bodyLine
    })
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
  const [busy, setBusy] = useState('')
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
      const pages = splitBodyPages(post.body || post.excerpt || '')
      const previewPost = mode === 'full' ? {...post, body: pages[0]} : post
      drawCanvas(canvasRef.current.getContext('2d'), previewPost, mode, logoRef.current, {pageNumber: 1, pageCount: pages.length})
    }
    render()
    return () => { cancelled = true }
  }, [post, mode, ready])
  async function download(targetMode) {
    if (busy) return
    setBusy(targetMode)
    const base = filePart(post.slug || post.title)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      const pageBodies = targetMode === 'full' ? splitBodyPages(post.body || post.excerpt || '') : ['']
      setNotice(targetMode === 'full' ? `正在生成全文图片（共 ${pageBodies.length} 张）…` : '正在生成摘要图…')
      const images = []
      for (let index = 0; index < pageBodies.length; index += 1) {
        const canvas = document.createElement('canvas')
        const pagePost = targetMode === 'full' ? {...post, body: pageBodies[index]} : post
        drawCanvas(canvas.getContext('2d'), pagePost, targetMode, logoRef.current, {pageNumber: index + 1, pageCount: pageBodies.length})
        const blob = await canvasBlob(canvas)
        images.push({
          name: `${base}-full-${String(index + 1).padStart(2, '0')}.png`,
          blob,
        })
        canvas.width = 1
        canvas.height = 1
      }
      if (targetMode === 'summary') {
        downloadBlob(images[0].blob, `${base}-summary.png`)
        setNotice('摘要图已下载到本机。')
      } else if (images.length === 1) {
        downloadBlob(images[0].blob, `${base}-full.png`)
        setNotice('整篇文章图片已下载到本机。')
      } else {
        const files = await Promise.all(images.map(async (image) => ({name: image.name, bytes: new Uint8Array(await image.blob.arrayBuffer())})))
        downloadBlob(zipImages(files), `${base}-full-${images.length}-pages.zip`)
        setNotice(`全文已生成 ${images.length} 张连续图片，并打包为 ZIP 下载。`)
      }
    } catch (error) {
      setNotice(error?.message || '生成失败，请重试。')
    } finally {
      setBusy('')
    }
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
        <button type="button" className="download-image secondary" disabled={Boolean(busy)} onClick={() => download('summary')}>{busy === 'summary' ? '生成中…' : '下载摘要图 ↓'}</button>
        <button type="button" className="download-image" disabled={Boolean(busy)} onClick={() => download('full')}>{busy === 'full' ? '生成全文中…' : '下载整篇文章 ↓'}</button>
      </div>
    </div>
    <div className="post-image-export-preview"><canvas ref={canvasRef} aria-label="文章图片预览" /></div>
    <p className="post-image-export-note" aria-live="polite">{notice || (mode === 'summary' ? '适合社交平台与文章转发。' : `当前显示手机长图第 1 页预览；下载时会完整导出，过长文章自动分页并打包。`)}</p>
  </section>
}

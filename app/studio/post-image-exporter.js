'use client'

import {useEffect, useRef, useState} from 'react'
import {labels} from '@/lib/demo'
import {parsePostBlocks} from '@/lib/post-format'
import qrcode from 'qrcode-generator'
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
const MAX_PAGE_BODY_CHARS = 2500
const SLOGAN_LEAD = '面对复杂，'
const SLOGAN_EMPHASIS = '保持欢喜'
const NO_LINE_START = '，。！？；：、）》】」』”’…'
const NO_LINE_END = '（《【「『“‘'

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
  for (let index = 1; index < lines.length; index += 1) {
    while (lines[index] && NO_LINE_START.includes(lines[index][0])) {
      lines[index - 1] += lines[index][0]
      lines[index] = lines[index].slice(1).trimStart()
    }
    while (lines[index - 1] && NO_LINE_END.includes(lines[index - 1].at(-1))) {
      const mark = lines[index - 1].at(-1)
      lines[index - 1] = lines[index - 1].slice(0, -1).trimEnd()
      lines[index] = `${mark}${lines[index]}`
    }
  }
  return lines.filter(Boolean).length ? lines.filter(Boolean) : ['']
}

function balanceLastLine(ctx, input, maxWidth) {
  const lines = [...input]
  if (lines.length < 2) return lines
  const lastIndex = lines.length - 1
  while (ctx.measureText(lines[lastIndex]).width < ctx.measureText(lines[lastIndex - 1]).width * 0.58) {
    const tokens = lines[lastIndex - 1].match(/[\u4e00-\u9fff]|[^\s\u4e00-\u9fff]+/g) || []
    const token = tokens.at(-1)
    if (!token || tokens.length < 2) break
    const spacer = /[A-Za-z0-9]$/.test(token) && /^[A-Za-z0-9]/.test(lines[lastIndex]) ? ' ' : ''
    const nextLast = `${token}${spacer}${lines[lastIndex]}`
    if (ctx.measureText(nextLast).width > maxWidth) break
    lines[lastIndex - 1] = lines[lastIndex - 1].slice(0, -token.length).trimEnd()
    lines[lastIndex] = nextLast
  }
  return lines
}

const BODY_STYLES = {
  paragraph: {fontSize: 46, lineHeight: 82, weight: 400, gapBefore: 0, gapAfter: 34, indent: 0, color: INK},
  h1: {fontSize: 62, lineHeight: 88, weight: 700, gapBefore: 24, gapAfter: 26, indent: 0, color: INK},
  h2: {fontSize: 56, lineHeight: 82, weight: 700, gapBefore: 22, gapAfter: 24, indent: 0, color: INK},
  h3: {fontSize: 49, lineHeight: 76, weight: 700, gapBefore: 18, gapAfter: 22, indent: 0, color: INK},
  quote: {fontSize: 43, lineHeight: 76, weight: 400, italic: true, gapBefore: 18, gapAfter: 34, indent: 42, color: MUTED, quote: true},
  list: {fontSize: 46, lineHeight: 82, weight: 400, gapBefore: 0, gapAfter: 30, indent: 58, color: INK},
}

function richFont(run, style) {
  const italic = run.italic || style.italic ? 'italic ' : ''
  const weight = run.bold || style.weight >= 600 ? 700 : 400
  const size = run.code ? Math.max(18, style.fontSize - 6) : style.fontSize
  return `${italic}${weight} ${size}px ${run.code ? MONO : SERIF}`
}

function runWidth(ctx, run, style) {
  ctx.font = richFont(run, style)
  return ctx.measureText(run.text).width
}

function appendLineRun(line, run, text, width) {
  if (!text) return
  const previous = line.runs.at(-1)
  if (previous && previous.bold === run.bold && previous.italic === run.italic && previous.strike === run.strike && previous.code === run.code && previous.href === run.href) {
    previous.text += text
    previous.width += width
  } else line.runs.push({...run, text, width})
  line.width += width
}

function trimLineEnd(ctx, line, style) {
  const last = line.runs.at(-1)
  if (!last) return
  const trimmed = last.text.trimEnd()
  if (trimmed !== last.text) {
    line.width -= last.width
    last.text = trimmed
    last.width = runWidth(ctx, last, style)
    line.width += last.width
  }
  if (!last.text) line.runs.pop()
}

function takeOpeningMark(ctx, line, style) {
  const last = line.runs.at(-1)
  const mark = last?.text?.at(-1)
  if (!mark || !NO_LINE_END.includes(mark) || line.runs.length === 1 && last.text.length === 1) return null
  line.width -= last.width
  last.text = last.text.slice(0, -1)
  last.width = runWidth(ctx, last, style)
  line.width += last.width
  if (!last.text) line.runs.pop()
  return {...last, text: mark, width: runWidth(ctx, {...last, text: mark}, style)}
}

function wrapRichRuns(ctx, runs, maxWidth, style) {
  const lines = []
  let line = {runs: [], width: 0}
  const commit = () => {
    trimLineEnd(ctx, line, style)
    if (line.runs.length) lines.push(line)
    line = {runs: [], width: 0}
  }
  for (const run of runs) {
    const tokens = run.text.match(/[\u3400-\u9fff]|[，。！？；：、）》】」』”’…（《【「『“‘]|[^\s\u3400-\u9fff，。！？；：、）》】」』”’…（《【「『“‘]+|\s+/g) || []
    for (let token of tokens) {
      if (!line.runs.length) token = token.trimStart()
      if (!token) continue
      let tokenRun = {...run, text: token}
      let width = runWidth(ctx, tokenRun, style)
      const pieces = width > maxWidth ? Array.from(token) : [token]
      for (let piece of pieces) {
        if (!line.runs.length) piece = piece.trimStart()
        if (!piece) continue
        tokenRun = {...run, text: piece}
        width = runWidth(ctx, tokenRun, style)
        if (line.runs.length && line.width + width > maxWidth) {
          if (NO_LINE_START.includes(piece[0])) {
            appendLineRun(line, run, piece, width)
            continue
          }
          const opening = takeOpeningMark(ctx, line, style)
          commit()
          if (opening) appendLineRun(line, opening, opening.text, opening.width)
        }
        appendLineRun(line, run, piece, width)
      }
    }
  }
  commit()
  return lines.length ? lines : [{runs: [{text: '', width: 0}], width: 0}]
}

function layoutBlock(ctx, block) {
  if (block.type === 'image') return null
  if (block.type === 'hr') return {type: 'hr', gapBefore: 18, gapAfter: 24, lineHeight: 42, lines: []}
  const list = block.type === 'ul' || block.type === 'ol'
  const style = {...(BODY_STYLES[list ? 'list' : block.type] || BODY_STYLES.paragraph)}
  if (block.align === 'center') style.align = 'center'
  if (block.blockBold) style.weight = 700
  const maxWidth = CONTENT_WIDTH - style.indent
  let lines = []
  if (list) {
    block.items.forEach((item, itemIndex) => {
      const itemLines = wrapRichRuns(ctx, item, maxWidth, style)
      itemLines.forEach((line, lineIndex) => lines.push({...line, prefix: lineIndex === 0 ? (block.type === 'ol' ? `${itemIndex + 1}.` : '•') : '', extraAfter: lineIndex === itemLines.length - 1 ? 8 : 0}))
    })
  } else lines = wrapRichRuns(ctx, block.runs || [], maxWidth, style)
  return {
    type: block.type,
    style,
    lines,
    gapBefore: style.gapBefore,
    gapAfter: style.gapAfter,
    lineHeight: style.lineHeight,
    keepWithNext: /^h[1-3]$/.test(block.type),
  }
}

function fragmentHeight(block) {
  return block.gapBefore + block.gapAfter + (block.type === 'hr' ? block.lineHeight : block.lines.reduce((height, line) => height + block.lineHeight + (line.extraAfter || 0), 0))
}

function runsCharCount(runs = []) {
  return runs.reduce((count, run) => count + Array.from(run.text || '').length, 0)
}

function splitRunsAtChars(runs = [], limit = MAX_PAGE_BODY_CHARS) {
  const head = []
  const tail = []
  let remaining = limit
  let splitting = false
  for (const run of runs) {
    const chars = Array.from(run.text || '')
    if (splitting) {
      if (chars.length) tail.push({...run, text: chars.join('')})
      continue
    }
    const take = Math.min(remaining, chars.length)
    const headText = chars.slice(0, take).join('')
    const tailText = chars.slice(take).join('')
    if (headText) head.push({...run, text: headText})
    if (tailText) {
      tail.push({...run, text: tailText})
      splitting = true
    }
    remaining -= take
  }
  return [head, tail]
}

function blockCharCount(block) {
  if (block.type === 'ul' || block.type === 'ol') return block.items.reduce((count, item) => count + runsCharCount(item), 0)
  return runsCharCount(block.runs)
}

function splitBlockAtChars(block, limit = MAX_PAGE_BODY_CHARS) {
  if (block.type === 'image' || block.type === 'hr') return [block]
  if (blockCharCount(block) <= limit) return [block]
  if (block.type === 'ul' || block.type === 'ol') {
    const headItems = []
    const tailItems = []
    let count = 0
    let splitting = false
    for (const item of block.items) {
      if (splitting) {
        tailItems.push(item)
        continue
      }
      const itemCount = runsCharCount(item)
      if (count + itemCount <= limit) {
        headItems.push(item)
        count += itemCount
        continue
      }
      const [headItem, tailItem] = splitRunsAtChars(item, limit - count)
      if (headItem.length) headItems.push(headItem)
      if (tailItem.length) tailItems.push(tailItem)
      splitting = true
    }
    const head = {...block, items: headItems}
    const tail = tailItems.length ? {...block, items: tailItems} : null
    return tail ? [head, tail] : [head]
  }
  const [headRuns, tailRuns] = splitRunsAtChars(block.runs, limit)
  const head = {...block, runs: headRuns}
  const tail = tailRuns.length ? {...block, type: 'paragraph', runs: tailRuns, gapBefore: 0} : null
  return tail ? [head, tail] : [head]
}

function splitPostBlocksByChars(value = '') {
  const pages = []
  let current = []
  let count = 0
  const flush = () => {
    if (current.length) pages.push(current)
    current = []
    count = 0
  }
  for (const block of parsePostBlocks(value)) {
    let pending = block
    while (pending) {
      const limit = count === MAX_PAGE_BODY_CHARS ? MAX_PAGE_BODY_CHARS : MAX_PAGE_BODY_CHARS - count
      const [part, tail] = splitBlockAtChars(pending, limit)
      const partCount = blockCharCount(part)
      if (!partCount) {
        if (current.length) current.push(part)
        else if (pages.length) pages.at(-1).push(part)
        else current.push(part)
        pending = tail
        continue
      }
      if (current.length && partCount && count + partCount > MAX_PAGE_BODY_CHARS) flush()
      current.push(part)
      count += partCount
      if (count === MAX_PAGE_BODY_CHARS) flush()
      pending = tail
    }
  }
  flush()
  return pages.length ? pages : [[]]
}

function layoutBodyPages(value = '') {
  const measureCanvas = document.createElement('canvas')
  const ctx = measureCanvas.getContext('2d')
  return splitPostBlocksByChars(value).map(page => page.map(block => layoutBlock(ctx, block)).filter(Boolean))
}

function drawRichLine(ctx, line, style, baseline) {
  const contentX = SIDE + style.indent
  let x = style.align === 'center' ? SIDE + (CONTENT_WIDTH - line.width) / 2 : contentX
  if (style.quote) {
    ctx.strokeStyle = MOSS
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(SIDE + 3, baseline - style.fontSize)
    ctx.lineTo(SIDE + 3, baseline + 18)
    ctx.stroke()
  }
  if (line.prefix) {
    ctx.font = `700 ${style.fontSize}px ${SERIF}`
    ctx.fillStyle = MOSS
    ctx.fillText(line.prefix, SIDE + 4, baseline)
  }
  for (const run of line.runs) {
    ctx.font = richFont(run, style)
    const width = run.width ?? runWidth(ctx, run, style)
    if (run.code && run.text) {
      ctx.fillStyle = '#dfded6'
      ctx.fillRect(x - 4, baseline - style.fontSize * 0.82, width + 8, style.fontSize * 1.08)
    }
    ctx.fillStyle = run.href ? MOSS : style.color
    ctx.fillText(run.text, x, baseline)
    if ((run.strike || run.href) && run.text) {
      const lineY = run.strike ? baseline - style.fontSize * 0.31 : baseline + 6
      ctx.strokeStyle = run.href ? MOSS : style.color
      ctx.lineWidth = run.strike ? 2.5 : 1.5
      ctx.beginPath()
      ctx.moveTo(x, lineY)
      ctx.lineTo(x + width, lineY)
      ctx.stroke()
    }
    x += width
  }
}

function drawBodyPage(ctx, blocks, startY) {
  let y = startY
  for (const block of blocks) {
    y += block.gapBefore
    if (block.type === 'hr') {
      ctx.strokeStyle = '#b9b9b2'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(SIDE, y + 14)
      ctx.lineTo(IMAGE_WIDTH - SIDE, y + 14)
      ctx.stroke()
      y += block.lineHeight + block.gapAfter
      continue
    }
    block.lines.forEach(line => {
      drawRichLine(ctx, line, block.style, y)
      y += block.lineHeight + (line.extraAfter || 0)
    })
    y += block.gapAfter
  }
  return y
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

function drawMark(ctx, logo, x, y, size = 82) {
  const center = size / 2
  const radius = size * 0.29
  if (logo) {
    ctx.save()
    roundedRect(ctx, x, y, size, size, 13)
    ctx.clip()
    ctx.drawImage(logo, x, y, size, size)
    ctx.restore()
    return
  }
  ctx.fillStyle = INK
  roundedRect(ctx, x, y, size, size, 13)
  ctx.fill()
  ctx.strokeStyle = PAPER
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(x + center, y + center, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = MOSS
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(x + size * 0.32, y + size * 0.72)
  ctx.lineTo(x + size * 0.71, y + size * 0.28)
  ctx.stroke()
}

function makeQr(value) {
  const code = qrcode(0, 'M')
  code.addData(value)
  code.make()
  return code
}

function drawQr(ctx, code, x, y, size) {
  const modules = code.getModuleCount()
  const quiet = 4
  const cells = modules + quiet * 2
  const cell = Math.floor(size / cells)
  const actual = cell * cells
  const inset = Math.floor((size - actual) / 2)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x, y, size, size)
  ctx.fillStyle = INK
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        ctx.fillRect(x + inset + (column + quiet) * cell, y + inset + (row + quiet) * cell, cell, cell)
      }
    }
  }
  ctx.strokeStyle = '#b9b9b2'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, size, size)
}

function drawSlogan(ctx) {
  ctx.font = `700 31px ${SERIF}`
  const leadWidth = ctx.measureText(SLOGAN_LEAD).width
  const emphasisWidth = ctx.measureText(SLOGAN_EMPHASIS).width
  const x = IMAGE_WIDTH - SIDE - leadWidth - emphasisWidth
  ctx.fillStyle = INK
  ctx.fillText(SLOGAN_LEAD, x, 91)
  ctx.fillStyle = MOSS
  ctx.fillText(SLOGAN_EMPHASIS, x + leadWidth, 91)
}

function drawEndcap(ctx, info, y) {
  const url = `https://${SITE}/logs/${encodeURIComponent(info.slug)}`
  const qrSize = 156
  const qrX = IMAGE_WIDTH - SIDE - qrSize
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIDE, y)
  ctx.lineTo(IMAGE_WIDTH - SIDE, y)
  ctx.stroke()
  ctx.font = `700 30px ${SERIF}`
  ctx.fillStyle = INK
  ctx.fillText('日志原址', SIDE, y + 54)
  ctx.font = `400 17px ${MONO}`
  ctx.fillStyle = MUTED
  const pathLines = wrapText(ctx, url.replace('https://www.', ''), 630)
  drawLines(ctx, pathLines, SIDE, y + 96, 24, MUTED)
  ctx.font = `500 17px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText('CHRIS / FIELD NOTES  ·  SCAN TO OPEN', SIDE, y + 170)
  drawQr(ctx, makeQr(url), qrX, y + 28, qrSize)
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

function drawCanvas(ctx, post, mode, logo, {pageNumber = 1, pageCount = 1, bodyPage = []} = {}) {
  const info = articleInfo(post)
  const showIntro = mode !== 'full' || pageNumber === 1
  const titleFont = 82
  const titleLine = 102
  const summaryFont = 44
  const summaryLine = 74
  ctx.font = `700 ${titleFont}px ${SERIF}`
  const titleLines = balanceLastLine(ctx, wrapText(ctx, info.title, CONTENT_WIDTH), CONTENT_WIDTH)
  ctx.font = `400 ${summaryFont}px ${SERIF}`
  const excerptLines = balanceLastLine(ctx, wrapText(ctx, info.excerpt, CONTENT_WIDTH), CONTENT_WIDTH)

  const titleY = 330
  const excerptY = titleY + titleLines.length * titleLine + 34
  const dividerY = showIntro ? excerptY + excerptLines.length * summaryLine + 54 : 268
  const bodyHeight = mode === 'full' ? bodyPage.reduce((height, block) => height + fragmentHeight(block), 0) : 0

  const bodyY = dividerY + 58
  const endcapY = mode === 'full' ? bodyY + bodyHeight + 34 : dividerY + 32
  const height = endcapY + 212
  ctx.canvas.width = IMAGE_WIDTH
  ctx.canvas.height = height
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, IMAGE_WIDTH, height)
  drawMark(ctx, logo, SIDE, 48, 76)
  ctx.font = `700 28px ${MONO}`
  ctx.fillStyle = INK
  ctx.fillText('FIELD NOTES', 170, 81)
  ctx.font = `400 17px ${MONO}`
  ctx.fillStyle = MUTED
  ctx.fillText('CHRIS / OPEN INDEX', 170, 112)
  drawSlogan(ctx)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(SIDE, 158)
  ctx.lineTo(IMAGE_WIDTH - SIDE, 158)
  ctx.stroke()
  ctx.font = `500 24px ${MONO}`
  ctx.fillStyle = MOSS
  ctx.fillText(String(info.domain).toUpperCase(), SIDE, 222)
  ctx.textAlign = 'right'
  ctx.fillStyle = MUTED
  const pageLabel = mode === 'full' ? `${info.date}  ·  ${String(pageNumber).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}` : info.date
  ctx.fillText(pageLabel, IMAGE_WIDTH - SIDE, 222)
  ctx.textAlign = 'left'
  if (showIntro) {
    ctx.font = `700 ${titleFont}px ${SERIF}`
    drawLines(ctx, titleLines, SIDE, titleY, titleLine)
    ctx.font = `400 ${summaryFont}px ${SERIF}`
    drawLines(ctx, excerptLines, SIDE, excerptY, summaryLine, MUTED)
  }
  if (mode === 'full') {
    ctx.strokeStyle = '#b9b9b2'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(SIDE, dividerY)
    ctx.lineTo(IMAGE_WIDTH - SIDE, dividerY)
    ctx.stroke()
  }

  if (mode === 'full') {
    drawBodyPage(ctx, bodyPage, bodyY)
  }
  drawEndcap(ctx, info, endcapY)
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
      const pages = layoutBodyPages(post.body || post.excerpt || '')
      drawCanvas(canvasRef.current.getContext('2d'), post, mode, logoRef.current, {pageNumber: 1, pageCount: pages.length, bodyPage: pages[0]})
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
      const pages = targetMode === 'full' ? layoutBodyPages(post.body || post.excerpt || '') : [[]]
      setNotice(targetMode === 'full' ? `正在生成全文图片（共 ${pages.length} 张）…` : '正在生成摘要图…')
      const images = []
      for (let index = 0; index < pages.length; index += 1) {
        const canvas = document.createElement('canvas')
        drawCanvas(canvas.getContext('2d'), post, targetMode, logoRef.current, {pageNumber: index + 1, pageCount: pages.length, bodyPage: pages[index]})
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
        <p>沿用订阅邮件的抬头与摘要，右上保留中文引语，并附当前日志二维码；在本机浏览器生成，不上传草稿。</p>
      </div>
      <div className="post-image-export-actions" role="group" aria-label="导出图片类型">
        <button type="button" className={mode === 'summary' ? 'active' : ''} onClick={() => setMode('summary')}>摘要图</button>
        <button type="button" className={mode === 'full' ? 'active' : ''} onClick={() => setMode('full')}>手机长图</button>
        <button type="button" className="download-image secondary" disabled={Boolean(busy)} onClick={() => download('summary')}>{busy === 'summary' ? '生成中…' : '下载摘要图 ↓'}</button>
        <button type="button" className="download-image" disabled={Boolean(busy)} onClick={() => download('full')}>{busy === 'full' ? '生成全文中…' : '下载整篇文章 ↓'}</button>
      </div>
    </div>
    <div className="post-image-export-preview"><canvas ref={canvasRef} aria-label="文章图片预览" /></div>
    <p className="post-image-export-note" aria-live="polite">{notice || (mode === 'summary' ? '适合社交平台与文章转发。' : '正文不超过 2500 字时生成一张图；超过后按 2500 字分图，自动编号并仅在首图显示标题。')}</p>
  </section>
}

const IMAGE_PATTERN = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)|<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>|![^\s]*?(https?:\/\/[^\s]+)|(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s]*)?)/gi
const INLINE_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)|(`[^`]+`)|(?:\*\*|__)(.+?)(?:\*\*|__)|~~(.+?)~~|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g

function mergeRuns(runs) {
  const merged = []
  for (const run of runs) {
    if (!run.text) continue
    const previous = merged.at(-1)
    if (previous && previous.bold === run.bold && previous.italic === run.italic && previous.strike === run.strike && previous.code === run.code && previous.href === run.href) {
      previous.text += run.text
    } else merged.push({...run})
  }
  return merged
}

export function safePostUrl(url = '') {
  return /^(https?:\/\/|mailto:)/i.test(String(url)) ? String(url) : ''
}

export function parseInlineRuns(value = '', inherited = {}) {
  const source = String(value)
  const runs = []
  const pattern = new RegExp(INLINE_PATTERN.source, 'g')
  let cursor = 0
  let match
  while ((match = pattern.exec(source))) {
    if (match.index > cursor) runs.push({text: source.slice(cursor, match.index), ...inherited})
    if (match[1]) {
      runs.push(...parseInlineRuns(match[1], {...inherited, href: safePostUrl(match[2])}))
    } else if (match[3]) {
      runs.push({text: match[3].slice(1, -1), ...inherited, code: true})
    } else if (match[4]) {
      runs.push(...parseInlineRuns(match[4], {...inherited, bold: true}))
    } else if (match[5]) {
      runs.push(...parseInlineRuns(match[5], {...inherited, strike: true}))
    } else {
      runs.push(...parseInlineRuns(match[6] || match[7], {...inherited, italic: true}))
    }
    cursor = match.index + match[0].length
  }
  if (cursor < source.length) runs.push({text: source.slice(cursor), ...inherited})
  return mergeRuns(runs)
}

function textBlock(text, extra = {}) {
  return {type: 'paragraph', runs: parseInlineRuns(text), ...extra}
}

function parseTextBlock(block, extra = {}) {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
  const first = lines[0] || ''
  const heading = first.match(/^(#{1,3})\s+(.+)$/)
  if (lines.length === 1 && /^(---|\*\*\*|___)\s*$/.test(first)) return [{type: 'hr', ...extra}]
  if (heading && lines.length === 1) return [{type: `h${heading[1].length}`, runs: parseInlineRuns(heading[2]), ...extra}]
  if (lines.length && lines.every(line => /^[-*+]\s+/.test(line))) {
    return [{type: 'ul', items: lines.map(line => parseInlineRuns(line.replace(/^[-*+]\s+/, ''))), ...extra}]
  }
  if (lines.length && lines.every(line => /^\d+\.\s+/.test(line))) {
    return [{type: 'ol', items: lines.map(line => parseInlineRuns(line.replace(/^\d+\.\s+/, ''))), ...extra}]
  }
  if (lines.length && lines.every(line => /^>\s?/.test(line))) {
    return [textBlock(lines.map(line => line.replace(/^>\s?/, '')).join(' '), {type: 'quote', ...extra})]
  }
  return lines.length ? [textBlock(lines.join(' '), extra)] : []
}

function parseOrdinarySection(section) {
  const output = []
  const blocks = section.split(/\n\s*\n+/).map(block => block.trim()).filter(Boolean)
  for (const block of blocks) {
    let cursor = 0
    let match
    IMAGE_PATTERN.lastIndex = 0
    while ((match = IMAGE_PATTERN.exec(block))) {
      const before = block.slice(cursor, match.index).trim()
      if (before) output.push(...parseTextBlock(before))
      output.push({type: 'image', alt: match[1] || '文章配图', src: safePostUrl(match[2] || match[3] || match[4] || match[5])})
      cursor = match.index + match[0].length
    }
    const rest = block.slice(cursor).trim()
    if (rest) output.push(...parseTextBlock(rest))
  }
  return output
}

export function parsePostBlocks(value = '') {
  const source = String(value).replace(/\r\n?/g, '\n').trim()
  if (!source) return []
  const blocks = []
  const centered = /^:::(center(?:-bold)?)\s*\n([\s\S]*?)\n:::\s*$/gm
  let cursor = 0
  let match
  while ((match = centered.exec(source))) {
    blocks.push(...parseOrdinarySection(source.slice(cursor, match.index)))
    const alignment = match[1] === 'center-bold' ? {align: 'center', blockBold: true} : {align: 'center'}
    const centeredBlocks = match[2].split(/\n\s*\n+|\n/).map(part => part.trim()).filter(Boolean)
    for (const centeredBlock of centeredBlocks) blocks.push(...parseTextBlock(centeredBlock, alignment))
    cursor = match.index + match[0].length
  }
  blocks.push(...parseOrdinarySection(source.slice(cursor)))
  return blocks
}

export function runsText(runs = []) {
  return runs.map(run => run.text).join('')
}

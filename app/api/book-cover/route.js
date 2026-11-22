import {NextResponse} from 'next/server'

const DOUBAN_COVER_RE = /^https:\/\/img\d+\.doubanio\.com\/view\/subject\/[sml]\/public\/[a-zA-Z0-9_.-]+$/
const MAX_COVER_BYTES = 2 * 1024 * 1024

export async function GET(request) {
  const {searchParams} = new URL(request.url)
  const rawUrl = (searchParams.get('url') || '').trim()
  if (!DOUBAN_COVER_RE.test(rawUrl)) {
    return NextResponse.json({error: 'Invalid cover URL'}, {status: 400})
  }

  try {
    const res = await fetch(rawUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: {
        Referer: 'https://book.douban.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      return NextResponse.json({error: 'Cover redirect blocked'}, {status: 403})
    }
    if (!res.ok) {
      return NextResponse.json({error: 'Cover unavailable'}, {status: 404})
    }
    const contentType = (res.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase()
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({error: 'Unsupported content type'}, {status: 415})
    }
    const declaredLength = Number(res.headers.get('content-length') || 0)
    if (Number.isFinite(declaredLength) && declaredLength > MAX_COVER_BYTES) {
      return NextResponse.json({error: 'Cover too large'}, {status: 413})
    }
    const reader = res.body?.getReader()
    if (!reader) {
      return NextResponse.json({error: 'Cover empty'}, {status: 502})
    }
    const chunks = []
    let total = 0
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_COVER_BYTES) {
        await reader.cancel()
        return NextResponse.json({error: 'Cover too large'}, {status: 413})
      }
      chunks.push(value)
    }
    const buf = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      buf.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({error: 'Cover fetch failed'}, {status: 502})
  }
}

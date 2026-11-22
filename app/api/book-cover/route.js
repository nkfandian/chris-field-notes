import {NextResponse} from 'next/server'

const DOUBAN_COVER_RE = /^https:\/\/img\d+\.doubanio\.com\/view\/subject\/[sml]\/public\/[a-zA-Z0-9_.-]+$/

export async function GET(request) {
  const {searchParams} = new URL(request.url)
  const rawUrl = (searchParams.get('url') || '').trim()
  if (!DOUBAN_COVER_RE.test(rawUrl)) {
    return NextResponse.json({error: 'Invalid cover URL'}, {status: 400})
  }

  try {
    const res = await fetch(rawUrl, {
      headers: {
        Referer: 'https://book.douban.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) {
      return NextResponse.json({error: 'Cover unavailable'}, {status: 404})
    }
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const buf = await res.arrayBuffer()
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

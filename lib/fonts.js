import {IBM_Plex_Mono, Noto_Serif_SC} from 'next/font/google'

// 字体在构建时下载并随站点自托管，访客不再请求 fonts.googleapis.com（国内常被拦截或卡住首屏）。
// 中文字体按 unicode-range 切片，浏览器只下载页面用到的字；CJK 不做预加载。
export const serif = Noto_Serif_SC({weight: ['400', '600', '700', '900'], display: 'swap', preload: false, variable: '--font-serif', fallback: ['Songti SC', 'STSong', 'SimSun', 'serif']})
export const mono = IBM_Plex_Mono({weight: ['400', '500'], subsets: ['latin'], display: 'swap', variable: '--font-mono', fallback: ['Menlo', 'Consolas', 'monospace']})

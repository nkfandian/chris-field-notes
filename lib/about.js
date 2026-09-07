export const DEFAULT_ABOUT_TEXT='我经历过博客、微博、豆瓣、FB、Goodreads等等数不清的平台，那里都曾留下过我的记录，这个独立的小站，会作为我阅读和记录的一个新空间，延续我在互联网的记忆。'

export function resolveAboutText(value={},home={}){
 return String(value.text||home.manifesto||value.statement||DEFAULT_ABOUT_TEXT).trim()||DEFAULT_ABOUT_TEXT
}

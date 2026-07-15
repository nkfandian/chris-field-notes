# CHRIS / FIELD NOTES — SEO 运维方案

## 搜索引擎覆盖

- Google：canonical、XML Sitemap、RSS、`BlogPosting`、`BreadcrumbList`、Open Graph 与 Googlebot 大图摘要指令。
- Bing、Yahoo、DuckDuckGo、Ecosia：XML Sitemap、RSS、标准元数据与 IndexNow 即时更新通知。
- 百度：服务端中文正文、稳定规范 URL、robots、XML Sitemap、摘要、关键词与百度站点验证接口。
- Yandex：robots 中的 Host/Sitemap、准确 `lastmod`、结构化数据与 IndexNow。
- 360、搜狗、Naver：标准抓取协议、服务端正文与各自的站点验证接口。

## 公开发现入口

- `https://www.chrisreading.ink/robots.txt`
- `https://www.chrisreading.ink/sitemap.xml`
- `https://www.chrisreading.ink/feed.xml`
- `https://www.chrisreading.ink/opensearch.xml`
- `https://www.chrisreading.ink/manifest.webmanifest`

Sitemap 仅包含允许收录的规范页面。搜索结果页、Studio、密码与订阅令牌页面不会进入 Sitemap，并使用 `noindex` 或 `X-Robots-Tag` 阻止收录。

## 自动更新

日志发布、更新、下线或删除，以及书单、轨迹和首页内容变化时，后台会：

1. 立即刷新 Next.js 页面缓存；
2. 更新 Sitemap 的真实修改时间；
3. 通过 IndexNow 通知参与协议的搜索引擎。

IndexNow 所有权密钥默认由服务器现有高熵密钥单向派生，不写入浏览器或 Git 仓库；也可用 `INDEXNOW_KEY` 单独覆盖。

## 站长平台验证变量

拿到平台验证码后，在 Vercel 环境变量中填写即可，无需改代码：

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `YAHOO_SITE_VERIFICATION`
- `SO_SITE_VERIFICATION`
- `SOGOU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

## 内容发布规范

- 标题应准确描述文章主题，避免重复站点名。
- 每篇日志填写独立摘要；摘要同时用于搜索结果、分享卡片和订阅邮件预览。
- 日期只在正文或结构化数据发生实质变化时更新。
- 链接标识保持短、稳定、使用小写英文与连字符；发布后尽量不要修改。
- 文章应通过相关日志、书籍和轨迹形成内部链接，避免孤立页面。

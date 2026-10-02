# CHRIS / FIELD NOTES 项目交接文档

> 最后核对：2026-10-02（Asia/Shanghai）
>
> 目标：让新的开发者或大模型无需依赖历史聊天记录，即可安全地继续修改、验证和发布本项目。

## 0. 接手者先读这一段

这是一个已经在线运行的中文个人网站，不是静态演示。公开内容、后台、订阅邮件、评论、浏览量、SEO 和文章长图导出都连接着生产数据。

接手时必须遵守以下顺序：

1. 阅读本文件，尤其是“Git 与生产分支”“安全边界”“文章格式的三个渲染器”“长图规则”和第 22 节“变更记录”。
2. 在项目目录运行 `git status --short`，确认没有未识别的用户改动。
3. 运行 `git fetch origin main`，不要直接相信本地的 `origin/main` 引用。
4. 运行 `git log --oneline -15 origin/main`，对照第 22 节，确认最近的变化都已记录。
5. 从真实的远端 `main` 创建工作分支或工作树；不要强制推送本地 `deploy-sync` 的历史。
6. 修改前先定位现有实现，不要重复建设已经存在的功能。
7. 修改后至少运行 `npm run build`。
8. **在同一个提交中更新本文件**：受影响的章节（代码地图、技术债、规则等）同步修改，并在第 22 节追加一行变更记录。
9. 如果发布到生产，确认两个 Vercel 状态都为 `success`，再检查真实域名。

### 0.1 给下一位 agent 的开场提示词

把下面整段复制给新的 agent（Codex、Cursor、Claude Code 等），只需把最后一行换成本次任务：

```text
项目目录：/Users/chris/Documents/Codex/2026-07-11/anti-gravity-anti-gravity/outputs/personal-os
GitHub：https://github.com/nkfandian/chris-field-notes（main 分支即线上生产）

开始前请按顺序做：
1. 在项目目录运行 git fetch origin main，然后完整阅读远端最新版的 PROJECT_HANDOFF.md（git show origin/main:PROJECT_HANDOFF.md），特别是第 0 节和第 22 节变更记录。
2. 运行 git log --oneline -15 origin/main，了解最近的修改。
3. 从 origin/main 新建分支或工作树再修改；不要在本地 deploy-sync 分支上开发，不要强推。

修改时遵守：
- 修改后运行 npm run build。
- 所有文章格式变更必须同时验证网页、订阅邮件和长图导出。
- 在同一个提交里更新 PROJECT_HANDOFF.md 的相关章节，并在第 22 节最上方追加一行变更记录。
- 推送到 main 会直接发布到线上；推送后确认两个 Vercel 部署（chris-field-notes、chris-field-notes-web）都是 success。
- 不要在线上把测试文章设为"发布"，那样会给真实订阅者群发邮件。

这次的任务是：【在这里写你要改什么】
```

使用说明：

- **云端 agent（无法访问本机目录）**：把第一行换成“请克隆 https://github.com/nkfandian/chris-field-notes”，其余照用。
- **为什么读远端版本**：本地 `deploy-sync` 分支里的旧文件可能不是最新版（没有变更记录），必须以 `origin/main` 为准。
- **推送权限**：agent 所在环境需要登录有权限的 GitHub 账号（例如 `gh auth login`）才能推送。
- **收尾检查**：任务完成后确认第 22 节已追加变更记录，没有就让 agent 补上。

---

## 1. 项目身份与位置

| 项目 | 值 |
|---|---|
| 产品名 | `CHRIS / FIELD NOTES` |
| 线上域名 | <https://www.chrisreading.ink> |
| GitHub | <https://github.com/nkfandian/chris-field-notes> |
| GitHub 默认分支 | `main` |
| 本机项目目录 | `/Users/chris/Documents/Codex/2026-07-11/anti-gravity-anti-gravity/outputs/personal-os` |
| 独立微信引流图目录 | `/Users/chris/Documents/Codex/2026-09-09/wo/wechat-subscribe-card` |
| Supabase project ref | `kdmhceaxcyimnaxfoswo` |
| Supabase 项目入口 | <https://supabase.com/dashboard/project/kdmhceaxcyimnaxfoswo> |
| 部署平台 | Vercel（同一提交会触发两个项目） |
| Vercel 项目 | `chris-field-notes`、`chris-field-notes-web` |

生产内容主要存在 Supabase，不在 Git 仓库。Git 中的 `lib/demo.js` 只是未配置 Supabase 时的回退内容。

---

## 2. 当前生产基线与 Git 特殊情况

### 2.1 生产基线：以实时核对为准

本文不写死“当前远端 `main` 是哪个提交”，因为每次提交都会让它过时。**生产基线永远是 GitHub 远端 `main` 的最新提交**，接手时用以下命令实时核对：

```bash
git fetch origin main
git log --oneline -15 origin/main
gh api repos/nkfandian/chris-field-notes/git/ref/heads/main --jq .object.sha
```

最近改了什么，看第 22 节“变更记录”和 `git log`。

本地 `deploy-sync` 分支的历史说明：

- 本地 `deploy-sync`（HEAD `8a805c4`）是一条独立的历史开发线，与远端 `main` 提交历史不同。
- 2026-10-02 时，它的文件树与远端 `08f8932`（`Strengthen author, category, and discovery SEO`）完全一致（tree `36fd534`）。
- 此后远端 `main` 新增的提交（见第 22 节）不在 `deploy-sync` 上。**不要在 `deploy-sync` 上继续开发**，一律从 `origin/main` 开分支。

历史不同的原因：此前发布使用 GitHub Git Data API，以远端 `main` 为父提交创建生产提交；本地保留了另一条连续开发历史。因此提交 SHA 不同。

### 2.2 接手时的安全 Git 做法

推荐：

```bash
cd /Users/chris/Documents/Codex/2026-07-11/anti-gravity-anti-gravity/outputs/personal-os
git status --short
git fetch origin main
git switch -c your-task-name origin/main
```

如果需要隔离工作，优先从 `origin/main` 创建新 worktree。

不要：

- 不要把本地 `deploy-sync` 直接强推到远端 `main`。
- 不要使用 `git reset --hard` 清除不认识的改动。
- 不要因为本地 `origin/main` 显示旧 SHA 就判断生产站点已回退；先 `fetch` 或调用 GitHub API 核对。

### 2.3 发布验证

推送远端 `main` 会触发：

- `Vercel – chris-field-notes`
- `Vercel – chris-field-notes-web`

两者都成功才算发布完成。发布后至少检查：

```bash
curl -sSI https://www.chrisreading.ink/
curl -sS https://www.chrisreading.ink/robots.txt
curl -sS https://www.chrisreading.ink/sitemap.xml
curl -sS https://www.chrisreading.ink/feed.xml
```

---

## 3. 技术栈

| 层 | 技术 |
|---|---|
| Web 框架 | Next.js `15.5.20`，App Router |
| UI | React `19.2.7` / React DOM `19.2.7` |
| 数据与认证 | Supabase（Postgres、Auth、RLS、RPC） |
| Supabase 客户端 | `@supabase/ssr 0.6.1`、`@supabase/supabase-js 2.110.5` |
| 邮件 | Resend REST API |
| 二维码 | `qrcode-generator 1.4.4` |
| 分析 | GA4 + Vercel Web Analytics |
| 部署 | Vercel + GitHub |
| 样式 | 原生 CSS，按页面拆分；无 Tailwind、无 CSS-in-JS |
| 内容格式 | 项目自定义的 Markdown 子集 |

当前本机曾验证的工具版本：Node `v23.11.0`、npm `10.9.2`。`package.json` 未锁定 Node engines；Vercel 的实际 Node 版本应在 Vercel 项目设置中核对。

仓库没有自动化测试脚本、ESLint 脚本或类型检查脚本；当前最低验证标准是完整生产构建。

---

## 4. 本地运行

```bash
cd /Users/chris/Documents/Codex/2026-07-11/anti-gravity-anti-gravity/outputs/personal-os
npm install
npm run dev
```

生产构建：

```bash
NEXT_TELEMETRY_DISABLED=1 npm run build
npm run start
```

如果缺少 Supabase 的两个公开环境变量，站点仍可启动，但只显示 `lib/demo.js` 中的演示日志，书单和轨迹为空，后台无法保存。

---

## 5. 环境变量

### 5.1 必需变量

| 变量 | 使用位置 | 是否可公开 | 说明 |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 浏览器与服务器 | 是 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器与服务器 | 是 | Supabase anon key；仍必须依赖 RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务器 | **否** | 公共表单、浏览量、邮件、限流等服务端操作 |
| `RESEND_API_KEY` | 仅服务器 | **否** | 新日志自动推送、手动群发 |
| `NOTIFICATION_FROM` | 仅服务器 | 通常否 | Resend 已验证发件人，例如 `名称 <mail@domain>` |

### 5.2 运维与可选变量

| 变量 | 说明 |
|---|---|
| `CRON_SECRET` | **必须在两个 Vercel 项目都设置**。Vercel Cron 每天调用 `GET /api/notifications` 时自动携带；未设置时该接口一律返回 401，定时重试不会运行 |
| `RATE_LIMIT_SALT` | 限流哈希盐；未设置时回退到 service role key |
| `INDEXNOW_KEY` | 可选；未设置时从服务端高熵密钥派生 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4；代码内目前有默认值 `G-GKQVSFLWM4` |
| `GOOGLE_SITE_VERIFICATION` | Google 站点验证；代码内已有默认验证码 |
| `BING_SITE_VERIFICATION` | Bing 站点验证 |
| `BAIDU_SITE_VERIFICATION` | 百度站点验证 |
| `YANDEX_SITE_VERIFICATION` | Yandex 站点验证 |
| `YAHOO_SITE_VERIFICATION` | Yahoo 站点验证 |
| `SO_SITE_VERIFICATION` | 360 站点验证 |
| `SOGOU_SITE_VERIFICATION` | 搜狗站点验证 |
| `NAVER_SITE_VERIFICATION` | Naver 站点验证 |

本地 `.env.local` 目前只包含 Supabase URL 和 anon key。其余服务端密钥应从 Vercel 环境变量或安全的密码管理器获取。

严禁：

- 不要把 `SUPABASE_SERVICE_ROLE_KEY`、`RESEND_API_KEY`、`CRON_SECRET` 写入 Git、客户端代码或 `NEXT_PUBLIC_*` 变量。
- 不要在交接文本、日志、截图或工具输出中打印真实密钥。
- `.env.example` 目前不完整；它只列了 Supabase 公开变量和 GA。新增环境时以本节为准。

---

## 6. 产品结构

### 6.1 公开站点

| 路径 | 功能 | 关键文件 |
|---|---|---|
| `/` | 首页：首屏、日志、书单、轨迹（订阅和留言在共用页脚里） | `app/page.js`、`app/home-client.js`、`app/home.css` |
| `/about` | 可抓取的作者/网站介绍页 | `app/about/page.js` |
| `/logs` | 全部日志与栏目筛选 | `app/logs/page.js` |
| `/logs/[slug]` | 日志正文、分享、书籍关联、相关文章、评论 | `app/logs/[slug]/*` |
| `/books` | 书单、筛选和短评 | `app/books/*` |
| `/trails` | 阅读轨迹列表 | `app/trails/page.js` |
| `/trails/[slug]` | 轨迹详情，连接日志、书和短注 | `app/trails/[slug]/page.js` |
| `/search` | 站内搜索 | `app/search/*` |
| `/privacy` | 隐私政策 | `app/privacy/*` |
| `/subscribe/confirm` | 旧版确认链接的兼容页（订阅已改为单次确认，新订阅不再发确认邮件） | `app/subscribe/confirm/*` |
| `/unsubscribe` | 退订 | `app/unsubscribe/*` |
| `/reset-password` | 后台管理员密码重置 | `app/reset-password/page.js` |

### 6.2 管理后台

| 路径 | 功能 |
|---|---|
| `/studio` | 日志编辑、格式工具、浏览量、图片导出 |
| `/studio/books` | 书单编辑 |
| `/studio/trails` | 轨迹编辑 |
| `/studio/site` | 首页标题、强调句、英文引语 |
| `/studio/about` | ABOUT 文本 |
| `/studio/comments` | 评论和留言审核 |
| `/studio/subscribers` | 订阅用户、手动群发和发送记录 |

Studio 使用 Supabase Auth 登录，并通过 `site_admins` + `is_site_admin()` 二次确认。并非任何已登录用户都能管理站点。

### 6.3 API 与机器入口

| 路径 | 调用方 | 功能 |
|---|---|---|
| `POST /api/posts` | 管理员 | 创建/更新日志、触发邮件、刷新缓存、通知 IndexNow |
| `POST /api/interactions` | 公开 | 提交评论或网站留言，默认 `pending` |
| `POST /api/subscribe` | 公开 | 提交邮箱即生效（`active` + `verified_at`），不发确认邮件 |
| `POST /api/subscribe/confirm` | 公开令牌页 | 兼容旧确认链接；订阅已生效时也返回成功 |
| `POST /api/unsubscribe` | 公开令牌页 | 退订并旋转管理令牌 |
| `POST /api/views` | 文章页 | 记录浏览量，带限流 |
| `POST /api/campaigns` | 管理员 | 向有效订阅者手动群发 |
| `POST /api/notifications` | 管理员 | 重试未完成的新日志通知 |
| `GET /api/notifications` | Vercel Cron（`vercel.json`，每天 01:00 UTC） | Bearer `CRON_SECRET` 触发推送重试，并清理两天前的 `rate_limits` |
| `POST /api/indexnow` | 管理员 | 刷新路径并提交 IndexNow |
| `GET /api/og?title=...` | 公开 | 生成 1200×630 分享图 |
| `GET /feed.xml` | 公开 | RSS 2.0，最多 50 篇日志 |
| `GET /sitemap.xml` | 公开 | 动态 Sitemap，含栏目、日志图片、轨迹 |
| `GET /robots.txt` | 公开 | 抓取策略 |
| `GET /opensearch.xml` | 公开 | 浏览器站内搜索描述 |
| `GET /{key}.txt` | 搜索引擎 | IndexNow 所有权验证；由 `next.config.mjs` 的 rewrite 转到 `app/api/indexnow-key/[key]/route.js`（不要再用根目录动态路由，否则所有一级路径的 404 都会落到它） |

`next.config.mjs` 为所有页面设置 CSP、HSTS、COOP、Permissions-Policy 等安全头；Studio、令牌页和私有 API 带 `X-Robots-Tag: noindex`。

---

## 7. 代码地图

### 7.1 入口与公共基础

- `app/layout.js`：全站 metadata、结构化数据、AdSense 验证 meta。
- `app/components/site-analytics.js`：GA、Vercel Analytics 和 AdSense 脚本；后台和带令牌页面（`/studio`、`/reset-password`、`/subscribe/confirm`、`/unsubscribe`）一律不加载。
- `app/page.js`：服务器侧读取首页所有数据。
- `app/home-client.js`：首页首屏、日志筛选、书单与轨迹区块。
- `app/components/site-header.js` / `site-footer.js` / `site-chrome.css`：**所有公开页面共用**的顶部导航（含移动端菜单）和深色页脚（订阅、留言、站点链接）。新增公开页面时直接使用这两个组件，并给 `<main>` 加 `id="content"`（跳转链接用）。
- `app/not-found.js`：带共用页眉页脚的 404 页面。
- `lib/trails.js`：把轨迹节点汇总成“3 篇日志 · 10 本书”这类文字。
- `app/public-theme.css`：公开页面新版配色的统一覆盖层。
- `app/home.css`：首页完整布局；文件后半段有新版覆盖规则。
- `app/studio/studio.css`：后台布局和新版配色覆盖。
- `app/components/structured-data.js`：JSON-LD 输出。
- `app/components/logo.js`：品牌锁定组合。

### 7.2 数据与安全

- `lib/supabase/client.js`：浏览器 Supabase 客户端。
- `lib/supabase/server.js`：带 Cookie 的服务器客户端。
- `lib/supabase/admin.js`：service role 客户端；只能服务器使用。
- `lib/auth.js`：读取当前 Auth 用户并调用 `is_site_admin()`。
- `lib/security.js`：来源检查、请求大小限制、限流键、输入清理。
- `lib/resend.js`：Resend 发信封装（批量接口、幂等键、节流与 429 重试）。
- `supabase/schema.sql`：新环境完整初始化脚本，已包含最终安全策略。
- `supabase/migrations/*`：线上数据库的增量迁移历史。

### 7.3 内容与格式

- `app/studio/markdown-editor.js`：后台格式按钮和标记插入。
- `app/logs/[slug]/post-body.js`：网页端正文渲染（基于 `post-format.js` 的解析结果生成 React 元素）。
- `lib/post-format.js`：网页、邮件和长图**共用**的格式解析器。
- `lib/notifications.js`：新日志邮件 HTML 和投递状态。
- `lib/email-preview.js`：邮件 preheader/纯文本摘要。
- `app/studio/post-image-exporter.js`：Canvas 摘要图与全文图。

### 7.4 SEO

- `lib/seo.js`：域名、作者、站点 metadata 帮助函数。
- `app/layout.js`：全站基础 metadata 和 Website/Person/Organization JSON-LD。
- `app/sitemap.js`、`app/robots.js`、`app/feed.xml/route.js`。
- `lib/indexnow.js`、`lib/indexnow-client.js`。
- `SEO.md`：搜索引擎运维说明。

### 7.5 旧文件

仓库根目录的 `index.html`、`script.js`、`styles.css` 是早期静态版本，不是当前 Next.js 生产入口。除非明确处理历史静态版本，否则不要把新功能写在那里。

---

## 8. 数据库模型

完整定义见 `supabase/schema.sql`。新环境应直接执行该文件；已有环境按 `supabase/migrations/` 顺序应用缺失迁移。

### 8.1 表

#### `posts`

- `id uuid` 主键
- `slug text` 唯一，公开 URL 标识
- `title text`
- `domain text`：`decode | execute | deploy | trek | roots`
- `excerpt text`
- `body text`
- `thesis text`：**已停用**（2026-10-02 起“核心判断”功能全部移除）；列和历史数据保留，前台、后台和保存接口都不再读写
- `tools text`
- `status text`：`draft | published`
- `published_at date`
- `created_at`、`updated_at`
- `firebase_id text`：旧数据兼容
- `tags text[]`
- `notification_sent_at timestamptz`

#### `site_content`

- `key text` 主键
- `value jsonb`
- `updated_at`
- 已用 key：`home`、`about`

`home.value` 当前字段：

```json
{
  "hero_title": "面对复杂。",
  "hero_emphasis": "保持欢喜。",
  "hero_deck": "The theme of my life is complexity-through-joy."
}
```

`about.value` 当前结构：

```json
{"text": "..."}
```

#### `comments`

- 同时保存文章评论和首页留言。
- `kind`：`comment | message`
- `post_slug`：留言可为空。
- `name`、`email`、`body`
- `status`：`pending | approved | rejected`
- `reviewed_at`
- 公开读取必须走 `get_public_comments()`，该 RPC 不返回邮箱。

#### `books`

- `title`、`author`、`cover_url`
- `status`：`Reading | Read | To Read`
- `rating`：0–5
- `review`
- `language`：`Chinese | English`
- `custom_lists text[]`
- `linked_post_slug`
- `sort_order`
- `firebase_id` 用于旧数据兼容。

#### `trails` / `trail_items`

- `trails`：`slug`、`title`、`summary`、`status`。
- `trail_items.item_type`：`post | book | note`。
- `reference_id` 保存文章 slug、书籍 UUID 或空值。
- `position` 控制顺序，`label` 和 `note` 用于展示。
- 公开轨迹页兼容旧 Firebase ID、UUID、slug 和标题匹配；新增数据应使用明确的 slug/UUID。

#### `subscribers`

- `email` 唯一。
- `status`：`pending | active | unsubscribed`。`pending` 只在历史数据中出现，新订阅直接为 `active`。
- `verified_at`：订阅生效时写入（单次确认，提交即写入）。推送只发给 `active` 且 `verified_at` 非空的人。
- `confirmation_token`：旧版确认令牌，仅兼容旧确认链接。
- `manage_token`：退订管理令牌，使用后旋转。
- `confirmation_sent_at`：旧版字段，已不再写入。
- `source`：例如 `website` 或历史 `firebase`。

#### 邮件与运维表

- `email_campaigns`：手动群发历史。
- `email_deliveries`：每篇日志对每个订阅者的投递状态，唯一键 `(post_id, subscriber_id)`。
- `rate_limits`：服务端限流桶；每日定时任务删除两天前的记录。
- `post_views`：每篇文章总浏览量和最后访问时间。
- `site_admins`：后台管理员白名单，关联 `auth.users`。

### 8.2 权限模型

- 匿名用户只可读取已发布日志、公开书籍、已发布轨迹、站点内容。
- 匿名用户不能直接读取 `comments`、`subscribers`、邮件、限流、管理员和浏览量表。
- 公开评论通过 `get_public_comments()` RPC 获取，避免泄露邮箱和审核状态。
- 浏览量写入通过 service role 调用 `record_post_view()`。
- 后台 CRUD 要求已登录且 `is_site_admin()` 为真。
- 初始化迁移会把最早创建的 Auth 用户写入 `site_admins`。新增管理员应显式插入其 `auth.users.id`，不要放宽 RLS 为“所有 authenticated”。

---

## 9. 日志编辑格式：必须同步三个渲染器

后台编辑器支持以下格式：

```md
## 二级标题
### 三级标题
**加粗**
*斜体*
~~删除线~~
`行内代码`
- 无序列表
1. 有序列表
> 引用
[链接文字](https://example.com)
![图片说明](https://example.com/image.jpg)
---

:::center
居中文字
:::

:::center-bold
居中加粗文字
:::
```

任何格式功能都必须同时修改和验证：

1. `app/studio/markdown-editor.js`：编辑器按钮/标记插入。
2. `app/logs/[slug]/post-body.js`：网页正文渲染（只负责把解析结果变成 React 元素）。
3. `lib/post-format.js`：三端共享的语义解析；新增语法首先改这里。
4. `lib/notifications.js`：邮件 HTML 输出。
5. `app/studio/post-image-exporter.js`：Canvas 长图绘制。

这是项目历史上最重要的回归点：曾经出现网页显示正常，但邮件和下载图片直接显示 Markdown 代码的问题。不要只修网页端。

2026-10-02 起网页端也改用 `post-format.js` 解析，三端共用同一套规则；不要再在 `post-body.js` 里写独立的正则解析。

URL 只允许 `http(s)`，正文链接额外允许 `mailto:`；不要放宽到 `javascript:` 或任意协议。

---

## 10. 长图导出规则（不可随意改变）

实现文件：`app/studio/post-image-exporter.js`。

用户明确要求：

- 正文不超过 2500 个字符：只生成一张全文图。
- 超过 2500 个字符：按每页最多 2500 字符拆分。
- 每张图显示页码，例如 `01 / 03`。
- 只有第一张显示文章标题和摘要；后续图片不重复标题。
- 切图不能截断同一行文字，也不能破坏行内加粗/斜体/链接等样式。
- 尽量在句号、问号、感叹号、分号、逗号或空格处分段。
- 避免 `，。！？；：、）》】」』…` 等标点出现在新行开头。
- 避免左括号、书名号、引号等停在上一行末尾。
- 中文、拉丁字母和数字必须处于同一基线；数字不能下沉。
- 多页输出打包成 ZIP；单页直接下载 PNG。

当前关键常量：

| 常量 | 值 |
|---|---:|
| Canvas 宽度 | `1080` px |
| 左右边距 | `72` px |
| 每页正文字符上限 | `2500` |
| 正文字号 | `46` px |
| 正文行高 | `82` px |
| 标题字号 | `82` px |
| 字体栈 | `Songti SC / STSong / Noto Serif SC / Georgia` |

不要把 Georgia 放到中文字体之前；Canvas 在同一行切换字体会导致数字基线和宽度异常。

图片型 Markdown 块目前不会进入全文长图正文，它们在 `layoutBlock()` 中返回 `null`。网页和邮件仍会显示文章图片。如果要让长图包含图片，需要单独设计跨域加载、Canvas 污染和分页策略。

---

## 11. 发布、邮件与订阅行为

### 11.1 发布日志

后台保存通过 `POST /api/posts`，不是直接在浏览器写 `posts` 表。

当文章状态为 `published` 且 `notification_sent_at` 为空时：

1. 保存文章。
2. 调用 `deliverPending()`。
3. 按 100 人一批，先在 `email_deliveries` 中**原子领取**投递（新行插入即领取；`failed` 行和超过 15 分钟的 `sending` 行通过条件更新领取），只给领取成功的人发送。
4. 通过 Resend 批量接口发送，每封带幂等键（文章 ID + 订阅者 ID）。
5. 按结果把每行更新为 `sent` 或 `failed`。
6. 全部成功后写入 `notification_sent_at`。
7. 刷新首页、日志索引和文章路径。
8. 提交文章、栏目、日志索引和首页到 IndexNow。

重要：把草稿第一次切换成“发布”会真实群发，不能拿生产订阅者做随意测试。测试邮件应使用隔离环境或明确的测试订阅者。

已发送文章后继续编辑，不会自动再次群发，因为 `notification_sent_at` 已存在。

防重复发送：保存期间按钮禁用；即使并发调用 `deliverPending()`（重复点击、两个 Vercel 项目的定时任务同时运行），原子领取也保证同一订阅者不会被两个请求同时发送。未完成的推送由每日 Vercel Cron 自动重试，也可以由管理员 `POST /api/notifications` 手动触发。

链接锁定：曾发布过的日志（`status='published'` 或 `notification_sent_at` 非空）不能修改 slug，`/api/posts` 会拒绝，后台输入框为只读。

### 11.2 邮件格式

- Resend 通过 REST API 调用。
- 新日志邮件支持标题、段落、加粗、斜体、删除线、行内代码、链接、列表、引用、居中、图片和分隔线。
- 邮件带隐藏 preheader 和退订链接。
- `email_deliveries` 使重试具备幂等性：已经成功的订阅者不会重复发送。
- 手动群发（`/api/campaigns`）同样按 100 封一批发送；它不记录每个收件人的结果，只记录成功/失败总数。

### 11.3 订阅生命周期

**单次确认（用户 2026-10-02 明确要求）**：输入邮箱即生效，不发确认邮件。

1. 用户提交邮箱。
2. 服务端新建或恢复记录为 `active`，写入 `verified_at`。
3. 下一篇新日志发布时开始收到邮件；每封邮件底部有退订链接。
4. 退订通过 `manage_token`，完成后旋转令牌。
5. 后台只能“停用”订阅，不能把已退订的人恢复；退订者只能本人在网站重新订阅。

所有情况返回同一句“订阅成功”，不暴露某邮箱此前是否已订阅。

已知取舍：任何人都能替别人的邮箱订阅，只靠每 IP 每小时 3 次、每邮箱每天 2 次的限流抑制滥用。如果出现大量冒名订阅或投诉，再考虑恢复双重确认。

---

## 12. 浏览量

- 文章页挂载 `PostViewTracker`，向 `POST /api/views` 提交 slug。
- API 按客户端与文章组合限流，目前每小时最多计数 24 次。
- 服务端使用 service role 调用 `record_post_view()`。
- 浏览总数存于 `post_views`。
- Studio 日志列表显示每篇浏览量，顶部显示总浏览量。
- 公开页面不展示浏览量。

---

## 13. SEO 现状

主要文件：`lib/seo.js`、`app/layout.js`、`app/sitemap.js`、`app/robots.js`、`app/feed.xml/route.js`。

已完成：

- 规范域名统一为 `https://www.chrisreading.ink`。
- 页面 canonical 和 `zh-CN` / `x-default` alternate。
- 全站 RSS alternate。
- 作者页 `/about`，含 `ProfilePage`、`Person`、`BreadcrumbList`。
- 文章 `BlogPosting`、作者链接、栏目链接、真实正文首图。
- 日志栏目独立 title/description 和 `CollectionPage`。
- Sitemap 包含栏目、文章、正文首图、书单、轨迹、作者页和隐私页。
- robots 排除 Studio、API、密码、确认和退订页。
- IndexNow 在后台内容变化后自动触发。
- Open Graph/Twitter 图片由 `/api/og` 动态生成。
- Google、Bing、百度、Yandex、Yahoo、360、搜狗、Naver 验证变量接口。

内容发布原则见 `SEO.md`。修改 metadata 时注意：Next.js 子页面的 `alternates` 会覆盖父级字段，所以自定义页面 metadata 必须显式保留 `types: RSS_ALTERNATES`。

SEO 不能保证即时流量。代码只负责可抓取、语义、内部链接和提交机制；长期效果仍依赖原创内容、外部链接、搜索需求和抓取周期。

---

## 14. 当前视觉系统

设计方向：纸张感、独立出版/编辑部气质、低饱和、避免常见 AI 紫蓝渐变与玻璃卡片。

### 14.1 主色

| Token | 色值 | 用途 |
|---|---|---|
| `--paper` | `#f4f0e7` | 主背景，旧纸米白 |
| `--paper-deep` | `#e9e1d4` | 次级纸张、区块背景 |
| `--ink` | `#27231e` | 深墨正文 |
| `--muted` | `#71695f` | 次级文字 |
| `--accent` / `--moss` | `#3f718c` | 纸靛蓝强调色 |
| `--accent-soft` | `#86a7b6` | 浅靛蓝线条 |
| `--line` | `#d2c8b8` | 纸张分隔线 |
| `--charcoal` | `#332e28` | 深色页脚 |

变量名 `--moss` 是历史遗留，现在实际代表蓝色。不要只为命名整洁而全局改名，除非完整搜索并验证所有页面、邮件和 Canvas。

### 14.2 字体

- 中文正文/标题：`Noto Serif SC`，长图优先 `Songti SC`。
- 英文/数据/后台标签：`IBM Plex Mono`。
- 英文引语可使用 Georgia 作为衬线补充。

### 14.3 CSS 层叠注意事项

- `app/globals.css` 保留了早期绿色变量。
- `app/public-theme.css` 对公开页面作用域重新定义新版纸靛蓝变量。
- `app/studio/studio.css` 对 Studio 重新定义相同新版变量。
- `app/home.css` 前部仍有旧暗色首屏规则，文件后部的 `2026 public refresh` 区块覆盖为当前浅色版本。
- 修改首页时必须读完整个 `home.css`，否则很容易改到已被后文覆盖的规则。
- 页眉页脚的样式只在 `app/components/site-chrome.css`，自带色板变量，不依赖页面作用域；`globals.css` 里有一条针对所有 `footer` 元素的旧规则，`site-chrome.css` 已显式覆盖。

### 14.3.1 字号与标题规则（2026-10-02）

- 需要阅读的信息（作者、日期、栏目、评分、按钮、表单标签、说明文字）最小 12px；只有纯装饰的英文小标签（如 `VOL. 01`、`SCROLL TO READ`）可以更小。
- 中文标题不用负字间距（`letter-spacing: 0`），字重 700；页面标题统一 `clamp(2.4rem, 5vw, 4rem)`，文章标题 `clamp(2.1rem, 4.6vw, 3.6rem)`。
- 文章页的正文、工具说明、分享、相关文章、评论共用同一列宽 `--log-col: 760px`；末尾区块标题约 1.35rem。

### 14.4 已确认的移动端要求

- 移动端首屏不显示“最新日志”纸张卡片；当前在 `max-width: 600px` 隐藏 `.hero-latest`。
- 首屏不加入冗长说明句。
- 日志分类不单独占据首页一整屏。
- 书单与轨迹位于日志之后，并各自具有不同的信息结构。
- 订阅和留言区域保持紧凑。
- 微信图片避免小号说明文字，手机上必须直接可读。
- 所有公开页面在 800px 以下使用同一个“菜单”下拉导航，链接点击区域至少 44px。
- 书单在 600px 以下是“小封面 + 文字”的紧凑列表，桌面端是封面网格；筛选按钮在手机上横向滑动，不吸顶。

---

## 15. 微信引流图片与分享资产

### 15.1 仓库内资产

目录：`public/share/`

- `subscribe-qr.png`：240×240
- `wechat-subscribe-cover.jpg`：900×383
- `wechat-subscribe-inline-v2.jpg`：900×600
- `wechat-cover-background.png`：1923×818
- 两个 SVG 排版源文件

这些是较早的绿黑配色版本，仍在生产仓库中。

### 15.2 最新独立版微信引流图

最新纸靛蓝版目前在仓库外：

```text
/Users/chris/Documents/Codex/2026-09-09/wo/wechat-subscribe-card/
├── index.html                 # 可编辑 HTML/CSS 源
├── subscribe-qr.png           # 原始二维码
└── wechat-subscribe-card.png  # 900×500 PNG 成品
```

配色：`#f4f0e7`、`#27231e`、`#3f718c`、`#d9e2e3`。文字为“面对复杂。保持欢喜。”和“扫码订阅作者个人网站”。

该最新版本目前没有复制到 `public/share`，也没有进入 Git 历史。如果下一步需要网站直接提供下载或替换旧微信素材，应明确选择目标文件名后再复制，并重新验证二维码。

---

## 16. 安全边界

### 16.1 绝对不能破坏的规则

- Service role key 永远不能进入客户端 bundle。
- 不能恢复“所有 authenticated 用户都是管理员”的旧策略。
- 评论公开读取不能直接 `select email,status`。
- 公共写入必须经服务器 API、origin 检查、长度限制和限流。
- 订阅确认、退订、密码重置页面必须 `noindex`。
- 后台和带令牌的页面不能加载任何第三方脚本（广告、统计）。从公开页进入后台必须整页跳转（普通 `<a>`，不要用 `next/link`），否则公开页已加载的脚本会留在后台。
- CSP 新增第三方域名时，只添加真实需要的最小范围。
- 删除或重命名公开 slug 前，要处理旧链接、轨迹引用、canonical、Sitemap 和 IndexNow。

### 16.2 当前防护

- RLS + 显式 `site_admins` 白名单。
- service role 仅服务器使用。
- 所有公开提交接口有大小限制。
- 订阅、评论、退订、浏览量有数据库限流。
- 公共表单含 honeypot 字段。
- 邮箱存在性使用通用响应。
- 安全响应头在 `next.config.mjs` 统一配置。
- HTML 邮件对用户内容转义，链接协议经过白名单。

---

## 17. 已知技术债与风险

1. **本地 `deploy-sync` 与远端提交历史不同**：必须从真实远端 main 开新分支，不要在 `deploy-sync` 上继续开发。
2. **没有自动化测试**：任何核心改动都依赖构建和人工回归。
3. **`.env.example` 不完整**：缺少 service role、Resend、cron、限流和站长验证变量。
4. **邮件仍保留旧绿色视觉值**：`lib/notifications.js` 和 `app/api/campaigns/route.js` 仍使用 `#efeee8 / #151713 / #526b3f`；功能正确，但视觉尚未完全统一到纸靛蓝。
5. **样式文件包含历史覆盖层**：尤其 `app/home.css` 和 `app/globals.css`，不要只读文件前半段。
6. ~~格式解析有两套入口~~：已于 2026-10-02 统一到 `post-format.js`。
7. **正文图片只支持远程 URL**：没有站内上传或 Supabase Storage UI。
8. **长图暂不绘制正文图片**：图片块会被跳过。
9. **Vercel 有两个部署项目**：只看一个成功可能造成误判。
10. **发布动作会群发真实订阅者**：生产环境不能随意把测试文章设为 published。
11. **浏览量是总量计数，不是独立访客分析**：限流只抑制高频重复，不代表严格 UV。
12. **根目录旧静态站仍在 Git 中**：可能误导新接手者。
13. ~~CSS 兼容性构建警告~~：已于 2026-10-02 修复，当前构建无警告。

---

## 18. 修改后的回归清单

### 18.1 所有修改

- [ ] `git diff --check`
- [ ] `NEXT_TELEMETRY_DISABLED=1 npm run build`
- [ ] 无新增构建警告
- [ ] 桌面与移动端都检查
- [ ] 不泄露 `.env.local` 和服务端密钥

### 18.2 首页/视觉

- [ ] Chrome 实际截图检查，不只看代码
- [ ] 600 px 以下不显示首屏最新日志卡片
- [ ] 导航菜单可键盘操作（Esc 关闭）；当前栏目高亮
- [ ] 390px 宽度下所有公开页面没有横向滚动
- [ ] 书单、轨迹、订阅、留言没有异常占高
- [ ] 纸靛蓝色值在公开页与后台一致

### 18.3 日志格式

- [ ] 网页端加粗/居中/标题/列表/引用正常
- [ ] 邮件中不显示原始 Markdown 标记
- [ ] 摘要图和全文图格式一致
- [ ] 中文标点不出现在错误行首
- [ ] 数字和中文基线一致
- [ ] 2499/2500/2501 字符边界测试
- [ ] 多页只有第一页显示标题
- [ ] 多页页码和 ZIP 文件名正确

### 18.4 数据与权限

- [ ] 未登录不能进入 Studio 数据
- [ ] 非管理员 Auth 用户仍无管理权限
- [ ] 匿名用户看不到评论邮箱、订阅者、浏览量
- [ ] 评论默认 pending，审核后才公开
- [ ] 退订令牌使用后旋转；后台不能恢复已退订用户

### 18.5 发布与 SEO

- [ ] canonical 指向 `www.chrisreading.ink`
- [ ] RSS alternate 未被子页面 metadata 覆盖
- [ ] Sitemap 包含新路径并排除私有路径
- [ ] robots 无误
- [ ] 两个 Vercel 部署都成功
- [ ] 真实域名关键页面返回 200

---

## 19. 常用检查命令

```bash
# 项目状态
git status --short
git log -10 --oneline --decorate
git remote -v

# 生产构建
NEXT_TELEMETRY_DISABLED=1 npm run build

# 查找环境变量使用（不会读取变量值）
rg -n "process\.env\." app lib next.config.mjs

# 查找所有路由
find app -name 'page.js' -o -name 'route.js' -o -name 'layout.js' | sort

# 线上 SEO 基础检查
curl -sS https://www.chrisreading.ink/robots.txt
curl -sS https://www.chrisreading.ink/sitemap.xml
curl -sS https://www.chrisreading.ink/feed.xml

# GitHub 真实 main（已安装 gh 且已登录时）
gh api repos/nkfandian/chris-field-notes/git/ref/heads/main --jq .object.sha

# 当前提交的 Vercel 状态
sha=$(gh api repos/nkfandian/chris-field-notes/git/ref/heads/main --jq .object.sha)
gh api repos/nkfandian/chris-field-notes/commits/$sha/status
```

---

## 20. 数据与凭证不在本文中的原因

本文故意不包含以下敏感数据：

- Supabase anon key 的实际值
- Supabase service role key
- Resend API key
- Cron secret
- IndexNow 私钥
- 管理员邮箱和密码
- 订阅者邮箱
- 评论者邮箱
- 任何确认/退订令牌

这些不是“缺少的交接资料”，而是必须通过 Vercel、Supabase 或安全密码管理器按权限获取的秘密。其他大模型只需拥有项目目录和必要的环境权限，即可依据本文完成代码修改；涉及生产数据或外部发送时，再使用对应受控凭证。

---

## 21. 当前结论

截至 2026-10-02：

- 线上站点已运行。
- 远端 `main` 是唯一的生产基线；本地 `deploy-sync` 只是历史开发线（见第 2.1 节）。
- 公共前端、Studio 和日志长图已经统一为纸张米白、深墨和纸靛蓝体系。
- SEO 作者页、栏目页、RSS、Sitemap、结构化数据和 IndexNow 已部署。
- 浏览量、单次确认订阅、评论审核、邮件投递状态（原子领取 + 批量发送）和管理员白名单已启用。
- 最新 900×500 微信引流图存在于独立工作目录，尚未并入网站仓库。

下一位接手者可以直接从本文的第 2、4、5、7、8、9、10、18、22 节开始工作，无需读取此前对话。

---

## 22. 变更记录

### 22.1 维护规则

- 每次修改项目，都在**同一个提交**中更新本文件：受影响的章节同步修改，并在下表追加一行。
- 新记录写在表格最上方（倒序）。
- 写清：日期、改了什么、为什么、接手者需要注意什么。提交 SHA 可选（同一提交内无法写入自身 SHA，可写上一条相关提交或留空，用 `git log` 对照）。
- 不在 Git 里的变化（Supabase 表结构/数据、Vercel 环境变量、仓库外素材）也必须记录在这里，因为它们不会出现在 `git log` 中。
- 只修改文档本身、不影响项目的提交，也简要记一行。

### 22.2 记录

| 日期 | 变更 | 原因 / 注意事项 |
|---|---|---|
| 2026-10-02 | 前端设计整理：①所有公开页面共用新的页眉导航和深色页脚（订阅、留言、链接），首页 ABOUT 弹窗改为直接进入 `/about`；②“核心判断”功能全部移除（文章页、后台编辑器、首页详情抽屉、搜索、SEO 描述；数据库列保留不读写）；③文章标题缩小、去掉负字间距，正文与末尾区块统一 760px 列宽，分享改为一行按钮；④书单页改为封面网格（手机为紧凑列表）并补上标题，短评可展开，高度从约 35000px 降到约 12600px；⑤轨迹页补标题与说明，节点改为“3 篇日志 · 10 本书”文字；⑥最新日志卡片显示真实编号；⑦信息类小字统一提到 12px 以上；⑧新增带页眉页脚的 404 页面，IndexNow 验证文件改用 rewrite；⑨修复 `align-items: end` 构建警告 | 用户要求统一导航、去掉核心判断并同步考虑移动端；所有页面在 1440px 和 390px 宽度下截图检查过，无横向滚动 |
| 2026-10-02 | 按代码审查修复：①AdSense 不再加载到后台和带令牌页面；②推送改为原子领取 + Resend 批量发送 + 幂等键，保存按钮防重复提交；③后台不能恢复已退订用户、有效订阅数只计 `active`；④首页不再把全部正文发给访客（270KB→73KB）；⑤网页正文改用 `post-format.js`，与邮件/长图一致；⑥手动群发改批量发送；⑦`CRON_SECRET` 未设置时拒绝定时接口，新增 `vercel.json` 每日定时任务；⑧已发布日志锁定 slug；⑨定时清理 `rate_limits`。另按用户要求把订阅改为单次确认（提交即生效） | 审查发现的安全、重复发信和一致性问题。**需要手动操作**：在 Supabase SQL 编辑器执行 `supabase/migrations/20261002_single_opt_in.sql`（激活历史待确认订阅者）；在两个 Vercel 项目设置 `CRON_SECRET`。网页渲染统一后，`legacy-5sal6qv1aqvcyaf7eu9u` 中以 `*` 开头的几行从错误的 “undefined” 变为斜体正文（原意可能是列表，需在后台把 `*` 改成 `- `） |
| 2026-10-02 | 第 0 节新增 0.1“给下一位 agent 的开场提示词”，替换原先的简短提示 | 用户在不同 agent 之间切换，需要一段可直接复制、包含读取远端文档和更新变更记录要求的提示词 |
| 2026-10-02 | 第 2.1 节改为“以实时核对为准”，不再写死远端提交 SHA；新增第 22 节变更记录；第 0 节加入“同一提交更新本文件”的规则 | 写死的 SHA 每次提交后都会过时；变更记录让下一位接手者快速了解最近变化 |
| 2026-10-02 | 新增 `PROJECT_HANDOFF.md` 到仓库根目录（提交 `533d273`） | 让其他开发者或大模型无需历史对话即可接手；仅文档变更，线上代码不变 |

# FreedomPort 智能入口 (smart-entry)

一个独立、轻量、快速加载的 FreedomPort 智能入口页面。页面打开后同时测试国内入口与
国际入口的 HTTP 访问延迟，推荐并自动跳转到延迟更低的入口。

- 国内入口：<https://cn.freedomport.cc>
- 国际入口：<https://app.freedomport.cc>

页面只负责入口测速与跳转，不包含登录、注册、套餐、订阅或用户中心功能。

## 技术栈

- Vue 3（Composition API）
- Vite
- TypeScript
- 原生 Fetch API
- 原生 CSS（无 Tailwind、无 UI 框架、无状态管理库、无外部字体/图片）

## 目录结构

```
smart-entry/
├── public/
│   ├── favicon.png          # 站点图标（256×256，圆角白底 + 品牌图形）
│   ├── logo-glyph.png       # 页眉品牌图形（透明底）
│   └── speed-test.gif       # 1×1 GIF 占位参考（正式以服务器配置为准）
├── src/
│   ├── components/
│   │   ├── EntryCard.vue            # 入口状态卡片
│   │   ├── TestProgress.vue         # 测速进行中指示
│   │   ├── RecommendationPanel.vue  # 推荐结果与倒计时
│   │   ├── ThemeToggle.vue          # 右上角明暗模式切换（纯图标按钮）
│   │   └── DebugPanel.vue           # 调试面板（?debug=1）
│   ├── composables/
│   │   ├── useEntryTest.ts          # 测速编排、并发与 runId 并发安全
│   │   └── useTheme.ts              # 明暗主题：系统偏好 + 手动切换（sessionStorage 记忆）
│   ├── config/
│   │   └── endpoints.ts             # 入口配置（硬编码 + Vite 环境变量覆盖）
│   ├── services/
│   │   ├── latency.ts               # 测速模块（Fetch / Image 备用）
│   │   └── ip.ts                    # 出口 IP 查询（第三方服务，测速后发起）
│   ├── utils/
│   │   ├── median.ts                # 中位数纯函数
│   │   ├── selection.ts             # 入口选择算法纯函数
│   │   ├── query.ts                 # URL 查询参数解析
│   │   └── redirect.ts              # 跳转封装
│   ├── types/
│   │   └── latency.ts               # 类型定义
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── tests/
│   ├── median.test.ts
│   ├── selection.test.ts
│   ├── latency.test.ts
│   ├── ip.test.ts
│   └── app.test.ts
├── .env.example
├── index.html
└── package.json
```

## 本地开发

```bash
npm install
npm run dev
```

常用命令：

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run test` | 运行单元测试（Vitest） |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 预览生产构建产物 |

## 环境变量

全部可配置项见 [`.env.example`](./.env.example)，均带安全默认值，未配置时回退到硬编码地址。

```env
VITE_CN_TARGET_URL=https://cn.freedomport.cc
VITE_CN_PING_URL=https://cn.freedomport.cc/ping
VITE_CN_FALLBACK_PING_URL=https://cn.freedomport.cc/speed-test.gif
VITE_GLOBAL_TARGET_URL=https://app.freedomport.cc
VITE_GLOBAL_PING_URL=https://app.freedomport.cc/ping
VITE_GLOBAL_FALLBACK_PING_URL=https://app.freedomport.cc/speed-test.gif
# VITE_IP_LOOKUP_URL=https://api.ipify.org
```

说明：

- `VITE_IP_LOOKUP_URL` 为出口 IP 查询的第三方服务端点，应返回 `text/plain` 纯 IP 且允许跨域。
  不配置时默认依次尝试 `https://api.ipify.org` 与 `https://api.ip.sb/ip`（第一个可用结果生效）。
  置为空字符串可完全禁用出口 IP 显示。
- 出口 IP 查询在测速完成后才发起，不会干扰延迟测量。
- 出口 IP 反映的是浏览器当前网络的出口地址（第三方服务所见），与选择哪个入口无关。

注意：

- 目标跳转地址只允许来自可信配置（`src/config/endpoints.ts`）或上述环境变量。
- **禁止**通过 URL 查询参数指定目标地址，避免开放重定向漏洞。
- 前端不包含任何密钥或敏感配置。

## 明暗模式

- 默认跟随系统 `prefers-color-scheme`；右上角图标按钮可手动切换明亮 / 暗黑模式。
- 手动选择保存在 `sessionStorage`（仅当前标签页会话，不使用 `localStorage`），保存后不再跟随系统。
- 首帧主题由 `index.html` 内联脚本确定，避免加载时闪烁。

## 测速原理

1. 向每个入口的 `/ping` 发送极小 HTTP GET 请求（`cache: no-store`、`credentials: omit`、
   `redirect: follow`、随机查询参数防缓存、`AbortController` 超时 2500ms、`performance.now()` 计时）。
2. 每个入口执行 1 次预热请求（不计入结果）+ 3 次正式请求，国内与国际入口并发测试。
3. Fetch 因 CORS/网络失败时，自动改用 `Image` 对象加载 `/speed-test.gif` 备用测速
   （结果显示为「兼容测速」）。
4. 最终延迟取成功样本的**中位数**（不用最小值，避免偶发抖动误判），按中位数从低到高选择入口。
5. 两个入口中位延迟相同时默认选择国内入口，保证结果确定。
6. 推荐结果展示后倒计时 2 秒，通过 `window.location.replace()` 跳转（避免返回键重复测速）。

支持的 URL 参数：

| 参数 | 作用 |
| --- | --- |
| `?manual=1` | 完成测速并展示推荐，不自动跳转（便于测试与截图） |
| `?debug=1` | 展示每次测速原始样本、Fetch/Image 方式、失败原因与起止时间 |
| `?no-test=1` | 仅开发环境生效，跳过真实网络测试使用内置模拟结果 |

## 测试

测试使用 Vitest，全部 mock 了 Fetch、Image 与计时器，不访问生产域名。

```bash
npm run test
```

覆盖：中位数（单/双/三/偶数/空/未排序样本）、入口选择（各失败组合、平局默认国内、部分样本成功）、
测速控制（成功、超时、中止、Fetch 失败后图片备用、重新测速旧结果不生效、卸载后不更新状态）。

## 测速端点部署说明（需人工配置）

> 本仓库不修改任何生产服务器。以下配置需要由运维在自由港入口的 Nginx /
> Cloudflare 上人工完成，且**国内与国际入口必须保持一致**。

### `/ping`

建议 Nginx 配置：

```nginx
location = /ping {
    default_type text/plain;
    add_header Access-Control-Allow-Origin "*" always;
    add_header Timing-Allow-Origin "*" always;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header X-Content-Type-Options "nosniff" always;
    return 200 "ok";
}
```

要求：

- 响应正文保持极小（例如 `ok`）。
- `Access-Control-Allow-Origin: *`、`Cache-Control: no-store`。
- 不要让 `/ping` 返回 301/302，不经过登录鉴权，不设置 Cookie，不重定向到首页。
- 确保 OPTIONS / GET 请求不被拦截。

### `/speed-test.gif`

- 部署一个 **1×1 像素静态 GIF**（本仓库 `public/speed-test.gif` 可作为参考素材）。
- 设置 `Access-Control-Allow-Origin: *` 与 `Cache-Control: no-store`。
- 不经过登录鉴权、不设置 Cookie、不重定向到首页。
- 国内与国际入口必须返回相同大小的文件。

### Cloudflare 注意事项

1. `/ping` 与 `/speed-test.gif` 不应被 Cloudflare Cache Rules 缓存。
2. 不应启用会返回挑战页面的安全规则。
3. 不应经过登录验证。
4. 两个域名的测速端点配置必须保持一致。
5. 如果两个入口接入同一 Cloudflare 边缘，测速主要反映「用户到边缘 + 后续响应」的差异，
   不能完全等同于源站真实 RTT。
6. 不要用首页作为测速文件，不要用 favicon 作为正式测速文件。
7. 确保响应不携带任何用户信息。

## 部署

入口页建议部署在独立域名（例如 `https://www.freedomport.cc`），**不要**默认部署到
`https://cn.freedomport.cc` 或 `https://app.freedomport.cc`，避免入口页本身成为测速目标、
避免预热偏差与返回后重复跳转。

### 构建

```bash
npm ci
npm run type-check
npm run test
npm run build
```

产物输出到 `dist/`。

### Nginx 静态站点示例

```nginx
server {
    listen 80;
    server_name www.freedomport.cc;

    root /var/www/freedomport-smart-entry/dist;
    index index.html;

    # 入口页 HTML 禁止缓存
    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    # 带哈希的 JS/CSS 可长缓存
    location ~* \.(js|css)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri /index.html;
    }
}
```

注意：

- HTML 使用 `Cache-Control: no-cache`，避免用户拿到旧入口逻辑。
- 带哈希的静态资源使用 `public, max-age=31536000, immutable`。

## 隐私说明

- 前端不请求定位、不获取 GPS/摄像头/麦克风/剪贴板，不生成浏览器指纹，不上报 IP。
- 仅向两个测速端点发送极小 GET/图片请求用于计时。
- 出口 IP 显示依赖第三方服务（默认 api.ipify.org / api.ip.sb）：浏览器会直接向该服务发起一次
  GET 请求，对方因此能看到访问者的出口地址——这正是该服务的用途。查询在测速完成后才发起；
  将 `VITE_IP_LOOKUP_URL` 置空可完全禁用。
- 只会在 `sessionStorage` 中保存最后一次选择的入口 ID、中位延迟、测试时间，以及手动选择的
  明暗主题（均为非敏感信息），不使用 `localStorage`。

## 尚需人工完成的事项

- [ ] 在 cn 与 app 两个入口分别配置 `/ping`（见上文 Nginx 示例）。
- [ ] 在 cn 与 app 两个入口部署 `/speed-test.gif` 1×1 占位图并配置响应头。
- [ ] 如使用 Cloudflare，按上文 10 条注意事项配置缓存与安全规则。
- [ ] 将 `dist/` 部署到独立域名并配置 Nginx / 静态托管，配置 HTML 与静态资源缓存策略。
- [ ] 部署完成后，可用 `?debug=1` 验证每个入口 Fetch 与 Image 两种测速方式均生效。

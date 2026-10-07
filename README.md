# 我的地点 · 私人打卡手账

> 去过的地方，拍张照、写两句，自动整理成一本能翻、能找、能分享的地点手账。

简体中文 | [English](./README.en.md)

线上地址：https://place-journal-xi.vercel.app（手机浏览器打开即可用，也可“添加到主屏幕”当 App 用）

<p>
  <img src="docs/screenshots/screen-01-home-gallery.png" alt="画廊首页：演示数据的地点卡片" width="200" />
  <img src="docs/screenshots/screen-02-find.png" alt="找地点：自然语言搜索与条件筛选" width="200" />
  <img src="docs/screenshots/screen-03-tags.png" alt="标签与维度管理页" width="200" />
</p>

## 这是什么

这是一个手机优先的私人地点手账（PWA，即能安装到手机主屏幕的网页应用）：每次去一个地方，拍几张照片、写下感受，应用会帮你按地点、标签、时间整理好。以后想找“那家很安静的咖啡馆”，直接用一句话搜出来；想分享某次行程，可以生成一张分享卡或链接，私密感受不会被带出去。

适合：喜欢记录去过的地方、想按地点回顾生活的人。数据先存在本机（IndexedDB，一种浏览器本地数据库），登录后可同步到云端（Supabase）。

## 核心功能

- **记一笔**：多张照片 + 大段感受，支持微信语音输入直接写进去；可设封面、点图放大看。
- **AI 帮你整理**：自动提炼地点、标签和一句话介绍，确认后入库；没配 Key 时也能本地预填先用。
- **按地点回顾**：画廊、地点时间线、标签筛选，找得到以前去过的地方。
- **一句话找地点**：自然语言搜索 + 条件筛选，例如“带露台的咖啡馆”。
- **分享但保私密**：单地点卡片、多地点清单、地图总览三种分享，公开的只是只读快照，原始感受默认不出卡，可随时撤销。
- **离线也可用**：没网先记在本机，有网再同步；同步结果和待上传在“我的”里看得见。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:5173
```

打开后会预置 6 个带标注的演示地点，可在「我的」里一键清除。

生产构建预览：

```bash
npm run build && npm run preview -- --port 4175
```

## 配置

复制 `.env.example` 为 `.env.local` 后填入真实值（改完重启 dev；`VITE_` 开头变量改动后需重建 Docker 镜像）。真实 Key 只放 `.env.local` 和 Vercel 环境变量，绝不提交到 Git。

| 变量 | 用途 | 没填会怎样 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | 云同步 + 登录（浏览器端只放这两个） | 仅本机使用，不能多端同步 |
| `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_JSCODE` | 地图底图（高德） | 显示示意底图 |
| `AI_PROVIDER_ORDER` | AI 服务降级顺序，可选 openrouter / deepseek / opencode | 未配置时本地推测预填 |
| `OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` / `OPENCODE_API_KEY` + `OPENCODE_BASE_URL` + `OPENCODE_MODEL` | 服务端 AI Key（三选一即可） | 同上 |

前端「我的 → AI 连通性测试」可一键验证 AI 是否接通。

## 部署

- **Vercel**：Import 本仓库 → 按 `.env.example` 填环境变量 → 部署。后把正式域名加入 Supabase Auth 回调白名单和高德 Key 域名白名单。`vercel.json` 已在仓库中。
- **自托管 Docker**：见 `compose.yaml`（默认端口 8081），构建时传入 `VITE_*` 变量。

## 详细文档

- 产品与技术方案：`docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md`
- 当前状态快照：`docs/handoff/HANDOFF.md`
- AI Key 获取与填写：`docs/AI模型Key配置丨2026-09-20.md`

## 已知限制

- 录音转写和封面 OCR 已按需求下线，改走手机输入法语音直输。
- 地图需配置高德 Key 并加域名白名单，否则只显示示意底图。
- 多端同时编辑同一条记录时，按更新时间保留新者；出冲突可在「我的 → 冲突裁决」处理。

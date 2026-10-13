# 我的地点 · 私人打卡手账

> 去过的地方，拍张照、写两句，自动整理成一本能翻、能找、能分享的地点手账。

简体中文 | [English](./README.en.md)

线上地址：https://place-journal-xi.vercel.app（手机浏览器打开即可用，也可“添加到主屏幕”当 App 用）
同一个仓库还有**安卓 App**（`mobile/`），两边登录同一个账号、看同一批记录。

<p>
  <img src="docs/screenshots/app-01-gallery.png" alt="画廊：按记录或按地点浏览的卡片墙" width="172" />
  <img src="docs/screenshots/app-02-record.png" alt="记录：选地点、加照片、写感受" width="172" />
  <img src="docs/screenshots/app-03-find.png" alt="找地点：一句话搜索加条件筛选" width="172" />
  <img src="docs/screenshots/app-04-mine.png" alt="我的：同步状态、外观主题与数据" width="172" />
</p>

## 这是什么

一本只给自己看的地点账。每次去一个地方，拍几张照片、把感受说清楚，应用帮你按地点、标签、时间整理好。以后想翻“去年在海边那家咖啡馆”，直接一句话搜出来；想把某次行程发给朋友，生成一张卡片或链接，私密感受不会被带出去。

适合喜欢记录去过的地方、想按地点回顾生活的人。数据先存在你自己的设备上，登录之后才同步到云端；不登录也能完整使用。

## 核心功能

- **记一笔**：多张照片 + 大段感受，支持用微信语音输入法直接说进去；可设封面，点图放大看。
- **AI 帮你整理**：把你说的原话提炼成地点、标签、一句话介绍和公开分享理由，你确认后才入库；没配 AI Key 时也能本地预填先用。
- **按地点回顾**：画廊、地点时间线、标签与维度筛选，找得到以前去过的地方。
- **一句话找地点**：自然语言搜索 + 评分/地区/类型/场景条件筛选，例如“带露台的咖啡馆”。
- **分享但保私密**：单地点卡片、多地点清单、地图总览三种分享，公开的只是只读快照，原始感受默认不出卡，可随时撤销。
- **离线可用、双端同步**：没网先记在本机，有网再上传；同步进度、待上传条数和冲突裁决都在「我的」里看得见。
- **换装不影响记录**：网页版三套配色（暖纸手账 / 票根台账 / 竹青园林），安卓端浅色 / 深色 / 跟随系统，切换即时生效且不丢状态。

## 快速开始

网页版（PWA）：

```bash
npm install
npm run dev        # http://localhost:5173
```

打开后会预置 6 个带标注的演示地点，可在「我的 → 清除演示数据」一键清掉。

生产构建预览：

```bash
npm run build && npm run preview -- --port 4175
```

安卓端（Expo + React Native）：

```bash
cd mobile
npm install
npm run android    # 连上手机或模拟器后启动
```

自用安装包：`cd mobile/android && ./gradlew assembleRelease`，产物在 `mobile/android/app/build/outputs/apk/release/`。

## 配置

复制 `.env.example` 为 `.env.local` 后填入真实值（改完重启 dev；`VITE_` 开头变量改动后需重建 Docker 镜像）。真实 Key 只放 `.env.local` 和 Vercel 环境变量，绝不提交到 Git。

| 变量 | 用途 | 没填会怎样 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | 云同步 + 登录（浏览器端只放这两个） | 仅本机使用，不能多端同步 |
| `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_JSCODE` | 地图底图（高德） | 显示示意底图 |
| `AI_PROVIDER_ORDER` | AI 服务降级顺序，可选 openrouter / deepseek / opencode | 未配置时本地推测预填 |
| `OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY` / `OPENCODE_API_KEY` + `OPENCODE_BASE_URL` + `OPENCODE_MODEL` | 服务端 AI Key（三选一即可） | 同上 |

安卓端只需 `mobile/.env` 里的 `EXPO_PUBLIC_*`（见 `mobile/.env.example`）：填云端地址和 AI 服务地址即可，AI 的 Key 只在服务端，客户端拿不到。

前端「我的 → AI 连通性测试」可一键验证 AI 是否接通。

## 部署

- **Vercel**：Import 本仓库 → 按 `.env.example` 填环境变量 → 部署。再把正式域名加入 Supabase Auth 回调白名单和高德 Key 域名白名单。`vercel.json` 已在仓库中。
- **自托管 Docker**：见 `compose.yaml`（默认端口 8081），构建时传入 `VITE_*` 变量。

## 项目结构

- `src/`：网页版（React 18 + TypeScript + Vite + Tailwind，vite-plugin-pwa 提供离线与安装）
- `mobile/`：安卓 App（Expo SDK 57 + React Native 0.86.3，本机库用 expo-sqlite）
- `api/`：部署在 Vercel 的服务端接口（AI 整理）
- `supabase/`：云端表结构迁移

## 详细文档

- 产品与技术方案：`docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md`
- 当前状态快照：`docs/handoff/HANDOFF.md`
- AI Key 获取与填写：`docs/AI模型Key配置丨2026-09-20.md`
- 安卓端说明：`mobile/docs/`

## 已知限制

- 录音转写和封面 OCR 已按需求下线，改走手机输入法语音直输。
- 地图需配置高德 Key 并加域名白名单，否则只显示示意底图。
- 多端同时编辑同一条记录时，按更新时间保留新者；出冲突可在「我的 → 冲突裁决」处理。
- 安卓端目前只出 Android 包，未上架应用商店。

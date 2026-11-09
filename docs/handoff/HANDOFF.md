# HANDOFF 丨 私人打卡地点工具（011 · com.wanghoufan.placejournal）

> 恢复入口，不是档案馆。历史交接全文（2026-09-04 ~ 2026-10-14，1042 行）见 `HANDOFF-ARCHIVE-2026-09_10.md`。
> 最近一次阶段复盘：2026-11-10。

## §0 常驻指针

| 内容 | 唯一落点 |
|---|---|
| 架构 / 构建 / 签名 / 端口 / 源码热点 | `docs/architecture-facts.md` |
| 风险与未决隐患 | `docs/risks.md` |
| 踩坑经历（勿重复踩） | `docs/pitfalls.md`（根 `agent.md` 只是指针，按 gitignore 不入库） |
| 历史交接全文 | `docs/handoff/HANDOFF-ARCHIVE-2026-09_10.md` |
| QA / 验收报告 | `docs/qa/` |

- 唯一开发仓 = 本目录，分支 `wanghoufan/master`。旧指针里的 `1.Active/master-2` **已不存在**，勿按旧路径找。
- 双端：PWA（Vite，自托管 Docker 占 8081/8082）+ 安卓（Expo prebuild，`com.wanghoufan.placejournal`）。

## §1 当前进展（2026-11-10）

- 版本 **0.1.2 / versionCode 3** 已出包并覆盖安装到 3 台设备（只用 `install -r`，`firstInstallTime` 均未变）：OPPO `07:35:58`、Redmi Note 12T Pro `07:40:33`、Redmi Note 11 5G `07:40:42`（均 2026-11-10）。
- APK：`mobile/android/app/build/outputs/apk/release/app-release.apk`，SHA-256 `67d64846f33957d79f59fce860a4bbafecb2b6f090fdcd7addb760f71f967fd0`，118MB，2026-11-09 22:58 构建。
- 本轮三处真机修复（已打进 0.1.2，代码改动 2026-11-10 已 commit）：
  1. 保存记录后按返回键直接退桌面 → `record.tsx` 改 `navigate('/')` + `push('/entry/<id>')`，`ai-confirm.tsx` 改 `dismissTo('/')` + `push`。
  2. 9 张照片排成 2 列 5 行 → `entry/[id].tsx` 照片格改 `width:'31.3%'` + `aspectRatio:1`（3 列）。
  3. 给旧记录打「匹克球」后按该标签筛不到 → `find.tsx` 改为逐条记录过滤后按地点重新聚合，`best: matched[0]`。
- 装后数据：OPPO 8 地点 / 8 记录 / 28 照片 / 31 标签 / 冲突 0；Note 12T Pro 7→7；Note 11 5G 3→3。

## §2 下一步

1. 确认 OPPO「记录 9→8」的结论（§3-1），确认后再动同步或数据清理。
2. 若用户要求逐项复验三处修复，按 `agent.md` 的真机验收纪律走 `uiautomator dump` + 截图双证。
3. commit 后按用户授权决定是否 push（push 需二次确认）。

## §3 未完成

| # | 事项 | 状态 |
|---|---|---|
| 1 | OPPO 覆盖安装后「记录」由 9 变 8（地点 8 不变），已排除 pull 删行、迁移 DELETE、签名不符、整包重装 | **待用户确认**缺的第 9 条是否是其在意的记录 |
| 2 | OPPO 上两条旧测试记录（无图、含 tennis go）去留 | 待用户拍板：`A1` 保留 / `A2` 删除 |
| 3 | 历史文档脱敏改动 6 份仍未提交：`.workbuddy/memory/2026-09-03.md`、`docs/db/ENV1-实测记录丨2026-09-04.md`、`docs/qa/BUGS_DEV-14.md`、`docs/qa/QA-REPORT丨V0.2.md`、`docs/handoff/接续恢复开发提示词丨2026-09-19.md`、`docs/handoff/…10-13 丨 L3 产品审查后.md`；另有未跟踪目录 `docs/retrospective/`（2026-10-30） | 待确认是否一并入库 |
| 4 | 历史遗留：云端 `tag_dimensions`/`tags` 被清导致 `tags_dim_owner_fk`，Note 12 Pro 曾 31 条冲突；根因未单点定死 | 未处理 |
| 5 | 等用户选自动化候选 `A1/A2`、skill 候选 `S1`（阶段复盘 2026-11-10 提出） | 未选 |
| 6 | 本轮 commit `7034f0f` 在 `wanghoufan/master`，该分支**未设上游**；push 需用户授权并确认推到哪条远端分支 | 未 push |

## §4 红线

- 真机：所有 adb 命令必须 `-s <serial>`；序列号不进报告/文档；覆盖安装只用 `install -r`，不卸载（卸载＝丢数据）。
- 构建：出包前先 `apksigner verify --print-certs` 比对签名（见 `docs/risks.md` R1）；改完 JS 必须带 `--rerun-tasks`。
- 未获用户明确指令不得 `commit` / `push`（push 二次确认）；不 `git add -A`，不 `reset/checkout` 掉工作区成果。
- 不删用户真实数据；造测试数据用 ASCII 前缀；临时文件放仓内 `temp/`。
- 密钥只进 `mobile/.env.local` 与 `mobile/keystore/`（均 gitignored）；`service_role` 绝不进前端或 Git。
- 全部 Supabase 查询走 `supabase.schema('habit_tracker')`；未授权禁动 `Services/`、`DockerData/`、`DockerBackups`。

## §5 三日流水（只留 11-08 起）

- **11-08**：踩坑上收第三批A（`.gitignore` 新增 `mobile/android/app/debug.keystore`）；一批账号/序列号脱敏改动（见 §3-3）。
- **11-09**：修 3 个 OPPO 真机 Bug（返回键退出、照片列数、标签筛不到）；bump `0.1.2 / vc3`；临时改名 `keystore.properties` 用 `debug.keystore` 出包并 OPPO 验收。
- **11-10**：0.1.2 推送 3 台并复核数据；发现 OPPO「记录 9→8」；阶段复盘（HANDOFF 归档精简 + 新建 `architecture-facts.md` / `risks.md` / `pitfalls.md`）。

## §6 接续提示词

先读本文件 §0–§5，再读 `docs/pitfalls.md` 与 `docs/risks.md` 后动手；任何真机操作前先确认签名来源与 `adb -s` 目标机，覆盖安装只用 `install -r`。未获用户明确指令不得 commit / push。

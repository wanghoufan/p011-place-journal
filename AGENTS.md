# AGENTS.md — 个人打卡小工具（地点手账 PWA + 安卓 App）

<!-- ORCA-RULES-BLOCK:BEGIN -->
<!-- 本区块由治理母版 scripts/sync-old-projects.sh 于 2026-09-29 注入；只增不删，可重复运行原地更新。 -->
<!-- 本项目 AGENTS.md 的其余内容（项目专属规矩）保持原样，冲突时以本区块为准。 -->
## ORCA 规则增量（母版 2026-09-29-产品验收）

> 本区块只写**对外通用**的机制增量；派工细节见 `docs/roles/`，账本口径见下方条目。

- **产品验收（2026-09-28 定）**：开发完成的判断来自**用户可见要求的覆盖证据**，不只看单测／构建／代码审查／工具调用成功。
  - 验收标准写在计划里：Phase1 给每条用户可见要求编一条可观察可测的**验收条目（AC）**，并标出**关键 AC**（对应 P0／blocking P1／核心用户路径／必要视觉交互呈现）；**关键 AC 集合不得为空**。
  - 证据落 `docs/qa/` 的**产品验收追踪矩阵**（照 `docs/qa/BUGS.template.md` 同名节）。
  - **不可放行三情形**（命中任一不得判 `PASS`）：①关键产品 DoD／AC 未测；②关键任务涉及的**每个**可见操作控件未实际点击并观察到页面／锚点／状态变化（只验 `href` 存在不算）；③验收证据缺失。
  - 视觉验收最小覆盖：关键用户任务逐条走通、按项目要求检查桌面与窄屏、用边界样本（奇偶条目数／长标题长正文／空状态）检验对齐·换行·裁切·溢出·可读性、留真实浏览器截图。
  - **用户签收**：发布类型为**首次发布**的，用户签收通过才算完成（签收前状态记未完成）；迭代更新与局部修复不强制签收。签收属 **Human Gate 范畴（用户参与）**，**不是新增 QA Gate**。
- **体系更新三件套（2026-09-29 定）**：①本项目规则文件改动后与母版对齐（用 `bash scripts/sync-old-projects.sh` 或按《迁移整理提示词》取包，**备份不覆盖**）；②账本内容**不重写**（实绩历史），只做 schema 校验 `node scripts/model/check-ledger.mjs docs/model`（须 `LEDGER-OK`）；③**HANDOFF 记一行**。**老项目无两包概念，故母版的「同步两包＋更新对外概览」不适用。**
- **派工跨目录禁令（2026-09-29 定）**：派 opencode 通道角色（supervisor／neat-freak／experience-recorder）时，任务里读写本仓以外目录（如 `/tmp`、`1.Active/` 等）会被 `external_directory` 权限自动拒、步骤静默失败，可能让角色误报已做也易反复盲试烧额度（禁盲试）；派单前处置二选一——①临时文件改到仓内已 gitignore 的 `temp/`，②先取得用户授权；codebuddy／codex 通道无此限制。
- **红线（2026-09-29 增补）**：产品验收未落盘或关键 AC 未测、不得报完工/收工；首次发布未取得用户签收、不得报完工/收工。
- **本项目迁移状态**：`docs/model/GOVERNANCE-STATE.json`（`rules_version`／`synced_at`／`project_phase_field`／`task_ledger_rows`／`agents_needs_manual_merge`／`product_acceptance_ac_added`）。
- **存量项目待办（不自动做，需项目 TM 判断）**：本项目实绩 Plan 需补「视觉与交互验收标准（AC 编号）＋关键 AC 集合＋发布类型」，否则新规则下收尾会被判**计划缺项**；完成后把 `product_acceptance_ac_added` 置 `true`。
<!-- ORCA-RULES-BLOCK:END -->


> 下次会话恢复上下文的唯一规则入口（≤60 行）。详述见 `docs/handoff/HANDOFF.md` §0 与 `README.md`。

**一句话定位**：移动优先的地点手账——**PWA（`src/`）+ 安卓 App（`mobile/`）双端**：拍照/写感受 → AI 整理入库 → 按地点/标签/时间回顾 → 自然语言找地点 → 分享快照。PWA 本地优先（IndexedDB）+ Supabase 云同步；安卓本地 expo-sqlite + 复用同一 Supabase（`habit_tracker`）。

**怎么跑起来**
```bash
npm install
npm run dev        # http://localhost:5173  改 .env.local 后需重启 vite
npm run build && npm run preview -- --port 4175
```
Node: `/Users/zzymima0000/.workbuddy/binaries/node/versions/22.22.2-2/bin/node`；端口约定 5173/4175/8081，勿占 3000/3100。

**技术栈**：React 18 + TS 5 + Vite 5 + Tailwind + vite-plugin-pwa；IndexedDB(via idb) + outbox 同步引擎；Supabase JS (`habit_tracker` schema, `table()` helper)；Vercel Functions (`api/`，现仅 `ai-organize`)；高德 JS API / OpenRouter|DeepSeek|OpenCode（三适配器，`OPENCODE_MODEL=glm-5.3-flash`）。录音/ASR 与封面 OCR 已按用户决定整条下线。

**目录与约定**
- `src/lib/sync.ts` 唯一同步引擎（revision 乐观锁、`ensureTags/PlacesInCloud`、`sweepDirtyRows`、`pullRemote` 保护 outbox）；`src/lib/supabase.ts` 固定 `DB_SCHEMA='habit_tracker'`；`src/lib/idb.ts` 本地库；新增 `theme.ts`（暖纸/票根/竹青）、`shareCard.ts`（canvas 长图，感受永不出卡）、`uuid.ts`（http 局域网 polyfill）；`scripts/deploy.sh` 规范部署（Docker V1.1）。
- `docs/handoff/HANDOFF.md` §0 为现役收工快照（2026-10-02 在役：安卓端恢复出包装真机、分支站错位待归位、tab 图标待用户拍板）；`docs/acceptance-l2/`、`docs/qa/`、`docs/db/ENV1-实测记录丨2026-09-04.md` 为证据；数据库治理权威在 `alw丨数据库管理专家/项目审查丨habit_tracker/`。
- 全部查询走 `supabase.schema('habit_tracker')`；禁止业务表进 `public`、禁止整库回写、禁止 `service_role` 进前端/Git。

**安卓端与分支纪律（2026-10-02 补，必读）**
- **本仓是双端**：`src/`＝PWA；`mobile/`＝安卓 App（Expo SDK 57 / RN 0.86.3 / expo-router 57，`mobile/android/` 为 Gradle 工程）。PWA 代码里找不到安卓功能不是"没有"，是**看错了分支**。
- **一上手必须先查分支**：`master`(=`67900b0`, 09-06) 落后 25 个提交、分叉点就是它自己、无任何独有提交；安卓端工作**从未合进 master**，最新在 `wanghoufan/master`(=`b031fcc`, 09-22)，比 `origin/master`(=`d83d61d`) 多 1 个未推送提交。查任何"某分支有没有某目录"一律用 `git ls-tree -r <branch> -- <path>`，**禁止拿当前分支的结论代替全部分支**。
- **`stash@{0}` 是旧版**（"Recovered Playground worktree 011 2026-10-01"，内容更旧：app 名还是「私人打卡手账」）。判断新旧必须 **diff 内容**，不看提交日期或信息。注意 `git diff <ref> -- <path>` 方向是 `<ref> → 工作区`，**`-` 侧才是 `<ref>` 的内容**。
- **搬目录／恢复代码前必查三处忽略**：`.gitignore`、**`.git/info/exclude`（本地排除、不随仓库走，最易漏）**、`git ls-tree -r <branch>` 实查分支。`mobile/android/` 目前被 `.git/info/exclude:9` 排除、任何分支 0 提交，是安卓端唯一未备份部分。
- **出包／装机**：自用一律 `./gradlew assembleRelease`（release 变体本就签 `debug.keystore`，合法）；**debug 包不含 bundle，装上必黑屏**。SDK 在 `~/android-toolchain/sdk`（非 `~/Library/Android/sdk`），4 个 ABI 约 5–6 分钟，别当卡死。Docker 占用 8081/8082 **不得关闭**，Metro 一律 8083 + `adb reverse tcp:8081 tcp:8083`。**装完必须独立验证**：停 Metro + `adb reverse --remove-all` + 重启 app。
- **缺字形类 UI 问题**：`mobile/app/(tabs)/_layout.tsx` 从未写 `tabBarIcon`，expo-router 会渲染内置占位符 `⏷`(U+23F7, `MissingIcon.js`)；两台机器因字体 fallback 不同会一台空白一台豆腐块，**同一 APK、同一 UI 树，不是版本分裂**。用 `uiautomator dump` 看 `text=` 暴露占位字符，比截图放大快。
- **验收纪律**：用户报"UI/软件不一样"，先证伪版本分裂再解释——比对各机 `pm path`+`md5sum`、`uiautomator dump` 比节点结构，最后才找原因。**改动用户可见呈现前先 dump 一遍基线**，别装完才报。

**当前状态与下一步**
- 已完成（2026-09-07，开发暂停）：M0–M6 + 主题系统 + 分享长图/卡片图 + 标签真删 + Find 分离；S1（`20260903141849`）/S2/L2_PASS/TAG_FIX_PASS/QA_V02_PASS/QA_Vercel_PASS_WITH_BLOCKED；ENV-1 已关闭；ASR 真转写曾PASS后整条下线（改走微信语音输入）；AI（`glm-5.3-flash`，12s 降级保留）全通；Docker 8081 已上线（healthy）；Vercel 生产 `https://place-journal-xi.vercel.app` 已上线+验收；09-06/07 十一批：灯箱相册＋换设备远端图根治＋同步可靠性（锁超时/毒丸停放/推拉解耦/结果可视化/上传拉取分段超时）＋地点改名/搬家（QA第二轮P1_PASS）＋感受与公开理由分框＋Cover自适应铺满＋AI连通性测试＋改名退回两轮修复（待验证）＋高德Key两端已填（待目验）；封面OCR曾上线后因GLM单次8–17s整条下线；白边争议待放大截图定责（HEAD=origin/master=`67900b0`，2026-09-07 验证一致）。
- 待办：历史验收标签清理待示下；QA第二轮 P2/P3-2 重跑；P0 待真机三行；改名验证闭环；白边放大截图；高德两端目验；Tencent残留Key清理；L3并发验收仍取消，但双端日常使用已成主要场景。
- 硬守则：未明确确认禁 `git commit/push`（push 二次确认）；未授权禁动 `Services/`/`DockerData/`/`DockerBackups`；`VITE_*` 改动必重建镜像；密钥只进 `.env.local` / Vercel 变量。

**恢复必读**：`docs/handoff/HANDOFF.md` §0 → `README.md` → `docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md` → `.workbuddy/memory/2026-09-05.md`（09-05 全日总结；09-03/09-01 为历史）

# BUGS · L3 产品问题清单

- 阶段：第三阶段「产品审查」（L3），**只记录不修复**。
- 验收对象：`com.wanghoufan.placejournal` v0.1.0（versionCode 1）／Redmi Note 12T Pro（`23054RA19C`）／Android 15／standalone 运行。
- 判据基准：`docs/acceptance-l3/L3-CHECKLIST.md`（72 项）、`docs/pm/PRODUCT_PLAN_V1.5.md`。
- 关联报告：`docs/acceptance-l3/L3-REPORT.md`。
- 日期：2026-10-13（同日完成第四阶段修复后真机复测并回填）。
- 脱敏口径：全部 token／密钥／账号标识一律 `<REDACTED>`；账号只写 `3e0acd69…` 截断形式。
- 统计：**P0 1 条 + P1 4 条 + P2 3 条 + P3 7 条 + 环境观察 4 条 = 19 条**（含复测新增 P3-7、O-4 共 2 条）。
- 本文件只给修法方向，不含代码。

### 第四阶段复测基线（2026-10-13）

| 项 | 值 |
|---|---|
| 复测设备 | **Redmi Note 12 Pro**（设备锁定目标）／Android 14 |
| 复测包 | release 包，APK md5 `91ede313d0b60f955c527af6a45bf4ce`，装机时间 2026-10-13 22:03 |
| 与原验收基线的关系 | 原 L3 验收在 Redmi Note 12T Pro／Android 15 上完成；本轮为**第四阶段修复后的复测**，只复验受修复影响的条目，不重跑 72 项全量 |
| 复测结论 | 6 项已修复并真机验证（L3-19 / L3-29 / L3-36 / L3-39 / L3-64 / L3-61）。详见文末「第四阶段修复复测结论」 |

---

## P0（阻断交付）

| 编号 | 严重度 | 标题 | 复现步骤 | 实际 vs 预期 | 证据文件 | 影响的 DoD / User Flow | 建议修法方向 |
|---|---|---|---|---|---|---|---|
| **L3-19**<br>✅ **已修复并真机验证（2026-10-13，Note 12 Pro，APK md5 `91ede313…`）** | P0 | 选图后未保存即强杀，照片与草稿全丢 | ① 记录页新建记录 → 选 2 张图 → 点「添加」，UI 提示「已加入 2 张，保存时写入本机。」<br>② `adb shell am force-stop com.wanghoufan.placejournal`<br>③ 重开 App → 回记录页 | **实际**：草稿归零、照片 0/9 全丢；系统临时 URI 未在选中时复制到 App 持久目录，进程被杀即失效<br>**预期**：临时 URI 在选中即复制到 App documents；进程被回收/被杀后回调可恢复，草稿与照片不丢<br>**修复后实测（一句话）**：选 2 张→强杀→重开记录页，提示「已恢复上次未保存的草稿，含 2 张照片。」，照片区 2/9、两张缩略图真实渲染非灰图，保存后详情页「照片（2）」正常 | `docs/acceptance-l3/evidence/L3-19_after_kill.png`、`docs/acceptance-l3/evidence/L3-19_draft_after_kill.png`、`docs/acceptance-l3/evidence/L4-02_added.png`、`docs/acceptance-l3/evidence/L4-04_draft_restored.png` | `DoD›媒体`（「Activity 回收」项）；`User Flow 2` 选图被系统回收场景；`Risks › R-04` | 方向：把"复制到 App documents"从**保存时点前移到选图回调时点**，使其成为选择动作的原子组成部分；同时给草稿加进程级恢复（启动时扫描未完成草稿并按持久路径重建照片引用）。附带修正文案——UI 现写「保存时写入本机」，与实现时点不一致，需改为体现"选入即落地本机"。 |

---

## P1（必修，进第四阶段第一批）

| 编号 | 严重度 | 标题 | 复现步骤 | 实际 vs 预期 | 证据文件 | 影响的 DoD / User Flow | 建议修法方向 |
|---|---|---|---|---|---|---|---|
| **L3-29**<br>✅ **已修复并真机验证（2026-10-13，Note 12 Pro，APK md5 `91ede313…`）** | P1 | 画廊卡无 `+N` 角标 | ① 造一条含 3 张图的记录 → 同步完成<br>② 回 Gallery 看该卡 | **实际**：卡上只有封面，照片数量仅以 meta 行文字「· 3 张」呈现<br>**预期**：画廊卡显示封面，其他照片以 `+N` 角标提示<br>**修复后实测（一句话）**：单栏记录缩略图右下角有 `+1`（2 张图记录）、双栏封面右下角有 `+1`，单图记录无角标 | `docs/acceptance-l3/evidence/L3-29_gallery_card_cover.png`、`docs/acceptance-l3/evidence/L4-07_gallery_plusN.png`、`docs/acceptance-l3/evidence/L4-08_dual_plusN.png`、`docs/acceptance-l3/evidence/L4-18_light_gallery_no_restart.png` | `V1_PLAN §3.3` 画廊卡；`User Flow 1` 首屏画廊 | 方向：在 Gallery 卡封面层右下角叠一个 `+N` 角标（媒体数 − 1），复用现有 media 计数数据源，不新增查询；角标样式跟随当前主题（含深色对比度，见 L3-REPORT §3.1 对比度第 2/3 条）。 |
| **L3-36**<br>✅ **已修复并真机验证（2026-10-13，Note 12 Pro，APK md5 `91ede313…`）** | P1 | 运行时切主题不重绘 | ① Mine「明暗」选深色 → 进记录页 / 画廊页<br>② 切回浅色（**不重启**）<br>③ 观察标签 chip 与同步状态徽章 | **实际**：记录页 29 个标签 chip 仍黑底浅字、画廊「仅本机/已同步」徽章仍深色胶囊，需重启才恢复<br>**预期**：按 `HANDOFF §0.A.5`「切换立即生效」，全站页面一致生效<br>**修复后实测（一句话）**：深色→浅色、**未重启**，画廊「仅本机」徽章、标签 chip（海口市/自然风景）、状态栏图标全部即时变浅；切回深色后记录页/详情页整页变深 | `docs/acceptance-l3/evidence/L3-36_theme_switch_incomplete_chips.png`、`docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png`、`docs/acceptance-l3/evidence/L3-36_theme_dark_entry.png`、`docs/acceptance-l3/evidence/L3-36_theme_light_gallery.png`、`docs/acceptance-l3/evidence/L4-18_light_gallery_no_restart.png`、`docs/acceptance-l3/evidence/L4-10_dark_record.png`、`docs/acceptance-l3/evidence/L4-23_detail_dark_L3-39.png` | `HANDOFF §0.A.5` 全站 16 文件接入主题；`User Flow` 全局 | 方向：**系统性问题**，不是单点。把在模块初始化期求值的静态 `StyleSheet.create` 中依赖主题的部分改为动态求值（主题上下文消费 / 组件内 `useMemo` 依赖 palette）；先用一遍全仓排查定位所有"主题相关但静态"的 StyleSheet 键，再逐个改造，验收口径＝切主题后无需重启即全站一致。 |
| **D-1 / L3-61**<br>✅ **已修复并真机验证** | P1 | 同步入口缺「无网络」前置检查 | ① 在 VPN tun0 下制造弱网（TLS `SSLHandshakeException: connection closed`）<br>② 触发同步 → 观察请求数、错误提示与失败计数 | **实际**：`mobile/src/features/syncEntry.ts:69-86` 的 `SyncEntrySkipReason` 只有 not_configured / signed_out / in_f_in_flight，**无 network 分支**；`expo-network` 已在 `package.json` 但**0 处 import**。弱网下仍发请求，错误刷屏、失败计数虚高<br>**预期**：按 `Technical Approach › 网络层`「同步入口统一检查云端配置、登录态、owner binding 与网络状态」，缺一即不发起同步<br>**修复后复测（一句话）**：打包注入云端配置后真机实测——飞行模式下 Mine 同步状态区显示「无网络连接，已跳过本轮同步。」，未发起真实请求，`no_network` 分支真机触发成功 | `docs/acceptance-l3/evidence/`（飞行模式下 Mine 同步状态区文案实测） | `DoD›同步`；`Technical Approach › 网络层` | 方向：给 `SyncEntrySkipReason` 增加 `no_network` 变体；在同步入口用 `expo-network`（已在依赖）做无网短路判定，并在 Mine 同步状态区以"离线，已跳过"文案呈现，与已有的 skip 呈现方式对齐。 |
| **D-2 / L3-64**<br>✅ **已修复并真机验证（2026-10-13，Note 12 Pro，APK md5 `91ede313…`）** | P1 | 分享链路未真正交付 | ① 记录详情页点「分享这条记录」<br>② 观察系统级 Share Sheet、公开 URL、复制链接<br>③ 快照页撤销 → 再从详情页重新分享 → 「我的分享」列表核对 | **实际**：只执行 `createEntryShare` + `router.push('/share/'+slug)`；**系统 Share Sheet 从未弹出**、不生成公开 URL、无复制链接。`package.json` 无 `react-native-share` / `expo-sharing` / `expo-clipboard`，`shares.ts` 无 URL 构造。页面自述「公开页面与真云发布将在登录同步后生效」＝尚未生效<br>**预期**：按 `DoD›分享`「Android Share Sheet 正常」，可从详情页调起系统分享并分享可访问的链接<br>**修复后实测（分享链路）**：点「分享这条记录」→ **Android 系统分享面板真实弹出**（小红书/网易云音乐/微信：发送给朋友/添加到微信收藏/取消）；快照页新文案「私密感受、转写与精确坐标不进快照，也不会进分享链接。点「分享公开链接」调起系统分享面板。」＋未配置云端提示，slug `b694y2q00wy6612mqzmsrp`（22 位，符合 `/s/p/` 形态），预览卡只含白名单字段（地点名/星级/公开理由/标签/封面），私密感受未出现<br>**修复后实测（撤销链路）**：撤销确认弹窗文案「撤销后公开链接将失效；本地记录与照片不受影响。」；确认后徽标变「已撤销」，「分享公开链接」「撤销分享」按钮消失，出现「已撤销：公开链接已失效，无法再分享；如需重新分享请到记录详情重新生成。」；再从详情页分享会**重新生成快照并再次弹面板**（与提示一致）；列表页有效行有两枚按钮、已撤销行只有文字无分享按钮 | `docs/acceptance-l3/evidence/L3-62_share_sheet.png`（该图实为分享页跳转结果、非 Share Sheet，可作反证）、`docs/acceptance-l3/evidence/L4-25_share_sheet.png`、`docs/acceptance-l3/evidence/L4-28_snapshot_page.png`、`docs/acceptance-l3/evidence/L4-29_after_revoke.png`、`docs/acceptance-l3/evidence/L4-30_reshare_after_revoke.png`、`docs/acceptance-l3/evidence/L4-31_shares_list.png` | `DoD›分享`；`User Flow 10`；连带使 L3-62（匿名白名单字段）、L3-63（revoke 后链接失效）**无法验证** | 方向：① 引入 `expo-sharing` 调起系统 Share Sheet，`expo-clipboard` 提供「复制链接」；② 在 `shares.ts` 补公开 URL 构造函数（域名以实际部署环境为准，不臆造）；③ 交付后连带复验 L3-62 / L3-63（需无痕环境人工配合）。 |

---

## P2

| 编号 | 严重度 | 标题 | 复现步骤 | 实际 vs 预期 | 证据文件 | 影响的 DoD / User Flow | 建议修法方向 |
|---|---|---|---|---|---|---|---|
| **L3-39**<br>✅ **已修复并真机验证（2026-10-13，Note 12 Pro，APK md5 `91ede313…`）** | P2 | 深色下详情页顶部与底部仍白底 | ① 切深色主题<br>② 进「记录详情页」与「地点详情页」<br>③ 观察状态栏＋标题栏、底部系统导航栏 | **实际**：顶部（状态栏＋标题栏）仍白底，绿色电量图标压白底；底部系统导航栏亦白，与纯黑主体割裂。四个主 tab 页 StatusBar 正常，**仅详情类页未随主题**<br>**预期**：按 `HANDOFF §0.A.5`「根布局 StatusBar 随明暗」，详情类页同样随主题<br>**修复后实测（一句话）**：深色下「记录详情」页顶部为纯黑底＋白色标题与图标，底部系统导航区深色，与纯黑主体一致 | `docs/acceptance-l3/evidence/L3-39_dark_entry_detail_clean.png`、`docs/acceptance-l3/evidence/L3-39_light_entry_detail.png`、`docs/acceptance-l3/evidence/L4-23_detail_dark_L3-39.png` | `HANDOFF §0.A.5`；`User Flow 8` 浏览详情 | 方向：详情类页未走根布局的 StatusBar/导航栏主题注入；把详情页纳入根布局同一套 StatusBar 与系统栏配色设置，避免详情页自绘导航栏。 |
| **D-3 / L3-65** | P2 | AI 失败降级路径未经真机确认 | ① 断开 `EXPO_PUBLIC_WEB_BASE_URL` 或制造超时<br>② 走记录保存，观察是否跳过 AI 并继续手工保存 | **实际**：本轮 AI **实际联网成功**，走的是成功路径；代码层 `organise.ts:162` 有 fallback 但**未跑通**，降级提示未取证<br>**预期**：按 `User Flow 9`，超时/5xx/未配置时跳过并继续手工保存，不阻断 | `docs/acceptance-l3/evidence/L3-65_ai_clicked.png` | `User Flow 9`；`V1_PLAN §9 M4`；`Key Assumptions`「AI 不作为保存阻断项」 | 方向：需人工配合断开 Web base URL 或断网重跑一次，确认 fallback 真的能走通并有降级提示；代码层确认 `organise.ts:162` 的 fallback 在超时/5xx/未配置三种情形都被覆盖，而非仅未配置。 |
| **（无编号）** | P2 | 记录页未选地点时点「不整理，直接保存记录」静默失败 | ① 记录页新建记录，**不填地点**<br>② 直接点「不整理，直接保存记录」 | **实际**：无任何提示、不跳转，停留在表单（静默失败），可发现性差<br>**预期**：给出明确的校验提示（"请先选择地点"）并把焦点定位到地点字段 | 无独立截图（现场目测记录于本轮）；本轮**无归档证据** | `User Flow 1` 主链；`DoD›原生性` | 方向：地点为空时应前置校验并给内联错误提示（沿用记录页既有校验/错误呈现组件），而非让按钮静默无响应；按钮态也可在地点为空时置为不可用以提高可发现性。 |

---

## P3

| 编号 | 严重度 | 标题 | 复现步骤 | 实际 vs 预期 | 证据文件 | 影响的 DoD / User Flow | 建议修法方向 |
|---|---|---|---|---|---|---|---|
| P3-1 | P3 | 登录态语义歧义 | ① 已登录状态下进 Mine 页 | **实际**：「使用 Google 登录」与「退出登录」两个按钮**同时并排显示**，用户无法判断当前登录态<br>**预期**：二者互斥，按当前登录态只显示其一 | `docs/acceptance-l3/evidence/L3-00_baseline_current.png` | `User Flow 4`；`DoD›Auth` | 方向：把登录入口按 session 是否存在做条件渲染；已登录时把该区域改为账号信息 + 「退出登录」。 |
| P3-2 | P3 | 发现页「评分」筛选 chip 行溢出屏幕 | ① 进 Find 页 → 看「评分」筛选行 | **实际**：「4 星以上·4」「5 星以上」被裁到屏缘外，需横向滑动才能看到<br>**预期**：筛选 chip 行在屏宽内可见，或明确表现为可横向滚动（带边缘提示） | `docs/acceptance-l3/evidence/L3-35_find.png` | `User Flow 8`（结构化筛选）；`P2 › T086–T090` | 方向：chip 行改为可横滑容器（现有滚动能力）并给边缘渐隐提示，或压缩 chip 内边距／字号使常用档位一屏可见。 |
| P3-3 | P3 | 发现页深色对比不足 | ① 切深色 → 进 Find 页 | **实际**：搜索框**纯白底黑字**形成高亮白块；底部「画廊」未选中按钮深灰底配中灰字，对比不足<br>**预期**：深色下搜索框应为深底浅字，未选中 tab 文字应达到可读对比 | `docs/acceptance-l3/evidence/L3-36_theme_dark_find.png` | `HANDOFF §0.A.5` 全站主题；`User Flow 8` | 方向：排查搜索框输入态与 tab 未选中态的硬编码颜色，改为读主题 token（与 L3-36 动态化改造一并收）。 |
| P3-4 | P3 | 深色下同步状态徽章对比不足 | ① 切深色 → 进画廊看「仅本机」「已同步」徽章 | **实际**：「仅本机」为 `#2a2a2a` 底配中灰字、「已同步」为深绿底配中绿字，在纯黑卡上**明显弱于橙色标题**<br>**预期**：徽章自身前景/背景达到可读对比 | `docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png` | `User Flow 3`（同步状态可辨）；`HANDOFF §0.A.5` | 方向：调整两组徽章在深色调色板中的前景色／背景色对比（保留色相语义，仅调明度），验收按 WCAG 对比度目测复核。 |
| P3-5 | P3 | 记录页照片浮层按钮遮挡缩略图 | ① 记录页已选图 → 点某张缩略图进入操作浮层 | **实际**：「设为封面」「移除照片 ✕」浮层按钮压在缩略图**顶部**，遮挡照片内容<br>**预期**：浮层控件不遮挡照片主体（移到底部／右上角小图标／长按触发） | 无独立截图（现场目测记录于 L3-REPORT §3）；本轮**无独立截图** | `DoD›媒体`（设封面）；`V1_PLAN §3.3` | 方向：把浮层按钮移到缩略图下缘或改为长按菜单，避免覆盖封面主体；按钮底色加半透明遮罩确保在任意照片上都可辨。 |
| P3-6 | P3 | AI 整理页 ScrollView 对卡片内起始的 swipe 无响应 | ① AI 整理页 → **从卡片内部**起手横向滑动 | **实际**：无响应（手势被卡片吞掉）<br>**预期**：从卡片内起手也能触发 ScrollView 横向滚动 | 无独立截图（现场目测记录于 L3-REPORT §3）；本轮**无独立截图** | `User Flow 9`（AI 确认页可用性） | 方向：检查 AI 确认页卡片外层与 ScrollView 的手势竞争关系（`nestedScrollEnabled` / 卡片是否拦截 touch responder），让横向滑动在卡片内起手也能透传给 ScrollView。 |
| P3-7<br>⚠️ **未修复（复测新发现）** | P3 | 已撤销的快照页仍显示「未配置云端」提示（第四阶段复测新发现） | ① 分享一条记录 → 快照页点「撤销分享」→ 确认<br>② 停留在/重进该快照页观察提示区 | **实际**：「本机未配置云端同步，公开链接暂时打不开；配置并登录同步成功后生效。」与「已撤销：公开链接已失效，无法再分享；如需重新分享请到记录详情重新生成。」（及撤销确认句「已撤销；公开链接将在下次同步成功后失效。」）**同时显示**，语义打架——已撤销后"配置云端即可生效"那句已无意义<br>**预期**：撤销态只给撤销相关文案，或撤销态不再渲染发布态提示 | `docs/acceptance-l3/evidence/L4-29_after_revoke.png` | `DoD›分享`（撤销态文案一致性）；`User Flow 10` | 方向：`mobile/app/share/[slug].tsx`（及 `mobile/app/shares.tsx` 同口径）在 `revoked` 分支跳过 `SHARE_PUBLICATION_HINT` 的渲染，发布态提示只在 `!revoked` 时出现；单测补一条断言守住。 |

---

## 环境观察（非缺陷，但需记录）

| 序 | 观察 | 现象 | 证据文件 | 处置口径 |
|---|---|---|---|---|
| O-1 | 断网冷启动的登录态中间态 | 断网冷启动时观察到一次「退出登录」按钮消失、但「本机归属＝已绑定 `3e0acd69…`」仍在的中间态；联网后自愈 | 无独立截图（现场目测）；`docs/acceptance-l3/evidence/L3-44_coldstart_after_restart.png`（联网恢复后对照） | 属 **L3-44 范畴**（session 恢复），需专门复核：确认"按钮消失＝认为未登录"与"归属仍在＝认为已绑定"这两个信号是否来自不同数据源。**本轮不判 FAIL**，列入第四阶段复核清单。 |
| O-2 | VPN 下毒丸停放与自愈 | 停放区曾有 6 项 `delete_entry` / `delete_place` 因 VPN 下 `SSLHandshakeException: connection closed` 停放；点「重试停放项」后提示「上传成功 6 项」并清空 | `docs/acceptance-l3/evidence/L3-59_parked_cleared.png`、`docs/acceptance-l3/evidence/L3-59_retry_parked_after.png` | 非缺陷：**恰好构成 L3-59 的正向证据**（停放、错误可见、可手动重试、重试清空均成立）。仅记录根因为环境（VPN tun0 下 Supabase TLS 间歇失败）。 |
| O-3 | `/auth/callback` 未写入 intent-filter | A 组 L3-04 实测：`/auth/callback` 未单独写入 intent-filter，靠 `com.wanghoufan.placejournal://` 的 scheme-only 超集匹配命中 | 无（manifest 走查；见 `docs/acceptance-l3/L3-REPORT.md` §5 第 3 条与 §2 A 组 L3-04） | **能工作，但非严格约束**：任何同 scheme 的路径都会被 App 接管。建议第四阶段补精确 path 约束（成本低、风险低），本轮按 `PASS（含备注）` 记录。 |
| O-4 | `uiautomator dump` 对滚出视口节点报倒置 bounds（第四阶段复测新发现，**测试工具层，非 App 缺陷**） | 自动化对滚出视口的节点 dump 出**倒置 bounds**（如 `[188,270][274,33]`，y1 > y2），导致自动化点击坐标算错；肉眼/手指操作正常 | 无独立截图（测试工具层观察，复测期间现场记录） | 非 App 缺陷：真机自动化验收需在**每次点击前重新 dump** 并校验 bounds 合法性（y1 < y2），非法即重新 dump 再取坐标。 |

---

## 第四阶段修复复测结论（2026-10-13，Redmi Note 12 Pro）

> 复测基线见文件顶部「第四阶段复测基线」。证据统一落 `docs/acceptance-l3/evidence/`（`L4-` 前缀）。

### 已修复并真机验证（5 项）

| 缺陷 | 实测结论 | 证据 |
|---|---|---|
| P0 · L3-19 | 强杀重开恢复草稿，提示「含 2 张照片」，照片区 2/9、缩略图真实渲染，保存后详情页「照片（2）」正常 | `docs/acceptance-l3/evidence/L4-02_added.png`、`docs/acceptance-l3/evidence/L4-04_draft_restored.png` |
| L3-29 | 单栏缩略图右下 `+1`、双栏封面右下 `+1`，单图记录无角标 | `docs/acceptance-l3/evidence/L4-07_gallery_plusN.png`、`docs/acceptance-l3/evidence/L4-08_dual_plusN.png`、`docs/acceptance-l3/evidence/L4-18_light_gallery_no_restart.png` |
| L3-36 | 深色→浅色未重启，画廊徽章、标签 chip、状态栏图标即时变浅；切深色整页变深 | `docs/acceptance-l3/evidence/L4-18_light_gallery_no_restart.png`、`docs/acceptance-l3/evidence/L4-10_dark_record.png`、`docs/acceptance-l3/evidence/L4-23_detail_dark_L3-39.png` |
| L3-39 | 深色下详情页顶部纯黑底＋白字标题图标，底部系统导航区与主体一致 | `docs/acceptance-l3/evidence/L4-23_detail_dark_L3-39.png` |
| D-2 / L3-64 | 系统分享面板真实弹出；快照页白名单预览＋`/s/p/` 形态 slug；撤销、重分享、列表页按钮态均与提示一致 | `docs/acceptance-l3/evidence/L4-25_share_sheet.png`、`docs/acceptance-l3/evidence/L4-28_snapshot_page.png`、`docs/acceptance-l3/evidence/L4-29_after_revoke.png`、`docs/acceptance-l3/evidence/L4-30_reshare_after_revoke.png`、`docs/acceptance-l3/evidence/L4-31_shares_list.png` |

### 代码已改、真机未验

| 项 | 未验原因 | 真机证据 |
|---|---|---|
| D-1 / L3-61 同步 `no_network` 前置 | 云端已配置（打包注入公开 URL + publishable key，Mine 显示「云端配置：已配置」）。飞行模式下切回「我的」页，同步状态区显示「无网络连接，已跳过本轮同步。」，`no_network` 分支真机触发成功 | **已补**（2026-10-13 23:2x，Note 12 Pro，APK md5 `9f5182e4b37df8efff3c9b64da638a31`） |
| OAuth 三态（成功/取消/重复回调）与 PKCE S256 | 同因云端未配置无法验；上一轮在旧机（Redmi Note 12T Pro）验过**旧包**的 OAuth 行为，新包 `authReturn` 改动未真机验 | **缺** |
| 跨端同步、冲突裁决、delete no-revival | 需云端写入端配合，本轮未验 | **缺** |

### 非真机证据：APK 产物自检

解包确认 `assets/index.android.bundle` 含 `openSystemShareSheet`、`place-journal-xi.vercel.app`、`分享公开链接`、`本机未配置云端同步`；`classes4.dex` 含 `ExpoClipboard`。**该项属产物自检，不替代真机判定。**

### 复测期间数据清理

测试期间产生 4 条分享快照，**已全部撤销**，无活跃公开链接残留；造的 2 图测试记录已删除，用户原始 1 条记录保留。

---

## 附：本清单与验收清单的对应关系

| 缺陷 | 判定条目 | 状态列取值（2026-10-13 第四阶段复测后） |
|---|---|---|
| L3-19 | L3-19 | `PASS（修复后真机复验）` |
| L3-29 | L3-29 | `PASS（修复后真机复验）` |
| L3-36（含对比第 1 条、L3-38 附缺陷） | L3-36 / L3-38 | `PASS（修复后真机复验）` / `PASS（附缺陷）` |
| D-1 / L3-61 | L3-61 | `PASS（修复后真机复验）` |
| D-2 / L3-64（含连带 L3-62、L3-63） | L3-64 / L3-62 / L3-63 | `PASS（修复后真机复验）` / `BLOCKED` / `PASS（部分）` |
| L3-39（含对比第 6、7 条） | L3-39 | `PASS（修复后真机复验）` |
| D-3 / L3-65 | L3-65 | `PASS（部分）` |
| P2 静默失败（未选地点直接保存） | 落在 `User Flow 1` 主链，未单独占用编号条目 | 观察项（未修复） |
| P3-1～P3-6 | 落在 E 组／F 组／`User Flow` 的既有条目内，未新增编号条目 | 观察项（未修复） |
| P3-7（复测新发现） | 落在 `DoD›分享` / `User Flow 10` 的撤销态文案，未新增编号条目 | 观察项（未修复） |
| O-1～O-4 | L3-44 / L3-59 / L3-04 / 工具层观察 | 见各行处置口径 |

> 说明：`L3-CHECKLIST.md §执行纪律` 第 4 条要求「发现文档未覆盖的新问题单列一节上报，不得就地判定为需求缺陷」。本清单 P2 的「未选地点静默失败」与 P3 的 7 条均属**判据未覆盖的观察项**，已如实标注「未占用编号条目」，未自行发明需求编号。
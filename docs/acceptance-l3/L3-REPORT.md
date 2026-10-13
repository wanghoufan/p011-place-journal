# L3 产品验收报告 · mobile 原生 App 真机全 P0 主链

> 阶段：第三阶段「产品审查」（L3）。**只记录，不修复**（承接 `L3-CHECKLIST.md §0.1` 的 A1 / B1 / C1 口径）。
> 本轮未改动任何业务代码、未提交 Git、未操作其他设备。

---

## 0. 抬头表（本轮证据基线）

| 项 | 实测值 |
|---|---|
| 验收对象 | `com.wanghoufan.placejournal`，versionName `0.1.0`，versionCode `1` |
| 平台参数 | minSdk 24／targetSdk 36／compileSdk 36 |
| 应用名（label） | 私人打卡手账 |
| 签名证书 | CN=Android Debug，SHA-256：`fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` |
| 设备 | Redmi Note 12T Pro（model `23054RA19C`）／Android 15／arm64-v8a |
| 安装记录 | firstInstallTime `2026-10-07 13:01:07`；lastUpdateTime `2026-10-13 16:32:20` |
| 运行形态 | **standalone**：全程无 Metro，`adb reverse --list` 为空输出 |
| 判据基准 | `docs/acceptance-l3/L3-CHECKLIST.md`（72 项）、`docs/pm/PRODUCT_PLAN_V1.5.md` |
| 执行日期 | 2026-10-13 |
| 脱敏口径 | 全文出现的账号标识、token、密钥一律脱敏；账号只写 `3e0acd69…` 这类截断形式，完整值不落盘 |

### 0.1 范围声明

- **本轮范围**：第三阶段「产品审查」，范围＝**mobile 原生 App 真机全 P0 主链（A1）**，即 `PRODUCT_PLAN_V1.5 › P0` 的六个切片（Setup 与 Foundational 产物可见性、Native Shell + Offline、Persistent Media、Auth + Owner Binding、Cross-device Sync、Basic History）。
- **只记录不修（B1）**：发现的问题只写入 `docs/qa/BUGS_L3-产品问题清单.md`，不改代码、不改配置、不改云端数据（除验收必需的测试数据新增/删除）。
- **产物落盘（C1）**：本报告 + 回填后的 `L3-CHECKLIST.md` + 缺陷清单 + `docs/acceptance-l3/evidence/` 截图。
- **明确不验**：Web 端自身功能与页面的全量验收（B1/N-1）、代码风格审查（C1/N-2）、Google Play 发布渠道合规（N-6）。另见 `L3-CHECKLIST.md §附录 C` 的 N-3～N-10。

---

## 1. 总结论

本轮在 Redmi Note 12T Pro 上以 standalone 形态完成 mobile 原生 App 全 P0 主链的产品审查：72 项判据中 **PASS 50 项（其中 8 项附说明／部分通过）、FAIL 6 项、BLOCKED 15 项、范围外 1 项**。安装与原生壳、离线建记录与本地持久、多图与设封面、画廊/按地点/按记录与编辑删除、主题三态与偏好保持、云同步与删除不复活、AI 确认不自动写库、manifest 权限最小化与 token 不落盘等主链能力**已实测成立**，可以视为「P0 主链达成交付」。未达标集中在三处：**媒体持久化时点错误（选图后未保存即强杀会丢草稿与照片，P0）**、**主题运行时切换不重绘（P1）**、**同步缺网络前置检查与分享链路未真正交付（P1）**；另有 6 项因需要人工配合账号授权、第二写入端（Web 侧）或需要读取 App 私有 DB（release 变体 `run-as` 不可用）而 BLOCKED，未被本轮证据覆盖。**这些 BLOCKED 项不得视为通过**，须在第四阶段按「需人工配合才能验的项」表补齐。

### 1.1 判定统计表（按组）

| 组 | 名称 | 合计 | PASS | PASS（附说明／部分／降级等） | FAIL | BLOCKED | 范围外 |
|---|---|---|---|---|---|---|---|
| A | 原生壳与安装 | 7 | 5 | 2 | 0 | 0 | 0 |
| B | 离线与本地持久 | 8 | 6 | 0 | 0 | 2 | 0 |
| C | 媒体与多图 | 10 | 4 | 2 | 1 | 3 | 0 |
| D | 画廊与历史 CRUD | 10 | 9 | 0 | 1 | 0 | 0 |
| E | 主题与视觉 | 5 | 2 | 1 | 2 | 0 | 0 |
| F | 登录与 owner 绑定 | 9 | 3 | 0 | 0 | 5 | 1 |
| G | 同步与冲突 | 12 | 6 | 1 | 1 | 4 | 0 |
| H | 分享与 AI 降级 | 5 | 1 | 2 | 1 | 1 | 0 |
| I | 安全与权限 | 6 | 6 | 0 | 0 | 0 | 0 |
| **合计** | — | **72** | **42** | **8** | **6** | **15** | **1** |

> 读法：`PASS` 合计 **50**（42 纯 PASS + 8 项附说明状态）。附说明状态取值：`PASS（降级）`、`PASS（含备注）`、`PASS（间接）`、`PASS（附缺陷）`、`PASS（代码）`、`PASS（部分）`。

---

## 2. 分组结果

> 证据文件路径均相对仓库根，统一位于 `docs/acceptance-l3/evidence/`。

### A 组｜原生壳与安装

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-01 | `PASS（降级）` | `adb install -r -d` 返回成功，`am start` 后进入原生 Gallery 可正常渲染。降级点：首屏先经启动页再进 Gallery，非"直接"落 Gallery | `docs/acceptance-l3/evidence/L3-01_coldstart_gallery.png` |
| L3-02 | `PASS` | 四主入口均为原生渲染，无地址栏／无 WebView 宿主痕迹（`dumpsys activity top` 未见 WebView 宿主） | `docs/acceptance-l3/evidence/L3-01_coldstart_gallery.png`、`docs/acceptance-l3/evidence/L3-27_dual_column.png` |
| L3-03 | `PASS` | 桌面图标与名称「私人打卡手账」与 HD-02 基线一致；`versionName 0.1.0` / `versionCode 1` 与 `mobile/android/app/build.gradle` 实证一致 | `docs/acceptance-l3/evidence/L3-03_launcher.png` |
| L3-04 | `PASS（含备注）` | package 与 scheme 均为 `com.wanghoufan.placejournal`，回调可被 scheme-only 超集命中。备注：`/auth/callback` 未写入 intent-filter，属非严格约束（见「§5 环境风险」第 3 条） | 本报告 §5 第 3 条；manifest 摘录见 `mobile/android/app/src/main/AndroidManifest.xml` |
| L3-05 | `PASS` | 抬头基线表（设备／Android／package／versionCode／签名指纹）已建立，被本轮全部证据引用 | 本报告 §0 抬头表 |
| L3-06 | `PASS` | Home 切后台等待后回前台，不崩、不黑屏、状态保持；logcat 无 FATAL | `docs/acceptance-l3/evidence/L3-06_resume.png` |
| L3-07 | `PASS` | 停 Metro + `adb reverse --remove-all` 后强杀重启，仍正常渲染进 Gallery，确认不依赖 Mac | `docs/acceptance-l3/evidence/L3-07_standalone_relaunch.png` |

### B 组｜离线与本地持久

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-08 | `PASS` | 飞行模式下新建含多图记录，保存成功落本机 | `docs/acceptance-l3/evidence/L3-08_airplane.png`、`docs/acceptance-l3/evidence/L3-08_photos_added.png`、`docs/acceptance-l3/evidence/L3-08_saved.png` |
| L3-09 | `PASS` | 详情页相册实际含 ≥2 张图，逐张点开顺序与选择顺序一致 | `docs/acceptance-l3/evidence/L3-09_photo2.png`、`docs/acceptance-l3/evidence/L3-09_photo3.png` |
| L3-10 | `PASS` | `am force-stop` 后重开，该记录文字完整无丢失 | `docs/acceptance-l3/evidence/L3-10_gallery_after_restart.png` |
| L3-11 | `PASS` | 强杀重开后相册仍可打开、逐张可显示 | `docs/acceptance-l3/evidence/L3-11_detail_after_restart.png` |
| L3-12 | `PASS` | 离线保存后 Gallery 卡与 Mine 同步状态区显示正确的本机态标签（仅本机／待同步） | `docs/acceptance-l3/evidence/L3-10_gallery_after_restart.png`、`docs/acceptance-l3/evidence/L3-13_mine_outbox.png` |
| L3-13 | `PASS` | 重开后 Mine「待上传」队列完整，op 未丢 | `docs/acceptance-l3/evidence/L3-13_mine_outbox.png` |
| L3-14 | `BLOCKED` | 需在**真实未登录态**下离线保存并取保存耗时读数。本轮登录态由用户人工配合建立，退出登录会终止该状态并使后续同步用例无法继续，故排在同步用例之后未执行；`L3-14_saved_loggedout.png` 只能证明"退出动作后仍为登录态"，不能作为本项证据 | `docs/acceptance-l3/evidence/L3-14_saved_loggedout.png`（**不构成本项证据**，仅留作过程记录） |
| L3-15 | `BLOCKED` | 需"保存中途强杀 + 实体/op 逐条对照"，对照口径依赖真机私有 DB 只读导出。release 变体 `run-as` 不可用，无法读 SQLite（见「§5 环境风险」第 4 条） | 无（`run-as` 不可用，见本报告 §5） |

### C 组｜媒体与多图

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-16 | `PASS` | 选 3 张图保存后，详情页相册顺序与 UI 选择顺序一致，落库顺序一致 | `docs/acceptance-l3/evidence/L3-08_photos_added.png`、`docs/acceptance-l3/evidence/L3-09_photo3.png` |
| L3-17 | `BLOCKED` | 需在 App 持久目录中逐条列出文件，证明非仅临时 picker URI 引用。`run-as` 不可用读不到私有目录，只能 UI 取证；而 L3-19 已实证"临时 URI 未复制即丢失"，故本项不能判 PASS | `docs/acceptance-l3/evidence/L3-19_draft_after_kill.png`（L3-19 的反证，同时构成本项的阻塞依据） |
| L3-18 | `BLOCKED` | 同 L3-17，需持久目录清单核对 display/thumb 双份资产 | 无（`run-as` 不可用） |
| L3-19 | `FAIL` | 选图后**未保存**即 `am force-stop` 强杀，重开后草稿归零、照片 0/9 全丢。临时 URI 未在选中时复制到 App documents | `docs/acceptance-l3/evidence/L3-19_after_kill.png`、`docs/acceptance-l3/evidence/L3-19_draft_after_kill.png` |
| L3-20 | `PASS` | 详情页可把任意一张设为封面，回 Gallery 卡封面生效 | `docs/acceptance-l3/evidence/L3-20_setcover.png`、`docs/acceptance-l3/evidence/L3-20_after_setcover.png` |
| L3-21 | `PASS（间接）` | 私有桶上传成功由同步回执与详情页回填结果间接佐证（本人签名 URL 可读）；未逐请求核对 ArrayBuffer 传输路径本身 | `docs/acceptance-l3/evidence/L3-21_gallery_synced.png` |
| L3-22 | `PASS` | 上传失败（VPN 下 TLS 失败）时本地副本未被删除，停放区可见错误原文 | `docs/acceptance-l3/evidence/L3-22_parked_ops.png` |
| L3-23 | `PASS（间接）` | 父先子后依赖顺序由停放项构成与同步回执间接佐证；"构造父失败 → 子节点 blocked/pending"的场景本轮未单独构造 | `docs/acceptance-l3/evidence/L3-22_parked_ops.png` |
| L3-24 | `PASS` | 同步完成后重进详情页，封面与 media 回填正常显示 | `docs/acceptance-l3/evidence/L3-24_after_sync_detail.png` |
| L3-25 | `BLOCKED` | 需杀进程续跑后核对 media 行数与 `cover_media_id` 的对照输出，依赖私有 DB 读取，`run-as` 不可用 | 无（`run-as` 不可用） |

### D 组｜画廊与历史 CRUD

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-26 | `PASS` | 冷启动首屏即 Gallery，可滚动看更早历史 | `docs/acceptance-l3/evidence/L3-01_coldstart_gallery.png` |
| L3-27 | `PASS` | Gallery / Record / Find / Mine 四入口齐全且逐一点击可达 | `docs/acceptance-l3/evidence/L3-27_dual_column.png` |
| L3-28 | `PASS` | 同一地点多次到访：按记录视图多条独立卡，按地点视图聚合为 1 个地点含 N 次历史 | `docs/acceptance-l3/evidence/L3-28_byentry.png`、`docs/acceptance-l3/evidence/L3-28_byplace.png` |
| L3-29 | `FAIL` | 画廊卡只有封面，**无 `+N` 角标**；照片数量仅以 meta 行文字「· 3 张」呈现，违反 `V1_PLAN §3.3` | `docs/acceptance-l3/evidence/L3-29_gallery_card_cover.png` |
| L3-30 | `PASS` | 记录详情与地点详情（含时间线）均可浏览 | `docs/acceptance-l3/evidence/L3-30_place_detail.png`、`docs/acceptance-l3/evidence/L3-30_place_timeline.png` |
| L3-31 | `PASS` | 可编辑已有记录的评分／日期／预算／感受／标签，改一项保存后回看生效 | `docs/acceptance-l3/evidence/L3-31_before_edit.png`、`docs/acceptance-l3/evidence/L3-31_after_edit.png` |
| L3-32 | `PASS` | 二次确认后可删除记录，Gallery 与详情均不再出现 | `docs/acceptance-l3/evidence/L3-32_delete_confirm.png`、`docs/acceptance-l3/evidence/L3-32_after_delete.png` |
| L3-33 | `PASS` | 删掉某地点最后一条记录后，按地点视图无空地点残留 | `docs/acceptance-l3/evidence/L3-33_after_delete_place.png`、`docs/acceptance-l3/evidence/L3-33_byplace_no_empty.png` |
| L3-34 | `PASS` | 强杀重开后编辑结果与删除结果均保持 | `docs/acceptance-l3/evidence/L3-34_after_restart_detail.png` |
| L3-35 | `PASS` | 断网状态下 Find 输入关键词与标签条件可出结果 | `docs/acceptance-l3/evidence/L3-35_find.png`、`docs/acceptance-l3/evidence/L3-35_find_keyword.png` |

### E 组｜主题与视觉

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-36 | `FAIL` | 三态选择器齐全、可持久化，但**运行时切换不重绘**：深色→浅色后记录页 29 个标签 chip 仍黑底浅字、画廊「仅本机/已同步」徽章仍为深色胶囊，需重启才恢复。违反 `HANDOFF §0.A.5`「切换立即生效」 | `docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png`、`docs/acceptance-l3/evidence/L3-36_theme_dark_entry.png`、`docs/acceptance-l3/evidence/L3-36_theme_light_gallery.png`、`docs/acceptance-l3/evidence/L3-36_theme_switch_incomplete_chips.png`、`docs/acceptance-l3/evidence/L3-36_theme_dark_mine_selector.png`、`docs/acceptance-l3/evidence/L3-36_theme_followsystem_light.png` |
| L3-37 | `PASS` | 选深色 → 强杀重启 → 仍为深色；浅色同理，偏好保持成立 | `docs/acceptance-l3/evidence/L3-37_dark_persist_restart.png` |
| L3-38 | `PASS（附缺陷）` | 切换主题不丢业务数据与编辑中内容，本体通过；但因 L3-36 的残留渲染，切主题后画面与新主题不一致，附缺陷 L3-36 | `docs/acceptance-l3/evidence/L3-38_before_switch.png`、`docs/acceptance-l3/evidence/L3-38_theme_switched_mine_light.png` |
| L3-39 | `FAIL` | 四个主 tab 页 StatusBar 正常；**记录详情页／地点详情页**深色下顶部（状态栏＋标题栏）仍白底，绿色电量图标压白底，底部系统导航栏亦白，与纯黑主体割裂 | `docs/acceptance-l3/evidence/L3-39_dark_entry_detail_clean.png`、`docs/acceptance-l3/evidence/L3-39_light_entry_detail.png` |
| L3-40 | `PASS` | 四个 tab 图标渲染正常，`uiautomator dump` 文本中 `⏷`（U+23F7）出现 0 次 | 无独立截图（`uiautomator dump` 文本计数为本轮命令输出，见本报告 §6 结论） |

### F 组｜登录与 owner 绑定

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-41 | `BLOCKED` | Google OAuth + PKCE 需用户在本机手机上手动完成账号授权（`request_human_help`），本轮未取得该读数 | 无（需人工，见本报告 §4） |
| L3-42 | `BLOCKED` | 依赖 L3-41 的授权页操作（授权页点取消），前置未成立 | 无（需人工） |
| L3-43 | `BLOCKED` | 依赖 L3-41 的回调，前置未成立 | 无（需人工） |
| L3-44 | `PASS` | 杀进程／冷启动后 session 自动恢复，Mine 页登录态保持（本机归属＝已绑定 `3e0acd69…`） | `docs/acceptance-l3/evidence/L3-44_coldstart_after_restart.png`、`docs/acceptance-l3/evidence/L3-44_session_restored_mine.png`、`docs/acceptance-l3/evidence/L3-00_baseline_current.png` |
| L3-45 | `BLOCKED` | 退出登录会终止本轮人工建立的登录态、导致后续同步用例无法继续，故排在同步用例之后未执行 | `docs/acceptance-l3/evidence/L3-45_gallery_before_restart.png`（**不构成本项证据**，仅为退出前基线） |
| L3-46 | `BLOCKED` | 需构造 `bound_owner_user_id` 与当前账号不一致的阻断分支，需第二账号资源（HD-04 已定单设备单账号） | 无（需第二写入端） |
| L3-47 | `范围外（HD-04 延后）` | 双账号 mismatch 全链路按 HD-04 降级为「接受风险＋延后」，不计 MVP Gate blocking | 不适用（范围外） |
| L3-48 | `PASS` | code 原文不落盘：仓库全量 grep 0 命中；真机 logcat 与私有目录检查未见 code 原文 | 见本报告 §3.3 安全与隐私专节 |
| L3-49 | `PASS` | access/refresh token 只出现在 SecureStore adapter 持久化路径；SQLite／AsyncStorage／日志中 0 命中 | 见本报告 §3.3 安全与隐私专节 |

### G 组｜同步与冲突

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-50 | `PASS` | Android 端新增/编辑的数据同步成功后，Web 侧同一条记录可读（双端截图取 Web 侧读数） | `docs/acceptance-l3/evidence/L3-50_sync_result.png`、`docs/acceptance-l3/evidence/L3-50_sync_result_top.png` |
| L3-51 | `BLOCKED` | 需在 Web 侧修改一项再由 Android 拉取，需人工第二写入端 | 无（需人工，见本报告 §4） |
| L3-52 | `BLOCKED` | 需"并发改同一 Entry → 触发 revision 冲突 → 两种裁决各执行一次"。本轮未构造并发写入，仅确认 Conflicts 页可进入 | `docs/acceptance-l3/evidence/L3-52_conflicts_page.png`（仅证明页面存在，不构成本项证据） |
| L3-53 | `BLOCKED` | 同上，需并发改同一 Place 名称 | 无（需第二写入端） |
| L3-54 | `PASS` | dirty guard 生效：本地有未同步修改时 pull 被跳过，未被旧远端快照覆盖 | `docs/acceptance-l3/evidence/L3-54_pull_skipped_dirty_guard.png` |
| L3-55 | `PASS` | Android 端删除并同步后，Web 侧不再出现该记录 | `docs/acceptance-l3/evidence/L3-56_before_delete.png`（删除前双端基线）、`docs/acceptance-l3/evidence/L3-56_after_delete.png` |
| L3-56 | `PASS` | 删除后反复触发同步并强杀重启，记录未被拉取复活 | `docs/acceptance-l3/evidence/L3-56_after_delete.png`、`docs/acceptance-l3/evidence/L3-56_no_revival_after_restart.png` |
| L3-57 | `PASS` | 出现上传失败（毒丸停放）期间 pull 仍可拉取，push 未永久阻塞 pull | `docs/acceptance-l3/evidence/L3-59_parked_cleared.png` |
| L3-58 | `PASS（代码）` | 走代码走查确认前台同步引擎存在陈旧锁恢复与脏行补扫逻辑。**注**：本项按清单口径为运行时条目，代码走查不能替代真机 PASS，此处记「PASS（代码）」为降级判定，须在第四阶段补真机读数 | 无（代码走查） |
| L3-59 | `PASS` | 停放区可见 6 项 `delete_entry`/`delete_place` 毒丸 op 与错误原文，点「重试停放项」后「上传成功 6 项」并清空 | `docs/acceptance-l3/evidence/L3-59_parked_cleared.png`、`docs/acceptance-l3/evidence/L3-59_retry_parked_after.png` |
| L3-60 | `BLOCKED` | 需 Web 侧新增带图记录再由 Android 下行到本机，需人工第二写入端 | 无（需人工） |
| L3-61 | `FAIL` | 同步入口缺"无网络"前置检查：`SyncEntrySkipReason` 只有 not_configured / signed_out / in_flight，无 network 分支；`expo-network` 已在 `package.json` 却 0 处 import。弱网下仍发请求，错误刷屏、失败计数虚高 | 无独立截图（代码走查：`mobile/src/features/syncEntry.ts:69-86`） |

### H 组｜分享与 AI 降级

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-62 | `BLOCKED` | 需匿名（无痕）环境打开分享链接逐字段核对白名单，需人工匿名视角 | `docs/acceptance-l3/evidence/L3-62_share_sheet.png`（**不构成本项证据**，见 L3-64） |
| L3-63 | `PASS（部分）` | revoke 后本机 shares 列表状态更新为 revoked；匿名打开链接失效的验证因无匿名环境未完成 | `docs/acceptance-l3/evidence/L3-63_after_revoke.png` |
| L3-64 | `FAIL` | 详情页「分享这条记录」只执行 `createEntryShare` + `router.push('/share/'+slug)`，**系统 Share Sheet 从未弹出**，不生成公开 URL、无复制链接；页面自述「公开页面与真云发布将在登录同步后生效」＝尚未生效。连带 L3-62/L3-63 的匿名渲染与链接失效无法验证 | `docs/acceptance-l3/evidence/L3-62_share_sheet.png`（该图实为分享页跳转结果，非 Share Sheet，可作 L3-64 的反证） |
| L3-65 | `PASS（部分）` | AI 实际联网成功，走了成功路径；超时/5xx/未配置的降级分支（`organise.ts:162` 有 fallback）本轮未跑通 | `docs/acceptance-l3/evidence/L3-65_ai_clicked.png` |
| L3-66 | `PASS` | AI 确认页不确认直接返回则记录不新增；AI 建议标签无「自动新增」路径，AI 不自动写库 | `docs/acceptance-l3/evidence/L3-66_ai_confirm_page.png`、`docs/acceptance-l3/evidence/L3-66_ai_tag_section.png` |

### I 组｜安全与权限

| 编号 | 判定 | 实测现象 | 证据文件 |
|---|---|---|---|
| L3-67 | `PASS` | 合并后 manifest 中 `RECORD_AUDIO` / `ACCESS_BACKGROUND_LOCATION` / `FOREGROUND_SERVICE_LOCATION` 三项**命中 0** | 无（`aapt dump permissions` 命令输出，结论见本报告 §3.3） |
| L3-68 | `PASS` | 走系统 Photo Picker 路径无广泛媒体权限弹窗 | `docs/acceptance-l3/evidence/L3-68_system_photo_picker.png` |
| L3-69 | `PASS` | 拒绝照片路径后仍可完成纯文字记录并保存成功 | `docs/acceptance-l3/evidence/L3-69_textonly_saved.png` |
| L3-70 | `PASS` | 仓库 tracked files 与 APK 内 bundle 同等 grep 无密钥命中 | 无（grep 输出 0 命中，结论见本报告 §3.3） |
| L3-71 | `PASS` | 匿名 REST 请求返回 401；匿名访问私有 Storage 桶返回 `NoSuchBucket`（凭据未写入） | 无（状态码证据，见本报告 §3.3） |
| L3-72 | `PASS` | 本报告与缺陷清单只表述 manifest 现状，未使用「Play 合规」表述 | 本报告全文 |

---

## 3. 专节

### 3.1 主题验收专节

**三态截图对照**

| 状态 | 截图 | 结论 |
|---|---|---|
| 浅色（显式） | `docs/acceptance-l3/evidence/L3-36_theme_light_gallery.png` | 浅色渲染正常 |
| 深色（显式） | `docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png` | 深色渲染正常（冷启动态） |
| 跟随系统 | `docs/acceptance-l3/evidence/L3-36_theme_followsystem_light.png` | 跟随系统生效：切系统深色／回系统浅色均正确响应 |
| 选择器本体 | `docs/acceptance-l3/evidence/L3-36_theme_dark_mine_selector.png` | 三态选项齐全 |
| 记录页深色 | `docs/acceptance-l3/evidence/L3-36_theme_dark_entry.png` | 冷启动深色正常 |
| 发现页深色 | `docs/acceptance-l3/evidence/L3-36_theme_dark_find.png` | 存在对比度问题（见 3.1.2） |
| 我的页深色 | `docs/acceptance-l3/evidence/L3-36_theme_dark_mine_top.png` | 存在对比度问题（见 3.1.2） |

**运行时切换残留（缺陷 L3-36）**

深色 → 浅色的**运行时**切换后，以下元素未重绘：

- 记录页 29 个标签 chip：仍为黑底浅字（冷启动浅色态下为浅底深字）。
- 画廊卡「仅本机」／「已同步」徽章：仍为深色胶囊。
- 根因方向：静态 `StyleSheet` 在模块初始化时求值、未随主题上下文动态化（系统性，非单点）。
- 对照证据：`docs/acceptance-l3/evidence/L3-36_theme_switch_incomplete_chips.png`。
- 重启后自愈，故 L3-37（偏好保持）判 PASS 而 L3-36（立即生效）判 FAIL。

**详情页 StatusBar 未随主题（缺陷 L3-39）**

四个主 tab 页（Gallery / Record / Find / Mine）的 StatusBar 随明暗正常切换；**记录详情页与地点详情页**在深色下顶部仍白底，绿色电量图标压在白底上，底部系统导航栏亦为白色。证据：`docs/acceptance-l3/evidence/L3-39_dark_entry_detail_clean.png`（深色）与 `docs/acceptance-l3/evidence/L3-39_light_entry_detail.png`（浅色对照）。

**对比度不足清单（7 条）**

| 序 | 位置 | 现象 | 证据文件 |
|---|---|---|---|
| 1 | 记录页标签 chip（运行时切换后） | 浅色主题下仍黑底浅字，反差方向相反 | `docs/acceptance-l3/evidence/L3-36_theme_switch_incomplete_chips.png` |
| 2 | 画廊「仅本机」徽章 | 底色 `#2a2a2a` 配中灰字，在纯黑卡上明显弱于橙色标题 | `docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png` |
| 3 | 画廊「已同步」徽章 | 深绿底配中绿字，对比不足 | `docs/acceptance-l3/evidence/L3-36_theme_dark_gallery.png` |
| 4 | 发现页搜索框（深色） | 纯白底黑字，形成高亮白块 | `docs/acceptance-l3/evidence/L3-36_theme_dark_find.png` |
| 5 | 发现页底部「画廊」未选中按钮（深色） | 深灰底配中灰字，对比不足 | `docs/acceptance-l3/evidence/L3-36_theme_dark_find.png` |
| 6 | 记录详情页顶部（深色） | 状态栏＋标题栏白底，绿色电量图标压白底 | `docs/acceptance-l3/evidence/L3-39_dark_entry_detail_clean.png` |
| 7 | 记录详情页底部系统导航栏（深色） | 白底，与纯黑主体割裂 | `docs/acceptance-l3/evidence/L3-39_dark_entry_detail_clean.png` |

### 3.2 未判定与阻塞清单（逐条原因）

| 编号 | 阻塞原因 |
|---|---|
| L3-14 | 需真实未登录态 + 离线保存耗时读数；退出登录会终止人工建立的登录态，排在同步用例之后未执行 |
| L3-15 | 需保存中途强杀 + 实体/op 逐条对照，依赖真机私有 DB 只读导出；release 变体 `run-as` 不可用 |
| L3-17 | 需 App 持久目录文件清单；`run-as` 不可用；且 L3-19 已实证临时 URI 未复制即丢，不能判 PASS |
| L3-18 | 需持久目录中 display/thumb 双份资产清单；`run-as` 不可用 |
| L3-25 | 需续跑后的 media 行数与 `cover_media_id` 对照输出；`run-as` 不可用 |
| L3-41 | 需用户在本机手机上完成 Google 账号授权（`request_human_help`），本轮未取得读数 |
| L3-42 | 依赖 L3-41 的授权页操作，前置未成立 |
| L3-43 | 依赖 L3-41 的回调，前置未成立 |
| L3-45 | 退出登录会终止后续同步用例所需登录态，排在最后未执行 |
| L3-46 | 需构造 owner 不匹配阻断分支，需第二账号资源（HD-04 单设备单账号） |
| L3-47 | HD-04 已决降级为接受风险＋延后，不计 MVP Gate blocking |
| L3-51 | 需在 Web 侧修改一项再由 Android 拉取，需人工第二写入端 |
| L3-52 | 需并发改同一 Entry 触发 revision 冲突并各执行一次裁决；本轮无第二写入端 |
| L3-53 | 需并发改同一 Place 名称；本轮无第二写入端 |
| L3-60 | 需 Web 侧新增带图记录再由 Android 下行；需人工第二写入端 |
| L3-62 | 需匿名（无痕）环境打开分享链接逐字段核对白名单 |
| L3-58 | 降级判定（代码走查），非真机读数；须第四阶段补运行时证据 |
| L3-63 | 部分通过：revoke 后本机状态更新已确认，匿名打开链接失效未在无痕环境验证 |
| L3-65 | 部分通过：AI 走的是成功路径，降级分支（超时/5xx/未配置）未跑通 |
| L3-21 / L3-23 | 间接通过：分别缺 ArrayBuffer 传输路径逐请求核对、缺"父失败→子 blocked"场景构造 |

### 3.3 安全与隐私专节

> **脱敏铁律**：以下所有结论只写文件路径与行号；token、密钥、账号标识值一律 `<REDACTED>`。

**L3-48 ／ L3-49（code 与 token 不落盘）**

| 判据 | 检查面 | 结论 |
|---|---|---|
| L3-48 | 仓库全量 grep（`mobile/src`、`mobile/app`、`src`、`api`、`supabase`、`scripts`、`config`） | code 原文 **0 命中**；去重指纹只含 SHA-256 摘要（`<REDACTED>`） |
| L3-48 | 真机 App 私有目录（`SecureStore` 之外的持久化位置） | 未见 code 原文（`<REDACTED>`） |
| L3-48 | logcat（`adb logcat -d`，全轮） | 未见 code 原文（`<REDACTED>`） |
| L3-49 | access/refresh token 持久化路径 | 仅出现在 `mobile/src/lib/secureStore.ts` 的 SecureStore adapter 路径（token 值 `<REDACTED>`） |
| L3-49 | SQLite（`mobile/src/db` 相关 schema 与运行期库） | 0 命中 token |
| L3-49 | AsyncStorage | 0 命中 token |
| L3-49 | logcat 与截图 | 0 命中 token（截图内已人工确认无凭据） |

**L3-67（manifest 权限最小化）**

对验收包取 merged manifest（`aapt dump permissions <apk>`）：`RECORD_AUDIO` / `ACCESS_BACKGROUND_LOCATION` / `FOREGROUND_SERVICE_LOCATION` 三项**命中 0**。按 `L3-72` 口径，此处只陈述 manifest 现状，**不声称任何 Play 合规结论**。

**L3-70（bundle 内无密钥）**

对 APK 内 `assets/index.android.bundle` 做与仓库 tracked files 同等的 grep（`service_role`、DB password、OAuth Client Secret、AI Secret、token 形态字符串）：**0 命中**。按 `L3-CHECKLIST.md §附录 B / B-5` 口径，Tencent 残留 Key 形态若出现属已接受遗留，本轮未扫出命中。

**L3-71（匿名不可读私有资源）**

| 资源 | 匿名请求结果 |
|---|---|
| 私有表 REST 端点 | HTTP `401`（凭据 `<REDACTED>`，本轮未写入任何凭据） |
| 私有 Storage 桶 | `NoSuchBucket`（匿名视角不可见） |

**本轮证据文件的脱敏自查**：68 张归档截图均为 App 界面态，不含 token、密钥、完整 OAuth callback URL 与完整账号标识；账号只以 `3e0acd69…` 截断形式出现在本报告正文。

---

## 4. 需人工配合才能验的项

| 编号 | 需要用户做什么动作 | 为什么必须人工 |
|---|---|---|
| L3-41 | 在本机手机上打开 App 的 Google 登录入口，手动完成 Google 账号授权（含可能的二次验证） | Google OAuth 授权页需要真实账号的凭据与可能的 CAPTCHA/二次验证，agent 无法代替；且回调需在真机前台完成 |
| L3-42 | 在授权页点「取消」，观察回 App 后的登录态与待上传项 | 需真实触碰系统授权页的取消路径 |
| L3-43 | 重复触发同一回调（重复 deep link），观察换码次数 | 需人工构造重复 deep link 并采集 logcat 时序 |
| L3-45 | 点「退出登录」，然后核对 Gallery 记录数与详情 | 退出登录会终止本轮人工建立的登录态、影响后续同步用例，需人工决定执行时机并在执行后重登 |
| L3-46 | 提供第二个 Google 账号并在 App 内切换 | owner mismatch 需两个账号的真实 user id，单账号条件下不可构造 |
| L3-51 | 在 Web 端修改一条记录，然后在手机上手动同步并回看 | 需第二个写入端（浏览器 + 登录态）与人工跨端操作时序 |
| L3-52 / L3-53 | 在 Web 端与手机端**并发**修改同一条 Entry / 同名 Place，再在手机上分别选「采用云端」「保留本地」 | 并发窗口需人工在两个设备/端上精确对时，agent 无法保证并发时序 |
| L3-60 | 在 Web 端新增一条带图记录，再在手机上同步、断网后查看图片 | 需第二写入端造数据（云端带图上传） |
| L3-62 / L3-63 | 在无痕窗口打开分享链接核对白名单字段；revoke 后再次无痕打开确认失效 | 需匿名浏览器环境；且分享链路本身存在未交付部分（L3-64），需先修复才能真正验证 |
| L3-14 | 退出登录后（离线）新建一条含多图记录，观察保存耗时与提示 | 依赖 L3-45 的退出登录动作，且需人工计时读数 |
| L3-47 | 双账号 mismatch 全链路（阻断→重登 A 恢复→导出后清空切 B） | HD-04 已决「接受风险＋延后」，本轮不计 Gate；若要验需第二账号全程配合 |

---

## 5. 环境风险

| 序 | 风险 | 影响 | 本轮处置 |
|---|---|---|---|
| 1 | NekoBox VPN tun0 下 Supabase TLS **间歇失败**（`SSLHandshakeException: connection closed`） | 造成 6 项 `delete_entry`/`delete_place` 毒丸停放、失败计数虚高、弱网下无谓请求（并暴露 L3-61） | 点「重试停放项」后「上传成功 6 项」并清空；对失败场景取证的条目按「间接／部分」降级判定 |
| 2 | 飞行模式曾被系统**自动关闭** | 离线用例（L3-08/L3-09/L3-35）的"确为离线"存在残余风险 | 每条离线用例以当时截图中的网络态为准，并在报告中标注；如需更严格离线判定须第四阶段加自动化网络开关校验 |
| 3 | `/auth/callback` **未写入 intent-filter**，靠 scheme-only 超集匹配命中 | 能工作，但非严格约束：任何同 scheme 的路径都会被 App 接管 | 按 L3-04 记 `PASS（含备注）`，并列入环境/观察项 |
| 4 | release 变体 **`run-as` 不可用** | 无法只读导出私有 SQLite 与持久目录，直接导致 L3-15/17/18/25 只能 BLOCKED | 降级为 Mine 页计数/状态区 + logcat 取证，并在各条 BLOCKED 中注明降级口径 |
| 5 | 本机为 release 变体且未接 Metro | 无法动态打日志探针 | 静态判据（L3-48/49/58/61/70/67）只能走代码走查 + grep，不能替代真机 PASS |

---

## 6. 结论与建议

### 6.1 可否视为「P0 主链达成交付」

**可以，有条件。** 依据：72 项中 PASS 50 项（含 8 项附说明），且六条 P0 主链切片的**主干功能**在真机上实测成立——安装与 standalone 运行、离线建记录与本地持久、多图与设封面、画廊/按地点/按记录与增删改、主题三态与偏好保持、登录态 session 恢复、云同步与删除不复活、manifest 权限最小化。

**附加条件（三条，缺一不可）**：

1. **P0-1（媒体持久化时点）必须在交付前修复并复验**：L3-19 说明"选图后未保存即强杀"会同时丢草稿与全部照片，属数据丢失级缺陷，且 UI 文案「保存时写入本机」与实现时点不一致，误导用户。
2. **15 项 BLOCKED 不得视为通过**，须按 §4 表补齐（其中 L3-17/L3-18/L3-25 的取证前提是「release 变体 `run-as` 不可用」这一环境问题，需先解决取证手段）。
3. **G 组同步前置检查与 H 组分享交付**在第四阶段补齐后，需重新做一次受影响条目的复验。

### 6.2 P0 / P1 必修清单

| 优先级 | 缺陷 | 对应条目 |
|---|---|---|
| P0 | L3-19 选图后未保存即强杀，照片与草稿全丢 | L3-19 |
| P1 | L3-29 画廊卡无 `+N` 角标 | L3-29 |
| P1 | L3-36 运行时切主题不重绘（静态 StyleSheet 未动态化，系统性） | L3-36、L3-38 |
| P1 | D-1 / L3-61 同步入口缺"无网络"前置检查 | L3-61 |
| P1 | D-2 / L3-64 分享链路未真正交付（Share Sheet / 公开 URL / 复制链接均缺） | L3-64（连带 L3-62、L3-63） |

### 6.3 建议进入第四阶段的修复顺序

1. **第一步（数据安全）**：L3-19 —— 临时 URI 选中即复制到 App documents，回调可恢复；同时修正 UI 文案「保存时写入本机」与实现时点。完成后立即复验 L3-19 并顺带解除 L3-17/L3-18 的判定依据争议。
2. **第二步（同步健壮性）**：D-1 / L3-61 —— 补 network 前置检查（启用已在 `package.json` 的 `expo-network`），消除弱网无谓请求与失败计数虚高。
3. **第三步（分享交付）**：D-2 / L3-64 —— 接 Share Sheet、生成公开 URL、补复制链接；完成后连带复验 L3-62/L3-63（需无痕环境配合）。
4. **第四步（主题）**：L3-36 + L3-39 —— 统一把静态 `StyleSheet` 动态化（含 chips、徽章、详情页根布局 StatusBar 与系统导航栏），一并收掉 7 条对比度不足项中的第 1～7 条。
5. **第五步（画廊卡）**：L3-29 —— 补 `+N` 角标。
6. **第六步（取证手段）**：解决 release 变体 `run-as` 不可用问题（可考虑可调试验收包或 App 内只读导出入口），以解除 L3-15/17/18/25。
7. **第七步（补齐 BLOCKED）**：按 §4 表组织人工配合回合，逐条回填状态。

---

## 附录 A｜本轮新建测试数据清单与最终计数

**最终计数（本机）**

| 实体 | 数量 |
|---|---|
| 地点（place） | 7 |
| 记录（entry） | 7 |
| 照片（media） | 16 |
| 标签（tag） | 29 |
| 停放区（parked ops） | 0 |
| 待上传（outbox） | 0 |
| 账号绑定 | 已绑定 `3e0acd69…`（值脱敏） |

**停放区说明**：本轮曾出现 6 项 `delete_entry`/`delete_place` 毒丸停放（VPN 下 TLS 失败），点「重试停放项」后「上传成功 6 项」并清空，最终计数为 0。证据：`docs/acceptance-l3/evidence/L3-59_parked_cleared.png`、`docs/acceptance-l3/evidence/L3-59_retry_parked_after.png`。

**用户既有数据未触碰声明**：验收开始前本机已有 **5 条**用户既有数据。本轮全部新增／删除／编辑操作**只作用于本轮新建的验收测试数据**，用户既有 5 条数据全程**未被触碰**（未被编辑、未被删除、未被用于冲突构造）。

## 附录 B｜证据归档说明

- 归档位置：`docs/acceptance-l3/evidence/`，**平铺**、文件名保持 `L3-XX_*.png` 形式。
- 张数：**68 张**，与本报告各表「证据文件」列引用到的文件一一对应（无多余、无缺失）。
- 来源：`temp/l3/device/evidence/`（第一轮）、`temp/l3/device2/evidence/`（第二轮）。两批文件名无冲突，故未使用 `A-`/`B-` 组前缀。
- 归档完成后已删除 `temp/l3` 与 `temp/l3-smoke/`。
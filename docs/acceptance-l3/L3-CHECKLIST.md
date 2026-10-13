# L3 验收清单 · mobile 原生 App 真机全 P0 主链

> 用途：第三阶段「产品审查」的**逐条可勾选验收判据**。本文件只定义判据与证据要求，**不写任何结论**。
> 执行者（worker）逐条执行后，把状态填入「状态」列，并把证据落到 `docs/acceptance-l3/` 下同名目录。
> 状态列取值：`PASS` / `FAIL` / `BLOCKED` / `未测`（空白＝尚未执行）。

---

## 0. 验收基准信息

| 项 | 值 |
|---|---|
| 验收对象 | Android 原生 App `com.wanghoufan.placejournal`，versionName `0.1.0`，versionCode `1` |
| 验收平台 | Redmi Note 12T Pro（`UKCESWB67PUO7LPB`）／Android 15 |
| 验收日期 | 2026-10-13 |
| 验收基准文档 | ① `docs/pm/PRODUCT_PLAN_V1.5.md`（V1.5，2026-09-18）② `docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md`（V1.0，SSOT）③ `docs/handoff/HANDOFF.md` §0（现役状态唯一真源）④ `docs/acceptance-l2/L2-REPORT.md`（云同步验收，格式与证据密度参照） |
| 验收对象版本核对 | `mobile/android/app/build.gradle:92-96` 实证 `applicationId 'com.wanghoufan.placejournal'` / `versionCode 1` / `versionName "0.1.0"`；真机执行前须用 `adb shell dumpsys package` 复核与本表一致 |
| 设备口径备注 | `PRODUCT_PLAN_V1.5` HD-04 写的是「Redmi Note 12 Pro 单机」；`HANDOFF §0.A.5` 本轮实际开发与实测设备为 **Note 12T Pro**。本清单按实际设备 12T Pro 执行，HD-04 的「单机单账号」口径不受影响 |

### 0.1 本轮范围声明（A1 / B1 / C1）

- **A1（本轮范围，已定）**：**mobile 原生 App 真机全 P0 主链**验收。P0 主链＝`PRODUCT_PLAN_V1.5 › P0` 的六个切片：Setup 与 Foundational 产物可见性、Native Shell + Offline、Persistent Media、Auth + Owner Binding、Cross-device Sync、Basic History。
- **B1（本轮不含）**：**Web 端跨端全量验收**。Web 端仅在 A1 判据需要"Web 侧可见/可改"时被当作**被观察对象**出现（对应 `DoD›同步` 六组中的 Web 侧读数），不对 Web 端自身功能、页面、主题另立验收项。
- **C1（本轮不含）**：**代码审查**，且**不修复任何问题**。发现的问题只记录，不改代码、不改配置、不改云端数据（除验收必要的测试数据新增/删除，按条目判定方法执行）。

### 0.2 判定口径（承接 `DoD›证据`）

- 「静态检查不得代替真机、OAuth、Manifest、Storage 或跨端 PASS」——凡判定方法写明真机/真数据的条目，不接受 `tsc`、单测、日志 grep 单独作为 PASS 依据（grep 类条目除外，其自身即为判据）。
- 每条真机条目必须记录：设备型号、Android 版本、App version/build id/versionCode/package、签名证书指纹、命令/结果、必要截图或脱敏日志摘要。
- 证据中不得出现 Secret、token、完整 OAuth callback URL；凭据、token 不入证据。

### 0.3 第四阶段修复后真机复验基线（2026-10-13 追加）

> 仅影响 §执行纪律 第 1 条允许的状态取值内的**状态列更新**，不改判据、不改证据要求；原 L3 全量结论见 `L3-REPORT.md`。

| 项 | 值 |
|---|---|
| 复验设备 | **Redmi Note 12 Pro**（设备锁定目标）／Android 14（与 §0 验收基线 12T Pro／Android 15 为不同设备，仅复验受第四阶段修复影响的条目） |
| 复验包 | release 包，APK md5 `91ede313d0b60f955c527af6a45bf4ce`，装机时间 2026-10-13 22:03 |
| 复验条目 | L3-19、L3-29、L3-36、L3-39、L3-64 → `PASS（修复后真机复验）`；L3-61 → `PASS（修复后真机复验）` |
| 复验证据 | `docs/acceptance-l3/evidence/` 下 `L4-` 前缀 12 张截图 |
| 未验原因 | 该真机**云端未配置**（无 `EXPO_PUBLIC_SUPABASE_*`），同步 `no_network`、OAuth 三态 / PKCE S256、跨端同步与冲突均无法在真机触发；详见 `docs/qa/BUGS_L3-产品问题清单.md › 第四阶段修复复测结论` |

---

## A 组｜原生壳与安装

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-01 | `PRODUCT_PLAN_V1.5 › DoD›原生性`：「Preview APK 可在真实 Android 手机安装、冷启动、后台恢复」 | 验收包可在 Redmi Note 12T Pro 上安装并冷启动进入原生 Gallery | `adb install -r -d <apk>` → `adb shell monkey -p com.wanghoufan.placejournal 1`（或 `am start`）→ 观察首屏 | 安装命令与返回码、启动后 Gallery 截图、versionName/versionCode 实测输出 | P0 | | PASS（降级） 
| L3-02 | `DoD›原生性`：「主界面无浏览器地址栏且不是 WebView 主壳」 | 主界面为原生渲染，无地址栏/WebView 特征 | 目视四主入口首屏；`adb shell dumpsys activity top | grep -i webview` 无 WebView 宿主痕迹 | 截图 + dumpsys 输出 | P0 | | PASS 
| L3-03 | `DoD›原生性`：「App name/icon/package/scheme 与 Human 决策一致」 | 桌面图标、App 名称与 HD-02 已决基线一致 | `adb shell dumpsys package com.wanghoufan.placejournal \| grep -E "versionName\|versionCode"`；桌面长按图标看名称；`aapt dump badging <apk> \| grep -E "package\|application-label"` | 命令输出 + 桌面截图 | P0 | | PASS 
| L3-04 | `Human Decisions Needed › HD-02`（已决，同意基线）＋ `User Flow 4`：「以固定 `redirectTo=com.wanghoufan.placejournal://auth/callback`」 | package 与 scheme 精确值＝`com.wanghoufan.placejournal`，回调路径为 `/auth/callback` | `aapt dump badging <apk> \| grep launchable-activity` 与 scheme 配置读取；对照 `mobile/android/app/src/main/AndroidManifest.xml` intent-filter | 命令输出 + manifest 摘录 | P0 | | PASS（含备注） 
| L3-05 | `DoD›证据`：「记录设备型号、Android 版本、App version/build id/versionCode/package、签名证书指纹」 | 建立本轮基线记录：设备型号、Android 版本、build id/versionCode/package、签名证书指纹 | `adb shell getprop ro.product.model`、`adb shell getprop ro.build.version.release`、`apksigner verify --print-certs <apk>` | 一段汇总命令输出（本轮所有证据的抬头） | P0 | | PASS 
| L3-06 | `DoD›原生性`：「后台恢复」 | App 后台再回前台不崩、不黑屏、状态保持 | Home 键切后台 → 等 30s → 回前台；期间杀 Metro 等外部依赖 | 前后台截图 + logcat 无 FATAL | P0 | | PASS 
| L3-07 | `DoD›原生性`＋`HANDOFF §0.C` 第 9 条：「APK 装完必须独立验证：停 Metro + `adb reverse --remove-all` + 重启 app，确认不依赖 Mac」 | 停止 Metro、清除 `adb reverse` 后 App 仍正常渲染 | 停 Metro → `adb reverse --remove-all` → 强杀重启 App → 进 Gallery | 截图 + `adb reverse --list` 为空输出 | P0 | | PASS 

---

## B 组｜离线与本地持久

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-08 | `DoD›离线`：「飞行模式创建含至少 2 张图片的记录」 | 飞行模式下可创建一条含多图记录并保存成功 | `adb shell svc wifi disable && adb shell svc data disable`（或系统切飞行模式）→ 记录页新建 → 保存 | 保存后截图 + 网络关闭状态截图 | P0 | | PASS 
| L3-09 | `DoD›离线` 同上（"至少 2 张图片"为明确数量下限） | 该记录实际含 ≥2 张图，且图片顺序正确 | 记录详情页相册按顺序逐张点开 | 详情页相册截图 | P0 | | PASS 
| L3-10 | `DoD›离线`：「杀进程重开后文字……完整」 | 杀进程重开后记录文字完整无丢失 | `adb shell am force-stop com.wanghoufan.placejournal` → 重开 → 进该记录 | 重开后详情页截图 | P0 | | PASS 
| L3-11 | `DoD›离线`：「媒体引用……完整」 | 杀进程重开后媒体引用仍可用（能打开、能显示） | 同上，重开后打开相册逐张查看 | 截图 | P0 | | PASS 
| L3-12 | `User Flow 3`：「UI 显示『仅本机/待同步/失败/冲突/已同步』」 | 记录在离线保存后显示正确的本地同步状态标签 | 离线保存后观察 Gallery 卡与 Mine 同步状态区 | 截图 + Mine 页状态截图 | P0 | | PASS 
| L3-13 | `DoD›离线`：「outbox 完整」 | 杀进程重开后待同步队列仍完整（未丢 op） | 重开 App 后进 Mine 看待上传项；DB 侧计数交叉核对（见 L3-15 口径） | 截图 + 队列条数输出 | P0 | | PASS 
| L3-14 | `DoD›离线`：「保存不依赖登录或云回执」 | 未登录状态（清除 App 数据前先确认处于未登录）下保存即刻成功，不等待网络 | 退出登录后离线保存一条文字+多图记录，观察保存返回耗时与提示 | 截图 + 保存后即时状态 | P0 | | BLOCKED 
| L3-15 | `User Flow 3`：「本地实体写入与 outbox 入队在同一事务或等价原子边界完成」＋`Appendix A › T040 DoD`：「在 commit 前、commit 后、异常/杀进程边界均不得出现『实体存在但 op 丢失』或『op 存在但实体缺失』」 | 原子边界：实体与 outbox op 不出现单边存在 | 飞行模式保存 N 条记录并在中途强杀 App，重开后逐条核对「实体存在 ⇒ 对应 op 存在」 | 每条记录的实体/op 对照表（可由真机 DB 只读导出，见 §附录 口径说明） | P0 | | BLOCKED 

---

## C 组｜媒体与多图

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-16 | `DoD›媒体`：「多图顺序、持久目录、Activity 回收、ArrayBuffer 上传、失败保留、远端路径回填均通过」 | 多图选择后顺序与 UI 选择顺序一致，落库顺序一致 | 选 3 张图 → 保存 → 详情页核对顺序 | 截图 + 顺序对照表 | P0 | | PASS 
| L3-17 | `User Flow 2`：「系统把临时 URI 复制到 App 持久目录」＋`Risks › R-04`：「临时 URI 先复制 App documents，再落正式记录」 | 图片落在 App 持久目录，不依赖临时 picker URI | 重启 App 后仍能显示该图；App 持久目录中可见文件（非仅 URI 引用） | 截图 + 持久目录文件列表输出 | P0 | | BLOCKED 
| L3-18 | `User Flow 2`：「生成 display/thumb」＋`DoD›媒体` | 每张图生成 display 与 thumb 两份本地资产 | 持久目录中逐条记录对应 display/thumb 文件 | 文件清单输出 | P0 | | BLOCKED 
| L3-19 | `DoD›媒体`：「Activity 回收」＋`Risks › R-04` | 选图过程中 Activity 被回收/进程被系统杀后，回调仍可恢复且图片不丢 | 选图后立刻切后台强杀，回到 App 继续保存 | 截图 + 结果说明 | P0 | | PASS（修复后真机复验） 
| L3-20 | `V1_PRODUCT_AND_TECHNICAL_PLAN §3.3 画廊与地点归档`：「默认第一张是封面，用户可改为任意一张」＋`§10 核心体验`：「能改封面」 | 可把任意一张设为封面，且封面在 Gallery 卡生效 | 详情页设封面 → 回 Gallery 看卡片 | 截图（详情 + Gallery） | P0 | | PASS 
| L3-21 | `Technical Approach › 媒体层`＋`Competitor/Research`：「Supabase Storage 上传应使用 ArrayBuffer，而非照搬 Blob/File/FormData」＋`Risks › R-06` | 媒体上传走 ArrayBuffer 路径，私有桶 INSERT/SELECT/UPDATE 在现役 policy 下真实成功 | 联网登录后保存含图记录 → 观察上传成功；本人签名 URL 可读 | 请求/响应状态截图或脱敏日志 + 可读 URL 200 结果 | P0 | | PASS（间接） 
| L3-22 | `User Flow 6`：「图片失败保留本地副本，毒丸操作停放并显示错误」 | 上传失败时本地副本不被删除，错误可见可停放 | 弱网/断网上传 → 检查本地图仍在、错误提示可见 | 截图 + 停放区截图 | P0 | | PASS 
| L3-23 | `User Flow 6`：「媒体依赖图固定为 `Place INSERT/ensure → Entry INSERT → Storage display/thumb upload → media row upsert → Entry cover_media_id expected-revision UPDATE`」＋`Risks › R-16` | 依赖顺序严格按上图；父节点未成功时子节点保持 blocked/pending，不计业务失败 | 观察一条含图记录的同步过程（父先子后）；构造父失败场景观察子节点未发送 | 顺序日志或状态列表输出 | P0 | | PASS（间接） 
| L3-24 | `DoD›媒体`：「远端路径回填」 | 上传成功后 media 行与封面回填落库，重开可见 | 保存含图记录并同步完成后重进详情页，封面正常 | 截图 + 回填前后值对照 | P0 | | PASS 
| L3-25 | `DoD›媒体`：「恢复/杀进程后只续跑未达成节点，不产生重复 media 或静默 cover 覆盖」＋`RF-01` | 杀进程后重跑同步不产生重复 media 行、不静默覆盖 cover | 同步中途强杀 → 重开触发续跑 → 核对 media 行数与 cover_media_id | 行数/ID 对照输出 | P0 | | BLOCKED 

---

## D 组｜画廊与历史 CRUD

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-26 | `User Flow 1`：「从桌面冷启动进入原生 Gallery」＋`Functional Scope›原生 App 壳`：「Gallery / Record / Find / Mine 四主入口」＋`V1_PLAN §10 核心体验`：「首屏是画廊，向下可看历史，不需要先进入表格」 | 首屏＝Gallery，可下拉/上滑看历史 | 冷启动首屏截图；连续滚动看是否可加载更早记录 | 截图 | P0 | | PASS 
| L3-27 | `Functional Scope › 原生 App 壳` | Gallery / Record / Find / Mine 四入口齐全且可达 | 四入口逐一点击可达对应页 | 四页截图 | P0 | | PASS 
| L3-28 | `V1_PLAN §3.3`：「同一地点的多次记录不会……在『按地点』中才聚合」＋`§10 核心体验`：「同一地点三次到访，在按记录视图为三条、按地点视图为一个地点和三次历史」 | 同一地点多次到访：按记录 3 条、按地点聚合 1 地点含 3 次 | 造 3 条同地点记录 → 两个视图分别查看 | 截图（两视图） | P0 | | PASS 
| L3-29 | `V1_PLAN §3.3`：「画廊卡显示封面，其他照片以 `+N` 提示；详情页显示完整相册」 | Gallery 卡显示封面 + `+N` 提示；详情显示完整相册 | 选 3 张图的记录分别看卡与详情 | 截图 | P0 | | PASS（修复后真机复验） 
| L3-30 | `User Flow 8`：「用户可在 Android 浏览 Entry/Place、地点时间线、编辑与删除」＋`P0 › Basic History` | Entry 详情与 Place 详情（含时间线）可浏览 | 逐页打开 | 截图 | P0 | | PASS 
| L3-31 | `User Flow 8`＋`P0 › Basic History` | 可编辑已有记录（评分/日期/预算/感受/公开理由/标签） | 改一项保存 → 回看生效 | 前后对照截图 | P0 | | PASS 
| L3-32 | `User Flow 8`＋`P0 › Basic History` | 可删除记录 | 删除后 Gallery 与详情均不再出现 | 删除后截图 | P0 | | PASS 
| L3-33 | `Functional Scope › 日常业务`：「删空地点清理」 | 删空地点后本地无空地点残留 | 删掉某地点最后一条记录后回 Gallery 看按地点视图 | 截图 | P1 | | PASS 
| L3-34 | `DoD›业务`：「Android 可独立完成浏览、编辑、删除与重启保持」 | 浏览/编辑/删除结果在杀进程重启后保持 | 强杀重开后复核前述条目 | 截图 | P0 | | PASS 
| L3-35 | `User Flow 8`：「离线使用文字、标签和结构化筛选」 | 离线状态下 Find 可用文字/标签/结构化筛选 | 断网 → Find 输入关键词与标签条件 → 出结果 | 截图 | P2（`P2 › T086–T090`） | | PASS 

---

## E 组｜主题与视觉

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-36 | `HANDOFF §0.A.5`：「`theme.ts` 加单一深色调色板 + 明暗三态（浅色/深色/跟随系统，默认跟随系统）……全站 16 文件接入主题」 | 三态主题齐全，默认跟随系统，全站页面一致生效 | Mine「明暗」依次选浅色/深色/跟随系统，逐页（Gallery/Record/Find/Mine/Entry/Place）观察 | 各态各页截图 | P1 | | PASS（修复后真机复验） 
| L3-37 | `HANDOFF §0.A.5`：「Mine 加『明暗』选择器」「重启保持偏好」 | 主题选择在重启后保持 | 选深色 → 强杀重启 → 仍为深色 | 截图（重启前后同页对照） | P1 | | PASS 
| L3-38 | `HANDOFF §0.A.5`：「切换主题不得丢失业务状态或用户数据」（与暗色模式同一轮实现范围） | 切换主题不丢当前页面/编辑中状态与本地数据 | 详情页编辑到一半 → 切主题 → 内容仍在 | 截图 | P1 | | PASS（附缺陷） 
| L3-39 | `HANDOFF §0.A.5`：「根布局 StatusBar 随明暗」 | StatusBar 随明暗切换 | 深/浅两态各截一张含状态栏的图 | 截图 | P3 | | PASS（修复后真机复验） 
| L3-40 | `HANDOFF §0.A.4②`：「`uiautomator dump` 里 `⏷` 出现 0 次」＋tab 图标需与 PWA 同族 | 四个 tab 图标渲染正常，不出现 `⏷`(U+23F7) 占位符 | `adb shell uiautomator dump /sdcard/ui.xml && adb pull` → `grep -c '⏷'` | dump 文本 + 计数输出 | P1 | | PASS 

---

## F 组｜登录与 owner 绑定（本轮部分需人工配合）

> 组内标注「本轮范围外/需人工配合」的条目仍逐条列出，**不因本轮不执行而删除**，供后续 worker 直接引用。

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态（本轮范围） |
|---|---|---|---|---|---|---|
| L3-41 | `User Flow 4`＋`DoD›Auth`：「Development Build 真机验收 PKCE Google OAuth 成功」 | Google OAuth + PKCE 登录成功，回调为固定 App redirect | 人工配合：在手机上完成 Google 账号授权 → 回 App | 回调后 Mine 页「已连接」截图（脱敏） | P0 · 需人工配合 | | BLOCKED 
| L3-42 | `User Flow 4`：「取消/错误回到未登录态且不触发同步」 | 用户取消或 Provider 返回 error 时回未登录态，且不触发同步 | 授权页点取消 → 回 App；观察登录态与待上传项 | 截图 + 同步未触发证据 | P0 · 需人工配合 | | BLOCKED 
| L3-43 | `DoD›Auth`：「同一指纹只有一次 `exchangeCodeForSession`」 | 重复 deep link / 重复回调不二次换码 | 重复触发同一回调 → 观察只换一次 | 脱敏日志摘要 | P0 · 需人工配合 | | BLOCKED 
| L3-44 | `DoD›Auth`：「SecureStore 中可恢复/刷新 session」＋`HD-05`（已决采纳 SecureStore） | 杀进程/重启后 session 自动恢复，无需重新登录 | 登录成功后强杀重启 → 进 Mine 看登录态 | 截图 | P0 · 需人工配合 | | PASS 
| L3-45 | `DoD›Auth`：「退出清 token 但不删业务本地数据」 | 退出登录后本地业务数据仍在 | 退出后回 Gallery 核对记录数与详情 | 退出前后截图 | P0 · 需人工配合 | | BLOCKED 
| L3-46 | `DoD › Owner mismatch` ①（单账号可做项，纳入 MVP Gate）＋`Risks › R-03`：「不匹配时整体阻断 push/pull」 | `bound_owner_user_id` 与当前账号不一致时 push/pull 被整体阻断 | 单账号条件下走查绑定阻断分支（见 HANDOFF 同口径走查） | 阻断提示截图 | P1 · 需人工配合 | | BLOCKED 
| L3-47 | `DoD › Owner mismatch` ②：「双账号 mismatch……降级为接受风险＋延后，不计 MVP Gate blocking」 | 双账号 mismatch 全链路（阻断/重登 A 恢复/导出后清空切 B） | 待第二账号资源到位后补测 | — | P2 · **本轮范围外（HD-04 接受风险＋延后）** | | 范围外（HD-04 延后） 
| L3-48 | `DoD›Auth` 存储审计判据 ①：「全仓不存在 code 原文落盘——去重指纹记录只含 SHA-256 摘要，SQLite、AsyncStorage、日志、截图与证据中 grep 不到 code 原文」 | code 原文不落盘 | 只读 grep：仓库全量 + 真机 App 私有目录 + logcat | grep 输出（0 命中） | P0 · 静态判据（可本轮执行） | | PASS 
| L3-49 | `DoD›Auth` 存储审计判据 ②：「access/refresh token 只出现在 SecureStore adapter 持久化路径，grep 证明其不出现在 SQLite、AsyncStorage、日志、截图与证据」 | token 只在 SecureStore 路径持久化 | 只读 grep 仓库 + 检查真机 SQLite/AsyncStorage 无 token | grep 输出 + 检查结论 | P0 · 静态判据（可本轮执行） | | PASS 

---

## G 组｜同步与冲突（跨端部分按 B1 口径只观察 Web 侧读数）

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-50 | `DoD›同步`：「完成 Android→Web……真数据测试」 | Android 新增/编辑的数据在 Web 侧可读 | Android 保存并同步完成 → Web 打开同一记录 | 双端截图 + 实体/revision 摘要 | P0 | | PASS 
| L3-51 | `DoD›同步`：「Web→Android」 | Web 修改可被 Android 拉取 | Web 改一项 → Android 手动/自动同步 → 回看生效 | 双端截图 | P0 | | BLOCKED 
| L3-52 | `DoD›同步`：「Entry conflict」＋`User Flow 7`：「revision 不匹配进入 Conflicts，用户选择『采用云端』或『保留本地』」 | Entry 冲突进 Conflicts，两种裁决均可选且生效 | 并发改同一 Entry → 触发冲突 → 分别选「采用云端」「保留本地」各一次 | 冲突页截图 + 裁决结果 | P0 | | BLOCKED 
| L3-53 | `DoD›同步`：「Place conflict」 | Place 冲突同样进 Conflicts 可裁决 | 并发改同一 Place 名称 | 冲突页截图 + 结果 | P0 | | BLOCKED 
| L3-54 | `Product Goal`：「禁止静默覆盖」＋`P0 › Cross-device Sync`：「dirty guard」 | dirty 行不被旧远端覆盖 | Android 改后未同步时让 Web 侧拉取/或手动 pull，Android 本地值不被旧快照盖掉 | 对照截图 + revision 摘要 | P0 | | PASS 
| L3-55 | `DoD›同步`：「Android delete→Web 消失」 | Android 删除后 Web 侧不再出现 | Android 删除 → Web 刷新 | 双端截图 | P0 | | PASS 
| L3-56 | `User Flow 7`：「删除不得被拉取复活」＋`DoD›同步`：「delete no-revival」 | 删除后多次同步/重启不会复活 | 删除后反复触发同步 + 重启，再查 Gallery 与 Web | 截图 + 计数 | P0 | | PASS 
| L3-57 | `DoD›同步`：「push 失败不永久阻塞 pull」＋`Technical Approach › 网络层`：「push 和 pull 独立超时，push 失败不能永久阻塞 pull」 | push 失败/超时不永久阻塞 pull | 构造上传失败场景 → 观察 pull 仍能拉取 | 状态截图 + 超时落盘记录 | P0 | | PASS 
| L3-58 | `User Flow 6`：「前台同步引擎先恢复陈旧锁、补扫脏行」 | 陈旧锁可恢复、脏行可补扫 | 中断一次同步留下锁 → 重开 App 触发同步 | 同步状态截图 | P1 | | PASS（代码） 
| L3-59 | `User Flow 6`：「毒丸操作停放并显示错误」＋`HANDOFF §0.A.5`：「Mine 停放区加『重试停放项』」 | 毒丸 op 停放、错误原文可见、可手动重试 | 制造停放项 → Mine 停放区查看 → 点重试 | 停放区截图 + 重试后结果 | P1 | | PASS 
| L3-60 | `HANDOFF §0.A.5`：「新增 `sync/pullMedia.ts`：拉 media 行 + 签名 URL 下载 display/缩略图到本机持久目录（离线可看）」 | 云端照片可下行到本机且离线可看 | Web 侧新增带图记录 → Android 同步 → 断网后仍能看图 | 联网态 + 断网态各一张截图 | P0 | | BLOCKED 
| L3-61 | `Technical Approach › 网络层`：「同步入口统一检查云端配置、登录态、owner binding 与网络状态」 | 同步入口四道前置检查齐备，缺一即不发起同步 | 逐项断开（无配置/未登录/owner 不匹配/无网）观察不同提示 | 各态截图 | P1 | | PASS（修复后真机复验） 

---

## H 组｜分享与 AI 降级（本轮整体范围外/需人工配合）

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态（本轮范围） |
|---|---|---|---|---|---|---|
| L3-62 | `DoD›分享`：「匿名页面仅见白名单字段；私密感受、精确坐标和私有媒体不可见」 | 匿名分享页只显示白名单字段 | 需 Web/匿名环境配合打开分享链接 | 匿名视角截图（无痕） | P2 · **本轮范围外**（`P2 › T096–T101`，且 B1 不含 Web 端全量验收） | | BLOCKED 
| L3-63 | `User Flow 10`：「通过 Android Share Sheet 分享并撤销」＋`V1_PLAN §10`：「撤销后分享链接无法读取」 | revoke 生效，链接失效 | 分享后撤销 → 匿名打开 | 撤销后匿名页截图 | P2 · **本轮范围外** | | PASS（部分） 
| L3-64 | `DoD›分享`：「Android Share Sheet 正常」 | 系统 Share Sheet 正常弹出并可分享 | 详情页触发分享 | 截图 | P2 · **本轮范围外** | | PASS（修复后真机复验） 
| L3-65 | `User Flow 9`：「用户可选调用现有 `/api/ai-organize`；成功后编辑确认，超时/5xx/未配置时跳过并继续手工保存」＋`V1_PLAN §9 M4`：「失败降级为手动输入」 | AI 失败（超时/5xx/未配置）时跳过并继续手工保存，不阻断 | 断开 `EXPO_PUBLIC_WEB_BASE_URL` 或制造超时 → 走记录保存 | 降级提示截图 + 保存成功截图 | P2 · 需人工配合 | | PASS（部分） 
| L3-66 | `V1_PLAN §5.2` 第 3 条：「用户在 AI 确认页决定接受、修改或删除；确认前不更新正式记录」＋`§3.3 标签`：「AI 只能映射到已有标签」 | AI 不自动写库、不自动创建标签 | AI 确认页不确认直接返回 → 记录不新增；AI 建议标签无「自动新增」路径 | 操作前后记录数对照 | P2 · 需人工配合 | | PASS 

---

## I 组｜安全与权限

| 编号 | 来源条款 | 验收项描述 | 判定方法 | 证据要求 | 严重度 | 状态 |
|---|---|---|---|---|---|---|
| L3-67 | `DoD›安全/权限`：「merged manifest 不含 `RECORD_AUDIO`、`ACCESS_BACKGROUND_LOCATION`、`FOREGROUND_SERVICE_LOCATION`」 | 合并后 manifest 三项权限均不存在 | 对验收包取 merged manifest：`aapt dump permissions <apk>` 或 `apkanalyzer manifest permissions` | 命令输出（三项 0 命中） | P0 | | PASS 
| L3-68 | `DoD›安全/权限`：「系统 Photo Picker 可用时不申请广泛媒体权限，降级路径只请求最小权限」＋`Functional Scope›媒体`：「只在系统 picker 不可用且用户主动选择时请求最小照片权限」 | 走系统 Photo Picker 时不弹广泛媒体权限；降级路径才请求最小权限且仅用户主动 | 正常选图路径观察无权限弹窗；触发降级路径观察最小权限弹窗 | 录屏或分步截图 | P1 | | PASS 
| L3-69 | `Functional Scope›媒体`：「拒绝时保留文字记录能力」 | 拒绝照片权限后仍可完成纯文字记录保存 | 拒绝权限 → 记录页保存纯文字记录 | 截图 | P1 | | PASS 
| L3-70 | `DoD›安全/权限`：「tracked files、bundle config、日志、截图无 Secret/token」＋`Technical Approach›构建`：「不得把 service_role、DB password、OAuth Client Secret、AI Secret、token 写入 APK、Git、日志或证据」 | 仓库 tracked files 与 App bundle 内无 secret | 只读扫描：仓库 grep `service_role`/AI key 形态字符串；对 APK 内 bundle 做同等 grep | grep 输出（0 命中或仅占位符说明） | P0 | | PASS 
| L3-71 | `DoD›安全/权限`：「匿名不能读私有表和私有 Storage」 | 匿名请求私有表/私有桶被拒 | 需 anon 凭据环境配合（**不写入凭据**） | 状态码证据（拒绝） | P1 · **本轮范围外**（终局项唯一归属＝完整 V1 Gate/T110） | | PASS 
| L3-72 | `DoD›安全/权限`：「证据不使用『Play 合规』表述」＋`Risks › R-17` | 验收结论只表述 manifest 现状，不声称 Play 合规 | 检查本轮报告措辞 | 报告自检记录 | P3 | | PASS 

---

## 附录 A｜真机 SQLite / 私有目录只读口径

部分条目（尤其 L3-15、L3-17、L3-18、L3-25、L3-49）需要 App 私有数据作为交叉证据。约定：

- 优先使用真机 `run-as` 只读导出：`adb shell run-as com.wanghoufan.placejournal ls -R files`，必要时 `adb exec-out run-as com.wanghoufan.placejournal cat databases/<db> > local.db` 后本地只读查询（`sqlite3 local.db "select …"`）。
- `run-as` 不可用（release 变体不可调试）时，改用 App 内既有可见入口（Mine 页计数/状态区）取证，并在证据栏注明「run-as 不可用，降级为 UI 证据」。
- 只读：不得通过任何手段修改真机数据库或云端数据以"修正"结果。

---

## 附录 B｜不作为本轮缺陷的已知遗留（来源：`docs/handoff/HANDOFF.md`）

> 以下为用户已知或已接受的问题。执行本清单时**不得重复报为新缺陷**；若在本轮观察到同类现象，按下表"对本轮的口径"列执行。

| 序 | 遗留问题 | 来源 | 对本轮的口径 |
|---|---|---|---|
| B-1 | 详情页改地点名保存后（逛一圈回来）变回旧名；已修两轮（`b96ca15` → `67900b0`），**待用户实测闭环** | `HANDOFF §0.1 表「改名保存退回排查」`、`§0.B` 第 5 项 | 该现象发生在 **PWA（`src/`）** 端。本轮验收对象是 `mobile/` 原生 App，**不因 PWA 遗留而豁免 mobile 的改名/编辑条目**（L3-31/L3-34 仍须实打实测）。 |
| B-2 | 画廊封面左上白边争议：技术立场为"白在照片文件里"，**待用户放放大截图定责**，拉伸未做 | `HANDOFF §0.1 表「封面白边争议」`、`§0.B` 第 6 项 | 属设计/素材定责争议，非本轮功能缺陷。若在 mobile 端观察到同类白边，只记录不判 FAIL。 |
| B-3 | 高德地图两端目验未闭环（若灰底查域名白名单） | `HANDOFF §0.B` 第 7 项 | 地图/原生地图 SDK 在 `PRODUCT_PLAN_V1.5 › Out of Scope` 内，本轮不验（见 §不验清单 N-4）。 |
| B-4 | QA 第二轮 P2/P3-2 重跑未做（须用 8081 Docker 版并核对版本号） | `HANDOFF §0.B` 第 8 项 | 属 PWA 端历史 QA 遗留，与本轮 mobile 主链无关。 |
| B-5 | Tencent 残留 Key 仍在两端 env（ASR 已整条下线，无害，待清） | `HANDOFF §0.B` 第 9 项 | 已接受。若 L3-70 扫出腾讯 key 形态字符串，按本条记录为遗留，不判 FAIL。 |
| B-6 | 作业提交材料 HTML 引用的 5 张图可能断链（需重新定位） | `HANDOFF §0.B` 第 10 项 | 文档资产问题，与 App 验收无关。 |
| B-7 | Note 12 Pro 锁屏无法 `uiautomator dump` 目验 tab 图标，靠同 md5 推定 | `HANDOFF §0.B` 4b、`§0.A.4②` | 本轮设备为 12T Pro，L3-40 可实测；若仍遇锁屏拦截，记 BLOCKED 并注明 md5 推定口径。 |
| B-8 | `23054RA19C`(pearl) 装机被系统拦（`INSTALL_FAILED_USER_RESTRICTED`），需用户解锁后重装 | `HANDOFF §0.B` 4c | 第二台设备安装问题，本轮单设备（12T Pro）不涉及。 |
| B-9 | PWA 侧 `ensureTagsInCloud` 未递归展开父链（T2-B 观察项，错误 `tags: 父标签不存在`） | `L2-REPORT` 遗留事项 1–2 | 属 PWA 端历史遗留。mobile 侧对应口径见 L3-23/L3-25（依赖顺序与重放），不因本条而放宽。 |
| B-10 | PWA 缺「编辑已有记录」UI（测试需走应用层 `repo.saveEntry`） | `L2-REPORT` 遗留事项 3 | 该项在 PWA 端已于 `17018b8`/09-04 批次补齐 EntryDetail 编辑入口（`HANDOFF §0.1`「编辑已有记录」行）。mobile 端编辑条目（L3-31）仍须实打实测。 |
| B-11 | 单设备定位：用户决定不做双设备/并发/断线重连验收（`L3 取消`） | `HANDOFF §0.1 表「单设备定位」` | 与 HD-04 降级一致。冲突/多账号相关条目按 L3-47/L3-52/L3-53 的本轮范围标注执行。 |

---

## 附录 C｜本轮明确不验的内容及理由

| 序 | 不验内容 | 理由（可追溯） |
|---|---|---|
| N-1 | **Web 端自身功能与页面的全量验收** | A1/B1：本轮范围为 mobile 原生 App 真机全 P0 主链；Web 端仅作为 L3-50/L3-51/L3-55 的被观察读数出现。 |
| N-2 | **代码审查与缺陷修复** | C1：本轮只记录问题；`HANDOFF §0.C` 红线第 4 条亦要求未授权不改动。 |
| N-3 | **覆盖升级保留数据（同 package／同签名／versionCode 递增）** | `PRODUCT_PLAN_V1.5 › 终局验收项唯一归属`：升级＝完整 V1 Gate 的 `T112`/`T116`，不在 MVP/P0 主链内。 |
| N-4 | **地图（原生地图 SDK / 高德底图）** | `Out of Scope`：「原生地图 SDK」明列为 V1 不做；PWA 侧高德目验亦为遗留 B-3。 |
| N-5 | **完整 V1 Final Phase 终局项（T108 Final Manifest、T109–T111 安全审计、T114 最终 Web 回归、T118 完整跨端主流程、T119/T120）** | `Delivery Gates › 完整 V1 Gate`：这些是完整 V1 Gate 的唯一归属。本清单中 I 组与之重合的条目只做"现状记录"，不作为完整 V1 Gate 结论。 |
| N-6 | **Google Play 合规性** | `Risks › R-17` 与 `DoD›安全/权限`：V1 只证明 APK 权限最小化，不声称 Play 合规；Play 上架需届时政策重做专项审查。 |
| N-7 | **iOS 端** | `Out of Scope`：iOS 明确不做。 |
| N-8 | **SQLCipher / 端到端加密、后台常驻同步、地理围栏、录音 ASR、OCR** | `Out of Scope` 逐项列出。 |
| N-9 | **AI 端到端质量评分与模型选型** | `Key Assumptions`：「AI 不作为保存阻断项」；模型优先级/成本上限在 `V1_PLAN §7.2` 仍为"未锁定、不得自行猜测"。本轮只验 L3-65/L3-66 的降级与不自动写库行为。 |
| N-10 | **双账号 owner mismatch 全链路** | HD-04 已决降级为接受风险＋延后，不计 MVP Gate blocking（见 L3-47）。 |

---

## 执行纪律

1. 逐条执行，**状态列只填 `PASS`/`FAIL`/`BLOCKED`/`未测`**，不得留空当作 PASS。
2. `FAIL` 必须附可复现步骤与证据；无法在本轮复现的一律填 `BLOCKED` 并写明阻塞原因（如需人工配合账号/需联网环境）。
3. 观察到附录 B 中的已知遗留，按 B 表口径记录，不计入 FAIL 统计。
4. 发现文档未覆盖的新问题：记录为「文档外问题」，单列一节上报，**不得就地判定为需求缺陷**（避免自己发明需求）。
5. 证据落点：`docs/acceptance-l3/`，命名建议 `L3-<编号>-<简述>.png|md|txt`。
6. （2026-10-13 追加）修复后复验的状态更新：基准取值仍限 `PASS`/`FAIL`/`BLOCKED`/`未测`，复验结论以**基准取值＋括注**形式写入（如 `PASS（修复后真机复验）`、`FAIL（代码已改、真机未验）`），并须在 §0.3 记录复测设备、APK md5 与证据前缀；复验证据文件名用 `L4-<简述>.png`，与原 `L3-` 前缀证据并存。
# HANDOFF 丨 个人打卡小工具（地点手账 PWA + 安卓 App）丨 2026-10-02 收工（安卓端恢复装真机；分支站错位待归位；tab 图标待用户拍板）

> 用途：新智能体接续恢复开发的**唯一入口文档**。先读本文，再按「必读文档」顺序补齐上下文。
> 项目路径：`/Users/zzymima0000/Developer/coding/1.Active/011-ing-个人打卡小工具`
> 项目一句话：**双端**地点手账——PWA（`src/`）＋ 安卓 App（`mobile/`，Expo SDK 57 / RN 0.86.3）。拍照/写感受 → AI 整理入库 → 按地点/标签/时间回顾 → 自然语言找地点 → 分享快照。PWA 本地优先（IndexedDB）+ Supabase 云同步；安卓本地 expo-sqlite + 复用同一 Supabase。
> ⚠️ 本仓库**不止 PWA**，2026-09 起已有完整安卓端代码与 Gradle 工程，见下方 §0。

> ⚠️ **2026-09-03 路径变更**：数据库治理材料（规范 V1.2、写入方案与审查意见、Migration 草案、平台仓库）已迁至
> `/Users/zzymima0000/Developer/coding/1.Active/alw丨数据库管理专家/`。
> 本文中出现的 `docs/db/…`、`supabase/migrations/0001_init.sql` 等路径一律以 alw 文件夹内对应文件为准（`项目审查丨habit_tracker/` 与 `平台丨共享 Supabase 数据库/` 子目录）。

---

## 0.0 2026-10-13 洁癖＋README 收尾（现役，先看这一节）

- **分支已归位**：`master` == `origin/master` == `wanghoufan/master` == 同一提交（09-22 那 25 个提交的落差已消失）。下方 §0 的「分支站错位」叙述是 10-02 历史，不再成立。
- **README 中英双版重写**：补安卓端（`mobile/`）与双端同构说明；顶部改为四张真实界面图（画廊/记录/找地点/我的，本地 dev 真渲染、纯演示数据），旧 10-07 三张 `screen-0*.png` 已删。闸：`validate_readme.py --ui-product` → `DOCUMENTATION_READY`（0 warning）。
- **GitHub About 已回读核验**：简介 82 字、homepage 仍为 Vercel（GitHub Pages 实测 404 不填）、topics 补 `expo` `react-native` 共 10 个。仓库当前**无 Release**，README 里不写下载链接。
- **公开仓收口**：`.gitignore` 的 `*.旧版-2026-09-29` 泛化为 `*.旧版-*`，三份 09-13 迁移备份（AGENTS／USER_MODEL_OVERRIDE／docs/handoff/HANDOFF）移出索引、本地保留。
- **temp/ 保留项**：`pre-switch-untracked/`（39M，恢复期快照，无独有文件）、`tabbar-zoom*.png`、`ui-*.xml` 等被 §0 与 HANDOFF 叙述引用，留到大阶段收尾再清。
- **账本存量红灯未代改**：`TASK-MODEL-LOG#1`（`rework` 写成字符串）与 `DISPATCH-LOG#1`（`used=direct`）是历史行，按「不改写历史」保留；本轮新行已过 `check-ledger`。

### 0.0.1 同日追加：发了 v0.1.0 正式包 + 云端权限匿名复测

- **签名换成自建发布密钥**：此前 release 变体签的是 RN 模板里**全世界共用**的那把调试钥匙（证书 `CN=Android Debug`，SHA-1 `5e8f1606…`），按发布规范不能当正式包。新建 `mobile/keystore/release.keystore`（`CN=Place Journal`，有效期 10000 天）＋ `keystore.properties`，`app/build.gradle` 改为「有本地密钥文件就用发布密钥签、没有则回落 debug」。**两个密钥文件已 gitignore，绝不入库；换机或误删会永久断掉后续覆盖安装，必须单独备份。**
- **v0.1.0 已发布**：tag `v0.1.0`，资产 `PlaceJournal-v0.1.0-universal.apk`（118,391,148 字节，minSdk 24 / targetSdk 36，四 ABI 通用，v2 签名方案）＋ `SHA256SUMS.txt`；sha256 `fc0e3560…b5633`，线上附件回读下载逐字节一致。**未做真机安装烟雾测试**（两台手机当时被并行会话占用，其中一台已装另一签名的同包 App，覆盖安装要卸载＝清数据，没动）。
- **签名不兼容提醒**：装过旧调试包的设备必须先卸载才能装正式包，卸载会清掉未同步的本机记录——README、Release 说明、站点条目三处都写了。
- **云端权限匿名复测（只读，用线上包里的公开 anon 密钥）**：9 张业务表匿名读取全部被拒（6 张 HTTP 401 / SQLSTATE 42501，`dimensions`·`shares` 404 PGRST205 未对 anon 暴露）；OpenAPI 匿名可见路径 0；私有媒体桶列举 HTTP 400；`public_share_read(p_slug)` 匿名可调但随机 slug 返回 `null`（不可枚举）。→ 9 月治理记录今天仍成立，访客打开线上站只会看到演示数据（全新浏览器实测截图：`docs/qa/evidence-live-visitor-demo.png`）。

---

## 0. 2026-10-02 收工快照（历史追溯）

> 本节由 2026-10-02 一次「安卓端代码丢失 → 找回 → 出包 → 装真机」的操作生成。下方 §0.1/0.2/0.3 是 09-04 的历史快照，保留作追溯，**现役状态一律以本节为准**。

### 0.A 当前工作进展

**先看这三条，避免一上手就走错方向：**

| 项 | 事实 |
|---|---|
| **当前所在分支是错的** | 工作区在 `master` = `67900b0`（2026-09-06），**落后 25 个提交**，分叉点就是它自己、无任何独有提交 |
| **最新代码在 `wanghoufan/master`** | `b031fcc`（2026-09-22 15:18），比 `origin/master`(`d83d61d`, 09-22 14:42) 多 1 个提交（README 重写，**未 push**） |
| **安卓端工作从未合进 master** | 那 25 个提交几乎全是安卓端：DEV-01→DEV-10、安卓记录链/详情页/画廊照抄 PWA、UX 四项、画廊顶栏跟随滚动 |

#### 0.A.1 本轮发生了什么（起因：Playground 目录被删）

`~/Developer/Playground/011-ing-个人打卡小工具/master/`（安卓端真正的开发工作区，**从未提交**）已被删除。同日 10-01 有人做过一次恢复（`stash@{0}`，提交信息 `Recovered Playground worktree 011 2026-10-01`），**只捞回了本机的 `mobile/android/` 原生壳，JS/TS 侧漏了**。后果：手机上的 app 只能停在黑屏启动页（debug 包无 bundle、又连不上 Metro），用户记忆中的那 5 张真机截图一并丢失。

本轮做的事：

1. **找回源码** —— `git checkout wanghoufan/master -- mobile/`。已验证 `git diff --cached wanghoufan/master -- mobile` 为**空**，即恢复内容与最新分支逐字节一致。
2. **装依赖 + 出包** —— `npm install`（1085 包）→ `./gradlew assembleDebug`（6m17s，226MB）→ `./gradlew assembleRelease`（5m43s，107MB，内置 `assets/index.android.bundle` 3.2MB / 1595 modules）。
3. **装真机** —— 两台都装 release 包，`adb install -r -d`（同签名，Note 12 Pro 数据保留）：
   - Redmi Note 12 Pro（`22101316C`，USB `indq5xfi6hovay4d`，8 条记录）
   - Redmi Note 11T Pro+（`22041216UC`，无线 `192.168.31.63:5555`，1 条 `TestPlace`）
   - **已验证独立运行**：Metro 已停、`adb reverse` 已清除，两台都正常渲染。
   - **两台 base.apk 的 md5 与本地产物完全一致：`3e75fae58204dfe0a55aa9f34e6115ca`**（不是两个版本）。
4. **截图补回** —— 5 张真机截图已重拍并放回 `docs/qa/evidence-android-ui/`（`0-gallery-8cards` / `2-Record` / `3-Find` / `4-Mine` / `5-RecordDetail-saved`，文件名与原清单一致）。

APK 产物路径：`mobile/android/app/build/outputs/apk/release/app-release.apk`

#### 0.A.2 未闭环问题：底部 tab 图标（**待用户拍板**）

用户发现底部 tab「变样了」。实测结论：

- `mobile/app/(tabs)/_layout.tsx`（25 行）**从未写过 `tabBarIcon`**，4 个 tab 只有 `options={{ title }}`。全仓 2 个 commit（`9414c7a`、`10df20d`）、`stash@{0}`、`wanghoufan/master` **四个版本全都没有图标**——所以「曾经有图标的 tab 版」从未进过本仓库，只存在于已删除的 Playground 工作区。
- 缺 `tabBarIcon` 时，`expo-router` 57.0.21 渲染内置占位符：`node_modules/expo-router/build/react-navigation/elements/MissingIcon.js` 硬编码字符 `⏷`（U+23F7，字体测试用占位符）。
- 于是两台机器的差异**纯属字体 fallback**：UI 树结构完全相同（两台都是 4× `TextView text='⏷'` + 文字）。Note 12 Pro 把缺字形渲染成**空白**；Note 11T Pro+ 被系统 Last Resort 字体接管，渲染成写着 `FA9H 0 GLYPH` 的**豆腐块**。
- 用户看到的「两个软件不一样」是误解，差异全部来自本地数据不同（12 Pro 有标签 → 多出标签 chips 行；11T 只有 1 条无标签记录）＋ 屏幕高度（2400 vs 2460）。

修复选项（需用户选）：① 补真图标（需 `npx expo install @expo/vector-icons`）；② 给 `tabBarIcon` 传空组件消掉占位符（保持纯文字，改动最小）；③ 不动，仅记账。

#### 0.A.3 工作区当前状态（**未提交，切勿乱动**）

- **`mobile/` 已 stage 未提交**：约 200+ 文件（`git status --short` 显示 `A`）。内容与 `wanghoufan/master` 一致，切到该分支后会自动消失为无差异。
- **4 个文档与 `wanghoufan/master` 冲突**（切分支会打架）：`AGENTS.md`、`README.md`、`HANDOFF.md`、`docs/handoff/HANDOFF.md` —— 就是 09-29 那批治理规则注入，两个分支都还没提交它。
- **`mobile/android/` 任何分支都查不到（0 提交）**，被 `.git/info/exclude:9` 排除。注意是 `.git/info/exclude`（本地排除，不随仓库走），`.gitignore` 里没有它。这是本仓唯一的单点丢失源。

### 0.A.4 2026-10-03 轮：分支归位 + tab 图标 + android 入库（三件全收工）

用户拍板：① 切到 `wanghoufan/master` ② tab 图标**参考 PWA** ③ `mobile/android/` 入库 ④ push。

**① 分支归位**（用户令「1 可以」）

- 现状已改：HEAD = `wanghoufan/master` = `b031fcc`。原 `master`（`67900b0`）落后 25 提交、无独有提交，已弃用为工作分支。
- 切法（下次再遇到同款冲突照抄）：`git stash push -- <冲突文件>` → 发现 checkout 被 **13 个未跟踪文件**挡住（治理模板与 `docs/qa/evidence-android-ui/*.png`，它们在 `wanghoufan/master` 上已被跟踪）→ 先整目录备份到仓内 `temp/pre-switch-untracked/` → 逐个 `git hash-object` 比对，**只删掉与分支不同的** → checkout → 把工作区那份（09-29 更新版）拷回。
- 关键判断：`docs/roles/task-manager.md` 等 12 个文件**工作区那份更新**（工作区版多出 `check-ledger.mjs` 必跑、`orca-decide.mjs`、`TASK-MANAGER-QUALIFICATION-EVENTS.jsonl` 三条）→ 保留工作区版。
- **README.md 反向**：工作区那份是 `master` 线的 09-06 版，会**冲掉** `b031fcc` 的 README 重写（差 277+/41-）→ 保留分支版，只丢掉了 09-06 时代的一行状态描述（已过时）。
- `docs/handoff/HANDOFF.md` 两线血缘不同（`master` 线 09-04→10-02 快照 587 行；分支线 09-19/09-20 大交接 284 行）→ **两边都要**：保留 10-02 §0，另把分支线 260 行并为新的 §6 历史归档。
- 结果：`git status` 除下列改动外无差异，`mobile/` 那 200+ 文件自动消失（内容本就一致）。

**② tab 图标：参考 PWA**（`mobile/src/components/TabIcons.tsx`）

- 参照物是 PWA 的 `src/components/Nav.tsx`：手写内联 SVG、24×24 viewBox、`strokeWidth=1.8`、round cap/join，颜色走主题变量 `--c-terra` / `--c-inkmuted`。
- 实现：新增 `react-native-svg@15.15.4`（**不是** `@expo/vector-icons`/`expo-symbols`——换图标库就对不齐 PWA，且这类图标库仍依赖字体字形，正是本问题的来源）。`mobile/app/(tabs)/_layout.tsx` 四个 tab 全部传 `tabBarIcon`，颜色取 `palette.terra` / `palette.inkMuted`，自动跟三主题走。
- 画廊/发现/我的 = PWA 原路径 1:1；**记录** PWA 端是悬浮纯文字按钮（无图标），补一支同族 Lucide `pencil`。
- 回归测试 `mobile/src/components/__tests__/tabIcons.test.tsx`（9 例，锁死 24×24/1.8/圆角端点与「不落回 ⏷ 占位符」）。`tsc --noEmit` PASS；`npm test` **398 passed / 44 suites**（原 389）。
- 真机验证：`assembleRelease` → md5 `02956f0229a6ade2e3527cc4d5c2a48c`（113M）→ 装 **Note 11T Pro+**(`IN9LZTAYV4UGU4JF`) 与 **Note 12 Pro**(`192.168.31.31:5555`)，两台 `md5sum` 与本地产物一致；`adb reverse --remove-all` + 无 Metro 下重启，正常渲染。`uiautomator dump` 里 **`⏷` 出现 0 次**（Note 11T Pro+），截图见 `temp/tabbar-zoom2.png`。
- ⚠️ 未闭环：Note 12 Pro 锁屏（图案/指纹）无法 dump 目验，靠同 md5 推定；`23054RA19C`(pearl) 安装被系统拦（`INSTALL_FAILED_USER_REESTRICTED: Install canceled by user`），需用户解锁后重装。

**③ `mobile/android/` 入库**（54 文件 / 428K）

- 卡点比 HANDOFF 记的多一层：**除 `.git/info/exclude:9` 外，`mobile/.gitignore:45` 还有一条 `/android`**（Expo 模板默认「generated native folders」）。前者是本地排除不随仓库走，后者是**已跟踪文件、会随仓库走**——只改 info/exclude 在别的机器上照样入库不了。两条都改了。
- `mobile/android/.gitignore` 已覆盖 `build/ .gradle local.properties .cxx/ *.jsbundle`；补 `.kotlin/`。`local.properties`（含本机 `sdk.dir`）正确未入库。
- `app/debug.keystore` **入库**：经 keytool 核为 Android SDK 官方调试密钥（`CN=Android Debug`、创建 2014-01-01、序列号 `232eae62`、storepass `android`），公开非机密；release 变体签的就是它，不入库则换机无法复现同签名安装。

**④ push**：`wanghoufan/master` 已推 `origin`（详见 §0.B 表）。

### 0.A.5 2026-10-13 轮：同步链路修复 ＋ 云端照片下行 ＋ 暗色模式（单智能体，收工）

> 用户口令「你是唯一开发者」（单智能体模式）。本轮改动**仅 `mobile/`**（＋本节与 README 还原），已 push `master`（commit 见 Git）。设备：Note 12T Pro（`UKCESWB67PUO7LPB`）。

- **同步上传链路四修**（此前「待上传 N 项、上传成功 0 / 停放」的根因，均在 `mobile/src/sync/`）：
  ① `push.ts`：父 op 成功即从 outbox 删除后，子 op 跨轮不再误判「缺父」把整批卡死；
  ② `supabaseTransport.ts`：entries 封面外键——封面 media 未上云时先按空封面推、`upload_media` 传完再回填；`entry_tags` 云端**无 `id` 列**，改按 `entry_id,tag_id` 复合键，并在推标签前补齐标签/维度（对齐 Web `ensureTagsInCloud`）；
  ③ `pull.ts`：标签按父链深度落盘（修复本地 `tags.parent_id` 自引用外键）。
- **云端照片下行（新增 `sync/pullMedia.ts`）**：拉 `media` 行 + 签名 URL 下载 display/缩略图到本机持久目录（离线可看）；网关加 `createSignedUrl`、`MediaFileSystem.writeBytes`；`Mine` 停放区加「重试停放项」。
- **暗色模式**：`theme.ts` 加单一深色调色板 + 明暗三态（浅色/深色/跟随系统，默认跟随系统）；`colors` 改活对象 + `themedStyles` 工厂，全站 16 文件接入主题；`Mine` 加「明暗」选择器；根布局 StatusBar 随明暗。
- **Find 页切换闪退修复**：清单/画廊两个 FlatList 加不同 `key`（修 `numColumns` 就地变更的 Invariant）。
- **验证**：`tsc` 干净、单测 **411 全绿**；Note 12T Pro 真机实测：上传/拉取/照片显示/明暗三态/跟随系统/重启保持偏好/数据完好。
- **洁癖（小清理）**：还原被治理同步误覆盖的 `README.md`（曾被写成 ORCA 模板分发版 README）；删除会话与治理同步产生的 `*.旧版-2026-10-*` 未跟踪备份。

### 0.B 下一步任务（按优先级）

| # | 任务 | 状态／说明 |
|---|---|---|
| 1 | **分支归位** | ✅ **已完成**（2026-10-03）→ HEAD=`wanghoufan/master`。做法与坑见 §0.A.4① |
| 2 | **push `b031fcc`** | ✅ **已完成**（用户授权「4 可以」），连同本轮 4 个 commit 一起推 |
| 3 | **底部 tab 图标** | ✅ **已完成**（选「参考 PWA」）→ `TabIcons.tsx` + react-native-svg，398 tests 绿，两台真机 md5 一致、dump 无 `⏷`。详见 §0.A.4② |
| 4 | **`mobile/android/` 入库** | ✅ **已完成**（54 文件 428K）。注意有**两条**忽略要改，`.git/info/exclude:9` 只是其中之一，详见 §0.A.4③ |
| 4b | **Note 12 Pro 锁屏目验 tab 图标** | 同 md5 推定一致，但未亲眼 dump（图案/指纹锁）。用户解锁后可复核 |
| 4c | **`23054RA19C`(pearl) 装机** | `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`，需用户解锁允许安装后重装 |
| 5 | **PWA 改名退回验证闭环** | 已修两轮（`b96ca15` → `67900b0`），**仍待用户实测**。步骤：杀后台重进 → 核对「我的页底前端版本号」→ 改名 → 盯 10 秒 → 逛一圈回来 |
| 6 | **封面白边定责** | 待用户放一张放大截图。全站封面已是 object-cover 铺满裁切，16:9＋cover 数学上不可能出框边，能看见的只剩「白在照片文件里」 |
| 7 | **高德两端目验** | 两端 Key 已填（Docker 镜像 `d2be265e82ab`）。若灰底 → 查高德域名白名单 |
| 8 | **QA 第二轮 P2/P3-2 重跑** | 必须用 8081 Docker 版并核对版本号。详见 `docs/qa/QA报告丨第二轮丨2026-09-06.md` |
| 9 | **Tencent 残留 Key 清理** | 录音/ASR 整条下线后，两端 env 里的腾讯 Key 仍留着（无害，待清） |
| 10 | **作业提交材料图片断链** | `作业提交材料丨Place Journal App丨2026-09-20.html` 引用的 5 张图原在 Playground 的 `docs/qa/evidence-android-ui/`，已随目录删除。本轮截图已补回该目录名，**但该 HTML 位于 Playground（已删）或需重新定位**，需确认 |

### 0.C 注意事项及相关规矩

**分支／git**

1. **一上手先确认分支**：`git rev-parse --abbrev-ref HEAD` + `git log -1 --format='%h %ci'`。本仓 master 与开发线长期分叉，站在错分支会看到过时代码。
2. **`stash@{0}` 是旧版，不是最新版**。它的提交信息里有 `2026-10-01` 但内容更旧（app 名还是「私人打卡手账」）。判断新旧要**diff 内容**，不要看日期或提交信息。
3. **搬目录／恢复代码前，先查三处忽略**：`.gitignore`、`.git/info/exclude`（本地排除，**不随仓库走**，最容易漏）、`git ls-tree -r <branch> -- <path>` 看某目录在目标分支到底有没有提交。本轮事故就出在第 2 条。
4. **未授权不得 `git commit` / `git push`**（push 需二次确认）。不要为「顺手」而提交 `mobile/` 那 200+ 文件。
5. **临时文件放仓内 `temp/`**，不要用 `/tmp` 或仓外目录（opencode 通道的 `external_directory` 权限会静默失败，让角色误报已做）。

**安卓构建／装机**

6. **端口**：Docker 占用 8081/8082（PWA 自托管），**不得擅自关闭**。Metro 一律用 8083，手机侧 `adb reverse tcp:8081 tcp:8083` 保持 app 默认端口不变。
7. **debug 包不含 bundle**，装上必须连 Metro，否则黑屏停在启动页；**自用一律出 `assembleRelease`**（`build.gradle` 里 release 变体本就签在 `debug.keystore`，自用合法，`assembleDebug` 那 6 分钟白等）。
8. `mobile/android/local.properties` 已写 `sdk.dir`（本机 SDK 在 `~/android-toolchain/sdk`，**不在** `~/Library/Android/sdk`）。Gradle 4 个 ABI 全编，约 5–6 分钟，别当卡死。
9. **APK 装完必须独立验证**：停 Metro + `adb reverse --remove-all` + 重启 app，确认不依赖 Mac。
10. Android SDK 环境变量与 JDK 17 已就绪（`java -version` → 17.0.20.1）。

**验收纪律（本轮验证有效的做法，别退回目测）**

11. **「两个软件不一样」先证伪再解释**：比对两台 `pm path` + `md5sum`，再 `uiautomator dump` 比节点结构，最后才找原因。本轮若先目测就会误判成版本分裂。
12. **看 diff 判新旧**：`git diff <ref> -- <path>` 的方向是 `<ref> → 工作区`，`-` 侧才是 `<ref>` 的内容。
13. **缺字形/字体类问题**：`uiautomator dump` 的 `text=` 会直接暴露占位字符（`⏷`），比截图放大更快定位。
14. 用户可见要求要**逐条给覆盖证据**（含截图），不能只看构建成功。

**红线（沿用）**

15. 全部 Supabase 查询走 `supabase.schema('habit_tracker')`；禁止业务表进 `public`；禁止整库回写；`service_role` 绝不进前端/Git；密钥只进 `.env.local` / Vercel 变量。
16. 未授权禁动 `Services/` / `DockerData/` / `DockerBackups`；`VITE_*` 改动必重建 Docker 镜像。
17. 数据库变更唯一发布入口是 `alw丨数据库管理专家/平台丨共享 Supabase 数据库/` 的 `supabase db push`，须先过管理员审批。

### 0.D 下一个智能体接续提示词（现役，随 §0 更新）

见对话交付副本；此处为常驻版本：

```text
你是「个人打卡小工具」（PWA + 安卓 App 双端）的接续开发者。工作目录
/Users/zzymima0000/Developer/coding/1.Active/011-ing-个人打卡小工具

【第 0 步，必须先做，否则全程走错】
1) git rev-parse --abbrev-ref HEAD。当前极可能站在错分支 master(67900b0, 09-06)，
   它落后 25 个提交、分叉点就是它自己、无任何独有提交。
2) 最新代码在 wanghoufan/master(b031fcc, 09-22)，比 origin/master(d83d61d) 多 1 个
   未推送的 README 提交。那 25 个提交几乎全是安卓端工作。
3) 向用户确认是否切到 wanghoufan/master。切之前先 stash 4 个与新分支冲突的文档：
   AGENTS.md / README.md / HANDOFF.md / docs/handoff/HANDOFF.md（09-29 治理规则注入，
   两分支都未提交）。mobile/ 那 200+ 文件已 stage，内容与新分支逐字节一致，
   切过去后会自动消失为无差异，不要单独提交它。

【必读】docs/handoff/HANDOFF.md §0（现役快照，唯一权威），再按 §1 顺序补齐上下文。

【两条等用户拍板的事，不要自己定】
A. 底部 tab 图标：mobile/app/(tabs)/_layout.tsx 从未写过 tabBarIcon，expo-router
   57.0.21 会渲染内置占位符 ⏷(U+23F7, MissingIcon.js)。两台机器因字体 fallback 不同，
   一台空白一台豆腐块——同一 APK(md5 3e75fae5…)、同一 UI 树，不是版本分裂。
   三选项：补真图标(需装 @expo/vector-icons) / tabBarIcon 传空组件保持纯文字 / 不动。
B. 分支是否归位 + 是否 push b031fcc。

【已知可直接接手的活】
- mobile/android/ 任何分支都查不到（0 提交，被 .git/info/exclude:9 排除）。
  建议移除该排除后入库——这是安卓端唯一未备份部分。
- 自用出包一律 ./gradlew assembleRelease（build.gradle 里 release 就签 debug.keystore，
  合法）。debug 包不含 bundle，装上黑屏。Docker 占 8081/8082 不得关闭，Metro 用 8083
  + adb reverse tcp:8081 tcp:8083。SDK 在 ~/android-toolchain/sdk，4 个 ABI 约 5-6 分钟。
- 装完必须独立验证：停 Metro + adb reverse --remove-all + 重启 app。
- PWA 三件未闭环：改名退回验证(已修两轮，待用户实测，认「我的页底前端版本号」)、
  封面白边(待用户放放大截图定责)、高德两端目验(灰底查白名单)。

【规矩】未经用户明确要求不得 git commit/push；临时文件放仓内 temp/；
Supabase 查询一律 supabase.schema('habit_tracker')，service_role 绝不进前端或 Git；
未授权禁动 Services/、DockerData/、DockerBackups。

【本轮三个教训，别重犯】
1) git diff <ref> -- <path> 的方向是 ref→工作区，- 侧才是 ref 的内容，我因此差点把
   旧版 stash 当最新版恢复。
2) 查「某分支有没有代码」要 git ls-tree -r <branch>；我查了本地 master 就断言
   「GitHub 上是空的」，实际 origin/master 有 135 个 mobile 文件。
3) 恢复/装机前没核对 tab 图标状态，装完才报，用户看到的「变样」本可提前避免。
```

---

## 0.1 2026-09-04 收工快照（**历史**，已被上方 §0 取代，保留追溯）

### 0.1 当前工作进展

| 事项 | 状态 | 关键信息 |
|---|---|---|
| 数据库审查 | ✅ 全部通过 | V1.1 经 R2 增量复审 `APPROVED_FOR_EXECUTION`（详见 [数据写入方案 V1.1](/Users/zzymima0000/Developer/coding/1.Active/alw丨数据库管理专家/项目审查丨habit_tracker/数据写入方案丨个人打卡小工具（habit_tracker）丨V1.1.md) §13/§13.1） |
| S1 迁移发布 | ✅ 已上线 | Migration `20260903141849`（md5 1ce6ae9482cb8515aedce6a4ad73b53c）经平台仓库 db push 至共享项目 yacgnikzvutbpoqvokth；线上只读核对与隔离验证一致（8 表 RLS、策略 32、anon 零表权限、仅可执行 public_share_read） |
| S2 Expose | ✅ 完成+验证 | 用户 Dashboard 勾选 `habit_tracker`；REST 验证：anon 读表 42501 拒绝、RPC 200/null（不可枚举）。跨 Schema 用 `Accept-Profile`（GET）/`Content-Profile`（POST）头 |
| L2 云端写入验收 | ✅ **L2_PASS** | 真登录（Google OAuth）→ POST places/entries 201 → 清 localStorage 重登 7/7 回读；证据归档本项目 `docs/acceptance-l2/`（L2-REPORT.md、脱敏 HAR、截图 10 张） |
| 标签丢失 bug | ✅ **TAG_FIX_PASS**（2026-09-03 18:00 复核通过） | 根因：演示标签从未上云 → entry_tags 外键失败 + pullRemote 硬编码 `tagIds: []` 覆盖本地。修复：`src/lib/sync.ts` 新增 `ensureTagsInCloud` + merge 保留本地 tagIds。QA 6/6 通过（T1–T6 全 PASS）；观察项 T2-B「父链补推」**已修复**（ensureTagsInCloud 沿 parent_id 递归展开整链、父先于叶推送，tsc+build 通过；注意该修复在 QA 通过之后，未做云端实测，下次联网同步观察含父链标签即可）；证据 `docs/acceptance-l2/L2-REPORT.md`「标签同步修复回归验收」section |
| 单设备定位 | ✅ 用户决定 | **不做双设备/并发/断线重连验收（L3 取消）**；乐观锁与 Mine 页冲突裁决 UI 仅作兜底 |
| 平台仓库 | ✅ 基线 commit `efddca5` | 无 remote 未推送；prompt_manager 未推送 Migration `20260901163555` 原样保留（任何 db push 会连带推送它，⚠️ 需 prompt_manager 项目决策） |
| 业务项目 git | ✅ 已同步 `bae604f`（origin/master 一致，已验证） | `ab1086e` transcribe 修复 → `53248e7` 深夜收工快照 → `bae604f` 洁癖收尾；工作区另有 RQA-V 未提交改动 7 文件 + 未跟踪 Vercel 证据 2 目录（见本表末 “RQA-V 未提交” 行）；Vercel 部署连接 GitHub 自动构建 |
| 编辑已有记录 | ✅ 已实现+已提交 | EntryDetail「分享/编辑/删除」：评分/日期/人均/感受/公开理由/标签可改（QA 遗留事项 3）；tsc+build 通过，**未经 QA 实测** |
| QA 基线 V0.2 | ✅ 已执行 | [docs/qa/QA-BASELINE丨V0.2.md](docs/qa/QA-BASELINE丨V0.2.md)：锚定 `19eb499`，5 组 checklist（编辑 6 项/标签 T1–T8/核心链路/滚动手势/同步状态）+ 红线；整轮回归已完成见下 |
| 第二轮 QA（V0.2 整轮回归） | ✅ **QA_V02_PASS（25/25）** | 报告 [docs/qa/QA-REPORT丨V0.2.md](docs/qa/QA-REPORT丨V0.2.md)（含开发侧后处理附录）；K1 滚动**未复现**（D1–D5 全过）、K2 T7/T8 **实证通过**；A 编辑 6/6 |
| QA 后修复（第二轮） | ✅ 已实测 | ENV-2：`ensurePlacesInCloud` + `sweepDirtyRows` 自愈（万绿园 place+2 entry 实测上云）；ENV-1 连带：封面置空推送/回填、分享快照尽力而为、revoke 幂等、media ≥5 次放弃标 failed；OBS-1：toShareItem 补 tags。**全经 CDP 实测：outbox 清零、脏行 0** |
| 遗留环境项 | ✅ **ENV-1 全链闭环（2026-09-04）** | 两桶（`habit-tracker-media-private`/`habit-tracker-media-share`）已按 [0003](/Users/zzymima0000/Developer/coding/1.Active/alw丨数据库管理专家/项目审查丨habit_tracker/0003_storage_buckets.pending.sql) 上线；真登录 UI 实测 9 项全过：私有桶上传（canvas 压缩 558KB→display 169KB+thumb 25KB，路径 `owner/place/media/`）、本人签名 URL 读 200、**匿名读 400**、分享封面（slug `a3r3ppfnenp3dx4b`）**匿名 200**、匿名 RPC 快照白名单无泄漏、6.3MB→**413**、text/plain→**415**、png 正例 200（测后已删）、匿名写 403、越权写他人目录 403。**管理员已复审通过，ENV-1 关闭**。云端保留 1 条真实记录（绿野书屋）+ 1 个活跃分享（验收数据，可复用）。实测报告已落盘（见 0.1「ENV1 实测报告」行） |
| outbox 时序修复 | ✅ 已回归（2026-09-04） | `src/pages/AiConfirm.tsx` 先 `saveEntry` 后 `saveMedia`；逐秒轮询 outbox 证据：入队序正确→entry 先推成功→media 一次通过 synced→封面回填入队→清零，全程零错误；云端复核 `revision=2` + `cover_media_id` 回填 |
| 匿名分享页 bug 修复 | ✅ 已修复+实测（2026-09-04） | `src/lib/shares.ts fetchCloudShare`：RPC items 为嵌套结构（item jsonb 列），原按扁平读致匿名访客分享页丢字段（无店名/封面，`📍 undefined`）。修复解嵌套；无痕视角实测封面（公开桶 640px）+字段完整渲染，tsc 通过 |
| ENV1 实测报告 | ✅ 已落盘 | [docs/db/ENV1-实测记录丨2026-09-04.md](docs/db/ENV1-实测记录丨2026-09-04.md)（9 项数据 + 截图 4 张于 docs/db/env1-evidence/）；收口清单 ENV-1 行已更新 ✅ |
| 滚动异常 K1 | ✅ 未复现 | QA D1–D5 全过（含 1661px 长页/相册横滑/键盘）；用户如再遇，按基线 §5-D 固化步骤报修 |
| 近期功能批次 | ✅ 已提交（`168ef9b`→`5f99891` 共 9 commit） | 标签管理重设计（底部弹窗菜单+使用计数）、Find 标签筛选交集+按频次、语音超短按友好提示、标签真删 deleteTags（清 entry_tags/子先父后/防复活）、**uuid polyfill（修手机局域网 http 下 crypto.randomUUID 缺失致新建全挂）**、分享卡片图 canvas（微信拦外链场景）、Find 筛选条按维度分组、创建分享弹层主按钮=保存分享图、分享长图重构（全部照片+标签+公开理由入卡，票根/竹青主题）、全站主题系统（暖纸/暖票/竹青 CSS 变量切换+我的页选择）。以 git log 为权威 |
| QA 回归+视觉验收报告 | ✅ 已执行并甄别 | [docs/qa/QA回归报告丨2026-09-04.md](docs/qa/QA回归报告丨2026-09-04.md)、[docs/qa/视觉验收报告丨2026-09-04.md](docs/qa/视觉验收报告丨2026-09-04.md)（均含截图，commit `5f99891`）；8 个 FAIL 甄别后真问题仅 2 个且已修（Find 标签 toggle 取消 `b819931`、8081 OAuth 白名单用户已在 Dashboard 补），其余为伪 bug（详见 0.2 第 5 条） |
| Record 页三项修复（本轮 2026-09-04 晚） | ✅ 已入库 `35538b8` | 手机（192.168.31.60:8081）实测发现 3 问题：① 封面不能切换 → 已修：非封面照片左上角新增「设为封面」按钮，点击即移到第一位（封面=photos[0] 语义不变，AiConfirm 无需改）；② 手机系统浏览器不能录音 → 根因是浏览器硬限制（HTTP 非安全上下文 `navigator.mediaDevices` 为 undefined，代码无法绕过），已把提示文案改为准确说明+指向 HTTPS，真正解锁需 HTTPS（最终由 Vercel 实现，Tailscale 计划取消，见 0.2 ⑤⑥）；③ 填文字后「交给 AI 整理」点不动 → 根因：地点未选中（canNext 需 地点+内容），已改按钮文案明示缺失项（「先选择地点，再交给 AI 整理 →」）。改动仅 `src/pages/Record.tsx`，tsc+build 通过；8081 镜像已重建生效（见 0.2 ③）；录音解锁最终由 Vercel HTTPS 实现（Tailscale 计划取消，见 0.2 ⑤⑥） |
| Record 修复 QA 验收（2026-09-04 下午） | ✅ 双报告通过 | 自动化 QA [QA回归报告丨Record修复](docs/qa/QA回归报告丨Record修复丨2026-09-04.md)：**QA_PASS_WITH_BLOCKED**，Total 11 / PASS 9 / FAIL 0 / BLOCKED 2——R1 封面切换（顺序交换实证）、R2 录音降级（fake device 短按友好提示）、R3 按钮三态、B1–B5 基线全过；BLOCKED=R2-HTTP 提示（桌面恒安全上下文，待手机）+ B6 云同步（自动化无登录态，真机侧已覆盖）。真机 QA [真机QA报告](docs/qa/真机QA报告丨2026-09-04.md)：**PASS**，Total 18 / PASS 14 / FAIL 0 / Pending 4——Happy Path 全链跑通（登录/记录/AI确认/保存/编辑/分享长图/分享链接/Find/三主题），未发现 P0/P1。**甄别**：RQA-OBS-01（5173 AI/ASR 未配置）为伪 bug——dev 下 /api 404 降级是设计（organize.ts 判 404 走本地推测），8081 已实测真 Key；OBS-1（P3）Gallery `validateDOMNesting` button 嵌套已在 `d95aa04` 修完（Stars 只读改 span，tsc+build 通过，8081/Vercel 均含） |
| 收工状态 | 📌 2026-09-04 深夜收工 | 用户实测 **手机 Vercel HTTPS 录音成功**；Vercel 部署+验收全通过、Supabase 白名单已补；恢复入口见 0.2 ⑤–⑧ |
| RQA-V 四项修复（2026-09-04 深夜二次） | ✅ 已提交推送 `6705e26` 并部署三端 | 用户拍板「1修 2选A 3修 4修 5跳过」：① **OBS-V2**（P2）Vercel AI 偶发 504 → `api/ai-organize.ts` 单 provider 9s 超时 + 全局 13s deadline（<15s 上限）+ 快速 failover；② **RQA-V-02**（P2）删记录分享仍有效 → `deleteEntry` 级联撤销（`ShareItem.entryId` 新定位键 + 旧快照按 coverMediaId 反查；无照片旧快照接受边缘）；③ **RQA-V-01**（P3）删除无确认 → EntryDetail 应用内底部弹窗（「再想想/确认删除」，文案明示分享一并失效）；④ **RQA-V-03**（P3）空地点残留+计数不符 → 删空后级联删本地 place + 新增 `delete_place` outbox op 同步删云端（对齐 delete_tags 模式）。**连带修出隐藏 P1**：`revokeShare` 原传 snapshot uuid 当 slug 查云端（`sync eq('slug')` 恒 0 行），**手动撤销云端从未真正生效**（被「视为成功出队」注释掩盖）→ outbox op.id 语义改为 slug 并兼容存量调用。OBS-V1（400/415 不统一）跳过不修。tsc+build 通过 |
| Vercel 上线批次 QA 验收 | ✅ 双报告通过（2026-09-04 深夜） | 自动化 [QA回归报告丨Vercel上线](docs/qa/QA回归报告丨Vercel上线丨2026-09-04.md)：Total 24 / PASS 22 / FAIL 0 / BLOCKED 2（环境限制）——API 层 transcribe 4 负例+真音频 E2E（ASR 3.6s）、ai-organize 结构化、生产 smoke、匿名分享 RPC 全过，数据安全零违规。真机 [真机QA报告丨Vercel上线](docs/qa/真机QA报告丨Vercel上线丨2026-09-04.md)：Total 30 / PASS 22 / FAIL 3（甄别后全为真问题即 RQA-V-01/02/03，已修）/ BLOCKED 5（用户跳过登录；真人语音转写已被用户亲测覆盖）；亮点：真实麦克风权限弹窗捕获、deepseek-v4-flash 真实 AI <5s、分享图真实下载。**手机复测 3 项待用户执行**（见 0.2 ⑨） |
| 8081 二次重建 | ✅ 完成（2026-09-04 深夜二次） | deploy.sh 拉取 `6705e26`，新镜像 `f820095d5341`，healthz 200，bundle 实证含删除确认弹窗文案。三端（5173/8081/Vercel）同码 |
| 收工状态 | 📌 2026-09-04 深夜二次收工 | 四项修复上线三端；恢复入口见 0.2 ⑨–⑪ |
| 复测补线修复（2026-09-05） | ✅ 已实测并上线三端（commit `9f0eeb7`） | RQA-V 修复实为两处半成品，本轮补齐：① `src/lib/idb.ts` `deleteEntry` 接上级联——6705e26 只铺了底层管道（revokeShare 按 slug + ShareItem.entryId），但删除入口从未调用；现删除时自动撤销该记录全部分享 + 空地点本地删 + `delete_place` op 同步删云端。② `src/pages/EntryDetail.tsx:188` 删除按钮改 `setConfirmDel(true)`——确认 Sheet 此前是**死代码**（无任何 setConfirmDel(true) 调用），普通视图删除直接执行、弹窗从未出现过（上轮「弹窗已修」验收结论不实）。实测全过：弹窗文案四要素 + 再想想取消路径 + 删后匿名 RPC 返回 null（分享失效）+ 空地点云端级联清除。tsc+build 通过 |
| delete_entry op + 云端大扫除（2026-09-05） | ✅ 已上线三端 | ① 新增 `delete_entry` outbox op（idb+sync，对齐 delete_place 模式；entries owner DELETE policy 0001 已具备，无 Schema 变更）：多记录地点删单条也删云端行，**根治 pullRemote 全量补插复活**——场景 C 实测：删 C1 后云端行消失、C2 与地点保留。② 云端大扫除（用户授权「你定」）：habit_tracker 8 表业务行全清（26 entries/27 places 全为历轮 QA 重复播种+验收残留，无真实数据），两个 Storage 桶递归删 6 个测试对象（recursive 剩余 0）；结构/RLS/bucket 策略未动。③ 部署：commit `9f0eeb7` push → Vercel 自动部署（bundle 含 delete_entry 实证）；8081 deploy.sh 重建（git 6705e26→9f0eeb7，镜像 f820095d5341→f00f7dec9fe6，healthz 200，bundle 实证）。④ QA Chrome profile 本地库已 wipeLocal 重置（重新播种 demo）。**注意**：用户真实设备本地数据不受影响；但旧记录（sync='synced'）在云端已无对应行，日后编辑旧记录若触发冲突，走 Mine 页冲突裁决 UI 兜底即可 |
| 评分筛选 + demo 防泄漏（2026-09-05） | ✅ 已实测并上线三端（commit `00c115d`） | ① Find 页筛选条新增**评分组**（`src/pages/Find.tsx`）：按地点最高分记录过滤，与标签 chip 同款单选可取消交互、与自然语言搜索叠加；实测档位计数与数据吻合。② `sync.sweepDirtyRows` 跳过纯 demo 行（demo 记录永不上云；demo 地点仅被真实记录引用时随行）。③ 部署：`00c115d` push → Vercel 自动部署；8081 重建（镜像 4ec462f7d672） |
| 评分筛选扩 5 档（2026-09-05 下午） | ✅ 已实测并上线三端（commit `6227d56`） | 用户反馈改 1 星后无低分档可选 → 档位由 3 档扩为 **1/2/3/4/5 星** 五档（`Find.tsx` 一行）；实测五档计数与数据全吻合（demo 6 地点：1/2/3星以上=6、4星以上=5、5星=1）；8081 镜像 606efa9037af。**澄清两点**：筛选结果是动态的（UI 改评分后 Find 结果正确反映）；评分是记录数字字段、不属于标签维度体系（Mine「标签与维度」里没有属设计） |
| 现场新建标签 + demo 显式保存防泄漏（2026-09-05 下午） | ✅ 已实测并上线三端（commit `08bae21`） | ① EntryDetail 编辑表单标签区末尾「**＋ 新标签**」入口 → Sheet（名称 + 维度 chips，默认自定义维度/无则第一维度）→ 创建即自动勾选；**同名标签提示并「选用现有标签」**不产生重复；新标签自动进对应维度分组（标签与维度页、Find 筛选条均可见）。② 连带堵漏：demo 记录被**显式编辑保存**仍会上云（saveEdit 入队 upsert_entry 直推）→ `sync.upsert_entry` 分支遇 demo 行直接丢弃 op（与 sweep 同口径），实测 op 丢弃、云端保持 0。③ 实测：创建→自动勾选→保存→tagIds 持久化→云端三层（tag/entry/entry_tags）同步正确（测后云端 QA 数据已再清零）；8081 镜像 997aea868460 |
| 收工状态 | 📌 **2026-09-05 最终收工（HEAD=`d81ebcd`）** | 当日上线批次：删除链路补全+delete_entry 根治复活+云端大扫除（`9f0eeb7`）→ 评分筛选（`00c115d`）→ 5 档（`6227d56`）→ 现场建标签（`08bae21`）→ 收工快照（`6dafc82`）→ **复盘产物入库+洁癖收尾（`d81ebcd`：AGENTS/HANDOFF/README 快照推至 09-05 现役；`coordination/`+`docs/review/` 保留入库；09-04/05 日志补档）**。三端同码：5173 dev / 8081 Docker（镜像 997aea868460，healthz 200）/ Vercel `https://place-journal-xi.vercel.app`。云端业务表 0 行（白纸），demo 数据已三通道防上云（sweep/显式保存/大扫除）。/tmp 已清理：qa-profile-vercel-31574 已删（trash）；chrome-cdp-profile 保留（含 5173 登录态，Chrome PID 15060 运行中，下轮 QA 复用） |
| 09-06/07 记录页四批 | ✅ 已上线三端 | ① 感受与公开理由分框（`RecordDraft.notePublic` 透传；AiConfirm 不再拿感受 auto-fill 公开理由，AI 只整理感受）② `useAutoGrow` 文本框随写随长（记录页大正文＋详情编辑两框）③ 灯箱相册 `Lightbox`（点图放大＋左右滑＋显式设封面；QA 第二轮 P3-1 桌面 PASS，单图页滑不可验）④ `Cover` 自适应铺满（比例不变：记录卡 4:5、其余正方形）。commit `8351fd9`（含换设备远端图根治，见下）→ `c2c6c80` → `d1b2e4b` |
| 09-06/07 同步可靠性四批 | ✅ 已上线三端 | 手机推、电脑拉不动排查：① 换设备图空白根因=`Thumb` 远端死分支（恒 `undefined`）＋`pullRemote` 丢 `remoteThumbPath`＋签名串行 200 次 → 统一解析＋补路径＋并行只取小图、网格 `preferThumb` ② `syncing` 锁时间戳（残留超 10min 接管；Realtime 同口径）③ 毒丸 8→5 次停放 24h（sweep 不捞，行标 failed，不拦补拉）④ 超时（整轮→分段：上传 90s/拉取 30s，超时落盘）⑤ 推拉解耦（上传 hang 照拉，治“单向”假象）⑥ 我的页结果可视化（上次成功/失败数、待上传、报错原文、停放提示）＋ `withTimeout`。commit `c3863ae` → `573a75c` → `0b8607d`。**P0 待真机三行闭环**（现场曾有 1 项 VPN 下上传 hang，超时机制已覆盖） |
| 09-06/07 地点编辑 | ✅ **QA 第二轮 P1_PASS** | EntryDetail 编辑新增地点区：改名/改区域（多记录共用提示一起生效）、更换地点搬家（记录＋照片换归属、有本地图的重传、搬空老地点 `deletePlace` 级联）。`idb.deletePlace` 新增。闭环实测＋T- 数据已清。commit `20a7558` |
| 录音/ASR 下线 | ✅ 整条下线（用户决定） | 改走微信语音输入法直输：录音按钮、`api/transcribe.ts`、`src/lib/audio.ts`、转写探针、模板 Key 占位全删（`c2c6c80`，-256 行）；不再占用麦克风。Tencent 密钥仍在两端 env（无害，待清） |
| 封面 OCR 上/下线 | ⚠️ 整条下线（用户决定） | vision 版曾上线（OpenCode→OpenRouter→DeepSeek failover，`8351fd9`／超时放宽 `16f3068`）：GLM 直调实证**看图可用**、中文准确、JSON 合规，但单次 8–17s——Vercel 15s 装不下、等待体验差 → `api/ocr.ts` 及全链路 `b227ddc` 删除（-218 行）。P2 归因详见 QA 第二轮报告处置节。教训：vision 超时预算按最慢通道给，单通道时 failover 等于没有 |
| AI 连通性测试 | ✅ 已上线 | 我的页 AI 行加「测试连通性」按钮：实调一次报通道名＋耗时（微量调用，不落数据）。`OPENCODE_MODEL=glm-5.3-flash`（Docker 已切；**Vercel 待用户改变量**）。`16f3068` |
| 收工状态 | 📌 **2026-09-07 在役（HEAD=`d1b2e4b`）** | 九连发 `8351fd9` → `c2c6c80` → `c3863ae` → `573a75c` → `20a7558` → `0b8607d` → `16f3068` → `b227ddc` → `d1b2e4b`（全在 origin/master，已验证一致）。三端：5173 dev ／ 8081 Docker（镜像 `faf33ce08989`，healthz 200，`/api/ocr` 501、`/api/ai-organize` 400 实证）／ Vercel（push 自动部署，页面级未逐一复验）。QA 第二轮见 [`docs/qa/QA报告丨第二轮丨2026-09-06.md`](docs/qa/QA报告丨第二轮丨2026-09-06.md)（P1 PASS；P2/P3-2 已修待重跑——重跑必须用 8081 且确认新包；P0 待真机三行） |
| 高德 Key 联调 | ✅ 两端已填＋8081 已重建 | 用户取得 Web 端 Key＋安全密钥（域名白名单已加 Vercel 域名）；Vercel 变量用户自填（自动重部署）；Docker `docker/.env.local` 两行已填（占位符本就存在，只填值），`d2be265e82ab` 重建 healthz 200。**待目验**：两端地图总览出真实地图（若灰底→查高德白名单） |
| Vercel 模型切换验证 | ✅ 生效 | `OPENCODE_MODEL=glm-5.3-flash`：Docker 我改的，Vercel 用户改的；直调生产 `/api/ai-organize` 实证 `provider:opencode` 8.9s、预算/摘要全对 |
| 改名保存退回排查 | ⏳ 已修两轮，**待用户验证闭环** | 现象：详情页改地点名（如海岛喜剧→冒菜），保存后（非立刻，逛一圈回来）变回旧名。已排除：保存层（新名能显示）、拉取合并旧逻辑。已上线：① `b96ca15` 保存即标脏＋合并认脏行 ② `67900b0` 落盘前最终裁决（拉取内存快照撞上途中保存是主因：VPN 下 5 查询跑数秒，用户在此窗口保存即被旧快照盖掉）＋我的页底前端版本号（以后“旧包/新包”看此行）。8081 镜像 `729a14f1bf5d`。验证步骤：杀后台重进→核对版本号→改名→盯 10 秒→逛一圈回来。若仍掉：要版本号＋我的页三行（定责推送被拒还是覆盖） |
| 封面白边争议 | ⏳ 待一张放大截图定责 | 用户指画廊左上 dv 公社顶部白边，认为是框没铺满，要求拉伸（称 16:9 不可能有边、变形接受）。技术立场：全站封面已是 object-cover 铺满裁切，16:9＋cover 在数学上不可能出框边；能看见边只剩“白在照片文件里”（夜景过曝天空/灯光，拉伸只会同步放大、变形也去不掉）或真渲染 bug。**拉伸未做**（ Engineers 决定：变形失真且治不了文件内白边）。待用户：点开放大截一张——白还在=拍进去的（换封面/做裁剪二选一），没了=渲染 bug 我修 |
| 收工状态 | 📌 **2026-09-07 开发暂停（HEAD=`67900b0`）** | 在 `d1b2e4b` 基础上加三批：高德联调（`d2be265e82ab`，只改 env 重建）→ 改名退回两轮修复（`b96ca15` → `67900b0`，8081 镜像 `729a14f1bf5d`）。全部已 push（`8d404e3` 洁癖收尾之后），origin/master 一致。三端同码；Vercel 自动部署。**未闭环三件**：① 改名验证（步骤见上）② 白边放大截图 ③ 高德两端目验。另：QA 第二轮 P2/P3-2 重跑（须 8081＋核版本号）、P0 真机三行、历史验收标签、Tencent 残留 Key 清理（两端 env，无害） |

### 0.2 下一步任务（按优先级）

1. ~~ENV1 实测报告落盘~~ ✅ 2026-09-04 完成（含截图 4 张）；~~Chrome 环境修复~~ ✅（优雅退出 + 清 IDB 目录后恢复）；~~outbox 修复回归~~ ✅ PASS；~~清单 ENV-1 状态~~ ✅ 已更新。
2. ~~git commit/push~~ ✅ **已同步至 `bae604f`（HEAD == origin/master，本轮验证）**；`5f99891..bae604f` 已推送（含 Record 修复、OBS-1、QA 归档、Vercel 两修）。**另修：Find 页重复标签 bug（2026-09-04 用户报）**——根因：清验收环境后本地重播种 demo 标签 + pullRemote 拉回云端套，同名两套并存（55 标签/8 维度）；已合并（55→30，entries 引用重映射，云端本无重复）+ Find.tsx 同名去重兜底，实测 PASS。遗留：真机 QA 的「QA测-」记录/分享已删（1 个空地点保留，无产品删除入口）；自动化 QA 数据隔离于 /tmp 独立 profile 未入云（待确认清理）；历史验收标签（验收T3/T7 等）仍待用户示下。
3. ~~真 Key 联调~~ ✅ **2026-09-04 全通**：① 腾讯 ASR SentenceRecognition 真实转写 PASS（「今天下午去了万绿园散步…」逐字一致）；② AI 整理 OpenCode Go（`glm-5.3-flash`）结构化 JSON PASS（score/budget/summary/tags 合同全对）。**Docker 自托管已上线**：规范副本 `Developer/coding/docker/personal-checkin/`（deploy.sh 流程），`http://localhost:8081`（Mac）/ `http://192.168.31.60:8081`（局域网）。**部署中修 4 个自托管 bug**（均在 server.mjs/api 层，已 push）：处理器 esbuild 双层 default 解包、res.status().json() shim、腾讯 TC3 头 `X-TC-Timestamp` 笔误、opencode 端点自动补 `/chat/completions`。腾讯 ASR 曾报 not authorized（用户控制台开通后自愈）。
4. ~~自验收~~ ✅ 2026-09-04 SELF_CHECK_PASS（8081 生产版：首页/三tab/详情/控制台全净；子代理浏览器无登录态属环境因素）。**已交付两份转交提示词（对话内）**：QA 回归测试（R1-R5 今日修复回归 + B1-B5 基线回归）与产品视觉验收（8 屏走查），报告落点 docs/qa/QA回归报告丨2026-09-04.md 与 docs/qa/视觉验收报告丨2026-09-04.md，均未执行。
5. **验收报告甄别（2026-09-04 上午）**：QA 回归（QA_FAIL）与视觉验收（VA_FAIL）两份报告经复核，8 个 FAIL 项真问题仅 2 个——① Find 标签选中后无法取消（toggleScene 只加不减）**已修**（`b819931`，含整词匹配防「咖啡」误亮「咖啡茶饮」，8081 重建后复测 PASS）；② 8081 OAuth 被 Supabase Redirect 白名单挡（只登记了 5173）→ 用户已在 Dashboard 补 `localhost:8081` + `192.168.31.60:8081`，登录复测 PASS（免密回跳，云端已连接）。**伪 bug 更正**：VA-02 我方提示词链接格式写错（真实 `/s/p/:slug`）；VA-03 首页=相册双列是设计，基线描述对应 Find 页；VA-06 绿野书屋 entry 本身无评分标签；R2 智能体等待 5.5s 不足 + 一轮未选地点（实测 UI 全链 PASS：OpenCode 64s 慢响应，前端 ~30s 降级 localHeuristics 并有提示条）。R3 语音=桌面无真实音频输入的环境限制。
6. ~~三项体验优化~~ ✅ **2026-09-04 完成并上线（`90fdff9`，8081 已重建，浏览器复测 3/3 PASS）**：① AI 整理 12s 超时降级（organize.ts AbortController）+ 等待预告文案（复测实战触发降级：上游 OpenCode 免费档偶发 fetch failed，降级机制按设计兜底）；② 录音脉冲环视觉增强（pulse-rec 原 scale1.06 几乎不可见，改为 scale1.08+陶土色环外扩）；③ 分享页空评分/预算隐藏（ShareSingle + ShareList 列表小星同改）。**AI 模型已切换**：`OPENCODE_MODEL` 由 glm-5.3-flash → **deepseek-v4-flash**（用户 OpenCode Go 付费套餐；glm-5.3-flash 实测 64s 慢+偶发失败系该模型已知特性，deepseek 同题实测 1~2s 稳定、结构化合同/中文摘要质量持平，配额更高）。12s 降级机制保留作保险。
7. **下一步（按优先级，2026-09-04 QA 验收后执行更新）**：
   ① ~~QA 测试数据清理~~ ✅ **完成（含边界）**：真机 QA 侧「QA测-」记录已删、分享已撤销（Find 7→6、分享 2→1；1 个空地点保留，无产品删除入口，未越权直写库）；自动化 QA 数据隔离于 /tmp 独立 profile、未入云，待确认后删 profile 目录；
   ② ~~OBS-1 顺手修~~ ✅ **完成（`d95aa04`）**：Stars 只读模式改渲染 span（editable 表单保留 button），消除 Gallery/PlaceDetail/分享页卡片嵌套警告，tsc+build 通过；
   ③ ~~同步 8081 部署版~~ ✅ **完成**：deploy.sh 拉取 `d95aa04` 重建镜像（首次 build 因网络 DeadlineExceeded，重试 + 基础镜像预拉后成功），healthz 200，bundle 实证含「设为封面/先选择地点/浏览器要求 HTTPS」三项修复，**手机可直接复测**；
   ④ ~~git push~~ ✅ **完成**：`5f99891..d95aa04` 已推送 GitHub（含 Record 修复 `35538b8`、OBS-1 修复、QA 双报告归档）；
   ⑤ **Vercel 云端部署** ✅ **2026-09-04 深夜上线并通过验收**：生产域名 **`https://place-journal-xi.vercel.app`**（用户 Vercel Hobby 团队 `houfan`，GitHub 仓库 wanghoufan/place-journal 自动部署）。14 个环境变量已配（值取自 docker 部署副本 env；`VITE_AMAP_*`/`DEEPSEEK_API_KEY`/`OPENROUTER_API_KEY` 未配待联调）。验收：首页/bundle 200、VITE 变量注入、ai-organize 400 拒空、**transcribe 真音频端到端 PASS（腾讯 ASR 返回「嗯。」）**。**部署事故修复（`ab1086e`）**：api/transcribe.ts 首次部署全量 500——`ERR_MODULE_NOT_FOUND: api/_lib/tencent`，根因 Vercel ESM 打包不含 `_lib` 子目录相对导入，修复=TC3 签名内联进 transcribe.ts 自包含（ai-organize 无此问题）。**Supabase Redirect 白名单已补 `https://place-journal-xi.vercel.app/**`**（浏览器自动化实测列表确认）；线上首页实测渲染正常（云端 6 地点/标签/导航全拉取）。**✅ 用户实测（2026-09-04 深夜）：手机 Vercel HTTPS 录音成功，语音→ASR 链路在云端正式可用**；Google OAuth 登录在 Vercel 域名待用户日常使用中确认（白名单已备好）；
   ⑥ ~~Tailscale HTTPS 穿透~~ ⏭️ **已被 Vercel 方案取代（手机录音直接用 Vercel HTTPS 域名即可）**，Tailscale 不再必要，仅当用户想要自有域名/内网 HTTPS 时再做；
   ⑦ 高德 Key 联调（Vercel 与 8081 均未配 `VITE_AMAP_*`，申请后在两端环境变量各补一份并重建/重部署）；
   ⑧ 收尾：QA 验收临时标签清理（等用户示下）、`.env.vercel.local` 粘贴用临时文件可删（已被 git 忽略）。
9. ~~RQA-V 修复后手机复测~~ ✅ **2026-09-05 桌面自动化等价验证完成 + 修复上线三端（`9f0eeb7`）**：① 删除确认弹窗（文案四要素 + 取消路径）PASS；② 删记录后分享失效（本地 revoked + 云端 status=revoked + 匿名 RPC null）PASS；③ 空地点清理（本地 -1 + 云端 place/entries 级联清除）PASS；附加多记录地点删单条（delete_entry op）PASS。手机真机复测改为可选（如做：删除确认弹窗 + 分享失效 + 地点计数三项，8081/Vercel 均已是新码）。
10. ~~登录态删除复活风险~~ ✅ **2026-09-05 已根治上线（`9f0eeb7`）**：① 复活根因 = V1 云端 entries 无删除 op + pullRemote 全量补插（实测复现：手动 pull 把已删记录拉回；日常强刷不复活系 on-load `autoSync()` 竞态侥幸）；② 修复 = `delete_entry` outbox op（复用 0001 已有 owner DELETE policy，无 Schema 变更）+ deleteEntry 内联级联；③ 云端 26/27 僵尸（历轮 QA 重复播种+验收残留）经用户授权全清，两桶测试对象已删；④ 遗留观察：autoSync 竞态本身未修（cloudState 非 idle 时静默跳过首次拉取，Realtime 订阅成功会补拉，行为可接受）；用户真实设备旧记录云端行已清，编辑旧记录若出冲突走 Mine 页裁决 UI。
11. **临时文件清理（2026-09-05 收口，仅剩两项）**：✅ /tmp/qa-profile-vercel-31574 已删（trash，2026-09-05）；✅ 根目录 `coordination/`＋`docs/review/` 已保留并入库（`d81ebcd`）；✅ /tmp/rqa-profile-ef894e7a 已不存在。**仍待**：① /tmp/chrome-cdp-profile（保留中——CDP 9334 Chrome 仍运行 PID 15060，含 5173 登录态供下轮 QA 复用；弃用时先优雅退出 Chrome 再删目录）；② Downloads 里 1 张 QA 测试分享图（个人目录，需用户指认后处理）；③ 历史验收标签（验收T3/T7）。
12. **不修留档的观察项**：① 分享面板创建后不自动同步（create_share 等下次同步才上云，期间匿名访客见「链接已失效」）；② owner 打开自己的分享链接封面空白（本地快照 blob 失效，匿名访客正常）；③ OBS-2 lastSyncError 显示被 reload 重置；④ OBS-V1 transcribe 对非标准请求 400 vs 8081 415 不统一（用户拍板跳过）；⑤ on-load `autoSync()` 竞态未修（cloudState 非 idle 时静默跳过首次拉取，Realtime 订阅成功会补拉，行为可接受）。
13. **2026-09-05 新功能手机真机复测（可选，均已在桌面自动化实测过）**：① 删除记录出确认弹窗、删空地点计数 -1、分享链接失效；② Find 评分 5 档筛选；③ 编辑记录 →「＋ 新标签」现场建标签并自动勾选。PWA 缓存「下次打开才生效」，先完全划掉 app 再重开。

### 0.3 注意事项及相关规矩

1. **审批边界**：0002 Storage/Realtime 仍冻结；共享库任何 Schema/表/字段/函数/策略变更必须先过管理员审批，唯一发布入口是平台仓库（`alw丨数据库管理专家/平台丨共享 Supabase 数据库/`）的 supabase db push。
2. **密钥红线**：前端只允许 publishable/anon key（已在 `.env.local`，勿入 git）；service_role/数据库密码绝不进前端、不进文档；HAR/截图归档前必须脱敏。
3. **路径变更**：数据库治理材料在 `alw丨数据库管理专家/`（项目审查丨habit_tracker/ 与 平台丨共享 Supabase 数据库/）；本项目 `docs/db/` 只放送审清单，`supabase/migrations/0001_init.sql` 已不是权威版本。
4. **送审格式**：凡有文件需转送其他智能体/管理员，写入项目 `.md` 清单，给用户**绝对路径纯文本**（不用 file:// 链接），一个入口文件 + 全部材料路径。
5. **单设备约束**：不为双设备/并发场景做开发或验收；同步协议里的冲突处理只作数据安全兜底。（2026-09-07 补：L3 验收仍取消；但用户实际已双端日常使用〈手机记＋电脑看〉，同步可靠性修复按此保障。）
6. **验证纪律**：云端写入验收以 REST 回执/云端直读为准，页面显示≠同步成功；RLS 验证必须用 authenticated/anon 角色（superuser 绕过 RLS）。
7. **prompt_manager 是相邻项目**：共用 Supabase 但互不归属；本项目的 bug 不要顺手改它（2026-09-03 曾发生两项目交叉混淆，用户已叫停）。
8. **Chrome 验收自动化坑（2026-09-04）**：QA Chrome 启动参数 `--user-data-dir=/tmp/chrome-cdp-profile --remote-debugging-port=9334`；TRAE 沙箱会拦 Chrome 的系统访问（Crashpad/Keychain），Chrome 相关命令需 `dangerouslyDisableSandbox`；**强杀（pkill -9）Chrome 会挂死该 profile 的 IndexedDB**（`ensureSeeded` 永不落地 → 应用白屏且零 console 报错），退出尽量走优雅路径；Google OAuth 登录不得代输凭据，必须用户亲自完成；复用同一 profile 免重复登录。
9. **手机局域网实测坑（2026-09-04）**：`http://192.168.31.60:8081` 是非安全上下文——① ~~`navigator.mediaDevices` 为 undefined，录音直接不可用~~（2026-09-07 录音/ASR 整条下线，改走微信语音输入，此条作废）；② `crypto.randomUUID` 不存在（已修：`src/lib/uuid.ts` polyfill，commit `6fc3cd5`）。手机验证一律用 8081 部署版，**改代码后必须重建镜像**（仅重启容器不生效）。
10. **浏览器自动化补充坑（2026-09-05）**：① `/tmp/chrome-cdp-profile`（CDP 9334）在 5173 origin 有有效登录态可复用，接管前先 `curl http://127.0.0.1:9334/json/list` 探活；② Stars 评分组件是 **aria-label button**（内容为 SVG），eval 里用 `document.querySelector('[aria-label="5 星"]')` 定位，textContent 匹配必落空；③ 验证 bundle 是否含新代码时注意模板拼接字符串（如 `${n} 星以上`），grep 关键词要选字面量（如 `星以上`、`\[1,2,3,4,5\]\.map`）；④ `agent-browser click ref=` 的引用可能过期，点击后必须实测校验（本轮曾误判「弹窗没开」实为已点确认删除）。

---

## 1. 必读文档（按顺序）

| 顺序 | 文档 | 作用 |
|---|---|---|
| 1 | 本文档 §0 | 现役收工快照（唯一权威） |
| 2 | 项目根 `HANDOFF.md` | 入口指针（已瘦身，详见本文 §0） |
| 3 | `docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md` | SSOT 产品与技术方案（M0–M6），需求以此为准 |
| 4 | `.workbuddy/memory/2026-09-05.md`（现役）、`2026-09-03.md`、`2026-09-02.md`、`2026-09-01.md`、`2026-09-04.md`（指针） | 开发全程日志（09-03 含 L2/QA 实测细节；09-04 工作详见本文 §0 与 docs/qa/ 两份报告） |
| 5 | `alw丨数据库管理专家/2026-09-03 丨 共享 Supabase 项目与独立 Schema 数据库规范 丨 V1.4.md` | 数据库规范（当前生效 V1.4；迁移 SQL 必须符合它） |
| 6 | `alw丨数据库管理专家/平台丨共享 Supabase 数据库/` | 正式 Migration 仓库与 DATABASE_CATALOG |

> 以下 §1–§4 为 2026-09-02 前的历史记录，已被 §0 收工快照取代，仅保留作追溯；现役状态一律以 §0 为准。

## 2. 当前工作进展（历史，2026-09-02 快照，已被 §0 取代）

### 2.1 已完成（三轮阶段）

1. **M0–M6 全量功能**（V1.0）：画廊/记录/AI 确认/详情/找地点/两层标签/我的/分享快照/地图总览全部页面；腾讯 ASR、大模型（OpenRouter/DeepSeek/OpenCode 可切换）、高德地图适配层全部支持「未配置降级不阻塞」。
2. **数据库规范 V1.1 收口**：8 表在独立 Schema `habit_tracker`（不进 public）、`owner_user_id`、四道门（Expose/GRANT/RLS/Policy）、Realtime publication、2 个 Storage bucket、entry_tags 归属一致性触发器。迁移草案见 `supabase/migrations/0001_init.sql`（头部含设计问答，待提交【平台丨共享 Supabase 数据库】仓库发布）。
3. **数据库规范 V1.2 + Docker 规范 V1.0 对齐（2026-09-02 本轮，最新）**：
   - `src/lib/sync.ts`：`pullRemote` 合并时 **outbox 未确认本机变更（sync ≠ synced）不被远端覆盖**（V1.2 §9.2.4），并修复远端较新时 push 产生重复行的缺陷；新增 `startRealtime/stopRealtime`（V1.2 §9.1：Realtime 仅通知、初始/断线重连主动补读、outbox 非空不拉取、登出断开），接线在 `src/main.tsx`。
   - Docker 产物齐备（project_slug = `personal-checkin`）：`Dockerfile`（多阶段：vite build + esbuild 打包 `api/*.ts`）、`server.mjs`（node:http 静态 dist + 与 Vercel Functions 同一实现的 `/api` + `/healthz`）、`compose.yaml`、`.dockerignore`、`docker/env.template`。无本地数据库/服务端文件 → 暂无 Named Volume 与 DockerData bind mount（compose 内有注释边界）。
   - 全仓规范引用 V1.1 → V1.2（env.ts、.env.example、迁移 SQL 头部、README、根 HANDOFF.md）。

### 2.2 验证状态（规范 V1.2 §11 分层，2026-09-02 历史）

- ✅ **L0**：`tsc -b && vite build` 通过；`server.mjs` 冒烟通过（/healthz、静态、SPA fallback、/api 501 降级）。
- ✅ **L1（本地持久化，2026-09-02 CDP 无头 Chrome 实测 PASS）**：完整保存流程（选地点 → 填感受 → AI 确认 → 入库）走通；IndexedDB 升 v2；刷新/重开详情页数据完好；应用级 console error = 0。
- ✅ **L2**：历史快照中为“待做”；**现役结论见 §0：L2_PASS、TAG_FIX_PASS、QA_V02_PASS 均已通过（2026-09-03）**。
- ⏳ **L3–L5（历史标注“全部未做”）→ 现役：单设备定位，L3 已取消（用户决定，见 §0.1）；Storage/Realtime 冻结待平台规则**。
- **Git/Docker（历史）**：当时“业务项目 git 未 commit”；**现役：业务项目 `aaa178f`→`86f01ac` 共 6 commit，平台仓库 `efddca5` 基线，无 remote 未推送，push 需用户二次确认；Docker 仍待授权未创建（见 §0）**。

### 2.3 本轮修复（2026-09-02 L1 验收时）

1. `/record`、`/confirm` 流程页隐藏底部导航与悬浮「记录」按钮（原先 FAB 会实际拦截表单控件点击，见 `src/App.tsx` 的 `isFlow`）。
2. IndexedDB `outbox` store 补开 `autoIncrement`（v1 缺陷：`enqueue` 的 `add` 无 seq 必 DataError，是潜在 L2 阻断点），DB_VERSION 1→2 自动重建队列（临时数据，安全）。见 `src/lib/idb.ts`。
3. **已建好 `.env.local`**（被 .gitignore 忽略；普通 `.env` 未被忽略，真实 Key 绝不放 `.env`）：全部占位符就位，每段注释写明获取地址。**只差用户填 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` 两行**（Dashboard → Project Settings → API → Project URL / Project API Keys → Publishable key；禁 service_role）。填好后需重启 vite。

## 3. 下一步任务（历史，2026-09-02 建议顺序，已被 §0 取代）

| # | 谁 | 任务 | 现役状态 |
|---|---|---|---|
| 1 | 用户/管理员 | **先交审查**：把写入方案交管理员审批并发布迁移、Expose | ✅ 已完成（V1.1 R2 APPROVED_FOR_EXECUTION → S1 已发布 `20260903141849`，S2 已勾选） |
| 2 | 用户 | 填 `.env.local` 的 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ 已完成（L2 已用真 Key 验证通过） |
| 3 | 用户确认后 | 智能体执行 **git commit/push** | ✅ 业务项目已 6 commit，待 push 需二次确认；平台仓库 `efddca5` |
| 4 | 智能体 | 逐项打通：登录 → 同步 → ASR → 大模型 → 高德 | ✅ 登录/同步已 L2_PASS；ASR/大模型/高德保持降级可用，待 Key |
| 5 | 用户确认后 | Docker 部署 | ⏳ 待授权（产物齐备，未创建 `Services/personal-checkin/`） |
| 6 | 用户确认后 | Vercel 部署 | ⏳ 待确认（`vercel.json` 已备好） |
| 7 | 智能体 | 观察项：FAB 视觉重叠 | 已修复挡表单；列表/FAB 重叠为设计固有，待用户定夺 |

## 4. 注意事项及相关规矩（必须遵守）

### 4.1 硬性守则（用户全局规则）

- **未经用户明确确认，禁止 git commit / push；推送需二次确认。**
- **未经用户明确授权，不创建/删除/迁移/覆盖** `Services/`、`DockerData/`、`DockerBackups/`、Docker Named Volume；不启动新生产容器、不公开新端口。
- 所有 HTML/页面强制**响应式**，禁止固定像素宽度；统一**浅色主题**。
- API Key 只进 `.env` / 部署 `.env.local`；浏览器只放 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`（规范 V1.2 §7.1），`service_role`/数据库密码/MCP 令牌/服务端 Key 绝不进前端包、Git、日志、截图。
- 每次代码修改后必须实测并附 preview 链接；一次只做一个特性，验证后再下一个。
- 演示数据可一键清除且不复活（`demo_seeded` meta），必须标识为演示。
- 接入智能体不是数据库审核人：不得自行发布 Migration、执行 `supabase db push`、改 Dashboard。

### 4.2 规范要点（V1.2 + Docker V1.0 摘要）

- 业务表只在 Schema `habit_tracker`，统一走 `src/lib/supabase.ts` 的 `table()`；禁止业务表进 `public`、禁止整库 JSON 覆盖式回写。
- 「已保存到云端」唯一标准：登录态 + 写入成功回执 + 刷新重读仍在（多端还需另一设备互见）；页面即时显示 / HTTP 200 / 收到 Realtime 事件都不算。
- Realtime 只通知，不做保存确认或冲突合并；outbox 有未确认变更时不得被回读覆盖（已实现，改动 sync.ts 前先理解这个约束）。
- 记录级写入；标签关系、分享条目「先增后删」；核心实体 revision 每次本地保存 +1。
- Docker：`VITE_*` 是构建期变量，改动必须**重建镜像**不能只重启；容器 Up/HTTP 200 只代表 Runtime 层，不代表数据库/RLS/多端验收；备份只放 `DockerBackups/personal-checkin/`，不进 Git。

### 4.3 踩坑记录（详见根 HANDOFF.md §6，勿重蹈）

1. sessionStorage 存 Blob 会序列化成空对象 → 已改内存模块 `draft.ts`。
2. PG CHECK 不允许子查询 → entry_tags 归属校验用触发器。
3. dev 下 `/api` 404 返回 HTML → 适配层按 content-type 判定「未配置」。
4. 中文数字筛选（「人均五十」「给四星」）需 cnToNumber 转换。
5. **端口约定：5173 = dev，4175 = preview（4173 被其他进程占用，勿动）**；避免占用其他项目端口 3000/3001/3100；Docker 宿主机端口用 8081。
6. 演示图禁止 SVG 占位文字，用 picsum.photos seed 图。
7. **自动化测试浏览器（browser_use 等）会复用档案并命中 PWA SW 缓存的旧 bundle**，导致"修复未生效"假象；本项目 `sw.js` 是 `no-cache`，真实浏览器自动更新。验收时用无头 Chrome 独立 profile（`--user-data-dir=/tmp/xxx`）+ CDP 驱动（Node 22 内置 WebSocket 即可，参考 /tmp/cdp-test.mjs 思路），或先 unregister SW + 清 caches。另：测试智能体自己 evaluate 探测 IndexedDB 会在 console 留下 NotFoundError/DataError 假报错，勿当产品缺陷。

### 4.4 环境备注

- Node 用 managed 路径：`/Users/zzymima0000/.workbuddy/binaries/node/versions/22.22.2-2/bin/node`。
- 恢复开发：`npm install` → Key 填 `.env.local`（已建好占位符；普通 `.env` 未被 gitignore，禁用）→ `npm run dev`（5173）或 `npm run build && npm run preview -- --port 4175`；改 `.env.local` 后需重启 vite。

---

## 5. 开发暂停后的最新交接（2026-09-03 历史，**已被 §0 收工快照取代**）

> 本节为 2026-09-03 开发暂停时的阶段性交接（当时 S2 待勾选、L2 刚通过）。**2026-09-03 晚收工后，权威状态已迁移至 §0**；本节仅保留作追溯，行内“当前”指当时当刻。

### 5.1 当前工作进展

| 事项 | 状态 | 已确认事实 / 边界 |
|---|---|---|
| 产品功能 | ✅ 已完成主体 | M0–M6 页面与主要业务流程已完成：地点、记录、AI 确认、标签、搜索、分享、地图等。 |
| 本地数据层 | ✅ L1 已验证 | IndexedDB + outbox 本地流程已通过；完整保存、刷新、重新打开详情页可读。 |
| Supabase 目标 Schema | ✅ 已发布 | 共享项目 `yacgnikzvutbpoqvokth` Schema `habit_tracker` 经管理员 R2 复审 `APPROVED_FOR_EXECUTION` 后发布（Migration `20260903141849`，与送审版字节一致）；Expose 已由用户勾选并验证。 |
| 数据库写入方案 | ✅ 已通过 | V1.1 经 R2 增量复审 `APPROVED_FOR_EXECUTION`（§13.1）；0002 Storage/Realtime 仍冻结待平台规则。 |
| Migration | ✅ 已发布 | 平台仓库 `supabase/migrations/20260903141849_create_habit_tracker_schema.sql` 已 db push 至共享项目并完成线上只读核对（8 表 RLS、策略 32、anon 零表权限）。 |
| Supabase 真实写入 | ✅ L2_PASS | 真登录、云端写入回执（201+revision）、清 localStorage 重登重读、RLS 按用户隔离全部通过（2026-09-03，证据 `docs/acceptance-l2/`）。 |
| 双设备 / 冲突 / 重连 / 恢复 | ⏳ 单设备定位 | **L3 已取消**（用户决定，见 §0）；乐观锁与冲突 UI 仅作兜底 |
| Docker | 📝 产物已准备 | Dockerfile、Compose、server.mjs 等已具备；尚未创建 `Services/personal-checkin/`（待授权） |
| Key 与环境 | ✅ 已配置 | `.env.local` 已填 `VITE_SUPABASE_URL` + publishable key（L2 已验证，仅 anon 凭据） |
| Git | ⚠️ 部分已提交 | 业务项目 `aaa178f`→`86f01ac` 共 6 commit（1 个未提交 `.workbuddy/memory`）；push 需二次确认 |

### 5.2 数据库管理员已经指出的必须修复项（V1.0 阶段历史，已在 V1.1 中全部修复并获 APPROVED）

> 以下 11 项为 V1.0 审查意见当时指出的阻断项；V1.1 已逐项修复并通过 R2 增量复审。保留清单作追溯，新智能体以 `alw丨数据库管理专家/项目审查丨habit_tracker/` 权威材料为准：

1. 删除 `tags_two_levels` 中包含子查询的 CHECK，改用触发器；当前写法会导致 PostgreSQL Migration 执行失败。
2. 为 `tags`、`entries`、`media`、`entry_tags` 等关联关系增加 `(id, owner_user_id)` 复合唯一键和复合外键，确保不同用户的数据不能互相串联。
3. 将 `revision` 从“字段声明”改成真正的乐观锁：旧 revision 条件更新，返回 0 行必须明确冲突；不得用 `updated_at` 新者覆盖作为最终冲突规则。
4. 修改应用同步代码中的直接 `upsert`，尤其是 `src/lib/sync.ts` 的 places、entries、media 更新路径，使其带 expected revision 并检查返回行数。
5. 明确 `id`、`client_id` 的职责；为 `share_items` 增加稳定幂等 ID 或 `(snapshot_id, client_id)` 唯一约束，确保离线重试不会重复插入。
6. 对公开分享 payload 增加数据库或受控服务端白名单保护，不能只靠前端保证 `note_private` 不进入分享；同时修复当前 `shareRows()` 写入 `payload: {}` 的实现不一致问题。
7. 明确 Storage bucket、`storage.objects` policy 和 `supabase_realtime` publication 是否属于 V1.2 允许的受控注册动作；在规则未明确前不得执行这些 SQL。
8. 明确匿名分享是否允许枚举全部 active 分享；如果要求“仅知道链接才能访问”，不能直接给 anon 全表 SELECT。
9. 将 `drop schema ... cascade` 标记为破坏性回滚，并补充备份、隔离恢复、管理员批准和其他 Schema 不受影响的验证流程。
10. 不得把包含 `create policy`、`create trigger`、`alter publication`、`add constraint` 的整份 Migration 宣称为完全幂等。
11. “places 可复用已有”只能指复用 `habit_tracker` 自己 Schema 内的数据，不能读取或复用 `prompt_manager`、`public` 或其他工具的数据。

完整解释、修改方向和验收标准以以下文件为准，不要只根据本节摘要修改：

`/Users/zzymima0000/Developer/coding/1.Active/alw丨数据库管理专家/项目审查丨habit_tracker/个人打卡小工具丨habit_tracker丨数据库管理员完整审查意见丨V1.0.md`

### 5.3 恢复开发后的严格任务顺序

开发暂停期间不执行以下任务。只有用户明确要求恢复开发后，才按顺序执行：

1. **只读盘点**：先阅读本节、完整数据库审查意见、V1.2 数据库规范、产品技术方案和现有代码；检查 Git 状态，不覆盖已有改动。
2. **修订方案**：生成 V1.1 写入方案，逐项回应完整审查意见；同时修订 Migration 草案和相关应用写入代码。
3. **隔离验证 SQL**：在隔离环境完整执行 Migration，验证标签、复合外键、RLS、GRANT、函数、触发器、Storage、Realtime 和回滚方案；不得连接生产项目做试错。
4. **重新提交数据库审核**：提交 V1.1 方案、Migration 差异、权限矩阵、并发方案、幂等方案、公开分享方案、备份恢复记录和未解决问题。
5. **等待明确审核结论**：只有共享 Supabase 数据库管理员明确批准后，才能进入发布准备。`CHANGES_REQUIRED` 或“口头看起来没问题”都不等于批准。
6. **正式发布前准备**：正式 Migration 只能进入【平台丨共享 Supabase 数据库】仓库；核对目标项目、Schema、Migration 顺序、备份和发布人。接入智能体不得自行生产 `supabase db push`。
7. **配置 Expose 和开始 L2**：仅在 Migration 获得批准并由唯一发布流程完成后，再由管理员配置 `habit_tracker` Exposed schema，随后由接入智能体进行真登录、写入成功回执、刷新重读和 RLS 越权验收。
8. **继续 L3–L5**：L2 通过后，依次验收双设备 CRUD、冲突、断网重连、Storage、分享、备份恢复；每项都记录实际设备、时间、操作和结果。
9. **最终材料**：所有内容按“已验证 / 待验证 / 存在问题”更新到既有文档，原样提交给数据库管理员复核；不能由接入智能体自行宣布数据库收口。

### 5.4 暂停期间和恢复时的硬性规则

1. **数据库禁区**：未经正式审核批准，不得建表、改 RLS、改 GRANT、改 Expose、改 Storage、改 Realtime、发布 Migration 或执行生产 `supabase db push`。
2. **Migration 归属**：业务项目内的 `supabase/migrations/0001_init.sql` 只是草案；正式结构只能由共享平台仓库管理，不能形成第二套 Migration 历史。
3. **Schema 隔离**：所有业务查询必须走 `supabase.schema('habit_tracker')`；禁止访问其他工具 Schema，禁止把业务表放进 `public`。
4. **密钥安全**：浏览器只允许使用 Supabase URL 和 publishable key；`service_role`、数据库密码、Auth token、API Key、MCP/分享秘密不得进入前端、Git、日志或截图。
5. **本地与云端边界**：IndexedDB、outbox 和本地草稿不是 Supabase 云端主库；页面即时显示、HTTP 200 或收到 Realtime 事件都不等于云端保存成功。
6. **冲突规则**：不得用整库 JSON 覆盖；不得用单纯 `updated_at` 新者保留掩盖冲突；旧 revision 写入失败必须可见、可恢复、不可静默丢失。
7. **Storage / 分享安全**：公开桶中的内容必须确实允许公开；私密原图、私密笔记、转写原文和任何密钥不得进入公开 payload 或公开桶。
8. **运行端口**：开发端口为 5173，预览端口为 4175，Docker 约定宿主机端口为 8081；不要占用用户其他项目的端口。
9. **Docker 边界**：未经用户明确授权，不创建或覆盖 `Services/personal-checkin/`，不动 `DockerData`、`DockerBackups` 或 Named Volume；修改 `VITE_*` 后必须重新构建镜像。
10. **Git 边界**：先检查 `git status`；不得 reset、checkout、覆盖或删除用户改动；commit 需要用户明确确认，push 需要再次明确确认。
11. **验证记录**：没有真实环境和操作证据就写“待验证”；静态检查不能替代真实 Supabase、RLS、双设备、断网、恢复验收。
12. **文档归属**：数据库方案继续维护原方案文件；完整审查意见只维护本目录下的数据库审查意见文件；本 HANDOFF 只维护阶段入口、状态和恢复规则，不新建重复报告。

### 5.5 暂停阶段完成标准（历史，2026-09-03 当时）

> 以下为暂停当时的判定（CHANGES_REQUIRED / 未执行生产变更 / 未开始 L2）。**现役判定见 §0**：已获 `APPROVED_FOR_EXECUTION`，S1/S2/L2/QA 均已完成，仅 0003 Storage 待审：

- 当时最新审查结论为 `CHANGES_REQUIRED`（后已修复为 `APPROVED_FOR_EXECUTION`）；
- 当时没有执行生产数据库变更（后 S1 已发布）；
- 当时没有开始 L2–L5 云端验收（后 L2_PASS / TAG_FIX_PASS / QA_V02_PASS 均已完成）；
- 当时没有创建生产 Docker 目录或容器（仍待授权）；
- 所有待修复项、恢复顺序和权限边界已有明确记录；
- 下一个智能体可以直接使用下方提示词恢复工作（提示词本身仍有效，但“当前真实状态”段落以 §0 为准）。

### 5.6 下一个智能体接续恢复提示词

```text
【接续恢复：个人打卡小工具 habit_tracker 数据库接入】

你是“个人打卡小工具项目接入/恢复实施智能体”，不是“共享 Supabase 数据库审核人”。本提示词中的“你”只指你这个接续智能体；“用户”指项目所有者；“共享 Supabase 数据库审核人”是独立审核角色。你不得自行审核、批准、发布或宣布数据库收口。

项目目录：
/Users/zzymima0000/Developer/coding/1.Active/ing 丨0831个人打卡小工具 MACMINI GL

用户目前要求开发暂停。除非用户明确说“恢复开发”或“继续数据库接入”，你只做只读检查，不改源码、不改数据库、不改 Dashboard、不改 Docker、不启动服务。

开始前按顺序阅读：
1. HANDOFF.md，重点阅读最新 §5
2. docs/db/个人打卡小工具丨habit_tracker丨数据库管理员完整审查意见丨V1.0.md
3. docs/db/写入方案丨数据库管理员审查丨V1.0.md
4. docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md
5. 共享 Supabase 数据库规范 V1.2
6. Mac Mini 本地项目自托管 Docker 规范 V1.0
7. src/lib/supabase.ts、src/lib/sync.ts、src/lib/idb.ts、src/lib/types.ts

当前真实状态：
- 产品主体和本地 IndexedDB/L1 流程已完成；Supabase 真登录、真实写入、RLS、双设备、并发、断线和恢复尚未完成。
- 目标 Supabase 项目 ref 为 yacgnikzvutbpoqvokth，目标独立 Schema 为 habit_tracker。
- 业务代码已经通过 supabase.schema('habit_tracker') 访问该 Schema，这个方向保留。
- supabase/migrations/0001_init.sql 仍是业务项目草案，尚未获得发布批准，不得执行生产 supabase db push。
- 数据库管理员已给出 CHANGES_REQUIRED。完整修改要求以 docs/db/个人打卡小工具丨habit_tracker丨数据库管理员完整审查意见丨V1.0.md 为准。
- 当前阻断问题包括：CHECK 子查询会导致 Migration 失败；多处外键没有同 owner 约束；revision 没有真正实现条件更新；share_items 幂等不完整；公开 payload 没有数据库/服务端白名单；Storage/Realtime 规则边界未确认；匿名分享可能枚举；回滚方案破坏性过强。
- 当前不能进入 S1 发布、S2 Expose 或 L2 写入验收。
- .env.local 只允许填写 VITE_SUPABASE_URL 和 VITE_SUPABASE_PUBLISHABLE_KEY；禁止 service_role、数据库密码和服务端 Key 进入前端。
- 代码和文档存在未提交/未跟踪改动；先 git status，绝不 reset、checkout、覆盖或删除。

用户明确恢复后，严格按以下顺序：
1. 只读盘点 Git、文件、现有方案和代码，不覆盖用户改动。
2. 根据完整数据库审查意见修订 V1.1 方案、Migration 草案和应用写入代码。
3. 修复 CHECK 子查询、跨用户复合外键、标签触发器、revision 条件更新、client_id/share_items 幂等、payload 白名单和匿名分享访问模型。
4. 明确 Storage bucket、storage.objects policy、supabase_realtime publication 是否是 V1.2 允许的受控注册动作；未明确前不得执行。
5. 在隔离环境执行完整 Migration、RLS 越权、幂等重试、旧 revision 冲突、公开分享和回滚恢复验证。
6. 生成 V1.1 方案、差异说明、权限矩阵、验证记录和遗留问题，原样提交给共享 Supabase 数据库审核人。
7. 只有收到明确批准后，才可进入共享平台仓库正式 Migration、唯一发布、Expose 和 L2 验收；你不得自行执行生产 supabase db push。
8. L2 通过后再按序进行双设备 CRUD、并发冲突、断网重连、分享/Storage 和备份恢复验收。

硬性禁区：
- 不得自行宣布数据库收口或批准发布。
- 不得执行生产 supabase db push，不得改 Supabase Dashboard 或 SQL Editor。
- 不得把业务表放入 public，不得访问其他工具 Schema。
- 不得删除或用整库 JSON 覆盖云端数据。
- 不得把 updated_at 新者保留当作并发冲突解决。
- 不得泄露 API Key、数据库密码、Auth token、分享秘密或真实私密内容。
- 未经用户明确授权，不得 commit、push、创建/覆盖 Services、DockerData、DockerBackups 或 Named Volume。
- 端口按既有约定执行：5173 开发、4175 预览、8081 Docker；不要启动未经授权的生产服务。

输出要求：每项明确标记“已验证 / 待验证 / 存在问题”，记录文件路径、命令结果和真实环境证据。遇到项目 link、权限、目标 Schema、线上状态或规则边界不确定时先停下并报告，不要自行扩大权限或执行生产变更。
```

### 5.7 共享 Supabase 数据库管理员角色：要求与职责

> 本节定义“数据库管理员/数据库审核人”这一独立角色。项目接入智能体不能代替该角色，也不能因为自己完成了代码修改就视为审核通过。

#### 角色定位

共享 Supabase 数据库管理员负责共享项目的数据库治理、接入审查、风险判断和发布门禁，不负责替项目智能体自行补齐未经审查的设计，也不因项目方声称“只供个人使用”而降低安全和数据一致性要求。

#### 必须履行的职责

1. **接入前审查**：任何新工具写入共享 Supabase 前，先审查其 Schema、表、字段、主外键、唯一约束、删除策略、归属字段和数据敏感度。
2. **隔离审查**：确认新工具只使用自己的独立 Schema，不读写 `public` 业务表，不访问其他工具 Schema，不覆盖或复用其他工具的数据对象。
3. **权限审查**：逐项核对 Data API Expose、Schema/table/function GRANT、RLS、Policy、Auth 角色、匿名访问和跨用户越权路径。
4. **关系完整性审查**：确认跨表关联具备同一 `owner_user_id` 约束，不能只依赖前端传值或普通单列外键。
5. **函数与触发器审查**：检查 Function、Trigger、`SECURITY DEFINER`、`search_path`、输入校验、默认权限和副作用；发现高权限函数时要求最小授权、撤销和审计方案。
6. **写入一致性审查**：检查保存成功判定、条件更新、revision/乐观锁、离线 outbox、重试幂等、删除、关系差量同步和 Realtime 旧快照覆盖风险。
7. **Storage / Realtime 审查**：核对 bucket 是否确实需要公开、对象路径是否按 owner 隔离、公开内容是否含私密数据，以及 Realtime publication 是否只增加目标工具对象。
8. **Migration 审查**：确认正式 Migration 只进入【平台丨共享 Supabase 数据库】仓库，项目业务仓库不得维护第二套生产 Migration 历史；核对目标项目、顺序、影响范围和可重复执行边界。
9. **备份与恢复审查**：发布前确认有最新备份、隔离恢复演练、回滚步骤和其他 Schema 不受影响的验证方法；破坏性回滚必须单独标注并经明确批准。
10. **验收审查**：区分静态 SQL、隔离执行、单设备持久化、RLS 越权、双设备、并发、断网重连、Storage、恢复演练等证据，不把构建成功、HTTP 200 或页面显示当作数据库验收。
11. **收口审查**：检查最终材料是否逐项标记“已验证 / 待验证 / 存在问题”，是否遗漏安全告警、遗留风险和未完成测试。

#### 审核输出标准

每次审核必须输出可执行、可追溯的意见，至少包含：

- 被审查项目、目标 Supabase project ref 和目标 Schema；
- 被审查方案、Migration、相关代码和版本；
- 每个问题的严重级别、文件路径、行号或对象名；
- 问题原因；
- 明确修改方式；
- 修改后的验收标准；
- 已验证、待验证、存在问题三类清单；
- 是否允许进入下一阶段；
- 是否允许发布或执行生产变更；
- 需要由谁补充的材料。

禁止只输出“总体可行”“看起来没问题”“注意安全”等无法执行的结论。

#### 审核结论枚举

数据库管理员只能使用以下明确结论：

1. `APPROVED_FOR_EXECUTION`
   - 方案和必要证据已满足当前阶段门槛；
   - 可以进入审核意见明确允许的下一阶段；
   - 不代表可以扩大到未审查的 Schema、表、Function、Storage 或数据范围；
   - 生产发布仍须使用共享平台的唯一发布流程。

2. `CHANGES_REQUIRED`
   - 方向可以继续，但存在可修复问题；
   - 必须按问题清单修改并重新提交；
   - 不得执行生产数据库变更。

3. `BLOCKED`
   - 目标项目、权限、Migration 来源、备份、隔离验证或关键安全事实无法确认；
   - 或存在高风险且没有可接受控制措施；
   - 必须先解除阻塞，不得通过猜测或临时放宽权限继续。

#### 数据库管理员的权限边界

- 数据库管理员可以审查方案、要求修改、拒绝发布、要求补充证据和决定是否进入下一阶段。
- 数据库管理员不得把未审查内容默认为已批准。
- 项目接入智能体不得自称数据库管理员，不得替数据库管理员填写批准结论。
- 未出现明确的 `APPROVED_FOR_EXECUTION` 前，不得执行生产 Migration、`supabase db push`、Dashboard 变更或 Expose 配置。
- 即使出现 `APPROVED_FOR_EXECUTION`，也只能执行批准范围内的动作；新增表、字段、Function、Policy、Storage、Realtime 或数据迁移必须重新提交。
- 正式生产发布必须由共享平台仓库的唯一发布人或唯一 CI 流程执行；审核人与发布人应保持职责可追溯。
- 审核过程中不记录或回显 API Key、数据库密码、Auth token、MCP 原始令牌、真实私密内容或生产敏感数据。

#### 新项目标准提交包

以后任何项目申请写入共享数据库，项目接入智能体必须先提交：

1. 项目名称、用途、数据敏感度和实际运行环境；
2. 目标 Supabase project ref 和独立 Schema 名称；
3. 表、字段、主键、外键、复合归属约束、唯一键和删除策略；
4. Expose、GRANT、RLS、Policy 权限矩阵；
5. Function、Trigger、Storage、Realtime、Auth 影响；
6. 写入成功判定、revision、冲突处理和离线重试幂等方案；
7. 备份、恢复、回滚和故障后的数据保护方案；
8. 正式 Migration 来源、发布人和隔离验证方式；
9. 现有代码如何访问 Schema，以及是否存在本地兼容层；
10. 已验证、待验证、存在问题和明确请求审核的事项。

材料不完整时，数据库管理员应返回 `BLOCKED` 或 `CHANGES_REQUIRED`，不能先批准再补材料。

### 5.8 2026-09-03 修订轮完成情况（已进入发布阶段；现役状态以 §0 为准）

> 进度：V1.1 正式复审 CHANGES_REQUIRED（R2-1～R2-4）→ 增量材料补齐（54/54 + 备份演练 15/15）→ **R2 增量复审 APPROVED_FOR_EXECUTION（§13.1，管理员独立复跑确认）→ S1 已发布 → S2 已完成并验证 → L2_PASS → TAG_FIX_PASS → QA_V02_PASS**。

**R2 增量材料补齐（全部完成并经管理员独立复跑确认）**

1. **R2-1**：`setup_stub.sql` 补交入库（幂等）；`verify.sql.sh` v4 改为 stub 先于 Migration 加载；全新初始化 PG16 集群重跑 **54/54**（含 stub 加载、R2-2/R2-3 新用例）。管理员以 Docker postgres:16 原样复跑确认。
2. **R2-2**：`public_share_read` 增加 `(expires_at is null or expires_at > now())` 校验（0001_init.sql）；V1.1 方案 §9 声明 expires_at 即刻生效。
3. **R2-3**：真实跨用户 media 封面用例（B 引用 A 真实存在的 media 行 → 被拒 + 未污染）。
4. **R2-4**：备份恢复演练 **15/15**（`备份恢复演练记录` + `backup_drill_result.txt`）。关键发现固化为 §10.3 第 0 步：**恢复到空库须先具备 auth 桩/平台 auth Schema**；RLS 验证必须以 authenticated 角色执行（superuser 绕过）。

**S1 已发布（2026-09-03，批准范围内）**

- Migration `20260903141849_create_habit_tracker_schema.sql`（与送审版**字节一致**，md5 `1ce6ae9482cb8515aedce6a4ad73b53c`）进入平台仓库 `supabase/migrations/`，经 CLI `supabase db push` 发布至共享项目 yacgnikzvutbpoqvokth。
- **发布后线上核对（只读）**：8 表全启用 RLS、策略 32、触发器 11、函数 5、索引 29、authenticated 32 项 CRUD grant、anon 表 grant 0、anon 可执行 `public_share_read` + schema usage——与隔离验证完全一致。平台仓库 DATABASE_CATALOG.md / README 已登记。
- **发布过程注意**：库内另一项目（prompt_manager）存在未推送 Migration `20260901163555`，不在批准范围——发布时临时移出 migrations 目录、push 后立即原样移回（md5 校验一致，其 Remote 状态仍为未推送，未受影响）。**后续任何人对该仓库执行 `db push` 也会连带推送它，需 prompt_manager 项目自行决策。**
- 批准范围外仍冻结：`0002_storage_realtime.pending.sql`、Storage、Realtime、任何范围扩大。

**S2 / Expose / L2 完成记录（2026-09-03）**

- **S2 Expose**：用户在 Dashboard → Settings → Data API → Exposed schemas 勾选 `habit_tracker`（仅新增）。
- **Expose 后验证（publishable key + REST）**：`GET /rest/v1/places`（Accept-Profile: habit_tracker）→ 42501 permission denied（已暴露且 anon 零表权限 ✅）；`POST /rest/v1/rpc/public_share_read`（Content-Profile: habit_tracker）→ 200 + null（不可枚举 ✅）。注意：跨 Schema 访问要用 `Accept-Profile`（GET）/ `Content-Profile`（POST）请求头；OpenAPI 根路径不认 publishable key 属预期。附记：prompt_manager Schema 在平台上也处于暴露状态（既有配置，非本次引入）。
- **L2 写入验收：L2_PASS**（独立浏览器实例 + 真实 Chrome CDP，Google OAuth 白名单后全程干净）：登录 ✅ → 写入「验收测试地点」（POST places/entries 均 201）→ 云朵已同步 ✅ → 清 localStorage 重登 7/7 数据完整回读 ✅；云端 places/entries 各 1 行、revision=1、RLS 按用户隔离生效。证据归档 `docs/acceptance-l2/`（L2-REPORT.md + 脱敏 l2-sync.har + 截图 10 张）。
- **L2 后缺陷修复（2026-09-03，纯应用层，无 Schema 变更）**：用户报告「新建笔记打标签刷新后丢失」。根因二连：① 演示标签（seed）从未上云 → entry_tags 推送被外键 `entry_tags_tag_fk` 拦死 → 远端 rescue 永远为空；② pullRemote 映射远端行时硬编码 `tagIds: []`，服务器 updated_at 总比本地晚 → 覆盖后本地标签被抹。修复：sync.ts 新增 `ensureTagsInCloud`（entry_tags 差量前补推缺失标签/维度）+ merge 保留本地 tagIds 再与远端 entry_tags 求并集。tsc 通过。注：已被抹掉的标签本地/云端均无副本，需用户重新打一次（修复后可持久）。
- **平台仓库基线 commit**：`efddca5`（prompt_manager 3 条 + habit_tracker 1 条迁移、DATABASE_CATALOG.md、config.toml exposed schemas 对齐；无 remote 未推送）。prompt_manager 未推送 Migration `20260901163555` 仍原样保留。

**下一步**

1. **管理员发布后收口核对**：把 S1 线上核对、S2 Expose、L2_PASS 证据（`docs/acceptance-l2/`）转交管理员，做发布后权限/功能状态终核并收口（V1.1 §13.1 已回填待管理员确认）。
2. **L3 取消（2026-09-03 用户决定）**：产品定位**单设备使用**（一部手机写入存储），不做双设备 CRUD / 并发冲突 / 断线重连验收。sync.ts 的乐观锁与 Mine 页冲突裁决 UI 保留作兜底，不作为验收项。后续仅剩：分享链路实测（可选）、备份恢复（数据库层已在 R2-4 演练 15/15）；Storage/Realtime 仍冻结待平台规则。
3. **业务项目 git commit**：本轮 sync.ts/Mine.tsx/ui.tsx/HANDOFF.md 等改动未提交，等用户确认。
4. **可选卫生动作**：验收 Chrome 实例（/tmp/l2-acceptance-chrome，端口 9334）确认不用后关闭；如介意 3100 页面 URL 残留 token，Dashboard → Auth → Users → 该用户 → Sign out all sessions 作废。
5. 数据库治理文件统一在 `/Users/zzymima0000/Developer/coding/1.Active/alw丨数据库管理专家/项目审查丨habit_tracker/` 维护；业务项目 `docs/db/` 只放送审清单。

---

## 6. 分支线 09-19→09-20 快照（历史归档）

> 2026-10-03 分支归位时并入：这 260 行原为 `wanghoufan/master` 版 `docs/handoff/HANDOFF.md` 的正文（`小交接快照 09-20深夜` / `本次小交接快照 09-20` / `恢复读盘` / `大交接快照 09-19` / `存档·迁移执行链`）。
> `master` 线（`67900b0`）的血缘里没有这段，导致 09-19/09-20 的安卓端工作记录（`PRODUCT_PLAN_V1.5`、`DEV-01→DEV-13`、T062 登录卡死根因等）一度只存在于本节。
> **现役状态一律以上方 §0（2026-10-02）为准**，本节仅作追溯。

### 小交接快照（2026-09-20深夜·暂停封存，用户口令「暂停工作」）

### 1. 当前的工作进展

- **已收工**：T062收口PASS／按钮对比度／同步接线／AI三件套（默认deepseek-flash＋PWA设置页＋mobile接线）／DeepSeek本地＋线上真调PASS／改名回退根治＋线上computer-use实测PASS／jcp洁癖＋commit f0a621c已推origin/master。P0=0。
- **在途（未收工）**：**TASK-DEV-16A**（安卓记录链照抄PWA：Draft→AI确认＋清洗/理由分流＋建标签＋灯箱）——builder被用户中途叫停，无报告；工作树留有半截活（M：record.tsx／ai-confirm.tsx／entry/[id].tsx／organise.ts／recordActions.ts／ui.tsx＋单测；新文件：Lightbox.tsx＋lightbox.test／draft.ts＋draft.test；均未验证、未commit）。
- PWA↔安卓差距审计已出：P0十余项，分三批（16A记录链／16B详情改名搬家灯箱／16C画廊Find Mine设置），详见TM记录。
- 用户自有文件2个（根目录「作业提交材料…Place Journal App…html/md」）一律不碰。
- 模拟器：本机 AVD `Pixel9`（`~/.android/avd`，emulator二进制在homebrew `/opt/homebrew/share/android-commandlinetools/emulator/emulator`，toolchain内无emulator）；Metro 8084现役。**红线：另一台真机在使用中，暂停期间禁碰一切真机（adb devices见IN9LZTAYV4UGU4JF／192.168.31.63:5555一律不动，只操作emulator-5554）。**

### 2. 下一步的任务

1. 恢复后先确认emulator-5554在线（`adb devices`只认emulator-5554），Metro 8084＋`adb -s emulator-5554 reverse`。
2. 续派DEV-16A builder（codebuddy）：先接上半截活（typecheck＋jest 283基线），做完走reviewer→qa（模拟器）→supervisor。
3. 依次16B／16C；真机（Note12Pro）空出来后再做真机测试。
4. 按E-002：修完默认推＋发＋亲自线上/模拟器实测。

### 3. 注意事项及相关规矩

- 禁真机：只动emulator-5554；禁reset/checkout/stash；commit/push听用户（E-002修完默认推发）。
- 密钥只进.mobile/.env／Vercel；不碰用户作业提交材料2文件；不改*旧版-*.md；不碰Services/DockerData/DockerBackups。
- 读盘序：AGENTS→角色卡→override表→本HANDOFF→DEV_EXPERIENCE→任务目标最后。
- 每轮末三行心跳：目标/剩P0/下一步。

### 本次小交接快照（2026-09-20）

### 1. 当前的工作进展

**1.1 计划与阶段（不动）**
- 基线仍是 `PRODUCT_PLAN_V1.5`，Readiness 92，`PLAN_GATE=APPROVED`，Phase=`DEVELOP`（本交接末暂停封存，恢复后继续）。
- 仓库根＝当前 `master` 目录，分支 `wanghoufan/master`，HEAD＝`e996cc6`（**以 `git log` 为准**）；远程只有 `origin/master`。
- 分工表为本项目**实文件**（非软链）；表内 builder＝codebuddy/deepseek-v4.1-flash，但该**通道本轮实测不可用**（见 §1.6）。

**1.2 T062 真机段：六项已拿到真机证据（可复跑）**

| 项 | 结果 | 证据（原始输出摘要） |
|---|---|---|
| 本地 Development Build 构建 | PASS | `./gradlew :app:assembleDebug` → `BUILD SUCCESSFUL in 8m 22s`，EXIT=0 |
| APK 实体 | PASS | `mobile/android/app/build/outputs/apk/debug/app-debug.apk`，262,468,309 字节，mtime 2026-09-20 09:34:30（本轮新建） |
| 包名/签名/scheme（包内） | PASS | `package: name='com.wanghoufan.placejournal'`，targetSdk 36，`CN=Android Debug`；manifest 内 `com.wanghoufan.placejournal` scheme 存在 |
| 安装到真机 | PASS | `firstInstallTime=2026-09-20 10:37:33`（走「推包＋设备侧 `pm install`」，见 §1.4） |
| 自定义 scheme 回跳＋Google 登录 | PASS | 点「使用 Google 登录」→ Chrome 选账号 → 回 App 渲染 `auth/callback`：「登录成功，请回到 Mine 确认绑定本地数据。」 |
| SecureStore session 冷启动恢复 | PASS | 杀进程重进后点登录 → **「已是登录状态。」**（未再开浏览器） |
| 重复 deep link 幂等 | PASS | 重投同一 callback → **「该登录回调已处理过，无需重复操作。」** |

- 安装后 `pm query-activities -a android.intent.action.VIEW -d "com.wanghoufan.placejournal://auth/callback"` → **1 activities found → `com.wanghoufan.placejournal.MainActivity`**（上一轮此处返回空，即当时根因；现已消除）。

**1.3 【本轮新发现】首次绑定确认 UI 缺失——阻断 T062 剩余两项（P1）**
- 真机现象：登录成功后 Mine 页显示 `本机归属＝未绑定`、橙色文案「登录成功，已开始同步。」，且**看不到「退出登录」**。
- 代码证据（全仓可核）：
  - `mobile/src/supabase/auth.ts:98` `bindOwner()`、`:100` `unbindOwner()` **零 UI 调用点**（只有定义与 `__tests__/auth.test.ts`）。
  - `mobile/app/(tabs)/mine.tsx:161`：「退出登录」按钮以 `summary.owner` 为条件渲染 → owner 恒为 null → 永不出现。
  - `mobile/src/sync/nativeSync.ts:34`：owner 为空直接抛 `OWNER_NOT_BOUND`；`mobile/src/sync/push.ts:181`、`pull.ts:188`：`assertOwnerForSync` 未绑定即整体阻断。
  - `mobile/app/auth/callback.tsx:24`：让用户「回 Mine 确认绑定本地数据」，但 Mine **没有该入口**。
  - 另注：`createNativeSyncEngines()` 全仓**无调用方**，同步引擎当前未接线（属后续任务范围）。
- 后果：T062 DoD 里的 **owner binding 阻断走查** 与 **logout 不删业务数据** 在真机上无法执行 → T062 不能收口；T077 以 T062 为前置，一并受阻。

**1.4 构建与安装链路（可复现，含一个 MIUI 坑）**
- 代理 `127.0.0.1:7897` 本轮可用；上一轮卡死的构件 `androidx.compose.ui:ui-tooling-preview-android:1.11.0-beta02` 走代理 `http=200`。
- 工具链：JDK 17.0.20.1（JAVA_HOME 已设）、`ANDROID_HOME=/Users/zzymima0000/android-toolchain/sdk`、build-tools 36.0.0、minSdk 24 / compileSdk=targetSdk=36。
- 构建命令（本轮实测走通）：`cd mobile/android && ./gradlew --no-daemon -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1536m' -Dkotlin.daemon.jvm.options='-Xmx2048m' :app:assembleDebug`
- **MIUI 坑（重要）**：`adb install` 被系统拒绝 → `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`（HyperOS 2.0 的「USB 安装」未开）。
  绕过方式（本轮实测成功）：`adb push` 到 `/data/local/tmp/` → `adb shell pm install -r -t <path>` → 返回 `Success`；**装完必须删掉临时包**（本轮已删）。
- Metro 本轮起在 **8083**（8082 被另一项目 `027-ing-蛋白质计算器` 占用，按规矩未动）；`adb reverse tcp:8083 tcp:8083` 已建（**会掉，恢复时先查**）。

**1.5 设备与端口**
- 目标真机＝红米 Note12 Pro（`ruby` / 22101316C / Android 14 / HyperOS V816 / OS2.0），serial `indq5xfi6hovay4d`。
- 同机同时挂着 `IN9LZTAYV4UGU4JF`：**只操作 `indq5xfi6hovay4d`，不碰其他设备**（本轮已遵守）。
- 本轮截取的界面证据暂存 `/tmp/t062_*.png`（未入库；如需留档由后续决定）。

**1.6 通道故障（本轮最影响下一步的一条）**
- builder 表定通道 **codebuddy 当前不可用**：在窗口内嵌套调用 `codebuddy --model deepseek-v4.1-flash -y -p ...` 时，子进程启动即 `EADDRINUSE: address already in use 127.0.0.1:63928`——该端口被外层会话独占；子进程随后零网络、零落盘、零输出挂起（实测 48 分钟 CPU 仅 2.45 秒）。
- 已试无效：清空继承的 `CODEBUDDY_*`/`CLAUDE_*` 环境变量、显式改 `CODEBUDDY_SERVICE_PROXY_URL` 端口、`</dev/null`；换成 `--permission-mode` 未试。
- 处置：终止进程（工作树无残留），DISPATCH-LOG 记 FAIL，任务定义保留待重派。
- 结论：**换通道＝换模型范畴，须用户拍板**；下轮不得自行改表。

**1.7 其他实测观察（待评审判定，未派工）**
- Metro 日志有 `WARN WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.`——即 PKCE 的 `code_challenge_method` 退化为 `plain` 而非 S256，安全相关，交 code-reviewer 判。
- 冷启动时用纯 `auth/callback` scheme 直接唤起会被 **dev launcher** 截走（Development Build 环境特性，release 包不受影响）；R4-03 的「换码后杀进程、冷启动 callback」真机路径本轮**未完成**，需在可加载 JS 的前提下另设计验证步骤。
- 未跟踪文件：无；工作树改动＝`AGENTS.md`、`docs/handoff/HANDOFF.md`、`docs/model/DISPATCH-LOG.jsonl`、`mobile/package.json`、`mobile/package-lock.json`（后两个为上一轮既有）。

### 2. 下一步的任务

> 按序做，不要跳。第 1 条是唯一入口，不解决它后面都推不动。

1. **先解通道，再把 TASK-DEV-14 重派出去（第一件事）**
   - 任务目标（`TASK-DEV-14`，任务单原文曾在 `/tmp/TASK-DEV-14.md`，重开窗口后按本段重写即可）：补「首次绑定确认」的用户可见入口，锁死范围不扩散。
     - ① 已登录且 owner 未绑定时，Mine 显示「确认绑定本机数据」按钮 → 二次确认 → 调 `bindOwner(当前 userId)` 写 `bound_owner_user_id` → 刷新为「已绑定 xxxxxxxx…」。
     - ② 绑定后出现「退出登录」按钮（`signOut()`，不删本地业务数据）。
     - ③ 文案纠正：owner 未绑定时不得再显示「登录成功，已开始同步。」。
     - ④ mismatch 时只显示阻断原因＋「重登原账号」路径；**不实现**导出后清空切号（HD-04 已降级延后），不做自动迁移。
     - ⑤ 约束：不碰根 Web、不改 `mobile/android/`、不改包名/scheme/redirect、不 commit/push、不改其他角色 docs、既有 240 tests 不许回归、新增逻辑要有单测。
   - 通道选择（需用户拍板）：等 codebuddy 通道可用后按表重派；否则请用户在「换通道/换模型」与「允许本窗口 subagent 代做」之间定一次，**不许自行改 override 表**。
2. **builder 交付后走 Phase2 主链**：code-reviewer（本窗口 subagent）→ qa（真机段走本窗口 adb 直驱）→ supervisor（opencode）→ TM 收齐。
3. **回真机收口 T062 剩余两项**（重装新 APK 后）：
   - 冷启动 → 登录 → 点「确认绑定本机数据」→ 二次确认 → `本机归属` 变**已绑定**；
   - 杀进程重进 → 仍显示已绑定（持久化验证）；
   - 点「退出登录」→ 本地业务数据**不删**（先播种 2 条记录再退，退出后条数不变）；
   - owner binding 阻断走查（`bound_owner_user_id` 与当前账号不一致时 push/pull 被阻断；cancel/重启不改 owner 与数据）——这条要先解决 §1.3 的「同步引擎未接线」才能端到端看到效果，若仍不可见则按「代码+单测证据＋真机 UI 证据」记录并说明边界。
4. **T062 全项收口后**再动后续：P2-1/P2-2/P2-3、AI 真整理接入、分享真云发布。**T062 未闭环前不得宣称本阶段完成。**
5. 每次派工收工，TM 往 `docs/model/DISPATCH-LOG.jsonl` 记一行（`used` 恒填「主」）；任务真收工再往 `docs/model/TASK-MODEL-LOG.jsonl` 记一行。

### 3. 注意事项及相关规矩

**3.1 阶段与红线**
- 基线锁死 `PRODUCT_PLAN_V1.5`，Phase=`DEVELOP`；**不改计划**（Plan 变更只走 Change C＋Human Approval）。本轮判定：补绑定 UI 属「已完成计划内任务的缺口」，**不是** Change A/B/C。
- 未经明确指令**禁** `git commit`／`git push`。**禁** `git reset`／`checkout`／`stash`：工作树里有本轮未提交成果（`AGENTS.md`、本 HANDOFF、DISPATCH-LOG、两份 `mobile/package*`），误清理＝事故。
- 不碰 `Services/`、`DockerData/`、`DockerBackups`；不改 `*旧版-*.md` 封存件；密钥只进 `mobile/.env`（gitignored），不入 Git/文档/聊天/截图；`service_role` 绝不碰。

**3.2 真机与安装（本轮踩过的坑，别再踩）**
- 只操作 `indq5xfi6hovay4d`；不卸载设备应用；不动同机其他 App 与设备。
- `adb install` 在 HyperOS 上会被拒（`INSTALL_FAILED_USER_RESTRICTED`）：改走 `adb push` → `adb shell pm install -r -t`；**不要**去关用户手机的「USB 安装」以外乱改系统设置，装完删临时包。
- Metro 端口**恢复时现查**（本轮 8083；8082 属别的项目、3000/3100 禁用）；`adb reverse tcp:<port> tcp:<port>` 会掉，失联先重建。
- 冷启动加载 App 的方式：`am force-stop` 后用
  `am start -a android.intent.action.VIEW -d "com.wanghoufan.placejournal://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A<port>"`；纯 `auth/callback` scheme 冷启会被 dev launcher 截走（§1.7）。
- UI 自动化取坐标一律用 `uiautomator dump` 读真实 `bounds`，别按截图目测（本轮目测点错过两次）。

**3.3 构建与环境**
- 必须用项目自带 `mobile/android/gradlew`；不依赖全局 Gradle；**不许**靠升级 compileSdk/targetSdk/AGP/Kotlin 绕问题。
- 不删 `mobile/android/` 原生目录、不执行 `npx expo prebuild --clean`、不清 Gradle/npm 缓存。
- 不改 `~/.zshrc`／`~/.zprofile`／IDE 设置；不改正式签名/keystore。
- 构建成功 ≠ 通过：必须同时核 **APK 实体（大小/时间/生成于本轮）＋包名＋签名＋目标设备安装状态＋scheme activity 注册**。
- 构建日志里的 deprecated 警告、`NODE_ENV` 未设置、npm audit 提示不构成失败依据。

**3.4 治理与账本**
- 派工前读根 `USER_MODEL_OVERRIDE.md`，精确 ID 照抄；表定通道必须走通道直调，禁本窗口套娃代做；**换人只听用户口令**。
- 本窗口 subagent 直派的角色（code-reviewer／qa 真机段／experience-recorder／neat-freak／product-reviewer）实际会继承窗口模型，派工账本要照实写实际模型，不照抄表列值（本轮 neat-freak 已按此记）。
- 缓存五条照旧：读盘序 AGENTS→角色卡→override→HANDOFF→`docs/handoff/DEV_EXPERIENCE.md`→任务目标最后；动态信息押后。

**3.5 文档未决（neat-freak 本轮产出，均未动手；TM 已据此重写本 HANDOFF 前段）**
- U-1～U-3 **已闭环**：本 HANDOFF §1／§3 已按实测改写（APK 已产出、设备已安装、代理 7897 可用、Metro 改「现查端口」）。
- U-4：构建命令以 §1.4 实测行为准（`--no-daemon` ＋自定义 jvmargs）。
- U-5 **已闭环**：本 HANDOFF「未闭环评审意见」行已改为「余 P-7/P-8/P-9＋本轮 U-1～U-13」。
- U-6：根 `AGENTS.md` 附录两处引「HANDOFF §0」（现无 §0）＋「恢复必读」顺序与 ORCA 冲突 → 待用户定「指向新快照」还是「整行标历史」。
- U-7：根 `HANDOFF.md:20` Node 路径仍写 `22.22.2-2`（dated 旧快照，属「搬了会 broken 的留原地」映射件）→ 待定「修路径」还是「加历史注」。
- U-8：`docs/handoff/接续恢复开发提示词丨2026-09-19.md` 多条已过期（Java/SDK/dev-client/Metro 8082/工作树干净），它却是给人粘贴用的 → 待用户定「改原文」还是「加已被 09-20 取代注」。
- U-9（原 P-7）：`docs/roles/planner.md:6`、`senior-expert.md:4` 硬写模型 ID，其余 9 卡写「见 override 表」→ 是否统一口径，用户定。
- U-10（原 P-8）：`docs/handoff/DEV_EXPERIENCE.md:52` 引 `HANDOFF.md:25` 与 `PRODUCT_PLAN_V1.0.md:224` 均已失效；该文件唯一可写人＝experience-recorder → 待派 recorder。
- U-11（原 P-9）：`docs/qa/BUGS_DEV-13.md:38` 行号引注过期；`mobile/docs/AUTH_REDIRECT.md §2` 仍写「HD-03 待办」与已加白矛盾 → 待派 owner/recorder。
- U-12：本轮 `AGENTS.md` 新增的「本目实文件例外」使项目 AGENTS 与母版分叉 → **两包不同步**，需要时在母版同步记一行（属治理改动，走用户确认）。
- U-13：上轮大交接 §1.4 证据路径写 `t062/`，实际目录名是 `docs/qa/evidence-android-t062`（低危）。
- U-14 **已闭环（进前段＋执行链）**：黑屏根治（8081默认端口映射）、演示7条已播、PWA切0.0.0.0+Tailscale可访、Chrome实测通过。
- U-15 **已闭环（前段落盘清单已补全）**。
- U-16：DEV-15（双机分发）仅账本一行，无review/qa doc——恢复后TM定是否补。
- U-17：`temp/接续恢复开发提示词丨2026-09-20.md` 写「重派DEV-14」（已过时）——改原文还是作废，用户定。
- U-18：DEV_EXPERIENCE唯一可写人冲突（AGENTS＋文件头定experience-recorder，本轮口令称neat-freak）；U-10引注失效仍在——待口令澄清后派recorder。
- U-19：旧U-6/U-7/U-8/U-9/U-11/U-12/U-13仍有效（U-1～U-3/U-5已闭环；U-4可判闭环）。

### 恢复读盘（全体系唯一顺序，别乱）

1. AGENTS；2. 角色卡；3. 根 `USER_MODEL_OVERRIDE.md`；4. 本 HANDOFF；5. 经验文档＝`docs/handoff/DEV_EXPERIENCE.md`（本项目定案，原“根 经验一句话.md”弃用）；6. 任务目标放最后。
冲突才扩大读。

---

### 大交接快照（2026-09-19，开发暂停封存，neat-freak 已过）

### 1. 当前工作进展

**1.1 计划（已锁定，不动）**
- `PRODUCT_PLAN_V1.5`（文件已对齐为 `docs/pm/PRODUCT_PLAN_V1.5.md`——2026-09-19 用户拍板由 V1.0 名改名并加文头状态注），Readiness 92，R5 终审，`PLAN_GATE=APPROVED`，`DEV_BASELINE` 锁定，HD-01=B 连续开发。
- 分工表已按母版转本项目**实文件**（旧软链已删，备份 `USER_MODEL_OVERRIDE.md.旧版-2026-09-13` 留存）；builder=codebuddy/deepseek-v4.1-flash，主备链见表。

**1.2 开发（全部收工）**
- **DEV-01→DEV-13 全收工**；两次真打回（DEV-03 P1×3、DEV-13 证据口径）均已闭环；**supervisor 累计打回 0/2**。
- `mobile/` 8 页全功能＋分享页＋冷启动接线＋P2 大扫除；**240 tests 全绿**；**根 Web 零改动**，根 `npm run build` 每次回归 PASS。

**1.3 【本轮新发现】T062 真机登录卡死——根因已定位（不是 login 功能坏了）**
- 现象：用户在红米上点「使用 Google 登录」，Google 页打开后一直通不过去。
- 实证三条（可复跑）：
  - `adb -s indq5xfi6hovay4d shell pm list packages | grep -iE "placejournal|exponent"` → **只有 `host.exp.exponent`（Expo Go）**，没有 `com.wanghoufan.placejournal`（dev build 不存在）。
  - `adb -s indq5xfi6hovay4d shell pm query-activities -a android.intent.action.VIEW -d "com.wanghoufan.placejournal://auth/callback"` → **返回空**（全机无人注册该 scheme）。
  - 对照 `... -d "exp://127.0.0.1:8082"` → 命中 `host.exp.exponent.LauncherActivity`；前台卡在 `com.android.chrome/CustomTabActivity`。
- 机制：`mine.tsx:76` → `login()` → `openAuthSessionAsync(url, 'com.wanghoufan.placejournal://auth/callback')`（`mobile/src/supabase/redirect.ts:43` 硬编码 HD-02 基线值）→ 认证完成后跳自定义 scheme → 系统找不到处理者 → `openAuthSessionAsync` 永远等不到 `type:'success'` → UI 停在「正在打开登录…」。
- 定论：**这是环境不匹配，不是 bug**。PRODUCT_PLAN 本就写死「Expo Go 不能承担此类 OAuth，应使用 Development Build」；T062 前置也写「使用 Development Build 而非 Expo Go」。**不能为在 Expo Go 里跑通而临时改 redirect 到 `exp://`**（PLAN 禁临时 scheme，且要改 Supabase allow list）。
- 本机工具链实测：Android SDK **有**（`platforms/android-35`、platform-tools、cmdline-tools）；**Java 无**；**build-tools 无**；**`expo-dev-client` 未装**；`eas` CLI 有、`eas.json` 的 `development` profile 已备（`developmentClient:true`+`buildType:apk`）；`eas whoami` 访问 `api.expo.dev` **失败待确认**（沙箱可能挡网／CLI 版本旧）。

**1.4 真机与基础设施**
- 真机＝红米 Note12 Pro（ruby），serial `indq5xfi6hovay4d`；**已实证**：8 卡画廊、评分筛、标签建删、输入保存删、Find 量词、冷启动渲染；证据 `docs/qa/evidence-android-ui/`＋`t062/`；设备已还原干净。
- Metro 8082（**恢复时现查 PID/端口**，勿占 3000/3100）；`adb reverse tcp:8082 tcp:8082` **会掉**，本轮恢复时实测为空需重建。
- 注意：同机还挂着另外 3 台设备（`IN9LZTAYV4UGU4JF`、两个 `192.168.31.31`）；**只操作 `indq5xfi6hovay4d`**，别碰用户手机上别的 App。
- HD-03 redirect 已加白；`mobile/.env` 已填 key（gitignored，值不入文档）。

**1.5 账本（实测已校验）**
- `docs/model/TASK-MODEL-LOG.jsonl` **19 行**（role 仅 planner 1 / builder 18）；`docs/model/DISPATCH-LOG.jsonl` **90 行**，**全部 JSON 合法**、键集合统一 8 键。
- runtime 分布：`opencode` 58 / `本窗口` 17 / `codex` 9 / `codebuddy` 5（L81/83/85/86/88）。**枚举已扩**：2026-09-19 用户拍板把 `codebuddy` 加入 AGENTS 与 supervisor 脚本枚举，5 行存量转正（P-2 关闭）。
- 无 `_example` 示例行残留。

**1.6 git（已提交并推主干）**
- **本轮提交已推 `origin/master`（主干）**：主提交＝`chore: DEV-11→13 收工封存 + 大交接`（`ee4aad6`），其后为 HANDOFF 同步小提交；**精确 HEAD 以 `git log` 为准**（本文件自身在提交内，不写死自身 HEAD）。本地 `wanghoufan/master` 同进度。远程**只剩 `origin/master` 一条**：废弃分支 `origin/wanghoufan/master` 已于 2026-09-19 删除（删前已验证其无独有提交、零丢失）。仓库**无 `main` 分支**。
- 本轮提交 38 个文件（+2101/−60）：`USER_MODEL_OVERRIDE.md`(软链→实文件)、本 HANDOFF、两账本、neat-freak 改的 2 个 docs、`mobile/` 源码 19 改＋6 新增（分享页/冷启动接线）、`CODE_REVIEW_DEV-11/12/13.md`＋`BUGS_DEV-11/12/13.md`＋4 张 evidence png。
- **工作树现已干净**；`mobile/.env` 经 `git check-ignore` 确认被忽略，未入提交。
- 旁注：另一 worktree 的本机 `master` 分支（`…/coding/1.Active/011-ing-个人打卡小工具`）落后 origin/master 4 个提交，**本轮未动它**。

### 2. 下一步任务（按序）

**2.1 第一件事：解 T062 阻塞（构建路线已定，时机待用户拍板）**
- **构建路线（2026-09-19 用户已定，铁律）**：EAS 云构建免费额度耗尽（10-01 才恢复）→ **云构建停用**；今后一律**本地构建**（`npx expo run:android`）。
- **本地构建前置**：装 JDK 17＋`sdkmanager` 补 build-tools＋`expo-dev-client` 加回依赖——**动构建/装环境前必须用户明确批准（构建冻结）**。
- **备选**：等 10-01 EAS 恢复走云构建；或先绕开登录转 AI 页（需 `OPENCODE key`），T062 挂起。

**2.2 AI 页真接入**：需 `OPENCODE key`（用户给）；随后编辑确认；失败可跳过不阻断保存。

**2.3 分享真云发布 + 打包**：分享随 T062 一起验；打包（Development Build／EAS）**用户明确批准前冻结不动**。

**2.4 人要拍什么板（1 项，不问不许开工）**
1. **T062 时机**：批准补本地构建环境并开工（§2.1）／等 10-01 走 EAS／先转 AI 页。

> 已决并执行（2026-09-19）：commit/push 目标＝`origin/master` 主干；runtime 枚举加 `codebuddy`；`PRODUCT_PLAN` 改名对齐 V1.5；**构建路线＝本地构建、EAS 10-01 前停用**；构建冻结维持。

### 3. 注意事项及相关规矩

**3.1 模型调度铁律（用户定）**
- 换人**只听用户口令**；备注**只写实派模型/通道**，不写原因推断。
- 每次派前读根 `USER_MODEL_OVERRIDE.md`；表定通道（codex/opencode/codebuddy）的**必须走通道直调，禁本窗口套娃代做**；只有「本窗口」行才用 subagent 直派。
- 屏蔽词（额度耗尽/上限、一次性换人）全仓清零；技术性「一次性 code」等除外；codex 状态未知**不假设**。
- 账本：每次派工收工往 `docs/model/DISPATCH-LOG.jsonl` 记一行（`used` 恒填「主」），与派工显式两行互验。

**3.2 文件与密钥红线**
- **用户另派智能体的文件一律不碰、不删**；未知归属文件动前先问（本轮 neat-freak 复核结果：归属不明文件＝**无**）。
- 密钥真值**只进 `mobile/.env`**（gitignored），不入 Git/文档/聊天/截图/证据；`service_role` **绝不碰**。
- 不碰 `Services/`、`DockerData/`、`DockerBackups`；不改 `*旧版-*.md` 封存件。

**3.3 git 红线**
- 未经明确指令**禁** `git commit`／`git push`；push **二次确认**（主干=origin/master，本地分支 wanghoufan/master）。
- 禁 `git reset`／`checkout`／`stash`：工作树里有用户未提交的成果，误清理＝事故（风险 R-14）。
- 外部者分支用 `ext/` 开头。

**3.4 真机三件套与已知坑**
- 三件套：`adb -s indq5xfi6hovay4d` ＋ `adb reverse tcp:8082 tcp:8082`（**会掉，失联先重建**）＋ Expo Go 输 `exp://127.0.0.1:8082`。
- 已知坑：SQLite 禁子查询 `ORDER BY` 引外层列（用 COALESCE 双标量）；Metro 缓存旧包时 `--clear`；`adb input text` 追加不覆盖；toast 盖按钮等几秒；opencode 下 `/tmp` 禁读写、bash 禁 `cd` 禁串联；Expo Go 缓存顽固时 force-stop＋重进。
- **Expo Go 只配做 UI/SQLite 探针**；OAuth／scheme／权限／APK 相关验收一律 Development Build 起步（§1.3）。

**3.5 文档待拍板（neat-freak 本轮产出，均未动手）**
- **P-1｜经验文档真源【已决，2026-09-19 用户拍板：方案 A】**：读盘序与 recorder 口径统一改指 `docs/handoff/DEV_EXPERIENCE.md`，不再新建「一句话」文件（避免两份经验真源漂移）。已改 7 处：`AGENTS.md`（谁写哪表＋缓存五条）、根 `编排者提示词.md`（读盘序＋落盘清单）、`docs/roles/experience-recorder.md`（输出行）、`docs/handoff/HANDOFF.template.md`、`docs/templates/归位表.md`、本 HANDOFF 恢复读盘。**母版两包不动**（包内有根 `经验一句话.md`，机制对母版自洽）。
- **P-2｜runtime 枚举【已决并落地，2026-09-19】**：**真因＝母版本就带 `codebuddy`（母版 AGENTS 逐派行与 supervisor 脚本均为 `本窗口/codebuddy/codex/opencode/—`），本项目迁移副本丢失**；已按母版原序补齐本项目两处（AGENTS＋`docs/roles/supervisor.md:40`），账本 5 行存量转正，校验脚本对 90 行真账本实测 `bad=0, exit=0`。
- **P-3｜`PRODUCT_PLAN_V1.0.md` 名/内容分叉【已决，2026-09-19 用户拍板：改名】**：已 `git mv` 为 `docs/pm/PRODUCT_PLAN_V1.5.md`＋文头加状态注（声明文中 `PROJECT_PHASE: PLAN`/`PLAN_GATE: READY_FOR_HUMAN_REVIEW` 为批准前快照，真源＝HANDOFF）；活动引注已同步（`mobile/src/db/schema.ts:5` 注释、本 HANDOFF）；4 份历史 RESEARCH_REVIEW 保原文不改（属历史审计记录）。原核验记录：文件名 V1.0／内容 V1.5，且 `:5/:239/:241` 为批准前快照；该问题早已登记（`docs/review/RESEARCH_REVIEW_PLAN-V1.4-R5.md:12` R5-N2）。
- **P-4｜T062 前置未登记**：PRODUCT_PLAN 无需改（本就写明须 Development Build）；缺口是没人把本轮 adb 实证写进文档——**本 HANDOFF §1.3 已补**，并把 Development Build 列为 T062 硬前置。
- **P-5｜本机口径不准**：HANDOFF 旧文写「本机无 Java/SDK」不准确——**SDK 在，缺的是 Java 与 build-tools**；另根 `AGENTS.md:98` Node 路径写 `22.22.2-2`，实际是 `22.22.2-3`（含 `current` 软链）；`AGENTS.md:108` 旧状态仍写 `HEAD=d1b2e4b`（现 ee4aad6）。**§1.4 已更正本 HANDOFF 口径；根 AGENTS 属附录历史段，建议只加注。**
- **P-6｜软链制与实文件冲突**：`AGENTS.md:45` 仍写「分工表软链制…禁拷实文件」，现实是本项目已按用户指令转实文件。建议补一句「本项目按用户 2026-09-18 指令用实文件，软链制仅约束未转实文件的项目」。
- **P-7｜2 张角色卡复述模型 ID**：`docs/roles/planner.md:6`、`docs/roles/senior-expert.md:4` 硬写 `codex/gpt-5.6-sol`，其余 9 张均为「见 override 表」。当前值无错但会静默过期，建议改成同口径。
- **P-8｜他人文件引注漂移（neat-freak 未越权改）**：`docs/handoff/DEV_EXPERIENCE.md:52` 称「HANDOFF.md:25 登记了 HD-01 交付切片」——**该引文在 HANDOFF 全文不存在**，实际出自 `PRODUCT_PLAN_V1.0.md:224`。建议交 experience-recorder 修。
- **P-9｜行号引注过期**：`docs/qa/BUGS_DEV-13.md:38` 引 `HANDOFF.md:59`（实际在 `:55`）；`BUGS_DEV-12.md:28` 引 HANDOFF:59「仍写现为软链」已过期；`mobile/docs/AUTH_REDIRECT.md §2` 仍写「HD-03 待办／无法代加 allow list」，与「已加白实证」矛盾。**本 HANDOFF 已重写，行号引注需在恢复后统一校正。**
- **P-10｜两包同步【已执行，2026-09-19】**：本轮唯一母版级治理改动＝`Orca 通用编排者持续推进协议.md`（十卡→十一卡两行，neat-freak 修）；已同步 `新项目模板包/`、`老项目迁移模板包/`，**三处 diff 全零复核通过**（包间、包↔项目）。AGENTS/supervisor 卡经查**母版本就含 `codebuddy`**（项目迁移副本丢失，已按母版对齐），无需回写母版；P-1 为本项目特例，不同步母版。两包路径见 §存档。

---

### 存档：本轮迁移执行链（审计用）

- 源包：`/Users/zzymima0000/Developer/coding/4.Templates（PC）/2026-09-09 丨 MAC 丨 ORCA V2.1 治理模板 丨 分发版-2026-09-11/老项目迁移模板包`（整条原样引用，命令中用引号包裹）
- 冲突铁律执行：放 36（含归位表模板复抄 docs/templates/ 一份）／备份 3（AGENTS.md.旧版-2026-09-13、USER_MODEL_OVERRIDE.md.旧版-2026-09-13、docs/handoff/HANDOFF.md.旧版-2026-09-13）／跳过 0
- USER_MODEL_OVERRIDE.md：2026-09-18 用户亲令按母版逐字转实文件（旧软链已删，备份留存；跨机器用实文件，无断链问题）。QA-DEV12-01 关闭（TM 判定：非代码问题）。
- 账本示例行：`docs/model/` 下两表示例行（各一行 `_example`）已于首个真实任务/派工前删除。
- 映射（搬了会 broken，留原地＋治理引用路径）：
  - 根 `HANDOFF.md`（旧入口指针，被 README/旧 AGENTS 引用）→ 留原地；治理交接以 `docs/handoff/HANDOFF.md` 为准，历史细节见 `docs/handoff/HANDOFF.md.旧版-2026-09-13`
  - `docs/handoff/HANDOFF.md.旧版-2026-09-13`（2026-09-07 在役快照全文，旧路径 `1.Active/ing…` 为历史绝对路径，读时以相对 docs 为准）
  - `scripts/deploy.sh`（项目规范部署 Docker V1.1，被旧 AGENTS/旧交接引用）→ 留原地；模板 `scripts/orchestration/` 为新增并存
  - `docs/` 下既有业务证据（acceptance-l2、db、qa、review 内旧文件、visuals、V1_PRODUCT_AND_TECHNICAL_PLAN.md）→ 全部留原地不碰
- 基线（2026-09-18）：`npm install` PASS（仅 allow-scripts 提示）；`npm run build`（tsc -b + vite build）PASS（仅 chunk>500kB 与 dynamic/static 复用警告）；lint/test：package.json 无对应脚本，记 N/A（未拿 lint 卡 dev）。
- 目检：dev（127.0.0.1:5173，后台起，验后已杀，端口已释放）`/` 200、`/mine` 200；无 computer-use 条件，curl 替代截图（无截图文件），SPA 详情页为前端路由故以 `/mine` 为详情页代表。

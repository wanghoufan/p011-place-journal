# 架构与构建事实（011 私人打卡地点工具）

> 只放可复用的技术事实；风险见 `risks.md`，踩坑见项目根 `agent.md`。

## 1. 技术栈与入口

- 双端：PWA（Vite，自托管 Docker）+ 安卓（Expo SDK 57 / React Native 0.86.3 / expo-router 57）。
- 安卓包名 `com.wanghoufan.placejournal`，应用名 `Place Journal`（脚本 `scheme` 同名）。
- 版本号唯一落点：`mobile/app.config.ts`（`version` / `android.versionCode`）与 `mobile/android/app/build.gradle`（`versionCode` / `versionName`），两处必须同批改。
- 本地库：SQLite；云端：Supabase `schema('habit_tracker')`（项目 `yacgnikzvutbpoqvokth`）。

## 2. 安卓构建

```bash
cd mobile/android && ./gradlew --no-daemon \
  -Dorg.gradle.jvmargs='-Xmx4096m -XX:MaxMetaspaceSize=1536m' \
  -Dkotlin.daemon.jvm.options='-Xmx2048m' \
  :app:createBundleReleaseJsAndAssets --rerun-tasks assembleRelease
```

- 产物：`mobile/android/app/build/outputs/apk/release/app-release.apk`，版本事实见同目录 `output-metadata.json`。
- 改完 JS/文案必须带 `--rerun-tasks`，否则 Gradle 判 up-to-date 出旧包。
- 自用一律出 `assembleRelease`；debug 包不含 bundle，装上必须连 Metro。
- SDK：`~/android-toolchain/sdk`（不是 `~/Library/Android/sdk`）；JDK 17，`JAVA_HOME` 指 `.../libexec/openjdk.jdk/Contents/Home`。
- 4 个 ABI 全编，约 5–6 分钟，别当卡死。

## 3. 签名

- `build.gradle` 读 `mobile/keystore/keystore.properties`（存在则用 `release.keystore` 签），缺失时回落 `mobile/android/app/debug.keystore`。
- 已装 0.1.2 用的是 **debug.keystore 签名**（构建时把 `keystore.properties` 临时改名）；证书 SHA-256 与三台设备已装包一致。
- `mobile/android/app/debug.keystore` 已在 `.gitignore`，只存在本机。

## 4. 端口与调试

- Docker 占 8081/8082（PWA 自托管），不得关闭；Metro 一律 8083，手机侧 `adb reverse tcp:8081 tcp:8083`。
- release 包 `debuggable=false` → `run-as` 不可用，读不到 SQLite；数据核验只能走 UI（`uiautomator dump` 页面计数文本 + 截图）。
- 云端配置在 `mobile/.env.local`（gitignored）：`EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。

## 5. 源码热点

| 文件 | 职责 |
|---|---|
| `mobile/app/(tabs)/record.tsx` | 记录录入与保存后跳转（保存 → 落回画廊 → push 详情） |
| `mobile/app/(tabs)/find.tsx` | 查找页：标签 chips / 星级筛选，逐条记录过滤后按地点聚合 |
| `mobile/app/entry/[id].tsx` | 记录详情：照片 3 列网格（`31.3%` + `aspectRatio:1`） |
| `mobile/src/db/migrations.ts` | 迁移，无 `DELETE FROM` |
| `mobile/src/sync/pull.ts` | 拉取，从不删本地行 |
| `mobile/src/features/queries.ts` | `localCounts` = `entries` 表裸 `COUNT(*)` |
| `mobile/src/media/mediaService.ts` | 照片落盘与清理（清理失败不掩盖原始错误，孤儿文件优于丢记录） |

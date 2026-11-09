# 风险清单（011 私人打卡地点工具）

> 每条：现象 → 触发条件 → 代价 → 规避方式。事实类内容见 `architecture-facts.md`。

| # | 风险 | 触发条件 | 代价 | 规避 |
|---|---|---|---|---|
| R1 | 签名漂移导致覆盖安装失败 | `mobile/keystore/keystore.properties` 存在时直接重建 → release 包走 `release.keystore`，与已装 debug 签名的 0.1.2 不同 | `install -r` 报 `UPDATE_INCOMPATIBLE`，只能卸载＝丢本地数据 | 出包前后 `apksigner verify --print-certs` 比对；需同签名时临时改名 `keystore.properties` |
| R2 | 签名不可复现 | 换机或清理本机文件后 `debug.keystore` 已 gitignore 且只存在本机 | 无法再出同签名包，只能卸载重装 | 备份 `mobile/android/app/debug.keystore` 与 `mobile/keystore/` 到项目外安全位置 |
| R3 | OPPO「记录」9→8 未解释 | 0.1.2 覆盖安装 + 首次启动自动同步后 | 若为用户真实数据丢失，不可逆 | 已排除 pull 删行 / 迁移 DELETE / 整包重装；待用户确认，确认前不动同步与清理逻辑 |
| R4 | `tags_dim_owner_fk` 外键失败 | 云端 `tag_dimensions`/`tags` 被清而本地仍留标签 | 标签与条目推送失败，冲突堆积（Note 12 Pro 曾 31 条） | 根因未单点定死；动同步前先按列为空 / dim_id 不匹配两候选分别取证 |
| R5 | 数据核验手段受限 | release 包不可 `run-as`，只能读 UI 计数 | 计数口径变化会被误判成数据丢失或反之 | 覆盖安装前先记录基线计数；关键记录用详情页照片数/日期交叉核对 |
| R6 | 网络互斥 | 手机开 VPN 连不上 Supabase，关 VPN 连不上 Google | OAuth 与同步间歇失败，易误判为产品缺陷 | 重试；不擅自改用户代理配置 |
| R7 | 工作区未提交内容混杂 | 代码修复与历史文档脱敏改动同时挂在工作区 | 误 `checkout` / `stash` 会丢成果 | 只按文件名提交；提交前 `git status --short` 逐项确认 |

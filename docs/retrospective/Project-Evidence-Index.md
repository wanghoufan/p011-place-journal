# 011 个人打卡小工具（双端私人地点手账）｜项目证据索引（V1.0）

> 复盘日期 2026-10-30；Git HEAD `4f29e4b`；106 次提交；tag `v0.1.0`=`629127f`。证据类型：D=直接证据，I=推断。

## 一、身份与需求证据（最关键）

| # | 证据 | 类型 | 用途 |
|---|---|---|---|
| I1 | `grep 'streak\|补卡\|连续打卡\|打卡日历\|热力图'` 与 `reminder\|notification\|提醒` 在 src/mobile/api 全仓零命中 | D | 证明项目不是习惯打卡 |
| I2 | `docs/V1_PRODUCT_AND_TECHNICAL_PLAN.md:43` 定义「地点 Place＋到访 Entry」 | D | 真实产品定义 |
| I3 | `README.md:1`「我的地点·私人打卡手账」 | D | 名称口径之一 |
| I4 | 工作区名「个人打卡小工具」、Schema 名 `habit_tracker` | D | 四套名字并存的误导源 |
| I5 | `.workbuddy/memory/2026-09-01.md` | D | 真实 Day 1 记录 |
| I6 | 首提交 `aaa178f`（09-03）全量基线 | D | 首提交非需求起点 |

## 二、Git 证据

| # | 证据 | 类型 | 用途 |
|---|---|---|---|
| G1 | 按日提交数 6/35/9/12；09-03～09-06 共 62 个（58.5%） | D | 返工集中度 |
| G2 | `c2c6c80` 腾讯 ASR 整条拆除；10 文件 −256 行 | D | ASR 沉没成本 |
| G3 | `b227ddc` 封面 OCR 当日上线当日下线 | D | 外部依赖超时 |
| G4 | 10-01 删除 Playground，10-02 恢复；`7a1ebd2` 合并分叉 | D | 代码丢失事故 |
| G5 | `ac37e71`（「忽略有两条」＋54 文件入库） | D | 双重 ignore 解除 |
| G6 | 删除链路 hash 实为 `9f0eeb7`（B V1.0 误写 `9f8e22f`） | D | 交叉纠错 |
| G7 | master 落后 `origin/master` 10 个提交 | D | 交付状态 |
| G8 | 106 次提交 | D | 规模 |

## 三、代码与配置证据

| # | 证据 | 类型 | 用途 |
|---|---|---|---|
| C1 | `sync.ts`（764 行） | D | 同步实现规模（A 校正行数） |
| C2 | Supabase `habit_tracker` 共用（Web 与 Android） | D | 双端共用 |
| C3 | 双重 gitignore（`.git/info/exclude`＋`mobile/.gitignore`） | D | 代码未入库根因 |
| C4 | 删除不复活／回写不覆盖／冲突裁决语义 | D | 同步语义 |
| C5 | AI 确认位、可撤销私密快照分享 | D | 交互设计 |
| C6 | tab 图标四版本全缺；PWA 图标晚 14 天 | D | 验收资产缺失 |

## 四、文档证据

| # | 证据 | 类型 | 用途 |
|---|---|---|---|
| D1 | `HANDOFF.md` 实为 1042 行（A V1.0 记 587+，已修） | D | 文档规模 |
| D2 | HANDOFF 587+→1042 行、869→688 去重路径 | D | A 自纠项 |
| D3 | 四态→五态（工作树/已提交/已部署/用户认可/双端） | D | 版本口径 |
| D4 | L3 验收：Android 分享曾 FAIL（A V1.0 记「可用」已修） | D | 验收记录 |
| D5 | `v0.1.0` 未做真机安装烟雾测试 | D | 已知未验项 |

## 五、证据缺口（未证实）

- 09-01 用户口头需求原话不可复原。
- 密钥是否仓外备份无记录（当前真实风险）。
- tag `v0.1.0` 指向 `629127f`，无法证明 APK 由哪个 commit 构建。
- 「返工 19% vs 50%」两口径未逐条映射。
- 线上是否等于 HEAD `4f29e4b` 未实测。
- 双机 ROM 版本、ASR「2 天」、双端「省 1–2 周」均为未证实推断。
- 各 stash 内容未逐一核验。

## 六、复核命令

```bash
git log --oneline --reverse
git rev-list --count master..origin/master
git tag --list --format='%(refname:short) %(objectname:short)'
git show --stat c2c6c80 b227ddc ac37e71
grep -rn "streak\|补卡\|热力图\|提醒" src mobile 2>/dev/null | head
wc -l docs/handoff/HANDOFF.md
```

## 七、双路产出对应

| 文件 | 说明 |
|---|---|
| `A-Day1-Reconstruction-V1.0.md` | A 路首轮独立基线（46.3KB） |
| `B-Gap-RootCause-V1.0.md` | B 路首轮独立基线（42.8KB） |
| `A-Day1-Reconstruction-V1.1.md` | A 路交叉修订（14 组判定、8 处自纠、§13 素材包 888 字） |
| `B-Gap-RootCause-V1.1.md` | B 路交叉修订（D1–D12、§5 摘要 640 字） |
| `Project-Lessons-V1.0.md` | 主开发者终审收敛（含项目身份更正） |

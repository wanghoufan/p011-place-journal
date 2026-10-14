# Code Review 丨 记录页标签分组选择（2026-10-14）

> 口径：**单智能体自审**（开发智能体自己检查，非独立 Reviewer 派工），故不声明「独立审查通过」。

## 变更清单

| 文件 | 变更 | 说明 |
|---|---|---|
| `mobile/src/features/form.ts` | 新增 `leafTagsByGroup` 纯函数 | 按维度分组返回叶子标签，保序、空组不返回 |
| `mobile/src/features/__tests__/format.test.ts` | ＋1 用例 | 覆盖分组／只留叶子／跳过空组／保序 |
| `mobile/src/components/ui.tsx` | 新增 `GroupedTagPicker` 组件＋样式 | 三处选择界面共用；组标题＝维度名＋组内标签数 |
| `mobile/app/(tabs)/record.tsx` | 标签区改用 `GroupedTagPicker` | 去掉扁平 `chipWrap` 与 `leafTags` 调用 |
| `mobile/app/entry/[id].tsx` | 同上 | |
| `mobile/app/ai-confirm.tsx` | 同上 | |
| `src/pages/EntryDetail.tsx` | 标签选择按维度分组 | 复用既有 `mergeDimensionGroups` |
| `src/pages/AiConfirm.tsx` | 标签选择按维度分组 | 同上，仍只列场景/类型/人群/地区四类 |

## 自查要点

- **只读展示层**：不写库、不改 outbox/同步协议、不动 schema；勾选仍走原 `toggleTagId` / `setTagIds`，
  标签集合与保存路径零改动。
- **分组口径一致**：移动端 `GroupedTagPicker` 直接消费 `listTagsGrouped` 的顺序；网页端用
  `mergeDimensionGroups`，与标签管理页（TagsPage）同一归并口径，故「分组与维度排布」两端一致。
- **叶子语义保留**：有子标签的父标签仍只作容器、不可勾选（`leafTags` / `leafTagsByGroup` 同一父集判定）。
- **组件复用**：三处选择界面原本各自复制同一段 chip 渲染，本次收敛到单一组件，避免三处再分叉。
- **不改写历史**：不动既有账本行；本次新增行独立追加。
- **无越权**：未 commit / push（未获授权）；未碰 secrets；未做不可逆删除；真机安装走 `adb install -r`（保数据）。

## 风险与残余

- 网页端仅类型检查 ＋ 构建 ＋ 逻辑同构，**未做真实数据运行时验收**（本机浏览器库无对应样本，改动为同一分组口径）。
- AiConfirm 网页端仍按原四类 kind 过滤（场景/类型/人群/地区），本次只改「展示形态」，未扩大标签范围。
- 分组标题只显示维度名与数量，不带 kind 标签——系统维度名本身即 kind 名（场景/地区/类型/人群），避免「类型 · 类型」重复。

## 结论

变更集中于展示层、可逆、未触数据与同步；移动端三大选择界面已真机复验通过（分组顺序正确、跨组勾选正常、
复原正常）。自审通过，交用户签收。

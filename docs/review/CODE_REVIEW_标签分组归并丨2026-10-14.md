# Code Review 丨 标签分组归并（2026-10-14）

> 口径：**单智能体自审**（开发智能体自己检查，非独立 Reviewer 派工），故不声明「独立审查通过」。

## 变更清单

| 文件 | 变更 | 说明 |
|---|---|---|
| `mobile/src/features/queries.ts` | `listTagsGrouped` 按 kind 归并 | 唯一取数口，覆盖移动端全部标签展示面 |
| `mobile/src/features/__tests__/queries.test.ts` | ＋2 用例 | 同 kind 归并 / custom 不归并 |
| `src/lib/search.ts` | 新增 `mergeDimensionGroups` 纯函数 | 网页端共用 |
| `src/pages/TagsPage.tsx` | 改用归并分组渲染 | 去掉内联实现 |
| `src/pages/Find.tsx` | 标签筛选按归并分组 | |
| `src/pages/EntryDetail.tsx` | 「归属维度」选择按归并分组 | |
| `src/pages/Gallery.tsx` | 场景筛选涵盖全部 scene 维度 | 修原「只取首个 scene 维度」漏标签 |

## 自查要点

- **只读展示层**：不写库、不改 outbox/同步协议、不动 schema；`listTagsGrouped` 仍返回原 `TagGroup` 形状，
  调用方只需按组渲染，无接口破坏。
- **归并键**：系统 kind 用 `kind:<kind>`，custom 用 `id:<id>` —— custom 允许同名多条，不会被误并。
- **代表维度**：取组内首个（按 sort/name 序），「＋ 标签 / ＋ 子标签」落到代表维度 id，行为与既往一致。
- **不改写历史**：不动既有账本行；本次新增行独立追加。
- **无越权**：未 commit / push（未获授权）；未碰 secrets；未做不可逆删除。

## 风险与残余

- 数据层重复维度行仍在（不下压），属已定案的「暂不修」范围；本改动只消除其**可见**副作用。
- 网页端仅类型检查 + 逻辑同构，**未做真实数据运行时验收**（本机无重复维度样本）。
- 归并后同一系统维度的标签在视觉上合并，若日后有按「维度 id」区分的产品语义，需复核（当前无此语义）。

## 结论

变更范围小、集中、可逆，未触数据与同步；移动端已真机复验通过。自审通过，交用户签收。

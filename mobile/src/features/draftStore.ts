// 记录草稿的本机持久化（L3-19）。
//
// 复用既有 `meta` 键值表（不新增表/字段，`PRODUCTION_DB_MIGRATION = 0` 不受影响）：
// 草稿存整份表单快照（含已选照片的持久路径），进程被杀 / Activity 回收后重启可恢复。
// 照片本体在 `media/_draft/` 下（见 `media/draftMedia.ts`），这里只存指向它们的路径。
//
// 只放纯逻辑与常量，不 import Expo，便于单测；UI 侧（`app/(tabs)/record.tsx`）直接取用。

import type { SqlDatabase } from '../db/database'
import { deleteMeta, getMeta, setMeta } from '../sync/meta'
import type { RecordDraft } from './draft'

/** meta 表键名（记录页草稿快照）。 */
export const RECORD_DRAFT_META_KEY = 'record_draft'

function isPickedAsset(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  const asset = value as { uri?: unknown; width?: unknown; height?: unknown }
  return typeof asset.uri === 'string' && asset.uri.length > 0
}

/**
 * 读回草稿快照；结构不合法（老版本/手改库）一律当没有草稿，不让坏数据挡住用户记录。
 */
export function loadPersistedDraft(db: SqlDatabase): RecordDraft | null {
  const raw = getMeta<RecordDraft>(db, RECORD_DRAFT_META_KEY)
  if (!raw || typeof raw !== 'object') return null
  if (!Array.isArray(raw.assets) || !raw.assets.every(isPickedAsset)) return null
  if (typeof raw.visitDate !== 'string' || !Array.isArray(raw.tagIds)) return null
  return { ...raw, tagIds: raw.tagIds.filter((id): id is string => typeof id === 'string') }
}

/** 写入草稿快照（每次表单/照片变更后调用，覆盖写）。 */
export function savePersistedDraft(db: SqlDatabase, draft: RecordDraft): void {
  setMeta(db, RECORD_DRAFT_META_KEY, draft)
}

/** 保存成功 / 放弃后清草稿。 */
export function clearPersistedDraft(db: SqlDatabase): void {
  deleteMeta(db, RECORD_DRAFT_META_KEY)
}
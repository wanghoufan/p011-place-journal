// P1·L3-64 分享发布状态单测：本地快照 → 公开链接当前能否被访客打开。
// 判定走真 SQLite 的 outbox（push 成功即删行），云端配置从 env 参数注入，不依赖进程环境。

import { applyConnectionPragmas, type SqlDatabase } from '../../db/database'
import { runMigrations } from '../../db/migrations'
import { insertOutboxOp } from '../../sync/outbox'
import { createNodeSqliteDatabase } from '../../test/nodeSqliteAdapter'
import {
  SHARE_PUBLICATION_HINT,
  isShareCloudConfigured,
  sharePublicationState,
  type ShareCloudEnv,
} from '../sharePublication'

const CONFIGURED: ShareCloudEnv = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sbpk_test_123',
}
const SNAPSHOT_ID = 'snap-0001'

function setup(): SqlDatabase {
  const db = createNodeSqliteDatabase()
  applyConnectionPragmas(db)
  runMigrations(db)
  return db
}

function enqueueCreateShare(db: SqlDatabase): void {
  insertOutboxOp(db, { kind: 'create_share', entityId: SNAPSHOT_ID })
}

function deleteOp(db: SqlDatabase, kind: string): void {
  db.runSync('DELETE FROM outbox WHERE kind = ? AND entity_id = ?', kind, SNAPSHOT_ID)
}

describe('isShareCloudConfigured', () => {
  it('URL 与 key 都非空才算已配置，缺一即未配置', () => {
    expect(isShareCloudConfigured(CONFIGURED)).toBe(true)
    expect(isShareCloudConfigured({})).toBe(false)
    expect(isShareCloudConfigured({ EXPO_PUBLIC_SUPABASE_URL: CONFIGURED.EXPO_PUBLIC_SUPABASE_URL })).toBe(false)
    expect(isShareCloudConfigured({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: CONFIGURED.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY })).toBe(
      false,
    )
    expect(isShareCloudConfigured({ ...CONFIGURED, EXPO_PUBLIC_SUPABASE_URL: '   ' })).toBe(false)
  })
})

describe('sharePublicationState', () => {
  it('云端未配置 → cloud_unconfigured（即使 create_share 还在队列里）', () => {
    const db = setup()
    enqueueCreateShare(db)
    expect(sharePublicationState(db, SNAPSHOT_ID, {})).toBe('cloud_unconfigured')
  })

  it('云端已配置但 create_share 未出队 → pending_push', () => {
    const db = setup()
    enqueueCreateShare(db)
    expect(sharePublicationState(db, SNAPSHOT_ID, CONFIGURED)).toBe('pending_push')
  })

  it('create_share 已出队（push 成功即删行）→ published', () => {
    const db = setup()
    enqueueCreateShare(db)
    deleteOp(db, 'create_share')
    expect(sharePublicationState(db, SNAPSHOT_ID, CONFIGURED)).toBe('published')
  })

  it('只认 create_share：队列里只有 revoke_share 不算未发布', () => {
    const db = setup()
    insertOutboxOp(db, { kind: 'revoke_share', entityId: SNAPSHOT_ID })
    expect(sharePublicationState(db, SNAPSHOT_ID, CONFIGURED)).toBe('published')
  })

  it('认 entity_id：别的快照还在队列不影响本快照判定', () => {
    const db = setup()
    insertOutboxOp(db, { kind: 'create_share', entityId: 'snap-other' })
    expect(sharePublicationState(db, SNAPSHOT_ID, CONFIGURED)).toBe('published')
  })
})

describe('SHARE_PUBLICATION_HINT 文案', () => {
  it('未发布两种态都给明确提示，已发布为空串（不打扰）', () => {
    expect(SHARE_PUBLICATION_HINT.cloud_unconfigured).toContain('未配置云端同步')
    expect(SHARE_PUBLICATION_HINT.pending_push).toContain('同步')
    expect(SHARE_PUBLICATION_HINT.published).toBe('')
    expect(SHARE_PUBLICATION_HINT.cloud_unconfigured).not.toBe(SHARE_PUBLICATION_HINT.pending_push)
  })
})

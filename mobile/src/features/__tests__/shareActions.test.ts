// P1·L3-64 分享动作单测：ShareSheet 收到的 message 含公开 URL 且不含任何私密字段；
// 已撤销快照在面板弹出前被拦。URL 构造与白名单过滤全部真实执行（快照来自真 SQLite +
// 真实 createEntryShare），只 mock 原生边界：react-native Share 与 expo-clipboard。
// 注意：不能整模块替换 react-native——jest-expo 的 setup 会 requireActual
// expo-modules-core（它要 react-native 的 Platform），只 spy Share.share 即可。

import * as Clipboard from 'expo-clipboard'
import { Share } from 'react-native'

import { applyConnectionPragmas, type SqlDatabase } from '../../db/database'
import { runMigrations } from '../../db/migrations'
import { createRepository, type Repository } from '../../db/repository'
import { getShareSnapshotBySlug } from '../queries'
import { copyPublicShareUrl, openSystemShareSheet } from '../shareActions'
import { createEntryShare, revokeShare } from '../shares'
import { createNodeSqliteDatabase } from '../../test/nodeSqliteAdapter'

// 只 mock 原生边界；jest 会把 jest.mock 提升到 import 之前执行。
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }))

const shareMock = jest.spyOn(Share, 'share')
const copyMock = jest.mocked(Clipboard.setStringAsync)

const SLUG = 'shareslug123456789012'
const PUBLIC_URL = `https://place-journal-xi.vercel.app/s/p/${SLUG}`

/** 私密字段：任何一条进 message/URL 都算泄漏。 */
const SECRETS = ['只有我自己知道的感受', '私密转写内容', '20.0458', '110.2216', 'file:///']

function setup(): { db: SqlDatabase; repo: Repository } {
  const db = createNodeSqliteDatabase()
  applyConnectionPragmas(db)
  runMigrations(db)
  return { db, repo: createRepository(db) }
}

/** 带私密感受/转写/精确坐标/本机媒体路径的记录 + 地点。 */
function seedEntry(db: SqlDatabase, repo: Repository): void {
  repo.saveCoreEntity('places', {
    id: 'p1',
    name: '西海岸日落咖啡',
    area: '海口 · 西海岸',
    lat: 20.0458,
    lng: 110.2216,
    coord_precision: 'exact',
    is_private: 0,
    demo: 0,
  })
  repo.saveCoreEntity('entries', {
    id: 'e1',
    place_id: 'p1',
    visit_date: '2026-10-13',
    rating: 5,
    budget: 50,
    transcript: '私密转写内容',
    note_private: '只有我自己知道的感受',
    note_public: '海风和落日都很棒',
    summary: '值得再去一次',
    cover_media_id: 'm1',
    is_private: 0,
    demo: 0,
  })
  repo.upsert('media', {
    id: 'm1',
    entry_id: 'e1',
    place_id: 'p1',
    local_display_path: 'file:///documents/e1-display.jpg',
    local_thumb_path: 'file:///documents/e1-thumb.jpg',
    sort_order: 0,
    sync_status: 'local',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  shareMock.mockResolvedValue({ action: 'sharedAction' })
  copyMock.mockResolvedValue(true)
})

describe('openSystemShareSheet', () => {
  it('面板 message＝白名单标题 + 公开 URL，且不含私密感受/转写/精确坐标/媒体路径', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    const snapshot = createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })

    const result = await openSystemShareSheet(snapshot)

    expect(result).toEqual({ outcome: 'shared', url: PUBLIC_URL })
    expect(shareMock).toHaveBeenCalledTimes(1)

    const content = shareMock.mock.calls[0][0]
    expect(content.message).toBe(`西海岸日落咖啡\n${PUBLIC_URL}`)
    expect(content.message).toContain(PUBLIC_URL)
    expect(content.url).toBe(PUBLIC_URL)
    for (const secret of SECRETS) {
      expect(content.message).not.toContain(secret)
      expect(result.url).not.toContain(secret)
    }
    // URL 只有 域名 + /s/p/ + slug，不拼任何记录内容。
    expect(result.url).toBe('https://place-journal-xi.vercel.app/s/p/shareslug123456789012')
  })

  it('用户取消面板 → dismissed（不算失败，且只发过一次面板调用）', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    const snapshot = createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })
    shareMock.mockResolvedValue({ action: 'dismissedAction' })

    const result = await openSystemShareSheet(snapshot)

    expect(result.outcome).toBe('dismissed')
    expect(result.url).toBe(PUBLIC_URL)
    expect(shareMock).toHaveBeenCalledTimes(1)
  })

  it('已撤销快照：面板不弹（Share.share 零调用），返回明确失败原因与空 URL', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })
    revokeShare(db, repo, { slug: SLUG })
    // UI 拿到的是库里读回的快照（status='revoked'），不是创建时的旧对象。
    const revoked = getShareSnapshotBySlug(db, SLUG)!.snapshot
    expect(revoked.status).toBe('revoked')

    const result = await openSystemShareSheet(revoked)

    expect(result.outcome).toBe('failed')
    expect(result.url).toBe('')
    expect(result.error).toContain('分享已撤销')
    expect(shareMock).not.toHaveBeenCalled()
  })

  it('Share.share 抛错 → failed 并带上已构造的 URL，不吞错误', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    const snapshot = createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })
    shareMock.mockRejectedValueOnce(new Error('chooser unavailable'))

    const result = await openSystemShareSheet(snapshot)

    expect(result.outcome).toBe('failed')
    expect(result.error).toBe('chooser unavailable')
    expect(result.url).toBe(PUBLIC_URL)
  })
})

describe('copyPublicShareUrl', () => {
  it('剪贴板拿到与面板同一条公开 URL', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    const snapshot = createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })

    const result = await copyPublicShareUrl(snapshot)

    expect(result).toEqual({ outcome: 'copied', url: PUBLIC_URL })
    expect(copyMock).toHaveBeenCalledTimes(1)
    expect(copyMock).toHaveBeenCalledWith(PUBLIC_URL)
  })

  it('已撤销快照不写剪贴板', async () => {
    const { db, repo } = setup()
    seedEntry(db, repo)
    createEntryShare(db, repo, { entryId: 'e1', slug: SLUG })
    revokeShare(db, repo, { slug: SLUG })
    const revoked = getShareSnapshotBySlug(db, SLUG)!.snapshot

    const result = await copyPublicShareUrl(revoked)

    expect(result.outcome).toBe('failed')
    expect(result.error).toContain('分享已撤销')
    expect(copyMock).not.toHaveBeenCalled()
  })
})

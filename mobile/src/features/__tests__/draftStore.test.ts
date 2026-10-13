// 记录草稿的本机持久化（L3-19）：照片选中即落盘 + 草稿快照落既有 `meta` 表，
// 进程被杀（模拟：换一个全新 SQLite 连接）后仍能取到图，且不新增任何表/字段。

import { createNodeSqliteDatabase } from '../../test/nodeSqliteAdapter'
import { applyConnectionPragmas, type SqlDatabase } from '../../db/database'
import { runMigrations } from '../../db/migrations'
import { clearPersistedDraft, loadPersistedDraft, RECORD_DRAFT_META_KEY, savePersistedDraft } from '../draftStore'
import type { RecordDraft } from '../draft'
import { stageDraftAssets } from '../../media/draftMedia'
import type { MediaFileSystem } from '../../media/localFiles'
import type { ImageProcessor } from '../../media/processImage'

/** 内存文件系统替身（只替原生边界）：跨「重启」共用同一份，模拟 App documents 不被清空。 */
class FakeFileSystem implements MediaFileSystem {
  files = new Map<string, number>()
  documentDirectoryUri() {
    return 'file:///documents/'
  }
  ensureDirectory() {}
  copy(sourceUri: string, destinationUri: string) {
    this.files.set(destinationUri, sourceUri.includes('thumb') ? 100 : 1000)
  }
  writeBytes(uri: string, bytes: Uint8Array) {
    this.files.set(uri, bytes.length)
  }
  size(uri: string) {
    return this.files.get(uri) ?? 0
  }
  remove(uri: string) {
    this.files.delete(uri)
  }
  exists(uri: string) {
    return this.files.has(uri)
  }
}

const fakeImages: ImageProcessor = {
  async process(sourceUri) {
    return {
      displayUri: `cache/display-${sourceUri}.jpg`,
      thumbUri: `cache/thumb-${sourceUri}.jpg`,
      width: 1200,
      height: 900,
    }
  },
}

const fs = new FakeFileSystem()

function draftMediaDeps() {
  let cursor = 0
  return { fs, images: fakeImages, newId: () => `d${++cursor}` }
}

const PICKED = [
  { uri: 'content://media/external/images/media/1', width: 4000, height: 3000 },
  { uri: 'content://media/external/images/media/2', width: 4000, height: 3000 },
]

/**
 * 打开该用例的库文件：每次调用都是一条全新连接，等价于 App 重启后重新打开同一个库。
 * 库文件落在 node_modules 下（目录必定存在，且随安装目录一起丢弃，不进仓库）。
 */
function opener(caseIndex: number) {
  const opened: SqlDatabase[] = []
  const open = () => {
    const db = createNodeSqliteDatabase(`node_modules/pj-draft-${caseIndex}.db`)
    applyConnectionPragmas(db)
    runMigrations(db)
    opened.push(db)
    return db
  }
  open.closeAll = () => {
    for (const db of opened.splice(0)) db.close?.()
  }
  return open
}

describe('记录草稿持久化（L3-19）', () => {
  it('选图落盘 + 草稿快照 → 重启后仍能取到这两张图（顺序、路径、文件都在）', async () => {
    const open = opener(1)

    // 第一次会话：选 2 张 → 落盘 → 存草稿（内存草稿随后随进程一起消失）。
    const staged = await stageDraftAssets(draftMediaDeps(), PICKED)
    const draft: RecordDraft = {
      assets: staged,
      placeId: 'p1',
      visitDate: '2026-09-20',
      notePrivate: '很安静',
      tagIds: ['t1'],
    }
    savePersistedDraft(open(), draft)

    // 进程被杀：全新连接（内存草稿全部丢失，只剩库文件 + documents 目录）。
    const recovered = loadPersistedDraft(open())

    expect(recovered).not.toBeNull()
    expect(recovered!.assets).toHaveLength(2)
    expect(recovered!.assets.map((a) => a.uri)).toEqual(staged.map((a) => a.uri))
    // 恢复出来的不是 content:// 临时 URI，且指向的文件真实存在 → 重启后还能显示、还能保存。
    for (const asset of recovered!.assets) {
      expect(asset.uri.startsWith('content://')).toBe(false)
      expect(fs.exists(asset.uri)).toBe(true)
    }
    // 表单字段一并恢复（照片顺序不变，不串图）。
    expect(recovered!.placeId).toBe('p1')
    expect(recovered!.notePrivate).toBe('很安静')
    expect(recovered!.tagIds).toEqual(['t1'])
    open.closeAll()
  })

  it('保存成功后清草稿：重启不再带出上一条记录的图', () => {
    const open = opener(2)
    savePersistedDraft(open(), { assets: [], visitDate: '2026-09-20', tagIds: [] })
    clearPersistedDraft(open())

    expect(loadPersistedDraft(open())).toBeNull()
    open.closeAll()
  })

  it('后写覆盖前写：连续两次记录只恢复最新那份草稿', () => {
    const open = opener(3)
    savePersistedDraft(open(), {
      assets: [{ uri: 'file:///documents/a.jpg', width: 1, height: 1 }],
      visitDate: '2026-09-20',
      tagIds: [],
      notePrivate: '第一次',
    })
    savePersistedDraft(open(), {
      assets: [{ uri: 'file:///documents/b.jpg', width: 1, height: 1 }],
      visitDate: '2026-09-20',
      tagIds: [],
      notePrivate: '第二次',
    })

    const recovered = loadPersistedDraft(open())
    expect(recovered?.notePrivate).toBe('第二次')
    expect(recovered?.assets.map((a) => a.uri)).toEqual(['file:///documents/b.jpg'])
    open.closeAll()
  })

  it('快照结构非法（老版本/手改库）时当没有草稿，不让坏数据挡住用户记录', () => {
    const open = opener(4)
    savePersistedDraft(open(), { assets: [{ uri: '', width: 1, height: 1 }] } as unknown as RecordDraft)

    expect(loadPersistedDraft(open())).toBeNull()
    open.closeAll()
  })

  it('只落既有 meta 表：草稿存取前后表结构不变（PRODUCTION_DB_MIGRATION = 0）', () => {
    const open = opener(5)
    const tablesBefore = open()
      .getAllSync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .map((r) => r.name)

    savePersistedDraft(open(), { assets: [], visitDate: '2026-09-20', tagIds: [] })

    const tablesAfter = open()
      .getAllSync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .map((r) => r.name)
    expect(tablesAfter).toEqual(tablesBefore)
    expect(tablesAfter).toContain('meta')
    const row = open().getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', RECORD_DRAFT_META_KEY)
    expect(JSON.parse(row!.value)).toMatchObject({ visitDate: '2026-09-20' })
    open.closeAll()
  })
})
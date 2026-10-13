import { applyConnectionPragmas, type SqlDatabase } from '../../db/database'
import { runMigrations } from '../../db/migrations'
import type { MediaFileSystem } from '../../media/localFiles'
import { createFakeGateway, type FakeGateway } from '../../test/fakeSyncGateway'
import { createNodeSqliteDatabase } from '../../test/nodeSqliteAdapter'
import { createMediaPuller } from '../pullMedia'

function setup(): SqlDatabase {
  const db = createNodeSqliteDatabase()
  applyConnectionPragmas(db)
  runMigrations(db)
  db.runSync(
    "INSERT INTO places (id, name, coord_precision, is_private, revision, demo, sync_status) VALUES ('p1', 'P', 'exact', 0, 1, 0, 'synced')",
  )
  db.runSync(
    "INSERT INTO entries (id, place_id, visit_date, revision, demo, sync_status) VALUES ('e1', 'p1', '2026-09-18', 1, 0, 'synced')",
  )
  return db
}

class MemoryFs implements MediaFileSystem {
  files = new Map<string, number>()
  documentDirectoryUri() {
    return 'file:///documents/'
  }
  ensureDirectory() {
    /* no-op */
  }
  copy() {
    /* unused */
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

function gatewayWithMedia(rows: Record<string, unknown>[]): FakeGateway {
  const gateway = createFakeGateway()
  gateway.setRemote('media', rows)
  return gateway
}

function mediaRow(db: SqlDatabase, id = 'm1') {
  return db.getFirstSync<{
    local_display_path: string | null
    local_thumb_path: string | null
    remote_path: string | null
    remote_thumb_path: string | null
    sync_status: string
  }>(
    'SELECT local_display_path, local_thumb_path, remote_path, remote_thumb_path, sync_status FROM media WHERE id = ?',
    id,
  )
}

describe('pullMedia：云端照片下行', () => {
  it('拉 media 行并下载 display/thumb 到本机，落 synced 行', async () => {
    const db = setup()
    const files = new MemoryFs()
    const gateway = gatewayWithMedia([
      {
        id: 'm1',
        entry_id: 'e1',
        place_id: 'p1',
        storage_path: 'o/p1/m1/display.jpg',
        thumb_path: 'o/p1/m1/thumb.jpg',
        width: 100,
        height: 80,
        bytes: 1234,
        sort_order: 0,
      },
    ])
    const bytesByUrl = new Map<string, number>([
      ['https://fake.local/habit-tracker-media-private/o/p1/m1/display.jpg?token=fake', 11],
      ['https://fake.local/habit-tracker-media-private/o/p1/m1/thumb.jpg?token=fake', 3],
    ])
    const fetchBytes = async (url: string) => new Uint8Array(bytesByUrl.get(url) ?? 0)

    const result = await createMediaPuller({
      db,
      gateway,
      files,
      documentDirUri: files.documentDirectoryUri(),
      fetchBytes,
    }).run()

    expect(result).toEqual({ rows: 1, downloaded: 2, failed: 0 })
    const row = mediaRow(db)
    expect(row).toMatchObject({
      local_display_path: 'file:///documents/place-journal/media/e1/m1/source-or-display.jpg',
      local_thumb_path: 'file:///documents/place-journal/media/e1/m1/thumb.jpg',
      remote_path: 'o/p1/m1/display.jpg',
      remote_thumb_path: 'o/p1/m1/thumb.jpg',
      sync_status: 'synced',
    })
    expect(files.exists('file:///documents/place-journal/media/e1/m1/source-or-display.jpg')).toBe(true)
    expect(files.exists('file:///documents/place-journal/media/e1/m1/thumb.jpg')).toBe(true)
    expect(gateway.calls.filter((c) => c.op === 'createSignedUrl')).toHaveLength(2)
  })

  it('核心实体缺失的媒体行跳过（不触发本地外键）', async () => {
    const db = setup()
    const files = new MemoryFs()
    const gateway = gatewayWithMedia([
      {
        id: 'mX',
        entry_id: 'missing',
        place_id: 'p1',
        storage_path: 'o/p1/mX/display.jpg',
        thumb_path: null,
      },
    ])

    const result = await createMediaPuller({
      db,
      gateway,
      files,
      documentDirUri: files.documentDirectoryUri(),
      fetchBytes: async () => new Uint8Array(1),
    }).run()

    expect(result.rows).toBe(0)
    expect(db.getFirstSync('SELECT 1 FROM media WHERE id = ?', 'mX')).toBeNull()
  })

  it('本地文件已存在则不重复下载，只补 remote 路径', async () => {
    const db = setup()
    const files = new MemoryFs()
    const display = 'file:///documents/place-journal/media/e1/m1/source-or-display.jpg'
    const thumb = 'file:///documents/place-journal/media/e1/m1/thumb.jpg'
    files.writeBytes(display, new Uint8Array(5))
    files.writeBytes(thumb, new Uint8Array(2))
    db.runSync(
      `INSERT INTO media (id, entry_id, place_id, local_display_path, local_thumb_path, sort_order, sync_status)
       VALUES ('m1', 'e1', 'p1', ?, ?, 0, 'local')`,
      display,
      thumb,
    )
    const gateway = gatewayWithMedia([
      { id: 'm1', entry_id: 'e1', place_id: 'p1', storage_path: 'o/display.jpg', thumb_path: 'o/thumb.jpg' },
    ])

    const result = await createMediaPuller({
      db,
      gateway,
      files,
      documentDirUri: files.documentDirectoryUri(),
      fetchBytes: async () => new Uint8Array(1),
    }).run()

    expect(result.downloaded).toBe(0)
    expect(mediaRow(db)).toMatchObject({ remote_path: 'o/display.jpg', local_thumb_path: thumb })
  })
})

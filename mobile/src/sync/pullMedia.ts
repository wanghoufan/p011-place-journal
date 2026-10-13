// 云端媒体下行（A1）：拉 media 表行 → 下载 display/thumb 到本机持久目录 → 落本地 media 行。
//
// 与核心实体 pull（pull.ts 只合 4 张带 revision 的表）分开：媒体无 revision，且要把二进制
// 文件真正取回本机（离线可看）。依赖注入（gateway + MediaFileSystem + fetchBytes）便于单测。
// 单个文件失败不抛整轮（仅计数），下次同步重试；核心实体缺失的媒体行跳过（防本地外键拦死）。

import type { SqlDatabase } from '../db/database'
import { PRIVATE_MEDIA_BUCKET } from '../domain/types'
import { mediaTargetPaths, type MediaFileSystem } from '../media/localFiles'
import type { SyncGateway } from './gateway'

const PAGE_SIZE = 1000
const SIGNED_URL_TTL_SECONDS = 300

type Row = Record<string, unknown>

export interface MediaPullerDeps {
  db: SqlDatabase
  gateway: SyncGateway
  files: MediaFileSystem
  documentDirUri: string
  /** 取签名 URL 的字节；生产用 fetch，单测注入。 */
  fetchBytes: (url: string) => Promise<Uint8Array>
  pageSize?: number
  signedUrlTtlSeconds?: number
  now?: () => number
}

export interface MediaPullResult {
  rows: number
  downloaded: number
  failed: number
}

export interface MediaPuller {
  run(): Promise<MediaPullResult>
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

async function fetchAllMedia(gateway: SyncGateway, pageSize: number): Promise<Row[]> {
  const rows: Row[] = []
  for (let offset = 0; ; offset += pageSize) {
    const res = await gateway.select('media', {
      columns: '*',
      orderBy: { column: 'id', ascending: true },
      limit: pageSize,
      offset,
    })
    if (res.error) throw new Error(`media 拉取失败：${res.error.message}`)
    const page = (res.data ?? []) as Row[]
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

export function createMediaPuller(deps: MediaPullerDeps): MediaPuller {
  const pageSize = deps.pageSize ?? PAGE_SIZE
  const ttl = deps.signedUrlTtlSeconds ?? SIGNED_URL_TTL_SECONDS
  const now = deps.now ?? (() => Date.now())

  async function download(path: string): Promise<Uint8Array> {
    const signed = await deps.gateway.createSignedUrl(PRIVATE_MEDIA_BUCKET, path, ttl)
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(`签名失败 ${path}: ${signed.error?.message ?? '无 signedUrl'}`)
    }
    return deps.fetchBytes(signed.data.signedUrl)
  }

  function upsertLocalMedia(
    row: Row,
    localDisplay: string | null,
    localThumb: string | null,
  ): void {
    const ts = new Date(now()).toISOString()
    deps.db.runSync(
      `INSERT INTO media (id, entry_id, place_id, local_display_path, local_thumb_path,
                          width, height, bytes, taken_at, sort_order, remote_path, remote_thumb_path,
                          sync_status, demo, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', 0, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         local_display_path = COALESCE(excluded.local_display_path, media.local_display_path),
         local_thumb_path   = COALESCE(excluded.local_thumb_path, media.local_thumb_path),
         remote_path        = excluded.remote_path,
         remote_thumb_path  = excluded.remote_thumb_path,
         width              = COALESCE(excluded.width, media.width),
         height             = COALESCE(excluded.height, media.height),
         bytes              = COALESCE(excluded.bytes, media.bytes),
         taken_at           = COALESCE(excluded.taken_at, media.taken_at),
         sort_order         = excluded.sort_order,
         sync_status        = 'synced',
         updated_at         = excluded.updated_at`,
      String(row.id),
      String(row.entry_id),
      String(row.place_id),
      localDisplay,
      localThumb,
      num(row.width),
      num(row.height),
      num(row.bytes),
      str(row.taken_at),
      num(row.sort_order) ?? 0,
      str(row.storage_path),
      str(row.thumb_path),
      ts,
      ts,
    )
  }

  return {
    async run(): Promise<MediaPullResult> {
      const rows = await fetchAllMedia(deps.gateway, pageSize)
      const pending: { row: Row; localDisplay: string | null; localThumb: string | null }[] = []
      let downloaded = 0
      let failed = 0

      for (const row of rows) {
        const id = str(row.id)
        const entryId = str(row.entry_id)
        const placeId = str(row.place_id)
        if (!id || !entryId || !placeId) continue
        // 核心实体缺失则跳过（本地 media 外键指向 entries/places，缺失会拦死整批）。
        if (!deps.db.getFirstSync('SELECT 1 FROM entries WHERE id = ?', entryId)) continue
        if (!deps.db.getFirstSync('SELECT 1 FROM places WHERE id = ?', placeId)) continue

        const storagePath = str(row.storage_path)
        const thumbPath = str(row.thumb_path)
        const existing = deps.db.getFirstSync<{ local_display_path: string | null; local_thumb_path: string | null }>(
          'SELECT local_display_path, local_thumb_path FROM media WHERE id = ?',
          id,
        )
        let localDisplay = existing?.local_display_path ?? null
        let localThumb = existing?.local_thumb_path ?? null
        const target = mediaTargetPaths(deps.documentDirUri, entryId, id)

        try {
          if (storagePath && !(localDisplay && deps.files.exists(localDisplay))) {
            deps.files.ensureDirectory(target.dirUri)
            deps.files.writeBytes(target.displayUri, await download(storagePath))
            localDisplay = target.displayUri
            downloaded += 1
          }
          if (thumbPath && !(localThumb && deps.files.exists(localThumb))) {
            deps.files.ensureDirectory(target.dirUri)
            deps.files.writeBytes(target.thumbUri, await download(thumbPath))
            localThumb = target.thumbUri
            downloaded += 1
          }
        } catch {
          failed += 1
        }
        pending.push({ row, localDisplay, localThumb })
      }

      deps.db.withTransactionSync(() => {
        for (const item of pending) upsertLocalMedia(item.row, item.localDisplay, item.localThumb)
      })

      return { rows: pending.length, downloaded, failed }
    },
  }
}

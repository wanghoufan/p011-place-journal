// 草稿照片的落盘暂存（L3-19）。
//
// 原缺陷：picker 的 `content://` 临时 URI 只存在内存草稿里，选完点「添加」就显示
// 「保存时写入本机」；进程被杀后草稿归零、`content://` 授权失效，图片全丢。
//
// 这里把落盘时点从「保存时」提前到「选中时」：逐张 processImage 生成 display/thumb，
// 复制进 App documents 私有持久目录 `place-journal/media/_draft/<mediaId>/`，
// 返回的 asset.uri 一律是持久 file:// 路径，草稿快照与它一起落库，恢复后照常可读可存。
//
// 不新增任何生产表/字段：暂存目录只落在本机文件系统，媒体行仍由 `persistPickedMedia`
// 在真正保存时按既有表结构写入（`PRODUCTION_DB_MIGRATION = 0` 不受影响）。

import type { PickedAsset } from './picker'
import type { ImageProcessor } from './processImage'
import { draftMediaTargetPaths, isDraftMediaUri, type MediaFileSystem } from './localFiles'
import { newUuid } from '../domain/ids'

export interface DraftMediaDeps {
  fs: MediaFileSystem
  images: ImageProcessor
  /** 媒体 id 生成器（默认 uuid；测试可注入确定性序列）。 */
  newId?: () => string
  /** documents 目录（默认取自 fs；测试可直接给定）。 */
  documentDirectoryUri?: string
}

/**
 * 把一批临时 URI 复制进持久暂存目录，返回 uri 已换成持久路径的资产。
 * 任一张失败：删掉本次已复制文件后抛错（不留半成品）。
 */
export async function stageDraftAssets(
  deps: DraftMediaDeps,
  assets: PickedAsset[],
): Promise<PickedAsset[]> {
  const newId = deps.newId ?? newUuid
  const documentDirUri = deps.documentDirectoryUri ?? deps.fs.documentDirectoryUri()
  const createdFiles: string[] = []
  const staged: PickedAsset[] = []

  try {
    for (const asset of assets) {
      const mediaId = newId()
      const target = draftMediaTargetPaths(documentDirUri, mediaId)
      deps.fs.ensureDirectory(target.dirUri)

      const processed = await deps.images.process(asset.uri)
      deps.fs.copy(processed.displayUri, target.displayUri)
      createdFiles.push(target.displayUri)
      deps.fs.copy(processed.thumbUri, target.thumbUri)
      createdFiles.push(target.thumbUri)

      staged.push({
        uri: target.displayUri,
        width: processed.width,
        height: processed.height,
        fileName: asset.fileName,
        fileSize: deps.fs.size(target.displayUri),
        mimeType: asset.mimeType ?? 'image/jpeg',
      })
    }
    return staged
  } catch (error) {
    for (const uri of createdFiles) {
      try {
        deps.fs.remove(uri)
      } catch {
        // 清理失败不掩盖原始错误。
      }
    }
    throw error
  }
}

/**
 * 丢弃草稿暂存副本（移除某张、保存完成、表单复位时调用）。
 * 只删 `_draft/` 下的文件：传入的 asset 若是 picker 原始临时 URI 一律跳过，避免误删。
 */
export function discardDraftAssets(deps: DraftMediaDeps, assets: PickedAsset[]): void {
  const documentDirUri = deps.documentDirectoryUri ?? deps.fs.documentDirectoryUri()
  for (const asset of assets) {
    if (!isDraftMediaUri(documentDirUri, asset.uri)) continue
    const mediaId = mediaIdOf(asset.uri)
    if (!mediaId) continue
    const target = draftMediaTargetPaths(documentDirUri, mediaId)
    for (const uri of [target.displayUri, target.thumbUri]) {
      try {
        if (deps.fs.exists(uri)) deps.fs.remove(uri)
      } catch {
        // 残留暂存文件只是占空间，不影响正确性。
      }
    }
  }
}

/** `.../_draft/<mediaId>/<file>` → `<mediaId>`。 */
function mediaIdOf(uri: string): string {
  const parts = uri.split('/')
  return parts[parts.length - 2] ?? ''
}
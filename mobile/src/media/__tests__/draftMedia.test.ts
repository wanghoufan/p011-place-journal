// 草稿照片落盘暂存（L3-19）：临时 content:// URI 必须在「选中时」就被复制进
// App 私有持久目录，否则进程被杀后草稿里的 URI 全部失效、图片全丢。
//
// 用内存文件系统替身 + 假图片处理器（只替原生边界，被测逻辑照跑），
// 与 mediaService.test.ts 同一风格。

import { discardDraftAssets, stageDraftAssets, type DraftMediaDeps } from '../draftMedia'
import { isDraftMediaUri, type MediaFileSystem } from '../localFiles'
import type { ImageProcessor } from '../processImage'
import type { PickedAsset } from '../picker'

class FakeFileSystem implements MediaFileSystem {
  files = new Map<string, number>()

  documentDirectoryUri() {
    return 'file:///documents/'
  }
  ensureDirectory() {
    /* no-op */
  }
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

function fakeImages(failOn?: string): ImageProcessor {
  return {
    async process(sourceUri) {
      if (sourceUri === failOn) throw new Error(`process failed: ${sourceUri}`)
      return {
        displayUri: `cache/display-${sourceUri}.jpg`,
        thumbUri: `cache/thumb-${sourceUri}.jpg`,
        width: 1200,
        height: 900,
      }
    },
  }
}

function deps(fs: FakeFileSystem, ids: string[], failOn?: string): DraftMediaDeps {
  let cursor = 0
  return { fs, images: fakeImages(failOn), newId: () => ids[cursor++] ?? `d${cursor}` }
}

const PICKED: PickedAsset[] = [
  { uri: 'content://media/external/images/media/1', width: 4000, height: 3000 },
  { uri: 'content://media/external/images/media/2', width: 4000, height: 3000 },
]

describe('stageDraftAssets：选中即落盘（L3-19）', () => {
  it('返回的 uri 全部换成 App 私有目录持久路径，且文件真实存在', async () => {
    const fs = new FakeFileSystem()

    const staged = await stageDraftAssets(deps(fs, ['d1', 'd2']), PICKED)

    expect(staged.map((a) => a.uri)).toEqual([
      'file:///documents/place-journal/media/_draft/d1/source-or-display.jpg',
      'file:///documents/place-journal/media/_draft/d2/source-or-display.jpg',
    ])
    for (const asset of staged) {
      expect(fs.exists(asset.uri)).toBe(true)
      expect(asset.uri.startsWith('content://')).toBe(false)
    }
  })

  it('display/thumb 双资产都在（与正式媒体同结构），尺寸取处理结果', async () => {
    const fs = new FakeFileSystem()

    const [first] = await stageDraftAssets(deps(fs, ['d1']), [PICKED[0]])

    expect(fs.exists('file:///documents/place-journal/media/_draft/d1/source-or-display.jpg')).toBe(true)
    expect(fs.exists('file:///documents/place-journal/media/_draft/d1/thumb.jpg')).toBe(true)
    expect(first).toMatchObject({ width: 1200, height: 900 })
  })

  it('顺序不变：按选择顺序生成暂存目录，恢复后仍是原顺序', async () => {
    const fs = new FakeFileSystem()

    const staged = await stageDraftAssets(deps(fs, ['d1', 'd2']), PICKED)

    expect(staged[0].uri).toContain('/_draft/d1/')
    expect(staged[1].uri).toContain('/_draft/d2/')
  })

  it('处理失败：删除本次已复制文件，不留半成品', async () => {
    const fs = new FakeFileSystem()

    await expect(stageDraftAssets(deps(fs, ['d1', 'd2'], PICKED[1].uri), PICKED)).rejects.toThrow(/process failed/)

    expect(fs.files.size).toBe(0)
  })

  it('空选择：不复制、不报错', async () => {
    const fs = new FakeFileSystem()

    expect(await stageDraftAssets(deps(fs, []), [])).toEqual([])
    expect(fs.files.size).toBe(0)
  })
})

describe('discardDraftAssets：只删草稿暂存副本', () => {
  it('删掉暂存的 display/thumb 两份', async () => {
    const fs = new FakeFileSystem()
    const staged = await stageDraftAssets(deps(fs, ['d1']), [PICKED[0]])

    discardDraftAssets(deps(fs, []), staged)

    expect(fs.exists(staged[0].uri)).toBe(false)
    expect(fs.exists('file:///documents/place-journal/media/_draft/d1/thumb.jpg')).toBe(false)
  })

  it('只移除其中一张：另一张保持可读（不误删邻居）', async () => {
    const fs = new FakeFileSystem()
    const staged = await stageDraftAssets(deps(fs, ['d1', 'd2']), PICKED)

    discardDraftAssets(deps(fs, []), [staged[0]])

    expect(fs.exists(staged[0].uri)).toBe(false)
    expect(fs.exists(staged[1].uri)).toBe(true)
  })

  it('picker 原始临时 URI 一律跳过（没落过盘，删不得）', async () => {
    const fs = new FakeFileSystem()

    discardDraftAssets(deps(fs, []), PICKED)

    expect(fs.files.size).toBe(0)
  })

  it('正式媒体目录（media/<entryId>/…）不在删除范围内', () => {
    expect(isDraftMediaUri('file:///documents/', 'file:///documents/place-journal/media/_draft/d1/x.jpg')).toBe(true)
    expect(isDraftMediaUri('file:///documents/', 'file:///documents/place-journal/media/e1/m1/x.jpg')).toBe(false)
    expect(isDraftMediaUri('file:///documents/', 'content://media/external/images/media/1')).toBe(false)
  })
})
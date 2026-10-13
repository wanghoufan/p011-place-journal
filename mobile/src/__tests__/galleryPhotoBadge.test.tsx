// L3-29 回归：画廊「按记录」卡片（双栏 EntryCard + 单栏 EntryRow）必须按
// 文档 §3.3「画廊卡显示封面，其他照片以 `+N` 提示」给出多图角标，
// 数字 = 照片总数 - 1，且不足 2 张时不出角标。
//
// 只打桩数据层（仓库句柄 + 路由），角标计算 `extraPhotoCount` 与两张卡片
// 都走真实实现，断言的是真实渲染结构，而不是某个替身组件。

import TestRenderer from 'react-test-renderer'
import type { ReactTestRendererJSON } from 'react-test-renderer'

import { EntryCard, EntryRow, extraPhotoCount } from '../../app/(tabs)/index'
import type { GalleryEntry } from '@/features/queries'

jest.mock('@/db/app', () => ({
  getAppRepository: () => ({ db: { getFirstSync: () => undefined, runSync: () => {} }, repo: {} }),
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => {},
}))

function entryOf(mediaCount: number): GalleryEntry {
  return {
    id: 'e1',
    placeId: 'p1',
    placeName: '炭先生湿辣牛肉',
    placeArea: '西湖区',
    visitDate: '2026-09-01',
    rating: 4,
    mediaCount,
    isPrivate: false,
    revision: 1,
    baseRevision: null,
    demo: false,
    syncStatus: 'synced',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    tagIds: [],
  }
}

type Node = ReactTestRendererJSON

function isElement(child: unknown): child is Node {
  return typeof child === 'object' && child !== null
}

function descendants(node: Node): Node[] {
  const children = (node.children ?? []).filter(isElement)
  return children.flatMap((child) => [child, ...descendants(child)])
}

/**
 * 某棵子树里所有 Text 的可见文字。
 * 每个 Text 的子片段按渲染顺序拼接（`+` 与 `2` 是两个子节点，直接取子串会得到 `['+','2']`）。
 */
function textsIn(node: Node): string[] {
  return [node, ...descendants(node)]
    .filter((n) => n.type === 'Text')
    .map((n) => (n.children ?? []).filter((c): c is string => typeof c === 'string').join(''))
}

function render(node: React.ReactElement): { renderer: TestRenderer.ReactTestRenderer; texts: string[] } {
  let renderer: TestRenderer.ReactTestRenderer | null = null
  TestRenderer.act(() => {
    renderer = TestRenderer.create(node)
  })
  const json = renderer!.toJSON()
  if (!json || Array.isArray(json)) throw new Error('渲染结果为空')
  return { renderer: renderer!, texts: textsIn(json as Node) }
}

/** 角标文字：形如 `+2`，与 meta 行的「6 张」区分开。 */
function badgeTexts(texts: string[]): string[] {
  return texts.filter((t) => /^\+\d+$/.test(t.trim()))
}

function renderCard(mediaCount: number) {
  return render(<EntryCard entry={entryOf(mediaCount)} tagNameOf={(id) => id} onPress={() => {}} />)
}

function renderRow(mediaCount: number) {
  return render(<EntryRow entry={entryOf(mediaCount)} tagNameOf={(id) => id} onPress={() => {}} />)
}

describe('extraPhotoCount（§3.3 多图角标数字 = 照片总数 - 1）', () => {
  it('0 张（缺字段/无照片）→ 0，不出角标', () => {
    expect(extraPhotoCount(0)).toBe(0)
  })

  it('1 张 → 0，单图不出角标', () => {
    expect(extraPhotoCount(1)).toBe(0)
  })

  it('多图：2 → 1、3 → 2、6 → 5', () => {
    expect(extraPhotoCount(2)).toBe(1)
    expect(extraPhotoCount(3)).toBe(2)
    expect(extraPhotoCount(6)).toBe(5)
  })

  it('非法输入（负数 / 非整数）夹到 0，不出负数角标', () => {
    expect(extraPhotoCount(-3)).toBe(0)
    expect(extraPhotoCount(1.5)).toBe(0)
  })
})

describe('双栏网格卡（EntryCard）多图角标', () => {
  it('单图不出角标', () => {
    const { renderer, texts } = renderCard(1)
    expect(badgeTexts(texts)).toEqual([])
    TestRenderer.act(() => renderer.unmount())
  })

  it('多图显示 +N（2 张 → +1，6 张 → +5）', () => {
    const two = renderCard(2)
    expect(badgeTexts(two.texts)).toEqual(['+1'])
    TestRenderer.act(() => two.renderer.unmount())

    const six = renderCard(6)
    expect(badgeTexts(six.texts)).toEqual(['+5'])
    TestRenderer.act(() => six.renderer.unmount())
  })
})

describe('单栏清单行（EntryRow）多图角标', () => {
  it('单图不出角标', () => {
    const { renderer, texts } = renderRow(1)
    expect(badgeTexts(texts)).toEqual([])
    TestRenderer.act(() => renderer.unmount())
  })

  it('多图在缩略图上显示 +N（3 张 → +2，6 张 → +5）', () => {
    const three = renderRow(3)
    expect(badgeTexts(three.texts)).toEqual(['+2'])
    TestRenderer.act(() => three.renderer.unmount())

    const six = renderRow(6)
    expect(badgeTexts(six.texts)).toEqual(['+5'])
    TestRenderer.act(() => six.renderer.unmount())
  })

  it('角标与双栏卡共用同一套样式（countChip），观感一致', () => {
    const row = renderRow(6)
    const card = renderCard(6)
    const chipOf = (r: TestRenderer.ReactTestRenderer) => {
      const badge = badgeTexts(textsIn(r.toJSON() as Node))
      expect(badge).toEqual(['+5'])
      const node = r.root
        .findAll((n) => typeof n?.props?.style === 'object')
        .find((n) => {
          const style = n.props.style as Record<string, unknown>
          // countChip 特征：右下角绝对定位 + 10 圆角（区别于左上角的 timeChip）
          return style?.position === 'absolute' && style?.borderRadius === 10 && 'bottom' in style
        })
      expect(node).toBeTruthy()
      return JSON.stringify(node!.props.style)
    }
    expect(chipOf(row.renderer)).toBe(chipOf(card.renderer))
    TestRenderer.act(() => row.renderer.unmount())
    TestRenderer.act(() => card.renderer.unmount())
  })

  it('meta 行「· N 张」保留（§3.3 未要求删除），与角标并存', () => {
    const { renderer, texts } = renderRow(6)
    expect(badgeTexts(texts)).toEqual(['+5'])
    expect(texts.some((t) => t.includes('6 张'))).toBe(true)
    TestRenderer.act(() => renderer.unmount())
  })
})
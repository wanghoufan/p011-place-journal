// P1·L3-64 接线回归（页面级）：点「分享这条记录」必须真的调起系统 Share Sheet
// （message＝白名单标题＋公开 https URL、无私密字段），并保留进入快照页；
// 快照页给出「链接当前能否被打开」的明确提示，撤销后不再提供分享入口。
//
// 只打桩原生边界（Share.share / expo-clipboard）与导航/仓库句柄，URL 构造、
// 快照创建与白名单过滤全部走真实实现（真 SQLite）。

import type { ReactElement } from 'react'
import { act, create } from 'react-test-renderer'
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer'
import { Share, Text } from 'react-native'

import EntryDetailScreen from '../../app/entry/[id]'
import ShareSnapshotScreen from '../../app/share/[slug]'
import { applyConnectionPragmas, type SqlDatabase } from '@/db/database'
import { runMigrations } from '@/db/migrations'
import { createRepository, type Repository } from '@/db/repository'
import { revokeShare, createEntryShare } from '@/features/shares'
import { createNodeSqliteDatabase } from '@/test/nodeSqliteAdapter'

const shareMock = jest.spyOn(Share, 'share')

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }))

let mockRepoHandle: { db: SqlDatabase; repo: Repository }
let mockEntryId = 'e1'
let mockSlug = ''

jest.mock('@/db/app', () => ({
  getAppRepository: () => mockRepoHandle,
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ id: mockEntryId, slug: mockSlug }),
  useFocusEffect: (effect: () => void) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react')
    useEffect(effect, [effect])
  },
}))

const SECRETS = ['只有我自己知道的感受', '私密转写内容', '20.0458', '110.2216']

function seed(db: SqlDatabase, repo: Repository): void {
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
    is_private: 0,
    demo: 0,
  })
}

function textOf(node: ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : textOf(child)))
    .join('')
}

function findButton(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const hit = renderer.root
    .findAll((n) => typeof n.props.onPress === 'function')
    .find((n) => textOf(n) === label)
  if (!hit) throw new Error(`找不到按钮：${label}`)
  return hit
}

function hasText(renderer: ReactTestRenderer, fragment: string): boolean {
  return renderer.root.findAllByType(Text).some((n) => textOf(n).includes(fragment))
}

async function press(node: ReactTestInstance): Promise<void> {
  await act(async () => {
    node.props.onPress()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function render(ui: ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer
  act(() => {
    renderer = create(ui)
  })
  return renderer
}

beforeEach(() => {
  jest.clearAllMocks()
  shareMock.mockResolvedValue({ action: 'sharedAction' })
  const db = createNodeSqliteDatabase()
  applyConnectionPragmas(db)
  runMigrations(db)
  mockRepoHandle = { db, repo: createRepository(db) }
  mockEntryId = 'e1'
  mockSlug = ''
  seed(mockRepoHandle.db, mockRepoHandle.repo)
})

describe('记录详情「分享这条记录」', () => {
  it('点一下就调起 Share Sheet：message 带公开 https URL、不含私密字段，并进快照页', async () => {
    const renderer = render(<EntryDetailScreen />)
    await press(findButton(renderer, '分享这条记录'))

    expect(shareMock).toHaveBeenCalledTimes(1)
    const content = shareMock.mock.calls[0][0]
    expect(content.message).toMatch(
      /^西海岸日落咖啡\nhttps:\/\/place-journal-xi\.vercel\.app\/s\/p\/[A-Za-z0-9_-]{16,}$/,
    )
    for (const secret of SECRETS) {
      expect(content.message).not.toContain(secret)
      expect(content.url ?? '').not.toContain(secret)
    }
    const { router } = jest.requireMock('expo-router')
    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/share\/[A-Za-z0-9_-]{16,}$/))
  })

  it('分享失败时留在本页并给明确提示，不跳转', async () => {
    shareMock.mockRejectedValueOnce(new Error('chooser unavailable'))
    const renderer = render(<EntryDetailScreen />)
    await press(findButton(renderer, '分享这条记录'))

    expect(hasText(renderer, 'chooser unavailable')).toBe(true)
    const { router } = jest.requireMock('expo-router')
    expect(router.push).not.toHaveBeenCalled()
  })
})

describe('快照页 /share/[slug]', () => {
  it('有效快照：可分享，且就地提示链接当前未发布（云端未配置 / 尚在同步队列）', async () => {
    const snapshot = createEntryShare(mockRepoHandle.db, mockRepoHandle.repo, {
      entryId: 'e1',
      slug: 'pageslug123456789012',
    })
    mockSlug = snapshot.slug

    const renderer = render(<ShareSnapshotScreen />)
    const hintText = renderer.root
      .findAllByType(Text)
      .map((n) => textOf(n))
      .find((t) => t.includes('同步'))
    expect(hintText).toMatch(/未配置云端同步|同步队列/)

    await press(findButton(renderer, '分享公开链接'))

    expect(shareMock).toHaveBeenCalledTimes(1)
    expect(shareMock.mock.calls[0][0].message).toContain(
      'https://place-journal-xi.vercel.app/s/p/pageslug123456789012',
    )
  })

  it('已撤销快照：没有分享入口，并明确说明链接已失效', () => {
    const snapshot = createEntryShare(mockRepoHandle.db, mockRepoHandle.repo, {
      entryId: 'e1',
      slug: 'revokedslug123456789',
    })
    revokeShare(mockRepoHandle.db, mockRepoHandle.repo, { slug: snapshot.slug })
    mockSlug = snapshot.slug

    const renderer = render(<ShareSnapshotScreen />)
    expect(() => findButton(renderer, '分享公开链接')).toThrow('找不到按钮')
    expect(hasText(renderer, '已撤销：公开链接已失效')).toBe(true)
    expect(shareMock).not.toHaveBeenCalled()
  })
})

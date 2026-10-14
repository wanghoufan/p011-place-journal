// 真机复测问题 1（登录态语义歧义）页面级回归：Google 登录成功后 Mine 只显示「退出登录」、
// 徽章不再一边「仅本机」一边「退出登录」；未登录与刚退出登录保持只显示「使用 Google 登录」。
//
// 只打桩平台边界（expo-router / expo-constants / supabase auth 句柄 / db 单例句柄 / 网络探针 /
// 原生同步引擎工厂 / 导出分享），登录态 → 按钮与徽章的判定走真实 `accountActions` 与
// MineScreen 渲染；本机库为真实 SQLite（node:sqlite + 真实迁移）。

import type { ReactElement } from 'react'
import { act, create } from 'react-test-renderer'
import type { ReactTestInstance, ReactTestRenderer } from 'react-test-renderer'
import { Text } from 'react-native'

import MineScreen from '../../app/(tabs)/mine'
import { applyConnectionPragmas, type SqlDatabase } from '@/db/database'
import { runMigrations } from '@/db/migrations'
import { createRepository, type Repository } from '@/db/repository'
import { createOutbox } from '@/sync/outbox'
import { setBoundOwner } from '@/sync/meta'
import type { LoginState } from '@/supabase/auth'
import { createNodeSqliteDatabase } from '@/test/nodeSqliteAdapter'

const OWNER = '3e0acd69-aaaa-bbbb-cccc-000000000001'

let mockRepoHandle: { db: SqlDatabase; repo: Repository }
let mockLoginState: LoginState | null = { status: 'signed_out' }
const mockLogin = jest.fn()
const mockBindOwner = jest.fn()
// 真机语义：退出只清本地 auth 态、owner 绑定保留；随后 getLoginState 读到 signed_out。
const mockSignOut = jest.fn(async () => {
  mockLoginState = { status: 'signed_out' }
})

jest.mock('@/db/app', () => ({
  getAppRepository: () => mockRepoHandle,
}))

jest.mock('@/supabase', () => ({
  isSupabaseConfigured: () => true,
  getAuthService: () => ({
    getLoginState: () => Promise.resolve(mockLoginState),
    login: mockLogin,
    signOut: mockSignOut,
    bindOwner: mockBindOwner,
  }),
}))

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react')
    useEffect(effect, [effect])
  },
}))

jest.mock('expo-constants', () => ({
  default: { expoConfig: { version: '0.1.0', android: { versionCode: 1 } }, nativeBuildVersion: '1' },
}))

jest.mock('@/features/networkGate', () => ({ isNetworkAvailable: async () => false }))
jest.mock('@/sync/nativeSync', () => ({ createNativeSyncEngines: jest.fn() }))
jest.mock('@/features/exportFile', () => ({ shareExportFile: jest.fn() }))

function textOf(node: ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : textOf(child)))
    .join('')
}

function buttonLabels(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll((n) => typeof n.props.onPress === 'function')
    .map((n) => textOf(n))
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

async function renderMine(): Promise<ReactTestRenderer> {
  let renderer!: ReactTestRenderer
  await act(async () => {
    renderer = create(<MineScreen />)
  })
  return renderer
}

async function press(node: ReactTestInstance): Promise<void> {
  await act(async () => {
    node.props.onPress()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoginState = { status: 'signed_out' }
  const db = createNodeSqliteDatabase()
  applyConnectionPragmas(db)
  runMigrations(db)
  mockRepoHandle = { db, repo: createRepository(db) }
})

describe('Mine 登录态三态（真机复测问题 1）', () => {
  it('未登录：只显示「使用 Google 登录」，徽章「仅本机」', async () => {
    const renderer = await renderMine()

    expect(buttonLabels(renderer)).toContain('使用 Google 登录')
    expect(buttonLabels(renderer)).not.toContain('退出登录')
    expect(hasText(renderer, '仅本机')).toBe(true)
  })

  it('刚退出登录（auth 已清、owner 绑定保留）：回到只显示「使用 Google 登录」，提示退出文案，徽章「仅本机」', async () => {
    setBoundOwner(mockRepoHandle.db, OWNER)
    mockLoginState = { status: 'signed_in', userId: OWNER, binding: 'match' }
    const renderer = await renderMine()

    // 登录成功态先成立：只显示退出登录。
    expect(buttonLabels(renderer)).toContain('退出登录')
    expect(buttonLabels(renderer)).not.toContain('使用 Google 登录')

    await press(findButton(renderer, '退出登录'))

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(buttonLabels(renderer)).toContain('使用 Google 登录')
    expect(buttonLabels(renderer)).not.toContain('退出登录')
    expect(hasText(renderer, '已退出登录（本地数据保留）。')).toBe(true)
    expect(hasText(renderer, '仅本机')).toBe(true)
  })

  it('登录成功（已绑定）：只显示「退出登录」，徽章显示云端状态而非「仅本机」', async () => {
    setBoundOwner(mockRepoHandle.db, OWNER)
    mockLoginState = { status: 'signed_in', userId: OWNER, binding: 'match' }
    const renderer = await renderMine()

    expect(buttonLabels(renderer)).toContain('退出登录')
    expect(buttonLabels(renderer)).not.toContain('使用 Google 登录')
    expect(hasText(renderer, '仅本机')).toBe(false)
    expect(hasText(renderer, '已同步')).toBe(true)
    expect(hasText(renderer, `已绑定 ${OWNER.slice(0, 8)}…`)).toBe(true)
  })

  it('登录成功且有待传：徽章「待同步」而非「仅本机」', async () => {
    setBoundOwner(mockRepoHandle.db, OWNER)
    mockLoginState = { status: 'signed_in', userId: OWNER, binding: 'match' }
    createOutbox(mockRepoHandle.db).enqueue({ kind: 'upsert_place', entityId: 'p1' }, { opId: 'A' })
    const renderer = await renderMine()

    expect(hasText(renderer, '仅本机')).toBe(false)
    expect(hasText(renderer, '待同步')).toBe(true)
    expect(buttonLabels(renderer)).toContain('退出登录')
    expect(buttonLabels(renderer)).not.toContain('使用 Google 登录')
  })
})

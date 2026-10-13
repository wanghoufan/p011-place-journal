// OAuth 三终态 → 回主界面的去向（L3·产品 P1：授权成功后卡在 `auth/callback`，底栏 Tab 不可见）。
//
// 两层覆盖：
//   1) `authReturnTarget` / `authReturnRoute` 纯函数的终态映射；
//   2) 真渲染 `app/auth/callback.tsx`，断言**终态确实触发 `router.replace` 到对应路由**。
//      这里只打桩平台边界（`expo-router` 的 router、`expo-linking` 的 URL、`@/supabase` 的
//      AuthService），被测的 `handleCallback` 调用时机与终态判定逻辑走真实实现。
//
// 「重复回调不重复换码」语义由 `authReturn.ts` 保证：本文件不改 `handleCallback` 的
// 调用时机与顺序，只在其**之后**决定导航目标，故不会破坏去重。

import TestRenderer from 'react-test-renderer'

import AuthCallbackScreen from '../../../app/auth/callback'
import {
  authReturnRoute,
  authReturnTarget,
  HOME_ROUTE,
  MINE_ROUTE,
  type AuthReturnTarget,
} from '../authReturn'
import type { CallbackOutcome } from '../../supabase/auth'

const mockReplace = jest.fn()
const mockHandleCallback = jest.fn<Promise<CallbackOutcome>, [string]>()

jest.mock('expo-router', () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) } }))
jest.mock('expo-linking', () => ({ useLinkingURL: () => globalThis.__TEST_LINKING_URL__ }))
jest.mock('@/supabase', () => ({
  isSupabaseConfigured: () => true,
  getAuthService: () => ({ handleCallback: (url: string) => mockHandleCallback(url) }),
}))
jest.mock('@/features/account', () => ({ describeCallbackOwnerMismatch: () => '登录账号与本机绑定不一致。' }))

declare global {
  // eslint-disable-next-line no-var
  var __TEST_LINKING_URL__: string | null
}

/** 与生产同构的回调 URL（`AUTH_REDIRECT_URI` 基线串 + 一次性 code）。 */
const CALLBACK_URL = 'com.wanghoufan.placejournal://auth/callback?code=probe-onetime-code-123'
const RESULT_LINGER_MS = 600
const NO_URL_GRACE_MS = 2500

async function renderWith(url: string | null, outcome: CallbackOutcome) {
  globalThis.__TEST_LINKING_URL__ = url
  mockHandleCallback.mockResolvedValue(outcome)
  let renderer: TestRenderer.ReactTestRenderer | null = null
  await TestRenderer.act(async () => {
    renderer = TestRenderer.create(<AuthCallbackScreen />)
  })
  return renderer as unknown as TestRenderer.ReactTestRenderer
}

function textsOf(renderer: TestRenderer.ReactTestRenderer): string[] {
  const out: string[] = []
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      out.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    const children = (node as { children?: unknown[] })?.children
    if (children) children.forEach(walk)
  }
  walk(renderer.toJSON())
  return out
}

beforeEach(() => {
  jest.useFakeTimers()
  mockReplace.mockClear()
  mockHandleCallback.mockReset()
  globalThis.__TEST_LINKING_URL__ = null
})

afterEach(() => {
  jest.useRealTimers()
})

describe('authReturnTarget：终态 → 落地页', () => {
  const cases: { name: string; outcome: CallbackOutcome; expected: AuthReturnTarget }[] = [
    { name: '成功', outcome: { status: 'succeeded', userId: 'u1', binding: 'match' }, expected: 'mine' },
    { name: '取消', outcome: { status: 'error', errorClass: 'provider_error' }, expected: 'home' },
    { name: '已处理过', outcome: { status: 'duplicate', flowStatus: 'succeeded' }, expected: 'mine' },
  ]

  it.each(cases)('$name → $expected', ({ outcome, expected }) => {
    expect(authReturnTarget(outcome)).toBe(expected)
  })

  it('其余终态一律回主界面画廊', () => {
    expect(authReturnTarget({ status: 'owner_mismatch', userId: 'u1', boundOwner: 'u0' })).toBe('mine')
    expect(authReturnTarget({ status: 'terminal_reauth', errorClass: 'interrupted_no_session' })).toBe('home')
    expect(authReturnTarget({ status: 'invalid', reason: 'missing_code' })).toBe('home')
  })

  it('处理中（null）不是终态，不跳转', () => {
    expect(authReturnTarget(null)).toBe('pending')
    expect(authReturnRoute('pending')).toBe(HOME_ROUTE)
  })

  it('落地页路径落在 (tabs) 组内：底栏 Tab 一定可见', () => {
    expect(MINE_ROUTE).toBe('/(tabs)/mine')
    expect(HOME_ROUTE).toBe('/(tabs)')
    for (const target of ['mine', 'home'] as AuthReturnTarget[]) {
      expect(authReturnRoute(target).startsWith('/(tabs)')).toBe(true)
    }
  })
})

describe('auth/callback 页面：三终态自动回主界面', () => {
  it('成功：文案落到「登录成功。」并自动 replace 到 Mine', async () => {
    const renderer = await renderWith(CALLBACK_URL, { status: 'succeeded', userId: 'u1', binding: 'match' })
    expect(textsOf(renderer)).toContain('登录成功。')

    // 处理过程中先不跳（让用户看清结果），结果文案停留 600ms 后出栈。
    expect(mockReplace).not.toHaveBeenCalled()
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(mockReplace).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/mine')
  })

  it('取消（provider 回 error）：回画廊首页并保留底部 Tab', async () => {
    const renderer = await renderWith(CALLBACK_URL, { status: 'error', errorClass: 'provider_error' })
    expect(textsOf(renderer)).toContain('登录未完成，请回 Mine 重新登录。')
    expect(mockReplace).not.toHaveBeenCalled()
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
  })

  it('该登录回调已处理过：提示并自动 replace 到 Mine，不重复换码', async () => {
    const renderer = await renderWith(CALLBACK_URL, { status: 'duplicate', flowStatus: 'succeeded' })
    expect(textsOf(renderer)).toContain('该登录回调已处理过，无需重复操作。')
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/mine')
    expect(mockHandleCallback).toHaveBeenCalledTimes(1)
  })

  it('同一回调 URL 不会在本页被处理两次', async () => {
    const renderer = await renderWith(CALLBACK_URL, { status: 'succeeded', userId: 'u1', binding: 'match' })
    await TestRenderer.act(async () => {
      renderer.update(<AuthCallbackScreen />)
    })
    expect(mockHandleCallback).toHaveBeenCalledTimes(1)
  })

  it('owner mismatch 也回主界面（不把用户留在回调页）', async () => {
    await renderWith(CALLBACK_URL, { status: 'owner_mismatch', userId: 'u1', boundOwner: 'u0' })
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/mine')
  })

  it('handleCallback 抛错时也回主界面，不把用户卡在死胡同', async () => {
    globalThis.__TEST_LINKING_URL__ = CALLBACK_URL
    mockHandleCallback.mockRejectedValue(new Error('network down'))
    await TestRenderer.act(async () => {
      TestRenderer.create(<AuthCallbackScreen />)
    })
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
  })

  it('拿不到回调 URL 时，宽限期后自动回画廊首页', async () => {
    await renderWith(null, { status: 'invalid', reason: 'missing_code' })
    expect(mockHandleCallback).not.toHaveBeenCalled()
    TestRenderer.act(() => {
      jest.advanceTimersByTime(NO_URL_GRACE_MS - 1)
    })
    expect(mockReplace).not.toHaveBeenCalled()
    TestRenderer.act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)')
  })

  it('文案与跳转里都不出现一次性 code', async () => {
    const renderer = await renderWith(CALLBACK_URL, { status: 'succeeded', userId: 'u1', binding: 'match' })
    TestRenderer.act(() => {
      jest.advanceTimersByTime(RESULT_LINGER_MS)
    })
    expect(textsOf(renderer).join(' ')).not.toContain('probe-onetime-code-123')
    expect(JSON.stringify(mockReplace.mock.calls)).not.toContain('probe-onetime-code-123')
  })
})
// L3-39 回归：系统栏（状态栏图标 + Android 窗口底色）必须随明暗切换即时改变。
//
// 被测逻辑全部真实执行：`statusBarIconStyle` / `needsWindowBackground` 是纯函数直接断言；
// `useAndroidWindowBackground` 真的挂进 ThemeProvider、真的随 setAppearance 重渲染。
// 只 mock 了 `expo-system-ui` 这个**原生边界**（jest 环境里没有 Android 原生模块），
// 被测的 hook 本身没有被打桩。

import TestRenderer from 'react-test-renderer'
import { Platform } from 'react-native'

import {
  needsWindowBackground,
  statusBarIconStyle,
  useAndroidWindowBackground,
} from '../systemBars'
import { ThemeProvider, useTheme } from '../../themeProvider'
import { DARK_PALETTE, PALETTES, setActivePalette } from '../../theme'

const mockSetBackgroundColorAsync = jest.fn(async (_color: string) => {})

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: (color: string) => mockSetBackgroundColorAsync(color),
}))

describe('statusBarIconStyle: 状态栏图标明暗随明暗反转', () => {
  it('深色底要浅色图标，浅色底要深色图标', () => {
    expect(statusBarIconStyle('dark')).toBe('light')
    expect(statusBarIconStyle('light')).toBe('dark')
  })

  it('两个方向都断言，避免只改一端', () => {
    expect(statusBarIconStyle('light')).not.toBe(statusBarIconStyle('dark'))
  })
})

describe('needsWindowBackground: 只有 Android 需要刷窗口底色', () => {
  it('android 为真，iOS / web 为假', () => {
    expect(needsWindowBackground('android')).toBe(true)
    expect(needsWindowBackground('ios')).toBe(false)
    expect(needsWindowBackground('web')).toBe(false)
  })
})

describe('useAndroidWindowBackground: 窗口底色跟随调色板纸色', () => {
  const originalOS = Platform.OS

  beforeEach(() => {
    mockSetBackgroundColorAsync.mockClear()
    Platform.OS = 'android'
  })

  afterEach(() => {
    Platform.OS = originalOS
    // 活调色板是模块级单例，测试间必须复位。
    setActivePalette(PALETTES.warm)
  })

  function render() {
    let renderer: TestRenderer.ReactTestRenderer | null = null
    let api: { setAppearance: (a: 'light' | 'dark') => void } | null = null
    function Host() {
      const { palette, setAppearance } = useTheme()
      api = { setAppearance }
      useAndroidWindowBackground(palette)
      return null
    }
    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <Host />
        </ThemeProvider>,
      )
    })
    return {
      renderer: renderer as unknown as TestRenderer.ReactTestRenderer,
      setAppearance: (a: 'light' | 'dark') => TestRenderer.act(() => api!.setAppearance(a)),
    }
  }

  it('挂载即按当前纸色刷一次（Android）', () => {
    const { renderer } = render()
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledTimes(1)
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledWith(PALETTES.warm.paper)
    TestRenderer.act(() => renderer.unmount())
  })

  it('切到深色后按深色纸色重刷（不重启进程、不重建 Activity）', () => {
    const { renderer, setAppearance } = render()
    expect(mockSetBackgroundColorAsync).toHaveBeenLastCalledWith(PALETTES.warm.paper)

    setAppearance('dark')
    expect(mockSetBackgroundColorAsync).toHaveBeenLastCalledWith(DARK_PALETTE.paper)
    expect(DARK_PALETTE.paper).not.toBe(PALETTES.warm.paper)

    setAppearance('light')
    expect(mockSetBackgroundColorAsync).toHaveBeenLastCalledWith(PALETTES.warm.paper)
    TestRenderer.act(() => renderer.unmount())
  })

  it('纸色没变就不重复调原生（重渲染不刷屏）', () => {
    let bump: (() => void) | null = null
    function Host() {
      const { palette, setTheme } = useTheme()
      useAndroidWindowBackground(palette)
      bump = () => setTheme('ticket')
      return null
    }
    let renderer: TestRenderer.ReactTestRenderer | null = null
    TestRenderer.act(() => {
      renderer = TestRenderer.create(
        <ThemeProvider>
          <Host />
        </ThemeProvider>,
      )
    })
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledTimes(1)

    // 换配色但三套浅色纸色各不相同 → 应重刷为票根纸色
    TestRenderer.act(() => bump!())
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledTimes(2)
    expect(mockSetBackgroundColorAsync).toHaveBeenLastCalledWith(PALETTES.ticket.paper)
    TestRenderer.act(() => (renderer as unknown as TestRenderer.ReactTestRenderer).unmount())
  })

  it('非 Android 平台完全不调原生（iOS / web 不适用窗口底色）', () => {
    Platform.OS = 'ios'
    const { renderer } = render()
    expect(mockSetBackgroundColorAsync).not.toHaveBeenCalled()
    TestRenderer.act(() => renderer.unmount())

    Platform.OS = 'android'
    const second = render()
    expect(mockSetBackgroundColorAsync).toHaveBeenCalledTimes(1)
    TestRenderer.act(() => second.renderer.unmount())
  })

  it('原生调用失败只吞掉，不让渲染崩（装饰性底色不该拖垮 App）', () => {
    mockSetBackgroundColorAsync.mockRejectedValueOnce(new Error('no native module'))
    function Host() {
      const { palette } = useTheme()
      useAndroidWindowBackground(palette)
      return null
    }
    let renderer: TestRenderer.ReactTestRenderer | null = null
    expect(() => {
      TestRenderer.act(() => {
        renderer = TestRenderer.create(
          <ThemeProvider>
            <Host />
          </ThemeProvider>,
        )
      })
    }).not.toThrow()
    TestRenderer.act(() => (renderer as unknown as TestRenderer.ReactTestRenderer).unmount())
  })
})

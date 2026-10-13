// 主题上下文（对标 Web `applyTheme` 的全站换装）：
//   - 明暗三态（浅色/深色/跟随系统，默认跟随系统）与配色（暖纸/票根/竹青）都持久化在
//     本机 SQLite `meta` 表，冷启动读回；`system` 时用 `useColorScheme()` 跟随设备；
//   - `useTheme()` 返回 `{ theme, appearance, scheme, palette, setTheme, setAppearance }`，
//     未挂 Provider 时回退暖纸默认值，保证单测/独立渲染组件不炸；
//   - 每次明暗/配色变化把生效调色板写入 `setActivePalette`，让 `colors` 活对象与
//     `themedStyles` 工厂取到新色值（未逐个接入 useTheme 的组件也能换装）。
// 只做状态与持久化，不含组件样式；样式由各页面按 `palette` 现场构造。

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'

import { getAppRepository } from './db/app'
import { getMeta, setMeta } from './sync/meta'
import {
  APPEARANCE_META_KEY,
  colors,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME,
  paletteFor,
  parseAppearance,
  parseTheme,
  resolveScheme,
  setActivePalette,
  THEME_META_KEY,
  type Appearance,
  type AppTheme,
  type Palette,
  type ThemeScheme,
} from './theme'

export interface ThemeContextValue {
  theme: AppTheme
  appearance: Appearance
  scheme: ThemeScheme
  palette: Palette
  setTheme: (theme: AppTheme) => void
  setAppearance: (appearance: Appearance) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  appearance: DEFAULT_APPEARANCE,
  scheme: 'light',
  palette: colors,
  // 未挂 Provider 时是无副作用的空实现（组件仍按暖纸渲染）。
  setTheme: () => {},
  setAppearance: () => {},
})

/** 冷启动读回上次选择（只读一次，惰性初始化）；本机库不可用时保持默认。 */
function readMeta<T>(key: string, fallback: T, parse: (value: unknown) => T): T {
  try {
    const { db } = getAppRepository()
    return parse(getMeta<unknown>(db, key as Parameters<typeof getMeta>[1]))
  } catch {
    return fallback
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => readMeta(THEME_META_KEY, DEFAULT_THEME, parseTheme))
  const [appearance, setAppearanceState] = useState<Appearance>(() =>
    readMeta(APPEARANCE_META_KEY, DEFAULT_APPEARANCE, parseAppearance),
  )
  const systemScheme = useColorScheme()
  const scheme = resolveScheme(appearance, systemScheme)

  const palette = useMemo(() => {
    const next = paletteFor(theme, scheme)
    // 让 colors 活对象与 themedStyles 工厂取到新色值（在子组件渲染前生效）。
    setActivePalette(next)
    return next
  }, [theme, scheme])

  const setTheme = useCallback((next: AppTheme) => {
    const parsed = parseTheme(next)
    setThemeState(parsed)
    try {
      const { db } = getAppRepository()
      setMeta(db, THEME_META_KEY, parsed)
    } catch {
      // 落库失败只影响下次冷启动，本次切换仍生效。
    }
  }, [])

  const setAppearance = useCallback((next: Appearance) => {
    const parsed = parseAppearance(next)
    setAppearanceState(parsed)
    try {
      const { db } = getAppRepository()
      setMeta(db, APPEARANCE_META_KEY, parsed)
    } catch {
      // 落库失败只影响下次冷启动，本次切换仍生效。
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, appearance, scheme, palette, setTheme, setAppearance }),
    [theme, appearance, scheme, palette, setTheme, setAppearance],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

/**
 * 只订阅、不取色：`themedStyles` 造出来的是**模块级 Proxy**，它在读属性时才按当前调色板
 * 取值，所以组件必须自己重渲染一次，颜色才会跟着明暗换。
 * 依赖主题色的组件（`components/ui.tsx`、各页 `themedStyles`）调用一次即可，
 * 不需要整页 key 强刷，也就不会丢导航栈与表单状态。
 */
export function useThemeSubscription(): void {
  void useContext(ThemeContext)
}

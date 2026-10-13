// 移动端配色（暖纸 / 票根 / 竹青 三浅色 + 单一深色；与现役 Web `src/lib/theme.ts` 三主题同名同源）。
// 仅放色值与触控尺寸常量，不含组件、不 import Expo。
//
// 暗色口径（2026-10-13 用户定 A3）：保留三浅色配色，另加**单一深色**；明暗由
// `Appearance` 三态（浅色 / 深色 / 跟随系统，默认跟随系统）决定，深色下三配色差异不体现。
//
// 全站换装（A3+B1）：`colors` 改为**读当前调色板的活对象**（代理），配合 `themedStyles`
// 的工厂式 StyleSheet，让尚未逐个改造成 `useTheme()` 的组件也能随明暗自动取到新色值；
// 组件只要在明暗变化时重渲染即可（根 Navigator 订阅主题，向下传播）。

export type AppTheme = 'warm' | 'ticket' | 'sage'
/** 明暗色方案（由 Appearance + 系统设置解析得到）。 */
export type ThemeScheme = 'light' | 'dark'
/** 明暗偏好三态。 */
export type Appearance = 'light' | 'dark' | 'system'

export interface Palette {
  paper: string
  card: string
  cardDeep: string
  ink: string
  inkMuted: string
  line: string
  terra: string
  terraDeep: string
  terraSoft: string
  moss: string
  mossSoft: string
  danger: string
  dangerSoft: string
  white: string
}

/** 暖纸手账（默认浅色主题）。 */
const WARM: Palette = {
  paper: '#FBF6EC',
  card: '#FFFDF7',
  cardDeep: '#F2EAD6',
  ink: '#3B342A',
  inkMuted: '#8A7F6D',
  line: '#E9E0CB',
  terra: '#C4602F',
  terraDeep: '#A8491F',
  terraSoft: '#F6E7DC',
  moss: '#6B7A52',
  mossSoft: '#E8EDDD',
  danger: '#B3421F',
  dangerSoft: '#F7E7E0',
  white: '#FFFFFF',
}

const SHARED_ACCENTS = {
  terra: WARM.terra,
  terraDeep: WARM.terraDeep,
  terraSoft: WARM.terraSoft,
  moss: WARM.moss,
  mossSoft: WARM.mossSoft,
  danger: WARM.danger,
  dangerSoft: WARM.dangerSoft,
  white: WARM.white,
} as const

export const PALETTES: Record<AppTheme, Palette> = {
  warm: WARM,
  ticket: {
    ...SHARED_ACCENTS,
    paper: '#F6EFE0',
    card: '#FFFBF2',
    cardDeep: '#E9DAC0',
    ink: '#3B342A',
    inkMuted: '#8A7F6D',
    line: '#E0D0B2',
  },
  sage: {
    ...SHARED_ACCENTS,
    paper: '#F4F6F0',
    card: '#FDFEFB',
    cardDeep: '#E4EBDA',
    ink: '#333A2E',
    inkMuted: '#7C8571',
    line: '#DCE3D1',
  },
}

/** 深色（单一）：暖调纸感深底，强调色提亮以保对比度。 */
export const DARK_PALETTE: Palette = {
  paper: '#171512',
  card: '#211E19',
  cardDeep: '#2A2620',
  ink: '#ECE5D8',
  inkMuted: '#9C9484',
  line: '#37322A',
  terra: '#E08150',
  terraDeep: '#E89A6E',
  terraSoft: '#3A2A20',
  moss: '#A7BA86',
  mossSoft: '#2A3320',
  danger: '#E5734E',
  dangerSoft: '#3A2620',
  white: '#FFFFFF',
}

// ── 活调色板（全站换装的单一来源）────────────────────────────────────────────

let active: Palette = WARM

/** 当前生效调色板（ThemeProvider 在明暗/配色变化时写入）。 */
export function activePalette(): Palette {
  return active
}

export function setActivePalette(palette: Palette): void {
  active = palette
}

/**
 * 兼容旧 `import { colors }` 的活对象：读当前调色板。
 * 配合 `themedStyles` 使用，未逐个改造成 useTheme 的组件也能随明暗取到新色值。
 */
export const colors: Palette = new Proxy({} as Palette, {
  get: (_target, prop) => (active as unknown as Record<string, unknown>)[prop as string],
}) as Palette

/**
 * 工厂式 StyleSheet：`themedStyles(() => StyleSheet.create({ ... colors ... }))`。
 * 按当前调色板缓存，明暗变化后首次访问即重建。
 */
export function themedStyles<T extends object>(build: () => T): T {
  let cache: { palette: Palette; value: T } | null = null
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!cache || cache.palette !== active) cache = { palette: active, value: build() }
      return Reflect.get(cache.value as object, prop, receiver)
    },
  })
}

/** 主题清单（名称与 Web `APP_THEMES` 逐字一致，供 Mine 的切换器展示）。 */
export const APP_THEMES: { id: AppTheme; name: string; swatch: string }[] = [
  { id: 'warm', name: '暖纸手账', swatch: '#efe7d7' },
  { id: 'ticket', name: '票根台账', swatch: '#e9dac0' },
  { id: 'sage', name: '竹青园林', swatch: '#f4f6f0' },
]

/** 明暗三态清单（供 Mine 展示）。 */
export const APPEARANCE_OPTIONS: { id: Appearance; name: string }[] = [
  { id: 'light', name: '浅色' },
  { id: 'dark', name: '深色' },
  { id: 'system', name: '跟随系统' },
]

export const DEFAULT_THEME: AppTheme = 'warm'
export const DEFAULT_APPEARANCE: Appearance = 'system'

/** meta 表键名（本地持久化当前主题 / 明暗）。 */
export const THEME_META_KEY = 'app_theme'
export const APPEARANCE_META_KEY = 'app_appearance'

export function isAppTheme(value: unknown): value is AppTheme {
  return value === 'warm' || value === 'ticket' || value === 'sage'
}

export function isAppearance(value: unknown): value is Appearance {
  return value === 'light' || value === 'dark' || value === 'system'
}

/** 任意值 → 合法主题；未知/空一律回退默认主题（老库无此键时同口径）。 */
export function parseTheme(value: unknown): AppTheme {
  return isAppTheme(value) ? value : DEFAULT_THEME
}

/** 任意值 → 合法明暗；未知/空一律回退「跟随系统」。 */
export function parseAppearance(value: unknown): Appearance {
  return isAppearance(value) ? value : DEFAULT_APPEARANCE
}

/** 明暗偏好 + 系统方案 → 实际浅/深（system 时跟随系统，其余原样）。 */
export function resolveScheme(appearance: Appearance, systemScheme: string | null | undefined): ThemeScheme {
  if (appearance === 'system') return systemScheme === 'dark' ? 'dark' : 'light'
  return appearance
}

/** 主题 + 明暗 → 调色板（未知主题回退默认；深色恒返回单一深色调色板）。 */
export function paletteFor(theme: AppTheme | string | null | undefined, scheme: ThemeScheme = 'light'): Palette {
  if (scheme === 'dark') return DARK_PALETTE
  return PALETTES[parseTheme(theme)]
}

/** 移动端最小触控高度（Android 推荐 48dp，此处取 44+）。 */
export const TOUCH_HEIGHT = 48

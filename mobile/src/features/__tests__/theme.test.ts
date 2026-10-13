// 主题三调色板与解析（对齐 Web `src/lib/theme.ts` 的 APP_THEMES 口径）。

import {
  APP_THEMES,
  APPEARANCE_OPTIONS,
  colors,
  DARK_PALETTE,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME,
  isAppTheme,
  isAppearance,
  paletteFor,
  PALETTES,
  parseAppearance,
  parseTheme,
  resolveScheme,
  THEME_META_KEY,
} from '../../theme'

describe('theme: 三主题调色板', () => {
  it('三主题齐全，名称与 Web 一致；colors 活对象默认取 warm', () => {
    expect(APP_THEMES.map((t) => t.id)).toEqual(['warm', 'ticket', 'sage'])
    expect(APP_THEMES.map((t) => t.name)).toEqual(['暖纸手账', '票根台账', '竹青园林'])
    expect(colors.paper).toBe(PALETTES.warm.paper)
  })

  it('每套调色板字段完整且为合法色值；强调色三主题共用', () => {
    for (const { id } of APP_THEMES) {
      const p = PALETTES[id]
      for (const value of Object.values(p)) {
        expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
      expect(p.terra).toBe(PALETTES.warm.terra)
      expect(p.danger).toBe(PALETTES.warm.danger)
    }
  })

  it('纸底/卡面/分隔线三主题各不相同（换装可见）', () => {
    const papers = new Set(APP_THEMES.map((t) => PALETTES[t.id].paper))
    expect(papers.size).toBe(3)
  })
})

describe('theme: 深色与明暗三态', () => {
  it('深色调色板字段完整合法，且与浅色纸底不同', () => {
    for (const value of Object.values(DARK_PALETTE)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
    expect(DARK_PALETTE.paper).not.toBe(PALETTES.warm.paper)
  })

  it('paletteFor：深色恒返回单一深色调色板，浅色按配色', () => {
    expect(paletteFor('sage', 'dark')).toBe(DARK_PALETTE)
    expect(paletteFor('sage', 'light')).toBe(PALETTES.sage)
    expect(paletteFor('garbage', 'light')).toBe(PALETTES.warm)
  })

  it('resolveScheme：system 跟随设备，其余原样', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark')
    expect(resolveScheme('system', 'light')).toBe('light')
    expect(resolveScheme('system', null)).toBe('light')
    expect(resolveScheme('dark', 'light')).toBe('dark')
    expect(resolveScheme('light', 'dark')).toBe('light')
  })

  it('parseAppearance：非法/空回退「跟随系统」', () => {
    expect(parseAppearance('dark')).toBe('dark')
    expect(parseAppearance('weird')).toBe(DEFAULT_APPEARANCE)
    expect(parseAppearance(null)).toBe(DEFAULT_APPEARANCE)
    expect(DEFAULT_APPEARANCE).toBe('system')
  })

  it('isAppearance 只认三个合法 id；明暗选项齐全', () => {
    expect(isAppearance('system')).toBe(true)
    expect(isAppearance('nope')).toBe(false)
    expect(APPEARANCE_OPTIONS.map((o) => o.id)).toEqual(['light', 'dark', 'system'])
  })
})

describe('theme: 解析与持久化键', () => {
  it('parseTheme：合法值原样返回，未知/空/非串回退默认', () => {
    expect(parseTheme('ticket')).toBe('ticket')
    expect(parseTheme('sage')).toBe('sage')
    expect(parseTheme('blue')).toBe(DEFAULT_THEME)
    expect(parseTheme(null)).toBe(DEFAULT_THEME)
    expect(parseTheme(undefined)).toBe(DEFAULT_THEME)
    expect(parseTheme(42)).toBe(DEFAULT_THEME)
  })

  it('isAppTheme 只认三个合法 id', () => {
    expect(isAppTheme('warm')).toBe(true)
    expect(isAppTheme('nope')).toBe(false)
  })

  it('paletteFor 对任意输入都返回调色板', () => {
    expect(paletteFor('ticket')).toBe(PALETTES.ticket)
    expect(paletteFor('garbage')).toBe(PALETTES.warm)
    expect(paletteFor(null)).toBe(PALETTES.warm)
  })

  it('持久化键与 meta 表约定一致', () => {
    expect(THEME_META_KEY).toBe('app_theme')
  })
})

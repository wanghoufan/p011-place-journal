// P1·L3-64 公开分享链接单测（纯逻辑，零 mock）：URL 形态、slug/基址守卫、撤销拒绝、
// 分享文案只带白名单载荷。URL 构造与过滤全部真实执行。

import {
  DEFAULT_WEB_BASE_URL,
  PUBLIC_SHARE_PREFIX,
  ShareLinkError,
  assertShareable,
  assertShareSlug,
  buildPublicShareUrl,
  buildShareMessage,
  isPublicShareUrl,
  normalizeWebBaseUrl,
  publicSharePath,
  resolveWebBaseUrl,
} from '../shareLink'

/** 19 位、只含 [A-Za-z0-9_-]（≥16 位口径）。 */
const SLUG = 'aB3xY9_mnopQRstuv12'

const SINGLE = { kind: 'single' as const, slug: SLUG, status: 'active' as const }
const LIST = { kind: 'list' as const, slug: SLUG, status: 'active' as const }

describe('公开 URL 形态', () => {
  it('单条分享：域名 + /s/p/ + 16 位以上 slug，无 query/hash/entry id', () => {
    const url = buildPublicShareUrl(SINGLE)
    expect(url).toBe(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}`)
    expect(url).toMatch(/^https:\/\/place-journal-xi\.vercel\.app\/s\/p\/[A-Za-z0-9_-]{16,}$/)
    expect(url).not.toContain('?')
    expect(url).not.toContain('#')
    expect(isPublicShareUrl(url)).toBe(true)
  })

  it('合集分享走 /s/l/ 前缀（与 Web src/lib/shares.ts 逐字一致）', () => {
    expect(PUBLIC_SHARE_PREFIX.single).toBe('/s/p/')
    expect(PUBLIC_SHARE_PREFIX.list).toBe('/s/l/')
    expect(publicSharePath('list', SLUG)).toBe(`/s/l/${SLUG}`)
    expect(buildPublicShareUrl(LIST)).toBe(`${DEFAULT_WEB_BASE_URL}/s/l/${SLUG}`)
    expect(isPublicShareUrl(buildPublicShareUrl(LIST))).toBe(true)
  })

  it('slug 恰好 16 位可出链，15 位被拒', () => {
    expect(buildPublicShareUrl({ ...SINGLE, slug: 'a'.repeat(16) })).toMatch(/\/s\/p\/a{16}$/)
    expect(() => buildPublicShareUrl({ ...SINGLE, slug: 'a'.repeat(15) })).toThrow(ShareLinkError)
  })

  it('slug 含路径分隔符 / 查询串 / 空值一律被拒（防注入与穿越）', () => {
    for (const bad of ['', 'short', 'abcdefghij12345/', 'abcdefghij12345?', 'abcdefghij12345#', 'a'.repeat(65), '中文中文中文中文中文中文中文']) {
      expect(() => assertShareSlug(bad)).toThrow(ShareLinkError)
      expect(() => buildPublicShareUrl({ ...SINGLE, slug: bad })).toThrow(ShareLinkError)
    }
  })

  it('未知 kind 被拒，不会退化成空路径', () => {
    expect(() => publicSharePath('unknown' as never, SLUG)).toThrow(ShareLinkError)
  })
})

describe('基址守卫', () => {
  it('缺省/空白回退生产域名；尾斜杠被去掉', () => {
    expect(normalizeWebBaseUrl(undefined)).toBe(DEFAULT_WEB_BASE_URL)
    expect(normalizeWebBaseUrl('   ')).toBe(DEFAULT_WEB_BASE_URL)
    expect(normalizeWebBaseUrl('https://example.com/')).toBe('https://example.com')
  })

  it('非 https（且非本机 http）一律拒绝，避免把明文地址发出去', () => {
    expect(() => normalizeWebBaseUrl('http://evil.example.com')).toThrow(ShareLinkError)
    expect(() => normalizeWebBaseUrl('ftp://example.com')).toThrow(ShareLinkError)
    expect(normalizeWebBaseUrl('http://localhost:5173')).toBe('http://localhost:5173')
    expect(normalizeWebBaseUrl('http://127.0.0.1')).toBe('http://127.0.0.1')
  })

  it('非法 EXPO_PUBLIC_WEB_BASE_URL 回退生产域名，不炸', () => {
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: 'not-a-url' })).toBe(DEFAULT_WEB_BASE_URL)
    expect(resolveWebBaseUrl({ EXPO_PUBLIC_WEB_BASE_URL: 'https://staging.example.com' })).toBe(
      'https://staging.example.com',
    )
    expect(resolveWebBaseUrl({})).toBe(DEFAULT_WEB_BASE_URL)
  })
})

describe('已撤销快照拒绝出链', () => {
  it('assertShareable 对 active 放行、对 revoked 抛 ShareLinkError', () => {
    expect(() => assertShareable({ status: 'active' })).not.toThrow()
    expect(() => assertShareable({ status: 'revoked' })).toThrow(ShareLinkError)
    expect(() => assertShareable({ status: 'revoked' })).toThrow('分享已撤销，链接已失效')
  })

  it('buildPublicShareUrl 对 revoked 不产出任何 URL', () => {
    expect(() => buildPublicShareUrl({ ...SINGLE, status: 'revoked' })).toThrow('分享已撤销，链接已失效')
    expect(() => buildShareMessage({ ...SINGLE, title: '西海岸日落咖啡', status: 'revoked' })).toThrow(
      ShareLinkError,
    )
  })
})

describe('ShareSheet 文案只带白名单载荷', () => {
  it('有标题：标题 + 换行 + URL（URL 是唯一链接载荷）', () => {
    const message = buildShareMessage({ ...SINGLE, title: '西海岸日落咖啡' })
    expect(message).toBe(`西海岸日落咖啡\n${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}`)
    expect(message.split('\n')).toHaveLength(2)
    expect(message).toContain(DEFAULT_WEB_BASE_URL)
  })

  it('空/全空白标题退化为纯 URL', () => {
    expect(buildShareMessage({ ...SINGLE, title: '' })).toBe(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}`)
    expect(buildShareMessage({ ...SINGLE, title: '   ' })).toBe(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}`)
  })
})

describe('isPublicShareUrl 把关（分享页打开外链前）', () => {
  it('只认本 App 构造的公开页：域名 + 前缀 + 合法 slug', () => {
    expect(isPublicShareUrl(buildPublicShareUrl(SINGLE))).toBe(true)
    expect(isPublicShareUrl(buildPublicShareUrl(LIST))).toBe(true)
  })

  it('带 query/hash、错域名、非 /s/ 路径、坏 slug 一律不认', () => {
    expect(isPublicShareUrl(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}?x=1`)).toBe(false)
    expect(isPublicShareUrl(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}#top`)).toBe(false)
    expect(isPublicShareUrl(`https://evil.example.com/s/p/${SLUG}`)).toBe(false)
    expect(isPublicShareUrl(`${DEFAULT_WEB_BASE_URL}/entry/123`)).toBe(false)
    expect(isPublicShareUrl(`${DEFAULT_WEB_BASE_URL}/s/p/tooshort`)).toBe(false)
    expect(isPublicShareUrl('not a url')).toBe(false)
    expect(isPublicShareUrl(`${DEFAULT_WEB_BASE_URL}/s/p/${SLUG}/../../admin`)).toBe(false)
  })
})

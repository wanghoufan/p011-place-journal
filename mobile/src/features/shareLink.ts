// 公开分享链接构造（DoD›分享 / R-12）。
//
// 为什么不自己再造公开页：Web 端已有可用的匿名公开页与路由形态，本模块只负责拼 URL。
// 形态依据（仓库内实查，非猜测）：
//   - Web 路由 `src/App.tsx`：`/s/p/:slug`（单条 ShareSingle）、`/s/l/:slug`（合集 ShareList）；
//   - Web 分享链接生成 `src/lib/shares.ts` `shareUrl()`：`kind==='single' ? '/s/p/' : '/s/l/'`；
//   - 线上部署域名 `https://place-journal-xi.vercel.app`（`README.md:7`、`mobile/.env.example`
//     的 `EXPO_PUBLIC_WEB_BASE_URL`），`vercel.json` 对 `/s/(.*)` 单独下发
//     `X-Robots-Tag: noindex` 与 `Cache-Control: no-store`——即该前缀就是线上公开页前缀。
//
// 隐私边界（本文件唯一的职责）：
//   公开 URL 里**只有 base + `/s/p|l/` + slug**，不拼任何 query、不拼 entry id、
//   不拼媒体 URL、不拼坐标。匿名访客拿到 URL 后由 Web 页经云端 RPC
//   `public_share_read(p_slug)` 只取 status='active' 的白名单快照；
//   revoke 后该 RPC 返回空 → 链接读不到。这里能做的是「保证 URL 本身不泄密」，
//   服务端过滤由既有 RPC 负责（见交付报告）。
//
// 纯逻辑、无 Expo 依赖，便于单测直接覆盖 slug/base 守卫与 URL 形态。

import type { ShareKind, ShareSnapshot } from '../domain/types'

/** Web 端 `src/lib/shares.ts` 的两种公开前缀（逐字对齐，勿单方面改）。 */
export const PUBLIC_SHARE_PREFIX: Record<ShareKind, string> = {
  single: '/s/p/',
  list: '/s/l/',
}

/**
 * 生产部署基址（`README.md:7` 与 `mobile/.env.example` 同值）。
 * 仅作缺省回退：线上可用 `EXPO_PUBLIC_WEB_BASE_URL` 覆盖（本地联调指向 5173/8081）。
 */
export const DEFAULT_WEB_BASE_URL = 'https://place-journal-xi.vercel.app'

/** slug 口径：与云端 `share_snapshots.slug` CHECK（≥16 位 [A-Za-z0-9_-]）一致。 */
const SLUG_PATTERN = /^[A-Za-z0-9_-]{16,64}$/

/** 本机开发可指向明文 http（localhost/127.0.0.1），其余一律要求 https。 */
const LOCAL_HTTP_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/

export class ShareLinkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ShareLinkError'
  }
}

/** slug 守卫：拒绝空、短、含路径分隔符/查询串的 slug（防枚举之外的注入与穿越）。 */
export function assertShareSlug(slug: unknown): string {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    throw new ShareLinkError('分享 slug 非法，无法生成公开链接')
  }
  return slug
}

/**
 * 归一 Web 基址：去尾斜杠；非 https（且非本机 http）一律拒绝，避免把明文/错域名发出去。
 */
export function normalizeWebBaseUrl(raw: string | undefined | null): string {
  const value = (raw ?? '').trim()
  if (value.length === 0) return DEFAULT_WEB_BASE_URL
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  if (!/^https:\/\/[^\s/?#]+$/i.test(withoutTrailingSlash) && !LOCAL_HTTP_PATTERN.test(withoutTrailingSlash)) {
    throw new ShareLinkError(`Web 基址非法：${value}`)
  }
  return withoutTrailingSlash
}

/** 运行时基址：读 `EXPO_PUBLIC_WEB_BASE_URL`，缺省/非法回退生产域名。 */
export function resolveWebBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.EXPO_PUBLIC_WEB_BASE_URL
  try {
    return normalizeWebBaseUrl(raw)
  } catch {
    return DEFAULT_WEB_BASE_URL
  }
}

/** 公开路径：`/s/p/<slug>` 或 `/s/l/<slug>`。 */
export function publicSharePath(kind: ShareKind, slug: string): string {
  const prefix = PUBLIC_SHARE_PREFIX[kind]
  if (!prefix) throw new ShareLinkError(`未知的分享类型：${String(kind)}`)
  return `${prefix}${assertShareSlug(slug)}`
}

/**
 * 已撤销的分享不再产出链接（客户端侧第一道闸）。
 *
 * 双保险说明：客户端拦只是体验闸，真正的「读不到」由云端 `public_share_read` 只返回
 * `status='active'` 保证；即便这里被绕过，撤销后的链接也取不到内容。
 */
export function assertShareable(snapshot: Pick<ShareSnapshot, 'status'>): void {
  if (snapshot.status === 'revoked') throw new ShareLinkError('分享已撤销，链接已失效')
}

/** 公开 URL 全文。链接里除 slug 外不含任何记录内容。 */
export function buildPublicShareUrl(
  snapshot: Pick<ShareSnapshot, 'kind' | 'slug' | 'status'>,
  baseUrl?: string,
): string {
  assertShareable(snapshot)
  return `${normalizeWebBaseUrl(baseUrl)}${publicSharePath(snapshot.kind, snapshot.slug)}`
}

/** 系统分享面板的文案：标题 + 链接。链接仍是唯一载荷。 */
export function buildShareMessage(snapshot: Pick<ShareSnapshot, 'kind' | 'slug' | 'title' | 'status'>, baseUrl?: string): string {
  const url = buildPublicShareUrl(snapshot, baseUrl)
  const title = snapshot.title.trim()
  return title.length > 0 ? `${title}\n${url}` : url
}

/**
 * 该 URL 是否是「本 App 构造的公开分享链接」（分享页打开外部链接前用它把关，
 * 避免把任意地址当成自家公开页去展示）。
 */
export function isPublicShareUrl(url: string, baseUrl?: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (`${parsed.protocol}//${parsed.host}` !== normalizeWebBaseUrl(baseUrl)) return false
  const prefix = parsed.pathname.startsWith('/s/l/') ? PUBLIC_SHARE_PREFIX.list : parsed.pathname.startsWith('/s/p/') ? PUBLIC_SHARE_PREFIX.single : null
  if (!prefix) return false
  const slug = parsed.pathname.slice(prefix.length)
  // 公开页不接受任何 query/hash：带了就说明链接被塞过额外参数，不当作合法公开链接。
  return parsed.search === '' && parsed.hash === '' && SLUG_PATTERN.test(slug)
}
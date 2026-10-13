// 分享发布状态（P1·L3-64）：本地快照 → 公开链接「现在能不能被访客打开」。
//
// 为什么需要这一层：匿名公开页由 Web 端经云端 RPC `public_share_read(slug)` 读
// `status='active'` 的快照（见仓库根 `src/lib/shares.ts`），而移动端只做「本地落库 +
// outbox 入队」。登录同步成功之前，URL 形态完全合法（base + `/s/p|l/` + slug），
// 访客打开却是空页。UI 必须把这件事说清楚，而不是让用户以为分享已经生效。
//
// 判定口径（全本地、零网络、纯逻辑）：
//   1. 云端未配置（`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
//      缺一）→ `cloud_unconfigured`。判据与 `supabase/native.ts` 的
//      `isSupabaseConfigured()` 一致；这里直接读 `process.env.EXPO_PUBLIC_*` 成员表达式，
//      才能被 Expo 打包时内联（同 `features/organise.ts` 的 `aiApiBase()` 写法），
//      单测走 `env` 参数注入，不依赖进程环境。
//   2. outbox 里该快照的 `create_share` op 仍在（push 成功即删行，见 `sync/outbox.ts`
//      的 `complete()`）→ `pending_push`。
//   3. 否则 → `published`。
//
// 只 import SQLite 最小接口，不碰 Expo/Supabase 原生模块，单测直接跑真库。

import type { SqlDatabase } from '../db/database'

/** 发布状态：未配置云端 / 已入队未发布 / 已发布。 */
export type SharePublicationState = 'cloud_unconfigured' | 'pending_push' | 'published'

/** 云端配置环境变量（可注入，便于单测；不传则静态读 `process.env`）。 */
export interface ShareCloudEnv {
  EXPO_PUBLIC_SUPABASE_URL?: string
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
}

/** 静态读环境变量：`process.env.EXPO_PUBLIC_*` 必须以成员表达式直读，才能被打包内联。 */
function readCloudEnv(): ShareCloudEnv {
  return {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

/** 云端是否已配置（与 `supabase/native.ts` `isSupabaseConfigured()` 同判据：URL+key 都非空）。 */
export function isShareCloudConfigured(env: ShareCloudEnv = readCloudEnv()): boolean {
  const url = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim()
  return url.length > 0 && key.length > 0
}

/**
 * 该快照当前的发布状态。
 * @param snapshotId `share_snapshots.id`（`create_share` op 的 entity_id 就是它）。
 */
export function sharePublicationState(
  db: SqlDatabase,
  snapshotId: string,
  env?: ShareCloudEnv,
): SharePublicationState {
  if (!isShareCloudConfigured(env ?? readCloudEnv())) return 'cloud_unconfigured'
  const row = db.getFirstSync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox WHERE kind = 'create_share' AND entity_id = ?",
    snapshotId,
  )
  return (row?.n ?? 0) > 0 ? 'pending_push' : 'published'
}

/**
 * UI 文案：告诉分享者「链接现在能不能被打开」。`published` 为空串＝不打扰。
 * 撤销态不走这里（撤销由 `shareLink.assertShareable` 拦，见 `shareActions`）。
 */
export const SHARE_PUBLICATION_HINT: Record<SharePublicationState, string> = {
  cloud_unconfigured: '本机未配置云端同步，公开链接暂时打不开；配置并登录同步成功后生效。',
  pending_push: '快照已入同步队列（尚未发布到云端），登录并同步成功后链接才能被访客打开。',
  published: '',
}

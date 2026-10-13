// Auth 回调终态 → 回主界面的去向（纯函数，单测直接锁三条终态）。
//
// 缺陷背景：真实设备 3/3 复现「Google 授权成功后卡在 `auth/callback` 页，只显示『登录成功。』，
// 底栏 Tab 全程不可见，必须手动点返回箭头」——deep link 会把 `/auth/callback` 压到 Tab 栈之上，
// 而本页此前只 `setState` 展示文案，没有任何出栈动作。
//
// 口径：
//   - `succeeded` / `duplicate` / `owner_mismatch` → 去 Mine（登录中心：同步状态、绑定、
//     退出入口都在那一页，用户落地即可看到结果）；
//   - 其它终态（`cancelled` / `terminal_reauth` / `error` / `invalid`）→ 去画廊首页（主界面）；
//   - `pending` 不是终态，不跳转（页面正在处理回调，此时出栈等于把结果丢掉）。
//
// 本函数**不碰**回调去重/换码语义：`handleCallback` 的调用与顺序完全不变，
// 这里只决定「处理完之后导航到哪」，所以「重复回调不重复换码」不会被破坏。

import type { CallbackOutcome } from '../supabase/auth'

/** 回主界面后的落地页标识。 */
export type AuthReturnTarget = 'pending' | 'mine' | 'home'

/**
 * 落地页路径。字面量联合类型（不是 `string`），可直接喂给开启 typedRoutes 的
 * `router.replace()`，不需要任何类型压制。
 */
export type AuthReturnRoute = '/(tabs)/mine' | '/(tabs)'

export const MINE_ROUTE: AuthReturnRoute = '/(tabs)/mine'
export const HOME_ROUTE: AuthReturnRoute = '/(tabs)'

/** 落地页标识 → expo-router 路径。 */
export function authReturnRoute(target: AuthReturnTarget): AuthReturnRoute {
  return target === 'mine' ? MINE_ROUTE : HOME_ROUTE
}

/** 由回调结果推出落地页。 */
export function authReturnTarget(outcome: CallbackOutcome | null): AuthReturnTarget {
  if (!outcome) return 'pending'
  switch (outcome.status) {
    case 'succeeded':
    case 'duplicate':
    case 'owner_mismatch':
      return 'mine'
    default:
      // cancelled / terminal_reauth / error / invalid 一律回主界面。
      return 'home'
  }
}
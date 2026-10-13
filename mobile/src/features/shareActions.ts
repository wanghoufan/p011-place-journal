// 系统分享面板与剪贴板（TDoD›分享：Android Share Sheet 正常 + 复制链接）。
//
// 取舍说明：
//   - **不引入 `expo-sharing` / `react-native-share`**：它们是「分享本地文件」的原生模块，
//     而本需求要分享的是一个 https 链接。React Native 自带的 `Share.share({ message })`
//     在 Android 上调起的正是系统分享面板（ACTION_SEND / chooser），零新依赖、零新增原生模块。
//   - **引入 `expo-clipboard`**：RN 的 `Clipboard` 已被移除，只能用 expo-clipboard 复制链接。
//     它是原生模块，**需要重新构建 APK 才生效**（JS 侧改动用 Metro 热更新即可）。
//
// 本文件是唯一 import `react-native` Share / `expo-clipboard` 的分享侧文件，
// 便于把「URL 构造」与「平台调用」分层单测。

import * as Clipboard from 'expo-clipboard'
import { Share } from 'react-native'

import {
  buildPublicShareUrl,
  buildShareMessage,
  resolveWebBaseUrl,
  ShareLinkError,
} from './shareLink'
import type { ShareSnapshot } from '../domain/types'

/** 分享动作结果：shared=面板成功；dismissed=用户取消；copied=已复制；failed=失败。 */
export type ShareOutcome = 'shared' | 'dismissed' | 'copied' | 'failed'

export interface ShareResult {
  outcome: ShareOutcome
  /** 实际分享/复制的 URL（成功时非空），便于 UI 直接展示。 */
  url: string
  /** 失败原因（outcome='failed'）。 */
  error?: string
}

function fail(error: unknown, url = ''): ShareResult {
  return { outcome: 'failed', url, error: error instanceof Error ? error.message : String(error) }
}

/** 调起系统分享面板（Android ACTION_SEND chooser）。用户取消不算失败。 */
export async function openSystemShareSheet(snapshot: Pick<ShareSnapshot, 'kind' | 'slug' | 'title' | 'status'>): Promise<ShareResult> {
  let url = ''
  try {
    url = buildPublicShareUrl(snapshot)
  } catch (err) {
    return fail(err)
  }
  try {
    const result = await Share.share({ message: buildShareMessage(snapshot), url })
    return { outcome: result.action === Share.dismissedAction ? 'dismissed' : 'shared', url }
  } catch (err) {
    return fail(err, url)
  }
}

/** 复制公开链接到系统剪贴板。 */
export async function copyPublicShareUrl(snapshot: Pick<ShareSnapshot, 'kind' | 'slug' | 'status'>): Promise<ShareResult> {
  let url = ''
  try {
    url = buildPublicShareUrl(snapshot)
    await Clipboard.setStringAsync(url)
    return { outcome: 'copied', url }
  } catch (err) {
    return fail(err, url)
  }
}

/** 打开公开链接到系统浏览器（用 expo-linking，只做 openURL，不劫持返回栈）。 */
export async function openPublicSharePage(snapshot: Pick<ShareSnapshot, 'kind' | 'slug' | 'status'>): Promise<ShareResult> {
  let url = ''
  try {
    url = buildPublicShareUrl(snapshot)
    const Linking = await import('expo-linking')
    if (!Linking.canOpenURL(url)) throw new ShareLinkError('系统无法打开该链接')
    await Linking.openURL(url)
    return { outcome: 'shared', url }
  } catch (err) {
    return fail(err, url)
  }
}

/** 当前生效的 Web 基址（UI 展示「公开链接域名」用）。 */
export function publicShareBaseUrl(): string {
  return resolveWebBaseUrl()
}
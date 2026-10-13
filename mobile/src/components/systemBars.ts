// 系统栏（顶部状态栏 + 底部导航条区域）的明暗策略（L3-39）。
//
// 为什么需要单独处理：
// 本工程 targetSdk 36，Android 15（API 35）起 edge-to-edge **强制**开启，
// `android:statusBarColor` / `android:navigationBarColor` 一律被系统忽略
// （android/app/src/main/res/values/styles.xml 里本来就写的是 transparent），
// 系统栏是透明层，真正露出来的是**窗口 decorView 自身的背景**。
// 而窗口背景来自 `Theme.AppCompat.DayNight`，跟的是**系统**深浅，不是应用内的主题三态；
// `values-night/colors.xml` 又是空的，深色下拿到的是 AppCompat 的深灰而不是我们的纸色。
// 于是「应用内=深色、系统=浅色」时，凡是我们的视图没画到的地方就是白底：
//   - 记录详情 / 地点详情这类**有原生页头**的页，状态栏那条由原生页头所在的窗口区域负责；
//   - 非 tab 页（没有底部标签栏铺到底）底部系统导航条同样露出窗口背景。
// 四个主 tab 页正常，是因为它们的标签栏与根 View 一直画到了屏幕边缘。
//
// 修法：用已在依赖里的 `expo-system-ui`。它的 `setBackgroundColorAsync` 就是
// `window.decorView.setBackgroundColor(color)`，把窗口底色按当前调色板的 `paper` 刷一遍，
// 与 JS 侧 `palette.paper` 严格同色 —— 不引入新依赖，不重建 Activity，不动任何布局。

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import type { Palette, ThemeScheme } from '../theme';

/**
 * 状态栏图标明暗：深色底要浅色图标，浅色底要深色图标。
 * `expo-status-bar` 57 的 `StatusBarProps` 已经没有 `backgroundColor`（SDK 57 起 Android
 * 强制 edge-to-edge，RN 的 `StatusBarModule.setColor` 在 edge-to-edge 下直接被忽略），
 * 所以它只剩「图标明暗」这一件事可做，底色归上面的窗口底色管。
 */
export function statusBarIconStyle(scheme: ThemeScheme): 'light' | 'dark' {
  return scheme === 'dark' ? 'light' : 'dark';
}

/** 只有 Android 需要刷窗口底色（iOS 无窗口底色概念，Web 由 CSS 变量负责）。 */
export function needsWindowBackground(os: string): boolean {
  return os === 'android';
}

/**
 * 把 Android 窗口底色对齐到当前调色板的纸色，随明暗切换即时生效。
 *
 * 同一个纸色不重复调原生（`useRef` 记上次应用的值）；原生调用失败（Web / 原生模块缺失）
 * 只吞掉，不阻断渲染 —— 底色只是装饰，失败时退回系统默认白底，不该让 App 崩。
 */
export function useAndroidWindowBackground(palette: Palette): void {
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!needsWindowBackground(Platform.OS)) return;
    if (applied.current === palette.paper) return;
    applied.current = palette.paper;
    void SystemUI.setBackgroundColorAsync(palette.paper).catch(() => {});
  }, [palette.paper]);
}

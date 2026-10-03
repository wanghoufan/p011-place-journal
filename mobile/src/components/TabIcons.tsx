// 底部 tab 图标（TASK-DEV-UI）：1:1 移植 Web/PWA `src/components/Nav.tsx` 的内联 SVG。
//
// 为什么不用 @expo/vector-icons / expo-symbols：
//   1) PWA 是手写 SVG（24×24 viewBox、stroke 1.8、round cap/join），换图标库就对不齐「参考 PWA」；
//   2) 缺 tabBarIcon 时 expo-router 57 渲染内置占位符 ⏷(U+23F7)，两台机器因字体 fallback
//      不同一台空白一台豆腐块（同一 APK、同一 UI 树，非版本分裂）。改用 react-native-svg 画矢量
//      路径，彻底不依赖字体字形，从根上消除这类问题。
// 颜色沿用 PWA 的激活/未激活两态，且跟当前主题走（对齐 PWA 的 --c-terra / --c-inkmuted）。

import Svg, { Circle, Path, Rect } from 'react-native-svg'

export const TAB_ICON_SIZE = 24
const STROKE_WIDTH = 1.8

type IconProps = { color: string; size?: number }

function Frame({ color, size = TAB_ICON_SIZE, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  )
}

/** 画廊：相框 + 圆点 + 山形折线（同 PWA IconGallery）。 */
export function TabIconGallery(props: IconProps) {
  return (
    <Frame {...props}>
      <Rect x={3} y={4} width={18} height={16} rx={3} />
      <Circle cx={9} cy={10} r={1.6} />
      <Path d="M4 18l5-5 4 4 3-3 4 4" />
    </Frame>
  )
}

/** 发现：定位针 + 圆心（同 PWA IconFind；PWA 标签是「找地点」，移动端叫「发现」）。 */
export function TabIconFind(props: IconProps) {
  return (
    <Frame {...props}>
      <Path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
      <Circle cx={12} cy={10} r={2.6} />
    </Frame>
  )
}

/** 我的：头肩像（同 PWA IconMine）。 */
export function TabIconMine(props: IconProps) {
  return (
    <Frame {...props}>
      <Circle cx={12} cy={8} r={3.6} />
      <Path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
    </Frame>
  )
}

/**
 * 记录：PWA 端是悬浮主按钮（纯文字「记录」，无图标），移动端是普通 tab，故补一支铅笔。
 * 图形族与上面三个一致（均取自 Lucide/Feather 24×24 线性图标集），viewBox 与描边保持同一套。
 */
export function TabIconRecord(props: IconProps) {
  return (
    <Frame {...props}>
      <Path d="M20.5 6.5l-3-3L6 15v3h3l11.5-11.5z" />
      <Path d="M15 5.5l3.5 3.5" />
    </Frame>
  )
}


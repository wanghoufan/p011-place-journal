// tab 图标回归测试：锁死「4 个 tab 都有真矢量图标」，防止回退到 expo-router 内置占位符 ⏷(U+23F7)。
// 背景见 HANDOFF §0.A.2：缺 tabBarIcon 时两台真机因字体 fallback 不同，一台空白一台豆腐块。
// 沿用本仓约定用 react-test-renderer 直出断言（jest-expo 下无法按组件名查找）。

import TestRenderer from 'react-test-renderer'
import type { ReactTestRendererJSON } from 'react-test-renderer'

import { TabIconFind, TabIconGallery, TabIconMine, TabIconRecord, TAB_ICON_SIZE } from '../TabIcons'

type Node = ReactTestRendererJSON

const ICONS = [
  ['画廊', TabIconGallery],
  ['记录', TabIconRecord],
  ['发现', TabIconFind],
  ['我的', TabIconMine],
] as const

function renderIcon(Icon: (p: { color: string; size?: number }) => React.JSX.Element, color: string): Node {
  let renderer: TestRenderer.ReactTestRenderer | null = null
  TestRenderer.act(() => {
    renderer = TestRenderer.create(<Icon color={color} />)
  })
  return renderer!.toJSON() as Node
}

/** 深度遍历，收集所有 type 以给定字符串结尾的节点（react-native-svg 渲染出的是 'RNSVGSvgView' 之类 host 节点）。 */
function collectTypes(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out))
  } else if (node && typeof node === 'object') {
    const n = node as { type?: unknown; children?: unknown }
    if (typeof n.type === 'string') out.push(n.type)
    collectTypes(n.children, out)
  }
  return out
}

describe('TabIcons', () => {
  it.each(ICONS)('%s 图标渲染 24×24 线性 SVG，描边 1.8（与 PWA Nav.tsx 一致）', (_name, Icon) => {
    const tree = renderIcon(Icon, '#C4602F')
    expect(tree.props.width).toBe(TAB_ICON_SIZE)
    expect(tree.props.height).toBe(TAB_ICON_SIZE)
    // jest-expo 下 react-native-svg 落到 host 节点：viewBox 被拆成 vbWidth/vbHeight，
    // linecap/linejoin 落到子 RNSVGGroup 上（枚举值），故分别断言。
    expect([tree.props.vbWidth, tree.props.vbHeight]).toEqual([24, 24])
    expect(tree.props.fill).toBe('none')
    expect(tree.props.stroke).toBe('#C4602F')
    expect(tree.props.strokeWidth).toBe(1.8)
    const group = (tree.children as Node[])[0]
    expect(group.props.strokeLinecap).toBe(1)
    expect(group.props.strokeLinejoin).toBe(1)
  })

  it.each(ICONS)('%s 图标真实画出路径/形状，不落回缺字形占位符', (_name, Icon) => {
    const types = collectTypes(renderIcon(Icon, '#8A7F6D'))
    expect(types.length).toBeGreaterThan(0)
    const shape = types.filter((t) => /Path|Rect|Circle/i.test(t))
    expect(shape.length).toBeGreaterThan(0)
  })

  it('激活色与未激活色都能画出来（未激活走 inkMuted）', () => {
    expect(collectTypes(renderIcon(TabIconGallery, '#C4602F')).length).toBeGreaterThan(0)
    expect(collectTypes(renderIcon(TabIconGallery, '#8A7F6D')).length).toBeGreaterThan(0)
  })
})

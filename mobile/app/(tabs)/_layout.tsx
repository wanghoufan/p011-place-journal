import { Tabs } from 'expo-router';

import { useTheme } from '@/themeProvider';
import { TabIconFind, TabIconGallery, TabIconMine, TabIconRecord, TAB_ICON_SIZE } from '@/components/TabIcons';

export default function TabsLayout() {
  const { palette } = useTheme();
  // 图标颜色跟随激活态并随主题走（对齐 PWA Nav.tsx 的 --c-terra / --c-inkmuted）。
  // 此前未传 tabBarIcon，expo-router 57 渲染内置占位符 ⏷(U+23F7)，字体 fallback 不同会一台空白一台豆腐块。
  const icon =
    (Icon: (p: { color: string; size?: number }) => React.JSX.Element) =>
    ({ focused }: { focused: boolean }) => (
      <Icon color={focused ? palette.terra : palette.inkMuted} size={TAB_ICON_SIZE} />
    );
  return (
    <Tabs
      screenOptions={{
        // 主题换装：标签栏与页头随当前调色板走（对齐 Web 全站配色切换）。
        tabBarActiveTintColor: palette.terra,
        tabBarInactiveTintColor: palette.inkMuted,
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.line },
        headerStyle: { backgroundColor: palette.paper },
        headerTintColor: palette.ink,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: '画廊', tabBarIcon: icon(TabIconGallery) }} />
      <Tabs.Screen name="record" options={{ title: '记录', tabBarIcon: icon(TabIconRecord) }} />
      <Tabs.Screen name="find" options={{ title: '发现', tabBarIcon: icon(TabIconFind) }} />
      <Tabs.Screen name="mine" options={{ title: '我的', tabBarIcon: icon(TabIconMine) }} />
    </Tabs>
  );
}

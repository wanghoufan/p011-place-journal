import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { statusBarIconStyle, useAndroidWindowBackground } from '@/components/systemBars';
import {
  attachAuthAutoRefresh,
  getAuthService,
  getInitialAuthUrl,
  isSupabaseConfigured,
  subscribeAuthCallbacks,
} from '@/supabase';
import { startAuthLifecycle } from '@/supabase/startup';
import { ThemeProvider, useTheme } from '@/themeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { palette, scheme } = useTheme();
  useEffect(() => {
    let disposed = false;
    let dispose: (() => void) | null = null;

    void (async () => {
      try {
        const handle = await startAuthLifecycle({
          isConfigured: isSupabaseConfigured,
          // 惰性取单例：未配置 Supabase 时 startAuthLifecycle 早返，不会触发 getAuthService 的抛错。
          service: {
            sweepFingerprints: () => getAuthService().sweepFingerprints(),
            recoverSession: () => getAuthService().recoverSession(),
            handleCallback: (url) => getAuthService().handleCallback(url),
          },
          getInitialUrl: getInitialAuthUrl,
          subscribeAuthCallbacks,
          attachAuthAutoRefresh,
        });
        if (disposed) handle.dispose();
        else dispose = handle.dispose;
      } catch {
        // 冷启动恢复失败不阻断 UI；用户仍可在 Mine 手动登录。
      }
    })();

    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  // L3-39：把 Android 窗口底色（edge-to-edge 下系统栏透明后露出来的那层）钉到当前纸色，
  // 随明暗即时切换。理由与版本适配见 src/components/systemBars.ts 顶部注释。
  useAndroidWindowBackground(palette);

  return (
    <>
      {/* expo-status-bar 57 已无 backgroundColor，这里只管图标明暗；底色由上面的窗口底色决定。 */}
      <StatusBar style={statusBarIconStyle(scheme)} />
      <View style={{ flex: 1, backgroundColor: palette.paper }}>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: palette.paper },
            // 原生页头默认取 AppCompat 的 DayNight，跟的是**系统**深浅，不是应用内主题；
            // 深色模式进入详情页时它仍是白底，这里钉到当前纸色。
            headerStyle: { backgroundColor: palette.paper },
            headerTintColor: palette.ink,
            headerTitleStyle: { color: palette.ink },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="entry/[id]" options={{ title: '记录详情' }} />
          <Stack.Screen name="place/[id]" options={{ title: '地点' }} />
          <Stack.Screen name="ai-confirm" options={{ title: 'AI 整理' }} />
          <Stack.Screen name="tags" options={{ title: '标签' }} />
          <Stack.Screen name="conflicts" options={{ title: '冲突裁决' }} />
          <Stack.Screen name="shares" options={{ title: '分享' }} />
          <Stack.Screen name="share/[slug]" options={{ title: '分享快照' }} />
        </Stack>
      </View>
    </>
  );
}

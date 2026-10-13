// Auth scheme 回调入口（T054/T056/T062 本地段）。
//
// 两条入口共用同一 `handleCallback`，指纹去重保证重复/迟到回调幂等：
//   1) 正常登录：`login()` 内 `openAuthSessionAsync` 直接拿到回调 URL（不经过本页）；
//   2) 冷启动/被杀后由 scheme 唤起：本页经 `useLinkingURL()` 取 URL 并处理。
// 本页只展示结果文案，绝不打印 code/token。
//
// 出栈口径（P1 修复：真机 3/3 复现「授权成功后卡在 auth/callback、底栏 Tab 不可见、
// 必须手动点返回箭头」）：deep link 会把本页压到 Tab 栈之上，故处理出终态后必须
// `router.replace` 回主界面。去向由纯函数 `authReturnTarget` / `authReturnRoute` 决定
// （`src/features/authReturn.ts`，单测锁三条终态），本文件不含任何路由字面量。
// `handleCallback` 的调用时机与顺序完全不变 → 「重复回调不重复换码」语义不受影响。
//
// 隐私口径：本文件不 console 任何内容；含一次性 code 的 URL 只存在于 `useLinkingURL()`
// 的局部变量与 `handleCallback` 调用链内，跳转前不落盘、不进日志。

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLinkingURL } from 'expo-linking';
import { router } from 'expo-router';

import { getAuthService, isSupabaseConfigured, type CallbackOutcome } from '@/supabase';
import { describeCallbackOwnerMismatch } from '@/features/account';
import { authReturnRoute, authReturnTarget, type AuthReturnTarget } from '@/features/authReturn';

/** 结果文案停留时长：让用户看清「成功/已处理过/已取消」，随后自动回主界面。 */
const RESULT_LINGER_MS = 600;
/** 拿不到回调 URL 时的宽限期：超过就自动回主界面（避免本页成为死胡同）。 */
const NO_URL_GRACE_MS = 2500;

type Tone = 'pending' | 'ok' | 'warn';

interface UiState {
  tone: Tone;
  text: string;
}

function describe(outcome: CallbackOutcome): UiState {
  switch (outcome.status) {
    case 'succeeded':
      return { tone: 'ok', text: outcome.binding === 'unbound' ? '登录成功，请回到 Mine 确认绑定本地数据。' : '登录成功。' };
    case 'duplicate':
      return { tone: 'ok', text: '该登录回调已处理过，无需重复操作。' };
    case 'owner_mismatch':
      return { tone: 'warn', text: describeCallbackOwnerMismatch() };
    case 'terminal_reauth':
      return { tone: 'warn', text: '登录未完成，请回 Mine 重新登录。' };
    default:
      // error（用户取消授权时 provider 回 error=access_denied）/ invalid 都回主界面。
      return { tone: 'warn', text: '登录未完成，请回 Mine 重新登录。' };
  }
}

/** 回到主界面（`pending` 不是终态，不跳）。 */
function returnHome(target: AuthReturnTarget): void {
  if (target === 'pending') return;
  router.replace(authReturnRoute(target));
}

export default function AuthCallbackScreen() {
  const url = useLinkingURL();
  const [state, setState] = useState<UiState>({ tone: 'pending', text: '正在处理登录回调…' });
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (!url || lastHandled.current === url) return;
    lastHandled.current = url;
    let cancelled = false;
    /** 处理完即离场：把本页从返回栈里 replace 掉，避免用户看到「卡住」的中间页。 */
    const leave = (target: AuthReturnTarget) => {
      if (cancelled) return;
      setTimeout(() => {
        if (!cancelled) returnHome(target);
      }, RESULT_LINGER_MS);
    };

    void (async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (!cancelled) setState({ tone: 'warn', text: '未配置 Supabase 环境变量，无法完成登录。' });
          leave('home');
          return;
        }
        const outcome = await getAuthService().handleCallback(url);
        if (!cancelled) setState(describe(outcome));
        leave(authReturnTarget(outcome));
      } catch {
        if (!cancelled) setState({ tone: 'warn', text: '登录回调处理失败，请回 Mine 重新登录。' });
        leave('home');
      } finally {
        // 处理完即释放：不在 ref 中长期持有含一次性 code 的回调 URL（缩小 code 内存存活窗口）。
        if (lastHandled.current === url) lastHandled.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  // 无回调 URL（本页是被深链接栈带进来的中间页 / 授权被用户取消）时的兜底出栈：
  // 超过宽限期仍拿不到 URL 就自动回主界面，不再把用户留在这页手动点返回箭头。
  // 安全前提：真正的换码由 `app/_layout.tsx` 的 `startAuthLifecycle`
  // （`getInitialAuthUrl` + `subscribeAuthCallbacks`）负责，本页只是展示层，出栈不丢 code。
  useEffect(() => {
    if (url) return undefined;
    const timer = setTimeout(() => {
      returnHome('home');
    }, NO_URL_GRACE_MS);
    return () => clearTimeout(timer);
  }, [url]);

  return (
    <View style={styles.container}>
      {state.tone === 'pending' ? <ActivityIndicator /> : null}
      <Text style={styles.text}>{state.text}</Text>
      {state.tone === 'pending' ? (
        // 无回调 URL 时的兜底出路（避免本页成为死胡同）：手动返回主界面。
        <Pressable accessibilityRole="button" onPress={() => returnHome('home')}>
          <Text style={styles.manual}>返回主界面</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
  },
  manual: {
    fontSize: 14,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});
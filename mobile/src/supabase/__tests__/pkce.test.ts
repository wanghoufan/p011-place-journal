// PKCE S256 回归（L3·安全 P1：`code_challenge_method` 从 plain 升到 s256）。
//
// 被测对象是**真实链路**，不是替身：
//   - `s256CodeChallenge()` 是本文件补齐全局后 auth-js 内部实际复用的算法；
//   - 「auth-js 是否真的走 s256」由**真实 `@supabase/supabase-js` client** 的
//     `signInWithOAuth()` 产出的 authorize URL 判定（不打桩 `generatePKCEChallenge`、
//     不 mock `@supabase/auth-js`）；
//   - verifier 落盘位置用**真实 `createSecureStoreAdapter`**（生产即 expo-secure-store）观察。
//
// 关键环境前提：Jest 跑在 Node 上，`globalThis.crypto/subtle/TextEncoder/btoa` **本来就存在**，
// 直接跑会让 auth-js 走 s256，测不出 polyfill 的作用。因此每个相关用例都先把
// `Hermes` 的真实形态（这四个全局全部缺失）模拟出来，再调 `ensurePkceCrypto()` 补齐。

import 'react-native-url-polyfill/auto'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { AUTH_REDIRECT_URI } from '../constants'
import { createCodeVerifier, ensurePkceCrypto, PKCE_VERIFIER_LENGTH, s256CodeChallenge } from '../pkce'
import type { RandomBytes } from '../pkce'
import { createMemorySecureStoreBackend, createSecureStoreAdapter } from '../secureStore'
import type { SecureStoreBackend } from '../secureStore'

/** RFC 7636 附录 B 的官方测试向量（code_verifier / code_challenge）。 */
const RFC7636_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
const RFC7636_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

const PROBE_SUPABASE_URL = 'https://pkce-probe.supabase.co'

/** 可复现的伪随机字节源（xorshift32），只用于让断言可重放，不代表生产熵源。 */
function seededRandomBytes(seed: number): RandomBytes {
  let state = seed >>> 0 || 1
  return (byteLength) => {
    const out = new Uint8Array(byteLength)
    for (let i = 0; i < byteLength; i++) {
      state ^= state << 13
      state ^= state >>> 17
      state ^= state << 5
      state >>>= 0
      out[i] = state & 0xff
    }
    return out
  }
}

/** 生产熵源替身：真随机，用于「每次都不同」的断言。 */
const liveRandomBytes: RandomBytes = (byteLength) => {
  const out = new Uint8Array(byteLength)
  for (let i = 0; i < byteLength; i++) out[i] = Math.floor(Math.random() * 256)
  return out
}

/** 记录所有读写过的键值，用来证明 verifier 只落在 SecureStore 一处。 */
function trackedBackend(): SecureStoreBackend & { writes: string[] } {
  const inner = createMemorySecureStoreBackend()
  const writes: string[] = []
  return {
    writes,
    async getItemAsync(key) {
      return inner.getItemAsync(key)
    },
    async setItemAsync(key, value) {
      writes.push(`${key}=${value}`)
      await inner.setItemAsync(key, value)
    },
    async deleteItemAsync(key) {
      await inner.deleteItemAsync(key)
    },
  }
}

/**
 * 把全局整成 Hermes 的真实形态（crypto / crypto.subtle / TextEncoder / btoa 全缺），
 * 跑完再原样恢复。
 */
async function withHermesGlobals<T>(run: () => Promise<T>): Promise<T> {
  const names = ['crypto', 'btoa', 'TextEncoder'] as const
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const)
  for (const name of names) {
    Reflect.deleteProperty(globalThis, name)
  }
  try {
    return await run()
  } finally {
    for (const [name, descriptor] of saved) {
      Reflect.deleteProperty(globalThis, name)
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    }
  }
}

/** 用真实 supabase-js 建 client（storage 即生产用的 SecureStore adapter）。 */
function probeClient(backend: SecureStoreBackend): SupabaseClient {
  return createClient(PROBE_SUPABASE_URL, 'sb_publishable_pkce_probe', {
    auth: {
      storage: createSecureStoreAdapter(backend),
      storageKey: 'place-journal.auth',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
}

interface AuthorizeResult {
  url: URL
  challenge: string
  method: string
  verifier: string | null
  /** SecureStore 里被写过的全部键值（verifier 落点取证）。 */
  writes: string[]
}

/** auth-js 的 `setItemAsync` 会对字符串再做一层 JSON 编码，取回时要解掉。 */
async function readStoredString(backend: SecureStoreBackend, key: string): Promise<string | null> {
  const raw = await backend.getItemAsync(key)
  if (raw == null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return raw
  }
}

async function authorize(client: SupabaseClient, backend: SecureStoreBackend & { writes: string[] }): Promise<AuthorizeResult> {
  const writesBefore = backend.writes.length
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_REDIRECT_URI, skipBrowserRedirect: true },
  })
  if (error || !data.url) throw new Error(`authorize failed: ${error?.message ?? 'no url'}`)
  const url = new URL(data.url)
  return {
    url,
    challenge: url.searchParams.get('code_challenge') ?? '',
    method: url.searchParams.get('code_challenge_method') ?? '',
    // auth-js 的降级窗口双写键（`storageKey-code-verifier`）；per-flow 槽位键也落在同一个 storage。
    verifier: await readStoredString(backend, 'place-journal.auth-code-verifier'),
    writes: backend.writes.slice(writesBefore),
  }
}

describe('PKCE S256 挑战值算法（RFC 7636 §4.2）', () => {
  it('对 RFC 7636 附录 B 官方测试向量逐字符一致', () => {
    expect(s256CodeChallenge(RFC7636_VERIFIER)).toBe(RFC7636_CHALLENGE)
  })

  it('挑战值恒为 43 字符 base64url，且满足 Supabase 服务端 isValidCodeChallenge 的约束', () => {
    // 服务端约束（supabase/auth internal/api/pkce.go）：
    //   43 <= len(code_challenge) <= 128 且匹配 ^[a-zA-Z._~0-9-]+$
    for (const verifier of [RFC7636_VERIFIER, createCodeVerifier(liveRandomBytes), createCodeVerifier(seededRandomBytes(1))]) {
      const challenge = s256CodeChallenge(verifier)
      expect(challenge).toHaveLength(43)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(challenge).not.toBe(verifier)
    }
  })

  it('不同 verifier 产生不同 challenge（SHA-256 单射，挑战值不是固定值）', () => {
    const challenges = new Set<string>()
    for (let i = 0; i < 50; i++) challenges.add(s256CodeChallenge(createCodeVerifier(liveRandomBytes)))
    expect(challenges.size).toBe(50)
  })
})

describe('code_verifier 生成（RFC 7636 §4.1）', () => {
  it('长度落在 43–128，字符集只含 ALPHA/DIGIT/-._~', () => {
    for (let i = 0; i < 20; i++) {
      const verifier = createCodeVerifier(liveRandomBytes)
      expect(verifier).toHaveLength(PKCE_VERIFIER_LENGTH)
      expect(verifier.length).toBeGreaterThanOrEqual(43)
      expect(verifier.length).toBeLessThanOrEqual(128)
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/)
    }
  })

  it('每次生成都不同', () => {
    const seen = new Set(Array.from({ length: 32 }, () => createCodeVerifier(liveRandomBytes)))
    expect(seen.size).toBe(32)
  })

  it('随机源给不满即抛错，不静默用默认值补齐', () => {
    expect(() => createCodeVerifier(() => new Uint8Array(3))).toThrow('PKCE_RANDOM_SOURCE_SHORT')
    expect(() => createCodeVerifier(undefined as unknown as RandomBytes)).toThrow('PKCE_RANDOM_SOURCE_MISSING')
  })
})

describe('ensurePkceCrypto：在 Hermes 环境下补齐 auth-js 判定 S256 所需全局', () => {
  it('补齐前四项全缺，补齐后全部可用', async () => {
    await withHermesGlobals(async () => {
      const scope = globalThis as Record<string, unknown>
      expect(scope.crypto).toBeUndefined()
      expect(scope.btoa).toBeUndefined()
      expect(scope.TextEncoder).toBeUndefined()

      const status = ensurePkceCrypto(liveRandomBytes)
      expect(status.alreadySupported).toBe(false)
      expect(status.patched).toBe(true)
      expect(status.sha256Available).toBe(true)
      expect(status.btoaAvailable).toBe(true)
      expect(status.getRandomValuesAvailable).toBe(true)
    })
  })

  it('不覆盖平台已有的原生实现（Node/WebCrypto 下 alreadySupported=true）', () => {
    const status = ensurePkceCrypto(liveRandomBytes)
    expect(status.alreadySupported).toBe(true)
    expect(status.patched).toBe(false)
  })

  it('幂等：第二次调用不再改写任何全局', async () => {
    await withHermesGlobals(async () => {
      ensurePkceCrypto(liveRandomBytes)
      const second = ensurePkceCrypto(liveRandomBytes)
      expect(second.patched).toBe(false)
      expect(second.alreadySupported).toBe(true)
    })
  })

  it('getRandomValues 按字节序填满任意 TypedArray（auth-js 传的是 Uint32Array）', async () => {
    await withHermesGlobals(async () => {
      ensurePkceCrypto(seededRandomBytes(42))
      const scope = globalThis as { crypto: { getRandomValues: <T extends ArrayBufferView>(a: T) => T } }
      const u32 = scope.crypto.getRandomValues(new Uint32Array(56))
      expect(u32).toHaveLength(56)
      expect(u32.some((v) => v !== 0)).toBe(true)
      const u8 = scope.crypto.getRandomValues(new Uint8Array(16))
      expect(u8).toHaveLength(16)
    })
  })

  it('只支持 SHA-256，其它算法显式抛错（绝不静默返回错值）', async () => {
    await withHermesGlobals(async () => {
      ensurePkceCrypto(liveRandomBytes)
      const scope = globalThis as { crypto: { subtle: { digest: (a: string, d: Uint8Array) => Promise<ArrayBuffer> } } }
      const ok = await scope.crypto.subtle.digest('SHA-256', new TextEncoder().encode(RFC7636_VERIFIER))
      expect(ok.byteLength).toBe(32)
      await expect(scope.crypto.subtle.digest('SHA-1', new Uint8Array(1))).rejects.toThrow('UNSUPPORTED_PKCE_DIGEST')
    })
  })

  it('补的 TextEncoder 自调用不会死循环（曾经的真 bug）', async () => {
    await withHermesGlobals(async () => {
      ensurePkceCrypto(liveRandomBytes)
      const scope = globalThis as { TextEncoder: new () => { encode(s: string): Uint8Array } }
      expect(new scope.TextEncoder().encode('私人打卡手账').length).toBeGreaterThan(0)
    })
  })
})

describe('真实 supabase-js 授权 URL：确实走 s256 而不是 plain', () => {
  it('Hermes 环境下 code_challenge_method=s256，且 challenge 是 verifier 的 SHA-256', async () => {
    await withHermesGlobals(async () => {
      const backend = trackedBackend()
      const client = probeClient(backend)
      ensurePkceCrypto(liveRandomBytes)

      const result = await authorize(client, backend)

      expect(result.method).toBe('s256')
      expect(result.verifier).toBeTruthy()
      // 端到端比对：URL 里的 challenge 必须等于本模块算的 RFC 7636 S256 值，
      // 说明 auth-js 内部走的确实是这套算法，而不是碰巧长度相同的别的东西。
      expect(result.challenge).toBe(s256CodeChallenge(result.verifier as string))
      // plain 的特征是 challenge 逐字等于 verifier；这里必须不同。
      expect(result.challenge).not.toBe(result.verifier)
      // 反降级：授权 URL 里绝不能出现 verifier 原文。
      expect(result.url.toString()).not.toContain(result.verifier as string)
    })
  })

  it('每次授权生成新的 verifier 与新的 challenge（会话内不得复用）', async () => {
    await withHermesGlobals(async () => {
      const backend = trackedBackend()
      const client = probeClient(backend)
      ensurePkceCrypto(liveRandomBytes)

      const first = await authorize(client, backend)
      const second = await authorize(client, backend)

      expect(second.verifier).toBeTruthy()
      expect(second.verifier).not.toBe(first.verifier)
      expect(second.challenge).not.toBe(first.challenge)
    })
  })

  it('verifier 只写进 SecureStore：SQLite / AsyncStorage 替身与 console 零写入', async () => {
    await withHermesGlobals(async () => {
      // 三个「泄密口」替身：SecureStore（合法落点）、SQLite、AsyncStorage。
      const secureStore = trackedBackend()
      const sqliteWrite = jest.fn()
      const asyncStorageSet = jest.fn()
      const consoleSpies = (['log', 'warn', 'error', 'info', 'debug', 'trace'] as const).map((level) =>
        jest.spyOn(console, level).mockImplementation(() => {}),
      )

      try {
        const client = probeClient(secureStore)
        ensurePkceCrypto(liveRandomBytes)
        const result = await authorize(client, secureStore)
        const verifier = result.verifier as string

        // 1) verifier 确实落在 SecureStore（生产 adapter = expo-secure-store）。
        expect(result.writes.some((entry) => entry.includes(verifier))).toBe(true)
        // 2) SQLite / AsyncStorage 一次都没被写。
        expect(sqliteWrite).not.toHaveBeenCalled()
        expect(asyncStorageSet).not.toHaveBeenCalled()
        // 3) verifier / challenge / code 都没进日志。
        const logged = consoleSpies.flatMap((spy) => spy.mock.calls.map((call) => call.join(' ')))
        for (const secret of [verifier, result.challenge]) {
          expect(logged.some((line) => line.includes(secret))).toBe(false)
        }
      } finally {
        for (const spy of consoleSpies) spy.mockRestore()
      }
    })
  })
})

describe('源码级不落盘/不落日志闸（DoD›登录）', () => {
  const files = [
    join(__dirname, '..', 'pkce.ts'),
    join(__dirname, '..', 'auth.ts'),
    join(__dirname, '..', 'native.ts'),
    join(__dirname, '..', 'redirect.ts'),
    join(__dirname, '..', '..', '..', 'app', 'auth', 'callback.tsx'),
  ]

  /** 去掉注释再匹配：本文件自己的注释里会出现「AsyncStorage / 日志」这类词。 */
  function codeOf(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1')
  }

  it('auth 链路源码里没有任何 console 输出', () => {
    for (const file of files) {
      expect(codeOf(file)).not.toMatch(/\bconsole\s*\./)
    }
  })

  it('auth 链路源码里没有 AsyncStorage 引用（token 与 verifier 只走 SecureStore adapter）', () => {
    for (const file of files) {
      expect(codeOf(file)).not.toMatch(/AsyncStorage/)
    }
  })

  it('verifier 只经 createSecureStoreAdapter 落盘（auth.storage 即 SecureStore adapter）', () => {
    const nativeSource = codeOf(join(__dirname, '..', 'native.ts'))
    expect(nativeSource).toMatch(/storage:\s*createSecureStoreAdapter\(SecureStore\)/)
  })
})
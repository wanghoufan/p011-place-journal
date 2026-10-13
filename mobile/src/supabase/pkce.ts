// PKCE S256：让 @supabase/auth-js 走 `code_challenge_method=s256` 而不是静默退回 `plain`。
//
// ── 根因（实查 `node_modules/@supabase/auth-js/dist/main/lib/helpers.js`）─────────
//   `getCodeChallengeAndMethod()` → `generatePKCEChallenge(verifier)`：
//     const hasCryptoSupport = typeof crypto !== 'undefined'
//                            && typeof crypto.subtle !== 'undefined'
//                            && typeof TextEncoder !== 'undefined';
//     if (!hasCryptoSupport) { console.warn('...default to use plain...'); return verifier; }
//   Hermes（React Native 0.86 / Expo SDK 57）**不提供** `crypto`、`crypto.subtle`、`TextEncoder`，
//   于是 `codeVerifier === codeChallenge` → `code_challenge_method=plain`。
//   plain 下 challenge 就是 verifier 本身：
//     - authorize URL 里明文出现 verifier，拿到 URL 的人即可直接换码（等于没有 PKCE）；
//     - 无法防降级（攻击者把 method 改回 plain 即可）；
//     - RFC 7636 §4.2 要求 S256 = BASE64URL(SHA256(ASCII(code_verifier)))。
//   客户端另有一条 `code_challenge_method=plain|s256` 的服务端契约（Supabase Auth
//   `flow_state.CodeChallengeMethod` / `VerifyPKCEChallenge`，见交付报告），S256 是其推荐值。
//
// ── 修法（纯 TS，无新增原生依赖负责「哈希/编码」部分）──────────────────────────
//   项目已有 `sha256.ts`（纯 TS SHA-256，有已知向量单测覆盖）与 `sync/base64.ts`
//   （标准 base64 编码，含全局 `btoa` 缺失时的手写分支），两者都直接复用。
//   本文件只做两件事：
//     1) 按 RFC 7636 算出 `BASE64URL(SHA256(ASCII(verifier)))`——这是真正被 auth-js 复用的算法；
//     2) 把 auth-js 判定 S256 所需的三件套（`crypto.subtle.digest` / `TextEncoder` / `btoa`）
//        幂等地补到 `globalThis`，让它走 s256 分支而不是 plain。
//   只实现 SHA-256（auth-js 的 PKCE 只用到它）；其它算法显式抛错，绝不静默返回错值。
//
// ── 随机源（verifier 熵）─────────────────────────────────────────────────────
//   RFC 7636 §4.1 要求 code_verifier 由**密码学安全**随机源生成。
//   auth-js 的 `generatePKCEVerifier()` 只在 `typeof crypto !== 'undefined'` 时走
//   `crypto.getRandomValues`，否则退回 `Math.random()`（非密码学安全）。
//   所以 `ensurePkceCrypto()` **必须**由调用方显式注入强随机字节源，不能默认用 `Math.random`：
//   生产由 `native.ts` 注入 `expo-crypto` 的 `getRandomBytes`（原生 SecureRandom）；
//   单测注入可控源以复现 RFC 官方测试向量。缺源即抛错，不静默降级。
//
// ── verifier 落盘口径 ─────────────────────────────────────────────────────────
//   本文件**不碰任何存储**。verifier 由 auth-js 自己写入客户端的 `auth.storage`，
//   生产接线是 `createSecureStoreAdapter(expo-secure-store)`（见 `native.ts`），
//   即 verifier 与 access/refresh token 同落 SecureStore，不进 SQLite / AsyncStorage / 日志。

import { sha256Bytes, utf8Encode, utf8EncodePure } from './sha256'

/** 密码学安全随机字节源（生产为 `expo-crypto` 的 `getRandomBytes`）。 */
export type RandomBytes = (byteLength: number) => Uint8Array

/** RFC 7636 §4.1 的 unreserved 字符集：`ALPHA / DIGIT / "-" / "." / "_" / "~"`。 */
const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'

/**
 * 本模块生成的 verifier 长度。RFC 7636 §4.1 允许 43–128。
 * 取 64：64 % |UNRESERVED|(64) == 0 → 取模无偏，每个字符正好携带 6 bit 熵。
 */
export const PKCE_VERIFIER_LENGTH = 64

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/**
 * 标准 base64 编码（带 `=` 填充），**不读任何全局**。
 *
 * 为什么不复用 `src/sync/base64.ts` 的 `arrayBufferToBase64`：那份实现优先调全局 `btoa`，
 * 而本文件恰恰是「给全局补 `btoa`」的那一层，两者同时生效会互相调用成死循环
 * （`binaryStringToBase64 → globalThis.btoa → arrayBufferToBase64 → globalThis.btoa …`）。
 * 这层必须是零全局依赖的纯函数。
 */
function base64Encode(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    out += BASE64_ALPHABET[b0 >> 2]
    out += BASE64_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    out += b1 === undefined ? '=' : BASE64_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    out += b2 === undefined ? '=' : BASE64_ALPHABET[b2 & 0x3f]
  }
  return out
}

/** RFC 7636 §3 的 base64url 变换：`+`→`-`、`/`→`_`、去掉尾部 `=` 填充。 */
function toBase64Url(standardBase64: string): string {
  return standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * RFC 7636 §4.2：`code_challenge = BASE64URL(SHA256(ASCII(code_verifier)))`。
 *
 * verifier 字符集是纯 ASCII unreserved，故 `utf8Encode` 与 ASCII 编码等价；
 * 这里仍走 utf8Encode 以与 auth-js 内部 `new TextEncoder().encode(verifier)` 逐字节一致。
 * 这就是本文件补齐全局之后 auth-js 内部实际会走的那套算法（两边结果由单测逐字符比对）。
 */
export function s256CodeChallenge(codeVerifier: string): string {
  return toBase64Url(base64Encode(sha256Bytes(utf8Encode(codeVerifier))))
}

/**
 * 按 RFC 7636 §4.1 生成一个新的随机 code_verifier。
 *
 * 仅供诊断/测试与「本模块自带随机实现」的对照使用；生产 verifier 由 auth-js 的
 * `generatePKCEVerifier()` 生成（本文件通过 `crypto.getRandomValues` 让它走上强随机分支）。
 */
export function createCodeVerifier(randomBytes: RandomBytes): string {
  if (typeof randomBytes !== 'function') throw new Error('PKCE_RANDOM_SOURCE_MISSING')
  const bytes = randomBytes(PKCE_VERIFIER_LENGTH)
  if (bytes.length < PKCE_VERIFIER_LENGTH) throw new Error('PKCE_RANDOM_SOURCE_SHORT')
  let verifier = ''
  for (let i = 0; i < PKCE_VERIFIER_LENGTH; i++) verifier += UNRESERVED.charAt(bytes[i] % UNRESERVED.length)
  return verifier
}

/** auth-js `crypto.subtle.digest('SHA-256', data)` 的最小结构子集。 */
export interface PkceSubtleCrypto {
  digest: (algorithm: string | { name: string }, data: Uint8Array | ArrayBuffer) => Promise<ArrayBuffer>
}

/** auth-js 用到的 `crypto` 最小结构子集（Hermes 运行时整体缺失，需整段补齐）。 */
export interface PkceCrypto {
  subtle?: PkceSubtleCrypto
  getRandomValues?: GetRandomValues
}

/**
 * `crypto.getRandomValues`：按目标视图**字节序**填满任意 TypedArray。
 *
 * 注意签名必须是泛型视图而不是 `Uint8Array`：auth-js 的 `generatePKCEVerifier()`
 * 传进来的是 `new Uint32Array(56)`，`generatePKCEFlowId()` 传的是 `Uint8Array(16)`。
 * 若按元素逐个赋值会越界/错位，必须写进视图的底层字节。
 */
export type GetRandomValues = <T extends ArrayBufferView>(array: T) => T

/**
 * 本文件对全局对象的唯一视图。
 *
 * `lib.dom.d.ts` 把 `crypto` / `btoa` / `TextEncoder` 声明为「必然存在」，而 Hermes 运行时并不提供，
 * 本模块的职责正是按运行时真实情况（有就复用、没有就补齐）来读写它们。
 * 因此这里把三个成员收窄为可选——这是全文件**唯一**一处类型断言，且不是为绕过编译错误，
 * 而是把「DOM 声明」翻译成「Hermes 实际」；其余读写全部走局部变量，无任何 `as`。
 */
interface PkceGlobals {
  crypto?: PkceCrypto
  btoa?: (data: string) => string
  TextEncoder?: unknown
}

function pkceGlobals(): PkceGlobals {
  return globalThis as PkceGlobals
}

/** 判定/补齐结果，供诊断与单测断言。 */
export interface PkceCryptoStatus {
  /** 补齐前是否已具备 `crypto.subtle.digest`（true = 走平台原生/Node WebCrypto）。 */
  alreadySupported: boolean
  /** 本次调用后 `crypto.subtle.digest` 是否可用。 */
  sha256Available: boolean
  /** `btoa` 是否可用（auth-js 的 s256 编码依赖它）。 */
  btoaAvailable: boolean
  /** `crypto.getRandomValues` 是否可用（auth-js 生成 verifier 依赖它）。 */
  getRandomValuesAvailable: boolean
  /** 本次是否真的改写了全局（幂等：第二次调用应为 false）。 */
  patched: boolean
}

/** SHA-256 摘要：复制到独立 ArrayBuffer，避免把底层缓冲的额外字节暴露给调用方。 */
function digestSha256(
  algorithm: string | { name: string },
  data: Uint8Array | ArrayBuffer,
): Promise<ArrayBuffer> {
  const name = typeof algorithm === 'string' ? algorithm : algorithm?.name
  if (String(name).toUpperCase() !== 'SHA-256') {
    return Promise.reject(new Error(`UNSUPPORTED_PKCE_DIGEST:${String(name)}`))
  }
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const digest = sha256Bytes(bytes)
  const out = new ArrayBuffer(32)
  new Uint8Array(out).set(digest)
  return Promise.resolve(out)
}

/** `btoa` 回退实现：输入是 binary string（每字符 1 字节），编码交给零全局依赖的 `base64Encode`。 */
function binaryStringToBase64(data: string): string {
  const bytes = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i) & 0xff
  return base64Encode(bytes)
}

/**
 * 单次向随机源申请的字节数上限。`expo-crypto` 的 `getRandomBytes` 上限为 1024，
 * 这里按 512 分块，使得任意长度的视图都能填满（auth-js 目前最大用 224 字节）。
 */
const RANDOM_CHUNK = 512

/** 取 `byteLength` 个强随机字节；不足即抛错，绝不用默认值补齐。 */
function fillRandomBytes(target: Uint8Array, randomBytes: RandomBytes): void {
  for (let offset = 0; offset < target.byteLength; offset += RANDOM_CHUNK) {
    const chunk = randomBytes(Math.min(RANDOM_CHUNK, target.byteLength - offset))
    if (chunk.length < target.byteLength - offset) throw new Error('PKCE_RANDOM_SOURCE_SHORT')
    target.set(chunk, offset)
  }
}

/**
 * 幂等地补齐 auth-js 判定 S256 所需的三件套：`crypto.subtle.digest`、`btoa`、`TextEncoder`，
 * 并保证 `crypto.getRandomValues` 走注入的强随机源。
 *
 * 必须在**创建 supabase 客户端之前**调用（auth-js 只在 `signInWithOAuth` 时读这些全局）。
 * 已具备的实现一律保留，不覆盖平台原生 WebCrypto / Node crypto。
 *
 * @param randomBytes 密码学安全随机字节源（生产传 `expo-crypto` 的 `getRandomBytes`）。
 *   不给强随机源就只能让 auth-js 退回它自己的 `Math.random()` 分支，
 *   那是 RFC 7636 §4.1 不认可的熵源，因此这里显式要求调用方注入。
 */
export function ensurePkceCrypto(randomBytes: RandomBytes): PkceCryptoStatus {
  if (typeof randomBytes !== 'function') throw new Error('PKCE_RANDOM_SOURCE_MISSING')

  const scope = pkceGlobals()
  const existingCrypto = scope.crypto
  const alreadySupported = typeof existingCrypto?.subtle?.digest === 'function'
  const hadGetRandomValues = typeof existingCrypto?.getRandomValues === 'function'
  const hadBtoa = typeof scope.btoa === 'function'
  const hadTextEncoder = typeof scope.TextEncoder === 'function'

  // 平台已有 crypto 就地补齐，Hermes 完全没有则新建一个最小容器。
  const cryptoRef: PkceCrypto = existingCrypto ?? {}
  if (!existingCrypto) scope.crypto = cryptoRef

  if (typeof cryptoRef.getRandomValues !== 'function') {
    cryptoRef.getRandomValues = <T extends ArrayBufferView>(array: T): T => {
      fillRandomBytes(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), randomBytes)
      return array
    }
  }

  const subtle: PkceSubtleCrypto = cryptoRef.subtle ?? { digest: digestSha256 }
  cryptoRef.subtle = subtle
  if (typeof subtle.digest !== 'function') subtle.digest = digestSha256

  if (typeof scope.btoa !== 'function') scope.btoa = binaryStringToBase64

  // auth-js 的 S256 判定同时要求 `TextEncoder` 存在，只补 subtle 仍会退回 plain。
  // 必须用 `utf8EncodePure`（不读全局）而非 `utf8Encode`（优先全局）：后者会自调用成死循环。
  if (typeof scope.TextEncoder !== 'function') {
    scope.TextEncoder = class {
      encode(input: string): Uint8Array {
        return utf8EncodePure(input)
      }
    }
  }

  return {
    alreadySupported,
    sha256Available: typeof cryptoRef.subtle?.digest === 'function',
    btoaAvailable: typeof scope.btoa === 'function',
    getRandomValuesAvailable: typeof cryptoRef.getRandomValues === 'function',
    patched:
      !alreadySupported || !hadGetRandomValues || !hadBtoa || !hadTextEncoder,
  }
}
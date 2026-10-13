// 真网同步原生组装（TASK-DEV-08）：supabase-js 客户端 + expo-file-system + 单例仓库。
//
// 本文件是 `src/sync` 内唯一 import Expo 原生模块与 supabase 客户端的运行时接线；
// 纯逻辑与单测不触碰它（单测直接用 gateway fake 组装 transport/source）。
// 凭据只来自 `EXPO_PUBLIC_*`（`mobile/.env`，不入 Git），无 key 时 `isSupabaseConfigured()`
// 为 false，本函数直接抛 `SUPABASE_ENV_MISSING`，不会触网。

import { File } from 'expo-file-system'

import { getAppRepository } from '../db/app'
import { createExpoMediaFileSystem } from '../media/localFiles'
import { getSupabaseAuthClient, isSupabaseConfigured } from '../supabase/native'
import { getBoundOwner } from './meta'
import type { PullSource } from './pull'
import { createMediaPuller, type MediaPuller } from './pullMedia'
import { createSupabaseGateway } from './supabaseGateway'
import { createSupabasePullSource } from './supabasePull'
import { createSupabaseTransport, type MediaFileReader } from './supabaseTransport'
import type { PushTransport } from './transport'

const mediaFileReader: MediaFileReader = {
  readBase64: (uri) => new File(uri).base64(),
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`媒体下载失败 ${res.status}`)
  return new Uint8Array(await res.arrayBuffer())
}

export interface NativeSyncEngines {
  owner: string
  transport: PushTransport
  source: PullSource
  media: MediaPuller
}

/** 组装真网 push/pull 引擎依赖；未配置 key/未绑定 owner 时抛错（不触网）。 */
export function createNativeSyncEngines(): NativeSyncEngines {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_ENV_MISSING')
  const { db } = getAppRepository()
  const owner = getBoundOwner(db)
  if (!owner) throw new Error('OWNER_NOT_BOUND')

  const gateway = createSupabaseGateway(getSupabaseAuthClient())
  const files = createExpoMediaFileSystem()
  return {
    owner,
    transport: createSupabaseTransport({ db, gateway, owner, mediaFiles: mediaFileReader }),
    source: createSupabasePullSource({ gateway }),
    media: createMediaPuller({ db, gateway, files, documentDirUri: files.documentDirectoryUri(), fetchBytes }),
  }
}

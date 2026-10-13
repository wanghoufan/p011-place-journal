// 网络可用性前置（L3-61）：同步前先问一次系统网络状态，避免无网络时仍然发请求。
//
// 只包一层 `expo-network`，不引入新依赖（package.json 已有）。三条口径：
//   - `isConnected === false`（含飞行模式/NONE）→ 无网络，跳过本轮；
//   - `isInternetReachable === false` → 系统已确认不可达，同样跳过（VPN 断开即此值）；
//   - 状态为 `null`/未判定（Android 常见）→ 不拦，继续同步。
//
// 拿不到状态（原生模块缺失、Web、抛错）一律 **放行**：宁可多试一次，也不要让同步
// 因为探针本身失灵而永远卡死——真实网络判断交给 push/pull 的失败与重试机制兜底。

import * as Network from 'expo-network'

export interface NetworkProbe {
  isConnected?: boolean | null
  isInternetReachable?: boolean | null
}

export type NetworkProbeFn = () => Promise<NetworkProbe | null | undefined>

/** 默认探针：读 `expo-network` 当前网络状态；任何异常/缺字段都按「有网络」处理。 */
export const probeDeviceNetwork: NetworkProbeFn = async () => {
  try {
    return await Network.getNetworkStateAsync()
  } catch {
    return null
  }
}

/**
 * 网络可用性判定：只把「系统明确说不可用」当作无网络，其余（含未知）一律放行。
 */
export async function isNetworkAvailable(probe: NetworkProbeFn = probeDeviceNetwork): Promise<boolean> {
  let state: NetworkProbe | null | undefined
  try {
    state = await probe()
  } catch {
    return true // 探针自身失败 → 放行，见文件头口径
  }
  if (!state) return true
  if (state.isConnected === false) return false
  if (state.isInternetReachable === false) return false
  return true
}
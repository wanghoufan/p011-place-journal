import { isNetworkAvailable, type NetworkProbe } from '../networkGate'

// L3-61：网络前置探针只把「系统明确说不可用」当无网络，其余一律放行。
// 全部注入假状态，不依赖真实网络 / 原生模块。

function probe(state: NetworkProbe | null): () => Promise<NetworkProbe | null> {
  return async () => state
}

describe('networkGate: 无网络判定', () => {
  it('isConnected=false 或 isInternetReachable=false：判无网络', async () => {
    expect(await isNetworkAvailable(probe({ isConnected: false }))).toBe(false)
    expect(await isNetworkAvailable(probe({ isConnected: true, isInternetReachable: false }))).toBe(false)
  })

  it('正常连接：判有网络', async () => {
    expect(await isNetworkAvailable(probe({ isConnected: true, isInternetReachable: true }))).toBe(true)
  })

  it('字段缺失 / null / undefined（Android 未判定）：放行', async () => {
    expect(await isNetworkAvailable(probe({}))).toBe(true)
    expect(await isNetworkAvailable(probe({ isConnected: true, isInternetReachable: null }))).toBe(true)
    expect(await isNetworkAvailable(probe(null))).toBe(true)
  })

  it('探针抛错（原生模块缺失 / Web）：放行，不阻断同步', async () => {
    expect(
      await isNetworkAvailable(async () => {
        throw new Error('Cannot find native module Network')
      }),
    ).toBe(true)
  })
})
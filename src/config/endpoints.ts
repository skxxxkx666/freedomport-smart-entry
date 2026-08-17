export type EntryEndpointId = 'cn' | 'global'

export interface EntryEndpoint {
  id: EntryEndpointId
  name: string
  description: string
  targetUrl: string
  pingUrl: string
  fallbackPingUrl?: string
}

const env = import.meta.env

export const ENDPOINTS: EntryEndpoint[] = [
  {
    id: 'cn',
    name: '国内入口',
    description: '中国大陆网络推荐',
    targetUrl: env.VITE_CN_TARGET_URL ?? 'https://cn.freedomport.cc',
    pingUrl: env.VITE_CN_PING_URL ?? 'https://cn.freedomport.cc/ping',
    fallbackPingUrl:
      env.VITE_CN_FALLBACK_PING_URL ?? 'https://cn.freedomport.cc/speed-test.gif',
  },
  {
    id: 'global',
    name: '国际入口',
    description: '海外及国际网络推荐',
    targetUrl: env.VITE_GLOBAL_TARGET_URL ?? 'https://app.freedomport.cc',
    pingUrl: env.VITE_GLOBAL_PING_URL ?? 'https://app.freedomport.cc/ping',
    fallbackPingUrl:
      env.VITE_GLOBAL_FALLBACK_PING_URL ?? 'https://app.freedomport.cc/speed-test.gif',
  },
]

export function getEndpoint(id: string): EntryEndpoint | undefined {
  return ENDPOINTS.find((ep) => ep.id === id)
}

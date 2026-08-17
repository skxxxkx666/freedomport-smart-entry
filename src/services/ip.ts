import { AbortedError, buildCacheBuster } from '@/services/latency'

export const IP_LOOKUP_TIMEOUT_MS = 2500

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6_RE = /^[0-9a-fA-F:]+$/

const env = import.meta.env

/**
 * 默认的第三方出口 IP 查询服务，按顺序回退。
 * 均返回 text/plain 纯 IP 且允许跨域（Access-Control-Allow-Origin: *）。
 */
const DEFAULT_IP_PROVIDERS: readonly string[] = [
  'https://api.ipify.org',
  'https://api.ip.sb/ip',
]

/**
 * 出口 IP 查询地址列表。
 * VITE_IP_LOOKUP_URL 可覆盖为自定义端点（返回 text/plain 纯 IP）；
 * 置为空字符串表示完全禁用出口 IP 显示。
 */
export function getIpProviders(): string[] {
  const custom: string | undefined = env.VITE_IP_LOOKUP_URL
  if (custom === '') return []
  if (custom) return [custom]
  return [...DEFAULT_IP_PROVIDERS]
}

/**
 * 校验 IP 端点返回的正文是否为合法 IP。
 * 端点应返回 text/plain 的纯 IP（允许首尾空白与 IPv6 缩写形式）。
 */
export function parseIpText(text: string): string | null {
  const candidate = text.trim()
  if (candidate.length === 0 || candidate.length > 45) return null
  if (IPV4_RE.test(candidate)) {
    const parts = candidate.split('.')
    if (parts.every((p) => Number(p) <= 255)) return candidate
    return null
  }
  if (candidate.includes(':') && IPV6_RE.test(candidate)) return candidate
  return null
}

async function fetchIpFrom(
  url: string,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController()
  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(buildCacheBuster(url), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`ip lookup failed: ${res.status}`)
    const ip = parseIpText(await res.text())
    if (!ip) throw new Error('invalid ip response')
    return ip
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

/**
 * 通过第三方服务查询浏览器当前的出口 IP，按配置顺序逐个尝试，
 * 第一个返回合法 IP 的服务生效。全部失败时抛出最后一个错误。
 */
export async function fetchExitIp(
  signal?: AbortSignal,
  timeoutMs: number = IP_LOOKUP_TIMEOUT_MS,
): Promise<string> {
  const providers = getIpProviders()
  if (providers.length === 0) {
    throw new Error('ip lookup disabled')
  }

  let lastError: unknown = new Error('ip lookup failed')
  for (const provider of providers) {
    try {
      return await fetchIpFrom(provider, signal, timeoutMs)
    } catch (err) {
      if (signal?.aborted) throw new AbortedError()
      lastError = err
    }
  }
  throw lastError
}

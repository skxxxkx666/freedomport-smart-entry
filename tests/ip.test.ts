// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseIpText, fetchExitIp, getIpProviders, IP_LOOKUP_TIMEOUT_MS } from '@/services/ip'

describe('parseIpText', () => {
  it('接受合法 IPv4', () => {
    expect(parseIpText('203.0.113.7')).toBe('203.0.113.7')
    expect(parseIpText('  8.8.8.8\n')).toBe('8.8.8.8')
  })

  it('拒绝越界 IPv4', () => {
    expect(parseIpText('256.1.1.1')).toBeNull()
    expect(parseIpText('999.999.999.999')).toBeNull()
  })

  it('接受合法 IPv6', () => {
    expect(parseIpText('2001:db8::1')).toBe('2001:db8::1')
    expect(parseIpText('::1')).toBe('::1')
  })

  it('拒绝非 IP 内容', () => {
    expect(parseIpText('')).toBeNull()
    expect(parseIpText('ok')).toBeNull()
    expect(parseIpText('<html>error</html>')).toBeNull()
    expect(parseIpText('1.2.3.4.5')).toBeNull()
  })
})

describe('getIpProviders', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('默认返回两个第三方服务', () => {
    const providers = getIpProviders()
    expect(providers).toHaveLength(2)
    expect(providers[0]).toContain('api.ipify.org')
    expect(providers[1]).toContain('api.ip.sb')
  })

  it('VITE_IP_LOOKUP_URL 覆盖为自定义端点', () => {
    vi.stubEnv('VITE_IP_LOOKUP_URL', 'https://ip.example.com/plain')
    expect(getIpProviders()).toEqual(['https://ip.example.com/plain'])
  })

  it('VITE_IP_LOOKUP_URL 置空时禁用查询', () => {
    vi.stubEnv('VITE_IP_LOOKUP_URL', '')
    expect(getIpProviders()).toEqual([])
  })
})

describe('fetchExitIp', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('第一个服务成功时直接返回 IP', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('203.0.113.7', { status: 200 }))
    await expect(fetchExitIp()).resolves.toBe('203.0.113.7')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('api.ipify.org')
  })

  it('第一个服务 HTTP 失败时回退到第二个服务', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(new Response('198.51.100.9', { status: 200 }))
    await expect(fetchExitIp()).resolves.toBe('198.51.100.9')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain('api.ip.sb')
  })

  it('第一个服务返回非法 IP 时回退到第二个服务', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
      .mockResolvedValueOnce(new Response('8.8.8.8', { status: 200 }))
    await expect(fetchExitIp()).resolves.toBe('8.8.8.8')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('第一个服务网络异常时回退到第二个服务', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new TypeError('network error'))
      .mockResolvedValueOnce(new Response('1.1.1.1', { status: 200 }))
    await expect(fetchExitIp()).resolves.toBe('1.1.1.1')
  })

  it('全部服务失败时抛错', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 500 }))
    await expect(fetchExitIp()).rejects.toThrow('500')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('禁用查询时直接抛错且不发起请求', async () => {
    vi.stubEnv('VITE_IP_LOOKUP_URL', '')
    await expect(fetchExitIp()).rejects.toThrow('disabled')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('使用自定义端点时只请求该端点', async () => {
    vi.stubEnv('VITE_IP_LOOKUP_URL', 'https://ip.example.com/plain')
    vi.mocked(fetch).mockResolvedValue(new Response('9.9.9.9', { status: 200 }))
    await expect(fetchExitIp()).resolves.toBe('9.9.9.9')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('ip.example.com')
  })

  it('请求带防缓存参数且不携带凭据', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('1.2.3.4', { status: 200 }))
    await fetchExitIp()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('ts=')
    expect(String(url)).toContain('nonce=')
    expect(init?.credentials).toBe('omit')
    expect(init?.cache).toBe('no-store')
  })

  it('外部中止时抛出 AbortedError', async () => {
    vi.mocked(fetch).mockImplementation((_url: unknown, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    const controller = new AbortController()
    const promise = fetchExitIp(controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortedError' })
  })

  it('默认超时时间为 2500ms', () => {
    expect(IP_LOOKUP_TIMEOUT_MS).toBe(2500)
  })
})

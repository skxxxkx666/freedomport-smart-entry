// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  measureFetch,
  measureImage,
  measureEndpoint,
  testEndpoint,
  AbortedError,
  DEFAULT_TIMEOUT_MS,
} from '@/services/latency'
import type { EntryEndpoint } from '@/config/endpoints'

const cnEndpoint: EntryEndpoint = {
  id: 'cn',
  name: '国内入口',
  description: '中国大陆网络推荐',
  targetUrl: 'https://cn.freedomport.cc',
  pingUrl: 'https://cn.freedomport.cc/ping',
  fallbackPingUrl: 'https://cn.freedomport.cc/speed-test.gif',
}

function mockPendingFetch() {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    return new Promise((_resolve, reject) => {
      const signal = init?.signal
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
        return
      }
      signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'))
      })
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockImageThatLoads() {
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    _src = ''
    set src(value: string) {
      this._src = value
      queueMicrotask(() => this.onload?.())
    }
    get src(): string {
      return this._src
    }
  }
  vi.stubGlobal('Image', MockImage)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('measureFetch', () => {
  it('请求成功时返回成功结果并计时', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })))
    const outcome = await measureFetch('https://cn.freedomport.cc/ping', DEFAULT_TIMEOUT_MS)
    expect(outcome.ok).toBe(true)
    expect(outcome.duration).toBeGreaterThanOrEqual(0)
    expect(globalThis.fetch).toHaveBeenCalled()
    const [url, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain('ts=')
    expect(String(url)).toContain('nonce=')
    expect((init as RequestInit).method).toBe('GET')
    expect((init as RequestInit).cache).toBe('no-store')
    expect((init as RequestInit).credentials).toBe('omit')
    expect((init as RequestInit).redirect).toBe('follow')
  })

  it('请求超时返回超时结果', async () => {
    vi.useFakeTimers()
    mockPendingFetch()
    const promise = measureFetch('https://cn.freedomport.cc/ping', DEFAULT_TIMEOUT_MS)
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS)
    const outcome = await promise
    expect(outcome.ok).toBe(false)
    expect(outcome.errorType).toBe('timeout')
    expect(outcome.duration).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('请求中止时抛出 AbortedError', async () => {
    mockPendingFetch()
    const controller = new AbortController()
    const promise = measureFetch('https://cn.freedomport.cc/ping', DEFAULT_TIMEOUT_MS, controller.signal)
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(AbortedError)
  })
})

describe('measureImage', () => {
  it('图片加载成功时返回成功结果', async () => {
    vi.useFakeTimers()
    mockImageThatLoads()
    const promise = measureImage('https://cn.freedomport.cc/speed-test.gif', DEFAULT_TIMEOUT_MS)
    await vi.advanceTimersByTimeAsync(10)
    const outcome = await promise
    expect(outcome.ok).toBe(true)
  })

  it('图片加载失败时返回失败结果', async () => {
    vi.useFakeTimers()
    class MockErrorImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      _src = ''
      set src(value: string) {
        this._src = value
        queueMicrotask(() => this.onerror?.())
      }
      get src(): string {
        return this._src
      }
    }
    vi.stubGlobal('Image', MockErrorImage)
    const promise = measureImage('https://cn.freedomport.cc/speed-test.gif', DEFAULT_TIMEOUT_MS)
    await vi.advanceTimersByTimeAsync(10)
    const outcome = await promise
    expect(outcome.ok).toBe(false)
    expect(outcome.errorType).toBe('network')
  })
})

describe('measureEndpoint', () => {
  it('Fetch 成功后使用 Fetch 结果', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })))
    const sample = await measureEndpoint(cnEndpoint, DEFAULT_TIMEOUT_MS)
    expect(sample.success).toBe(true)
    expect(sample.method).toBe('fetch')
  })

  it('Fetch 失败后使用图片备用测速', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    mockImageThatLoads()
    const sample = await measureEndpoint(cnEndpoint, DEFAULT_TIMEOUT_MS)
    expect(sample.success).toBe(true)
    expect(sample.method).toBe('image')
  })

  it('Fetch 与图片都失败时返回失败结果', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    class MockErrorImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      _src = ''
      set src(value: string) {
        this._src = value
        queueMicrotask(() => this.onerror?.())
      }
      get src(): string {
        return this._src
      }
    }
    vi.stubGlobal('Image', MockErrorImage)
    const sample = await measureEndpoint(cnEndpoint, DEFAULT_TIMEOUT_MS)
    expect(sample.success).toBe(false)
  })
})

describe('testEndpoint', () => {
  it('执行预热加正式测试并计算中位数', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('ok', { status: 200 })))
    const statuses: string[] = []
    let sampleCount = 0
    const result = await testEndpoint(cnEndpoint, {
      warmupCount: 1,
      formalCount: 3,
      onStatus: (s) => statuses.push(s),
      onSample: () => {
        sampleCount += 1
      },
    })
    expect(statuses).toContain('warming')
    expect(statuses).toContain('testing')
    expect(sampleCount).toBe(4)
    expect(result.status).toBe('success')
    expect(result.successCount).toBe(3)
    expect(result.failureCount).toBe(0)
    expect(result.medianLatency).not.toBeNull()
  })

  it('请求中止时向外传播 AbortedError', async () => {
    mockPendingFetch()
    const controller = new AbortController()
    const promise = testEndpoint(cnEndpoint, {
      warmupCount: 1,
      formalCount: 1,
      signal: controller.signal,
    })
    controller.abort()
    await expect(promise).rejects.toBeInstanceOf(AbortedError)
  })
})

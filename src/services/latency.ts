import type { EntryEndpoint } from '@/config/endpoints'
import type { EndpointTestResult, LatencySample, TestStatus } from '@/types/latency'
import { computeMedian } from '@/utils/median'

export const DEFAULT_TIMEOUT_MS = 2500
export const DEFAULT_WARMUP_COUNT = 1
export const DEFAULT_FORMAL_COUNT = 3

export class AbortedError extends Error {
  constructor() {
    super('measurement aborted')
    this.name = 'AbortedError'
  }
}

export interface TestEndpointOptions {
  warmupCount?: number
  formalCount?: number
  timeoutMs?: number
  signal?: AbortSignal
  onStatus?: (status: TestStatus) => void
  onSample?: (sample: LatencySample, phase: 'warmup' | 'formal', round: number, total: number) => void
}

export interface FetchOutcome {
  duration: number
  ok: boolean
  errorType?: LatencySample['errorType']
}

export interface ImageOutcome {
  duration: number
  ok: boolean
  errorType?: LatencySample['errorType']
}

export function buildCacheBuster(base: string): string {
  const url = new URL(base)
  url.searchParams.set('ts', String(Date.now()))
  url.searchParams.set('nonce', Math.random().toString(36).slice(2))
  return url.toString()
}

export async function measureFetch(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<FetchOutcome> {
  const controller = new AbortController()
  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)

  let didTimeout = false
  const timer = setTimeout(() => {
    didTimeout = true
    controller.abort()
  }, timeoutMs)

  const start = performance.now()
  try {
    const res = await fetch(buildCacheBuster(url), {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    })
    const duration = performance.now() - start
    if (!res.ok) {
      return { duration, ok: false, errorType: 'network' }
    }
    await res.text()
    return { duration, ok: true }
  } catch (err) {
    const duration = didTimeout ? timeoutMs : performance.now() - start
    if (signal?.aborted) {
      throw new AbortedError()
    }
    if (didTimeout) {
      return { duration, ok: false, errorType: 'timeout' }
    }
    if (err instanceof TypeError) {
      return { duration, ok: false, errorType: 'cors' }
    }
    return { duration, ok: false, errorType: 'unknown' }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

export function measureImage(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ImageOutcome> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const start = performance.now()
    let settled = false

    const finish = (outcome: ImageOutcome, detach: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      detach()
      resolve(outcome)
    }

    const onOuterAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      img.onload = null
      img.onerror = null
      img.src = ''
      reject(new AbortedError())
    }
    signal?.addEventListener('abort', onOuterAbort)

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      signal?.removeEventListener('abort', onOuterAbort)
      img.onload = null
      img.onerror = null
      img.src = ''
      resolve({ duration: timeoutMs, ok: false, errorType: 'timeout' })
    }, timeoutMs)

    img.onload = () => {
      const duration = performance.now() - start
      finish({ duration, ok: true }, () => {
        signal?.removeEventListener('abort', onOuterAbort)
      })
    }
    img.onerror = () => {
      const duration = performance.now() - start
      finish({ duration, ok: false, errorType: 'network' }, () => {
        signal?.removeEventListener('abort', onOuterAbort)
      })
    }
    img.src = buildCacheBuster(url)
  })
}

export async function measureEndpointFetch(
  endpoint: EntryEndpoint,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<LatencySample> {
  try {
    const outcome = await measureFetch(endpoint.pingUrl, timeoutMs, signal)
    if (!outcome.ok) {
      return {
        duration: outcome.duration,
        success: false,
        timestamp: Date.now(),
        errorType: outcome.errorType,
        method: 'fetch',
      }
    }
    return {
      duration: outcome.duration,
      success: true,
      timestamp: Date.now(),
      method: 'fetch',
    }
  } catch (err) {
    if (err instanceof AbortedError) throw err
    return {
      duration: timeoutMs,
      success: false,
      timestamp: Date.now(),
      errorType: 'unknown',
      method: 'fetch',
    }
  }
}

export async function measureEndpointImage(
  endpoint: EntryEndpoint,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<LatencySample> {
  const fallbackUrl = endpoint.fallbackPingUrl
  if (!fallbackUrl) {
    return {
      duration: timeoutMs,
      success: false,
      timestamp: Date.now(),
      errorType: 'unknown',
      method: 'image',
    }
  }
  try {
    const outcome = await measureImage(fallbackUrl, timeoutMs, signal)
    if (!outcome.ok) {
      return {
        duration: outcome.duration,
        success: false,
        timestamp: Date.now(),
        errorType: outcome.errorType,
        method: 'image',
      }
    }
    return {
      duration: outcome.duration,
      success: true,
      timestamp: Date.now(),
      method: 'image',
    }
  } catch (err) {
    if (err instanceof AbortedError) throw err
    return {
      duration: timeoutMs,
      success: false,
      timestamp: Date.now(),
      errorType: 'unknown',
      method: 'image',
    }
  }
}

export async function measureEndpoint(
  endpoint: EntryEndpoint,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<LatencySample> {
  const primary = await measureEndpointFetch(endpoint, timeoutMs, signal)
  if (primary.success) return primary
  return measureEndpointImage(endpoint, timeoutMs, signal)
}

export async function testEndpoint(
  endpoint: EntryEndpoint,
  options: TestEndpointOptions = {},
): Promise<EndpointTestResult> {
  const warmupCount = options.warmupCount ?? DEFAULT_WARMUP_COUNT
  const formalCount = options.formalCount ?? DEFAULT_FORMAL_COUNT
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const { signal, onStatus, onSample } = options

  const samples: LatencySample[] = []
  let successCount = 0
  let failureCount = 0

  onStatus?.('warming')
  for (let i = 0; i < warmupCount; i += 1) {
    const sample = await measureEndpoint(endpoint, timeoutMs, signal)
    onSample?.(sample, 'warmup', i + 1, warmupCount)
  }

  onStatus?.('testing')
  for (let i = 0; i < formalCount; i += 1) {
    const sample = await measureEndpoint(endpoint, timeoutMs, signal)
    samples.push(sample)
    if (sample.success) successCount += 1
    else failureCount += 1
    onSample?.(sample, 'formal', i + 1, formalCount)
  }

  const durations = samples.filter((s) => s.success).map((s) => s.duration)
  const medianLatency = computeMedian(durations)

  let status: TestStatus
  if (successCount > 0) status = 'success'
  else if (samples.some((s) => s.errorType === 'timeout')) status = 'timeout'
  else status = 'failed'

  return {
    endpointId: endpoint.id,
    status,
    samples,
    medianLatency,
    successCount,
    failureCount,
  }
}

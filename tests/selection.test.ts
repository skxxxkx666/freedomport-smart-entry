import { describe, it, expect } from 'vitest'
import { selectBestEndpoint } from '@/utils/selection'
import type { EndpointTestResult } from '@/types/latency'

function result(overrides: Partial<EndpointTestResult> & { endpointId: string }): EndpointTestResult {
  return {
    status: 'success',
    samples: [],
    medianLatency: null,
    successCount: 0,
    failureCount: 0,
    ...overrides,
  }
}

const cn = result({
  endpointId: 'cn',
  status: 'success',
  samples: [
    { duration: 50, success: true, timestamp: 1, method: 'fetch' },
    { duration: 60, success: true, timestamp: 2, method: 'fetch' },
    { duration: 70, success: true, timestamp: 3, method: 'fetch' },
  ],
  medianLatency: 60,
  successCount: 3,
  failureCount: 0,
})

const global = result({
  endpointId: 'global',
  status: 'success',
  samples: [
    { duration: 90, success: true, timestamp: 1, method: 'fetch' },
    { duration: 100, success: true, timestamp: 2, method: 'fetch' },
    { duration: 110, success: true, timestamp: 3, method: 'fetch' },
  ],
  medianLatency: 100,
  successCount: 3,
  failureCount: 0,
})

describe('selectBestEndpoint', () => {
  it('国内延迟更低时选择国内', () => {
    const selection = selectBestEndpoint([cn, global])
    expect(selection.endpointId).toBe('cn')
    expect(selection.reason).toBe('lower')
  })

  it('国际延迟更低时选择国际', () => {
    const fastGlobal = { ...global, medianLatency: 30 }
    const selection = selectBestEndpoint([cn, fastGlobal])
    expect(selection.endpointId).toBe('global')
    expect(selection.reason).toBe('lower')
  })

  it('两者延迟相同时默认选择国内', () => {
    const tie = { ...global, medianLatency: 60 }
    const selection = selectBestEndpoint([cn, tie])
    expect(selection.endpointId).toBe('cn')
    expect(selection.reason).toBe('tie')
  })

  it('国内失败时选择国际', () => {
    const cnFailed = {
      ...cn,
      status: 'failed' as const,
      medianLatency: null,
      successCount: 0,
      failureCount: 3,
    }
    const selection = selectBestEndpoint([cnFailed, global])
    expect(selection.endpointId).toBe('global')
    expect(selection.reason).toBe('only-success')
  })

  it('国际失败时选择国内', () => {
    const globalFailed = {
      ...global,
      status: 'timeout' as const,
      medianLatency: null,
      successCount: 0,
      failureCount: 3,
    }
    const selection = selectBestEndpoint([cn, globalFailed])
    expect(selection.endpointId).toBe('cn')
    expect(selection.reason).toBe('only-success')
  })

  it('两者都失败时不选择任何入口', () => {
    const cnFailed = { ...cn, status: 'failed' as const, successCount: 0, failureCount: 3, medianLatency: null }
    const globalFailed = { ...global, status: 'failed' as const, successCount: 0, failureCount: 3, medianLatency: null }
    const selection = selectBestEndpoint([cnFailed, globalFailed])
    expect(selection.endpointId).toBeNull()
    expect(selection.reason).toBe('none')
  })

  it('部分样本成功时视为该入口成功', () => {
    const partial = {
      ...cn,
      successCount: 1,
      failureCount: 2,
      medianLatency: 50,
    }
    const selection = selectBestEndpoint([partial, global])
    expect(selection.endpointId).toBe('cn')
    expect(selection.reason).toBe('lower')
  })
})

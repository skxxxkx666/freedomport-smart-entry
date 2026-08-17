import type { EndpointTestResult } from '@/types/latency'

export type SelectionReason = 'lower' | 'tie' | 'only-success' | 'none'

export interface SelectionResult {
  endpointId: string | null
  reason: SelectionReason
}

export function selectBestEndpoint(results: EndpointTestResult[]): SelectionResult {
  const succeeded = results.filter((r) => r.successCount > 0)

  if (succeeded.length === 0) {
    return { endpointId: null, reason: 'none' }
  }

  if (succeeded.length === 1) {
    return { endpointId: succeeded[0].endpointId, reason: 'only-success' }
  }

  const [a, b] = succeeded
  const aLatency = a.medianLatency ?? Infinity
  const bLatency = b.medianLatency ?? Infinity

  if (aLatency < bLatency) {
    return { endpointId: a.endpointId, reason: 'lower' }
  }
  if (bLatency < aLatency) {
    return { endpointId: b.endpointId, reason: 'lower' }
  }

  const china = succeeded.find((r) => r.endpointId === 'cn')
  return { endpointId: china ? china.endpointId : a.endpointId, reason: 'tie' }
}

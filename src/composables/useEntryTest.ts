import { reactive, onUnmounted } from 'vue'
import { ENDPOINTS, type EntryEndpoint } from '@/config/endpoints'
import { testEndpoint, AbortedError } from '@/services/latency'
import { fetchExitIp, getIpProviders } from '@/services/ip'
import { selectBestEndpoint, type SelectionResult } from '@/utils/selection'
import { parseQuery } from '@/utils/query'
import { computeMedian } from '@/utils/median'
import type { ExitIpState, EndpointTestResult, EndpointLiveState, LatencySample, TestStatus } from '@/types/latency'

export type EntryPhase = 'idle' | 'testing' | 'complete'

export interface EntryTestState {
  phase: EntryPhase
  live: Record<string, EndpointLiveState>
  results: Record<string, EndpointTestResult>
  exitIp: ExitIpState
  selection: SelectionResult
  startedAt: number | null
  finishedAt: number | null
  manual: boolean
  debug: boolean
  noTest: boolean
}

function emptyLiveState(): EndpointLiveState {
  return { status: 'idle', samples: [], progress: null }
}

function createInitialResults(): Record<string, EndpointLiveState> {
  const live: Record<string, EndpointLiveState> = {}
  for (const ep of ENDPOINTS) live[ep.id] = emptyLiveState()
  return live
}

export function useEntryTest() {
  const query = parseQuery(typeof window !== 'undefined' ? window.location.search : '')

  const state = reactive<EntryTestState>({
    phase: 'idle',
    live: createInitialResults(),
    results: {},
    exitIp: { status: 'idle', ip: null },
    selection: { endpointId: null, reason: 'none' },
    startedAt: null,
    finishedAt: null,
    manual: query.manual,
    debug: query.debug,
    noTest: query.noTest,
  })

  let runId = 0
  let controller: AbortController | null = null
  let disposed = false

  function isStale(id: number): boolean {
    return disposed || id !== runId
  }

  function resetForRun(): AbortController {
    controller?.abort()
    controller = new AbortController()
    state.phase = 'testing'
    state.results = {}
    state.selection = { endpointId: null, reason: 'none' }
    state.startedAt = Date.now()
    state.finishedAt = null
    state.live = createInitialResults()
    state.exitIp = { status: 'idle', ip: null }
    return controller
  }

  /**
   * 测速完成后再通过第三方服务查询当前出口 IP，避免额外请求干扰延迟测量。
   * 查询与 runId 绑定，重新测速时旧结果不会覆盖新状态。
   */
  function runIpLookup(id: number, signal: AbortSignal): void {
    if (getIpProviders().length === 0) return
    state.exitIp = { status: 'loading', ip: null }
    fetchExitIp(signal)
      .then((ip) => {
        if (isStale(id)) return
        state.exitIp = { status: 'success', ip }
      })
      .catch((err: unknown) => {
        if (isStale(id) || err instanceof AbortedError) return
        state.exitIp = { status: 'failed', ip: null }
      })
  }

  function finalizeRun(id: number, outcomes: EndpointTestResult[], signal: AbortSignal): void {
    if (isStale(id)) return
    for (const outcome of outcomes) {
      state.results[outcome.endpointId] = outcome
      const live = state.live[outcome.endpointId]
      live.status = outcome.status
      live.samples = outcome.samples
      live.progress = null
    }
    state.selection = selectBestEndpoint(outcomes)
    state.finishedAt = Date.now()
    state.phase = 'complete'
    runIpLookup(id, signal)
  }

  async function runRealTest(): Promise<void> {
    runId += 1
    const id = runId
    const signal = resetForRun().signal

    try {
      const outcomes = await Promise.all(
        ENDPOINTS.map(async (endpoint: EntryEndpoint) => {
          return testEndpoint(endpoint, {
            signal,
            onStatus: (status: TestStatus) => {
              if (isStale(id)) return
              state.live[endpoint.id].status = status
            },
            onSample: (sample: LatencySample, phase: 'warmup' | 'formal', round: number, total: number) => {
              if (isStale(id)) return
              const live = state.live[endpoint.id]
              if (phase === 'formal') {
                live.samples.push(sample)
                live.progress = { round, total }
              }
            },
          })
        }),
      )
      finalizeRun(id, outcomes, signal)
    } catch (err) {
      if (isStale(id)) return
      if (err instanceof AbortedError) return
      state.finishedAt = Date.now()
      state.phase = 'complete'
    }
  }

  async function runSimulatedTest(): Promise<void> {
    runId += 1
    const id = runId
    const signal = resetForRun().signal

    const plan: Record<string, number> = { cn: 42, global: 118 }
    const total = 3

    for (let round = 1; round <= total; round += 1) {
      for (const endpoint of ENDPOINTS) {
        await delay(140 + round * 60)
        if (isStale(id)) return
        const live = state.live[endpoint.id]
        live.samples.push({
          duration: plan[endpoint.id] + (round - 1) * 4,
          success: true,
          timestamp: Date.now(),
          method: 'fetch',
        })
        live.progress = { round, total }
      }
    }

    if (isStale(id)) return
    const outcomes: EndpointTestResult[] = ENDPOINTS.map((endpoint) => {
      const samples = state.live[endpoint.id].samples
      const durations = samples.map((s) => s.duration)
      return {
        endpointId: endpoint.id,
        status: 'success',
        samples,
        medianLatency: computeMedian(durations),
        successCount: samples.length,
        failureCount: 0,
      }
    })
    finalizeRun(id, outcomes, signal)
  }

  function abortCurrent(): void {
    runId += 1
    controller?.abort()
    controller = null
  }

  function dispose(): void {
    disposed = true
    controller?.abort()
    controller = null
  }

  onUnmounted(dispose)

  return { state, runRealTest, runSimulatedTest, abortCurrent, dispose }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

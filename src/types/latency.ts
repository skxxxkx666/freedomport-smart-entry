export type TestStatus =
  | 'idle'
  | 'warming'
  | 'testing'
  | 'success'
  | 'timeout'
  | 'failed'

export type TestMethod = 'fetch' | 'image'

export interface LatencySample {
  duration: number
  success: boolean
  timestamp: number
  errorType?: 'timeout' | 'network' | 'cors' | 'unknown'
  method?: TestMethod
}

export interface EndpointTestResult {
  endpointId: string
  status: TestStatus
  samples: LatencySample[]
  medianLatency: number | null
  successCount: number
  failureCount: number
}

export interface EndpointLiveState {
  status: TestStatus
  samples: LatencySample[]
  progress: { round: number; total: number } | null
}

export type IpLookupStatus = 'idle' | 'loading' | 'success' | 'failed'

export interface ExitIpState {
  status: IpLookupStatus
  ip: string | null
}

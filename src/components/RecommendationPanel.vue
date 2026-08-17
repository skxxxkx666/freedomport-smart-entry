<script setup lang="ts">
import { computed } from 'vue'
import { ENDPOINTS, getEndpoint } from '@/config/endpoints'
import type { SelectionResult } from '@/utils/selection'
import type { EndpointTestResult } from '@/types/latency'

const props = defineProps<{
  selection: SelectionResult
  results: Record<string, EndpointTestResult>
  countdownMs: number
  countdownActive: boolean
  countdownCancelled: boolean
  manual: boolean
}>()

const emit = defineEmits<{
  (e: 'enter', endpointId: string): void
  (e: 'cancel'): void
  (e: 'retest'): void
}>()

const recommendedEndpoint = computed(() => {
  if (!props.selection.endpointId) return null
  return getEndpoint(props.selection.endpointId) ?? null
})

const hasAnySuccess = computed(() => {
  return Object.values(props.results).some((r) => r.successCount > 0)
})

const countdownSeconds = computed(() => Math.max(1, Math.ceil(props.countdownMs / 1000)))

const countdownPercent = computed(() => {
  return Math.max(0, Math.min(100, (props.countdownMs / 2000) * 100))
})

function latencyText(endpointId: string): string {
  const result = props.results[endpointId]
  if (!result) return '等待测速'
  if (result.successCount > 0 && result.medianLatency !== null) {
    return `${Math.round(result.medianLatency)} ms`
  }
  if (result.status === 'timeout') return '连接超时'
  if (result.status === 'failed') return '无法连接'
  return '等待测速'
}
</script>

<template>
  <div class="recommendation" role="status" aria-live="polite">
    <template v-if="recommendedEndpoint && hasAnySuccess">
      <div class="recommendation__head">
        <p class="recommendation__title">
          <span class="recommendation__arrow" aria-hidden="true">→</span>
          推荐进入：{{ recommendedEndpoint.name }}
        </p>
        <p class="recommendation__detail">
          国内入口 {{ latencyText('cn') }} · 国际入口 {{ latencyText('global') }}
        </p>
      </div>

      <template v-if="countdownActive && !countdownCancelled">
        <p class="recommendation__countdown-text">将在 {{ countdownSeconds }} 秒后自动进入</p>
        <div
          class="recommendation__countdown-bar"
          role="progressbar"
          aria-label="自动跳转倒计时"
          aria-valuemin="0"
          aria-valuemax="2000"
          :aria-valuenow="Math.round(countdownMs)"
        >
          <span
            class="recommendation__countdown-fill"
            :style="{ transform: `scaleX(${countdownPercent / 100})` }"
          ></span>
        </div>
        <div class="recommendation__actions">
          <button class="btn btn--primary" type="button" @click="emit('enter', selection.endpointId!)">
            立即进入
          </button>
          <button class="btn btn--ghost" type="button" @click="emit('cancel')">
            取消自动跳转
          </button>
        </div>
      </template>

      <template v-else>
        <div class="recommendation__actions">
          <button
            v-for="endpoint in ENDPOINTS"
            :key="endpoint.id"
            class="btn btn--primary"
            type="button"
            @click="emit('enter', endpoint.id)"
          >
            进入{{ endpoint.name }}
          </button>
          <button class="btn btn--ghost" type="button" @click="emit('retest')">
            重新测速
          </button>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="recommendation__head">
        <p class="recommendation__title">两个入口当前均无法连接</p>
        <p class="recommendation__detail">请手动选择入口，或稍后重新测速</p>
      </div>
      <div class="recommendation__actions">
        <button
          v-for="endpoint in ENDPOINTS"
          :key="endpoint.id"
          class="btn btn--primary"
          type="button"
          @click="emit('enter', endpoint.id)"
        >
          进入{{ endpoint.name }}
        </button>
        <button class="btn btn--ghost" type="button" @click="emit('retest')">
          重新测速
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EntryEndpoint } from '@/config/endpoints'
import type { EndpointLiveState, EndpointTestResult } from '@/types/latency'

const props = defineProps<{
  endpoint: EntryEndpoint
  live: EndpointLiveState
  result?: EndpointTestResult
  recommended: boolean
}>()

const emit = defineEmits<{
  (e: 'enter', endpointId: string): void
}>()

const isTesting = computed(() => props.live.status === 'warming' || props.live.status === 'testing')

const lastSampleDuration = computed(() => {
  const samples = props.live.samples
  if (samples.length === 0) return 0
  return samples[samples.length - 1].duration
})

const latencyMs = computed(() => {
  if (props.live.status === 'success' && props.result) {
    return props.result.medianLatency ?? Math.round(lastSampleDuration.value)
  }
  if (isTesting.value && props.live.samples.length > 0) {
    return Math.round(lastSampleDuration.value)
  }
  return null
})

const statusText = computed(() => {
  switch (props.live.status) {
    case 'idle':
      return '等待测速'
    case 'warming':
      return '正在建立连接'
    case 'testing':
      return `正在测试，第 ${props.live.progress?.round ?? 1}/3 次`
    case 'success':
      return '连接正常'
    case 'timeout':
      return '连接超时'
    case 'failed':
      return '无法连接'
    default:
      return '等待测速'
  }
})

const isCompat = computed(() => {
  return !!props.result?.samples.some((s) => s.success && s.method === 'image')
})

const progressPercent = computed(() => {
  if (!isTesting.value) return 0
  const { round = 1, total = 3 } = props.live.progress ?? {}
  return Math.min(100, Math.round((round / total) * 100))
})

const stateClass = computed(() => `entry-card--${props.live.status}`)
</script>

<template>
  <section
    class="entry-card"
    :class="[stateClass, { 'entry-card--recommended': recommended }]"
    :aria-label="`${endpoint.name} ${statusText}`"
  >
    <span v-if="recommended" class="entry-card__tag">推荐入口</span>

    <header class="entry-card__head">
      <h3 class="entry-card__name">{{ endpoint.name }}</h3>
      <p class="entry-card__desc">{{ endpoint.description }}</p>
    </header>

    <div class="entry-card__latency" aria-live="polite">
      <template v-if="latencyMs !== null">
        <span class="entry-card__latency-value">{{ latencyMs }}</span>
        <span class="entry-card__latency-unit">ms</span>
      </template>
      <span v-else class="entry-card__latency-value entry-card__latency-value--empty">—</span>
      <span class="entry-card__latency-label">中位延迟</span>
    </div>

    <div class="entry-card__status" aria-live="polite">
      <span
        v-if="isTesting"
        class="status-dot"
        aria-hidden="true"
      ></span>
      <span class="entry-card__status-text">{{ statusText }}</span>
      <span
        v-if="isCompat && !isTesting"
        class="entry-card__compat"
        title="通过图片测速端点完成测量"
      >兼容测速</span>
    </div>

    <div
      v-if="isTesting"
      class="entry-card__progress"
      role="progressbar"
      aria-label="测试进度"
      :aria-valuenow="progressPercent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span class="entry-card__progress-bar" :style="{ transform: `scaleX(${progressPercent / 100})` }"></span>
    </div>

    <div class="entry-card__enter-wrap">
      <button
        class="btn entry-card__enter"
        :class="recommended ? 'btn--primary' : 'btn--ghost'"
        type="button"
        @click="emit('enter', endpoint.id)"
      >
        进入{{ endpoint.name }}
      </button>
    </div>
  </section>
</template>

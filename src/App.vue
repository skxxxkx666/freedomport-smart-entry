<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import EntryCard from '@/components/EntryCard.vue'
import TestProgress from '@/components/TestProgress.vue'
import RecommendationPanel from '@/components/RecommendationPanel.vue'
import DebugPanel from '@/components/DebugPanel.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { ENDPOINTS, getEndpoint } from '@/config/endpoints'
import { useEntryTest } from '@/composables/useEntryTest'
import { redirectTo } from '@/utils/redirect'

const TOTAL_COUNTDOWN_MS = 2000

const { state, runRealTest, runSimulatedTest, abortCurrent, dispose } = useEntryTest()

const countdownMs = ref(TOTAL_COUNTDOWN_MS)
const countdownActive = ref(false)
const countdownCancelled = ref(false)
const jumped = ref(false)

let countdownTimer: number | null = null

const isTesting = computed(() => state.phase === 'testing')

const exitIpText = computed(() => {
  const exitIp = state.exitIp
  if (exitIp.status === 'idle') return null
  if (exitIp.status === 'loading') return '检测中…'
  if (exitIp.status === 'success') return exitIp.ip
  return '获取失败'
})

const exitIpFailed = computed(() => state.exitIp.status === 'failed')

const currentRound = computed(() => {
  let round = 1
  for (const endpoint of ENDPOINTS) {
    const progress = state.live[endpoint.id].progress
    if (progress && progress.round > round) round = progress.round
  }
  return round
})

function startCountdown(endpointId: string): void {
  stopCountdown()
  countdownCancelled.value = false
  countdownMs.value = TOTAL_COUNTDOWN_MS
  countdownActive.value = true
  countdownTimer = window.setInterval(() => {
    countdownMs.value = Math.max(0, countdownMs.value - 100)
    if (countdownMs.value <= 0) {
      stopCountdown()
      jumpTo(endpointId)
    }
  }, 100)
}

function stopCountdown(): void {
  if (countdownTimer !== null) {
    window.clearInterval(countdownTimer)
    countdownTimer = null
  }
  countdownActive.value = false
}

function saveLastSelection(endpointId: string): void {
  const result = state.results[endpointId]
  try {
    window.sessionStorage.setItem(
      'freedomport-last-entry',
      JSON.stringify({
        endpointId,
        medianLatency: result?.medianLatency ?? null,
        testedAt: Date.now(),
      }),
    )
  } catch {
    // sessionStorage 不可用时忽略，不影响跳转
  }
}

function jumpTo(endpointId: string): void {
  if (jumped.value) return
  jumped.value = true
  stopCountdown()
  const endpoint = getEndpoint(endpointId)
  if (!endpoint) return
  saveLastSelection(endpointId)
  redirectTo(endpoint.targetUrl)
}

function manualEnter(endpointId: string): void {
  stopCountdown()
  countdownCancelled.value = true
  abortCurrent()
  jumpTo(endpointId)
}

function cancelAutoJump(): void {
  countdownCancelled.value = true
  stopCountdown()
}

function startTest(): void {
  stopCountdown()
  countdownCancelled.value = false
  jumped.value = false
  if (state.noTest && import.meta.env.DEV) {
    void runSimulatedTest()
  } else {
    void runRealTest()
  }
}

function retest(): void {
  startTest()
}

watch(
  () => [state.phase, state.selection.endpointId, state.manual] as const,
  ([phase, endpointId, manual]) => {
    if (
      phase === 'complete' &&
      !manual &&
      endpointId &&
      state.selection.reason !== 'none' &&
      !jumped.value
    ) {
      startCountdown(endpointId)
    }
  },
)

onMounted(() => {
  startTest()
})

onUnmounted(() => {
  stopCountdown()
  dispose()
})
</script>

<template>
  <main class="page">
    <header class="topbar">
      <div class="brand">
        <img class="brand__mark" src="/logo-glyph.png" alt="" width="34" height="34" />
        <span class="brand__name">FreedomPort</span>
      </div>
      <ThemeToggle />
    </header>

    <section class="hero">
      <h1 class="hero__title">正在为你选择最佳入口</h1>
      <p class="hero__subtitle">将测试国内与国际入口的 HTTP 访问延迟</p>
    </section>

    <div class="cards">
      <EntryCard
        v-for="endpoint in ENDPOINTS"
        :key="endpoint.id"
        :endpoint="endpoint"
        :live="state.live[endpoint.id]"
        :result="state.results[endpoint.id]"
        :recommended="
          state.phase === 'complete' && state.selection.endpointId === endpoint.id
        "
        @enter="manualEnter"
      />
    </div>

    <div class="status">
      <TestProgress
        v-if="isTesting"
        :round="currentRound"
        :total="3"
      />
      <RecommendationPanel
        v-else-if="state.phase === 'complete'"
        :selection="state.selection"
        :results="state.results"
        :countdown-ms="countdownMs"
        :countdown-active="countdownActive"
        :countdown-cancelled="countdownCancelled"
        :manual="state.manual"
        @enter="manualEnter"
        @cancel="cancelAutoJump"
        @retest="retest"
      />
    </div>

    <p
      v-if="exitIpText"
      class="exit-ip"
      :class="{ 'exit-ip--failed': exitIpFailed }"
      title="由第三方服务检测的当前网络出口地址"
    >
      当前出口 IP <span class="exit-ip__value">{{ exitIpText }}</span>
    </p>

    <p class="privacy">测速仅用于选择访问延迟较低的入口，不会读取或上传你的个人数据。</p>

    <DebugPanel :state="state" />
  </main>
</template>

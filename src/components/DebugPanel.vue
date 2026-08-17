<script setup lang="ts">
import { computed } from 'vue'
import { ENDPOINTS } from '@/config/endpoints'
import type { EntryTestState } from '@/composables/useEntryTest'

const props = defineProps<{
  state: EntryTestState
}>()

const visible = computed(() => props.state.debug)

function formatTime(ts: number | null): string {
  if (ts === null) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
}

function roundMs(value: number): string {
  return value.toFixed(1)
}
</script>

<template>
  <details v-if="visible" class="debug" open>
    <summary class="debug__summary">调试信息</summary>

    <div class="debug__meta">
      <p>开始时间：{{ formatTime(state.startedAt) }}</p>
      <p>结束时间：{{ formatTime(state.finishedAt) }}</p>
      <p>推荐：{{ state.selection.endpointId ?? '无' }}（{{ state.selection.reason }}）</p>
    </div>

    <div v-for="endpoint in ENDPOINTS" :key="endpoint.id" class="debug__group">
      <h4 class="debug__group-title">{{ endpoint.name }}</h4>
      <table class="debug__table">
        <thead>
          <tr>
            <th>#</th>
            <th>方式</th>
            <th>耗时 ms</th>
            <th>结果</th>
            <th>失败原因</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(sample, index) in state.live[endpoint.id]?.samples ?? []" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ sample.method === 'image' ? 'Image' : 'Fetch' }}</td>
            <td>{{ roundMs(sample.duration) }}</td>
            <td>{{ sample.success ? '成功' : '失败' }}</td>
            <td>{{ sample.success ? '—' : (sample.errorType ?? 'unknown') }}</td>
            <td>{{ formatTime(sample.timestamp) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </details>
</template>

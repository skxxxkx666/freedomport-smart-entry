<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  round: number
  total: number
}>()

const label = computed(() => {
  if (props.total <= 0) return '正在测速'
  return `正在测速 · 第 ${Math.min(props.round, props.total)}/${props.total} 次`
})
</script>

<template>
  <div class="test-progress" role="status" aria-live="polite">
    <span class="test-progress__dots" aria-hidden="true">
      <span class="test-progress__dot"></span>
      <span class="test-progress__dot"></span>
      <span class="test-progress__dot"></span>
    </span>
    <span class="test-progress__label">{{ label }}</span>
  </div>
</template>

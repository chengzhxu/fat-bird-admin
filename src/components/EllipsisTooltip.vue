<script setup lang="ts">
import { NTooltip } from 'naive-ui'

withDefaults(defineProps<{
  content?: string | null
  maxWidth?: string
  lines?: number
}>(), {
  content: '',
  maxWidth: '240px',
  lines: 1,
})
</script>

<template>
  <NTooltip v-if="content && content.length > 12" placement="top" :style="{ maxWidth: '420px' }">
    <template #trigger>
      <span class="ellipsis-tip" :style="{ maxWidth, WebkitLineClamp: lines }">{{ content }}</span>
    </template>
    <span class="ellipsis-tip__full">{{ content }}</span>
  </NTooltip>
  <span v-else class="ellipsis-tip" :style="{ maxWidth }">{{ content || '—' }}</span>
</template>

<style scoped>
.ellipsis-tip {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  word-break: break-all;
  line-height: 1.45;
}
.ellipsis-tip__full {
  display: inline-block;
  max-width: 400px;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
</style>
